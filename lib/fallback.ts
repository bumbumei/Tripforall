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
  city: string,
  themeLabel?: string
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

  const narrative = buildFallbackNarrative(course, companions, city, themeLabel);

  return { segments, narrative };
}

// 데모 모드용 narrative. LLM 키가 없어도 시연이 빈약해 보이지 않도록
// 동행자 프로파일·무장애 정보·동선 흐름을 시간순 장면으로 엮는다.
// 결정론적 — 같은 입력이면 같은 출력 (시연 재현성 보장).
// 마지막 문단에 안정적인 시그니처 문장이 들어가며, verify 스크립트가
// 이 시그니처로 LLM 출력과 구분한다.
const FALLBACK_SIGNATURE = "가장 천천히 걷는 사람의 속도가 오늘 우리 모두의 속도였습니다.";

// 종성 유무로 한국어 조사 결정.
function hasJong(s: string): boolean {
  const last = s[s.length - 1];
  if (!last) return false;
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}
const ka = (n: string) => n + (hasJong(n) ? "이" : "가"); // 주격
const neun = (n: string) => n + (hasJong(n) ? "은" : "는"); // 보조사

const CITY_ATMOSPHERE: Record<string, { dawn: string; closing: string }> = {
  서울: {
    dawn: "광화문 일대의 공기는 아직 차고, 가로수 사이로 비스듬한 햇살이 인도 위에 길게 내려앉아 있습니다.",
    closing: "해가 종로의 빌딩 뒤로 기우는 시간, 골목의 그늘이 조금씩 길어지며 오늘의 동선이 차분히 닫힙니다."
  },
  제주: {
    dawn: "바다 냄새가 섞인 아침 공기. 검은 돌담 너머로 햇살이 부드럽게 퍼지고, 멀리 오름의 능선이 흐릿하게 떠오릅니다.",
    closing: "오름 위로 노을이 번지는 시간. 잔잔한 바람이 일행의 등을 가볍게 미는 것 같습니다."
  },
  부산: {
    dawn: "바닷바람이 골목까지 닿는 아침. 짠 내음 사이로 갈매기 소리가 멀리서 들려옵니다.",
    closing: "수영만 너머로 해가 떨어질 무렵, 바닷바람이 일행의 발걸음을 차분히 멈추게 합니다."
  }
};

