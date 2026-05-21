import type { TourSpot, BarrierFreeInfo, CityCode } from "@/types";

// TourAPI 무응답/키 없음 시 데모용 시드 데이터.
// 실제 contentId는 무장애 OpenAPI 응답에서 받은 샘플 값을 사용.
// cat1 매핑: A01=자연, A02=인문(역사·문화), A04=쇼핑, A05=음식.
// contentTypeId: 12=관광지, 14=문화시설, 39=음식, 38=쇼핑.
export const MOCK_SPOTS: Record<CityCode, TourSpot[]> = {
  seoul: [
    {
      contentId: "126508",
      contentTypeId: "12",
      title: "경복궁",
      addr1: "서울특별시 종로구 사직로 161",
      mapX: 126.977041,
      mapY: 37.579617,
      cat1: "A02"
    },
    {
      contentId: "126501",
      contentTypeId: "12",
      title: "광화문광장",
      addr1: "서울특별시 종로구 세종로",
      mapX: 126.97697,
      mapY: 37.5728,
      cat1: "A02"
    },
    {
      contentId: "128475",
      contentTypeId: "14",
      title: "국립고궁박물관",
      addr1: "서울특별시 종로구 효자로 12",
      mapX: 126.973889,
      mapY: 37.578056,
      cat1: "A02"
    },
    {
      contentId: "126495",
      contentTypeId: "12",
      title: "인사동",
      addr1: "서울특별시 종로구 인사동길",
      mapX: 126.985,
      mapY: 37.5717,
      cat1: "A02"
    },
    {
      contentId: "264337",
      contentTypeId: "12",
      title: "익선동 한옥거리",
      addr1: "서울특별시 종로구 익선동",
      mapX: 126.9899,
      mapY: 37.572,
      cat1: "A02"
    },
    {
      contentId: "264338",
      contentTypeId: "39",
      title: "토속촌삼계탕",
      addr1: "서울특별시 종로구 자하문로5길 5",
      mapX: 126.972,
      mapY: 37.577,
      cat1: "A05"
    },
    {
      contentId: "264340",
      contentTypeId: "12",
      title: "북촌한옥마을",
      addr1: "서울특별시 종로구 계동길",
      mapX: 126.9851,
      mapY: 37.5826,
      cat1: "A02"
    },
    {
      contentId: "264341",
      contentTypeId: "14",
      title: "국립현대미술관 서울관",
      addr1: "서울특별시 종로구 삼청로 30",
      mapX: 126.98,
      mapY: 37.5786,
      cat1: "A02"
    },
    {
      contentId: "264342",
      contentTypeId: "39",
      title: "광장시장 먹거리골목",
      addr1: "서울특별시 종로구 창경궁로 88",
      mapX: 126.9999,
      mapY: 37.5703,
      cat1: "A05"
    },
    {
      contentId: "264343",
      contentTypeId: "12",
      title: "남산공원",
      addr1: "서울특별시 중구 회현동",
      mapX: 126.9912,
      mapY: 37.5512,
      cat1: "A01"
    },
    {
      contentId: "264344",
      contentTypeId: "12",
      title: "서울숲",
      addr1: "서울특별시 성동구 뚝섬로 273",
      mapX: 127.0379,
      mapY: 37.5446,
      cat1: "A01"
    },
    {
      contentId: "264345",
      contentTypeId: "12",
      title: "어린이대공원",
      addr1: "서울특별시 광진구 능동로 216",
      mapX: 127.0813,
      mapY: 37.5485,
      cat1: "A01"
    }
  ],
  jeju: [
    {
      contentId: "126204",
      contentTypeId: "12",
      title: "성산일출봉",
      addr1: "제주특별자치도 서귀포시 성산읍 일출로 284-12",
      mapX: 126.942222,
      mapY: 33.458056,
      cat1: "A01"
    },
    {
      contentId: "126205",
      contentTypeId: "12",
      title: "협재해수욕장",
      addr1: "제주특별자치도 제주시 한림읍 한림로 329",
      mapX: 126.239722,
      mapY: 33.394167,
      cat1: "A01"
    },
    {
      contentId: "126206",
      contentTypeId: "14",
      title: "제주 돌문화공원",
      addr1: "제주특별자치도 제주시 조천읍 남조로 2023",
      mapX: 126.6717,
      mapY: 33.466,
      cat1: "A02"
    },
    {
      contentId: "126210",
      contentTypeId: "12",
      title: "한라수목원",
      addr1: "제주특별자치도 제주시 수목원길 72",
      mapX: 126.4924,
      mapY: 33.4708,
      cat1: "A01"
    },
    {
      contentId: "126211",
      contentTypeId: "14",
      title: "제주민속자연사박물관",
      addr1: "제주특별자치도 제주시 삼성로 40",
      mapX: 126.5314,
      mapY: 33.5101,
      cat1: "A02"
    },
    {
      contentId: "126212",
      contentTypeId: "39",
      title: "동문재래시장",
      addr1: "제주특별자치도 제주시 관덕로14길 20",
      mapX: 126.527,
      mapY: 33.5118,
      cat1: "A05"
    },
    {
      contentId: "126213",
      contentTypeId: "12",
      title: "제주민속촌",
      addr1: "제주특별자치도 서귀포시 표선면 민속해안로 631-34",
      mapX: 126.8221,
      mapY: 33.318,
      cat1: "A02"
    },
    {
      contentId: "126214",
      contentTypeId: "39",
      title: "올레국수",
      addr1: "제주특별자치도 제주시 귀아랑길 24",
      mapX: 126.501,
      mapY: 33.494,
      cat1: "A05"
    }
  ],
  busan: [
    {
      contentId: "127765",
      contentTypeId: "12",
      title: "해운대해수욕장",
      addr1: "부산광역시 해운대구 해운대해변로 264",
      mapX: 129.158889,
      mapY: 35.158889,
      cat1: "A01"
    },
    {
      contentId: "127766",
      contentTypeId: "12",
      title: "감천문화마을",
      addr1: "부산광역시 사하구 감내2로 203",
      mapX: 129.0107,
      mapY: 35.0974,
      cat1: "A02"
    },
    {
      contentId: "127767",
      contentTypeId: "12",
      title: "광안리해수욕장",
      addr1: "부산광역시 수영구 광안해변로 219",
      mapX: 129.118,
      mapY: 35.153,
      cat1: "A01"
    },
    {
      contentId: "127770",
      contentTypeId: "14",
      title: "부산시립박물관",
      addr1: "부산광역시 남구 유엔평화로 63",
      mapX: 129.0871,
      mapY: 35.1283,
      cat1: "A02"
    },
    {
      contentId: "127771",
      contentTypeId: "39",
      title: "자갈치시장",
      addr1: "부산광역시 중구 자갈치해안로 52",
      mapX: 129.0306,
      mapY: 35.0966,
      cat1: "A05"
    },
    {
      contentId: "127772",
      contentTypeId: "12",
      title: "용두산공원",
      addr1: "부산광역시 중구 용두산길 37-55",
      mapX: 129.0322,
      mapY: 35.1006,
      cat1: "A01"
    },
    {
      contentId: "127773",
      contentTypeId: "12",
      title: "흰여울문화마을",
      addr1: "부산광역시 영도구 흰여울길 89-22",
      mapX: 129.045,
      mapY: 35.075,
      cat1: "A02"
    },
    {
      contentId: "127774",
      contentTypeId: "39",
      title: "할매가야밀면",
      addr1: "부산광역시 부산진구 가야대로 482",
      mapX: 129.034,
      mapY: 35.157,
      cat1: "A05"
    }
  ],
  // 경기도는 실 TourAPI 작동을 기본으로 함. mock은 API 실패 시 폴백용 핵심 스팟만.
  gyeonggi: [
    {
      contentId: "126267",
      contentTypeId: "12",
      title: "수원 화성",
      addr1: "경기도 수원시 팔달구 정조로 825",
      mapX: 127.0151,
      mapY: 37.2884,
      cat1: "A02",
      sigunguCode: "13"
    },
    {
      contentId: "126268",
      contentTypeId: "14",
      title: "한국민속촌",
      addr1: "경기도 용인시 기흥구 민속촌로 90",
      mapX: 127.1175,
      mapY: 37.2585,
      cat1: "A02",
      sigunguCode: "23"
    },
    {
      contentId: "126269",
      contentTypeId: "12",
      title: "광명동굴",
      addr1: "경기도 광명시 가학로85번길 142",
      mapX: 126.847,
      mapY: 37.4337,
      cat1: "A01",
      sigunguCode: "4"
    }
  ]
};

