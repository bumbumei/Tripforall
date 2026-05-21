import { NextResponse } from "next/server";
import { z } from "zod";
import type { TripPlanResponse, TripRequest } from "@/types";
import { buildCourse } from "@/lib/course-builder";
import { callLlmJson, hasLlmKey } from "@/lib/llm";
import { buildPacePrompt, validatePaceResult } from "@/lib/prompts/pace";
import { buildWellnessPrompt, validateWellnessScore } from "@/lib/prompts/wellness";
import { buildMultiGenPrompt, validateMultiGenResult } from "@/lib/prompts/multigen";
import { fallbackPace, fallbackWellness, fallbackMultiGen } from "@/lib/fallback";
import { CITY_CONFIG } from "@/lib/cities";
import { THEME_META } from "@/lib/themes";
import { findNearbyAccessibleToilets } from "@/lib/toilets";
import { findNearbyEmergencyRooms } from "@/lib/emergency";
import { getSigungu, isValidSigungu } from "@/lib/sigungu";

const RequestSchema = z.object({
  city: z.enum(["seoul", "jeju", "busan", "gyeonggi"]),
  sigungu: z.string().optional(),
  durationHours: z.number().min(2).max(10),
  theme: z.enum(["history", "nature", "food", "art", "family", "festival", "local", "indoor", "wellness", "pet"]).optional(),
  cuisine: z.enum(["korean", "chinese", "japanese", "western", "cafe", "any"]).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  forceSpotIds: z.array(z.string()).max(8).optional(),
  shuffleSeed: z.number().int().optional(),
  companions: z
    .array(
      z.object({
        id: z.string(),
        nickname: z.string(),
        age: z.number().int().min(0).max(120),
        mobility: z.enum([
          "wheelchair_manual",
          "wheelchair_powered",
          "stroller",
          "walking_aid",
          "low_stamina",
          "pregnant",
          "child",
          "general"
        ]),
        sensoryNeeds: z.array(z.string()).default([]),
        notes: z.string().optional(),
        staminaPercent: z.number().min(0).max(100)
      })
    )
    .min(1)
    .max(6)
});

export async function POST(req: Request) {
  let body: TripRequest;
  try {
    const parsed = RequestSchema.parse(await req.json());
    body = parsed as TripRequest;
  } catch (err: any) {
    return NextResponse.json({ error: "INVALID_INPUT", detail: err.message }, { status: 400 });
  }

  // 시·군·구 코드 검증. 유효하지 않은 코드는 무시 (도시 전체로 fallback).
  if (body.sigungu && !isValidSigungu(body.city, body.sigungu)) {
    body = { ...body, sigungu: undefined };
  }

  const {
    stops,
    recommended,
    expandedToCity,
    expandedReason,
    weather,
    skippedSpots,
    spotInfoByContent,
    imagesByContent,
    detailInfoByContent,
    crowdByContent,
    certificationsByContent
  } = await buildCourse(body);
  if (stops.length === 0) {
    return NextResponse.json(
      { error: "NO_COURSE", detail: "코스를 만들 수 없습니다." },
      { status: 500 }
    );
  }

  const cityName = CITY_CONFIG[body.city].nameKo;
  const themeMeta = body.theme ? THEME_META[body.theme] : undefined;
  const sigungu = getSigungu(body.city, body.sigungu);
  // narrative·프롬프트엔 "서울 종로구" 형식으로 — 더 구체적이면 묘사도 풍부해짐
  const placeLabel = sigungu ? `${cityName} ${sigungu.name}` : cityName;

  const [pace, wellness, multiGen] = await Promise.all([
    runPace({ companions: body.companions, course: stops, durationHours: body.durationHours, city: placeLabel }),
    runWellness({ companions: body.companions, course: stops, date: body.date }),
    runMultiGen({
      companions: body.companions,
      course: stops,
      city: placeLabel,
      themeLabel: themeMeta?.label,
      themeVibe: themeMeta?.vibe
    })
  ]);

  // 스팟별 반경 500m 내 장애인 화장실 (행정안전부 공중화장실 표준데이터셋)
  const nearbyToiletsByContent: Record<string, ReturnType<typeof findNearbyAccessibleToilets>> = {};
  for (const stop of stops) {
    const list = findNearbyAccessibleToilets(stop.spot.mapY, stop.spot.mapX, 500, 3);
    if (list.length > 0) nearbyToiletsByContent[stop.spot.contentId] = list;
  }

  // 코스 지리적 중심 좌표 기준 응급실 2곳 (국립중앙의료원 응급의료기관 API)
  const centerLat = stops.reduce((a, s) => a + s.spot.mapY, 0) / stops.length;
  const centerLng = stops.reduce((a, s) => a + s.spot.mapX, 0) / stops.length;
  const emergencyRooms = (await findNearbyEmergencyRooms(centerLat, centerLng, 2)).map(
    ({ name, addr, tel, distanceKm, divName, hours }) => ({
      name,
      addr,
      tel,
      distanceKm,
      divName,
      hours
    })
  );

  // 인접 스팟 사이 직선 거리 (km, 소수 1자리)
  const legDistancesKm = stops
    .slice(1)
    .map((s) => Math.round(s.distFromPrevKm * 10) / 10);

  const response: TripPlanResponse = {
    request: body,
    spots: stops.map((c) => c.spot),
    recommendedSpots: recommended,
    theme: body.theme,
    themeLabel: themeMeta?.label,
    sigunguLabel: sigungu?.name,
    expansion: expandedToCity
      ? { expandedToCity: true, reason: expandedReason ?? "" }
      : undefined,
    nearbyToiletsByContent,
    emergencyRooms,
    legDistancesKm,
    weather,
    skippedSpots,
    spotInfoByContent,
    imagesByContent,
    detailInfoByContent,
    crowdByContent,
    certificationsByContent,
    pace,
    wellness,
    multiGen
  };
  return NextResponse.json(response);
}

async function runPace(input: Parameters<typeof buildPacePrompt>[0]) {
  if (!hasLlmKey()) return fallbackPace(input.course, input.companions);
  try {
    const { system, user } = buildPacePrompt(input);
    const json = await callLlmJson<any>({ system, user, maxTokens: 1800 });
    return validatePaceResult(json);
  } catch {
    return fallbackPace(input.course, input.companions);
  }
}

async function runWellness(input: Parameters<typeof buildWellnessPrompt>[0]) {
  if (!hasLlmKey()) return fallbackWellness(input.course);
  try {
    const { system, user } = buildWellnessPrompt(input);
    const json = await callLlmJson<any>({ system, user, maxTokens: 800 });
    return validateWellnessScore(json);
  } catch {
    return fallbackWellness(input.course);
  }
}

async function runMultiGen(input: Parameters<typeof buildMultiGenPrompt>[0]) {
  if (!hasLlmKey()) {
    return fallbackMultiGen(input.course, input.companions, input.city, input.themeLabel);
  }
  try {
    const { system, user } = buildMultiGenPrompt(input);
    const json = await callLlmJson<any>({ system, user, maxTokens: 2200 });
    return validateMultiGenResult(json);
  } catch {
    return fallbackMultiGen(input.course, input.companions, input.city, input.themeLabel);
  }
}
