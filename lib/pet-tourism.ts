// 한국관광공사 반려동물 동반여행 API (KorPetTourService2).
// End Point: https://apis.data.go.kr/B551011/KorPetTourService2
// 응답·파라미터 형태가 일반 TourAPI(KorService2)와 동일.
//
// 활용:
//   - findPetTourSpots(city, sigungu?) → pet 테마 시 코스 풀
//   - isPetFriendly(city, contentId) → 다른 테마 코스의 스팟이 반려동물 동반 가능한지 인증 배지
//
// 도시별 영업/등록 스팟 24시간 캐시 (한 번 받으면 모든 contentId 빠르게 매칭).

import type { CityCode, TourSpot } from "@/types";
import { CITY_CONFIG } from "./cities";

const ENDPOINT = "https://apis.data.go.kr/B551011/KorPetTourService2";

interface PetRaw {
  contentid: string;
  contenttypeid: string;
  title: string;
  addr1?: string;
  addr2?: string;
  mapx: string;
  mapy: string;
  firstimage?: string;
  cat1?: string;
  cat2?: string;
  cat3?: string;
  areacode?: string;
  sigungucode?: string;
  tel?: string;
}

function getKey(): string | null {
  return process.env.TOUR_API_KEY || null;
}

// 도시별 반려동물 동반 가능 스팟 캐시 — 한 번 받으면 contentId 매칭에 재사용.
const PET_CACHE = new Map<CityCode, { at: number; data: TourSpot[]; ids: Set<string> }>();
const PET_TTL_MS = 24 * 60 * 60 * 1000;

async function fetchPetPage(
  city: CityCode,
  pageNo: number,
  sigunguCode?: string,
  numOfRows = 100
): Promise<PetRaw[]> {
  const key = getKey();
  if (!key) return [];
  const { areaCode } = CITY_CONFIG[city];
  const params = new URLSearchParams({
    serviceKey: key,
    MobileOS: "ETC",
    MobileApp: "TripForAll",
    _type: "json",
    numOfRows: String(numOfRows),
    pageNo: String(pageNo),
    areaCode,
    arrange: "A"
  });
  if (sigunguCode) params.set("sigunguCode", sigunguCode);

  // 5초 timeout (한국관광공사 일부 신규 API가 가끔 느림)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${ENDPOINT}/areaBasedList2?${params.toString()}`, {
      next: { revalidate: 3600 },
      signal: controller.signal
    });
    if (!res.ok) return [];
    const text = await res.text();
    if (!text.trim().startsWith("{")) return []; // 403 등 HTML 응답
    const j = JSON.parse(text);
    const code = j?.response?.header?.resultCode;
    if (code && code !== "0000") return [];
    const items = j?.response?.body?.items?.item;
    if (!items) return [];
    return Array.isArray(items) ? items : [items];
  } catch {
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

function rawToSpot(it: PetRaw): TourSpot | null {
  const lat = Number(it.mapy);
  const lng = Number(it.mapx);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) return null;
  return {
    contentId: String(it.contentid ?? ""),
    contentTypeId: String(it.contenttypeid ?? "12"),
    title: it.title ?? "",
    addr1: it.addr1 ?? "",
    mapX: lng,
    mapY: lat,
    firstImage: it.firstimage ?? undefined,
    cat1: it.cat1,
    cat2: it.cat2,
    cat3: it.cat3,
    areaCode: it.areacode,
    sigunguCode: it.sigungucode,
    tel: it.tel
  };
}

async function ensurePetCache(city: CityCode): Promise<{ data: TourSpot[]; ids: Set<string> }> {
  const cached = PET_CACHE.get(city);
  if (cached && Date.now() - cached.at < PET_TTL_MS) return cached;

  // 페이지 1~3 병렬 (총 300건) — 도시별 반려동물 동반 가능 스팟 풀.
  const pages = await Promise.all([1, 2, 3].map((p) => fetchPetPage(city, p)));
  const spots: TourSpot[] = [];
  const ids = new Set<string>();
  for (const raw of pages.flat()) {
    const s = rawToSpot(raw);
    if (!s || !s.contentId || ids.has(s.contentId)) continue;
    ids.add(s.contentId);
    spots.push(s);
  }
  const entry = { at: Date.now(), data: spots, ids };
  PET_CACHE.set(city, entry);
  return entry;
}

// pet 테마 시 메인 코스 풀로 사용. 시·군·구 좁히기는 호출 측에서 좌표 기반.
export async function findPetTourSpots(city: CityCode, sigunguCode?: string): Promise<TourSpot[]> {
  if (!getKey()) return [];
  const { data } = await ensurePetCache(city);
  if (!sigunguCode) return data;
  return data.filter((s) => s.sigunguCode === sigunguCode);
}

// 다른 테마 코스의 각 스팟이 반려동물 동반 등록 장소인지 확인 (인증 배지).
export async function isPetFriendly(city: CityCode, contentId: string): Promise<boolean> {
  if (!getKey()) return false;
  const { ids } = await ensurePetCache(city);
  return ids.has(contentId);
}
