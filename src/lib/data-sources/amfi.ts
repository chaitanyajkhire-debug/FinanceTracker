import { fetchWithTimeout } from "@/lib/http";

// AMFI publishes a single pipe/semicolon-delimited text file with the NAV of
// every mutual fund scheme in India, refreshed every business day. It is the
// standard, fully public, no-auth-required source for MF NAVs - but AMFI's
// site sometimes rejects requests coming from cloud/hosting IP ranges
// (Vercel included), so we fall back to mfapi.in, a well-known free mirror
// of the same AMFI data published as JSON, when the direct fetch fails.
const AMFI_NAV_URL = "https://www.amfiindia.com/spider/webpages/spider/mfNAVAll.txt";
const MFAPI_LIST_URL = "https://api.mfapi.in/mf";
const FETCH_TIMEOUT_MS = 8000;

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/plain,*/*",
  "Accept-Language": "en-IN,en;q=0.9",
  Referer: "https://www.amfiindia.com/",
};

export type AmfiSchemeNav = {
  schemeCode: string;
  schemeName: string;
  nav: number | null;
  navDate: string | null; // ISO yyyy-mm-dd
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

function parseDdMmYyyy(raw: string): string {
  // "27-08-2026" -> "2026-08-27"
  const [day, month, year] = raw.trim().split("-");
  if (!day || !month || !year) return raw;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
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

async function fetchDirectFromAmfi(): Promise<Map<string, AmfiSchemeNav>> {
  const res = await fetchWithTimeout(
    AMFI_NAV_URL,
    { headers: BROWSER_HEADERS, cache: "no-store" },
    FETCH_TIMEOUT_MS,
  );

  if (!res.ok) {
    throw new Error(`AMFI NAV fetch failed: HTTP ${res.status}`);
  }

  const text = await res.text();
  const schemes = parseAmfiText(text);

  if (schemes.size === 0) {
    throw new Error("AMFI NAV fetch returned no parsable schemes (likely blocked/HTML response)");
  }

  return schemes;
}

async function fetchFromMfApiMirror(): Promise<Map<string, AmfiSchemeNav>> {
  const res = await fetchWithTimeout(
    MFAPI_LIST_URL,
    { headers: { Accept: "application/json" }, cache: "no-store" },
    FETCH_TIMEOUT_MS,
  );

  if (!res.ok) {
    throw new Error(`mfapi.in list fetch failed: HTTP ${res.status}`);
  }

  const list = (await res.json()) as { schemeCode: number | string; schemeName: string }[];
  const schemes = new Map<string, AmfiSchemeNav>();

  for (const entry of list) {
    const schemeCode = String(entry.schemeCode);
    if (!schemeCode || !entry.schemeName) continue;
    // No NAV in the bulk list endpoint - resolved lazily per-scheme when needed.
    schemes.set(schemeCode, { schemeCode, schemeName: entry.schemeName, nav: null, navDate: null });
  }

  if (schemes.size === 0) {
    throw new Error("mfapi.in list fetch returned no schemes");
  }

  return schemes;
}

export async function fetchAllAmfiNavs(): Promise<Map<string, AmfiSchemeNav>> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.schemes;
  }

  try {
    const schemes = await fetchDirectFromAmfi();
    cache = { fetchedAt: Date.now(), schemes };
    return schemes;
  } catch (directError) {
    console.error("[amfi] direct AMFI fetch failed, falling back to mfapi.in:", directError);
  }

  const schemes = await fetchFromMfApiMirror();
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

/** Fetches the latest NAV for one scheme directly from the mfapi.in mirror. */
async function fetchLatestNavFromMfApi(schemeCode: string): Promise<AmfiSchemeNav | null> {
  try {
    const res = await fetchWithTimeout(
      `https://api.mfapi.in/mf/${encodeURIComponent(schemeCode)}/latest`,
      { headers: { Accept: "application/json" }, cache: "no-store" },
      FETCH_TIMEOUT_MS,
    );
    if (!res.ok) return null;

    const json = await res.json();
    const point = json?.data?.[0];
    if (!point || Number.isNaN(Number.parseFloat(point.nav))) return null;

    return {
      schemeCode,
      schemeName: json?.meta?.scheme_name ?? schemeCode,
      nav: Number.parseFloat(point.nav),
      navDate: parseDdMmYyyy(point.date),
    };
  } catch (error) {
    console.error(`[amfi] mfapi.in latest-NAV lookup failed for ${schemeCode}:`, error);
    return null;
  }
}

export async function getAmfiNavByCode(schemeCode: string): Promise<AmfiSchemeNav | null> {
  const all = await fetchAllAmfiNavs();
  const entry = all.get(schemeCode) ?? null;

  if (entry?.nav != null) return entry;

  // Either unknown scheme or came from the NAV-less mfapi.in bulk list -
  // resolve the actual NAV for just this one scheme.
  return (await fetchLatestNavFromMfApi(schemeCode)) ?? entry;
}
