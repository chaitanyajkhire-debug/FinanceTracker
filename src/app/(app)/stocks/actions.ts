"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fetchYahooQuote } from "@/lib/data-sources/yahoo";

function num(formData: FormData, key: string): number {
  const value = Number.parseFloat(String(formData.get(key) ?? ""));
  return Number.isFinite(value) ? value : 0;
}

function str(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
}

export async function addStock(formData: FormData) {
  const supabase = await createClient();

  const symbol = str(formData, "symbol")?.toUpperCase();
  const companyName = str(formData, "company_name");
  if (!symbol || !companyName) return;

  const quantity = num(formData, "quantity");
  const avgPrice = num(formData, "avg_price");

  const quote = await fetchYahooQuote(symbol).catch(() => null);

  await supabase.from("stocks").insert({
    symbol,
    company_name: companyName,
    sector: str(formData, "sector"),
    quantity,
    avg_price: avgPrice,
    purchase_date: str(formData, "purchase_date"),
    current_price: quote?.price ?? avgPrice,
    current_price_date: quote?.asOf.slice(0, 10) ?? null,
    previous_close: quote?.previousClose ?? avgPrice,
  });

  revalidatePath("/stocks");
  revalidatePath("/");
}

export async function updateStock(id: string, formData: FormData) {
  const supabase = await createClient();

  await supabase
    .from("stocks")
    .update({
      sector: str(formData, "sector"),
      quantity: num(formData, "quantity"),
      avg_price: num(formData, "avg_price"),
      purchase_date: str(formData, "purchase_date"),
    })
    .eq("id", id);

  revalidatePath("/stocks");
  revalidatePath("/");
}

export async function deleteStock(id: string) {
  const supabase = await createClient();
  await supabase.from("stocks").delete().eq("id", id);
  revalidatePath("/stocks");
  revalidatePath("/");
}
