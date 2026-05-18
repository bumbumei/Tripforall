import type { PaceResult } from "@/types";

export function PaceGauge({ result }: { result: PaceResult }) {
  const nicknames = Object.keys(result.summary.lowestStamina);
  return (
    <div className="rounded-2xl border border-warm-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-ink">🔋 Slow Pace Match</h2>
          <p className="mt-1 text-xs text-ink/60">
            총 {Math.round(result.summary.totalDurationMin / 60 * 10) / 10}시간 · 가장 느린 페이스 기준
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            result.summary.safe ? "bg-moss-50 text-moss-700" : "bg-warm-50 text-warm-700"
          }`}
        >
          {result.summary.safe ? "안전 페이스" : "체력 부담 주의"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {nicknames.map((n) => {
          const lowest = result.summary.lowestStamina[n];
          return (
            <div key={n} className="rounded-xl bg-warm-50/60 px-4 py-3">
              <p className="text-xs text-ink/65">{n} · 최저 잔여 체력</p>
              <p className="mt-1 text-2xl font-bold text-warm-700">{lowest}%</p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white">
                <div
                  className={`h-full ${lowest >= 50 ? "bg-moss-500" : lowest >= 30 ? "bg-warm-500" : "bg-warm-700"}`}
                  style={{ width: `${lowest}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <ol className="mt-6 space-y-2">
        {result.segments.map((s, i) => (
          <li
            key={i}
            className="flex items-start gap-3 rounded-lg border border-ink/5 px-3 py-2 text-sm"
          >
            <span className="w-12 shrink-0 font-mono text-xs text-ink/55">{s.time}</span>
            <span className="w-12 shrink-0 text-xs font-semibold text-warm-700">{s.action}</span>
            <span className="flex-1">
              <span className="font-medium">{s.place}</span>
              <span className="ml-2 text-xs text-ink/55">{s.durationMin}분</span>
              {s.warnings && s.warnings.length > 0 && (
                <span className="mt-1 block text-xs text-warm-700">⚠ {s.warnings.join(" / ")}</span>
              )}
            </span>
            <span className="shrink-0 font-mono text-xs">
              {s.staminaCost > 0 ? `+${s.staminaCost}` : s.staminaCost}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
