"use client";

import { useEffect, useMemo, useState } from "react";
import { AddGiftForm } from "./add-gift-form";
import { Confetti } from "./confetti";
import { GiftCard } from "./gift-card";
import { ProgressRing } from "./progress-ring";
import { SearchIcon } from "./icons";
import { GIFT_GOAL } from "@/lib/config";
import type { Gift } from "@/lib/types";
import { useGifts, type SyncStatus } from "@/lib/use-gifts";
import { cn } from "@/lib/utils";

type View = "todo" | "bought";

export function GiftBoard({ initialGifts }: { initialGifts: Gift[] }) {
  const {
    gifts,
    status,
    error,
    dismissError,
    addGift,
    editGift,
    setBought,
    removeGift,
  } = useGifts(initialGifts);

  const [view, setView] = useState<View>("todo");
  const [query, setQuery] = useState("");
  const [celebrating, setCelebrating] = useState(false);

  const boughtCount = gifts.filter((gift) => gift.bought).length;
  const todoCount = gifts.length - boughtCount;
  const ideasNeeded = Math.max(0, GIFT_GOAL - gifts.length);

  // A little fanfare the moment the fortieth gift is ticked off - only when
  // the count actually changes, so reloading a finished board stays calm.
  const [lastBoughtCount, setLastBoughtCount] = useState(boughtCount);
  if (lastBoughtCount !== boughtCount) {
    setLastBoughtCount(boughtCount);
    setCelebrating(boughtCount >= GIFT_GOAL);
  }

  useEffect(() => {
    if (!celebrating) return;
    const timer = window.setTimeout(() => setCelebrating(false), 7000);
    return () => window.clearTimeout(timer);
  }, [celebrating]);

  const buyers = useMemo(
    () =>
      Array.from(
        new Set(
          gifts
            .map((gift) => gift.buyer?.trim())
            .filter((name): name is string => Boolean(name)),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [gifts],
  );

  const { todo, bought } = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = (gift: Gift) =>
      needle.length === 0 ||
      [gift.title, gift.note, gift.buyer]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(needle));

    const visible = gifts.filter(matches);

    return {
      todo: visible
        .filter((gift) => !gift.bought)
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
      bought: visible
        .filter((gift) => gift.bought)
        .sort((a, b) =>
          (b.bought_at ?? b.updated_at).localeCompare(a.bought_at ?? a.updated_at),
        ),
    };
  }, [gifts, query]);

  const cardProps = (gift: Gift) => ({
    gift,
    buyers,
    onToggleBought: (next: boolean) => void setBought(gift.id, next),
    onEdit: (draft: Parameters<typeof editGift>[1]) => editGift(gift.id, draft),
    onDelete: () => void removeGift(gift.id),
  });

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-8 pb-28 sm:px-6 sm:pt-12">
      {celebrating && <Confetti />}

      <header>
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60 ring-1 ring-white/10 ring-inset">
            <span aria-hidden>🤫</span> Secret board — don&rsquo;t tell Harshita
          </span>
          <SyncBadge status={status} />
        </div>

        <h1 className="font-display mt-6 text-5xl leading-none text-white sm:text-6xl">
          Harshita&rsquo;s{" "}
          <span className="bg-gradient-to-r from-rose-400 via-amber-300 to-emerald-300 bg-clip-text text-transparent">
            40th
          </span>
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/55">
          Forty gifts from the people who love her. Add an idea, put your name
          on the one you&rsquo;re buying, tick it off when it&rsquo;s in your
          hands.
        </p>

        <div className="mt-7 flex flex-col items-center gap-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl sm:flex-row sm:gap-8 sm:p-6">
          <ProgressRing value={boughtCount} goal={GIFT_GOAL} />
          <div className="w-full">
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <Stat label="Bought" value={boughtCount} tone="emerald" />
              <Stat label="Still to buy" value={todoCount} tone="rose" />
              <Stat label="Ideas needed" value={ideasNeeded} tone="amber" />
            </div>
            <p className="mt-4 text-sm text-white/50">
              {boughtCount >= GIFT_GOAL
                ? "All forty gifts are in. She is going to lose it. 🎉"
                : ideasNeeded > 0
                  ? `${ideasNeeded} more ${ideasNeeded === 1 ? "idea" : "ideas"} to reach forty, and ${todoCount} waiting to be bought.`
                  : `All forty ideas are down — ${todoCount} still to buy.`}
            </p>
          </div>
        </div>
      </header>

      <div className="mt-6">
        <AddGiftForm onAdd={addGift} buyers={buyers} />
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-rose-500/15 px-4 py-3 text-sm text-rose-100 ring-1 ring-rose-400/30 ring-inset"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={dismissError}
            className="shrink-0 rounded-lg px-2 py-1 text-rose-200/80 transition hover:bg-white/10"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-xs sm:flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-white/35" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search gifts or names…"
            aria-label="Search gifts"
            className="w-full rounded-2xl border border-white/10 bg-black/25 py-2.5 pr-4 pl-10 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-rose-400/60"
          />
        </div>

        <div
          role="tablist"
          aria-label="Which list to show"
          className="flex rounded-2xl bg-white/5 p-1 ring-1 ring-white/10 ring-inset lg:hidden"
        >
          <Tab
            active={view === "todo"}
            onClick={() => setView("todo")}
            label="Still to buy"
            count={todo.length}
          />
          <Tab
            active={view === "bought"}
            onClick={() => setView("bought")}
            label="Gift bought"
            count={bought.length}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <Column
          title="Still to buy"
          count={todo.length}
          accent="rose"
          hiddenOnMobile={view !== "todo"}
          empty={
            gifts.length === 0
              ? "No gifts yet. Add the very first idea above."
              : query
                ? "Nothing here matches that search."
                : "Every idea has been bought. Incredible. 🎉"
          }
        >
          {todo.map((gift) => (
            <GiftCard key={gift.id} {...cardProps(gift)} />
          ))}
        </Column>

        <Column
          title="Gift bought"
          count={bought.length}
          accent="emerald"
          hiddenOnMobile={view !== "bought"}
          empty={
            query
              ? "Nothing here matches that search."
              : "Nothing ticked off yet. Tap the circle on a gift once you've bought it."
          }
        >
          {bought.map((gift) => (
            <GiftCard key={gift.id} {...cardProps(gift)} />
          ))}
        </Column>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "rose" | "amber";
}) {
  const toneClass = {
    emerald: "text-emerald-300",
    rose: "text-rose-300",
    amber: "text-amber-300",
  }[tone];

  return (
    <div className="rounded-2xl bg-black/20 px-3 py-3 text-center ring-1 ring-white/10 ring-inset sm:text-left">
      <div className={cn("text-2xl font-semibold tabular-nums", toneClass)}>
        {value}
      </div>
      <div className="mt-0.5 text-xs text-white/45">{label}</div>
    </div>
  );
}

