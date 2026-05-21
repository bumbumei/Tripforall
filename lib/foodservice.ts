// 행정안전부 식당 4종 API 통합.
//  1) 모범음식점 (excellent_restaurant_info) — 좌표 없음, 이름 매칭 인증 배지로만 사용
//  2) 일반음식점 (general_restaurants) — 좌표 EPSG:5174 → WGS84 변환 후 직접 매칭
//  3) 휴게음식점 (endpoint 미확정)
//  4) 관광식당 (endpoint 미확정)
//
// 모두 같은 data.go.kr 키 (TOUR_API_KEY) 사용.
// 일반음식점은 50만건+ 규모라 도시별 페이지 캐시 메모리에 한 번만 적재.

import proj4 from "proj4";
import type { CityCode, CuisinePref, TourSpot } from "@/types";

const BASE = "https://apis.data.go.kr/1741000";

// EPSG:5174 — Bessel 중부원점 TM (data.go.kr 식당 데이터 좌표계)
proj4.defs(
  "EPSG:5174",
  "+proj=tmerc +lat_0=38 +lon_0=127.0028902777778 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +towgs84=-115.8,474.99,674.11,1.16,-2.31,-1.63,6.43 +units=m +no_defs"
);
const tm5174ToWGS84 = proj4("EPSG:5174", "WGS84");

function toWGS84(x: number, y: number): { lat: number; lng: number } | null {
  if (!Number.isFinite(x) || !Number.isFinite(y) || x === 0 || y === 0) return null;
  try {
    const [lng, lat] = tm5174ToWGS84.forward([x, y]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    // 한반도 대략 범위 검증
    if (lat < 33 || lat > 39 || lng < 124 || lng > 132) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

function getKey(): string | null {
  return process.env.TOUR_API_KEY || null;
}

export function hasFoodserviceKey(): boolean {
  return getKey() !== null;
}

// ────────────────────────────────────────────────────────────────
// 모범음식점 (excellent_restaurant_info)
// ────────────────────────────────────────────────────────────────

export interface ExcellentRestaurant {
  name: string; // BSNSSP_NM
  roadAddr: string; // ROAD_NM_ADDR
  lotAddr: string; // LCTN_ADDR
  tel: string;
  status: string; // SALS_STTS_NM ("영업" 등)
  designatedYmd: string; // DSGN_YMD
  principalFoodKind: string; // PRINC_FD_KND (한식·일식·중식 등)
  foodOfType: string; // FD_OF_TYPE
}

interface ExcellentRaw {
  BSNSSP_NM: string;
  ROAD_NM_ADDR: string;
  LCTN_ADDR: string;
  TELNO: string;
  SALS_STTS_NM: string;
  SALS_STTS_CD: string;
  DSGN_YMD: string;
  PRINC_FD_KND: string;
  FD_OF_TYPE: string;
}

// 영업 중인 모범음식점 페이지를 가져옴. 페이지 단위로 호출.
async function fetchExcellentPage(page: number, perPage = 100): Promise<ExcellentRestaurant[]> {
  const key = getKey();
  if (!key) return [];
  const url = `${BASE}/excellent_restaurant_info/info?serviceKey=${encodeURIComponent(key)}&pageNo=${page}&numOfRows=${perPage}&type=json`;
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } }); // 1일 캐시
    if (!res.ok) return [];
    const j = await res.json();
    const items: ExcellentRaw[] = j?.response?.body?.items?.item ?? [];
    return items
      .filter((it) => it.SALS_STTS_CD === "01") // 영업 중만
      .map((it) => ({
        name: it.BSNSSP_NM || "",
        roadAddr: it.ROAD_NM_ADDR || "",
        lotAddr: it.LCTN_ADDR || "",
        tel: it.TELNO || "",
        status: it.SALS_STTS_NM || "",
        designatedYmd: it.DSGN_YMD || "",
        principalFoodKind: it.PRINC_FD_KND || "",
        foodOfType: it.FD_OF_TYPE || ""
      }));
  } catch {
    return [];
  }
}

