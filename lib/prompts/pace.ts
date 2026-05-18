import type { CompanionProfile, PaceResult } from "@/types";
import type { CourseStop } from "../course-builder";

export interface PaceInput {
  companions: CompanionProfile[];
  course: CourseStop[];
  durationHours: number;
  city: string;
}

export function buildPacePrompt(input: PaceInput): { system: string; user: string } {
  const system = `당신은 이동약자 동반 여행의 체력·페이스를 시뮬레이션하는 AI입니다.
역할:
- 가장 느린 동행자를 기준으로 일정을 설계한다.
- 각 구간이 동행자별 체력에 얼마나 영향을 주는지 추정한다.
- 휴식/식사가 회복을 일으킨다.
- 결과는 segments[] + summary 형태의 JSON.

규칙:
- 시간은 "HH:MM" 24시간 표기.
- staminaCost는 음수(소비) 또는 양수(회복).
- staminaAfter는 동행자 nickname을 키로 0~100 정수.
- 누군가 30 미만으로 떨어지면 warnings에 한국어로 명시.
- segments는 보통 7~12개. action은 "이동" | "관람" | "휴식" | "식사" | "분기" | "재합류".

출력 스키마:
{
  "segments": [
    { "time": "10:00", "place": "광화문역 5번 출구", "action": "이동",
      "durationMin": 8, "staminaCost": -3,
      "staminaAfter": {"어머니": 97, "손주": 99}, "warnings": [] }
  ],
  "summary": {
    "totalDurationMin": 240,
    "lowestStamina": {"어머니": 42, "손주": 78},
    "safe": true
  }
}`;

  const companionDesc = input.companions
    .map(
      (c) =>
        `- ${c.nickname} (${c.age}세, 이동:${c.mobility}, 시작체력:${c.staminaPercent}%${c.notes ? `, 메모:${c.notes}` : ""})`
    )
    .join("\n");

  const courseDesc = input.course
    .map(
      (s, i) =>
        `${i + 1}. ${s.spot.title} (${s.spot.addr1}) — 이전 지점에서 ${s.distFromPrevKm.toFixed(2)}km
   무장애: 휠체어=${s.barrierFree.wheelchair ?? "정보없음"} / 엘리베이터=${s.barrierFree.elevator ?? "없음"} / 화장실=${s.barrierFree.restroom ?? "없음"} / 경사로=${s.barrierFree.ramp ?? "없음"}`
    )
    .join("\n");

  const user = `[도시] ${input.city}
[전체 시간] ${input.durationHours}시간

[동행자]
${companionDesc}

[코스 (순서대로)]
${courseDesc}

위 정보로 체력 시뮬레이션을 만들어라. 가장 느린 동행자가 30% 미만으로 떨어지면 중간에 휴식 segment를 끼워 넣어 안전하게 만들어라.`;

  return { system, user };
}

// 결과 후처리/검증
export function validatePaceResult(json: any): PaceResult {
  const segments = Array.isArray(json?.segments) ? json.segments : [];
  const summary = json?.summary ?? {};
  return {
    segments: segments.map((s: any) => ({
      time: String(s.time ?? ""),
      place: String(s.place ?? ""),
      action: String(s.action ?? ""),
      durationMin: Number(s.durationMin ?? 0),
      staminaCost: Number(s.staminaCost ?? 0),
      staminaAfter: s.staminaAfter ?? {},
      warnings: Array.isArray(s.warnings) ? s.warnings : []
    })),
    summary: {
      totalDurationMin: Number(summary.totalDurationMin ?? 0),
      lowestStamina: summary.lowestStamina ?? {},
      safe: Boolean(summary.safe ?? true)
    }
  };
}
