import type { TourSpot, BarrierFreeInfo, CityCode } from "@/types";
import { CITY_CONFIG } from "./cities";
import { MOCK_SPOTS, MOCK_BARRIER_FREE } from "./mock-data";

const BASE = "https://apis.data.go.kr/B551011";

// TourAPI는 v1(3.0대)과 v2(4.0대)가 공존. 데이터셋 신청 시점에 따라 한쪽만 동작.
// 무장애 여행 정보: KorWithService(1|2) · 국문 관광정보: KorService(1|2)
const BF_VARIANTS = [
  { service: "KorWithService2", suffix: "2" },
  { service: "KorWithService1", suffix: "1" }
];

function useMock(): boolean {
  return process.env.USE_MOCK_TOUR_API === "true" || !process.env.TOUR_API_KEY;
}

function buildUrl(service: string, op: string, params: Record<string, string>): string {
  const key = process.env.TOUR_API_KEY ?? "";
  const qs = new URLSearchParams({
    serviceKey: decodeURIComponent(key),
    MobileOS: "ETC",
    MobileApp: "TripForAll",
    _type: "json",
    ...params
  });
  return `${BASE}/${service}/${op}?${qs.toString()}`;
}

interface TourApiOk<T> {
  response: { body: { items: { item: T | T[] } | string }; header?: { resultCode?: string; resultMsg?: string } };
}

async function tryVariants<T>(
  opBase: string,
  params: Record<string, string>
): Promise<{ items: any[]; service: string; op: string } | null> {
  for (const { service, suffix } of BF_VARIANTS) {
    const op = `${opBase}${suffix}`;
    const url = buildUrl(service, op, params);
    try {
      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (!res.ok) continue;
      const text = await res.text();
      // data.go.kr returns XML error wrapped in HTML when key invalid
      if (!text.trim().startsWith("{")) continue;
      const json = JSON.parse(text) as TourApiOk<any>;
      const code = json?.response?.header?.resultCode;
      if (code && code !== "0000") continue;
      const raw = json?.response?.body?.items;
      if (typeof raw === "string" || !raw) return { items: [], service, op };
      const item = (raw as any).item;
      if (!item) return { items: [], service, op };
      const items = Array.isArray(item) ? item : [item];
      return { items, service, op };
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * 도시(area) 기반 무장애 관광지 리스트.
 * 무장애 서비스 응답이 비면 일반 관광 데이터에서 fallback.
 */
export async function listBarrierFreeSpots(city: CityCode, limit = 12): Promise<TourSpot[]> {
  if (useMock()) return MOCK_SPOTS[city] ?? [];

  const { areaCode } = CITY_CONFIG[city];
  const result = await tryVariants("areaBasedList", {
    numOfRows: String(limit),
    pageNo: "1",
    areaCode
  });
  if (!result || result.items.length === 0) return MOCK_SPOTS[city] ?? [];
  return result.items.map(mapItemToSpot);
}

export async function getBarrierFreeDetail(contentId: string): Promise<BarrierFreeInfo> {
  if (useMock()) return MOCK_BARRIER_FREE[contentId] ?? { contentId };

  const result = await tryVariants("detailWithTour", { contentId });
  if (!result || result.items.length === 0) {
    return MOCK_BARRIER_FREE[contentId] ?? { contentId };
  }
  return mapBarrierFreeItem(contentId, result.items[0]);
}

// 진단용: 어느 variant가 실제로 통하는지 한 번에 확인.
export async function diagnoseTourApi(): Promise<{
  hasKey: boolean;
  mock: boolean;
  attempts: Array<{ service: string; op: string; url: string; status: number; bodyHead: string }>;
}> {
  const hasKey = !!process.env.TOUR_API_KEY;
  const mock = useMock();
  const attempts: any[] = [];
  if (!hasKey || mock) return { hasKey, mock, attempts };

  for (const { service, suffix } of BF_VARIANTS) {
    const op = `areaBasedList${suffix}`;
    const url = buildUrl(service, op, { numOfRows: "1", pageNo: "1", areaCode: "1" });
    try {
      const res = await fetch(url);
      const text = await res.text();
      attempts.push({
        service,
        op,
        url: url.replace(/serviceKey=[^&]+/, "serviceKey=***"),
        status: res.status,
        bodyHead: text.slice(0, 240)
      });
    } catch (e: any) {
      attempts.push({
        service,
        op,
        url: url.replace(/serviceKey=[^&]+/, "serviceKey=***"),
        status: 0,
        bodyHead: String(e.message ?? e)
      });
    }
  }
  return { hasKey, mock, attempts };
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
