import type { TripRequest, TourSpot, BarrierFreeInfo, CuisinePref } from "@/types";
import {
  listBarrierFreeSpots,
  getBarrierFreeDetail,
  getSpotIntro,
  getSpotCommon,
  getSpotImages,
  getSpotDetailInfo,
  distanceKm,
  type SpotCommon,
  type SpotDetailInfo
} from "./tour-api";
import { findCityTourRestaurants, toTourSpot, hasKcisaKey } from "./city-tour-restaurants";
import { findWellnessSpots, wellnessToTourSpot } from "./wellness-tourism";
import { findPetTourSpots, isPetFriendly } from "./pet-tourism";
import { getCrowdForCourse, type CrowdEntry } from "./crowd-forecast";
import {
  findGeneralRestaurants,
  generalToTourSpot,
  findRestCafes,
  isExcellentRestaurant,
  isTouristRestaurant,
  hasFoodserviceKey
} from "./foodservice";
import { checkOpen } from "./openhours";
import { recommendForTheme, scoreSpotForTheme } from "./themes";
import { findNearestSeoulElevator } from "./subway-elevators";
import { findNearbyAccessibleToilets } from "./toilets";
import { getWeather } from "./weather";
import { CITY_CONFIG } from "./cities";
import type { WeatherInfo } from "@/types";

export interface CourseStop {
  spot: TourSpot;
  barrierFree: BarrierFreeInfo;
  distFromPrevKm: number;
}

export interface SkippedSpot {
  title: string;
  reason: string; // "매주 화요일 정기 휴무" 등
  suggestion: string; // "다른 요일로 변경하면 방문 가능합니다"
}

export interface CourseResult {
  stops: CourseStop[];
  recommended: TourSpot[]; // 테마 점수 상위 풀 — stops는 이 안에서 선정 (테마 없으면 빈 풀과 동일)
  expandedToCity?: boolean; // 시·군·구 풀이 너무 작아서 시·도 전체로 자동 확장됐는지
  expandedReason?: string; // 사용자에게 보여줄 안내
  weather?: WeatherInfo; // 출발 날짜·시각 + 도시 중심 좌표 날씨
  skippedSpots?: SkippedSpot[]; // 휴무/시간 외라 코스에서 빠진 스팟
  spotInfoByContent?: Record<string, SpotCommon>; // 코스 스팟별 홈페이지·소개
  imagesByContent?: Record<string, string[]>; // 코스 스팟별 추가 이미지
  detailInfoByContent?: Record<string, SpotDetailInfo[]>; // 코스 스팟별 반복정보
  crowdByContent?: Record<string, { ratePct: number; level: CrowdEntry["level"]; date: string }>;
  certificationsByContent?: Record<
    string,
    { excellent?: { designatedYmd: string; foodKind: string } }
  >;
}

// 거리 클러스터링 반경 (km). 시·군·구는 TourAPI가 이미 필터해주므로
// 별도의 더 좁은 반경을 적용하지 않는다 (서귀포처럼 면적 큰 시·군·구에선 역효과).
const CITY_RADIUS_KM: Record<TripRequest["city"], number> = {
  seoul: 5,
  busan: 7,
  jeju: 18,
  gyeonggi: 15 // 경기도는 면적이 매우 넓어 시·군·구 단위 선택이 사실상 필수
};

// 시·군·구 풀이 이 개수 미만이면 의미 있는 코스를 만들 수 없으므로 시·도 전체로 폴백.
const MIN_VIABLE_POOL = 3;

