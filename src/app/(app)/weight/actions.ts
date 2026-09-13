"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { inToCm, lbToKg, todayIso, type Units } from "@/lib/health";

export type LogState = { error: string | null; ok: boolean };

function num(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) ?? "").trim();
  if (raw.length === 0) return null;
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : null;
}

function str(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
}

function unitsOf(formData: FormData): Units {
  return String(formData.get("units") ?? "metric") === "imperial" ? "imperial" : "metric";
}

function revalidateWeight() {
  revalidatePath("/weight");
}

/**
 * Adds today's (or a back-dated) reading. One entry per day — logging the same
 * date again overwrites it, which is what you want when you re-weigh yourself.
 */
export async function logWeight(_prev: LogState, formData: FormData): Promise<LogState> {
  const units = unitsOf(formData);
  const rawWeight = num(formData, "weight");

  if (rawWeight === null || rawWeight <= 0) {
    return { error: "Enter your weight.", ok: false };
  }

  const weightKg = units === "imperial" ? lbToKg(rawWeight) : rawWeight;
  if (weightKg < 20 || weightKg > 500) {
    return { error: "That weight looks off — check the number and try again.", ok: false };
  }

  const entryDate = str(formData, "entry_date") ?? todayIso();
  if (entryDate > todayIso()) {
    return { error: "You can't log a weight for a future date.", ok: false };
  }

  const bodyFat = num(formData, "body_fat_pct");
  if (bodyFat !== null && (bodyFat <= 0 || bodyFat >= 100)) {
    return { error: "Body fat % must be between 0 and 100.", ok: false };
  }

  const rawWaist = num(formData, "waist");
  const waistCm = rawWaist === null ? null : units === "imperial" ? inToCm(rawWaist) : rawWaist;

  const supabase = await createClient();

  // No sign-in: user_id comes from the column default, and RLS pins it to the
  // app owner (see supabase/migrations/0004_public_no_auth.sql).
  const { error } = await supabase.from("weight_entries").upsert(
    {
      entry_date: entryDate,
      weight_kg: Number(weightKg.toFixed(2)),
      body_fat_pct: bodyFat,
      waist_cm: waistCm === null ? null : Number(waistCm.toFixed(1)),
      note: str(formData, "note"),
    },
    { onConflict: "user_id,entry_date" },
  );

  if (error) return { error: "Couldn't save that entry. Try again.", ok: false };

  revalidateWeight();
  return { error: null, ok: true };
}

export async function updateEntry(id: string, formData: FormData) {
  const units = unitsOf(formData);
  const rawWeight = num(formData, "weight");
  if (rawWeight === null || rawWeight <= 0) return;

  const weightKg = units === "imperial" ? lbToKg(rawWeight) : rawWeight;
  if (weightKg < 20 || weightKg > 500) return;

  const rawWaist = num(formData, "waist");
  const waistCm = rawWaist === null ? null : units === "imperial" ? inToCm(rawWaist) : rawWaist;

  const supabase = await createClient();
  await supabase
    .from("weight_entries")
    .update({
      weight_kg: Number(weightKg.toFixed(2)),
      body_fat_pct: num(formData, "body_fat_pct"),
      waist_cm: waistCm === null ? null : Number(waistCm.toFixed(1)),
      note: str(formData, "note"),
    })
    .eq("id", id);

  revalidateWeight();
}

export async function deleteEntry(id: string) {
  const supabase = await createClient();
  await supabase.from("weight_entries").delete().eq("id", id);
  revalidateWeight();
}

export type ProfileState = { error: string | null; ok: boolean };

/** Saves height, goal and the other inputs the insights are derived from. */
export async function saveProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const units = unitsOf(formData);

  let heightCm: number | null = null;
  if (units === "imperial") {
    const feet = num(formData, "height_ft");
    const inches = num(formData, "height_in");
    if (feet !== null || inches !== null) {
      heightCm = inToCm((feet ?? 0) * 12 + (inches ?? 0));
    }
  } else {
    heightCm = num(formData, "height_cm");
  }

  if (heightCm !== null && (heightCm < 80 || heightCm > 250)) {
    return { error: "Enter a height between 80 cm and 250 cm (2′8″–8′2″).", ok: false };
  }

  const rawGoal = num(formData, "goal_weight");
  let goalKg = rawGoal === null ? null : units === "imperial" ? lbToKg(rawGoal) : rawGoal;
  if (goalKg !== null && (goalKg < 20 || goalKg > 500)) {
    return { error: "That goal weight looks off — check the number.", ok: false };
  }
  if (goalKg !== null) goalKg = Number(goalKg.toFixed(2));

  const sex = str(formData, "sex");
  const activity = str(formData, "activity_level");

  const supabase = await createClient();

  // As above: the owner's user_id is filled in by the column default.
  const { error } = await supabase.from("health_profiles").upsert(
    {
      height_cm: heightCm === null ? null : Number(heightCm.toFixed(1)),
      sex: sex === "male" || sex === "female" ? sex : null,
      birth_date: str(formData, "birth_date"),
      goal_weight_kg: goalKg,
      activity_level: activity ?? "sedentary",
      units,
    },
    { onConflict: "user_id" },
  );

  if (error) return { error: "Couldn't save your profile. Try again.", ok: false };

  revalidateWeight();
  return { error: null, ok: true };
}
