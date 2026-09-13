"use client";

import { useMemo, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ChartPoint = {
  date: string;
  weight: number;
  trend: number;
};

const TOOLTIP_STYLE = {
  background: "rgba(2, 6, 23, 0.92)",
  border: "1px solid rgba(148, 163, 184, 0.25)",
  borderRadius: 12,
  color: "#e2e8f0",
  fontSize: 12,
  backdropFilter: "blur(8px)",
} as const;

const RANGES = [
  { key: "30", label: "30D", days: 30 },
  { key: "90", label: "90D", days: 90 },
  { key: "365", label: "1Y", days: 365 },
  { key: "all", label: "ALL", days: Infinity },
];

function shortDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function longDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Day-on-day weight with the smoothed trend line on top, the goal as a
 * reference line and the healthy-BMI band shaded behind it.
 */
export function ProgressChart({
  data,
  unit,
  goal,
  healthyMin,
  healthyMax,
}: {
  data: ChartPoint[];
  unit: string;
  goal?: number | null;
  healthyMin?: number | null;
  healthyMax?: number | null;
}) {
  const [range, setRange] = useState("90");

  const visible = useMemo(() => {
    const days = RANGES.find((r) => r.key === range)?.days ?? Infinity;
    if (!Number.isFinite(days) || data.length === 0) return data;
    const cutoff = new Date(`${data[data.length - 1].date}T00:00:00Z`);
    cutoff.setUTCDate(cutoff.getUTCDate() - days);
    const cutoffIso = cutoff.toISOString().slice(0, 10);
    return data.filter((point) => point.date >= cutoffIso);
  }, [data, range]);

  const domain = useMemo(() => {
    const values = visible.flatMap((point) => [point.weight, point.trend]);
    if (goal != null) values.push(goal);
    if (values.length === 0) return [0, 1] as [number, number];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = Math.max((max - min) * 0.18, 0.6);
    return [Math.floor((min - pad) * 10) / 10, Math.ceil((max + pad) * 10) / 10] as [number, number];
  }, [visible, goal]);

  if (data.length === 0) {
    return (
      <EmptyChart message="Log your first weight to start the chart." />
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-slate-200">Day-on-day progress</h2>
        <div className="flex gap-1 rounded-lg border border-slate-700/60 bg-slate-950/60 p-0.5">
          {RANGES.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setRange(option.key)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                range === option.key
                  ? "bg-cyan-500/20 text-cyan-300"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={visible} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="weight-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
            </linearGradient>
          </defs>

          {healthyMin != null && healthyMax != null && (
            <ReferenceArea
              y1={healthyMin}
              y2={healthyMax}
              fill="#34d399"
              fillOpacity={0.07}
              stroke="none"
            />
          )}

          <CartesianGrid strokeDasharray="3 6" stroke="rgba(148,163,184,0.12)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            domain={domain}
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={46}
            tickFormatter={(value) => Number(value).toFixed(1)}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelFormatter={(value) => longDate(String(value))}
            formatter={(value, name) => [`${Number(value).toFixed(1)} ${unit}`, name]}
          />
          <Legend
            verticalAlign="top"
            height={28}
            formatter={(value) => <span className="text-xs text-slate-400">{value}</span>}
          />

          {goal != null && (
            <ReferenceLine
              y={goal}
              stroke="#a78bfa"
              strokeDasharray="5 5"
              label={{
                value: `Goal ${goal.toFixed(1)} ${unit}`,
                position: "insideTopRight",
                fill: "#c4b5fd",
                fontSize: 11,
              }}
            />
          )}

          <Area
            type="monotone"
            dataKey="weight"
            name="Weigh-in"
            stroke="#22d3ee"
            strokeWidth={1.5}
            fill="url(#weight-fill)"
            dot={{ r: 2, fill: "#22d3ee", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#67e8f9", stroke: "#0e7490", strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="trend"
            name="Trend (7-day)"
            stroke="#34d399"
            strokeWidth={2.5}
            dot={false}
            activeDot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Week-over-week change, green when you lost, amber when you gained. */
export function WeeklyChangeChart({
  data,
  unit,
}: {
  data: { week: string; change: number }[];
  unit: string;
}) {
  if (data.length === 0) {
    return <EmptyChart message="Two weeks of logging unlocks the weekly breakdown." height={200} />;
  }

  // Keep zero inside the domain, otherwise a run of losing weeks renders as
  // bars hanging off the top with no visible baseline.
  const magnitude = Math.max(...data.map((entry) => Math.abs(entry.change)), 0.2) * 1.25;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 6" stroke="rgba(148,163,184,0.12)" vertical={false} />
        <XAxis
          dataKey="week"
          tickFormatter={shortDate}
          stroke="#64748b"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          minTickGap={16}
        />
        <YAxis
          domain={[-magnitude, magnitude]}
          stroke="#64748b"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          width={46}
          tickFormatter={(value) => Number(value).toFixed(1)}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelFormatter={(value) => `Week of ${longDate(String(value))}`}
          formatter={(value) => [`${Number(value) > 0 ? "+" : ""}${Number(value).toFixed(2)} ${unit}`, "Change"]}
          cursor={{ fill: "rgba(148,163,184,0.08)" }}
        />
        <ReferenceLine y={0} stroke="rgba(148,163,184,0.35)" />
        <Bar dataKey="change" radius={[4, 4, 4, 4]} maxBarSize={26}>
          {data.map((entry) => (
            <Cell key={entry.week} fill={entry.change <= 0 ? "#34d399" : "#fbbf24"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function EmptyChart({ message, height = 300 }: { message: string; height?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg border border-dashed border-slate-700/60 text-sm text-slate-500"
      style={{ height }}
    >
      {message}
    </div>
  );
}
