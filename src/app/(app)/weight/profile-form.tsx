"use client";

import { useActionState, useEffect, useState } from "react";
import { saveProfile, type ProfileState } from "./actions";
import { ACTIVITY_LEVELS, cmToIn, kgToLb, type Units } from "@/lib/health";
import type { HealthProfile } from "@/lib/supabase/types";

const initialState: ProfileState = { error: null, ok: false };

/**
 * Height, goal and the optional inputs behind BMR/TDEE. Switching units
 * re-labels and converts the fields in place, so nothing has to be retyped.
 */
export function ProfileForm({
  profile,
  openByDefault,
}: {
  profile: HealthProfile | null;
  openByDefault: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveProfile, initialState);
  const [units, setUnits] = useState<Units>(profile?.units === "imperial" ? "imperial" : "metric");
  // See LogWeightForm: the dismissed result is tracked instead of a boolean so
  // the confirmation can time out without a synchronous setState in an effect.
  const [dismissed, setDismissed] = useState<ProfileState | null>(null);
  const saved = state.ok && dismissed !== state;

  useEffect(() => {
    if (!state.ok) return;
    const timer = setTimeout(() => setDismissed(state), 2600);
    return () => clearTimeout(timer);
  }, [state]);

  const heightCm = profile?.height_cm ?? null;
  const totalInches = heightCm === null ? null : cmToIn(heightCm);
  const feet = totalInches === null ? "" : String(Math.floor(totalInches / 12));
  const inches = totalInches === null ? "" : (totalInches - Math.floor(totalInches / 12) * 12).toFixed(1);

  const goalKg = profile?.goal_weight_kg ?? null;
  const goalDisplay =
    goalKg === null ? "" : (units === "imperial" ? kgToLb(goalKg) : goalKg).toFixed(1);

  const field =
    "mt-1 h-10 w-full rounded-lg border border-slate-700/70 bg-slate-950/60 px-2.5 text-sm text-slate-200 outline-none transition focus:border-cyan-500/70";

  return (
    <details open={openByDefault} className="glass group p-5 open:pb-6">
      <summary className="flex cursor-pointer select-none items-center justify-between text-sm font-medium text-slate-200">
        <span>Your details</span>
        <span className="text-xs font-normal text-slate-500 group-open:hidden">
          {heightCm ? "Edit height & goal" : "Add your height to unlock BMI"}
        </span>
      </summary>

      {/* key forces the inputs to re-mount with converted defaults on unit switch */}
      <form key={units} action={formAction} className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <input type="hidden" name="units" value={units} />

        <div className="col-span-2 sm:col-span-3">
          <span className="mb-1.5 block text-xs uppercase tracking-widest text-slate-500">Units</span>
          <div className="inline-flex rounded-lg border border-slate-700/60 bg-slate-950/60 p-0.5">
            {(["metric", "imperial"] as Units[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setUnits(option)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${
                  units === option ? "bg-cyan-500/20 text-cyan-300" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {option === "metric" ? "kg · cm" : "lb · ft/in"}
              </button>
            ))}
          </div>
        </div>

        {units === "metric" ? (
          <label className="text-xs text-slate-500">
            Height (cm)
            <input
              name="height_cm"
              type="number"
              step="0.1"
              inputMode="decimal"
              defaultValue={heightCm ?? ""}
              placeholder="175"
              className={field}
            />
          </label>
        ) : (
          <div className="col-span-2 grid grid-cols-2 gap-2 sm:col-span-1">
            <label className="text-xs text-slate-500">
              Height (ft)
              <input
                name="height_ft"
                type="number"
                step="1"
                inputMode="numeric"
                defaultValue={feet}
                placeholder="5"
                className={field}
              />
            </label>
            <label className="text-xs text-slate-500">
              (in)
              <input
                name="height_in"
                type="number"
                step="0.1"
                inputMode="decimal"
                defaultValue={inches}
                placeholder="9"
                className={field}
              />
            </label>
          </div>
        )}

        <label className="text-xs text-slate-500">
          Goal weight ({units === "imperial" ? "lb" : "kg"})
          <input
            name="goal_weight"
            type="number"
            step="0.1"
            inputMode="decimal"
            defaultValue={goalDisplay}
            placeholder={units === "imperial" ? "160" : "72"}
            className={field}
          />
        </label>

        <label className="text-xs text-slate-500">
          Sex
          <select name="sex" defaultValue={profile?.sex ?? ""} className={field}>
            <option value="">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </label>

        <label className="text-xs text-slate-500">
          Date of birth
          <input
            name="birth_date"
            type="date"
            defaultValue={profile?.birth_date ?? ""}
            className={field}
          />
        </label>

        <label className="col-span-2 text-xs text-slate-500">
          Activity level
          <select
            name="activity_level"
            defaultValue={profile?.activity_level ?? "sedentary"}
            className={field}
          >
            {ACTIVITY_LEVELS.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label} — {level.hint}
              </option>
            ))}
          </select>
        </label>

        <p className="col-span-2 text-[11px] leading-relaxed text-slate-500 sm:col-span-3">
          Sex, date of birth and activity level are optional — they&apos;re only used to
          estimate your BMR and daily calorie burn.
        </p>

        <div className="col-span-2 flex items-center gap-3 sm:col-span-3">
          <button
            type="submit"
            disabled={pending}
            className="h-10 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-4 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/25 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save details"}
          </button>
          {state.error && <span className="text-xs text-red-300">{state.error}</span>}
          {saved && !state.error && <span className="text-xs text-emerald-300">Saved</span>}
        </div>
      </form>
    </details>
  );
}
