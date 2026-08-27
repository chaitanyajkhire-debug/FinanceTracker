"use client";

import { useRef, useState } from "react";
import { addStock } from "./actions";

type Suggestion = { symbol: string; name: string; exchange: string };

export function AddStockForm() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<Suggestion | null>(null);
  const [open, setOpen] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onQueryChange(value: string) {
    setQuery(value);
    setSelected(null);
    setSearchError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search/stocks?q=${encodeURIComponent(value)}`);
        const data = await res.json();
        if (!res.ok) {
          setSuggestions([]);
          setSearchError(data.error ?? "Search failed. Try again in a moment.");
          setOpen(true);
          return;
        }
        setSuggestions(data.results ?? []);
        setOpen(true);
      } catch {
        setSuggestions([]);
        setSearchError("Couldn't reach the search service. Check your connection and try again.");
        setOpen(true);
      } finally {
        setSearching(false);
      }
    }, 300);
  }

  return (
    <details className="rounded-xl border border-slate-800 bg-slate-900/40 open:pb-4">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-slate-200">
        + Add stock
      </summary>
      <form
        ref={formRef}
        action={async (formData) => {
          await addStock(formData);
          formRef.current?.reset();
          setQuery("");
          setSelected(null);
        }}
        className="grid grid-cols-1 gap-3 px-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {!manualMode ? (
          <div className="relative sm:col-span-2 lg:col-span-3">
            <label className="mb-1 block text-xs text-slate-400">Search NSE symbol</label>
            <input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onFocus={() => setOpen(true)}
              placeholder="e.g. Reliance, TCS, HDFC Bank"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
            />
            {open && searching && (
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-400 shadow-xl">
                Searching…
              </div>
            )}
            {open && !searching && searchError && (
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-red-900 bg-slate-900 px-3 py-2 text-sm text-red-400 shadow-xl">
                {searchError}
              </div>
            )}
            {open && !searching && !searchError && suggestions.length > 0 && (
              <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
                {suggestions.map((s) => (
                  <li key={s.symbol}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(s);
                        setQuery(`${s.name} (${s.symbol})`);
                        setOpen(false);
                      }}
                      className="block w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
                    >
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-slate-500">NSE: {s.symbol}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {open && !searching && !searchError && suggestions.length === 0 && query.trim().length >= 2 && (
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-500 shadow-xl">
                No matches found.
              </div>
            )}
            <input type="hidden" name="symbol" value={selected?.symbol ?? ""} />
            <input type="hidden" name="company_name" value={selected?.name ?? query} />
            <button
              type="button"
              onClick={() => {
                setManualMode(true);
                setSelected(null);
                setSuggestions([]);
                setSearchError(null);
              }}
              className="mt-1.5 text-xs text-slate-500 underline hover:text-slate-300"
            >
              Can&apos;t find it? Enter the symbol manually
            </button>
          </div>
        ) : (
          <div className="sm:col-span-2 lg:col-span-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-400">NSE symbol</label>
              <input
                name="symbol"
                required
                placeholder="e.g. RELIANCE"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm uppercase text-slate-100 outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Company name</label>
              <input
                name="company_name"
                required
                placeholder="e.g. Reliance Industries"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
              />
            </div>
            <button
              type="button"
              onClick={() => setManualMode(false)}
              className="text-left text-xs text-slate-500 underline hover:text-slate-300 sm:col-span-2"
            >
              Search instead
            </button>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs text-slate-400">Quantity</label>
          <input
            name="quantity"
            type="number"
            step="0.0001"
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Avg. buy price (₹)</label>
          <input
            name="avg_price"
            type="number"
            step="0.01"
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
          <label className="mb-1 block text-xs text-slate-400">Sector (optional)</label>
          <input
            name="sector"
            type="text"
            placeholder="e.g. Banking"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
          />
        </div>

        <div className="sm:col-span-2 lg:col-span-3">
          <button
            type="submit"
            disabled={!manualMode && !selected}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add holding
          </button>
          {!manualMode && !selected && query.length > 0 && (
            <span className="ml-3 text-xs text-slate-500">Pick a stock from the search results</span>
          )}
        </div>
      </form>
    </details>
  );
}
