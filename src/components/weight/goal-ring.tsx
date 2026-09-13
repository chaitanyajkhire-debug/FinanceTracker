import { BMI_BANDS, bmiBand, HEALTHY_BMI_MAX, HEALTHY_BMI_MIN } from "@/lib/health";

/**
 * Radial progress towards the goal weight, drawn as a gradient arc.
 * `progress` is 0–1 of the distance covered between start and goal.
 */
export function GoalRing({
  progress,
  label,
  caption,
  size = 176,
}: {
  progress: number;
  label: string;
  caption: string;
  size?: number;
}) {
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));
  const offset = circumference * (1 - clamped);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id="goal-ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="55%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
          <filter id="goal-ring-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(148,163,184,0.16)"
          strokeWidth={stroke}
        />
        <circle
          className="ring-draw"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#goal-ring-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          filter="url(#goal-ring-glow)"
          style={{ ["--ring-circumference" as string]: `${circumference}` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="tabular text-3xl font-semibold text-slate-50">{label}</span>
        <span className="mt-0.5 px-4 text-[11px] leading-tight text-slate-400">{caption}</span>
      </div>
    </div>
  );
}

/**
 * The WHO BMI scale as a segmented bar with a marker at the user's value.
 * Rendered from 15 to 40, where essentially all real readings fall.
 */
export function BmiScale({ value }: { value: number }) {
  const min = 15;
  const max = 40;
  const position = ((Math.max(min, Math.min(max, value)) - min) / (max - min)) * 100;
  const band = bmiBand(value);
  const segments = BMI_BANDS.filter((b) => b.min < max && b.max > min);

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500">Body Mass Index</div>
          <div className="tabular mt-1 text-3xl font-semibold text-slate-50">
            {value.toFixed(1)}
          </div>
        </div>
        <span
          className="rounded-full px-3 py-1 text-xs font-medium"
          style={{
            color: band.color,
            background: `${band.color}1f`,
            border: `1px solid ${band.color}59`,
          }}
        >
          {band.label}
        </span>
      </div>

      <div className="relative">
        <div className="flex h-2.5 overflow-hidden rounded-full">
          {segments.map((segment) => {
            const from = Math.max(min, segment.min);
            const to = Math.min(max, segment.max);
            return (
              <div
                key={segment.key}
                style={{ width: `${((to - from) / (max - min)) * 100}%`, background: segment.color }}
                className="h-full opacity-80"
              />
            );
          })}
        </div>

        <div
          className="absolute -top-1.5 h-5 w-1 -translate-x-1/2 rounded-full bg-white"
          style={{ left: `${position}%`, boxShadow: "0 0 12px 2px rgba(255,255,255,0.7)" }}
        />
        <div
          className="absolute -top-8 -translate-x-1/2 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-900"
          style={{ left: `${position}%` }}
        >
          you
        </div>

        <div className="mt-2 flex justify-between text-[10px] text-slate-500">
          <span>15</span>
          <span className="text-emerald-400">
            {HEALTHY_BMI_MIN}–{HEALTHY_BMI_MAX} healthy
          </span>
          <span>40+</span>
        </div>
      </div>
    </div>
  );
}
