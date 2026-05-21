// TourAPI 4.0 sigunguCode 정적 매핑.
// 공식 areaCode2 API에서 받은 값 (areaCode 1/6/39 각각).
// 제주(39)는 통합 폐지된 "남제주군"·"북제주군"은 제외하고 실제 의미 있는 시·군만 노출.

import type { CityCode } from "@/types";

export interface Sigungu {
  code: string; // TourAPI sigunguCode (문자열)
  name: string; // "종로구", "서귀포시" 등
  ldongCode?: string; // 행정안전부 법정동 5자리 (관광지 집중률 등 빅데이터 API용)
}

// 시·도 → 법정동 광역코드 (관광지 집중률 API areaCd 파라미터)
export const CITY_LDONG: Record<CityCode, string> = {
  seoul: "11",
  busan: "26",
  jeju: "50",
  gyeonggi: "41"
};

export const SIGUNGU_BY_CITY: Record<CityCode, Sigungu[]> = {
  seoul: [
    { code: "1", name: "강남구", ldongCode: "11680" },
    { code: "2", name: "강동구", ldongCode: "11740" },
    { code: "3", name: "강북구", ldongCode: "11305" },
    { code: "4", name: "강서구", ldongCode: "11500" },
    { code: "5", name: "관악구", ldongCode: "11620" },
    { code: "6", name: "광진구", ldongCode: "11215" },
    { code: "7", name: "구로구", ldongCode: "11530" },
    { code: "8", name: "금천구", ldongCode: "11545" },
    { code: "9", name: "노원구", ldongCode: "11350" },
    { code: "10", name: "도봉구", ldongCode: "11320" },
    { code: "11", name: "동대문구", ldongCode: "11230" },
    { code: "12", name: "동작구", ldongCode: "11590" },
    { code: "13", name: "마포구", ldongCode: "11440" },
    { code: "14", name: "서대문구", ldongCode: "11410" },
    { code: "15", name: "서초구", ldongCode: "11650" },
    { code: "16", name: "성동구", ldongCode: "11200" },
    { code: "17", name: "성북구", ldongCode: "11290" },
    { code: "18", name: "송파구", ldongCode: "11710" },
    { code: "19", name: "양천구", ldongCode: "11470" },
    { code: "20", name: "영등포구", ldongCode: "11560" },
    { code: "21", name: "용산구", ldongCode: "11170" },
    { code: "22", name: "은평구", ldongCode: "11380" },
    { code: "23", name: "종로구", ldongCode: "11110" },
    { code: "24", name: "중구", ldongCode: "11140" },
    { code: "25", name: "중랑구", ldongCode: "11260" }
  ],
  busan: [
    { code: "1", name: "강서구", ldongCode: "26440" },
    { code: "2", name: "금정구", ldongCode: "26410" },
    { code: "3", name: "기장군", ldongCode: "26710" },
    { code: "4", name: "남구", ldongCode: "26290" },
    { code: "5", name: "동구", ldongCode: "26170" },
    { code: "6", name: "동래구", ldongCode: "26260" },
    { code: "7", name: "부산진구", ldongCode: "26230" },
    { code: "8", name: "북구", ldongCode: "26320" },
    { code: "9", name: "사상구", ldongCode: "26530" },
    { code: "10", name: "사하구", ldongCode: "26380" },
    { code: "11", name: "서구", ldongCode: "26140" },
    { code: "12", name: "수영구", ldongCode: "26500" },
    { code: "13", name: "연제구", ldongCode: "26470" },
    { code: "14", name: "영도구", ldongCode: "26200" },
    { code: "15", name: "중구", ldongCode: "26110" },
    { code: "16", name: "해운대구", ldongCode: "26350" }
  ],
  jeju: [
    // 2006년 통합으로 폐지된 남제주군/북제주군은 제외.
    { code: "4", name: "제주시", ldongCode: "50110" },
    { code: "3", name: "서귀포시", ldongCode: "50130" }
  ],
  gyeonggi: [
    { code: "1", name: "가평군", ldongCode: "41820" },
    { code: "2", name: "고양시", ldongCode: "41280" },
    { code: "3", name: "과천시", ldongCode: "41290" },
    { code: "4", name: "광명시", ldongCode: "41210" },
    { code: "5", name: "광주시", ldongCode: "41610" },
    { code: "6", name: "구리시", ldongCode: "41310" },
    { code: "7", name: "군포시", ldongCode: "41410" },
    { code: "8", name: "김포시", ldongCode: "41570" },
    { code: "9", name: "남양주시", ldongCode: "41360" },
    { code: "10", name: "동두천시", ldongCode: "41250" },
    { code: "11", name: "부천시", ldongCode: "41190" },
    { code: "12", name: "성남시", ldongCode: "41131" },
    { code: "13", name: "수원시", ldongCode: "41110" },
    { code: "14", name: "시흥시", ldongCode: "41390" },
    { code: "15", name: "안산시", ldongCode: "41270" },
    { code: "16", name: "안성시", ldongCode: "41550" },
    { code: "17", name: "안양시", ldongCode: "41170" },
    { code: "18", name: "양주시", ldongCode: "41630" },
    { code: "19", name: "양평군", ldongCode: "41830" },
    { code: "20", name: "여주시", ldongCode: "41670" },
    { code: "21", name: "연천군", ldongCode: "41800" },
    { code: "22", name: "오산시", ldongCode: "41370" },
    { code: "23", name: "용인시", ldongCode: "41460" },
    { code: "24", name: "의왕시", ldongCode: "41430" },
    { code: "25", name: "의정부시", ldongCode: "41150" },
    { code: "26", name: "이천시", ldongCode: "41500" },
    { code: "27", name: "파주시", ldongCode: "41480" },
    { code: "28", name: "평택시", ldongCode: "41220" },
    { code: "29", name: "포천시", ldongCode: "41650" },
    { code: "30", name: "하남시", ldongCode: "41450" },
    { code: "31", name: "화성시", ldongCode: "41590" }
  ]
};

export function getSigungu(city: CityCode, code: string | undefined): Sigungu | undefined {
  if (!code) return undefined;
  return SIGUNGU_BY_CITY[city]?.find((s) => s.code === code);
}

export function isValidSigungu(city: CityCode, code: string): boolean {
  return SIGUNGU_BY_CITY[city]?.some((s) => s.code === code) ?? false;
}