export async function buildCourse(req: TripRequest): Promise<CourseResult> {
  // 날씨 + TourAPI 병렬 호출 (날씨는 도시 중심 좌표 + 출발 일시)
  const cityCfg = CITY_CONFIG[req.city];
  // 테마별 전용 풀: wellness, pet은 각각 전용 API에서 풀을 받음.
  const [allInit, weather, wellnessSpots, petSpots] = await Promise.all([
    listBarrierFreeSpots(req.city, 24, req.sigungu),
    getWeather(cityCfg.lat, cityCfg.lng, req.date, req.startTime).then(
      (w) => w ?? undefined
    ),
    req.theme === "wellness"
      ? findWellnessSpots(req.city).then((spots) => spots.map(wellnessToTourSpot))
      : Promise.resolve([] as TourSpot[]),
    req.theme === "pet"
      ? findPetTourSpots(req.city, req.sigungu)
      : Promise.resolve([] as TourSpot[])
  ]);
  // 전용 풀을 일반 풀 앞에 prepend → 우선 채택.
  let all =
    wellnessSpots.length > 0
      ? [...wellnessSpots, ...allInit]
      : petSpots.length > 0
        ? [...petSpots, ...allInit]
        : allInit;

  // 자동 확장: 시·군·구 풀이 너무 작으면 시·도 전체로 다시 조회.
  let expandedToCity = false;
  let expandedReason: string | undefined;
  if (req.sigungu) {
    // 테마 점수 > 0인 스팟만 "유효 후보"로 카운트.
    const viableCount = req.theme
      ? all.filter((s) => scoreSpotForTheme(s, req.theme!) > 0).length
      : all.length;
    if (viableCount < MIN_VIABLE_POOL) {
      const cityWide = await listBarrierFreeSpots(req.city, 24);
      const cityViable = req.theme
        ? cityWide.filter((s) => scoreSpotForTheme(s, req.theme!) > 0).length
        : cityWide.length;
      // 시·도 전체에 더 많은 유효 후보가 있을 때만 확장 (없으면 그대로 두기)
      if (cityViable > viableCount) {
        all = cityWide;
        expandedToCity = true;
        expandedReason = `선택한 시·군·구에 추천 가능한 후보가 ${viableCount}곳뿐이라, 시·도 전체로 확장해 검색했습니다.`;
      }
    }
  }

  if (all.length === 0) return { stops: [], recommended: [] };

  // 1) 테마 + 날씨 기반 추천 풀 구성. 비/눈/더위/추위 시 실내 위주로 자동 보정.
  const { recommended } = recommendForTheme(all, req.theme, 12, weather);
  const themePool = recommended.length > 0 ? recommended : all;

  // 2) 희망 코스 길이 — 시간/체력에 따라 3~5개. 반경 안 후보가 부족하면 자동 축소.
  const desiredStops = Math.min(5, Math.max(3, Math.floor(req.durationHours * 1.2)));

  // 3) 시작점 + 강제 선택 처리.
  //    forceSpotIds가 있으면 그 ID들을 우선 코스에 넣음 (첫 ID가 anchor).
  //    아니면 shuffleSeed로 풀 상위 N개 중 다른 anchor 선택 ("다른 조합" 기능).
  let forcedSpots: TourSpot[] = [];
  if (req.forceSpotIds && req.forceSpotIds.length > 0) {
    const byId = new Map(all.map((s) => [s.contentId, s]));
    forcedSpots = req.forceSpotIds
      .map((id) => byId.get(id))
      .filter((s): s is TourSpot => !!s);
  }
  // 강제 선택이 없을 때만 shuffle 적용.
  // 풀 상위 N개(점수 비슷한 후보들) 중 seed로 다른 anchor 선택.
  const ANCHOR_CANDIDATES = Math.min(themePool.length, 5);
  let anchor: TourSpot;
  if (forcedSpots[0]) {
    anchor = forcedSpots[0];
  } else if (req.shuffleSeed !== undefined && ANCHOR_CANDIDATES > 1) {
    const idx = Math.abs(req.shuffleSeed) % ANCHOR_CANDIDATES;
    anchor = themePool[idx];
  } else {
    anchor = themePool[0];
  }
  const radiusKm = CITY_RADIUS_KM[req.city] ?? 5;
  const softLimitKm = radiusKm * 1.5; // 보충 시에도 이 거리는 넘지 않음

  // 4) 시작점 반경 안의 후보만 남김 — 흩어진 풀에서 멀리 점프하는 걸 방지.
  const inRadius = themePool.filter(
    (s) => s.contentId === anchor.contentId || distanceKm(anchor, s) <= radiusKm
  );
  // 반경 안이 부족하면 soft-limit까지만 보충 (절대 그 이상은 안 끼움)
  const outOfRadiusButClose = themePool
    .filter((s) => !inRadius.find((x) => x.contentId === s.contentId))
    .map((s) => ({ s, d: distanceKm(anchor, s) }))
    .filter((x) => x.d <= softLimitKm)
    .sort((a, b) => a.d - b.d)
    .map((x) => x.s);
  const pool =
    inRadius.length >= desiredStops
      ? inRadius
      : [...inRadius, ...outOfRadiusButClose.slice(0, desiredStops - inRadius.length)];

  // 풀이 그래도 부족하면 stops 수를 풀에 맞춰 자동 축소 (3개 미만이면 어쩔 수 없음)
  const stops = Math.min(desiredStops, Math.max(3, pool.length));

  // 5) 강제 스팟들을 anchor부터 거리순으로 추가, 부족하면 nearest-neighbor로 채움.
  const picked: TourSpot[] = [anchor];
  const pickedIds = new Set([anchor.contentId]);
  if (forcedSpots.length > 1) {
    // 강제 스팟 나머지: anchor 기준 가까운 순으로 정렬해 차례로 끼움.
    const rest = forcedSpots
      .slice(1)
      .filter((s) => !pickedIds.has(s.contentId))
      .map((s) => ({ s, d: distanceKm(anchor, s) }))
      .sort((a, b) => a.d - b.d)
      .map((x) => x.s);
    for (const s of rest) {
      if (picked.length >= stops) break;
      picked.push(s);
      pickedIds.add(s.contentId);
    }
  }
  const remaining = pool.filter((s) => !pickedIds.has(s.contentId));

  while (picked.length < stops && remaining.length > 0) {
    const last = picked[picked.length - 1];
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = distanceKm(last, remaining[i]);
      if (d < bestDist && d > 0) {
        bestDist = d;
        bestIdx = i;
      }
    }
    picked.push(remaining.splice(bestIdx, 1)[0]);
    pickedIds.add(picked[picked.length - 1].contentId);
  }

  // 6) 식당 1곳 보장 — 선호 음식(cuisine) 매칭 우선.
  //    TourAPI 식당 풀에서 먼저 찾고, 부족하면 행안부 → KCISA 순으로 폴백.
  const hasRestaurant = picked.some((s) => s.contentTypeId === "39");
  if (!hasRestaurant) {
    let r: TourSpot | undefined;
    const tourCandidates = all.filter(
      (s) =>
        s.contentTypeId === "39" &&
        distanceKm(anchor, s) <= radiusKm &&
        !picked.find((p) => p.contentId === s.contentId)
    );
    r = pickRestaurantByCuisine(tourCandidates, req.cuisine);
    // 폴백 순서 (응답 빠른 순):
    // 1) 행안부 휴게음식점 (cafe인 경우)
    // 2) 행안부 일반음식점 (좌표 직접 매칭, 50만건+)
    // 3) KCISA 시티투어 맛집 (마지막 — 가끔 응답 60초+로 느림)
    if (!r && hasFoodserviceKey() && req.cuisine === "cafe") {
      const cafes = await findRestCafes(req.city, anchor.mapY, anchor.mapX, radiusKm, "cafe", 5);
      if (cafes[0]) r = generalToTourSpot(cafes[0], 0);
    }
    if (!r && hasFoodserviceKey()) {
      const generals = await findGeneralRestaurants(
        req.city, anchor.mapY, anchor.mapX, radiusKm, req.cuisine, 5
      );
      if (generals[0]) r = generalToTourSpot(generals[0], 0);
    }
    if (!r && hasKcisaKey()) {
      const kcisaList = await findCityTourRestaurants(req.city, req.cuisine, 50);
      const kcisaInRadius = kcisaList
        .map((k, i) => ({ k, idx: i, d: distanceKm(anchor, { mapX: k.lng, mapY: k.lat } as any) }))
        .filter((x) => x.d <= radiusKm)
        .sort((a, b) => a.d - b.d);
      if (kcisaInRadius[0]) {
        r = toTourSpot(kcisaInRadius[0].k, kcisaInRadius[0].idx);
      }
    }
    // 그래도 없으면 cuisine 무시하고 TourAPI에서 가장 가까운 식당.
    if (!r) r = tourCandidates[0];

    if (r) {
      picked.splice(Math.floor(picked.length / 2), 0, r);
    }
  }

  // 5) barrierFree detail + 운영시간 detailIntro 병렬 조회.
  const [details, intros] = await Promise.all([
    Promise.all(picked.map((s) => getBarrierFreeDetail(s.contentId))),
    Promise.all(picked.map((s) => getSpotIntro(s.contentId, s.contentTypeId)))
  ]);

  const skippedSpots: SkippedSpot[] = [];
  const openIndices: number[] = [];
  picked.forEach((spot, i) => {
    const status = checkOpen(intros[i].restdate, intros[i].usetime, req.date, req.startTime);
    if (status.open) {
      openIndices.push(i);
    } else if (status.reason && status.suggestion) {
      skippedSpots.push({
        title: spot.title,
        reason: status.reason.raw || formatReason(status.reason),
        suggestion: status.suggestion
      });
    }
  });

  let openPicked = openIndices.map((i) => picked[i]);
  let openDetails = openIndices.map((i) => details[i]);
  // 모든 스팟이 운영시간 외라면 (예: 강남 indoor 시설 11시 개장 + 출발 10시)
  // 코스를 비우지 않고 picked 그대로 사용. skippedSpots에 빠진 스팟들 그대로 노출되어
  // 사용자가 시간 조정 안내를 보고 결정할 수 있게 한다.
  if (openPicked.length === 0 && picked.length > 0) {
    openPicked = picked;
    openDetails = details;
    // skippedSpots는 비우지 않음 — 안내 메시지로 그대로 표시
  }

  const courseStops: CourseStop[] = openPicked.map((spot, i) => ({
    spot,
    barrierFree: enrichBarrierFree(spot, openDetails[i], req.city),
    distFromPrevKm: i === 0 ? 0 : distanceKm(openPicked[i - 1], spot)
  }));

  // 홈페이지·소개글 + 추가 이미지 + 반복정보 + 집중률 (열린 스팟만, 병렬 호출)
  const [commons, imageLists, detailInfoLists, crowdMap] = await Promise.all([
    Promise.all(openPicked.map((s) => getSpotCommon(s.contentId))),
    Promise.all(openPicked.map((s) => getSpotImages(s.contentId))),
    Promise.all(openPicked.map((s) => getSpotDetailInfo(s.contentId, s.contentTypeId))),
    getCrowdForCourse(
      req.city,
      req.sigungu,
      req.date,
      openPicked.map((s) => s.title)
    )
  ]);
  const spotInfoByContent: Record<string, SpotCommon> = {};
  commons.forEach((c) => {
    if (c.homepage || c.overview || c.tel) spotInfoByContent[c.contentId] = c;
  });
  const imagesByContent: Record<string, string[]> = {};
  openPicked.forEach((s, i) => {
    const imgs = imageLists[i];
    if (imgs.length > 0) imagesByContent[s.contentId] = imgs;
  });
  const detailInfoByContent: Record<string, SpotDetailInfo[]> = {};
  openPicked.forEach((s, i) => {
    const info = detailInfoLists[i];
    if (info.length > 0) detailInfoByContent[s.contentId] = info;
  });
  const crowdByContent: Record<string, { ratePct: number; level: CrowdEntry["level"]; date: string }> = {};
  openPicked.forEach((s) => {
    const c = crowdMap.get(s.title);
    if (c) crowdByContent[s.contentId] = { ratePct: c.ratePct, level: c.level, date: c.date };
  });

  // 인증 매칭: 식당(모범/관광) + 반려동물 동반(전 스팟).
  const certificationsByContent: Record<
    string,
    {
      excellent?: { designatedYmd: string; foodKind: string };
      tourist?: { addr: string };
      petFriendly?: boolean;
    }
  > = {};
  const restaurants = openPicked.filter((s) => s.contentTypeId === "39");
  const [excellents, tourists, petFlags] = await Promise.all([
    hasFoodserviceKey()
      ? Promise.all(restaurants.map((s) => isExcellentRestaurant(s.title, s.addr1)))
      : Promise.resolve([] as Awaited<ReturnType<typeof isExcellentRestaurant>>[]),
    hasFoodserviceKey()
      ? Promise.all(restaurants.map((s) => isTouristRestaurant(s.title)))
      : Promise.resolve([] as Awaited<ReturnType<typeof isTouristRestaurant>>[]),
    // 반려동물 동반 가능 매칭은 전 스팟 (cached 1회만 호출)
    Promise.all(openPicked.map((s) => isPetFriendly(req.city, s.contentId)))
  ]);
  restaurants.forEach((s, i) => {
    const ex = excellents[i];
    const tr = tourists[i];
    if (ex || tr) {
      certificationsByContent[s.contentId] = {
        ...(certificationsByContent[s.contentId] ?? {}),
        excellent: ex ? { designatedYmd: ex.designatedYmd, foodKind: ex.principalFoodKind } : undefined,
        tourist: tr ? { addr: tr.roadAddr } : undefined
      };
    }
  });
  openPicked.forEach((s, i) => {
    if (petFlags[i]) {
      certificationsByContent[s.contentId] = {
        ...(certificationsByContent[s.contentId] ?? {}),
        petFriendly: true
      };
    }
  });

  // 추천 풀 — anchor 기준 반경 안의 후보만, 거리 가까운 순.
  // (코스로 뽑히지 않은 후보도 사용자가 한눈에 비교 가능)
  const visibleRecommended: TourSpot[] = inRadius
    .map((s: TourSpot) => ({ s, d: distanceKm(anchor, s) }))
    .sort((a: { d: number }, b: { d: number }) => a.d - b.d)
    .map((x: { s: TourSpot }) => x.s);

  return {
    stops: courseStops,
    recommended: visibleRecommended,
    expandedToCity: expandedToCity || undefined,
    expandedReason,
    weather,
    skippedSpots: skippedSpots.length > 0 ? skippedSpots : undefined,
    spotInfoByContent: Object.keys(spotInfoByContent).length > 0 ? spotInfoByContent : undefined,
    imagesByContent: Object.keys(imagesByContent).length > 0 ? imagesByContent : undefined,
    detailInfoByContent:
      Object.keys(detailInfoByContent).length > 0 ? detailInfoByContent : undefined,
    crowdByContent: Object.keys(crowdByContent).length > 0 ? crowdByContent : undefined,
    certificationsByContent:
      Object.keys(certificationsByContent).length > 0 ? certificationsByContent : undefined
  };
}

