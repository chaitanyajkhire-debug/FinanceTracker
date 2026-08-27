// AMFI publishes a single pipe/semicolon-delimited text file with the NAV of
// every mutual fund scheme in India, refreshed every business day. It is the
// standard, fully public, no-auth-required source for MF NAVs.
const AMFI_NAV_URL = "https://www.amfiindia.com/spider/webpages/spider/mfNAVAll.txt";

export type AmfiSchemeNav = {
  schemeCode: string;
  schemeName: string;
  nav: number;
  navDate: string; // ISO yyyy-mm-dd
};

let cache: { fetchedAt: number; schemes: Map<string, AmfiSchemeNav> } | null = null;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours - AMFI publishes once a day

function parseAmfiDate(raw: string): string {
  // "27-Aug-2026" -> "2026-08-27"
  const months: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  const [day, mon, year] = raw.trim().split("-");
  const month = months[mon];
  if (!day || !month || !year) return raw;
  return `${year}-${month}-${day.padStart(2, "0")}`;
}

function parseAmfiText(text: string): Map<string, AmfiSchemeNav> {
  const schemes = new Map<string, AmfiSchemeNav>();

  for (const line of text.split("\n")) {
    const parts = line.split(";");
    if (parts.length !== 6) continue; // section headers / blank lines

    const [schemeCode, , , schemeName, navRaw, dateRaw] = parts.map((p) => p.trim());
    const nav = Number.parseFloat(navRaw);
    if (!schemeCode || !schemeName || Number.isNaN(nav)) continue;

    schemes.set(schemeCode, {
      schemeCode,
      schemeName,
      nav,
      navDate: parseAmfiDate(dateRaw),
    });
  }

  return schemes;
}

export async function fetchAllAmfiNavs(): Promise<Map<string, AmfiSchemeNav>> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.schemes;
  }

  const res = await fetch(AMFI_NAV_URL, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; FinanceTracker/1.0)" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`AMFI NAV fetch failed: HTTP ${res.status}`);
  }

  const text = await res.text();
  const schemes = parseAmfiText(text);

  if (schemes.size === 0) {
    throw new Error("AMFI NAV fetch returned no parsable schemes");
  }

  cache = { fetchedAt: Date.now(), schemes };
  return schemes;
}

export async function searchAmfiSchemes(query: string, limit = 20): Promise<AmfiSchemeNav[]> {
  const all = await fetchAllAmfiNavs();
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  const results: AmfiSchemeNav[] = [];
  for (const scheme of all.values()) {
    if (
      scheme.schemeName.toLowerCase().includes(needle) ||
      scheme.schemeCode === needle
    ) {
      results.push(scheme);
      if (results.length >= limit) break;
    }
  }
  return results;
}

export async function getAmfiNavByCode(schemeCode: string): Promise<AmfiSchemeNav | null> {
  const all = await fetchAllAmfiNavs();
  return all.get(schemeCode) ?? null;
}