// 모듈 내 메모리 캐시 — 서울 일대 모범음식점 인덱스를 한 번만 구축.
// 24시간 TTL. 좌표가 없어 이름·주소 기반 매칭만 가능.
let EXCELLENT_INDEX: Map<string, ExcellentRestaurant> | null = null;
let EXCELLENT_INDEX_AT = 0;
const EXCELLENT_TTL_MS = 24 * 60 * 60 * 1000;

async function ensureExcellentIndex(): Promise<Map<string, ExcellentRestaurant>> {
  if (EXCELLENT_INDEX && Date.now() - EXCELLENT_INDEX_AT < EXCELLENT_TTL_MS) {
    return EXCELLENT_INDEX;
  }
  // 첫 3페이지(300개)만 — 응답시간 최적화. 인증 매칭 누락은 false negative로 허용.
  const pages = await Promise.all([1, 2, 3].map((p) => fetchExcellentPage(p, 100)));
  const all = pages.flat();
  const idx = new Map<string, ExcellentRestaurant>();
  for (const r of all) {
    const k = normalizeKey(r.name, r.roadAddr);
    if (k) idx.set(k, r);
  }
  EXCELLENT_INDEX = idx;
  EXCELLENT_INDEX_AT = Date.now();
  return idx;
}

function normalizeKey(name: string, addr: string): string {
  return `${name.replace(/\s+/g, "")}|${addr.replace(/\s+/g, "").slice(0, 30)}`;
}

// 코스 식당이 모범음식점인지 확인. 이름 + 주소 부분 매칭.
// 좌표가 없어 정확도 한계 — 이름이 같으나 다른 지점/주소면 false negative 가능.
export async function isExcellentRestaurant(
  spotName: string,
  spotAddr: string
): Promise<ExcellentRestaurant | null> {
  if (!getKey()) return null;
  const idx = await ensureExcellentIndex();
  const key = normalizeKey(spotName, spotAddr);
  if (idx.has(key)) return idx.get(key)!;

  // 부분 매칭 — 이름만이라도 일치하면 후보
  const normName = spotName.replace(/\s+/g, "");
  for (const r of idx.values()) {
    if (r.name.replace(/\s+/g, "") === normName) return r;
  }
  return null;
}

// ────────────────────────────────────────────────────────────────
// 일반음식점 (general_restaurants) — 좌표 있음, 코스 직접 매칭 가능
// ────────────────────────────────────────────────────────────────

export interface GeneralRestaurant {
  name: string; // BPLC_NM
  bizType: string; // BZSTAT_SE_NM (한식·중식·일식·경양식·분식 등)
  roadAddr: string;
  lotAddr: string;
  tel: string;
  lat: number;
  lng: number;
  homepage?: string;
}

interface GeneralRaw {
  BPLC_NM: string;
  BZSTAT_SE_NM: string;
  SNTTN_BZSTAT_NM: string;
  ROAD_NM_ADDR: string;
  LOTNO_ADDR: string;
  TELNO: string;
  CRD_INFO_X: string | number;
  CRD_INFO_Y: string | number;
  SALS_STTS_CD: string;
  OPN_ATMY_GRP_CD: string;
  HPG?: string;
}

// 업태(BZSTAT_SE_NM) → 우리 cuisine 매핑.
// 매칭 안 되는 업태(분식·기타)는 'any'로 분류.
function bizTypeToCuisine(bizType: string): CuisinePref {
  const t = bizType.replace(/\s+/g, "");
  if (t.includes("한식") || t.includes("국밥") || t.includes("분식")) return "korean";
  if (t.includes("중식") || t.includes("중국")) return "chinese";
  if (t.includes("일식") || t.includes("일본")) return "japanese";
  if (t.includes("경양식") || t.includes("양식") || t.includes("서양")) return "western";
  if (t.includes("카페") || t.includes("커피") || t.includes("제과") || t.includes("디저트")) {
    return "cafe";
  }
  return "any";
}