function formatReason(reason: NonNullable<ReturnType<typeof checkOpen>["reason"]>): string {
  switch (reason.type) {
    case "weekly_holiday":
      return `${reason.weekday} 정기 휴무`;
    case "before_open":
      return `운영 시작 전 (${reason.openAt} 개장)`;
    case "after_close":
      return `운영 종료 (${reason.closeAt} 마감)`;
  }
}

// 선호 음식에 따른 식당 키워드 매칭. 매치 없으면 undefined 반환.
const CUISINE_KEYWORDS: Record<CuisinePref, string[]> = {
  korean: ["한식", "삼계탕", "갈비", "찌개", "비빔밥", "국수", "국밥", "분식", "냉면", "한정식", "백반"],
  chinese: ["중식", "중화", "짜장", "짬뽕", "딤섬", "만두", "마라"],
  japanese: ["일식", "초밥", "스시", "라멘", "우동", "돈까스", "이자카야", "사시미"],
  western: ["양식", "파스타", "스테이크", "피자", "버거", "그릴", "비스트로"],
  cafe: ["카페", "베이커리", "디저트", "브런치", "커피", "CAFE", "Cafe"],
  any: []
};
function pickRestaurantByCuisine(
  candidates: TourSpot[],
  cuisine: CuisinePref | undefined
): TourSpot | undefined {
  if (!cuisine || cuisine === "any") return undefined;
  const kws = CUISINE_KEYWORDS[cuisine] ?? [];
  return candidates.find((s) => kws.some((k) => s.title.includes(k)));
}

