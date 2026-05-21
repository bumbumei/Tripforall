// 한국관광공사 웰니스관광정보 API.
// End Point: https://apis.data.go.kr/B551011/WellnessTursmService
//
// 활용 패턴:
//   - searchKeyword가 가장 안정적 (areaBasedList는 areaCode 형식이 일반 TourAPI와 다름)
//   - 응답에 baseAddr로 도시 매칭 후 좌표 기반 거리 필터
//   - 응답에 orgImage/thumbImage가 있어 detailImage 별도 호출 불필요 (보너스)

import type { CityCode, TourSpot } from "@/types";

const ENDPOINT = "https://apis.data.go.kr/B551011/WellnessTursmService";

// 웰니스 검색에 쓰는 일반 키워드. 도시별로 여러 키워드 병렬 호출 후 통합.
const WELLNESS_KEYWORDS = ["스파", "온천", "치유", "요가", "명상", "찜질"];

const CITY_TO_KO_PREFIX: Record<CityCode, string> = {
  seoul: "서울",
  busan: "부산",
  jeju: "제주",
  gyeonggi: "경기"
};

interface WellnessRaw {
  contentId: string;
  contentTypeId: string;
  title: string;
  baseAddr: string;
  detailAddr?: string;
  mapX: string;
  mapY: string;
  orgImage?: string;
  thumbImage?: string;
  tel?: string;
  wellnessThemaCd?: string;
}

export interface WellnessSpot {
  contentId: string;
  contentTypeId: string;
  title: string;
  addr: string;
  lat: number;
  lng: number;
  image?: string;
  tel?: string;
}

function getKey(): string | null {
  return process.env.TOUR_API_KEY || null;
}

async function searchOne(keyword: string): Promise<WellnessRaw[]> {
  const key = getKey();
  if (!key) return [];
  const params = new URLSearchParams({
    serviceKey: key,
    MobileOS: "ETC",
    MobileApp: "TripForAll",
    _type: "json",
    numOfRows: "50",
    pageNo: "1",
    keyword,
    langDivCd: "ko"
  });
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${ENDPOINT}/searchKeyword?${params.toString()}`, {
      next: { revalidate: 3600 },
      signal: controller.signal
    });
    if (!res.ok) return [];
    const j = await res.json();
    const items = j?.response?.body?.items?.item;
    if (!items) return [];
    return Array.isArray(items) ? items : [items];
  } catch {
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

// 도시별 웰니스 스팟 풀 — 키워드 6개 병렬 호출 후 도시 주소 필터 + 중복 제거.
let WELLNESS_CACHE = new Map<CityCode, { at: number; data: WellnessSpot[] }>();
const WELLNESS_TTL_MS = 24 * 60 * 60 * 1000;

export async function findWellnessSpots(city: CityCode): Promise<WellnessSpot[]> {
  if (!getKey()) return [];
  const cached = WELLNESS_CACHE.get(city);
  if (cached && Date.now() - cached.at < WELLNESS_TTL_MS) return cached.data;

  const cityPrefix = CITY_TO_KO_PREFIX[city];
  const results = await Promise.all(WELLNESS_KEYWORDS.map(searchOne));
  const all = results.flat();
  const seen = new Set<string>();
  const out: WellnessSpot[] = [];
  for (const it of all) {
    if (seen.has(it.contentId)) continue;
    seen.add(it.contentId);
    // 도시 필터 — baseAddr가 "서울특별시…" 같은 형태
    if (!it.baseAddr || !it.baseAddr.includes(cityPrefix)) continue;
    const lat = Number(it.mapY);
    const lng = Number(it.mapX);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) continue;
    out.push({
      contentId: it.contentId,
      contentTypeId: it.contentTypeId,
      title: it.title,
      addr: `${it.baseAddr} ${it.detailAddr ?? ""}`.trim(),
      lat,
      lng,
      image: it.orgImage || it.thumbImage,
      tel: it.tel || undefined
    });
  }
  WELLNESS_CACHE.set(city, { at: Date.now(), data: out });
  return out;
}

export function wellnessToTourSpot(w: WellnessSpot): TourSpot {
  return {
    contentId: w.contentId,
    contentTypeId: w.contentTypeId,
    title: w.title,
    addr1: w.addr,
    mapX: w.lng,
    mapY: w.lat,
    firstImage: w.image,
    cat1: "A02" // 인문 — 웰니스 시설 보통 인문 분류
  };
}
