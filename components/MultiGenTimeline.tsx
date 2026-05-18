import type { MultiGenResult } from "@/types";

const TYPE_STYLE: Record<string, { bg: string; label: string }> = {
  common: { bg: "bg-sky-50 text-sky-700", label: "함께" },
  split: { bg: "bg-warm-50 text-warm-700", label: "분기" },
  rejoin: { bg: "bg-moss-50 text-moss-700", label: "재합류" },
  meal: { bg: "bg-warm-100 text-warm-700", label: "식사" }
};

export function MultiGenTimeline({ result }: { result: MultiGenResult }) {
  return (
    <div className="rounded-2xl border border-warm-100 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-ink">👨‍👩‍👧 Multi-Generation Bridge</h2>
      <p className="mt-1 text-xs text-ink/60">
        모두 함께 갈 수 있는 동선 + 짧은 분기 + 세대 연결 미션
      </p>

      <ol className="mt-5 space-y-3">
        {result.segments.map((s, i) => {
          const style = TYPE_STYLE[s.type] ?? TYPE_STYLE.common;
          return (
            <li key={i} className="rounded-xl border border-ink/5 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-ink/55">{s.time}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.bg}`}>
                  {style.label}
                </span>
                <span className="font-medium">{s.title}</span>
                <span className="ml-auto text-xs text-ink/55">{s.durationMin}분</span>
              </div>
              {s.branches && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {s.branches.map((b, bi) => (
                    <div key={bi} className="rounded-lg bg-warm-50/60 px-3 py-2 text-sm">
                      <p className="text-xs font-semibold text-warm-700">
                        {b.members.join(" · ")}
                      </p>
                      <p className="mt-1">{b.activity}</p>
                      {b.location && (
                        <p className="mt-0.5 text-xs text-ink/55">📍 {b.location}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {s.bonding && (
                <div className="mt-3 rounded-lg bg-moss-50 px-3 py-2 text-sm">
                  <p className="text-xs font-semibold text-moss-700">💛 세대 연결 미션</p>
                  <p className="mt-1 text-ink/80">{s.bonding}</p>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <details className="mt-6 rounded-xl bg-warm-50/60 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-warm-700">
          📖 리허설 — 미리 다녀온 사람의 일기
        </summary>
        <div className="mt-3 space-y-2 whitespace-pre-wrap text-sm leading-relaxed text-ink/85">
          {result.narrative}
        </div>
      </details>
    </div>
  );
}