// 개방자치단체코드 prefix → 시·도 매핑 (코드 첫 1자리).
// 서울=3, 부산=2, 대구=5, 제주=1 등은 데이터 확인 필요. 정확 매핑은 별도 xlsx 참고.
// 일단 주소 기반 시·도 필터 사용 (코드 매핑 보강은 follow-up).

async function fetchGeneralPage(
  page: number,
  perPage: number,
  cityFilter?: string // 시·도명 ("서울", "부산", "제주")
): Promise<GeneralRestaurant[]> {
  const key = getKey();
  if (!key) return [];
  const url = `${BASE}/general_restaurants/info?serviceKey=${encodeURIComponent(key)}&pageNo=${page}&numOfRows=${perPage}&type=json`;
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return [];
    const j = await res.json();
    const items: GeneralRaw[] = j?.response?.body?.items?.item ?? [];
    const out: GeneralRestaurant[] = [];
    for (const it of items) {
      if (it.SALS_STTS_CD !== "01") continue; // 영업 중만
      const addr = it.ROAD_NM_ADDR || it.LOTNO_ADDR || "";
      if (cityFilter && !addr.includes(cityFilter)) continue;
      const coord = toWGS84(Number(it.CRD_INFO_X), Number(it.CRD_INFO_Y));
      if (!coord) continue;
      out.push({
        name: it.BPLC_NM || "",
        bizType: it.BZSTAT_SE_NM || it.SNTTN_BZSTAT_NM || "",
        roadAddr: it.ROAD_NM_ADDR || "",
        lotAddr: it.LOTNO_ADDR || "",
        tel: it.TELNO || "",
        lat: coord.lat,
        lng: coord.lng,
        homepage: it.HPG || undefined
      });
    }
    return out;
  } catch {
    return [];
  }
}

// 도시별 영업 중 일반음식점을 5페이지(최대 500건)까지 받아 메모리 캐시 (1일).
// 50만건+ 전체 인덱싱은 dev 환경에서 비현실적 — 시·도 주소 필터로 좁힌 결과 위주 캐시.
// 좌표·cuisine 기반 검색은 호출 측에서.
const GENERAL_CACHE = new Map<CityCode, { at: number; data: GeneralRestaurant[] }>();
const GENERAL_TTL_MS = 24 * 60 * 60 * 1000;

const CITY_TO_KO: Record<CityCode, string> = {
  seoul: "서울",
  busan: "부산",
  jeju: "제주",
  gyeonggi: "경기"
};

export async function findGeneralRestaurants(
  city: CityCode,
  anchorLat: number,
  anchorLng: number,
  radiusKm: number,
  cuisine?: CuisinePref,
  limit = 5
): Promise<GeneralRestaurant[]> {
  if (!getKey()) return [];
  const cached = GENERAL_CACHE.get(city);
  let all: GeneralRestaurant[];
  if (cached && Date.now() - cached.at < GENERAL_TTL_MS) {
    all = cached.data;
  } else {
    // 2페이지 병렬 (총 2,000건) — 시·도 필터 적용 후 ~수백건이라 코스 보장에 충분.
    // 응답시간 최적화: 5→2페이지로 줄임.
    // 페이지당 200건 x 2 = 400건. 시·도 필터 후 50~150건, 코스 보장에 충분.
    // 1000건은 응답 5-15초 — 200건이 1-3초로 훨씬 빠름.
    const pages = await Promise.all(
      [1, 2].map((p) => fetchGeneralPage(p, 200, CITY_TO_KO[city]))
    );
    all = pages.flat();
    GENERAL_CACHE.set(city, { at: Date.now(), data: all });
  }
  // 거리·cuisine 필터링
  const matched: Array<{ r: GeneralRestaurant; d: number }> = [];
  for (const r of all) {
    const d = distKm(anchorLat, anchorLng, r.lat, r.lng);
    if (d > radiusKm) continue;
    if (cuisine && cuisine !== "any") {
      if (bizTypeToCuisine(r.bizType) !== cuisine) continue;
    }
    matched.push({ r, d });
  }
  matched.sort((a, b) => a.d - b.d);
  return matched.slice(0, limit).map((x) => x.r);
}

