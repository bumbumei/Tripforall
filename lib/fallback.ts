// Claude API 키 없을 때 결정론적 fallback 결과 생성기.
// 발표 데모에서 키 없이도 화면이 살아 있도록.

import type {
  CompanionProfile,
  PaceResult,
  WellnessScore,
  MultiGenResult,
  PaceSegment
} from "@/types";
import type { CourseStop } from "./course-builder";

export function fallbackPace(course: CourseStop[], companions: CompanionProfile[]): PaceResult {
  const segments: PaceSegment[] = [];
  let clock = 10 * 60; // 10:00
  const stamina: Record<string, number> = {};
  companions.forEach((c) => (stamina[c.nickname] = c.staminaPercent));

  function fmt(m: number): string {
    const h = Math.floor(m / 60) % 24;
    const mm = m % 60;
    return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  }

  function consume(amount: number) {
    companions.forEach((c) => {
      const weight = staminaWeight(c);
      stamina[c.nickname] = Math.max(0, Math.round(stamina[c.nickname] + amount * weight));
    });
  }

  function snapshot(): Record<string, number> {
    return { ...stamina };
  }

  course.forEach((stop, i) => {
    if (i > 0) {
      const walkMin = Math.max(8, Math.round(stop.distFromPrevKm * 20));
      consume(-Math.round(stop.distFromPrevKm * 6));
      segments.push({
        time: fmt(clock),
        place: `${course[i - 1].spot.title} → ${stop.spot.title} 이동`,
        action: "이동",
        durationMin: walkMin,
        staminaCost: -Math.round(stop.distFromPrevKm * 6),
        staminaAfter: snapshot(),
        warnings: stamina && Math.min(...Object.values(stamina)) < 40 ? ["체력이 낮아지고 있어요. 곧 휴식을 권장합니다."] : []
      });
      clock += walkMin;
    }

    const visitMin = stop.spot.contentTypeId === "39" ? 50 : 30;
    const cost = stop.spot.contentTypeId === "39" ? +12 : -8;
    consume(cost);
    segments.push({
      time: fmt(clock),
      place: stop.spot.title,
      action: stop.spot.contentTypeId === "39" ? "식사" : "관람",
      durationMin: visitMin,
      staminaCost: cost,
      staminaAfter: snapshot()
    });
    clock += visitMin;

    // 매 2번째 stop 후 휴식
    if (i % 2 === 1 && i < course.length - 1) {
      consume(+8);
      segments.push({
        time: fmt(clock),
        place: "근처 카페 휴식",
        action: "휴식",
        durationMin: 20,
        staminaCost: +8,
        staminaAfter: snapshot()
      });
      clock += 20;
    }
  });

  const lowest: Record<string, number> = {};
  companions.forEach((c) => {
    lowest[c.nickname] = Math.min(
      ...segments.map((s) => s.staminaAfter[c.nickname] ?? c.staminaPercent)
    );
  });

  return {
    segments,
    summary: {
      totalDurationMin: segments.reduce((a, s) => a + s.durationMin, 0),
      lowestStamina: lowest,
      safe: Math.min(...Object.values(lowest)) >= 30
    }
  };
}

function staminaWeight(c: CompanionProfile): number {
  switch (c.mobility) {
    case "wheelchair_manual":
    case "wheelchair_powered":
      return 1.4;
    case "walking_aid":
    case "low_stamina":
      return 1.6;
    case "pregnant":
      return 1.3;
    case "stroller":
      return 1.1;
    case "child":
      return 0.7;
    default:
      return 1.0;
  }
}

export function fallbackWellness(course: CourseStop[]): WellnessScore {
  const safety = avgFlag(course, (b) => !!b.guideHuman || !!b.publicTransport, 70, 95);
  const rest = avgFlag(course, (b) => !!b.restroom, 60, 90);
  const elevatorBoost = avgFlag(course, (b) => !!b.elevator, 65, 92);
  const nature = course.some((c) => c.spot.cat1 === "A01") ? 78 : 62;
  const crowd = 72;
  const weather = avgFlag(course, (b) => !!b.elevator || !!b.guideSystem, 70, 90);

  const overall = Math.round((safety + rest + nature + crowd + weather) / 5);
  return {
    overall,
    axes: { safety, rest, nature, crowd, weather },
    reasons: [
      "휴식 가능한 화장실·벤치가 코스 곳곳에 분포되어 있어요.",
      "엘리베이터·평지 동선 비중이 높아 체력 부담이 적습니다.",
      "주요 지점에 안내인력 또는 대중교통 접근성이 확보되어 있어요."
    ]
  };
}

function avgFlag(
  course: CourseStop[],
  pred: (bf: any) => boolean,
  lo: number,
  hi: number
): number {
  const ratio = course.filter((c) => pred(c.barrierFree)).length / Math.max(1, course.length);
  return Math.round(lo + (hi - lo) * ratio);
}

export function fallbackMultiGen(
  course: CourseStop[],
  companions: CompanionProfile[],
  city: string
): MultiGenResult {
  const elder = companions.find((c) => c.age >= 65) ?? companions[0];
  const kid = companions.find((c) => c.age <= 12);
  const adult = companions.find((c) => c.age >= 25 && c.age < 65);

  const segments: MultiGenResult["segments"] = [];
  let clock = 10 * 60;
  const fmt = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

  course.forEach((stop, i) => {
    segments.push({
      time: fmt(clock),
      type: stop.spot.contentTypeId === "39" ? "meal" : "common",
      title: stop.spot.title,
      durationMin: stop.spot.contentTypeId === "39" ? 50 : 30
    });
    clock += stop.spot.contentTypeId === "39" ? 50 : 30;

    // 두 번째 stop에서 분기 + bonding
    if (i === 1 && kid && elder) {
      segments.push({
        time: fmt(clock),
        type: "split",
        title: `${stop.spot.title} 분기 (15분)`,
        durationMin: 15,
        branches: [
          {
            members: [elder.nickname],
            activity: "그늘 벤치에서 안전하게 휴식",
            location: `${stop.spot.title} 인근 벤치`
          },
          {
            members: [adult?.nickname, kid.nickname].filter(Boolean) as string[],
            activity: "가벼운 산책 및 사진 촬영",
            location: `${stop.spot.title} 전망 포인트`
          }
        ],
        bonding: `${kid.nickname}이(가) ${elder.nickname}께 "옛날에 여기 와본 적 있으세요?" 라고 여쭤보고, 답변을 짧게 녹음해 보세요.`
      });
      clock += 15;
      segments.push({
        time: fmt(clock),
        type: "rejoin",
        title: "재합류",
        durationMin: 5
      });
      clock += 5;
    }
  });

  const narrative = buildFallbackNarrative(course, companions, city);

  return { segments, narrative };
}

function buildFallbackNarrative(
  course: CourseStop[],
  companions: CompanionProfile[],
  city: string
): string {
  const lines: string[] = [];
  const names = companions.map((c) => c.nickname).join(", ");
  lines.push(`${city}의 아침. ${names}와(과) 함께 출발합니다.`);
  course.forEach((s, i) => {
    const bf = s.barrierFree;
    const access = bf.elevator
      ? "엘리베이터가 있어 이동이 편합니다."
      : bf.ramp
        ? "주요 동선은 평지이지만, 일부 단차가 있어 한 박자 천천히 갑니다."
        : "현장에서 직원께 안내를 요청하면 좋습니다.";
    lines.push(`${i + 1}. ${s.spot.title} — ${access}`);
  });
  lines.push("천천히, 함께. 오늘의 페이스는 가장 천천히 걷는 사람의 것입니다.");
  return lines.join("\n\n");
}
