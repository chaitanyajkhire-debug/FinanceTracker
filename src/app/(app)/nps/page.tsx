import { createClient } from "@/lib/supabase/server";
import { formatINR, formatNumber, formatPercent, formatDate, gainLoss } from "@/lib/format";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { AddNpsForm } from "./add-form";
import { deleteNpsScheme, updateNpsScheme } from "./actions";
import type { NpsScheme } from "@/lib/supabase/types";

export default async function NpsPage() {
  const supabase = await createClient();
  const { data: schemes } = await supabase
    .from("nps_schemes")
    .select("*")
    .order("scheme_name", { ascending: true });

  const rows = (schemes ?? []) as NpsScheme[];
  const totalInvested = rows.reduce((s, x) => s + x.units * x.avg_cost_per_unit, 0);
  const totalValue = rows.reduce((s, x) => s + x.units * (x.current_nav ?? x.avg_cost_per_unit), 0);
  const total = gainLoss(totalValue, totalInvested);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">NPS</h1>
          <p className="text-sm text-slate-400">
            {rows.length} scheme{rows.length === 1 ? "" : "s"} · Current value{" "}
            <span className="text-slate-200">{formatINR(totalValue)}</span> ·{" "}
            <span className={total.abs >= 0 ? "text-emerald-400" : "text-red-400"}>
              {formatINR(total.abs, true)} ({formatPercent(total.pct)})
            </span>
          </p>
        </div>
        <p className="max-w-md text-xs text-slate-500">
          NPS NAVs aren&apos;t available from a public feed, so update them manually here from your
          CRA (Protean/NSDL/KFintech) statement whenever you check in.
        </p>
      </div>

      <AddNpsForm />

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
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((n) => {
              const nav = n.current_nav ?? n.avg_cost_per_unit;
              const value = n.units * nav;
              const invested = n.units * n.avg_cost_per_unit;
              const gl = gainLoss(value, invested);

              return (
                <tr key={n.id} className="align-top hover:bg-slate-900/40">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-100">{n.scheme_name}</div>
                    <div className="text-xs text-slate-500">
                      {n.tier}
                      {n.asset_class ? ` · Class ${n.asset_class}` : ""}
                      {n.fund_manager ? ` · ${n.fund_manager}` : ""}
                      {n.pran ? ` · PRAN ${n.pran}` : ""}
                    </div>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-emerald-400">
                        Edit / update NAV
                      </summary>
                      <form
                        action={updateNpsScheme.bind(null, n.id)}
                        className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-slate-900/60 p-3"
                      >
                        <label className="text-xs text-slate-400">
                          Units
                          <input
                            name="units"
                            type="number"
                            step="0.0001"
                            defaultValue={n.units}
                            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
                          />
                        </label>
                        <label className="text-xs text-slate-400">
                          Avg. cost / unit
                          <input
                            name="avg_cost_per_unit"
                            type="number"
                            step="0.0001"
                            defaultValue={n.avg_cost_per_unit}
                            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
                          />
                        </label>
                        <label className="text-xs font-medium text-emerald-400">
                          Current NAV
                          <input
                            name="current_nav"
                            type="number"
                            step="0.0001"
                            defaultValue={n.current_nav ?? ""}
                            className="mt-1 w-full rounded border border-emerald-700 bg-slate-950 px-2 py-1 text-sm"
                          />
                        </label>
                        <label className="text-xs font-medium text-emerald-400">
                          NAV as of
                          <input
                            name="current_nav_date"
                            type="date"
                            defaultValue={n.current_nav_date ?? ""}
                            className="mt-1 w-full rounded border border-emerald-700 bg-slate-950 px-2 py-1 text-sm"
                          />
                        </label>
                        <label className="text-xs text-slate-400">
                          Fund manager
                          <input
                            name="fund_manager"
                            defaultValue={n.fund_manager ?? ""}
                            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
                          />
                        </label>
                        <label className="text-xs text-slate-400">
                          PRAN
                          <input
                            name="pran"
                            defaultValue={n.pran ?? ""}
                            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
                          />
                        </label>
                        <label className="text-xs text-slate-400">
                          Tier
                          <select
                            name="tier"
                            defaultValue={n.tier}
                            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
                          >
                            <option>Tier I</option>
                            <option>Tier II</option>
                          </select>
                        </label>
                        <label className="text-xs text-slate-400">
                          Asset class
                          <select
                            name="asset_class"
                            defaultValue={n.asset_class ?? "E"}
                            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
                          >
                            <option value="E">E</option>
                            <option value="C">C</option>
                            <option value="G">G</option>
                            <option value="A">A</option>
                          </select>
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
                  <td className="px-4 py-3 text-right text-slate-200">{formatNumber(n.units)}</td>
                  <td className="px-4 py-3 text-right text-slate-400">{formatINR(n.avg_cost_per_unit, true)}</td>
                  <td className="px-4 py-3 text-right text-slate-200">
                    {formatINR(nav, true)}
                    <div className="text-xs text-slate-500">{formatDate(n.current_nav_date)}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-100">{formatINR(value)}</td>
                  <td className={`px-4 py-3 text-right ${gl.abs >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {formatINR(gl.abs, true)}
                    <div className="text-xs">{formatPercent(gl.pct)}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ConfirmDeleteButton action={deleteNpsScheme.bind(null, n.id)} />
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                  No NPS schemes yet. Add your first one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
