// KCISA(한국문화정보원) 전국 시티투어 코스 맛집 정보 API.
// Endpoint: https://api.kcisa.kr/openapi/API_CNV_063/request
//
// 응답이 XML이라 단순 정규식으로 <item> 단위 파싱.
// data.go.kr이 아닌 KCISA 자체 키 (UUID) — EMERGENCY/TOUR 키와 분리된 KCISA_API_KEY 사용.

import type { CityCode, CuisinePref, TourSpot } from "@/types";
import { CITY_CONFIG } from "./cities";

const ENDPOINT = "https://api.kcisa.kr/openapi/API_CNV_063/request";

// KCISA 시티투어 맛집 데이터는 한식 위주 (한식/서양식/분식/치킨/패스트푸드/퓨전 6종).
// 일식·중식·카페는 KCISA에 거의 없어 매핑하지 않고 clNm 없이 전체를 받아 클라이언트에서 처리.
const CUISINE_TO_CL: Partial<Record<CuisinePref, string>> = {
  korean: "한식",
  western: "서양식"
};

export interface CityTourRestaurant {
  name: string; // rstrNm + 지점명
  category: string; // rstrClNm (한식/일식 등)
  roadAddr: string; // rstrRoadAddr
  lat: number; // rstrLatPos
  lng: number; // rstrLotPos
  tourCourseTitle?: string; // 어느 시티투어 코스에 포함된 식당인지
  rights?: string; // 운영 기관
  homepage?: string; // 시티투어 홈페이지 (source)
}

function getKey(): string | null {
  return process.env.KCISA_API_KEY || null;
}

export function hasKcisaKey(): boolean {
  return getKey() !== null;
}

// 단순 XML 파싱 — <item>…<tag>value</tag>…</item> 구조 가정.
function parseItems(xml: string): Array<Record<string, string>> {
  const items: Array<Record<string, string>> = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) {
    const body = m[1];
    const tagRe = /<([a-zA-Z0-9_]+)>([\s\S]*?)<\/\1>/g;
    const obj: Record<string, string> = {};
    let t: RegExpExecArray | null;
    while ((t = tagRe.exec(body)) !== null) {
      obj[t[1]] = t[2].trim();
    }
    items.push(obj);
  }
  return items;
}

async function fetchKcisaPage(
  key: string,
  cityKo: string,
  pageNo: number,
  numOfRows: number,
  clNm?: string
): Promise<Array<Record<string, string>>> {
  const params = new URLSearchParams({
    serviceKey: key,
    numOfRows: String(numOfRows),
    pageNo: String(pageNo),
    areaNm: cityKo
  });
  if (clNm) params.set("clNm", clNm);
  // KCISA 서버가 가끔 매우 느림(60초+) → 5초 timeout으로 차단.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
      next: { revalidate: 3600 },
      signal: controller.signal
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseItems(xml);
  } catch {
    return []; // timeout 또는 네트워크 오류 모두 빈 결과로 fall through
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function findCityTourRestaurants(
  city: CityCode,
  // sigunguName은 사용하지 않음 — KCISA는 areaNm에 복합 검색("서울 종로구")을 지원하지 않아
  // 시·도명만 보내고 시·군·구 좁히기는 호출 측에서 좌표 기반으로 처리한다.
  cuisine?: CuisinePref,
  // 페이지 1~maxPages 병렬. 응답시간 최적화로 기본 2페이지 (200건).
  maxPages = 2
): Promise<CityTourRestaurant[]> {
  const key = getKey();
  if (!key) return [];

  const cityKo = CITY_CONFIG[city].nameKo;
  const clNm = cuisine && cuisine !== "any" ? CUISINE_TO_CL[cuisine] : undefined;
  const pageNos = Array.from({ length: maxPages }, (_, i) => i + 1);
  const pages = await Promise.all(pageNos.map((p) => fetchKcisaPage(key, cityKo, p, 100, clNm)));
  const items = pages.flat();

  const restaurants: CityTourRestaurant[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    const lat = Number(it.rstrLatPos);
    const lng = Number(it.rstrLotPos);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) continue;
    const name = [it.rstrNm, it.rstrBhfNm].filter(Boolean).join(" ");
    if (!name) continue;
    const dedupKey = `${name}|${it.rstrRoadAddr ?? ""}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);
    restaurants.push({
      name,
      category: it.rstrClNm || "",
      roadAddr: it.rstrRoadAddr || it.rstrLnbrAddr || "",
      lat,
      lng,
      tourCourseTitle: it.title || undefined,
      rights: it.rights || undefined,
      homepage: it.source || undefined
    });
  }
  return restaurants;
}

// KCISA 식당을 TourSpot 형태로 변환 (course-builder가 동일하게 다루도록).
// contentId는 충돌 회피 위해 "kcisa:" 프리픽스. contentTypeId=39 (식당).
export function toTourSpot(r: CityTourRestaurant, idx: number): TourSpot {
  return {
    contentId: `kcisa:${idx}:${r.name}`.replace(/\s+/g, "_"),
    contentTypeId: "39",
    title: r.name,
    addr1: r.roadAddr,
    mapX: r.lng,
    mapY: r.lat,
    cat1: "A05" // 음식
  };
}
