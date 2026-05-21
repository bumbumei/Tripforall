// 한국관광공사 관광지 집중률 방문자 추이 예측 정보 API.
// End Point: https://apis.data.go.kr/B551011/TatsCnctrRateService
// 응답: 향후 30일치 관광지별 집중률 (0~100%).
//
// 파라미터:
//   - areaCd: 행정안전부 법정동 광역코드 (서울 11, 부산 26, 제주 50)
//   - signguCd: 행안부 법정동 시·군·구 5자리 (서울 종로구 11110)
//
// 응답 필드:
//   - baseYmd: "20260520" 날짜
//   - tAtsNm: 관광지명 (우리 spot.title과 매칭)
//   - cnctrRate: 집중률 % (높을수록 혼잡)
//
// contentid가 없어 이름 매칭 필요 — 정확 일치 + 부분 일치 보조.

import type { CityCode } from "@/types";
import { CITY_LDONG, getSigungu } from "./sigungu";

const ENDPOINT = "https://apis.data.go.kr/B551011/TatsCnctrRateService/tatsCnctrRatedList";

interface CrowdRaw {
  baseYmd: string;
  areaCd: string;
  areaNm: string;
  signguCd: string;
  signguNm: string;
  tAtsNm: string;
  cnctrRate: string;
}

export type CrowdLevel = "low" | "medium" | "high";

export interface CrowdEntry {
  date: string; // YYYY-MM-DD
  spotName: string;
  ratePct: number; // 0~100
  level: CrowdLevel;
}

function classify(rate: number): CrowdLevel {
  if (rate < 40) return "low";
  if (rate < 70) return "medium";
  return "high";
}

function getKey(): string | null {
  return process.env.TOUR_API_KEY || null;
}

// 시·군·구별 캐시 — 응답이 향후 30일치라 6시간 TTL.
const CROWD_CACHE = new Map<string, { at: number; data: CrowdEntry[] }>();
const CROWD_TTL_MS = 6 * 60 * 60 * 1000;

async function fetchPage(
  areaCd: string,
  signguCd: string,
  pageNo: number,
  numOfRows = 1000
): Promise<CrowdRaw[]> {
  const key = getKey();
  if (!key) return [];
  const params = new URLSearchParams({
    serviceKey: key,
    MobileOS: "ETC",
    MobileApp: "TripForAll",
    _type: "json",
    numOfRows: String(numOfRows),
    pageNo: String(pageNo),
    areaCd,
    signguCd
  });
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
      next: { revalidate: 6 * 3600 },
      signal: controller.signal
    });
    if (!res.ok) return [];
    const text = await res.text();
    if (!text.trim().startsWith("{")) return [];
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

function ymdToISO(ymd: string): string {
  // "20260520" → "2026-05-20"
  if (ymd.length !== 8) return ymd;
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}

// 시·군·구 단위로 30일치 집중률 데이터를 캐시에 적재.
// 한 시·군·구당 ~3,000~4,000건(30일 × 관광지 수십~수백). 4페이지 병렬 호출.
async function ensureCrowdData(areaCd: string, signguCd: string): Promise<CrowdEntry[]> {
  const cacheKey = `${areaCd}/${signguCd}`;
  const cached = CROWD_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.at < CROWD_TTL_MS) return cached.data;

  const pages = await Promise.all([1, 2, 3, 4].map((p) => fetchPage(areaCd, signguCd, p, 1000)));
  const items = pages.flat();
  const data: CrowdEntry[] = items
    .map((it) => {
      const rate = Number(it.cnctrRate);
      if (!Number.isFinite(rate)) return null;
      return {
        date: ymdToISO(it.baseYmd),
        spotName: it.tAtsNm,
        ratePct: Math.round(rate * 10) / 10,
        level: classify(rate)
      } as CrowdEntry;
    })
    .filter((x): x is CrowdEntry => x !== null);
  CROWD_CACHE.set(cacheKey, { at: Date.now(), data });
  return data;
}

// 코스 스팟별 출발 날짜의 집중률 조회.
// spotName과 tAtsNm 정확 매칭 + 부분 매칭(spotName이 tAtsNm 포함 / 그 반대).
export async function getCrowdForCourse(
  city: CityCode,
  sigunguTourCode: string | undefined,
  date: string | undefined,
  spotNames: string[]
): Promise<Map<string, CrowdEntry>> {
  const result = new Map<string, CrowdEntry>();
  if (!getKey() || !date) return result;
  const areaCd = CITY_LDONG[city];
  if (!areaCd) return result;
  // 시·군·구 미지정 시엔 데이터 없음 (areaCd만으론 호출 안 됨).
  const sig = getSigungu(city, sigunguTourCode);
  if (!sig?.ldongCode) return result;

  const all = await ensureCrowdData(areaCd, sig.ldongCode);
  if (all.length === 0) return result;

  const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();
  for (const name of spotNames) {
    const target = norm(name);
    // 1차: 정확 일치 + 출발 날짜
    let entry = all.find((e) => norm(e.spotName) === target && e.date === date);
    // 2차: 부분 일치 (spot 이름이 API 이름에 포함 또는 그 반대) + 출발 날짜
    if (!entry) {
      entry = all.find(
        (e) =>
          e.date === date &&
          (norm(e.spotName).includes(target) || target.includes(norm(e.spotName)))
      );
    }
    if (entry) result.set(name, entry);
  }
  return result;
}
