import type { CompanionProfile, MultiGenResult } from "@/types";
import type { CourseStop } from "../course-builder";

export interface MultiGenInput {
  companions: CompanionProfile[];
  course: CourseStop[];
  city: string;
}

export function buildMultiGenPrompt(input: MultiGenInput): { system: string; user: string } {
  const system = `당신은 3세대 가족이 함께하는 여행을 설계하는 AI입니다 — "Multi-Generation Bridge".

원칙:
1. 페이스가 가장 느린 동행자가 기준이다.
2. 모두 함께 갈 수 있는 "공통 동선"이 메인이다.
3. 일부 구간은 짧게 분기(split)해서 활동적인 동행자가 별도 활동 후 재합류하게 한다.
4. 세대 간 정서를 잇는 "bonding" 미션을 1~2개 끼워 넣는다 (예: 손주가 할머니께 학생 시절 이야기 듣기).
5. 식사는 모든 동행자의 식이/접근성을 충족하는 한 곳.

세그먼트 타입:
- common: 모두 함께
- split: 분기 (branches[]에 각자 활동)
- rejoin: 재합류 지점
- meal: 식사

리허설 내러티브:
segments 외에 "narrative" 필드에 1인칭 시간순 한국어 시나리오를 6~10단락으로 작성.
사용자가 "미리 다녀온 사람의 일기"처럼 읽을 수 있게 따뜻하고 구체적으로.

출력 스키마:
{
  "segments": [
    { "time": "10:00", "type": "common", "title": "광화문역 도착",
      "durationMin": 8 },
    { "time": "10:30", "type": "split", "title": "근정전 분기 (15분)",
      "durationMin": 15,
      "branches": [
        { "members": ["할머니"], "activity": "그늘 벤치 휴식", "location": "근정전 동측 벤치" },
        { "members": ["어머니", "손주"], "activity": "경회루 산책", "location": "경회루" }
      ] }
  ],
  "narrative": "10시. 광화문역 5번 출구에 도착합니다. 이 출구는 엘리베이터가 있어서…"
}`;

  const companionDesc = input.companions
    .map(
      (c) =>
        `- ${c.nickname} (${c.age}세, ${c.mobility}, 체력 ${c.staminaPercent}%${c.notes ? `, ${c.notes}` : ""})`
    )
    .join("\n");

  const courseDesc = input.course
    .map(
      (s, i) =>
        `${i + 1}. ${s.spot.title} (${s.spot.addr1})
   무장애: 휠체어=${s.barrierFree.wheelchair ?? "?"} / 엘리베이터=${s.barrierFree.elevator ?? "?"} / 화장실=${s.barrierFree.restroom ?? "?"} / 경사=${s.barrierFree.ramp ?? "?"} / 인력=${s.barrierFree.guideHuman ?? "?"}`
    )
    .join("\n");

  const user = `[도시] ${input.city}

[동행자]
${companionDesc}

[코스]
${courseDesc}

위 코스를 Multi-Generation Bridge 원칙으로 재설계하라.
- 공통 동선 + 1~2회 분기 + 재합류
- 1~2회 세대 연결 bonding 미션
- narrative는 "어머니와 손주와 다녀온 ${input.city} 반나절" 일기처럼 작성.`;

  return { system, user };
}

export function validateMultiGenResult(json: any): MultiGenResult {
  const segments = Array.isArray(json?.segments) ? json.segments : [];
  return {
    segments: segments.map((s: any) => ({
      time: String(s.time ?? ""),
      type: (["common", "split", "rejoin", "meal"].includes(s.type) ? s.type : "common") as any,
      title: String(s.title ?? ""),
      durationMin: Number(s.durationMin ?? 0),
      branches: Array.isArray(s.branches)
        ? s.branches.map((b: any) => ({
            members: Array.isArray(b.members) ? b.members.map(String) : [],
            activity: String(b.activity ?? ""),
            location: b.location ? String(b.location) : undefined
          }))
        : undefined,
      bonding: s.bonding ? String(s.bonding) : undefined
    })),
    narrative: String(json?.narrative ?? "")
  };
}
