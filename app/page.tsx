import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm font-semibold tracking-widest text-warm-600">TRIP FOR ALL · 2026</p>
      <h1 className="font-display mt-3 text-5xl font-bold leading-tight text-ink">
        가장 느린 사람을 기준으로,
        <br />
        모두가 즐거운 여행.
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-ink/75">
        한국관광공사 무장애 데이터를 AI가 다정하게 해석합니다.
        <br />
        체력 시뮬레이션, 회복 점수, 세대 간 동행까지 — 한 번의 입력으로.
      </p>

      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        <Card emoji="🔋" title="Slow Pace Match" body="가장 느린 동행자 기준의 체력 시뮬레이션" />
        <Card emoji="🛡" title="회복 점수" body="여행이 끝나도 더 건강한 동선인지" />
        <Card emoji="👨‍👩‍👧" title="Multi-Gen Bridge" body="3세대를 잇는 공통·분기 동선" />
      </div>

      <div className="mt-12 flex items-center gap-3">
        <Link
          href="/plan"
          className="inline-flex h-12 items-center justify-center rounded-full bg-warm-600 px-8 text-base font-semibold text-white shadow-sm transition hover:bg-warm-700"
        >
          여행 설계 시작하기 →
        </Link>
        <span className="text-sm text-ink/55">서울 · 제주 · 부산</span>
      </div>

      <p className="mt-16 text-xs leading-relaxed text-ink/50">
        Data: 한국관광공사 TourAPI 4.0 (무장애 여행 정보·국문 관광정보·관광 빅데이터)
        <br />
        AI: Ennoia 플랫폼 · 2026 관광 트렌드 D.U.A.L.I.S.M. 반영
      </p>
    </main>
  );
}

function Card({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-warm-100 bg-white p-5 shadow-sm">
      <div className="text-3xl">{emoji}</div>
      <h3 className="mt-3 text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-ink/65">{body}</p>
    </div>
  );
}
