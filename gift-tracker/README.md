# Harshita's 40th — Gift Board

A shared board for planning the 40 gifts for Harshita's surprise 40th
birthday party. Everyone helping with the party opens the same link on their
phone or laptop, adds ideas, puts their name against the gift they're
buying, and ticks it off once it's bought.

## What it does

- **Add, edit and delete** any gift line item — title, an optional note
  (size, colour, shop link…) and an optional **who's buying** name.
- **Mark a gift bought** by tapping the circle. It moves straight into the
  **Gift bought** list; tapping again moves it back.
- **Live sync.** Everything is shared over Supabase realtime, so when one
  person ticks a gift off, it moves on everyone else's screen within a
  second. The badge at the top of the page shows the connection state.
- **Progress toward forty** — a ring showing gifts bought out of 40, plus
  counts of what's still to buy and how many more ideas are needed. Confetti
  when the fortieth gift lands.
- **Search** across gift names, notes and buyer names.
- **Desktop and mobile.** Two columns side by side on a laptop; a tab
  switcher between the two lists on a phone.
- Every change is applied on screen immediately and rolled back with an
  error message if the save doesn't reach the server.

## Who can use it

Anyone with the link — there are no accounts and no password. That is a
deliberate choice: it makes the board effortless for a group of friends who
just want to add a gift and get on with their day. The trade-off is that the
link is the only secret, so share it with the party group and not anywhere
Harshita might see it.

The Supabase publishable key in `src/lib/config.ts` matches that model. It is
the key Supabase designs to ship in browser bundles, and the Row Level
Security policies in `supabase/migrations/0001_gifts.sql` scope it to the
`gifts` table and nothing else.

If you'd rather gate it, the smallest change is a shared party passcode
checked in a Next.js proxy (middleware) with a signed cookie, plus tightening
the RLS policies to server-side writes only.

## Tech

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com)
- [Supabase](https://supabase.com) — Postgres, Row Level Security, Realtime
- Deployed on [Vercel](https://vercel.com)

## Running it locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000. No environment file is needed — the Supabase
project details are in `src/lib/config.ts`.

## Pointing it at a different Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Run `supabase/migrations/0001_gifts.sql` in the SQL editor. It creates the
   `gifts` table, the timestamp trigger, the RLS policies and adds the table
   to the realtime publication.
3. Copy `.env.example` to `.env.local` and fill in the project URL and
   publishable key (Project Settings → API). On Vercel, set the same two
   variables in the project's environment variables.

## Project structure

```
src/app/page.tsx            Server component: first load of the gift list
src/app/layout.tsx          Fonts, metadata, background
src/components/gift-board   The board: header, progress, lists, search, tabs
src/components/gift-card    A single gift, plus its inline edit form
src/components/add-gift-form Quick-add with optional buyer and note
src/lib/use-gifts.ts        Realtime subscription + optimistic mutations
src/lib/config.ts           Supabase project details and the goal of 40
supabase/migrations/        SQL schema, RLS policies, realtime publication
```
