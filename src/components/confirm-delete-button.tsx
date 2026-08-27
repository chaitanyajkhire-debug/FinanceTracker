"use client";

import { useTransition } from "react";

export function ConfirmDeleteButton({
  action,
  confirmText = "Delete this holding? This cannot be undone.",
}: {
  action: () => Promise<void>;
  confirmText?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (window.confirm(confirmText)) {
          startTransition(async () => {
            await action();
          });
        }
      }}
      className="text-xs font-medium text-red-400 transition hover:text-red-300 disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
