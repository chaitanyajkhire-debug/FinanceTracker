import { createClient } from "@/lib/supabase/server";
import { formatINR, formatNumber, formatPercent, formatDate, gainLoss } from "@/lib/format";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { AddStockForm } from "./add-form";
import { deleteStock, updateStock } from "./actions";
import type { Stock } from "@/lib/supabase/types";

export default async function StocksPage() {
  const supabase = await createClient();
  const { data: stocks } = await supabase
    .from("stocks")
    .select("*")
    .order("company_name", { ascending: true });

  const rows = (stocks ?? []) as Stock[];
  const totalInvested = rows.reduce((s, x) => s + x.quantity * x.avg_price, 0);
  const totalValue = rows.reduce((s, x) => s + x.quantity * (x.current_price ?? x.avg_price), 0);
  const total = gainLoss(totalValue, totalInvested);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Stocks</h1>
          <p className="text-sm text-slate-400">
            {rows.length} holding{rows.length === 1 ? "" : "s"} · Current value{" "}
            <span className="text-slate-200">{formatINR(totalValue)}</span> ·{" "}
            <span className={total.abs >= 0 ? "text-emerald-400" : "text-red-400"}>
              {formatINR(total.abs, true)} ({formatPercent(total.pct)})
            </span>
          </p>
        </div>
      </div>

      <AddStockForm />

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-slate-900/60 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-right">Avg. price</th>
              <th className="px-4 py-3 text-right">LTP</th>
              <th className="px-4 py-3 text-right">Value</th>
              <th className="px-4 py-3 text-right">Gain/Loss</th>
              <th className="px-4 py-3 text-right">Day change</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((s) => {
              const price = s.current_price ?? s.avg_price;
              const value = s.quantity * price;
              const invested = s.quantity * s.avg_price;
              const gl = gainLoss(value, invested);
              const prevClose = s.previous_close ?? price;
              const dayChangeAbs = (price - prevClose) * s.quantity;
              const dayChangePct = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;

              return (
                <tr key={s.id} className="align-top hover:bg-slate-900/40">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-100">{s.company_name}</div>
                    <div className="text-xs text-slate-500">
                      NSE: {s.symbol}
                      {s.sector ? ` · ${s.sector}` : ""}
                    </div>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-emerald-400">Edit</summary>
                      <form
                        action={updateStock.bind(null, s.id)}
                        className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-slate-900/60 p-3"
                      >
                        <label className="text-xs text-slate-400">
                          Quantity
                          <input
                            name="quantity"
                            type="number"
                            step="0.0001"
                            defaultValue={s.quantity}
                            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
                          />
                        </label>
                        <label className="text-xs text-slate-400">
                          Avg. price
                          <input
                            name="avg_price"
                            type="number"
                            step="0.01"
                            defaultValue={s.avg_price}
                            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
                          />
                        </label>
                        <label className="text-xs text-slate-400">
                          Sector
                          <input
                            name="sector"
                            defaultValue={s.sector ?? ""}
                            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
                          />
                        </label>
                        <label className="text-xs text-slate-400">
                          Purchase date
                          <input
                            name="purchase_date"
                            type="date"
                            defaultValue={s.purchase_date ?? ""}
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
                  <td className="px-4 py-3 text-right text-slate-200">{formatNumber(s.quantity)}</td>
                  <td className="px-4 py-3 text-right text-slate-400">{formatINR(s.avg_price, true)}</td>
                  <td className="px-4 py-3 text-right text-slate-200">
                    {formatINR(price, true)}
                    <div className="text-xs text-slate-500">{formatDate(s.current_price_date)}</div>
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
                    <ConfirmDeleteButton action={deleteStock.bind(null, s.id)} />
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">
                  No stock holdings yet. Add your first one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
