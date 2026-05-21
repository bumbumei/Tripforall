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

// 무장애 데이터셋 권한이 아직 풀리지 않은 경우의 폴백.
// 일반 국문 관광정보(KorService2)로 실 스팟은 가져오되, 무장애 25항목은 비어있게 됨.
const GENERAL_VARIANTS = [{ service: "KorService2", suffix: "2" }];

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
  params: Record<string, string>,
  variants: Array<{ service: string; suffix: string }> = BF_VARIANTS
): Promise<{ items: any[]; service: string; op: string } | null> {
  for (const { service, suffix } of variants) {
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
export async function listBarrierFreeSpots(
  city: CityCode,
  limit = 12,
  sigunguCode?: string
): Promise<TourSpot[]> {
  if (useMock()) return MOCK_SPOTS[city] ?? [];

  const { areaCode } = CITY_CONFIG[city];
  // arrange=P: 인기순. TourAPI 기본은 가나다순이라 시연 코스가 망가짐.
  const params: Record<string, string> = {
    numOfRows: String(limit),
    pageNo: "1",
    areaCode,
    arrange: "P"
  };
  if (sigunguCode) params.sigunguCode = sigunguCode;

  // 1순위: 무장애 데이터셋
  let result = await tryVariants("areaBasedList", params, BF_VARIANTS);

  // 2순위: 일반 국문 관광정보 — 무장애 데이터셋 권한 대기 중일 때 그래도 실 스팟은 노출.
  // (무장애 25항목은 detail 조회 시 비어있게 됨 → 화면은 mock detail 또는 빈 상태로 graceful)
  if (!result || result.items.length === 0) {
    result = await tryVariants("areaBasedList", params, GENERAL_VARIANTS);
  }

  // 3순위: mock
  if (!result || result.items.length === 0) return MOCK_SPOTS[city] ?? [];
  return result.items.map(mapItemToSpot);
}

// detailIntro2: 콘텐츠 타입별 추가 정보 (운영시간·휴무일 등).
// 응답이 콘텐츠 타입마다 달라서 공통 형태로 정규화.
export interface SpotIntro {
  contentId: string;
  restdate?: string; // 휴무일 자유 텍스트
  usetime?: string; // 운영시간 자유 텍스트
  infocenter?: string; // 안내 전화
  parking?: string;
}

export async function getSpotIntro(
  contentId: string,
  contentTypeId: string
): Promise<SpotIntro> {
  if (useMock()) return { contentId };
  const result = await tryVariants(
    "detailIntro",
    { contentId, contentTypeId },
    [{ service: "KorService2", suffix: "2" }]
  );
  const item = result?.items?.[0];
  if (!item) return { contentId };
  return {
    contentId,
    // 식당(ct=39)은 restdatefood/opentimefood, 그 외는 restdate/usetime
    restdate: item.restdate ?? item.restdatefood ?? item.restdateculture ?? item.restdateleports,
    usetime: item.usetime ?? item.opentimefood ?? item.usetimeculture ?? item.usetimeleports,
    infocenter: item.infocenter ?? item.infocenterfood ?? item.infocenterculture,
    parking: item.parking ?? item.parkingfood ?? item.parkingculture
  };
}

// detailCommon2: 스팟 공통 정보 (홈페이지·소개글·전화).
export interface SpotCommon {
  contentId: string;
  homepage?: string; // URL만 추출 (HTML 안에 <a href="..."> 형태로 옴)
  homepageText?: string; // 화면에 보일 짧은 라벨 (도메인)
  overview?: string; // 소개글 (HTML 태그 제거 후 첫 ~200자)
  tel?: string;
}

function extractHomepage(html: string | undefined): { url?: string; label?: string } {
  if (!html) return {};
  const m = html.match(/href=["']?([^"'>\s]+)/i);
  const url = m?.[1];
  if (!url) return {};
  try {
    const domain = new URL(url).hostname.replace(/^www\./, "");
    return { url, label: domain };
  } catch {
    return { url };
  }
}

function stripHtml(s: string | undefined, max = 220): string | undefined {
  if (!s) return undefined;
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

export async function getSpotCommon(contentId: string): Promise<SpotCommon> {
  if (useMock()) return { contentId };
  const result = await tryVariants("detailCommon", { contentId }, [
    { service: "KorService2", suffix: "2" }
  ]);
  const item = result?.items?.[0];
  if (!item) return { contentId };
  const hp = extractHomepage(item.homepage);
  return {
    contentId,
    homepage: hp.url,
    homepageText: hp.label,
    overview: stripHtml(item.overview),
    tel: item.tel || undefined
  };
}

// detailInfo2: 콘텐츠 타입별 반복정보 (관광지의 입장료·주차요금·화장실 등).
// 응답이 콘텐츠 타입마다 다르고 식당·문화시설은 보통 비어 있음.
export interface SpotDetailInfo {
  name: string; // infoname (예: "입장료", "주차요금")
  text: string; // infotext (HTML 태그 제거)
}

export async function getSpotDetailInfo(
  contentId: string,
  contentTypeId: string
): Promise<SpotDetailInfo[]> {
  if (useMock()) return [];
  const result = await tryVariants(
    "detailInfo",
    { contentId, contentTypeId, numOfRows: "10" },
    [{ service: "KorService2", suffix: "2" }]
  );
  if (!result?.items?.length) return [];
  return result.items
    .map((it: any) => ({
      name: String(it.infoname ?? "").trim(),
      text: String(it.infotext ?? "")
        .replace(/<br\s*\/?>/gi, " · ")
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim()
    }))
    .filter((x): x is SpotDetailInfo => !!x.name && !!x.text);
}

// detailImage2: 콘텐츠 추가 이미지 URL 목록.
// firstImage(목록 기본 이미지) 외 갤러리. 큰 사진/썸네일 모두 반환.
export async function getSpotImages(contentId: string): Promise<string[]> {
  if (useMock()) return [];
  // KCISA/web 캐시 친화. 5초 timeout.
  const params: Record<string, string> = { contentId, imageYN: "Y", numOfRows: "5" };
  const result = await tryVariants("detailImage", params, [{ service: "KorService2", suffix: "2" }]);
  if (!result?.items?.length) return [];
  return result.items
    .map((it: any) => it.originimgurl || it.smallimageurl)
    .filter((u: any): u is string => typeof u === "string" && u.length > 0);
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

  for (const { service, suffix } of [...BF_VARIANTS, ...GENERAL_VARIANTS]) {
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
