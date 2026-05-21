#!/usr/bin/env node
// 로컬 검증 스크립트.
// 사용: node scripts/verify.mjs
// dev 서버(:3000)가 떠 있다고 가정.

const BASE = process.env.BASE ?? "http://localhost:3000";

const RED = "\x1b[31m", GREEN = "\x1b[32m", YEL = "\x1b[33m", DIM = "\x1b[2m", RST = "\x1b[0m";
const ok = (s) => console.log(`${GREEN}✓${RST} ${s}`);
const warn = (s) => console.log(`${YEL}⚠${RST} ${s}`);
const fail = (s) => console.log(`${RED}✗${RST} ${s}`);
const info = (s) => console.log(`${DIM}${s}${RST}`);

async function main() {
  console.log(`\n=== TripForAll 검증 (${BASE}) ===\n`);

  // 1) Diag
  let diag;
  try {
    const r = await fetch(`${BASE}/api/diag`);
    diag = await r.json();
  } catch (e) {
    fail(`서버 미응답. 'pnpm dev' 먼저 실행했는지 확인. (${e.message})`);
    process.exit(1);
  }

  const { env, llm, tourApi } = diag;

  // TourAPI
  if (env.TOUR_API_KEY !== "set") {
    fail("TOUR_API_KEY 미설정 → .env.local에 추가.");
  } else if (env.USE_MOCK_TOUR_API === "true") {
    warn("USE_MOCK_TOUR_API=true (mock 데이터). 실 API 호출은 안 됨.");
  } else if (tourApi.attempts.some((a) => a.status === 200)) {
    const ok200 = tourApi.attempts.find((a) => a.status === 200);
    ok(`TourAPI 실 응답 성공 (${ok200.service}/${ok200.op})`);
  } else {
    fail("TourAPI 모든 variant 실패. status / bodyHead 확인:");
    tourApi.attempts.forEach((a) =>
      info(`  ${a.service}/${a.op}: ${a.status} — ${a.bodyHead.slice(0, 120)}`)
    );
  }

  // LLM
  if (!llm?.provider) {
    warn("LLM 키 없음 → 결정론적 fallback으로 동작 (UI는 정상이나 내러티브 단순).");
  } else {
    ok(`LLM 활성: ${llm.provider} / ${llm.model}`);
  }

  console.log();

  // 2) Plan generation
  console.log("=== 데모 시나리오 plan 생성 ===");
  const body = {
    city: "seoul",
    durationHours: 4,
    companions: [
      { id: "1", nickname: "할머니", age: 78, mobility: "wheelchair_manual",
        sensoryNeeds: [], notes: "고관절 수술 후 회복 중", staminaPercent: 70 },
      { id: "2", nickname: "어머니", age: 52, mobility: "pregnant",
        sensoryNeeds: [], notes: "임신 7개월", staminaPercent: 80 },
      { id: "3", nickname: "손주", age: 5, mobility: "child",
        sensoryNeeds: [], staminaPercent: 100 }
    ]
  };
  const t0 = Date.now();
  const r = await fetch(`${BASE}/api/plan`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  if (!r.ok) {
    fail(`/api/plan ${r.status}`);
    info(await r.text());
    process.exit(1);
  }
  const plan = await r.json();
  ok(`plan 응답 ${dt}s`);
  info(`코스: ${plan.spots.map((s) => s.title).join(" → ")}`);
  info(`pace segments: ${plan.pace.segments.length}개`);
  info(`회복 점수: ${plan.wellness.overall}/100`);
  info(`multigen segments: ${plan.multiGen.segments.length}개`);

  // Heuristic: detect if LLM was actually used vs fallback
  console.log();
  console.log("=== LLM 출력 샘플 (narrative 첫 300자) ===");
  console.log(plan.multiGen.narrative.slice(0, 300));
  console.log();

  // Heuristic: fallback narrative는 마지막에 안정적인 시그니처 문장을 끼움.
  // (lib/fallback.ts의 FALLBACK_SIGNATURE 참고)
  const FALLBACK_SIGNATURE = "가장 천천히 걷는 사람의 속도가 오늘 우리 모두의 속도였습니다.";
  const looksLikeFallback = plan.multiGen.narrative.includes(FALLBACK_SIGNATURE);
  if (looksLikeFallback) {
    warn("narrative가 fallback 시그니처 포함. LLM 호출 실패 또는 키 미설정 가능.");
    info("  → /api/diag의 llm.provider가 표시되는지, OPENAI_API_KEY가 유효한지 확인.");
  } else {
    ok("narrative가 LLM 생성으로 보임 (fallback 시그니처 없음).");
  }

  const reasonsLLM = plan.wellness.reasons[0] !== "휴식 가능한 화장실·벤치가 코스 곳곳에 분포되어 있어요.";
  if (reasonsLLM) ok("회복 점수 reasons도 LLM 생성으로 보임.");
  else warn("회복 점수 reasons가 fallback 문구. LLM 호출 실패 가능.");

  console.log();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
