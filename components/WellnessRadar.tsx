import type { WellnessScore } from "@/types";

const AXIS_LABELS: Record<keyof WellnessScore["axes"], string> = {
  safety: "안전·도움",
  rest: "휴식",
  nature: "자연",
  crowd: "한산함",
  weather: "날씨 대안"
};

export function WellnessRadar({ score }: { score: WellnessScore }) {
  // 간단한 SVG 펜타곤 레이더
  const axes = Object.keys(score.axes) as Array<keyof WellnessScore["axes"]>;
  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 90;
  const angle = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / axes.length;

  const points = axes
    .map((ax, i) => {
      const v = score.axes[ax] / 100;
      const r = radius * v;
      return `${cx + r * Math.cos(angle(i))},${cy + r * Math.sin(angle(i))}`;
    })
    .join(" ");

  const grid = [0.2, 0.4, 0.6, 0.8, 1].map((g, gi) => (
    <polygon
      key={gi}
      points={axes
        .map((_, i) => {
          const r = radius * g;
          return `${cx + r * Math.cos(angle(i))},${cy + r * Math.sin(angle(i))}`;
        })
        .join(" ")}
      fill="none"
      stroke="#0F162015"
      strokeWidth={1}
    />
  ));

  return (
    <div className="rounded-2xl border border-warm-100 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-ink">🛡 회복 점수</h2>
          <p className="mt-1 text-xs text-ink/60">여행이 끝났을 때 더 건강한 동선인지</p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-bold text-moss-700">{score.overall}</p>
          <p className="text-xs text-ink/55">/ 100</p>
        </div>
      </div>

      <div className="mt-4 grid items-center gap-6 sm:grid-cols-[240px_1fr]">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
          {grid}
          {axes.map((_, i) => (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={cx + radius * Math.cos(angle(i))}
              y2={cy + radius * Math.sin(angle(i))}
              stroke="#0F162015"
            />
          ))}
          <polygon points={points} fill="#6E9E6A55" stroke="#3F6A47" strokeWidth={2} />
          {axes.map((ax, i) => (
            <text
              key={ax}
              x={cx + (radius + 18) * Math.cos(angle(i))}
              y={cy + (radius + 18) * Math.sin(angle(i))}
              fontSize={11}
              textAnchor="middle"
              fill="#0F1620"
              dominantBaseline="middle"
            >
              {AXIS_LABELS[ax]}
            </text>
          ))}
        </svg>
        <ul className="space-y-2 text-sm leading-relaxed text-ink/80">
          {score.reasons.map((r, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-moss-500">✓</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