// 25개 항목 중 데모용 핵심 필드만 시드.
// '있음' = 자유 텍스트, undefined = 없음/미확인
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
  "264340": {
    contentId: "264340",
    ramp: "골목 경사 다소 있음 (구간별 휴식 권장)",
    restroom: "한옥마을 안내소 공용 화장실 (장애인 칸)",
    publicTransport: "안국역 2번 출구 도보 5분",
    guideHuman: "주말 도슨트 운영"
  },
  "264341": {
    contentId: "264341",
    wheelchair: "휠체어·유아차 무료 대여",
    parking: "장애인 주차 6면",
    elevator: "전 층 엘리베이터",
    restroom: "전 층 장애인 화장실",
    audioGuide: "음성 안내 단말기 제공",
    signLanguage: "수어 해설 예약제",
    guideHuman: "전시 도슨트 매일 운영"
  },
  "264342": {
    contentId: "264342",
    wheelchair: "주 통로 휠체어 진입 가능",
    restroom: "장애인 화장실 (시장 본관)",
    ramp: "출입구 경사로",
    publicTransport: "종로5가역 직접 연결"
  },
  "264343": {
    contentId: "264343",
    wheelchair: "케이블카 휠체어 진입 가능",
    parking: "장애인 주차장 (남산공영주차장)",
    restroom: "정상 장애인 화장실",
    elevator: "남산오르미 엘리베이터 운영",
    trail: "북측 순환로 무장애 구간"
  },
  "264344": {
    contentId: "264344",
    wheelchair: "전 구간 휠체어 산책로",
    parking: "장애인 주차장",
    restroom: "장애인 화장실 다수",
    ramp: "전 구간 평지·경사로 완비",
    babyStroller: "유아차 진입 자유"
  },
  "264345": {
    contentId: "264345",
    wheelchair: "전 구간 휠체어 동선",
    parking: "장애인 주차장",
    restroom: "장애인 화장실 다수",
    elevator: "주요 시설 엘리베이터",
    babyStroller: "유아차 대여",
    guideHuman: "주말 동물원 해설사"
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
  "126210": {
    contentId: "126210",
    wheelchair: "주요 산책로 휠체어 가능",
    parking: "장애인 주차장",
    restroom: "장애인 화장실",
    trail: "무장애 둘레길 1.2km",
    babyStroller: "유아차 진입 자유"
  },
  "126211": {
    contentId: "126211",
    wheelchair: "전 층 휠체어 동선",
    elevator: "전 층 엘리베이터",
    parking: "장애인 주차장",
    restroom: "장애인 화장실",
    audioGuide: "음성 안내 단말기"
  },
  "126212": {
    contentId: "126212",
    wheelchair: "주 통로 휠체어 진입 가능",
    restroom: "장애인 화장실 (시장 외곽)",
    ramp: "주 출입구 경사로"
  },
  "126213": {
    contentId: "126213",
    wheelchair: "주요 동선 휠체어 가능 (일부 단차)",
    parking: "장애인 주차장",
    restroom: "장애인 화장실 다수",
    guideHuman: "전통문화 해설사"
  },
  "126214": {
    contentId: "126214",
    wheelchair: "1층 좌석 휠체어 접근",
    restroom: "인근 공용 장애인 화장실"
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
  },
  "127770": {
    contentId: "127770",
    wheelchair: "전 층 휠체어 동선",
    elevator: "전 층 엘리베이터",
    parking: "장애인 주차장",
    restroom: "전 층 장애인 화장실",
    audioGuide: "오디오·점자 도록",
    signLanguage: "수어 해설 예약제",
    guideHuman: "전시 도슨트"
  },
  "127771": {
    contentId: "127771",
    wheelchair: "1층 통로 휠체어 진입",
    restroom: "장애인 화장실 (시장 인근)",
    ramp: "출입구 경사로",
    publicTransport: "자갈치역 직접 연결"
  },
  "127772": {
    contentId: "127772",
    wheelchair: "공원 산책로 휠체어 가능",
    parking: "장애인 주차장",
    restroom: "장애인 화장실",
    elevator: "용두산 에스컬레이터 운영",
    trail: "정상부 무장애 둘레길"
  },
  "127773": {
    contentId: "127773",
    wheelchair: "데크길 휠체어 진입 가능 (일부 계단 구간 있음)",
    restroom: "마을 안내소 장애인 화장실",
    ramp: "주 출입구 경사로",
    publicTransport: "흰여울터널 인근 정류장"
  },
  "127774": {
    contentId: "127774",
    wheelchair: "1층 좌석 휠체어 접근",
    restroom: "인근 공용 장애인 화장실"
  }
};
