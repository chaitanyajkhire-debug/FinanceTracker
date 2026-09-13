import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runRefresh } from "@/lib/refresh";

export const maxDuration = 60;

// Manual "Refresh now" button on the dashboard. The app has no sign-in, so
// this runs as the anon role and RLS scopes it to the owner's holdings.
export async function POST() {
  const supabase = await createClient();
  const summary = await runRefresh(supabase);
  return NextResponse.json(summary);
}
