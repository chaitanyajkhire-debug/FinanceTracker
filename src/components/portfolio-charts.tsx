"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { formatINR, formatDate } from "@/lib/format";

const COLORS = ["#34d399", "#38bdf8", "#fbbf24"];

export function AllocationChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const nonZero = data.filter((d) => d.value > 0);

  if (nonZero.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-500">
        Add holdings to see your allocation
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={nonZero}
          dataKey="value"
          nameKey="name"
          innerRadius={65}
          outerRadius={100}
          paddingAngle={2}
        >
          {nonZero.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => formatINR(Number(value), true)}
          contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, color: "#e2e8f0" }}
        />
        <Legend
          verticalAlign="bottom"
          formatter={(value) => <span className="text-slate-300">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ValueOverTimeChart({
  data,
}: {
  data: { date: string; value: number; invested: number }[];
}) {
  if (data.length < 2) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-500">
        Come back after a few daily refreshes to see your value trend
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="date"
          tickFormatter={(d) => formatDate(d)}
          stroke="#64748b"
          fontSize={12}
        />
        <YAxis
          stroke="#64748b"
          fontSize={12}
          tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`}
          width={56}
        />
        <Tooltip
          labelFormatter={(d) => formatDate(String(d))}
          formatter={(value) => formatINR(Number(value), true)}
          contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, color: "#e2e8f0" }}
        />
        <Legend formatter={(value) => <span className="text-slate-300">{value}</span>} />
        <Line type="monotone" dataKey="invested" name="Invested" stroke="#64748b" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="value" name="Portfolio value" stroke="#34d399" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
