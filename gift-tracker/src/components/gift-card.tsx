"use client";

import { useId, useState } from "react";
import { CheckIcon, PencilIcon, TrashIcon } from "./icons";
import type { Gift, GiftDraft } from "@/lib/types";
import { cn, formatDay, optionalText } from "@/lib/utils";

type GiftCardProps = {
  gift: Gift;
  buyers: string[];
  onToggleBought: (bought: boolean) => void;
  onEdit: (draft: GiftDraft) => Promise<void>;
  onDelete: () => void;
};

export function GiftCard({
  gift,
  buyers,
  onToggleBought,
  onEdit,
  onDelete,
}: GiftCardProps) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (editing) {
    return (
      <EditGiftForm
        gift={gift}
        buyers={buyers}
        onCancel={() => setEditing(false)}
        onSave={async (draft) => {
          await onEdit(draft);
          setEditing(false);
        }}
      />
    );
  }

  const boughtOn = formatDay(gift.bought_at);

  return (
    <li className="gift-enter rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 transition hover:border-white/20 hover:bg-white/[0.07]">
      <div className="flex items-start gap-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={gift.bought}
          aria-label={
            gift.bought
              ? `Move "${gift.title}" back to the still-to-buy list`
              : `Mark "${gift.title}" as bought`
          }
          onClick={() => onToggleBought(!gift.bought)}
          className={cn(
            "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition",
            gift.bought
              ? "border-emerald-400 bg-emerald-400 text-black"
              : "border-white/25 text-transparent hover:border-emerald-300 hover:text-emerald-300/40",
          )}
        >
          <CheckIcon className="size-4" />
        </button>

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-[15px] leading-snug font-medium break-words",
              gift.bought ? "text-white/45 line-through" : "text-white",
            )}
          >
            {gift.title}
          </p>

          {gift.note && (
            <p className="mt-1 text-sm leading-snug break-words text-white/50">
              {gift.note}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
            {gift.buyer ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-400/10 px-2.5 py-1 text-xs font-medium text-rose-200 ring-1 ring-rose-400/20 ring-inset">
                <span aria-hidden>🎀</span>
                {gift.buyer}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-full px-2.5 py-1 text-xs text-white/40 ring-1 ring-white/10 ring-inset transition hover:text-white/80 hover:ring-white/25"
              >
                + Who&rsquo;s buying?
              </button>
            )}

            {gift.bought && boughtOn && (
              <span className="text-xs text-emerald-300/60">
                Bought {boughtOn}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`Edit "${gift.title}"`}
            className="rounded-lg p-2 text-white/35 transition hover:bg-white/10 hover:text-white"
          >
            <PencilIcon className="size-4.5" />
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            aria-label={`Delete "${gift.title}"`}
            className="rounded-lg p-2 text-white/35 transition hover:bg-rose-500/15 hover:text-rose-300"
          >
            <TrashIcon className="size-4.5" />
          </button>
        </div>
      </div>

      {confirmingDelete && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-rose-500/10 px-3 py-2 ring-1 ring-rose-400/25 ring-inset">
          <span className="text-sm text-rose-100">Delete this gift?</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="rounded-lg px-3 py-1.5 text-sm text-white/70 transition hover:bg-white/10"
            >
              Keep it
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg bg-rose-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-rose-400"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function EditGiftForm({
  gift,
  buyers,
  onSave,
  onCancel,
}: {
  gift: Gift;
  buyers: string[];
  onSave: (draft: GiftDraft) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(gift.title);
  const [buyer, setBuyer] = useState(gift.buyer ?? "");
  const [note, setNote] = useState(gift.note ?? "");
  const [saving, setSaving] = useState(false);
  const buyersListId = useId();

  const fieldClass =
    "w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-rose-400/60";

  return (
    <li className="rounded-2xl border border-rose-400/30 bg-white/[0.06] p-3.5">
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (title.trim().length === 0 || saving) return;
          setSaving(true);
          await onSave({
            title: title.trim().slice(0, 200),
            buyer: optionalText(buyer, 80),
            note: optionalText(note, 1000),
          });
          setSaving(false);
        }}
        className="space-y-2"
      >
        <input
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={200}
          aria-label="Gift idea"
          placeholder="Gift idea"
          className={fieldClass}
        />
        <input
          value={buyer}
          onChange={(event) => setBuyer(event.target.value)}
          maxLength={80}
          list={buyersListId}
          aria-label="Who's buying (optional)"
          placeholder="Who's buying? (optional)"
          className={fieldClass}
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
          aria-label="Note (optional)"
          placeholder="Note (optional)"
          className={fieldClass}
        />

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-3 py-2 text-sm text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={title.trim().length === 0 || saving}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </li>
  );
}
