"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RefreshButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleRefresh() {
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      const data = await res.json();
      setMessage(res.ok ? "Updated" : data.error ?? "Refresh failed");
      router.refresh();
    } catch {
      setMessage("Refresh failed");
    } finally {
      setPending(false);
      setTimeout(() => setMessage(null), 4000);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {message && <span className="text-xs text-slate-400">{message}</span>}
      <button
        type="button"
        onClick={handleRefresh}
        disabled={pending}
        className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-slate-800 disabled:opacity-60"
      >
        <span className={pending ? "animate-spin" : ""}>↻</span>
        {pending ? "Refreshing…" : "Refresh now"}
      </button>
    </div>
  );
}
