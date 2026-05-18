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

export type CityCode = "seoul" | "jeju" | "busan";

export interface TripRequest {
  city: CityCode;
  durationHours: number;
  companions: CompanionProfile[];
  theme?: string; // "역사·문화", "자연", "맛집" 등
  date?: string;
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

export interface TripPlanResponse {
  request: TripRequest;
  spots: TourSpot[];
  pace: PaceResult;
  wellness: WellnessScore;
  multiGen: MultiGenResult;
}
