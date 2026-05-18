import type { TourSpot, BarrierFreeInfo, CityCode } from "@/types";

// TourAPI 무응답/키 없음 시 데모용 시드 데이터.
// 실제 contentId는 무장애 OpenAPI 응답에서 받은 샘플 값을 사용.
export const MOCK_SPOTS: Record<CityCode, TourSpot[]> = {
  seoul: [
    {
      contentId: "126508",
      contentTypeId: "12",
      title: "경복궁",
      addr1: "서울특별시 종로구 사직로 161",
      mapX: 126.977041,
      mapY: 37.579617,
      cat1: "A02",
      cat2: "A0201",
      cat3: "A02010100"
    },
    {
      contentId: "126501",
      contentTypeId: "12",
      title: "광화문광장",
      addr1: "서울특별시 종로구 세종로",
      mapX: 126.97697,
      mapY: 37.5728
    },
    {
      contentId: "128475",
      contentTypeId: "14",
      title: "국립고궁박물관",
      addr1: "서울특별시 종로구 효자로 12",
      mapX: 126.973889,
      mapY: 37.578056
    },
    {
      contentId: "126495",
      contentTypeId: "12",
      title: "인사동",
      addr1: "서울특별시 종로구 인사동길",
      mapX: 126.985,
      mapY: 37.5717
    },
    {
      contentId: "264337",
      contentTypeId: "12",
      title: "익선동 한옥거리",
      addr1: "서울특별시 종로구 익선동",
      mapX: 126.9899,
      mapY: 37.572
    },
    {
      contentId: "264338",
      contentTypeId: "39",
      title: "토속촌삼계탕",
      addr1: "서울특별시 종로구 자하문로5길 5",
      mapX: 126.972,
      mapY: 37.577
    }
  ],
  jeju: [
    {
      contentId: "126204",
      contentTypeId: "12",
      title: "성산일출봉",
      addr1: "제주특별자치도 서귀포시 성산읍 일출로 284-12",
      mapX: 126.942222,
      mapY: 33.458056
    },
    {
      contentId: "126205",
      contentTypeId: "12",
      title: "협재해수욕장",
      addr1: "제주특별자치도 제주시 한림읍 한림로 329",
      mapX: 126.239722,
      mapY: 33.394167
    },
    {
      contentId: "126206",
      contentTypeId: "14",
      title: "제주 돌문화공원",
      addr1: "제주특별자치도 제주시 조천읍 남조로 2023",
      mapX: 126.6717,
      mapY: 33.466
    }
  ],
  busan: [
    {
      contentId: "127765",
      contentTypeId: "12",
      title: "해운대해수욕장",
      addr1: "부산광역시 해운대구 해운대해변로 264",
      mapX: 129.158889,
      mapY: 35.158889
    },
    {
      contentId: "127766",
      contentTypeId: "12",
      title: "감천문화마을",
      addr1: "부산광역시 사하구 감내2로 203",
      mapX: 129.0107,
      mapY: 35.0974
    },
    {
      contentId: "127767",
      contentTypeId: "12",
      title: "광안리해수욕장",
      addr1: "부산광역시 수영구 광안해변로 219",
      mapX: 129.118,
      mapY: 35.153
    }
  ]
};

// 25개 항목 중 데모용 핵심 필드만 시드.
// '있음' = '1' (TourAPI 관례), 빈 문자열 또는 undefined = 없음/미확인
export const MOCK_BARRIER_FREE: Record<string, BarrierFreeInfo> = {
  "126508": {
    contentId: "126508",
    wheelchair: "휠체어 대여 가능 (안내소 문의)",
    parking: "장애인 전용 주차 구역 운영",
    elevator: "전동 카트 운영 (광화문 ~ 근정전)",
    restroom: "장애인 화장실 4개소 (근정전·경회루·수정전·향원지)",
    ramp: "주요 동선 평지 / 일부 박석 구간",
    audioGuide: "음성 안내 모바일 앱 제공",
    publicTransport: "지하철 3호선 경복궁역 5번 출구 엘리베이터",
    ticketOffice: "매표소 접근 가능",
    guideHuman: "사전 예약 시 무장애 해설 가능"
  },
  "126501": {
    contentId: "126501",
    parking: "인근 세종문화회관 주차장 (장애인 구역)",
    restroom: "광장 지하 화장실 (엘리베이터 접근)",
    elevator: "광장 지하 연결 엘리베이터 4기",
    publicTransport: "광화문역 직접 연결"
  },
  "128475": {
    contentId: "128475",
    wheelchair: "휠체어/유아차 무료 대여",
    parking: "장애인 전용 5면",
    elevator: "전 층 엘리베이터",
    restroom: "전 층 장애인 화장실",
    audioGuide: "오디오·점자 도록 제공",
    braileBlock: "전시실 입구 점자블록",
    signLanguage: "수어 영상 해설 (예약제)",
    lactationRoom: "1층 수유실",
    guideHuman: "수어/음성 해설 동행 예약"
  },
  "126495": {
    contentId: "126495",
    wheelchair: "보행자 우선 거리 (차량 통제)",
    restroom: "공중화장실 (장애인 구획)",
    ramp: "일부 골목 단차 있음"
  },
  "264337": {
    contentId: "264337",
    restroom: "공용 화장실 (장애인 칸 별도)",
    ramp: "골목 일부 단차 / 한옥 입구 경사 있음"
  },
  "264338": {
    contentId: "264338",
    wheelchair: "1층 좌석 휠체어 접근 가능",
    elevator: "엘리베이터 없음 (1층 운영)",
    restroom: "장애인 화장실 없음 (인근 공용 이용)",
    babyStroller: "유아 의자 제공"
  },
  "126204": {
    contentId: "126204",
    wheelchair: "휠체어 진입 불가 구간 다수 (경사 급)",
    parking: "장애인 주차장 운영",
    restroom: "주차장 인근 장애인 화장실",
    ramp: "전망대까지 계단 위주"
  },
  "126205": {
    contentId: "126205",
    wheelchair: "휠체어 진입 데크 일부 구간",
    parking: "장애인 주차장",
    restroom: "장애인 화장실 (해변 입구)",
    babyStroller: "유아차 진입 가능 (데크 한정)"
  },
  "126206": {
    contentId: "126206",
    wheelchair: "휠체어 산책로 별도 운영",
    elevator: "주요 시설 엘리베이터",
    parking: "장애인 주차장",
    restroom: "장애인 화장실 다수",
    audioGuide: "음성 안내"
  },
  "127765": {
    contentId: "127765",
    wheelchair: "해변 휠체어 무료 대여",
    parking: "장애인 주차장",
    restroom: "장애인 화장실 (해변 입구)",
    ramp: "백사장 진입 데크"
  },
  "127766": {
    contentId: "127766",
    wheelchair: "급경사 다수 (휠체어 매우 어려움)",
    parking: "장애인 주차장 (정상 인근)",
    restroom: "전망 포인트 장애인 화장실"
  },
  "127767": {
    contentId: "127767",
    wheelchair: "해변 휠체어 대여",
    parking: "장애인 주차장",
    restroom: "장애인 화장실",
    ramp: "백사장 진입 데크"
  }
};
