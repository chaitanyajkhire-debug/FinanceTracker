import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatINR, formatPercent, gainLoss } from "@/lib/format";
import { StatCard } from "@/components/stat-card";
import { AllocationChart, ValueOverTimeChart } from "@/components/portfolio-charts";
import type { MutualFund, Stock, NpsScheme, DailySnapshot, RefreshLog } from "@/lib/supabase/types";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { data: funds },
    { data: stocks },
    { data: nps },
    { data: snapshots },
    { data: logs },
  ] = await Promise.all([
    supabase.from("mutual_funds").select("*"),
    supabase.from("stocks").select("*"),
    supabase.from("nps_schemes").select("*"),
    supabase.from("daily_snapshots").select("*").order("snapshot_date", { ascending: true }).limit(120),
    supabase.from("refresh_logs").select("*").order("run_at", { ascending: false }).limit(1),
  ]);

  const mf = (funds ?? []) as MutualFund[];
  const st = (stocks ?? []) as Stock[];
  const np = (nps ?? []) as NpsScheme[];
  const history = (snapshots ?? []) as DailySnapshot[];
  const lastLog = (logs ?? [])[0] as RefreshLog | undefined;

  const mfValue = mf.reduce((s, f) => s + f.units * (f.current_nav ?? f.avg_cost_per_unit), 0);
  const mfInvested = mf.reduce((s, f) => s + f.units * f.avg_cost_per_unit, 0);
  const stockValue = st.reduce((s, x) => s + x.quantity * (x.current_price ?? x.avg_price), 0);
  const stockInvested = st.reduce((s, x) => s + x.quantity * x.avg_price, 0);
  const npsValue = np.reduce((s, x) => s + x.units * (x.current_nav ?? x.avg_cost_per_unit), 0);
  const npsInvested = np.reduce((s, x) => s + x.units * x.avg_cost_per_unit, 0);

  const totalValue = mfValue + stockValue + npsValue;
  const totalInvested = mfInvested + stockInvested + npsInvested;
  const total = gainLoss(totalValue, totalInvested);

  const mfDayChange = mf.reduce((s, f) => s + ((f.current_nav ?? f.avg_cost_per_unit) - (f.previous_nav ?? f.current_nav ?? f.avg_cost_per_unit)) * f.units, 0);
  const stockDayChange = st.reduce((s, x) => s + ((x.current_price ?? x.avg_price) - (x.previous_close ?? x.current_price ?? x.avg_price)) * x.quantity, 0);
  const dayChangeAbs = mfDayChange + stockDayChange;
  const dayChangeBase = totalValue - dayChangeAbs;
  const dayChangePct = dayChangeBase > 0 ? (dayChangeAbs / dayChangeBase) * 100 : 0;

  const todayIso = new Date().toISOString().slice(0, 10);
  const chartData = history.map((h) => ({
    date: h.snapshot_date,
    value: h.total_value,
    invested: h.total_invested,
  }));
  if (chartData.length === 0 || chartData[chartData.length - 1].date !== todayIso) {
    chartData.push({ date: todayIso, value: totalValue, invested: totalInvested });
  }

  const allocation = [
    { name: "Mutual Funds", value: mfValue },
    { name: "Stocks", value: stockValue },
    { name: "NPS", value: npsValue },
  ];

  const movers = [
    ...mf.map((f) => {
      const nav = f.current_nav ?? f.avg_cost_per_unit;
      const prev = f.previous_nav ?? nav;
      const pct = prev > 0 ? ((nav - prev) / prev) * 100 : 0;
      return { name: f.scheme_name, type: "MF", pct };
    }),
    ...st.map((s) => {
      const price = s.current_price ?? s.avg_price;
      const prev = s.previous_close ?? price;
      const pct = prev > 0 ? ((price - prev) / prev) * 100 : 0;
      return { name: s.company_name, type: "Stock", pct };
    }),
  ]
    .filter((m) => m.pct !== 0)
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-xl font-semibold text-slate-100">Portfolio Overview</h1>
        {lastLog && (
          <p className="text-xs text-slate-500">
            Last refresh: {new Date(lastLog.run_at).toLocaleString("en-IN")} ·{" "}
            <span
              className={
                lastLog.status === "success"
                  ? "text-emerald-400"
                  : lastLog.status === "partial"
                    ? "text-amber-400"
                    : "text-red-400"
              }
            >
              {lastLog.status}
            </span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Value" value={formatINR(totalValue)} />
        <StatCard label="Total Invested" value={formatINR(totalInvested)} />
        <StatCard
          label="Overall Gain/Loss"
          value={formatINR(total.abs, true)}
          sub={formatPercent(total.pct)}
          tone={total.abs >= 0 ? "positive" : "negative"}
        />
        <StatCard
          label="Today's Change"
          value={formatINR(dayChangeAbs, true)}
          sub={formatPercent(dayChangePct)}
          tone={dayChangeAbs >= 0 ? "positive" : "negative"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Link
          href="/mutual-funds"
          className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 transition hover:border-emerald-600"
        >
          <div className="text-xs uppercase tracking-wide text-slate-500">Mutual Funds</div>
          <div className="mt-1 text-xl font-semibold text-slate-100">{formatINR(mfValue)}</div>
          <div className={`text-xs ${mfValue - mfInvested >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {formatINR(mfValue - mfInvested, true)} ({formatPercent(gainLoss(mfValue, mfInvested).pct)})
          </div>
          <div className="mt-2 text-xs text-slate-500">{mf.length} holding{mf.length === 1 ? "" : "s"}</div>
        </Link>
        <Link
          href="/stocks"
          className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 transition hover:border-emerald-600"
        >
          <div className="text-xs uppercase tracking-wide text-slate-500">Stocks</div>
          <div className="mt-1 text-xl font-semibold text-slate-100">{formatINR(stockValue)}</div>
          <div className={`text-xs ${stockValue - stockInvested >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {formatINR(stockValue - stockInvested, true)} ({formatPercent(gainLoss(stockValue, stockInvested).pct)})
          </div>
          <div className="mt-2 text-xs text-slate-500">{st.length} holding{st.length === 1 ? "" : "s"}</div>
        </Link>
        <Link
          href="/nps"
          className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 transition hover:border-emerald-600"
        >
          <div className="text-xs uppercase tracking-wide text-slate-500">NPS</div>
          <div className="mt-1 text-xl font-semibold text-slate-100">{formatINR(npsValue)}</div>
          <div className={`text-xs ${npsValue - npsInvested >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {formatINR(npsValue - npsInvested, true)} ({formatPercent(gainLoss(npsValue, npsInvested).pct)})
          </div>
          <div className="mt-2 text-xs text-slate-500">{np.length} scheme{np.length === 1 ? "" : "s"}</div>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 lg:col-span-3">
          <h2 className="mb-2 text-sm font-medium text-slate-200">Portfolio value over time</h2>
          <ValueOverTimeChart data={chartData} />
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 lg:col-span-2">
          <h2 className="mb-2 text-sm font-medium text-slate-200">Asset allocation</h2>
          <AllocationChart data={allocation} />
        </div>
      </div>

      {movers.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <h2 className="mb-3 text-sm font-medium text-slate-200">Today&apos;s biggest movers</h2>
          <ul className="divide-y divide-slate-800">
            {movers.map((m, i) => (
              <li key={i} className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-300">
                  {m.name} <span className="text-xs text-slate-500">({m.type})</span>
                </span>
                <span className={m.pct >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {formatPercent(m.pct)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {mf.length === 0 && st.length === 0 && np.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">
          Your portfolio is empty. Head to{" "}
          <Link href="/mutual-funds" className="text-emerald-400 underline">
            Mutual Funds
          </Link>
          ,{" "}
          <Link href="/stocks" className="text-emerald-400 underline">
            Stocks
          </Link>{" "}
          or{" "}
          <Link href="/nps" className="text-emerald-400 underline">
            NPS
          </Link>{" "}
          to add your first holding.
        </div>
      )}
    </div>
  );
}
