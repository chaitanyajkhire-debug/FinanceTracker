import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runRefresh } from "@/lib/refresh";

// Manual "Refresh now" button on the dashboard. Runs as the logged-in user,
// so RLS scopes it to that user's own holdings only.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await runRefresh(supabase);
  return NextResponse.json(summary);
}
