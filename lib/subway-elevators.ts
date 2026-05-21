// 서울시 지하철역 엘리베이터 위치정보(서울 열린데이터광장).
// ref/서울시 지하철역 엘리베이터 위치정보.json → lib/data/에 복사된 사본을 import.
//
// 데이터 형식:
//   { sbwy_stn_nm: "동묘앞", node_wkt: "POINT(127.0174 37.5732)", ... }
//
// 활용:
//   - 코스 spot 좌표 기반으로 가장 가까운 엘리베이터역 1곳 매칭
//   - BarrierFreeInfo.publicTransport 필드를 비어 있을 때 자동 채움
//   - 화면에서 "○○역 엘리베이터, 도보 N분" 형태로 노출

import elevatorData from "./data/seoul-subway-elevators.json" with { type: "json" };

interface RawElevatorNode {
  sbwy_stn_nm: string;
  sbwy_stn_cd: string;
  sgg_nm: string;
  node_wkt: string;
  node_type_cd: string;
  node_type: string;
}

interface ElevatorStation {
  name: string;
  district: string;
  lat: number;
  lng: number;
}

// 모듈 로드 시 1회 파싱. POINT(lng lat) → {lng, lat}
const STATIONS: ElevatorStation[] = (
  (elevatorData as { DATA: RawElevatorNode[] }).DATA ?? []
)
  .map((row) => {
    const m = /POINT\(([-\d.]+)\s+([-\d.]+)\)/.exec(row.node_wkt);
    if (!m) return null;
    return {
      name: row.sbwy_stn_nm,
      district: row.sgg_nm,
      lng: Number(m[1]),
      lat: Number(m[2])
    };
  })
  .filter((s): s is ElevatorStation => s !== null);

export function countSeoulElevatorStations(): number {
  return STATIONS.length;
}

// 두 좌표 사이 직선 거리 (km). tour-api의 distanceKm과 동일 공식.
function distKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface NearestElevator {
  name: string;
  district: string;
  distanceM: number;
  walkMin: number; // 도보 추정 (성인 4km/h = 67m/min)
}

// 1.5km 이상은 "도보권 밖"으로 보고 null 반환.
export function findNearestSeoulElevator(
  lat: number,
  lng: number,
  maxKm = 1.5
): NearestElevator | null {
  let best: { s: ElevatorStation; km: number } | null = null;
  for (const s of STATIONS) {
    const km = distKm(lat, lng, s.lat, s.lng);
    if (km > maxKm) continue;
    if (!best || km < best.km) best = { s, km };
  }
  if (!best) return null;
  const distanceM = Math.round(best.km * 1000);
  const walkMin = Math.max(1, Math.round(distanceM / 67));
  return {
    name: best.s.name,
    district: best.s.district,
    distanceM,
    walkMin
  };
}
