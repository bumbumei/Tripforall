// 사용자/동행자 프로파일
export type MobilityType =
  | "wheelchair_manual"
  | "wheelchair_powered"
  | "stroller"
  | "walking_aid"
  | "low_stamina"
  | "pregnant"
  | "child"
  | "general";

export type SensoryNeed =
  | "visual_impaired"
  | "hearing_impaired"
  | "sensory_sensitive";

export interface CompanionProfile {
  id: string;
  nickname: string; // "어머니", "손주" 등
  age: number;
  mobility: MobilityType;
  sensoryNeeds: SensoryNeed[];
  notes?: string; // "고관절 수술 후 회복 중"
  staminaPercent: number; // 시작 체력 (0-100)
}

export type CityCode = "seoul" | "jeju" | "busan" | "gyeonggi";

export type TravelTheme = "history" | "nature" | "food" | "art" | "family" | "festival" | "local" | "indoor" | "wellness" | "pet";

export type CuisinePref = "korean" | "chinese" | "japanese" | "western" | "cafe" | "any";

export interface TripRequest {
  city: CityCode;
  sigungu?: string; // TourAPI sigunguCode (선택 — 없으면 도시 전체)
  durationHours: number;
  companions: CompanionProfile[];
  theme?: TravelTheme;
  cuisine?: CuisinePref; // 선호 음식
  date?: string; // YYYY-MM-DD
  startTime?: string; // HH:MM (24시간)
  // 사용자가 추천 풀에서 선택한 contentId 목록. 있으면 nearest-neighbor 대신
  // 이 ID들로 코스를 구성 (순서는 첫 ID가 anchor, 나머지는 거리 기반 재정렬).
  forceSpotIds?: string[];
  // "다른 조합 보기" — 같은 조건에서 anchor를 풀 상위 N개 중 다른 것으로 선택.
  // 없으면 항상 풀 1순위 (deterministic).
  shuffleSeed?: number;
}

// TourAPI 응답
export interface TourSpot {
  contentId: string;
  contentTypeId: string;
  title: string;
  addr1: string;
  mapX: number;
  mapY: number;
  firstImage?: string;
  cat1?: string;
  cat2?: string;
  cat3?: string;
  areaCode?: string;
  sigunguCode?: string;
  tel?: string;
}

// 무장애 25항목 (TourAPI detailInfo 응답 매핑)
export interface BarrierFreeInfo {
  contentId: string;
  // 지체장애
  wheelchair?: string; // 휠체어 대여
  parking?: string; // 장애인 주차
  elevator?: string; // 엘리베이터
  restroom?: string; // 장애인 화장실
  ramp?: string; // 경사로
  // 시각장애
  braileBlock?: string; // 점자 블록
  braileGuide?: string; // 점자 안내
  audioGuide?: string; // 음성 안내
  guideDog?: string;
  // 청각장애
  signLanguage?: string;
  videoGuide?: string;
  hearingHandicapEtc?: string;
  // 영유아
  babyStroller?: string; // 유아차 대여
  lactationRoom?: string; // 수유실
  // 고령자
  exit?: string; // 출입통로
  helpDog?: string;
  // 기타
  ticketOffice?: string;
  publicTransport?: string;
  promotion?: string;
  bigPrint?: string;
  brailleSign?: string;
  guideHuman?: string;
  guideSystem?: string;
  trail?: string;
  raw?: Record<string, unknown>;
}

// 3대 핵심 기능 출력 타입
export interface PaceSegment {
  time: string; // "10:00"
  place: string;
  action: string; // "이동", "관람", "휴식", "식사"
  durationMin: number;
  staminaCost: number; // - 소비, + 회복
  staminaAfter: Record<string, number>; // 동행자별 잔여 체력
  warnings?: string[];
}

export interface PaceResult {
  segments: PaceSegment[];
  summary: {
    totalDurationMin: number;
    lowestStamina: Record<string, number>;
    safe: boolean;
  };
}

export interface WellnessScore {
  overall: number; // 0-100
  axes: {
    safety: number;
    rest: number;
    nature: number;
    crowd: number;
    weather: number;
  };
  reasons: string[];
}

