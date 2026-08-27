import { NextResponse } from "next/server";
import { searchYahooSymbols } from "@/lib/data-sources/yahoo";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  if (query.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchYahooSymbols(query);
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { results: [], error: error instanceof Error ? error.message : "Search failed" },
      { status: 502 },
    );
  }
}
