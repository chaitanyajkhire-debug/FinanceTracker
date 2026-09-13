import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { formatDate } from "@/lib/format";
import { bmi, cmToIn, displayWeight, kgToLb, type Units } from "@/lib/health";
import type { WeightEntry } from "@/lib/supabase/types";
import { deleteEntry, updateEntry } from "./actions";

/** How many weigh-ins to show before the rest collapse behind a toggle. */
const RECENT_COUNT = 25;

type Row = { entry: WeightEntry; previous: WeightEntry | null };

/**
 * Newest-first log of every weigh-in, with the change against the previous
 * entry and an inline editor. Laid out as rows that wrap rather than a wide
 * table, so it stays readable on a phone without horizontal scrolling.
 */
export function History({
  entries,
  units,
  heightCm,
}: {
  entries: WeightEntry[];
  units: Units;
  heightCm: number | null;
}) {
  // Entries arrive oldest-first; render newest-first but keep each row's
  // older neighbour so it can show a day-on-day delta.
  const rows: Row[] = entries
    .map((entry, index) => ({ entry, previous: index > 0 ? entries[index - 1] : null }))
    .reverse();

  const older = rows.length - RECENT_COUNT;

  return (
    <div className="glass p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-slate-200">Weigh-in log</h2>
        <span className="text-xs text-slate-500">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-700/60 px-4 py-10 text-center text-sm text-slate-500">
          No weigh-ins yet. Log your first one above — the insights fill in from there.
        </p>
      ) : (
        <>
          <EntryList rows={rows.slice(0, RECENT_COUNT)} units={units} heightCm={heightCm} />
          {older > 0 && (
            <details className="mt-1">
              <summary className="cursor-pointer py-2 text-xs text-cyan-400 hover:text-cyan-300">
                Show {older} older {older === 1 ? "entry" : "entries"}
              </summary>
              <EntryList rows={rows.slice(RECENT_COUNT)} units={units} heightCm={heightCm} />
            </details>
          )}
        </>
      )}
    </div>
  );
}

function EntryList({
  rows,
  units,
  heightCm,
}: {
  rows: Row[];
  units: Units;
  heightCm: number | null;
}) {
  const unit = units === "imperial" ? "lb" : "kg";
  const lengthUnit = units === "imperial" ? "in" : "cm";
  const toDisplay = (kg: number) => (units === "imperial" ? kgToLb(kg) : kg);
  const toLength = (cm: number) => (units === "imperial" ? cmToIn(cm) : cm);

  const field =
    "mt-1 h-9 w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-2 text-sm text-slate-200 outline-none focus:border-cyan-500/70";

  return (
    <ul className="divide-y divide-slate-800/70">
      {rows.map(({ entry, previous }) => {
        const delta = previous ? entry.weight_kg - previous.weight_kg : null;
        const entryBmi = heightCm ? bmi(entry.weight_kg, heightCm) : null;

        return (
          <li key={entry.id} className="relative py-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <div className="w-28 shrink-0 text-xs text-slate-400">
                {formatDate(entry.entry_date)}
              </div>

              <div className="tabular w-24 shrink-0 font-medium text-slate-100">
                {displayWeight(entry.weight_kg, units)}
              </div>

              <div
                className={`tabular w-20 shrink-0 text-xs ${
                  delta === null
                    ? "text-slate-600"
                    : delta < 0
                      ? "text-emerald-400"
                      : delta > 0
                        ? "text-amber-400"
                        : "text-slate-500"
                }`}
              >
                {delta === null
                  ? "—"
                  : `${delta > 0 ? "+" : delta < 0 ? "−" : ""}${Math.abs(toDisplay(delta)).toFixed(2)}`}
              </div>

              <div className="tabular w-20 shrink-0 text-xs text-slate-500">
                {entryBmi ? `BMI ${entryBmi.toFixed(1)}` : ""}
              </div>

              <div className="flex-1 truncate text-xs text-slate-500">
                {entry.body_fat_pct != null && (
                  <span className="mr-3">{entry.body_fat_pct}% fat</span>
                )}
                {entry.waist_cm != null && (
                  <span className="mr-3">
                    waist {toLength(entry.waist_cm).toFixed(1)} {lengthUnit}
                  </span>
                )}
                {entry.note}
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <details>
                  <summary className="cursor-pointer list-none text-xs text-cyan-400 hover:text-cyan-300">
                    Edit
                  </summary>
                  {/* Anchored to the row's right edge so it never runs off a phone screen. */}
                  <form
                    action={updateEntry.bind(null, entry.id)}
                    className="absolute right-0 top-full z-20 grid w-[min(16rem,calc(100vw-3.5rem))] grid-cols-2 gap-2 rounded-xl border border-slate-700/60 bg-slate-950/95 p-3 shadow-xl shadow-black/50"
                  >
                    <input type="hidden" name="units" value={units} />
                    <label className="text-[11px] text-slate-500">
                      Weight ({unit})
                      <input
                        name="weight"
                        type="number"
                        step="0.1"
                        required
                        defaultValue={toDisplay(entry.weight_kg).toFixed(1)}
                        className={field}
                      />
                    </label>
                    <label className="text-[11px] text-slate-500">
                      Body fat %
                      <input
                        name="body_fat_pct"
                        type="number"
                        step="0.1"
                        defaultValue={entry.body_fat_pct ?? ""}
                        className={field}
                      />
                    </label>
                    <label className="text-[11px] text-slate-500">
                      Waist ({lengthUnit})
                      <input
                        name="waist"
                        type="number"
                        step="0.1"
                        defaultValue={
                          entry.waist_cm == null ? "" : toLength(entry.waist_cm).toFixed(1)
                        }
                        className={field}
                      />
                    </label>
                    <label className="text-[11px] text-slate-500">
                      Note
                      <input
                        name="note"
                        type="text"
                        defaultValue={entry.note ?? ""}
                        className={field}
                      />
                    </label>
                    <button
                      type="submit"
                      className="col-span-2 mt-1 h-9 rounded-lg bg-cyan-500/20 text-xs font-medium text-cyan-200 transition hover:bg-cyan-500/30"
                    >
                      Save changes
                    </button>
                  </form>
                </details>

                <ConfirmDeleteButton
                  action={deleteEntry.bind(null, entry.id)}
                  confirmText="Delete this weigh-in? This cannot be undone."
                />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
