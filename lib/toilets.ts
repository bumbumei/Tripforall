// 전국 공중화장실 중 장애인용 변기가 있는 화장실 11k+건.
// 원본: 공공데이터포털 공중화장실정보(행정안전부 표준데이터셋, CP949 CSV 53k건)
// 빌드 스크립트: scripts/build-toilets.mjs — 장애인 변기 ≥1개 + 유효 좌표만 필터
//
// 활용:
//   - 코스 스팟 반경 N미터 안의 장애인 화장실 1~3곳 검색
//   - course-builder의 enrichBarrierFree에서 restroom 텍스트에 가장 가까운 1곳 보강
//   - 향후 result 페이지에 별도 카드로도 노출 가능

import toiletData from "./data/accessible-toilets.json" with { type: "json" };

interface RawToilet {
  n: string; // name 화장실명
  a: string; // 주소
  lat: number;
  lng: number;
  c: number; // accessible 변기 총 개수
  o: string; // 개방시간
  b: 0 | 1; // 비상벨 (1=Y)
}

const TOILETS: RawToilet[] = toiletData as RawToilet[];

export function countAccessibleToilets(): number {
  return TOILETS.length;
}

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

export interface NearbyToilet {
  name: string;
  address: string;
  distanceM: number;
  walkMin: number;
  accessibleCount: number;
  openHours: string;
  hasEmergencyBell: boolean;
}

// 반경 N미터 안의 장애인 화장실을 거리순으로 limit개.
// 좌표가 한반도 어디든 검색됨.
export function findNearbyAccessibleToilets(
  lat: number,
  lng: number,
  radiusM = 500,
  limit = 3
): NearbyToilet[] {
  // 위경도 0.01도 ≈ 1km 박스로 1차 필터 (전체 11k 풀스캔 회피)
  const dDeg = radiusM / 100000; // 100km/deg 근사
  const candidates: Array<{ t: RawToilet; km: number }> = [];
  for (const t of TOILETS) {
    if (Math.abs(t.lat - lat) > dDeg && Math.abs(t.lng - lng) > dDeg) continue;
    const km = distKm(lat, lng, t.lat, t.lng);
    if (km * 1000 > radiusM) continue;
    candidates.push({ t, km });
  }
  candidates.sort((a, b) => a.km - b.km);
  return candidates.slice(0, limit).map(({ t, km }) => {
    const distanceM = Math.round(km * 1000);
    return {
      name: t.n,
      address: t.a,
      distanceM,
      walkMin: Math.max(1, Math.round(distanceM / 67)),
      accessibleCount: t.c,
      openHours: t.o || "정보 없음",
      hasEmergencyBell: t.b === 1
    };
  });
}
