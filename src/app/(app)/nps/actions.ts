"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function num(formData: FormData, key: string): number {
  const value = Number.parseFloat(String(formData.get(key) ?? ""));
  return Number.isFinite(value) ? value : 0;
}

function str(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
}

export async function addNpsScheme(formData: FormData) {
  const supabase = await createClient();

  const schemeName = str(formData, "scheme_name");
  if (!schemeName) return;

  const units = num(formData, "units");
  const avgCost = num(formData, "avg_cost_per_unit");
  const currentNav = num(formData, "current_nav") || avgCost;

  await supabase.from("nps_schemes").insert({
    pran: str(formData, "pran"),
    scheme_name: schemeName,
    fund_manager: str(formData, "fund_manager"),
    tier: (str(formData, "tier") as "Tier I" | "Tier II") ?? "Tier I",
    asset_class: str(formData, "asset_class") as "E" | "C" | "G" | "A" | null,
    units,
    avg_cost_per_unit: avgCost,
    current_nav: currentNav,
    current_nav_date: str(formData, "current_nav_date") ?? new Date().toISOString().slice(0, 10),
  });

  revalidatePath("/nps");
  revalidatePath("/");
}

export async function updateNpsScheme(id: string, formData: FormData) {
  const supabase = await createClient();

  await supabase
    .from("nps_schemes")
    .update({
      pran: str(formData, "pran"),
      fund_manager: str(formData, "fund_manager"),
      tier: (str(formData, "tier") as "Tier I" | "Tier II") ?? "Tier I",
      asset_class: str(formData, "asset_class") as "E" | "C" | "G" | "A" | null,
      units: num(formData, "units"),
      avg_cost_per_unit: num(formData, "avg_cost_per_unit"),
      current_nav: num(formData, "current_nav"),
      current_nav_date: str(formData, "current_nav_date"),
    })
    .eq("id", id);

  revalidatePath("/nps");
  revalidatePath("/");
}

export async function deleteNpsScheme(id: string) {
  const supabase = await createClient();
  await supabase.from("nps_schemes").delete().eq("id", id);
  revalidatePath("/nps");
  revalidatePath("/");
}
