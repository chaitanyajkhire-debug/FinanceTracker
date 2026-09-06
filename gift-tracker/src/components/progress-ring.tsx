const SIZE = 128;
const STROKE = 10;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ProgressRing({ value, goal }: { value: number; goal: number }) {
  const ratio = goal > 0 ? Math.min(value / goal, 1) : 0;

  return (
    <div
      className="relative shrink-0"
      style={{ width: SIZE, height: SIZE }}
      role="img"
      aria-label={`${value} of ${goal} gifts bought`}
    >
      <svg width={SIZE} height={SIZE} className="-rotate-90">
        <defs>
          <linearGradient id="ring-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fb7185" />
            <stop offset="55%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="url(#ring-gradient)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl leading-none text-white">
          {value}
        </span>
        <span className="mt-1 text-xs tracking-wide text-white/50">
          of {goal}
        </span>
      </div>
    </div>
  );
}
