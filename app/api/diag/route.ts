import { NextResponse } from "next/server";
import { diagnoseTourApi } from "@/lib/tour-api";
import { hasClaudeKey } from "@/lib/claude";

export const dynamic = "force-dynamic";

export async function GET() {
  const tour = await diagnoseTourApi();
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    env: {
      USE_MOCK_TOUR_API: process.env.USE_MOCK_TOUR_API ?? "(unset)",
      TOUR_API_KEY: process.env.TOUR_API_KEY ? "set" : "not set",
      ANTHROPIC_API_KEY: hasClaudeKey() ? "set" : "not set"
    },
    tourApi: tour,
    hint:
      tour.attempts.length === 0
        ? "Mock mode 또는 키 없음. .env.local에서 USE_MOCK_TOUR_API=false 및 TOUR_API_KEY 확인."
        : tour.attempts.some((a) => a.status === 200)
          ? "200 OK 응답 있음. 실 API 정상."
          : "모든 variant 실패. status / bodyHead 확인 (키 등록 직후 활성화까지 1~2시간 걸릴 수 있음)."
  });
}
