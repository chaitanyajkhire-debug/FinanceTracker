import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runRefresh } from "@/lib/refresh";

// Triggered every morning by Vercel Cron (see vercel.json). Runs across all
// holdings with the service-role client, which bypasses RLS.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const summary = await runRefresh(supabase);

  return NextResponse.json(summary);
}
