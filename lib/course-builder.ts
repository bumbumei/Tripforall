import type { TripRequest, TourSpot, BarrierFreeInfo } from "@/types";
import { listBarrierFreeSpots, getBarrierFreeDetail, distanceKm } from "./tour-api";

export interface CourseStop {
  spot: TourSpot;
  barrierFree: BarrierFreeInfo;
  distFromPrevKm: number;
}

export async function buildCourse(req: TripRequest): Promise<CourseStop[]> {
  const all = await listBarrierFreeSpots(req.city, 12);
  if (all.length === 0) return [];

  // 가장 느린 동행자의 보행 한계 기준으로 코스 길이 결정.
  const slowest = req.companions.reduce(
    (acc, c) => (c.staminaPercent < acc.staminaPercent ? c : acc),
    req.companions[0]
  );

  // 시간/체력에 따라 stops 수 결정 (3~5개)
  const stops = Math.min(
    5,
    Math.max(3, Math.floor(req.durationHours * 1.2))
  );

  // 시작점: 첫 spot (TourAPI는 인기/거리 순). 이후 nearest-neighbor.
  const picked: TourSpot[] = [];
  const remaining = [...all];
  picked.push(remaining.shift()!);

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
  }

  // 식당 1곳 보장 (contentTypeId 39)
  const hasRestaurant = picked.some((s) => s.contentTypeId === "39");
  if (!hasRestaurant) {
    const r = all.find((s) => s.contentTypeId === "39");
    if (r && !picked.find((p) => p.contentId === r.contentId)) {
      // 코스 중간 즈음에 삽입
      picked.splice(Math.floor(picked.length / 2), 0, r);
    }
  }

  // barrierFree detail 병렬 조회
  const details = await Promise.all(picked.map((s) => getBarrierFreeDetail(s.contentId)));

  return picked.map((spot, i) => ({
    spot,
    barrierFree: details[i],
    distFromPrevKm: i === 0 ? 0 : distanceKm(picked[i - 1], spot)
  }));
}