function distKm(la1: number, ln1: number, la2: number, ln2: number): number {
  const R = 6371;
  const tr = (n: number) => (n * Math.PI) / 180;
  const dla = tr(la2 - la1);
  const dln = tr(ln2 - ln1);
  const h =
    Math.sin(dla / 2) ** 2 +
    Math.cos(tr(la1)) * Math.cos(tr(la2)) * Math.sin(dln / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// GeneralRestaurant → TourSpot 어댑터 (course-builder가 동일하게 처리).
export function generalToTourSpot(r: GeneralRestaurant, idx: number): TourSpot {
  return {
    contentId: `gen:${idx}:${r.name}`.replace(/\s+/g, "_"),
    contentTypeId: "39",
    title: r.name,
    addr1: r.roadAddr || r.lotAddr,
    mapX: r.lng,
    mapY: r.lat,
    cat1: "A05"
  };
}

// ────────────────────────────────────────────────────────────────
// 휴게음식점 (rest_cafes) — 카페·제과·다방·푸드트럭 등. cuisine=cafe 강화에 사용
// ────────────────────────────────────────────────────────────────

// 휴게음식점 업태 → cuisine 매핑.
// 일반조리판매·패스트푸드는 'any', 카페/제과/다방은 'cafe'.
function restBizTypeToCuisine(bizType: string): CuisinePref {
  const t = bizType.replace(/\s+/g, "");
  if (t.includes("제과") || t.includes("다방") || t.includes("카페") || t.includes("아이스크림")) {
    return "cafe";
  }
  return "any";
}

const REST_CACHE = new Map<CityCode, { at: number; data: GeneralRestaurant[] }>();

async function fetchRestPage(
  page: number,
  perPage: number,
  cityFilter?: string
): Promise<GeneralRestaurant[]> {
  const key = getKey();
  if (!key) return [];
  const url = `${BASE}/rest_cafes/info?serviceKey=${encodeURIComponent(key)}&pageNo=${page}&numOfRows=${perPage}&type=json`;
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return [];
    const j = await res.json();
    const items: GeneralRaw[] = j?.response?.body?.items?.item ?? [];
    const out: GeneralRestaurant[] = [];
    for (const it of items) {
      if (it.SALS_STTS_CD !== "01") continue;
      const addr = it.ROAD_NM_ADDR || it.LOTNO_ADDR || "";
      if (cityFilter && !addr.includes(cityFilter)) continue;
      const coord = toWGS84(Number(it.CRD_INFO_X), Number(it.CRD_INFO_Y));
      if (!coord) continue;
      out.push({
        name: it.BPLC_NM || "",
        bizType: it.BZSTAT_SE_NM || it.SNTTN_BZSTAT_NM || "",
        roadAddr: it.ROAD_NM_ADDR || "",
        lotAddr: it.LOTNO_ADDR || "",
        tel: it.TELNO || "",
        lat: coord.lat,
        lng: coord.lng,
        homepage: it.HPG || undefined
      });
    }
    return out;
  } catch {
    return [];
  }
}

export async function findRestCafes(
  city: CityCode,
  anchorLat: number,
  anchorLng: number,
  radiusKm: number,
  cuisine?: CuisinePref,
  limit = 5
): Promise<GeneralRestaurant[]> {
  if (!getKey()) return [];
  const cached = REST_CACHE.get(city);
  let all: GeneralRestaurant[];
  if (cached && Date.now() - cached.at < GENERAL_TTL_MS) {
    all = cached.data;
  } else {
    // 2페이지 x 200건 = 400건 (응답시간 최적화)
    const pages = await Promise.all(
      [1, 2].map((p) => fetchRestPage(p, 200, CITY_TO_KO[city]))
    );
    all = pages.flat();
    REST_CACHE.set(city, { at: Date.now(), data: all });
  }
  const matched: Array<{ r: GeneralRestaurant; d: number }> = [];
  for (const r of all) {
    const d = distKm(anchorLat, anchorLng, r.lat, r.lng);
    if (d > radiusKm) continue;
    // cuisine=cafe면 카페 업태만, 그 외 any/missing이면 전체 (휴게음식점 풀 자체가 식당 보조)
    if (cuisine === "cafe" && restBizTypeToCuisine(r.bizType) !== "cafe") continue;
    matched.push({ r, d });
  }
  matched.sort((a, b) => a.d - b.d);
  return matched.slice(0, limit).map((x) => x.r);
}

// ────────────────────────────────────────────────────────────────
// 관광식당 (tourist_restaurants) — 관광 신고된 식당. 좌표 + 이름 매칭으로 인증 배지 + 보충
// ────────────────────────────────────────────────────────────────

export interface TouristRestaurant {
  name: string;
  roadAddr: string;
  tel: string;
  lat: number;
  lng: number;
}

interface TouristRaw {
  BPLC_NM: string;
  ROAD_NM_ADDR: string;
  LOTNO_ADDR: string;
  TELNO: string;
  CRD_INFO_X: string | number;
  CRD_INFO_Y: string | number;
  SALS_STTS_CD: string;
  CULTR_SPTS_TPBIZ_NM: string;
}

let TOURIST_INDEX: { byKey: Map<string, TouristRestaurant>; list: TouristRestaurant[] } | null = null;
let TOURIST_INDEX_AT = 0;

async function fetchTouristPage(page: number, perPage = 1000): Promise<TouristRestaurant[]> {
  const key = getKey();
  if (!key) return [];
  const url = `${BASE}/tourist_restaurants/info?serviceKey=${encodeURIComponent(key)}&pageNo=${page}&numOfRows=${perPage}&type=json`;
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return [];
    const j = await res.json();
    const items: TouristRaw[] = j?.response?.body?.items?.item ?? [];
    const out: TouristRestaurant[] = [];
    for (const it of items) {
      if (it.SALS_STTS_CD !== "01") continue; // 영업 중만
      const coord = toWGS84(Number(it.CRD_INFO_X), Number(it.CRD_INFO_Y));
      if (!coord) continue;
      out.push({
        name: it.BPLC_NM || "",
        roadAddr: it.ROAD_NM_ADDR || it.LOTNO_ADDR || "",
        tel: it.TELNO || "",
        lat: coord.lat,
        lng: coord.lng
      });
    }
    return out;
  } catch {
    return [];
  }
}

