"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CityCode, CompanionProfile, CuisinePref, MobilityType, TravelTheme } from "@/types";
import { ALL_THEMES } from "@/lib/themes";
import { SIGUNGU_BY_CITY } from "@/lib/sigungu";

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
  { value: "gyeonggi", label: "경기" },
  { value: "busan", label: "부산" },
  { value: "jeju", label: "제주" }
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
  const today = new Date().toISOString().slice(0, 10);
  const [city, setCity] = useState<CityCode>("seoul");
  const [sigungu, setSigungu] = useState<string | "">(""); // "" = 도시 전체
  const [duration, setDuration] = useState(4);
  const [theme, setTheme] = useState<TravelTheme | undefined>("history");
  const [cuisine, setCuisine] = useState<CuisinePref>("any");
  const [date, setDate] = useState<string>(today);
  const [startTime, setStartTime] = useState<string>("10:00");
  const [companions, setCompanions] = useState<CompanionProfile[]>(DEMO_HERO);
  const [submitting, setSubmitting] = useState(false);

  // 직전 입력값 복원 — result에서 "← 동행자 수정"으로 돌아왔을 때 변경 사항이 사라지지 않도록.
  // 마운트 1회만 실행. 저장된 입력값이 있으면 기본값 위에 덮어씀.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("trip-request");
      if (!raw) return;
      const r = JSON.parse(raw);
      if (r.city) setCity(r.city);
      if (typeof r.sigungu === "string") setSigungu(r.sigungu);
      if (typeof r.durationHours === "number") setDuration(r.durationHours);
      if (r.theme !== undefined) setTheme(r.theme);
      if (r.cuisine) setCuisine(r.cuisine);
      if (r.date) setDate(r.date);
      if (r.startTime) setStartTime(r.startTime);
      if (Array.isArray(r.companions) && r.companions.length > 0) {
        setCompanions(r.companions);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const CUISINE_OPTIONS: Array<{ value: CuisinePref; label: string }> = [
    { value: "any", label: "안 가림" },
    { value: "korean", label: "한식" },
    { value: "chinese", label: "중식" },
    { value: "japanese", label: "일식" },
    { value: "western", label: "양식" },
    { value: "cafe", label: "카페·디저트" }
  ];

  // 도시 변경 시 시·군·구 선택 초기화 (도시 간 코드 의미가 다름)
  function changeCity(c: CityCode) {
    setCity(c);
    setSigungu("");
  }

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
      const requestBody = {
        city,
        sigungu: sigungu || undefined,
        durationHours: duration,
        theme,
        cuisine,
        date,
        startTime,
        companions
      };
      // 다음에 plan 페이지로 돌아왔을 때 복원할 수 있도록 입력값 저장.
      sessionStorage.setItem("trip-request", JSON.stringify(requestBody));
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(requestBody)
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

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <Field label="시·도">
          <select
            value={city}
            onChange={(e) => changeCity(e.target.value as CityCode)}
            className="h-11 w-full rounded-xl border border-ink/15 bg-white px-3"
          >
            {CITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="시·군·구">
          <select
            value={sigungu}
            onChange={(e) => setSigungu(e.target.value)}
            className="h-11 w-full rounded-xl border border-ink/15 bg-white px-3"
          >
            <option value="">전체</option>
            {SIGUNGU_BY_CITY[city].map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
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

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <Field label="여행 날짜">
          <input
            type="date"
            value={date}
            min={today}
            onChange={(e) => setDate(e.target.value)}
            className="h-11 w-full rounded-xl border border-ink/15 bg-white px-3"
          />
        </Field>
        <Field label="출발 시간">
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="h-11 w-full rounded-xl border border-ink/15 bg-white px-3"
          />
        </Field>
        <Field label="선호 음식">
          <select
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value as CuisinePref)}
            className="h-11 w-full rounded-xl border border-ink/15 bg-white px-3"
          >
            {CUISINE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      </section>

      <section className="mt-6">
        <p className="mb-2 text-xs font-medium text-ink/65">
          여행 테마 {theme ? "" : "(선택 안 함 — 전체 추천)"}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTheme(undefined)}
            className={chipClass(theme === undefined)}
          >
            전체
          </button>
          {ALL_THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              className={chipClass(theme === t.id)}
              title={t.tagline}
            >
              <span className="mr-1">{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>
        {theme && (
          <p className="mt-2 text-xs text-ink/55">
            {ALL_THEMES.find((t) => t.id === theme)?.tagline}
          </p>
        )}
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

function chipClass(active: boolean): string {
  return active
    ? "rounded-full border border-warm-600 bg-warm-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm"
    : "rounded-full border border-warm-200 bg-white px-4 py-1.5 text-sm text-ink/75 hover:border-warm-400 hover:bg-warm-50";
}