function Tab({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex-1 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap transition",
        active ? "bg-white text-black" : "text-white/60 hover:text-white",
      )}
    >
      {label}
      <span className={cn("ml-1.5 tabular-nums", active ? "text-black/50" : "text-white/35")}>
        {count}
      </span>
    </button>
  );
}

function Column({
  title,
  count,
  accent,
  empty,
  hiddenOnMobile,
  children,
}: {
  title: string;
  count: number;
  accent: "rose" | "emerald";
  empty: string;
  hiddenOnMobile: boolean;
  children: React.ReactNode[];
}) {
  const dotClass = accent === "rose" ? "bg-rose-400" : "bg-emerald-400";

  return (
    <section className={cn("lg:block", hiddenOnMobile && "hidden")}>
      {/* On small screens the tab bar already names the list and its count. */}
      <h2 className="mb-3 hidden items-center gap-2 px-1 text-sm font-semibold tracking-wide text-white/70 uppercase lg:flex">
        <span className={cn("size-2 rounded-full", dotClass)} aria-hidden />
        {title}
        <span className="text-white/35 tabular-nums">{count}</span>
      </h2>

      {count === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-white/40">
          {empty}
        </p>
      ) : (
        <ul className="space-y-2.5">{children}</ul>
      )}
    </section>
  );
}

function SyncBadge({ status }: { status: SyncStatus }) {
  const config = {
    connecting: { label: "Connecting", dot: "bg-amber-400", pulse: true },
    live: { label: "Live", dot: "bg-emerald-400", pulse: true },
    offline: { label: "Offline", dot: "bg-white/40", pulse: false },
  }[status];

  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs text-white/55 ring-1 ring-white/10 ring-inset">
      <span
        className={cn(
          "size-1.5 rounded-full",
          config.dot,
          config.pulse && "animate-pulse",
        )}
        aria-hidden
      />
      {config.label}
    </span>
  );
}
