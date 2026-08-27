import { createClient } from "@/lib/supabase/server";
import { formatINR, formatNumber, formatPercent, formatDate, gainLoss } from "@/lib/format";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { AddMutualFundForm } from "./add-form";
import { deleteMutualFund, updateMutualFund } from "./actions";
import type { MutualFund } from "@/lib/supabase/types";

export default async function MutualFundsPage() {
  const supabase = await createClient();
  const { data: funds } = await supabase
    .from("mutual_funds")
    .select("*")
    .order("scheme_name", { ascending: true });

  const rows = (funds ?? []) as MutualFund[];
  const totalInvested = rows.reduce((s, f) => s + f.units * f.avg_cost_per_unit, 0);
  const totalValue = rows.reduce((s, f) => s + f.units * (f.current_nav ?? f.avg_cost_per_unit), 0);
  const total = gainLoss(totalValue, totalInvested);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Mutual Funds</h1>
          <p className="text-sm text-slate-400">
            {rows.length} holding{rows.length === 1 ? "" : "s"} · Current value{" "}
            <span className="text-slate-200">{formatINR(totalValue)}</span> ·{" "}
            <span className={total.abs >= 0 ? "text-emerald-400" : "text-red-400"}>
              {formatINR(total.abs, true)} ({formatPercent(total.pct)})
            </span>
          </p>
        </div>
      </div>

      <AddMutualFundForm />

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-slate-900/60 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Scheme</th>
              <th className="px-4 py-3 text-right">Units</th>
              <th className="px-4 py-3 text-right">Avg. cost</th>
              <th className="px-4 py-3 text-right">NAV</th>
              <th className="px-4 py-3 text-right">Value</th>
              <th className="px-4 py-3 text-right">Gain/Loss</th>
              <th className="px-4 py-3 text-right">Day change</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((f) => {
              const nav = f.current_nav ?? f.avg_cost_per_unit;
              const value = f.units * nav;
              const invested = f.units * f.avg_cost_per_unit;
              const gl = gainLoss(value, invested);
              const prevNav = f.previous_nav ?? nav;
              const dayChangeAbs = (nav - prevNav) * f.units;
              const dayChangePct = prevNav > 0 ? ((nav - prevNav) / prevNav) * 100 : 0;

              return (
                <tr key={f.id} className="align-top hover:bg-slate-900/40">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-100">{f.scheme_name}</div>
                    <div className="text-xs text-slate-500">
                      {f.category ?? "Uncategorised"} · Code {f.scheme_code}
                      {f.folio_number ? ` · Folio ${f.folio_number}` : ""}
                    </div>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-emerald-400">Edit</summary>
                      <form
                        action={updateMutualFund.bind(null, f.id)}
                        className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-slate-900/60 p-3"
                      >
                        <label className="col-span-2 text-xs text-slate-400">
                          Units
                          <input
                            name="units"
                            type="number"
                            step="0.0001"
                            defaultValue={f.units}
                            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
                          />
                        </label>
                        <label className="col-span-2 text-xs text-slate-400">
                          Avg. cost / unit
                          <input
                            name="avg_cost_per_unit"
                            type="number"
                            step="0.0001"
                            defaultValue={f.avg_cost_per_unit}
                            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
                          />
                        </label>
                        <label className="text-xs text-slate-400">
                          Folio
                          <input
                            name="folio_number"
                            defaultValue={f.folio_number ?? ""}
                            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
                          />
                        </label>
                        <label className="text-xs text-slate-400">
                          Category
                          <input
                            name="category"
                            defaultValue={f.category ?? ""}
                            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
                          />
                        </label>
                        <label className="col-span-2 text-xs text-slate-400">
                          Purchase date
                          <input
                            name="purchase_date"
                            type="date"
                            defaultValue={f.purchase_date ?? ""}
                            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
                          />
                        </label>
                        <button
                          type="submit"
                          className="col-span-2 mt-1 rounded bg-emerald-500 py-1 text-xs font-medium text-slate-950 hover:bg-emerald-400"
                        >
                          Save
                        </button>
                      </form>
                    </details>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-200">{formatNumber(f.units)}</td>
                  <td className="px-4 py-3 text-right text-slate-400">{formatINR(f.avg_cost_per_unit, true)}</td>
                  <td className="px-4 py-3 text-right text-slate-200">
                    {formatINR(nav, true)}
                    <div className="text-xs text-slate-500">{formatDate(f.current_nav_date)}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-100">{formatINR(value)}</td>
                  <td className={`px-4 py-3 text-right ${gl.abs >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {formatINR(gl.abs, true)}
                    <div className="text-xs">{formatPercent(gl.pct)}</div>
                  </td>
                  <td className={`px-4 py-3 text-right ${dayChangeAbs >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {formatINR(dayChangeAbs, true)}
                    <div className="text-xs">{formatPercent(dayChangePct)}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ConfirmDeleteButton action={deleteMutualFund.bind(null, f.id)} />
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">
                  No mutual fund holdings yet. Add your first one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
