import type { TourSpot, BarrierFreeInfo, CityCode } from "@/types";
import { CITY_CONFIG } from "./cities";
import { MOCK_SPOTS, MOCK_BARRIER_FREE } from "./mock-data";

const BASE = "https://apis.data.go.kr/B551011";
// 무장애 여행 정보 서비스
const BF_ENDPOINT = `${BASE}/KorWithService2`;
// 국문 관광정보 서비스 (보강용)
const KOR_ENDPOINT = `${BASE}/KorService2`;

function useMock(): boolean {
  return process.env.USE_MOCK_TOUR_API === "true" || !process.env.TOUR_API_KEY;
}

function buildUrl(endpoint: string, op: string, params: Record<string, string>): string {
  const key = process.env.TOUR_API_KEY ?? "";
  const qs = new URLSearchParams({
    serviceKey: decodeURIComponent(key),
    MobileOS: "ETC",
    MobileApp: "TripForAll",
    _type: "json",
    ...params
  });
  return `${endpoint}/${op}?${qs.toString()}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`TourAPI ${res.status}`);
  return res.json() as Promise<T>;
}

/**
 * 도시(area) 기반 무장애 관광지 리스트.
 * 무장애 서비스 응답이 비면 일반 관광 데이터에서 fallback.
 */
export async function listBarrierFreeSpots(city: CityCode, limit = 12): Promise<TourSpot[]> {
  if (useMock()) return MOCK_SPOTS[city] ?? [];

  const { areaCode } = CITY_CONFIG[city];
  const url = buildUrl(BF_ENDPOINT, "areaBasedList2", {
    numOfRows: String(limit),
    pageNo: "1",
    areaCode
  });
  try {
    const json = await fetchJson<any>(url);
    const items = json?.response?.body?.items?.item ?? [];
    return (Array.isArray(items) ? items : [items]).map(mapItemToSpot);
  } catch {
    return MOCK_SPOTS[city] ?? [];
  }
}

export async function getBarrierFreeDetail(contentId: string): Promise<BarrierFreeInfo> {
  if (useMock()) return MOCK_BARRIER_FREE[contentId] ?? { contentId };

  const url = buildUrl(BF_ENDPOINT, "detailWithTour2", {
    contentId
  });
  try {
    const json = await fetchJson<any>(url);
    const item = json?.response?.body?.items?.item;
    const row = Array.isArray(item) ? item[0] : item;
    if (!row) return { contentId };
    return mapBarrierFreeItem(contentId, row);
  } catch {
    return MOCK_BARRIER_FREE[contentId] ?? { contentId };
  }
}

function mapItemToSpot(it: any): TourSpot {
  return {
    contentId: String(it.contentid ?? it.contentId ?? ""),
    contentTypeId: String(it.contenttypeid ?? it.contentTypeId ?? "12"),
    title: it.title ?? "",
    addr1: it.addr1 ?? "",
    mapX: Number(it.mapx ?? it.mapX ?? 0),
    mapY: Number(it.mapy ?? it.mapY ?? 0),
    firstImage: it.firstimage ?? undefined,
    cat1: it.cat1,
    cat2: it.cat2,
    cat3: it.cat3,
    areaCode: it.areacode,
    sigunguCode: it.sigungucode,
    tel: it.tel
  };
}

function mapBarrierFreeItem(contentId: string, row: any): BarrierFreeInfo {
  return {
    contentId,
    wheelchair: row.wheelchair,
    parking: row.parking,
    elevator: row.elevator,
    restroom: row.restroom,
    ramp: row.route, // 무장애 경로/경사로
    braileBlock: row.braileblock,
    braileGuide: row.braileinfo,
    audioGuide: row.audioguide,
    guideDog: row.guidedog,
    signLanguage: row.signguide,
    videoGuide: row.videoguide,
    hearingHandicapEtc: row.hearinghandicapetc,
    babyStroller: row.stroller,
    lactationRoom: row.lactationroom,
    exit: row.exit,
    ticketOffice: row.ticketoffice,
    publicTransport: row.publictransport,
    promotion: row.promotion,
    bigPrint: row.bigprint,
    brailleSign: row.braillepromotion,
    guideHuman: row.guidehuman,
    guideSystem: row.guidesystem,
    trail: row.trail,
    raw: row
  };
}

// 두 지점 사이 직선 거리 (km, Haversine)
export function distanceKm(a: TourSpot, b: TourSpot): number {
  const R = 6371;
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(b.mapY - a.mapY);
  const dLng = toRad(b.mapX - a.mapX);
  const lat1 = toRad(a.mapY);
  const lat2 = toRad(b.mapY);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
