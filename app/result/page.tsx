"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import type { TourSpot, TripPlanResponse } from "@/types";
import { PaceGauge } from "@/components/PaceGauge";
import { WellnessRadar } from "@/components/WellnessRadar";
import { MultiGenTimeline } from "@/components/MultiGenTimeline";

export default function ResultPage() {
  const [data, setData] = useState<TripPlanResponse | null>(null);
  const [recomposing, setRecomposing] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("trip-plan");
    if (raw) setData(JSON.parse(raw));
  }, []);

  // 사용자가 추천 풀에서 선택한 contentId들로 코스 재구성.
  async function recompose(selectedIds: string[]) {
    if (!data) return;
    setRecomposing(true);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...data.request,
          forceSpotIds: selectedIds,
          shuffleSeed: undefined // 강제 선택은 shuffle 무시
        })
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`재구성 실패: ${err.detail ?? err.error}`);
        return;
      }
      const next = await res.json();
      sessionStorage.setItem("trip-plan", JSON.stringify(next));
      setData(next);
    } finally {
      setRecomposing(false);
    }
  }

  // 같은 조건에서 다른 anchor로 새 조합 추천.
  async function shuffleCourse() {
    if (!data) return;
    setRecomposing(true);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...data.request,
          forceSpotIds: undefined, // 강제 선택 해제
          shuffleSeed: Date.now() // 매번 다른 anchor
        })
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`다른 조합 추천 실패: ${err.detail ?? err.error}`);
        return;
      }
      const next = await res.json();
      sessionStorage.setItem("trip-plan", JSON.stringify(next));
      setData(next);
    } finally {
      setRecomposing(false);
    }
  }

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

  const cityName = { seoul: "서울", jeju: "제주", busan: "부산", gyeonggi: "경기" }[data.request.city];

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

      <header className="mt-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-widest text-warm-600">YOUR TRIP</p>
          <h1 className="font-display mt-2 text-3xl font-bold text-ink">
            {cityName}
            {data.sigunguLabel ? ` ${data.sigunguLabel}` : ""} ·{" "}
            {data.request.companions.map((c) => c.nickname).join(" · ")}
          </h1>
          <p className="mt-2 text-sm text-ink/65">
            {data.themeLabel && (
              <span className="mr-2 inline-flex items-center rounded-full bg-warm-100 px-2.5 py-0.5 text-xs font-medium text-warm-700">
                테마 · {data.themeLabel}
              </span>
            )}
            {data.spots.length}개 장소 · {data.request.durationHours}시간 · 가장 느린 페이스 기준
          </p>
        </div>
        <button
          type="button"
          onClick={shuffleCourse}
          disabled={recomposing}
          className="mt-1 shrink-0 rounded-full border border-warm-300 bg-white px-4 py-2 text-sm font-medium text-warm-700 shadow-sm transition hover:border-warm-500 hover:bg-warm-50 disabled:opacity-50"
          title="같은 조건에서 다른 시작점·다른 조합으로 새로 짭니다"
        >
          {recomposing ? "다른 조합 짜는 중…" : "🎲 다른 조합 보기"}
        </button>
      </header>

      <section className="mt-8 grid gap-5">
        {data.expansion?.expandedToCity && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 px-4 py-3 text-sm text-amber-800">
            ℹ {data.expansion.reason}
          </div>
        )}
        {data.weather && <WeatherCard weather={data.weather} />}
        {data.skippedSpots && data.skippedSpots.length > 0 && (
          <SkippedSpotsCard items={data.skippedSpots} />
        )}
        {data.recommendedSpots && data.recommendedSpots.length > 0 && (
          <RecommendedPool
            recommended={data.recommendedSpots}
            picked={data.spots}
            themeLabel={data.themeLabel}
            onRecompose={recompose}
            disabled={recomposing}
          />
        )}
        <SpotsStrip data={data} />
        {data.nearbyToiletsByContent &&
          Object.keys(data.nearbyToiletsByContent).length > 0 && (
            <NearbyToiletsCard
              spots={data.spots}
              byContent={data.nearbyToiletsByContent}
            />
          )}
        {data.emergencyRooms && data.emergencyRooms.length > 0 && (
          <EmergencyCard rooms={data.emergencyRooms} />
        )}
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
  const totalKm = (data.legDistancesKm ?? []).reduce((a, b) => a + b, 0);
  return (
    <div className="rounded-2xl border border-warm-100 bg-white p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-xs font-semibold tracking-wide text-ink/60">최종 동선</p>
        {data.legDistancesKm && data.legDistancesKm.length > 0 && (
          <p className="text-xs text-ink/50">
            총 이동 약 {totalKm.toFixed(1)}km (직선거리)
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-stretch gap-2">
        {data.spots.map((s, i) => {
          const leg = i > 0 ? data.legDistancesKm?.[i - 1] : undefined;
          const info = data.spotInfoByContent?.[s.contentId];
          const cert = data.certificationsByContent?.[s.contentId];
          const extras = data.detailInfoByContent?.[s.contentId];
          const crowd = data.crowdByContent?.[s.contentId];
          // 카드 상단 사진: detailImage 추가 이미지 → firstImage → 없음
          const photo = data.imagesByContent?.[s.contentId]?.[0] ?? s.firstImage;
          return (
            <Fragment key={s.contentId}>
              {leg !== undefined && <LegArrow km={leg} />}
              <div className="flex min-w-[200px] flex-1 flex-col overflow-hidden rounded-xl bg-warm-50/60">
                {photo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo.replace(/^http:\/\//, "https://")}
                    alt={s.title}
                    loading="lazy"
                    className="h-28 w-full object-cover"
                  />
                )}
                <div className="px-4 py-3">
                <p className="text-xs text-ink/55">{i + 1}번 지점</p>
                <p className="mt-1 text-sm font-semibold">
                  {s.title}
                  {cert?.excellent && (
                    <span
                      className="ml-1.5 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800"
                      title={`행정안전부 모범음식점 지정 (${cert.excellent.designatedYmd})`}
                    >
                      🏅 모범
                    </span>
                  )}
                  {cert?.tourist && (
                    <span
                      className="ml-1 inline-flex items-center rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-800"
                      title="행정안전부 관광식당 지정"
                    >
                      🌐 관광
                    </span>
                  )}
                  {cert?.petFriendly && (
                    <span
                      className="ml-1 inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800"
                      title="한국관광공사 반려동물 동반여행 등록 장소"
                    >
                      🐾 반려동물
                    </span>
                  )}
                  {crowd && (
                    <span
                      className={
                        "ml-1 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium " +
                        (crowd.level === "low"
                          ? "bg-emerald-100 text-emerald-800"
                          : crowd.level === "medium"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800")
                      }
                      title={`${crowd.date} 예측 집중률 ${crowd.ratePct}% (한국관광공사 빅데이터)`}
                    >
                      {crowd.level === "low" ? "🟢 한산" : crowd.level === "medium" ? "🟡 보통" : "🔴 혼잡"}{" "}
                      {crowd.ratePct}%
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-ink/55 line-clamp-1">{s.addr1}</p>
                {info?.overview && (
                  <p className="mt-1.5 text-xs text-ink/70 line-clamp-3">{info.overview}</p>
                )}
                {(info?.homepage || info?.tel) && (
                  <p className="mt-1.5 flex flex-wrap gap-x-3 text-xs text-warm-700">
                    {info.homepage && (
                      <a
                        href={info.homepage}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline decoration-warm-300 hover:decoration-warm-600"
                      >
                        🌐 {info.homepageText ?? "홈페이지"}
                      </a>
                    )}
                    {info.tel && <span className="text-ink/60">📞 {info.tel}</span>}
                  </p>
                )}
                {extras && extras.length > 0 && (
                  <ul className="mt-2 space-y-0.5 border-t border-warm-200/60 pt-2">
                    {extras.slice(0, 3).map((e, idx) => (
                      <li key={idx} className="text-[11px] leading-snug text-ink/70">
                        <span className="font-medium text-ink/80">{e.name}</span>{" "}
                        <span className="text-ink/60">{e.text.slice(0, 60)}{e.text.length > 60 ? "…" : ""}</span>
                      </li>
                    ))}
                  </ul>
                )}
                </div>
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

// 도보(≤1km) / 짧은 이동(≤3km) / 차량 권장(>3km) 시각 구분.
function LegArrow({ km }: { km: number }) {
  const mode =
    km <= 1
      ? { label: "도보", min: Math.max(3, Math.round((km * 1000) / 67)), tone: "text-emerald-700 bg-emerald-50" }
      : km <= 3
        ? { label: "버스/지하철", min: null, tone: "text-warm-700 bg-warm-50" }
        : { label: "택시 권장", min: null, tone: "text-rose-700 bg-rose-50/70" };
  return (
    <div className="flex w-20 flex-col items-center justify-center px-1">
      <span className="text-lg text-ink/40">→</span>
      <span className="mt-0.5 text-xs font-semibold text-ink">{km.toFixed(1)}km</span>
      <span className={`mt-1 rounded-full px-2 py-0.5 text-[10px] ${mode.tone}`}>
        {mode.label}
        {mode.min !== null ? ` ${mode.min}분` : ""}
      </span>
    </div>
  );
}

function SkippedSpotsCard({
  items
}: {
  items: NonNullable<TripPlanResponse["skippedSpots"]>;
}) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
      <p className="text-xs font-semibold tracking-wide text-amber-700">
        ⚠ 휴무·운영시간으로 빠진 추천 장소
      </p>
      <ul className="mt-2 space-y-2">
        {items.map((s, i) => (
          <li key={i} className="rounded-xl bg-white/70 p-3">
            <p className="text-sm font-semibold text-ink">{s.title}</p>
            <p className="mt-0.5 text-xs text-ink/65">사유 · {s.reason}</p>
            <p className="mt-1 text-xs text-amber-800">{s.suggestion}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WeatherCard({ weather }: { weather: NonNullable<TripPlanResponse["weather"]> }) {
  const icon = {
    clear: "☀️",
    cloudy: "☁️",
    rain: "🌧",
    snow: "❄️",
    hot: "🥵",
    cold: "🥶"
  }[weather.condition];
  const tone = weather.preferIndoor
    ? "border-sky-200 bg-sky-50/60"
    : "border-emerald-200 bg-emerald-50/60";
  return (
    <div className={`rounded-2xl border ${tone} p-4`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-ink">
            {weather.tempC}℃
            {weather.feelsLikeC !== undefined && weather.feelsLikeC !== weather.tempC
              ? ` (체감 ${weather.feelsLikeC}℃)`
              : ""}
            <span className="ml-2 text-xs font-normal text-ink/60">
              · 강수확률 {weather.precipProbPct}%
              {weather.windKph ? ` · 바람 ${weather.windKph}km/h` : ""}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-ink/70">{weather.summary}</p>
        </div>
        <span className="text-xs text-ink/45">Open-Meteo</span>
      </div>
    </div>
  );
}

function EmergencyCard({
  rooms
}: {
  rooms: NonNullable<TripPlanResponse["emergencyRooms"]>;
}) {
  return (
    <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-semibold tracking-wide text-rose-700">
          🚑 코스 인근 응급의료기관
        </p>
        <p className="text-xs text-ink/45">국립중앙의료원 · 만약을 위한 안전망</p>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {rooms.map((r, i) => (
          <div key={i} className="rounded-xl bg-white/70 p-3">
            <p className="text-sm font-semibold text-ink">
              {r.name}
              {r.divName && (
                <span className="ml-1.5 text-xs font-normal text-ink/55">
                  ({r.divName})
                </span>
              )}
            </p>
            <p className="mt-0.5 text-xs text-ink/60">{r.addr}</p>
            <p className="mt-1 text-xs text-ink/70">
              약 {r.distanceKm}km
              {r.hours ? ` · 운영 ${r.hours}` : ""}
              {r.tel ? ` · ${r.tel}` : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function NearbyToiletsCard({
  spots,
  byContent
}: {
  spots: TourSpot[];
  byContent: NonNullable<TripPlanResponse["nearbyToiletsByContent"]>;
}) {
  const spotsWithToilets = spots.filter((s) => byContent[s.contentId]?.length);
  if (spotsWithToilets.length === 0) return null;
  return (
    <div className="rounded-2xl border border-warm-100 bg-white p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-semibold tracking-wide text-ink/60">
          코스 인근 장애인 화장실
        </p>
        <p className="text-xs text-ink/45">반경 500m · 행정안전부 표준데이터셋</p>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {spotsWithToilets.map((s) => {
          const toilets = byContent[s.contentId];
          return (
            <div key={s.contentId} className="rounded-xl bg-warm-50/50 p-3">
              <p className="text-sm font-semibold text-ink">{s.title}</p>
              <ul className="mt-1.5 space-y-1.5">
                {toilets.map((t, i) => (
                  <li key={i} className="text-xs text-ink/70">
                    <span className="font-medium">{t.name}</span>
                    <span className="text-ink/50">
                      {" "}
                      · 도보 {t.walkMin}분 · 변기 {t.accessibleCount}개
                      {t.hasEmergencyBell ? " · 비상벨" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RecommendedPool({
  recommended,
  picked,
  themeLabel,
  onRecompose,
  disabled
}: {
  recommended: TourSpot[];
  picked: TourSpot[];
  themeLabel?: string;
  onRecompose: (selectedIds: string[]) => void | Promise<void>;
  disabled: boolean;
}) {
  const pickedIds = new Set(picked.map((s) => s.contentId));
  // 사용자가 클릭한 선택 상태. 기본값은 현재 코스에 들어간 풀 항목들.
  const [selected, setSelected] = useState<Set<string>>(() => new Set(pickedIds));

  // 코스(상위 데이터)가 바뀌면 선택도 동기화
  useEffect(() => {
    setSelected(new Set(picked.map((s) => s.contentId)));
  }, [picked]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // 현재 선택이 현재 코스와 다르면 "다시 짜기" 활성화
  const currentSet = new Set(pickedIds);
  const dirty =
    selected.size !== currentSet.size ||
    [...selected].some((id) => !currentSet.has(id));

  return (
    <div className="rounded-2xl border border-warm-100 bg-white p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-semibold tracking-wide text-ink/60">
          {themeLabel ? `"${themeLabel}" 추천 장소 풀` : "추천 장소 풀"}
        </p>
        <p className="text-xs text-ink/45">
          {recommended.length}곳 중 코스로 {picked.length}곳 선정 · {selected.size}곳 선택
        </p>
      </div>
      <p className="mt-1 text-xs text-ink/55">
        칩을 눌러 마음에 드는 장소만 고른 뒤 <strong>다시 짜기</strong>를 누르세요.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {recommended.map((s) => {
          const isOn = selected.has(s.contentId);
          return (
            <button
              key={s.contentId}
              type="button"
              onClick={() => toggle(s.contentId)}
              disabled={disabled}
              className={
                isOn
                  ? "rounded-full bg-warm-600 px-3 py-1 text-xs font-medium text-white shadow-sm hover:bg-warm-700 disabled:opacity-50"
                  : "rounded-full border border-warm-200 bg-warm-50/40 px-3 py-1 text-xs text-ink/65 hover:border-warm-400 disabled:opacity-50"
              }
            >
              {isOn ? "✓ " : "+ "}
              {s.title}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-end gap-3">
        {dirty && (
          <button
            type="button"
            onClick={() => setSelected(new Set(picked.map((s) => s.contentId)))}
            disabled={disabled}
            className="text-xs text-ink/55 hover:text-ink"
          >
            되돌리기
          </button>
        )}
        <button
          type="button"
          onClick={() => onRecompose([...selected])}
          disabled={disabled || !dirty || selected.size === 0}
          className="rounded-full bg-warm-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-warm-700 disabled:bg-warm-300"
        >
          {disabled ? "다시 짜는 중…" : "선택한 장소로 다시 짜기 →"}
        </button>
      </div>
    </div>
  );
}
