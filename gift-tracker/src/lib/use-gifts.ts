"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "./supabase";
import type { Gift, GiftDraft } from "./types";

export type SyncStatus = "connecting" | "live" | "offline";

function byCreatedAt(a: Gift, b: Gift) {
  return a.created_at.localeCompare(b.created_at);
}

/**
 * The whole board's state: the initial list is rendered on the server, then
 * kept in sync with everyone else's phones and laptops over Supabase
 * realtime. Every mutation is applied locally first so the person tapping
 * sees the result immediately, and rolled back if the write fails.
 */
export function useGifts(initialGifts: Gift[]) {
  const [gifts, setGifts] = useState<Gift[]>(initialGifts);
  const [status, setStatus] = useState<SyncStatus>("connecting");
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => getSupabase(), []);

  const refresh = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from("gifts")
      .select("*")
      .order("created_at", { ascending: true });

    if (loadError) {
      setStatus("offline");
      return;
    }

    setGifts((data as Gift[]) ?? []);
  }, [supabase]);

  // Live updates from everyone else editing the same board.
  useEffect(() => {
    const channel = supabase
      .channel("gifts-board")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gifts" },
        (payload) => {
          setGifts((current) => {
            if (payload.eventType === "DELETE") {
              const removed = payload.old as Partial<Gift>;
              return current.filter((gift) => gift.id !== removed.id);
            }

            const incoming = payload.new as Gift;
            const known = current.some((gift) => gift.id === incoming.id);

            return known
              ? current.map((gift) => (gift.id === incoming.id ? incoming : gift))
              : [...current, incoming].sort(byCreatedAt);
          });
        },
      )
      .subscribe((channelStatus) => {
        if (channelStatus === "SUBSCRIBED") {
          setStatus("live");
          // Catch anything that changed while the socket was down.
          void refresh();
        } else if (channelStatus === "CHANNEL_ERROR" || channelStatus === "TIMED_OUT") {
          setStatus("offline");
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, refresh]);

  // Phones suspend sockets in the background - re-sync when we come back.
  useEffect(() => {
    const resync = () => {
      if (document.visibilityState === "visible") void refresh();
    };

    document.addEventListener("visibilitychange", resync);
    window.addEventListener("online", resync);
    return () => {
      document.removeEventListener("visibilitychange", resync);
      window.removeEventListener("online", resync);
    };
  }, [refresh]);

  const addGift = useCallback(
    async (draft: GiftDraft) => {
      const now = new Date().toISOString();
      const optimistic: Gift = {
        id: crypto.randomUUID(),
        title: draft.title,
        note: draft.note,
        buyer: draft.buyer,
        bought: false,
        bought_at: null,
        created_at: now,
        updated_at: now,
      };

      setError(null);
      setGifts((current) => [...current, optimistic]);

      const { error: insertError } = await supabase.from("gifts").insert({
        id: optimistic.id,
        title: optimistic.title,
        note: optimistic.note,
        buyer: optimistic.buyer,
      });

      if (insertError) {
        setGifts((current) => current.filter((gift) => gift.id !== optimistic.id));
        setError("Couldn't save that gift. Check your connection and try again.");
      }
    },
    [supabase],
  );

  const patchGift = useCallback(
    async (id: string, patch: Partial<Gift>, failureMessage: string) => {
      let previous: Gift | undefined;

      setError(null);
      setGifts((current) =>
        current.map((gift) => {
          if (gift.id !== id) return gift;
          previous = gift;
          return { ...gift, ...patch };
        }),
      );

      const { error: updateError } = await supabase
        .from("gifts")
        .update(patch)
        .eq("id", id);

      if (updateError && previous) {
        const restored = previous;
        setGifts((current) =>
          current.map((gift) => (gift.id === id ? restored : gift)),
        );
        setError(failureMessage);
      }
    },
    [supabase],
  );

  const editGift = useCallback(
    (id: string, draft: GiftDraft) =>
      patchGift(
        id,
        { title: draft.title, buyer: draft.buyer, note: draft.note },
        "Couldn't save your changes. Check your connection and try again.",
      ),
    [patchGift],
  );

  const setBought = useCallback(
    (id: string, bought: boolean) =>
      patchGift(
        id,
        { bought, bought_at: bought ? new Date().toISOString() : null },
        "Couldn't update that gift. Check your connection and try again.",
      ),
    [patchGift],
  );

  const removeGift = useCallback(
    async (id: string) => {
      const removed = gifts.find((gift) => gift.id === id);

      setError(null);
      setGifts((current) => current.filter((gift) => gift.id !== id));

      const { error: deleteError } = await supabase
        .from("gifts")
        .delete()
        .eq("id", id);

      if (deleteError && removed) {
        setGifts((current) => [...current, removed].sort(byCreatedAt));
        setError("Couldn't delete that gift. Check your connection and try again.");
      }
    },
    [supabase, gifts],
  );

  return {
    gifts,
    status,
    error,
    dismissError: useCallback(() => setError(null), []),
    addGift,
    editGift,
    setBought,
    removeGift,
  };
}
