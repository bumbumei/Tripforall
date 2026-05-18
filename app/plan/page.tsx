"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CityCode, CompanionProfile, MobilityType } from "@/types";

const MOBILITY_OPTIONS: Array<{ value: MobilityType; label: string }> = [
  { value: "general", label: "일반" },
  { value: "wheelchair_manual", label: "수동 휠체어" },
  { value: "wheelchair_powered", label: "전동 휠체어" },
  { value: "walking_aid", label: "지팡이/보행기" },
  { value: "low_stamina", label: "장시간 보행 어려움" },
  { value: "pregnant", label: "임산부" },
  { value: "stroller", label: "유아차 동반" },
  { value: "child", label: "어린이" }
];

const CITY_OPTIONS: Array<{ value: CityCode; label: string }> = [
  { value: "seoul", label: "서울" },
  { value: "jeju", label: "제주" },
  { value: "busan", label: "부산" }
];

const DEMO_HERO: CompanionProfile[] = [
  {
    id: "1",
    nickname: "할머니",
    age: 78,
    mobility: "wheelchair_manual",
    sensoryNeeds: [],
    notes: "고관절 수술 후 회복 중",
    staminaPercent: 70
  },
  {
    id: "2",
    nickname: "어머니",
    age: 52,
    mobility: "pregnant",
    sensoryNeeds: [],
    notes: "임신 7개월",
    staminaPercent: 80
  },
  {
    id: "3",
    nickname: "손주",
    age: 5,
    mobility: "child",
    sensoryNeeds: [],
    staminaPercent: 100
  }
];

export default function PlanPage() {
  const router = useRouter();
  const [city, setCity] = useState<CityCode>("seoul");
  const [duration, setDuration] = useState(4);
  const [companions, setCompanions] = useState<CompanionProfile[]>(DEMO_HERO);
  const [submitting, setSubmitting] = useState(false);

  function update(i: number, patch: Partial<CompanionProfile>) {
    setCompanions((arr) => arr.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }
  function add() {
    setCompanions((arr) => [
      ...arr,
      {
        id: String(Date.now()),
        nickname: "동행자",
        age: 30,
        mobility: "general",
        sensoryNeeds: [],
        staminaPercent: 90
      }
    ]);
  }
  function remove(i: number) {
    setCompanions((arr) => arr.filter((_, idx) => idx !== i));
  }

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ city, durationHours: duration, companions })
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`오류: ${err.detail ?? err.error}`);
        return;
      }
      const data = await res.json();
      sessionStorage.setItem("trip-plan", JSON.stringify(data));
      router.push("/result");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <a href="/" className="text-sm text-ink/60 hover:text-ink">
        ← 처음으로
      </a>
      <h1 className="font-display mt-4 text-3xl font-bold text-ink">동행자 정보를 알려주세요</h1>
      <p className="mt-2 text-sm text-ink/65">
        가장 느린 동행자를 기준으로 모두가 즐거운 일정을 만들어 드립니다.
      </p>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <Field label="도시">
          <select
            value={city}
            onChange={(e) => setCity(e.target.value as CityCode)}
            className="h-11 w-full rounded-xl border border-ink/15 bg-white px-3"
          >
            {CITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label={`여행 시간 (${duration}시간)`}>
          <input
            type="range"
            min={2}
            max={8}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full"
          />
        </Field>
      </section>

      <section className="mt-8 space-y-4">
        {companions.map((c, i) => (
          <div key={c.id} className="rounded-2xl border border-warm-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <input
                value={c.nickname}
                onChange={(e) => update(i, { nickname: e.target.value })}
                className="w-40 border-b border-ink/10 bg-transparent text-lg font-semibold focus:border-warm-600 focus:outline-none"
              />
              {companions.length > 1 && (
                <button onClick={() => remove(i)} className="text-xs text-ink/50 hover:text-warm-600">
                  삭제
                </button>
              )}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Field label="나이">
                <input
                  type="number"
                  value={c.age}
                  onChange={(e) => update(i, { age: Number(e.target.value) })}
                  className="h-10 w-full rounded-lg border border-ink/15 bg-white px-3"
                />
              </Field>
              <Field label="이동 조건">
                <select
                  value={c.mobility}
                  onChange={(e) => update(i, { mobility: e.target.value as MobilityType })}
                  className="h-10 w-full rounded-lg border border-ink/15 bg-white px-3"
                >
                  {MOBILITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={`시작 체력 ${c.staminaPercent}%`}>
                <input
                  type="range"
                  min={20}
                  max={100}
                  value={c.staminaPercent}
                  onChange={(e) => update(i, { staminaPercent: Number(e.target.value) })}
                  className="w-full"
                />
              </Field>
            </div>
            <Field label="메모 (선택)">
              <input
                value={c.notes ?? ""}
                onChange={(e) => update(i, { notes: e.target.value })}
                placeholder="예: 고관절 수술 후 회복 중"
                className="h-10 w-full rounded-lg border border-ink/15 bg-white px-3"
              />
            </Field>
          </div>
        ))}
        <button
          onClick={add}
          className="w-full rounded-xl border border-dashed border-warm-300 px-4 py-3 text-sm text-warm-700 hover:bg-warm-50"
        >
          + 동행자 추가
        </button>
      </section>

      <div className="mt-10 flex items-center justify-between">
        <p className="text-xs text-ink/50">
          데모: 할머니(휠체어) · 어머니(임신) · 손주(5세) 3세대
        </p>
        <button
          onClick={submit}
          disabled={submitting}
          className="h-12 rounded-full bg-warm-600 px-8 text-base font-semibold text-white shadow-sm transition hover:bg-warm-700 disabled:opacity-50"
        >
          {submitting ? "여정을 짜는 중…" : "여정 만들기 →"}
        </button>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink/65">{label}</span>
      {children}
    </label>
  );
}
