"use client";

import { useRef, useState } from "react";
import { addMutualFund } from "./actions";

type Suggestion = { schemeCode: string; schemeName: string; nav: number; navDate: string };

export function AddMutualFundForm() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<Suggestion | null>(null);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onQueryChange(value: string) {
    setQuery(value);
    setSelected(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/search/mutual-funds?q=${encodeURIComponent(value)}`);
      const data = await res.json();
      setSuggestions(data.results ?? []);
      setOpen(true);
    }, 300);
  }

  return (
    <details className="rounded-xl border border-slate-800 bg-slate-900/40 open:pb-4">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-slate-200">
        + Add mutual fund
      </summary>
      <form
        ref={formRef}
        action={async (formData) => {
          await addMutualFund(formData);
          formRef.current?.reset();
          setQuery("");
          setSelected(null);
        }}
        className="grid grid-cols-1 gap-3 px-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <div className="relative sm:col-span-2 lg:col-span-3">
          <label className="mb-1 block text-xs text-slate-400">Search scheme (AMFI)</label>
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder="e.g. Parag Parikh Flexi Cap"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
          />
          {open && suggestions.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
              {suggestions.map((s) => (
                <li key={s.schemeCode}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(s);
                      setQuery(s.schemeName);
                      setOpen(false);
                    }}
                    className="block w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
                  >
                    <div className="font-medium">{s.schemeName}</div>
                    <div className="text-xs text-slate-500">
                      Code {s.schemeCode} · NAV ₹{s.nav.toFixed(2)}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <input type="hidden" name="scheme_code" value={selected?.schemeCode ?? ""} />
          <input type="hidden" name="scheme_name" value={selected?.schemeName ?? query} />
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
          <label className="mb-1 block text-xs text-slate-400">Purchase date</label>
          <input
            name="purchase_date"
            type="date"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Folio number</label>
          <input
            name="folio_number"
            type="text"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Category (optional)</label>
          <input
            name="category"
            type="text"
            placeholder="e.g. Equity - Flexi Cap"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
          />
        </div>

        <div className="sm:col-span-2 lg:col-span-3">
          <button
            type="submit"
            disabled={!selected}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add holding
          </button>
          {!selected && query.length > 0 && (
            <span className="ml-3 text-xs text-slate-500">Pick a scheme from the search results</span>
          )}
        </div>
      </form>
    </details>
  );
}