async function ensureTouristIndex() {
  if (TOURIST_INDEX && Date.now() - TOURIST_INDEX_AT < GENERAL_TTL_MS) return TOURIST_INDEX;
  // 관광식당 전국 ~수천건. 2페이지 x 200건. 인증 매칭 누락은 false negative로 허용.
  const pages = await Promise.all([1, 2].map((p) => fetchTouristPage(p, 200)));
  const list = pages.flat();
  const byKey = new Map<string, TouristRestaurant>();
  list.forEach((r) => byKey.set(r.name.replace(/\s+/g, ""), r));
  TOURIST_INDEX = { byKey, list };
  TOURIST_INDEX_AT = Date.now();
  return TOURIST_INDEX;
}

// 코스 식당이 관광식당 인증 받았는지 (이름 매칭).
export async function isTouristRestaurant(spotName: string): Promise<TouristRestaurant | null> {
  if (!getKey()) return null;
  const idx = await ensureTouristIndex();
  return idx.byKey.get(spotName.replace(/\s+/g, "")) ?? null;
}

export function touristToTourSpot(r: TouristRestaurant, idx: number): TourSpot {
  return {
    contentId: `tour:${idx}:${r.name}`.replace(/\s+/g, "_"),
    contentTypeId: "39",
    title: r.name,
    addr1: r.roadAddr,
    mapX: r.lng,
    mapY: r.lat,
    cat1: "A05"
  };
}