export interface MultiGenSegment {
  time: string;
  type: "common" | "split" | "rejoin" | "meal";
  title: string;
  branches?: Array<{
    members: string[]; // companion nicknames
    activity: string;
    location?: string;
  }>;
  bonding?: string; // 세대 연결 미션
  durationMin: number;
}

export interface MultiGenResult {
  segments: MultiGenSegment[];
  narrative: string; // 리허설 텍스트
}

// 외부 데이터로 보강된 코스 정보 (TourAPI 외 보조 데이터셋)
export interface NearbyToiletInfo {
  name: string;
  address: string;
  distanceM: number;
  walkMin: number;
  accessibleCount: number; // 장애인용 변기 총 개수
  openHours: string;
  hasEmergencyBell: boolean;
}

export interface WeatherInfo {
  condition: "clear" | "cloudy" | "rain" | "snow" | "hot" | "cold";
  tempC: number;
  feelsLikeC?: number;
  precipProbPct: number;
  windKph?: number;
  summary: string;
  preferIndoor: boolean;
}

export interface NearbyEmergencyRoom {
  name: string;
  addr: string;
  tel?: string;
  distanceKm: number;
  divName?: string; // 종합병원/병원 등
  hours?: string; // "08:30-17:00"
}

export interface TripPlanResponse {
  request: TripRequest;
  spots: TourSpot[]; // 최종 동선 (코스)
  recommendedSpots?: TourSpot[]; // 테마 점수 상위 풀 (spots는 이 안에서 nearest-neighbor로 선정)
  theme?: TravelTheme;
  themeLabel?: string;
  sigunguLabel?: string; // "종로구" 등 (시·군·구 선택 시)
  // 시·군·구 풀이 너무 작아 시·도 전체로 자동 확장됐을 때
  expansion?: { expandedToCity: boolean; reason: string };
  // contentId → 그 스팟 반경 500m 내 장애인 화장실 (행정안전부 공중화장실 표준데이터셋)
  nearbyToiletsByContent?: Record<string, NearbyToiletInfo[]>;
  // 코스 중심 좌표 기준 가까운 응급의료기관 (국립중앙의료원 전국 응급의료기관 정보 API)
  emergencyRooms?: NearbyEmergencyRoom[];
  // 휴무/운영시간 외라 코스에서 제외된 스팟 + 변경 안내
  skippedSpots?: Array<{ title: string; reason: string; suggestion: string }>;
  // contentId → 홈페이지·소개글·전화 (TourAPI detailCommon2)
  spotInfoByContent?: Record<
    string,
    { homepage?: string; homepageText?: string; overview?: string; tel?: string }
  >;
  // contentId → 추가 이미지 URL 목록 (TourAPI detailImage2). firstImage 외 갤러리.
  imagesByContent?: Record<string, string[]>;
  // contentId → 반복정보 (TourAPI detailInfo2 — 입장료·주차요금·화장실 등 항목별 안내)
  detailInfoByContent?: Record<string, Array<{ name: string; text: string }>>;
  // contentId → 출발 날짜 관광지 집중률 (한국관광공사 빅데이터, 시·군·구 선택 시만)
  crowdByContent?: Record<string, { ratePct: number; level: "low" | "medium" | "high"; date: string }>;
  // contentId → 인증 정보 (행정안전부 모범음식점·관광식당 + 한국관광공사 반려동물 동반).
  certificationsByContent?: Record<
    string,
    {
      excellent?: { designatedYmd: string; foodKind: string };
      tourist?: { addr: string };
      petFriendly?: boolean;
    }
  >;
  // 인접 스팟 사이 직선 거리(km). 길이 = spots.length - 1.
  legDistancesKm?: number[];
  // 코스 중심 좌표 + 출발 시각 날씨 (Open-Meteo). 스팟 추천 가중에도 사용됨.
  weather?: WeatherInfo;
  pace: PaceResult;
  wellness: WellnessScore;
  multiGen: MultiGenResult;
}