function buildFallbackNarrative(
  course: CourseStop[],
  companions: CompanionProfile[],
  city: string,
  themeLabel?: string
): string {
  const elder = companions.find((c) => c.age >= 65);
  const kid = companions.find((c) => c.age <= 12);
  const pregnant = companions.find((c) => c.mobility === "pregnant");
  const adult = companions.find(
    (c) => c.age >= 18 && c.age < 65 && c.mobility !== "pregnant"
  );

  const atmosphere = CITY_ATMOSPHERE[city] ?? {
    dawn: `${city}의 아침 공기 속에서 일행이 천천히 모입니다.`,
    closing: `${city}의 오후. 모두가 무리 없이 오늘의 동선을 마무리합니다.`
  };

  const introduceMembers = (): string => {
    const tags: string[] = [];
    if (elder) {
      const note = elder.notes ? `, ${elder.notes}` : "";
      tags.push(`${elder.nickname}(${elder.age}세${note})`);
    }
    if (pregnant && pregnant !== elder) {
      const note = pregnant.notes ? `, ${pregnant.notes}` : ", 임신 중";
      tags.push(`${pregnant.nickname}(${pregnant.age}세${note})`);
    }
    if (adult && adult !== elder && adult !== pregnant) {
      tags.push(`${adult.nickname}(${adult.age}세)`);
    }
    if (kid) tags.push(`${kid.nickname}(${kid.age}세)`);
    if (!tags.length) {
      tags.push(...companions.map((c) => `${c.nickname}(${c.age}세)`));
    }
    return tags.join(", ");
  };

  const lines: string[] = [];

  // 1) 오프닝 — 도시 분위기 + 일행 소개 + (테마 있으면) 테마 한 줄
  lines.push(atmosphere.dawn);
  if (themeLabel) {
    lines.push(
      `오늘의 테마는 "${themeLabel}". 동선은 그 결을 따라 짜였고, 무리 없이 한 호흡으로 흐릅니다.`
    );
  }
  lines.push(
    `오늘 함께 걷는 사람들 — ${introduceMembers()}. ${
      kid && elder
        ? "세 세대가 한 동선 위에 서는 날입니다."
        : pregnant
          ? "임신부의 페이스에 모두가 보폭을 맞추기로 했습니다."
          : "가장 천천히 걷는 사람의 속도가 오늘의 기준입니다."
    }`
  );

  // 2) 스톱별 장면 — 시간·접근성·동행자 디테일·세대 연결 미션 1회
  let hour = 10;
  let bondingPlaced = false;
  course.forEach((stop, i) => {
    const time = `${hour}시`;
    const isMeal = stop.spot.contentTypeId === "39";
    const bf = stop.barrierFree;

    // 도착 문장
    if (i === 0) {
      lines.push(
        `${time}. 첫 목적지 ${stop.spot.title} 앞에 섰습니다. 들머리에서 모두의 신발 끈을 한 번씩 다시 묶고, 일행의 표정을 살핍니다.`
      );
    } else if (isMeal) {
      const kidName = kid?.nickname ?? "아이";
      lines.push(
        `${time}. ${stop.spot.title}에서 자리를 잡습니다. 오늘 가장 긴 휴식이자 가장 따뜻한 장면. 음식을 기다리는 동안 ${ka(kidName)} 그림 메뉴를 손가락으로 따라 그립니다.`
      );
    } else {
      const prev = course[i - 1].spot.title;
      const km = Math.max(0.1, Math.round(stop.distFromPrevKm * 10) / 10);
      lines.push(
        `${time}. ${prev}에서 ${stop.spot.title}까지 약 ${km}km, 한 박자 천천히 이동했습니다. 신호 대기마다 일행이 멈춰 서로의 호흡을 확인합니다.`
      );
    }

    // 접근성 디테일 — 무장애 플래그 기반
    const accessBeats: string[] = [];
    if (bf.elevator) {
      accessBeats.push(
        "엘리베이터가 층 사이를 이어 줘서, 휠체어와 유아차의 동선이 끊기지 않습니다"
      );
    }
    if (bf.ramp && !bf.elevator) {
      accessBeats.push(
        "주 출입구에 경사로가 있어 단차 부담이 작습니다"
      );
    }
    if (bf.restroom) {
      accessBeats.push(
        "장애인 화장실이 가까이 있어 다음 휴식 타이밍이 자연스럽게 짜집니다"
      );
    }
    if (bf.guideHuman) {
      accessBeats.push("안내인력이 상주해 도움을 청하기 어렵지 않습니다");
    }
    if (bf.publicTransport) {
      accessBeats.push("대중교통 접근성이 좋아 중간 합류·해산이 자유롭습니다");
    }
    if (bf.audioGuide || bf.signLanguage) {
      accessBeats.push("음성·수어 안내가 제공되어 감각 정보의 폭이 넓어집니다");
    }
    if (accessBeats.length === 0) {
      lines.push(
        "현장 안내데스크에 동선을 한 번 물어 두면, 가장 안전한 경로를 추천받을 수 있습니다."
      );
    } else if (accessBeats.length === 1) {
      lines.push(`${accessBeats[0]}.`);
    } else {
      lines.push(`${accessBeats[0]}. 게다가 ${accessBeats[1]}.`);
    }

    // 인물 비트 — 식사 장면 제외, 동행자 프로파일에 따라 분기
    if (!isMeal) {
      if (elder) {
        const elderBeats = [
          `${elder.nickname}께서는 잠시 그늘 벤치에 앉아 호흡을 고르며, 햇살이 잎사귀 사이로 떨어지는 모양을 한참 바라보십니다.`,
          `${elder.nickname}께서는 천천히 걸으며 옛 기억을 더듬으십니다. "여기, 옛날엔 이러지 않았는데…" 같은 말씀이 작게 새어 나옵니다.`,
          `${elder.nickname}께서는 손잡이를 가볍게 짚으며, 일행의 속도가 자신의 속도라는 사실을 안도하시는 듯합니다.`
        ];
        lines.push(elderBeats[i % elderBeats.length]);
      }
      if (pregnant && pregnant !== elder) {
        if (i % 2 === 0) {
          lines.push(
            `${neun(pregnant.nickname)} 한 손을 배 위에 올린 채, 보폭을 일정하게 유지하며 일행 가운데를 걷습니다.`
          );
        }
      }
      if (kid) {
        const kidBeats = [
          `${ka(kid.nickname)} 작은 발견에 눈을 빛내며, ${elder?.nickname ?? "어른"}께 끊임없이 질문을 던집니다.`,
          `${ka(kid.nickname)} 앞장서 달려가다가도 뒤를 돌아보며 모두를 기다립니다. 기다리는 법을 배우는 중입니다.`,
          `${ka(kid.nickname)} 길가의 돌 모양, 간판 글씨, 사람들의 옷차림까지 하나하나 짚어 가며 걷습니다.`
        ];
        lines.push(kidBeats[i % kidBeats.length]);
      }
    }

    // 세대 연결 미션 — 두 번째 비-식사 스톱에 한 번만
    if (!bondingPlaced && !isMeal && i >= 1 && elder && kid) {
      lines.push(
        `잠깐, 오늘의 세대 연결 미션. ${ka(kid.nickname)} ${elder.nickname}께 "어렸을 때 이런 곳에 와 보신 적 있어요?" 라고 여쭙고, 답변을 휴대폰에 짧게 녹음합니다. 30초도 좋고 1분도 좋습니다. 훗날 가족 앨범에 끼울 수 없는 한 장면이 그 안에 남습니다.`
      );
      bondingPlaced = true;
    }

    hour++;
  });

  // 3) 클로징 — 도시 분위기 + 시그니처 문장 (verify가 이 문장으로 fallback을 식별)
  lines.push(atmosphere.closing);
  lines.push(`천천히, 함께. ${FALLBACK_SIGNATURE}`);

  return lines.join("\n\n");
}
