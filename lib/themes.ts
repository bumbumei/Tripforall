import type { TourSpot, TravelTheme, WeatherInfo } from "@/types";

export interface ThemeMeta {
  id: TravelTheme;
  label: string;
  emoji: string;
  tagline: string;
  // narrative 톤 힌트 — LLM 프롬프트와 fallback에 모두 쓰임
  vibe: string;
}

export const THEME_META: Record<TravelTheme, ThemeMeta> = {
  history: {
    id: "history",
    label: "역사·궁궐",
    emoji: "🏯",
    tagline: "옛 시간의 결을 따라 천천히",
    vibe: "오래된 돌과 나무가 가진 결, 세대 사이에 흐르는 기억의 톤"
  },
  nature: {
    id: "nature",
    label: "자연·풍경",
    emoji: "🌿",
    tagline: "초록과 바람을 따라 걷는 동선",
    vibe: "햇살·바람·물소리를 느릿하게 마주하는 톤"
  },
  food: {
    id: "food",
    label: "맛·시장",
    emoji: "🍲",
    tagline: "한 끼가 여행의 중심이 되는 동선",
    vibe: "끓는 솥, 시장의 활기, 같은 식탁에 둘러앉은 따뜻함"
  },
  art: {
    id: "art",
    label: "미술·전시",
    emoji: "🖼",
    tagline: "조용한 공간에서 보는 즐거움",
    vibe: "차분한 조도, 발소리도 낮아지는 공간감"
  },
  family: {
    id: "family",
    label: "가족 체험",
    emoji: "👨‍👩‍👧",
    tagline: "아이와 어른이 함께 손을 잡는 동선",
    vibe: "세대가 같은 장면을 다른 시선으로 보는 즐거움"
  },
  festival: {
    id: "festival",
    label: "축제·행사",
    emoji: "🎉",
    tagline: "지금 열리고 있는 행사 중심으로",
    vibe: "북적임 속에서도 천천히, 사람들의 활기를 함께 누리는 톤"
  },
  local: {
    id: "local",
    label: "현지인처럼",
    emoji: "🥢",
    tagline: "관광지 대신 현지 골목·시장·작은 가게",
    vibe: "관광 명소가 아닌 일상의 결, 골목 카페와 동네 시장의 공기"
  },
  indoor: {
    id: "indoor",
    label: "실내 위주",
    emoji: "🏛",
    tagline: "비·더위·추위에도 무리 없는 실내 동선",
    vibe: "조명 아래 차분한 시간, 날씨에 영향받지 않는 동선"
  },
  wellness: {
    id: "wellness",
    label: "웰니스·치유",
    emoji: "🧘",
    tagline: "스파·온천·명상·치유의 자연 — 회복이 목적인 동선",
    vibe: "느린 호흡, 따뜻한 물, 푸른 숲의 정적 — 몸과 마음을 회복하는 톤"
  },
  pet: {
    id: "pet",
    label: "반려동물 동반",
    emoji: "🐾",
    tagline: "강아지·고양이와 함께 갈 수 있는 검증된 장소만",
    vibe: "보호자와 반려동물 모두 편한 동선, 잔디·테라스·반려동물 입장 가능"
  }
};

export const ALL_THEMES: ThemeMeta[] = Object.values(THEME_META);

