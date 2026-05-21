// 국립중앙의료원_전국 응급의료기관 정보 조회 서비스 (data.go.kr).
// 코스 좌표 인근 응급실 1~3곳을 위경도 기반으로 조회 (getEgytLcinfoInqire).
//
// 응답 차이 주의: TourAPI는 resultCode "0000"이지만 이 API는 "00".
// TOUR_API_KEY와 동일한 data.go.kr 키 사용 (별도 EMERGENCY_API_KEY가 있으면 우선).

const ENDPOINT =
  "https://apis.data.go.kr/B552657/ErmctInfoInqireService/getEgytLcinfoInqire";

export interface EmergencyRoom {
  name: string; // dutyName
  addr: string;
  tel?: string;
  distanceKm: number; // API가 반환하는 거리 (소수 1~2자리)
  divName?: string; // 종합병원/병원/의원 등
  hpid: string;
  hours?: string; // "08:30-17:00" 형태로 startTime-endTime
  lat: number;
  lng: number;
}

function getKey(): string | null {
  return (
    process.env.EMERGENCY_API_KEY ||
    process.env.TOUR_API_KEY ||
    null
  );
}

export function hasEmergencyKey(): boolean {
  return getKey() !== null;
}

function fmtTime(t: string | number | undefined): string | undefined {
  if (t === undefined || t === "") return undefined;
  const s = String(t).padStart(4, "0");
  return `${s.slice(0, 2)}:${s.slice(2)}`;
}

export async function findNearbyEmergencyRooms(
  lat: number,
  lng: number,
  limit = 3
): Promise<EmergencyRoom[]> {
  const key = getKey();
  if (!key) return [];

  const qs = new URLSearchParams({
    serviceKey: decodeURIComponent(key),
    WGS84_LAT: String(lat),
    WGS84_LON: String(lng),
    pageNo: "1",
    numOfRows: String(limit),
    _type: "json"
  });

  try {
    const res = await fetch(`${ENDPOINT}?${qs.toString()}`, {
      next: { revalidate: 3600 }
    });
    if (!res.ok) return [];
    const text = await res.text();
    if (!text.trim().startsWith("{")) return [];
    const json = JSON.parse(text);
    // 이 API는 resultCode "00"이 정상.
    if (json?.response?.header?.resultCode !== "00") return [];
    const itemRaw = json?.response?.body?.items?.item;
    if (!itemRaw) return [];
    const items = Array.isArray(itemRaw) ? itemRaw : [itemRaw];
    return items
      .map(
        (it: any): EmergencyRoom => ({
          name: String(it.dutyName ?? ""),
          addr: String(it.dutyAddr ?? ""),
          tel: it.dutyTel1 ? String(it.dutyTel1) : undefined,
          distanceKm:
            typeof it.distance === "number"
              ? Math.round(it.distance * 10) / 10
              : Number(it.distance) || 0,
          divName: it.dutyDivName ? String(it.dutyDivName) : undefined,
          hpid: String(it.hpid ?? ""),
          hours:
            it.startTime && it.endTime
              ? `${fmtTime(it.startTime)}-${fmtTime(it.endTime)}`
              : undefined,
          lat: Number(it.latitude) || lat,
          lng: Number(it.longitude) || lng
        })
      )
      .filter((r) => r.name);
  } catch {
    return [];
  }
}
