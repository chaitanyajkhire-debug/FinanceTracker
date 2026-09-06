"use client";

import { useId, useRef, useState } from "react";
import { PlusIcon } from "./icons";
import type { GiftDraft } from "@/lib/types";
import { optionalText } from "@/lib/utils";

export function AddGiftForm({
  onAdd,
  buyers,
}: {
  onAdd: (draft: GiftDraft) => Promise<void>;
  buyers: string[];
}) {
  const [title, setTitle] = useState("");
  const [buyer, setBuyer] = useState("");
  const [note, setNote] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const buyersListId = useId();

  const canSubmit = title.trim().length > 0 && !saving;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    await onAdd({
      title: title.trim().slice(0, 200),
      buyer: optionalText(buyer, 80),
      note: optionalText(note, 1000),
    });
    setSaving(false);

    setTitle("");
    setBuyer("");
    setNote("");
    titleRef.current?.focus();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-white/10 bg-white/[0.05] p-3 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-4"
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          ref={titleRef}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={200}
          placeholder="Add a gift idea…"
          aria-label="Gift idea"
          className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-base text-white placeholder:text-white/35 outline-none transition focus:border-rose-400/60 focus:ring-2 focus:ring-rose-400/20"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 px-5 py-3 text-base font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
        >
          <PlusIcon className="size-4" />
          {saving ? "Adding…" : "Add gift"}
        </button>
      </div>

      <button
        type="button"
        onClick={() => setShowDetails((open) => !open)}
        aria-expanded={showDetails}
        className="mt-2 px-1 text-sm text-white/50 transition hover:text-white/80"
      >
        {showDetails ? "Hide details" : "Add who's buying or a note"}
      </button>

      {showDetails && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <input
            value={buyer}
            onChange={(event) => setBuyer(event.target.value)}
            maxLength={80}
            list={buyersListId}
            placeholder="Who's buying? (optional)"
            aria-label="Who's buying (optional)"
            className="rounded-2xl border border-white/10 bg-black/25 px-4 py-2.5 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-rose-400/60"
          />
          <datalist id={buyersListId}>
            {buyers.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={1000}
            placeholder="Note — size, colour, shop link… (optional)"
            aria-label="Note (optional)"
            className="rounded-2xl border border-white/10 bg-black/25 px-4 py-2.5 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-rose-400/60"
          />
        </div>
      )}
    </form>
  );
}
