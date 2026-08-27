"use client";

import { useRef } from "react";
import { addNpsScheme } from "./actions";

export function AddNpsForm() {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <details className="rounded-xl border border-slate-800 bg-slate-900/40 open:pb-4">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-slate-200">
        + Add NPS scheme
      </summary>
      <form
        ref={formRef}
        action={async (formData) => {
          await addNpsScheme(formData);
          formRef.current?.reset();
        }}
        className="grid grid-cols-1 gap-3 px-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <div>
          <label className="mb-1 block text-xs text-slate-400">Scheme name</label>
          <input
            name="scheme_name"
            required
            placeholder="e.g. HDFC Pension Fund - Scheme E Tier I"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Fund manager</label>
          <input
            name="fund_manager"
            placeholder="e.g. HDFC Pension"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">PRAN</label>
          <input
            name="pran"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Tier</label>
          <select
            name="tier"
            defaultValue="Tier I"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
          >
            <option>Tier I</option>
            <option>Tier II</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Asset class</label>
          <select
            name="asset_class"
            defaultValue="E"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
          >
            <option value="E">E - Equity</option>
            <option value="C">C - Corporate Debt</option>
            <option value="G">G - Government Bonds</option>
            <option value="A">A - Alternative Assets</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Units held</label>
          <input
            name="units"
            type="number"
            step="0.0001"
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Avg. cost / unit (₹)</label>
          <input
            name="avg_cost_per_unit"
            type="number"
            step="0.0001"
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Current NAV (₹)</label>
          <input
            name="current_nav"
            type="number"
            step="0.0001"
            placeholder="From your latest NPS statement"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">NAV as of date</label>
          <input
            name="current_nav_date"
            type="date"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
          />
        </div>

        <div className="sm:col-span-2 lg:col-span-3">
          <button
            type="submit"
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-400"
          >
            Add holding
          </button>
        </div>
      </form>
    </details>
  );
}
