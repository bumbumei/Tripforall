import type { CityCode } from "@/types";

// TourAPI areaCode 매핑
export const CITY_CONFIG: Record<
  CityCode,
  { areaCode: string; name: string; nameKo: string; lat: number; lng: number }
> = {
  seoul: { areaCode: "1", name: "Seoul", nameKo: "서울", lat: 37.5665, lng: 126.978 },
  busan: { areaCode: "6", name: "Busan", nameKo: "부산", lat: 35.1796, lng: 129.0756 },
  jeju: { areaCode: "39", name: "Jeju", nameKo: "제주", lat: 33.4996, lng: 126.5312 },
  gyeonggi: { areaCode: "31", name: "Gyeonggi", nameKo: "경기", lat: 37.4138, lng: 127.5183 }
};

export function getCity(code: CityCode) {
  return CITY_CONFIG[code];
}