// 0~5점. cat1/contentTypeId가 가장 신뢰도 높고, 제목 키워드가 보조.
// 점수가 0인 spot은 사실상 제외 (코스 풀에서 빠짐).
export function scoreSpotForTheme(spot: TourSpot, theme: TravelTheme): number {
  const cat1 = spot.cat1 ?? "";
  const ctype = spot.contentTypeId ?? "";
  const title = spot.title ?? "";
  const has = (kws: string[]) => kws.some((k) => title.includes(k));

  switch (theme) {
    case "history": {
      let s = 0;
      if (cat1 === "A02") s += 4;
      if (has(["궁", "한옥", "사찰", "유적", "사적", "박물관"])) s += 1;
      if (ctype === "39") s = Math.min(s, 1); // 식당은 base 1
      return s;
    }
    case "nature": {
      let s = 0;
      if (cat1 === "A01") s += 4;
      if (has(["공원", "해수욕장", "오름", "둘레길", "수목원", "정원", "산", "해변"])) s += 1;
      if (ctype === "39") s = Math.min(s, 1);
      return s;
    }
    case "food": {
      if (ctype === "39") return 5;
      if (has(["시장", "맛집", "먹거리"])) return 3;
      return 1;
    }
    case "art": {
      let s = 0;
      if (ctype === "14") s += 4;
      if (has(["미술관", "박물관", "갤러리", "전시"])) s += 1;
      return s;
    }
    case "family": {
      let s = 0;
      if (has(["문화마을", "체험", "어린이", "키즈"])) s += 3;
      if (has(["공원", "박물관", "거리"])) s += 1;
      if (ctype === "12") s += 1;
      if (ctype === "14") s += 1;
      return s;
    }
    case "festival": {
      // contentTypeId 15 = 축제·공연·행사 (TourAPI 표준)
      if (ctype === "15") return 5;
      if (has(["축제", "페스티벌", "행사", "마켓"])) return 4;
      if (has(["공연", "전시"])) return 2;
      return 0;
    }
    case "local": {
      // "현지인처럼" — 관광 명소가 아닌 골목/시장/작은 가게 위주
      let s = 0;
      if (has(["골목", "동네", "마을", "시장", "재래"])) s += 4;
      if (ctype === "39") s += 2; // 동네 식당/카페
      if (has(["카페", "거리", "맛집"])) s += 1;
      // 큰 관광지 키워드는 페널티 (조가비박물관 같은 대규모 시설 제외)
      if (has(["대공원", "테마파크", "랜드", "타워"])) s = Math.max(0, s - 3);
      return s;
    }
    case "indoor": {
      // 실내 위주 — 문화시설/식당/쇼핑 강하게 가중
      if (ctype === "14") return 5; // 문화시설(박물관·미술관 등)
      if (ctype === "39") return 4; // 식당
      if (ctype === "38") return 4; // 쇼핑
      // 야외 대표(자연 A01)은 0
      if (cat1 === "A01") return 0;
      // 기타 관광지(궁궐·시장 등)는 키워드로 실내 추정
      if (has(["박물관", "전시관", "미술관", "도서관", "갤러리", "센터", "쇼핑몰", "백화점"])) return 4;
      if (has(["궁", "한옥"])) return 2; // 일부 실내
      return 1;
    }
    case "wellness": {
      // 한국관광공사 웰니스관광정보 API 풀에서 받아오는 게 1차.
      // 일반 TourAPI 스팟 중에는 키워드 매칭으로 보조.
      let s = 0;
      if (has(["스파", "온천", "요가", "명상", "치유", "힐링", "수목원", "정원", "찜질"])) s += 4;
      if (has(["사찰", "템플스테이"])) s += 3;
      if (cat1 === "A01") s += 1; // 자연도 보조
      return s;
    }
    case "pet": {
      // 한국관광공사 반려동물 동반여행 API 풀에서 받아오는 게 1차 (KorPetTourService2).
      // 일반 풀 보조 점수는 약하게 — 키워드 매칭으로 야외 위주 추정.
      let s = 0;
      if (has(["공원", "수목원", "정원", "해수욕장", "둘레길", "카페", "펜션"])) s += 3;
      if (cat1 === "A01") s += 1;
      return s;
    }
  }
}

// 날씨에 따른 스팟 점수 보정.
// 비/눈/더위/추위 → 실내(문화시설·식당·쇼핑) +2, 야외 자연(A01) -1
// 맑고 적정온도 → 야외 자연 +1
export function weatherModifier(spot: TourSpot, weather: WeatherInfo): number {
  const ctype = spot.contentTypeId ?? "";
  const cat1 = spot.cat1 ?? "";
  if (weather.preferIndoor) {
    if (ctype === "14" || ctype === "39" || ctype === "38") return 2;
    if (cat1 === "A01") return -1;
    return 0;
  }
  // 야외 좋은 날
  if (cat1 === "A01") return 1;
  return 0;
}

// 테마 + 날씨 종합 점수.
function combinedScore(
  spot: TourSpot,
  theme: TravelTheme | undefined,
  weather: WeatherInfo | undefined
): number {
  const base = theme ? scoreSpotForTheme(spot, theme) : 1;
  if (!weather) return base;
  return Math.max(0, base + weatherModifier(spot, weather));
}

// 테마 점수로 정렬. 동점이면 입력 순서 유지(안정 정렬).
// 점수 0인 spot은 풀에서 제외. limit만큼 잘라 반환.
export function recommendForTheme(
  spots: TourSpot[],
  theme: TravelTheme | undefined,
  limit: number,
  weather?: WeatherInfo
): { recommended: TourSpot[]; scores: Map<string, number> } {
  const scores = new Map<string, number>();

  if (!theme && !weather) {
    spots.forEach((s) => scores.set(s.contentId, 0));
    return { recommended: spots.slice(0, limit), scores };
  }

  const indexed = spots.map((s, idx) => ({
    s,
    score: combinedScore(s, theme, weather),
    idx
  }));
  indexed.forEach(({ s, score }) => scores.set(s.contentId, score));

  const filtered = indexed.filter((x) => x.score > 0);
  filtered.sort((a, b) => b.score - a.score || a.idx - b.idx);

  // 풀이 너무 작으면(예: 점수 0짜리 많을 때) 점수 0짜리도 일부 섞어서 코스 완성 가능하게.
  const recommended = filtered.map((x) => x.s);
  if (recommended.length < Math.min(limit, 5)) {
    const fillers = indexed
      .filter((x) => x.score === 0)
      .map((x) => x.s)
      .slice(0, limit - recommended.length);
    recommended.push(...fillers);
  }

  return { recommended: recommended.slice(0, limit), scores };
}
