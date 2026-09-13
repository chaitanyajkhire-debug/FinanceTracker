"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { logWeight, type LogState } from "./actions";
import type { Units } from "@/lib/health";

const initialState: LogState = { error: null, ok: false };

/**
 * Quick weigh-in entry. The steppers exist because on a phone, nudging by
 * 0.1 is far quicker than tapping out a decimal on the number pad.
 */
export function LogWeightForm({
  units,
  today,
  lastWeight,
}: {
  units: Units;
  today: string;
  lastWeight: number | null;
}) {
  const unit = units === "imperial" ? "lb" : "kg";
  const step = units === "imperial" ? 0.2 : 0.1;

  const [state, formAction, pending] = useActionState(logWeight, initialState);
  const [weight, setWeight] = useState(lastWeight ? lastWeight.toFixed(1) : "");
  const [showMore, setShowMore] = useState(false);
  // Tracks which result has had its confirmation dismissed, so the flash can
  // fade without writing state during render or synchronously in an effect.
  const [dismissed, setDismissed] = useState<LogState | null>(null);
  const noteRef = useRef<HTMLInputElement>(null);
  const justSaved = state.ok && dismissed !== state;

  useEffect(() => {
    if (!state.ok) return;
    if (noteRef.current) noteRef.current.value = "";
    const timer = setTimeout(() => setDismissed(state), 2600);
    return () => clearTimeout(timer);
  }, [state]);

  function nudge(direction: number) {
    const current = Number.parseFloat(weight);
    const base = Number.isFinite(current) ? current : (lastWeight ?? 70);
    setWeight((base + direction * step).toFixed(1));
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="units" value={units} />

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label htmlFor="weight" className="mb-1.5 block text-xs uppercase tracking-widest text-slate-500">
            Today&apos;s weight
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => nudge(-1)}
              aria-label={`Decrease by ${step} ${unit}`}
              className="h-11 w-11 shrink-0 rounded-xl border border-slate-700/70 bg-slate-950/60 text-lg text-slate-300 transition hover:border-cyan-500/50 hover:text-cyan-300"
            >
              −
            </button>
            <div className="relative flex-1">
              <input
                id="weight"
                name="weight"
                type="number"
                inputMode="decimal"
                step="0.1"
                required
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
                placeholder={lastWeight ? lastWeight.toFixed(1) : "72.5"}
                className="tabular h-11 w-full rounded-xl border border-slate-700/70 bg-slate-950/60 px-3 pr-12 text-center text-lg font-semibold text-slate-50 outline-none transition focus:border-cyan-500/70 focus:ring-2 focus:ring-cyan-500/20"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                {unit}
              </span>
            </div>
            <button
              type="button"
              onClick={() => nudge(1)}
              aria-label={`Increase by ${step} ${unit}`}
              className="h-11 w-11 shrink-0 rounded-xl border border-slate-700/70 bg-slate-950/60 text-lg text-slate-300 transition hover:border-cyan-500/50 hover:text-cyan-300"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="entry_date" className="mb-1.5 block text-xs uppercase tracking-widest text-slate-500">
          Date
        </label>
        <input
          id="entry_date"
          name="entry_date"
          type="date"
          defaultValue={today}
          max={today}
          className="h-11 w-full rounded-xl border border-slate-700/70 bg-slate-950/60 px-3 text-sm text-slate-200 outline-none focus:border-cyan-500/70"
        />
      </div>

      <button
        type="button"
        onClick={() => setShowMore((open) => !open)}
        className="text-xs text-slate-500 underline-offset-2 transition hover:text-slate-300 hover:underline"
      >
        {showMore ? "Hide extras" : "Add body fat, waist or a note"}
      </button>

      {showMore && (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-slate-500">
            Body fat %
            <input
              name="body_fat_pct"
              type="number"
              step="0.1"
              inputMode="decimal"
              placeholder="24.5"
              className="mt-1 h-10 w-full rounded-lg border border-slate-700/70 bg-slate-950/60 px-2 text-sm text-slate-200 outline-none focus:border-cyan-500/70"
            />
          </label>
          <label className="text-xs text-slate-500">
            Waist ({units === "imperial" ? "in" : "cm"})
            <input
              name="waist"
              type="number"
              step="0.1"
              inputMode="decimal"
              placeholder={units === "imperial" ? "34" : "86"}
              className="mt-1 h-10 w-full rounded-lg border border-slate-700/70 bg-slate-950/60 px-2 text-sm text-slate-200 outline-none focus:border-cyan-500/70"
            />
          </label>
          <label className="col-span-2 text-xs text-slate-500">
            Note
            <input
              ref={noteRef}
              name="note"
              type="text"
              maxLength={140}
              placeholder="Post-workout, fasted…"
              className="mt-1 h-10 w-full rounded-lg border border-slate-700/70 bg-slate-950/60 px-2 text-sm text-slate-200 outline-none focus:border-cyan-500/70"
            />
          </label>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-11 w-full rounded-xl bg-gradient-to-r from-cyan-500 via-emerald-400 to-cyan-500 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Log weigh-in"}
      </button>

      {state.error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">{state.error}</p>
      )}
      {justSaved && !state.error && (
        <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          Saved. Keep it up. 🔥
        </p>
      )}
    </form>
  );
}
