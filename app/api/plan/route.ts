import { NextResponse } from "next/server";
import { z } from "zod";
import type { TripPlanResponse, TripRequest } from "@/types";
import { buildCourse } from "@/lib/course-builder";
import { callClaudeJson, hasClaudeKey } from "@/lib/claude";
import { buildPacePrompt, validatePaceResult } from "@/lib/prompts/pace";
import { buildWellnessPrompt, validateWellnessScore } from "@/lib/prompts/wellness";
import { buildMultiGenPrompt, validateMultiGenResult } from "@/lib/prompts/multigen";
import { fallbackPace, fallbackWellness, fallbackMultiGen } from "@/lib/fallback";
import { CITY_CONFIG } from "@/lib/cities";

const RequestSchema = z.object({
  city: z.enum(["seoul", "jeju", "busan"]),
  durationHours: z.number().min(2).max(10),
  theme: z.string().optional(),
  date: z.string().optional(),
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

  const course = await buildCourse(body);
  if (course.length === 0) {
    return NextResponse.json({ error: "NO_COURSE", detail: "코스를 만들 수 없습니다." }, { status: 500 });
  }

  const cityName = CITY_CONFIG[body.city].nameKo;

  const [pace, wellness, multiGen] = await Promise.all([
    runPace({ companions: body.companions, course, durationHours: body.durationHours, city: cityName }),
    runWellness({ companions: body.companions, course, date: body.date }),
    runMultiGen({ companions: body.companions, course, city: cityName })
  ]);

  const response: TripPlanResponse = {
    request: body,
    spots: course.map((c) => c.spot),
    pace,
    wellness,
    multiGen
  };
  return NextResponse.json(response);
}

async function runPace(input: Parameters<typeof buildPacePrompt>[0]) {
  if (!hasClaudeKey()) return fallbackPace(input.course, input.companions);
  try {
    const { system, user } = buildPacePrompt(input);
    const json = await callClaudeJson<any>({ system, user, maxTokens: 1800 });
    return validatePaceResult(json);
  } catch {
    return fallbackPace(input.course, input.companions);
  }
}

async function runWellness(input: Parameters<typeof buildWellnessPrompt>[0]) {
  if (!hasClaudeKey()) return fallbackWellness(input.course);
  try {
    const { system, user } = buildWellnessPrompt(input);
    const json = await callClaudeJson<any>({ system, user, maxTokens: 800 });
    return validateWellnessScore(json);
  } catch {
    return fallbackWellness(input.course);
  }
}

async function runMultiGen(input: Parameters<typeof buildMultiGenPrompt>[0]) {
  if (!hasClaudeKey()) return fallbackMultiGen(input.course, input.companions, input.city);
  try {
    const { system, user } = buildMultiGenPrompt(input);
    const json = await callClaudeJson<any>({ system, user, maxTokens: 2200 });
    return validateMultiGenResult(json);
  } catch {
    return fallbackMultiGen(input.course, input.companions, input.city);
  }
}
