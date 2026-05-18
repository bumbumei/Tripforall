"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { TripPlanResponse } from "@/types";
import { PaceGauge } from "@/components/PaceGauge";
import { WellnessRadar } from "@/components/WellnessRadar";
import { MultiGenTimeline } from "@/components/MultiGenTimeline";

export default function ResultPage() {
  const [data, setData] = useState<TripPlanResponse | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("trip-plan");
    if (raw) setData(JSON.parse(raw));
  }, []);

  if (!data) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-ink/65">여정 데이터가 없습니다.</p>
        <Link href="/plan" className="mt-4 inline-block text-warm-700 underline">
          다시 설계하기
        </Link>
      </main>
    );
  }

  const cityName = { seoul: "서울", jeju: "제주", busan: "부산" }[data.request.city];

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between">
        <Link href="/plan" className="text-sm text-ink/60 hover:text-ink">
          ← 동행자 수정
        </Link>
        <Link href="/" className="text-sm text-ink/60 hover:text-ink">
          처음으로
        </Link>
      </div>

      <header className="mt-6">
        <p className="text-sm font-semibold tracking-widest text-warm-600">YOUR TRIP</p>
        <h1 className="font-display mt-2 text-3xl font-bold text-ink">
          {cityName} · {data.request.companions.map((c) => c.nickname).join(" · ")}
        </h1>
        <p className="mt-2 text-sm text-ink/65">
          {data.spots.length}개 장소 · {data.request.durationHours}시간 · 가장 느린 페이스 기준
        </p>
      </header>

      <section className="mt-8 grid gap-5">
        <SpotsStrip data={data} />
        <PaceGauge result={data.pace} />
        <WellnessRadar score={data.wellness} />
        <MultiGenTimeline result={data.multiGen} />
      </section>

      <footer className="mt-12 rounded-2xl bg-warm-50 px-6 py-5 text-xs leading-relaxed text-ink/60">
        Data: 한국관광공사 TourAPI 4.0 (areaBasedList2 · detailWithTour2) · 무장애 25항목
        <br />
        AI: Anthropic Claude · 응답은 추정치를 포함하며 현장 상황은 다를 수 있습니다.
      </footer>
    </main>
  );
}

function SpotsStrip({ data }: { data: TripPlanResponse }) {
  return (
    <div className="flex gap-2 overflow-x-auto rounded-2xl border border-warm-100 bg-white p-4">
      {data.spots.map((s, i) => (
        <div
          key={s.contentId}
          className="min-w-[180px] flex-1 rounded-xl bg-warm-50/60 px-4 py-3"
        >
          <p className="text-xs text-ink/55">{i + 1}번 지점</p>
          <p className="mt-1 text-sm font-semibold">{s.title}</p>
          <p className="mt-0.5 text-xs text-ink/55 line-clamp-1">{s.addr1}</p>
        </div>
      ))}
    </div>
  );
}
