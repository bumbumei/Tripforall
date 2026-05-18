import type { CompanionProfile, BarrierFreeInfo, WellnessScore } from "@/types";
import type { CourseStop } from "../course-builder";

export interface WellnessInput {
  companions: CompanionProfile[];
  course: CourseStop[];
  date?: string;
}

export function buildWellnessPrompt(input: WellnessInput): { system: string; user: string } {
  const system = `당신은 여행 일정의 "회복(Wellness)" 점수를 매기는 AI입니다.
관점: 단순 안전이 아니라, 여행이 끝났을 때 더 건강해지는 동선인지.

평가 축 (각 0-100):
- safety: 도움 받을 수 있음/직원 상주/24시간 화장실/응급 인프라
- rest: 휴식·앉을 자리·실내 비중·페이스 여유
- nature: 자연 노출·햇빛·녹지·신선한 공기
- crowd: 혼잡도(낮을수록 점수 높음)
- weather: 날씨 리스크 회피 가능성(실내 옵션·우천 대안)

이동약자/임산부/고령자에게 가중치를 더 둔다.

출력 스키마:
{
  "overall": 87,
  "axes": {"safety": 92, "rest": 84, "nature": 78, "crowd": 72, "weather": 95},
  "reasons": ["…", "…", "…"]
}
reasons는 한국어 3~5개. "왜 이 점수인가"를 사용자 관점에서 따뜻하게 서술.`;

  const companionDesc = input.companions
    .map((c) => `- ${c.nickname} (${c.age}세, ${c.mobility}${c.notes ? `, ${c.notes}` : ""})`)
    .join("\n");

  const courseDesc = input.course
    .map(
      (s, i) =>
        `${i + 1}. ${s.spot.title}
   카테고리: ${s.spot.cat1 ?? "?"}/${s.spot.cat2 ?? "?"}
   무장애: ${formatBfSummary(s.barrierFree)}`
    )
    .join("\n");

  const user = `[동행자]
${companionDesc}

[코스]
${courseDesc}

위 일정의 회복 점수를 매겨라.`;

  return { system, user };
}

function formatBfSummary(bf: BarrierFreeInfo): string {
  const parts: string[] = [];
  if (bf.wheelchair) parts.push("휠체어");
  if (bf.elevator) parts.push("엘리베이터");
  if (bf.restroom) parts.push("장애인화장실");
  if (bf.ramp) parts.push("경사로");
  if (bf.guideHuman) parts.push("도움인력");
  if (bf.lactationRoom) parts.push("수유실");
  return parts.length ? parts.join(", ") : "정보 제한";
}

export function validateWellnessScore(json: any): WellnessScore {
  return {
    overall: clamp(Number(json?.overall ?? 0)),
    axes: {
      safety: clamp(Number(json?.axes?.safety ?? 0)),
      rest: clamp(Number(json?.axes?.rest ?? 0)),
      nature: clamp(Number(json?.axes?.nature ?? 0)),
      crowd: clamp(Number(json?.axes?.crowd ?? 0)),
      weather: clamp(Number(json?.axes?.weather ?? 0))
    },
    reasons: Array.isArray(json?.reasons) ? json.reasons.map(String) : []
  };
}

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}
