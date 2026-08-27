"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAmfiNavByCode } from "@/lib/data-sources/amfi";

function num(formData: FormData, key: string): number {
  const value = Number.parseFloat(String(formData.get(key) ?? ""));
  return Number.isFinite(value) ? value : 0;
}

function str(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
}

export async function addMutualFund(formData: FormData) {
  const supabase = await createClient();

  const schemeCode = str(formData, "scheme_code");
  const schemeName = str(formData, "scheme_name");
  if (!schemeCode || !schemeName) return;

  const units = num(formData, "units");
  const avgCost = num(formData, "avg_cost_per_unit");

  const nav = await getAmfiNavByCode(schemeCode).catch(() => null);

  await supabase.from("mutual_funds").insert({
    scheme_code: schemeCode,
    scheme_name: schemeName,
    folio_number: str(formData, "folio_number"),
    category: str(formData, "category"),
    units,
    avg_cost_per_unit: avgCost,
    purchase_date: str(formData, "purchase_date"),
    current_nav: nav?.nav ?? avgCost,
    current_nav_date: nav?.navDate ?? null,
  });

  revalidatePath("/mutual-funds");
  revalidatePath("/");
}

export async function updateMutualFund(id: string, formData: FormData) {
  const supabase = await createClient();

  await supabase
    .from("mutual_funds")
    .update({
      folio_number: str(formData, "folio_number"),
      category: str(formData, "category"),
      units: num(formData, "units"),
      avg_cost_per_unit: num(formData, "avg_cost_per_unit"),
      purchase_date: str(formData, "purchase_date"),
    })
    .eq("id", id);

  revalidatePath("/mutual-funds");
  revalidatePath("/");
}

export async function deleteMutualFund(id: string) {
  const supabase = await createClient();
  await supabase.from("mutual_funds").delete().eq("id", id);
  revalidatePath("/mutual-funds");
  revalidatePath("/");
}
