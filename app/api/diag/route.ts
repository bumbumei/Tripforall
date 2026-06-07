import { NextResponse } from "next/server";
import { diagnoseTourApi } from "@/lib/tour-api";
import { activeProvider } from "@/lib/llm";

export const dynamic = "force-dynamic";

export async function GET() {
  const tour = await diagnoseTourApi();
  const llm = activeProvider();
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    env: {
      USE_MOCK_TOUR_API: process.env.USE_MOCK_TOUR_API ?? "(unset)",
      TOUR_API_KEY: process.env.TOUR_API_KEY ? "set" : "not set",
      KCISA_API_KEY: process.env.KCISA_API_KEY ? "set" : "not set",
      ENNOIA_API_KEY: process.env.ENNOIA_API_KEY ? "set" : "not set",
      ENNOIA_PROJECT: process.env.ENNOIA_PROJECT ?? "(unset)",
      ENNOIA_PRESET_HASH: process.env.ENNOIA_PRESET_HASH
        ? `${process.env.ENNOIA_PRESET_HASH.slice(0, 12)}…`
        : "not set",
      ENNOIA_USER_ID: process.env.ENNOIA_USER_ID
        ? `${process.env.ENNOIA_USER_ID.slice(0, 8)}…`
        : "not set",
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ? "set" : "not set",
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "set" : "not set",
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? "set" : "not set"
    },
    llm: llm ?? { provider: null, model: null, hint: "no LLM key — using deterministic fallback" },
    tourApi: tour,
    hint:
      tour.attempts.length === 0
        ? "Mock mode 또는 키 없음. .env.local에서 USE_MOCK_TOUR_API=false 및 TOUR_API_KEY 확인."
        : tour.attempts.some((a) => a.status === 200)
          ? "200 OK 응답 있음. 실 API 정상."
          : "모든 variant 실패. status / bodyHead 확인 (키 등록 직후 활성화까지 1~2시간 걸릴 수 있음)."
  });
}
