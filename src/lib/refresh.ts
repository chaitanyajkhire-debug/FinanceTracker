import type { SupabaseClient } from "@supabase/supabase-js";
import type { MutualFund, NpsScheme, Stock } from "@/lib/supabase/types";
import { fetchAllAmfiNavs } from "@/lib/data-sources/amfi";
import { fetchYahooQuote } from "@/lib/data-sources/yahoo";

export type RefreshSummary = {
  status: "success" | "partial" | "failed";
  mfUpdated: number;
  mfFailed: number;
  stocksUpdated: number;
  stocksFailed: number;
  message: string;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

async function refreshMutualFunds(
  supabase: SupabaseClient,
  funds: MutualFund[],
): Promise<{ updated: number; failed: number }> {
  if (funds.length === 0) return { updated: 0, failed: 0 };

  let navs;
  try {
    navs = await fetchAllAmfiNavs();
  } catch {
    return { updated: 0, failed: funds.length };
  }

  let updated = 0;
  let failed = 0;

  for (const fund of funds) {
    const nav = navs.get(fund.scheme_code);
    if (!nav) {
      failed += 1;
      continue;
    }

    const { error } = await supabase
      .from("mutual_funds")
      .update({
        previous_nav: fund.current_nav ?? nav.nav,
        current_nav: nav.nav,
        current_nav_date: nav.navDate,
      })
      .eq("id", fund.id);

    if (error) {
      failed += 1;
    } else {
      updated += 1;
      fund.current_nav = nav.nav; // keep in-memory copy fresh for the snapshot pass
    }
  }

  return { updated, failed };
}

async function refreshStocks(
  supabase: SupabaseClient,
  stocks: Stock[],
): Promise<{ updated: number; failed: number }> {
  let updated = 0;
  let failed = 0;

  // Dedupe by symbol so multiple holdings of the same stock only fetch once.
  const quoteCache = new Map<string, Awaited<ReturnType<typeof fetchYahooQuote>>>();

  for (const stock of stocks) {
    try {
      if (!quoteCache.has(stock.symbol)) {
        quoteCache.set(stock.symbol, await fetchYahooQuote(stock.symbol));
      }
      const quote = quoteCache.get(stock.symbol);

      if (!quote) {
        failed += 1;
        continue;
      }

      const { error } = await supabase
        .from("stocks")
        .update({
          previous_close: quote.previousClose,
          current_price: quote.price,
          current_price_date: quote.asOf.slice(0, 10),
        })
        .eq("id", stock.id);

      if (error) {
        failed += 1;
      } else {
        updated += 1;
        stock.current_price = quote.price; // keep in-memory copy fresh for the snapshot pass
      }
    } catch {
      failed += 1;
    }
  }

  return { updated, failed };
}

function valueAndInvested(
  funds: MutualFund[],
  stocks: Stock[],
  nps: NpsScheme[],
) {
  const mfValue = funds.reduce((sum, f) => sum + f.units * (f.current_nav ?? f.avg_cost_per_unit), 0);
  const mfInvested = funds.reduce((sum, f) => sum + f.units * f.avg_cost_per_unit, 0);

  const stockValue = stocks.reduce((sum, s) => sum + s.quantity * (s.current_price ?? s.avg_price), 0);
  const stockInvested = stocks.reduce((sum, s) => sum + s.quantity * s.avg_price, 0);

  const npsValue = nps.reduce((sum, n) => sum + n.units * (n.current_nav ?? n.avg_cost_per_unit), 0);
  const npsInvested = nps.reduce((sum, n) => sum + n.units * n.avg_cost_per_unit, 0);

  return {
    mfValue,
    stockValue,
    npsValue,
    totalValue: mfValue + stockValue + npsValue,
    totalInvested: mfInvested + stockInvested + npsInvested,
  };
}

/**
 * Refreshes MF NAVs and stock prices for every holding visible to `supabase`
 * (all users for the admin/service-role client, just the caller when scoped
 * by RLS), then writes a per-user snapshot and refresh log row for today.
 */
export async function runRefresh(supabase: SupabaseClient): Promise<RefreshSummary> {
  const [{ data: funds, error: fundsError }, { data: stocks, error: stocksError }, { data: nps, error: npsError }] =
    await Promise.all([
      supabase.from("mutual_funds").select("*"),
      supabase.from("stocks").select("*"),
      supabase.from("nps_schemes").select("*"),
    ]);

  if (fundsError || stocksError || npsError) {
    return {
      status: "failed",
      mfUpdated: 0,
      mfFailed: 0,
      stocksUpdated: 0,
      stocksFailed: 0,
      message: (fundsError ?? stocksError ?? npsError)?.message ?? "Failed to load holdings",
    };
  }

  const allFunds = funds ?? [];
  const allStocks = stocks ?? [];
  const allNps = nps ?? [];

  const [mfResult, stockResult] = await Promise.all([
    refreshMutualFunds(supabase, allFunds),
    refreshStocks(supabase, allStocks),
  ]);

  const userIds = new Set<string>([
    ...allFunds.map((f) => f.user_id),
    ...allStocks.map((s) => s.user_id),
    ...allNps.map((n) => n.user_id),
  ]);
  const date = todayIso();

  const totalFailed = mfResult.failed + stockResult.failed;
  const totalAttempted = allFunds.length + allStocks.length;
  const status: RefreshSummary["status"] =
    totalFailed === 0 ? "success" : totalFailed === totalAttempted && totalAttempted > 0 ? "failed" : "partial";
  const message = `Updated ${mfResult.updated}/${allFunds.length} mutual funds and ${stockResult.updated}/${allStocks.length} stocks.`;

  for (const userId of userIds) {
    const { totalValue, totalInvested, mfValue, stockValue, npsValue } = valueAndInvested(
      allFunds.filter((f) => f.user_id === userId),
      allStocks.filter((s) => s.user_id === userId),
      allNps.filter((n) => n.user_id === userId),
    );

    await supabase.from("daily_snapshots").upsert(
      {
        user_id: userId,
        snapshot_date: date,
        mutual_funds_value: mfValue,
        stocks_value: stockValue,
        nps_value: npsValue,
        total_value: totalValue,
        total_invested: totalInvested,
      },
      { onConflict: "user_id,snapshot_date" },
    );

    await supabase.from("refresh_logs").insert({
      user_id: userId,
      status,
      mf_updated: mfResult.updated,
      mf_failed: mfResult.failed,
      stocks_updated: stockResult.updated,
      stocks_failed: stockResult.failed,
      message,
    });
  }

  return {
    status,
    mfUpdated: mfResult.updated,
    mfFailed: mfResult.failed,
    stocksUpdated: stockResult.updated,
    stocksFailed: stockResult.failed,
    message,
  };
}