// 보조 데이터로 BarrierFreeInfo 보강.
//  - 서울 한정: 지하철 엘리베이터(서울 열린데이터광장) → publicTransport
//  - 전국: 행정안전부 공중화장실 표준데이터셋 중 장애인용 변기 있는 곳 → restroom 보조 정보
function enrichBarrierFree(
  spot: TourSpot,
  bf: BarrierFreeInfo,
  city: TripRequest["city"]
): BarrierFreeInfo {
  let result = bf;

  if (city === "seoul") {
    const elev = findNearestSeoulElevator(spot.mapY, spot.mapX);
    if (elev) {
      const note = `${elev.name}역 엘리베이터 (도보 ${elev.walkMin}분, ${elev.distanceM}m)`;
      result = {
        ...result,
        publicTransport: result.publicTransport ? `${result.publicTransport} · ${note}` : note
      };
    }
  }

  const nearestToilet = findNearbyAccessibleToilets(spot.mapY, spot.mapX, 500, 1)[0];
  if (nearestToilet) {
    const note = `가까운 장애인 화장실: ${nearestToilet.name} (도보 ${nearestToilet.walkMin}분, 변기 ${nearestToilet.accessibleCount}개)`;
    result = {
      ...result,
      restroom: result.restroom ? `${result.restroom} · ${note}` : note
    };
  }

  return result;
}
