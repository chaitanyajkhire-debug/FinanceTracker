import { GiftBoard } from "@/components/gift-board";
import { getSupabase } from "@/lib/supabase";
import type { Gift } from "@/lib/types";

// The board is shared and changes all day - never serve a prerendered copy.
export const dynamic = "force-dynamic";

export default async function Page() {
  const { data } = await getSupabase()
    .from("gifts")
    .select("*")
    .order("created_at", { ascending: true });

  return <GiftBoard initialGifts={(data as Gift[] | null) ?? []} />;
}
