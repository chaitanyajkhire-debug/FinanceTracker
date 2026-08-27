import { fetchWithTimeout } from "@/lib/http";

// NSE has no free, stable public quote API. Yahoo Finance's chart endpoint
// covers NSE-listed equities via the ".NS" ticker suffix and is what most
// personal-finance tools use for this. It is unofficial - Yahoo sometimes
// rate-limits or blocks requests from cloud/hosting IP ranges - but is
// reliable enough in practice and requires no API key.
const FETCH_TIMEOUT_MS = 8000;

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-IN,en;q=0.9",
};

export type YahooQuote = {
  symbol: string;
  price: number;
  previousClose: number;
  currency: string;
  asOf: string; // ISO date
};

export type YahooSearchResult = {
  symbol: string; // NSE symbol without the .NS suffix
  name: string;
  exchange: string;
};

function toNseSymbol(symbol: string): string {
  const s = symbol.trim().toUpperCase();
  return s.endsWith(".NS") ? s : `${s}.NS`;
}

export async function fetchYahooQuote(symbol: string): Promise<YahooQuote | null> {
  const ticker = toNseSymbol(symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`;

  const res = await fetchWithTimeout(url, { headers: HEADERS, cache: "no-store" }, FETCH_TIMEOUT_MS);
  if (!res.ok) {
    console.error(`[yahoo] quote fetch for ${ticker} failed: HTTP ${res.status}`);
    return null;
  }

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  const meta = result?.meta;
  if (!meta || typeof meta.regularMarketPrice !== "number") {
    console.error(`[yahoo] quote fetch for ${ticker} returned no usable data:`, JSON.stringify(json).slice(0, 300));
    return null;
  }

  return {
    symbol: ticker.replace(/\.NS$/, ""),
    price: meta.regularMarketPrice,
    previousClose: meta.previousClose ?? meta.chartPreviousClose ?? meta.regularMarketPrice,
    currency: meta.currency ?? "INR",
    asOf: new Date((meta.regularMarketTime ?? Date.now() / 1000) * 1000).toISOString(),
  };
}

export async function searchYahooSymbols(query: string, limit = 15): Promise<YahooSearchResult[]> {
  const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=${limit}&newsCount=0`;

  const res = await fetchWithTimeout(url, { headers: HEADERS, cache: "no-store" }, FETCH_TIMEOUT_MS);
  if (!res.ok) {
    console.error(`[yahoo] search for "${query}" failed: HTTP ${res.status}`);
    return [];
  }

  const json = await res.json();
  const quotes: unknown[] = json?.quotes ?? [];

  const results = quotes
    .map((q) => q as Record<string, unknown>)
    .filter((q) => typeof q.symbol === "string" && (q.symbol as string).endsWith(".NS"))
    .map((q) => ({
      symbol: (q.symbol as string).replace(/\.NS$/, ""),
      name: (q.shortname as string) ?? (q.longname as string) ?? (q.symbol as string),
      exchange: (q.exchange as string) ?? "NSI",
    }));

  if (results.length === 0) {
    console.error(
      `[yahoo] search for "${query}" returned ${quotes.length} raw quotes but 0 NSE matches:`,
      JSON.stringify(json).slice(0, 500),
    );
  }

  return results;
}
