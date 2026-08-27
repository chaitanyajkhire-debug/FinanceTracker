# FinanceTracker

A personal dashboard for tracking Indian Mutual Funds, Stocks (NSE) and NPS
holdings in one place, with daily automatic NAV/price updates.

## Features

- **Dashboard** — total portfolio value, invested amount, overall gain/loss,
  today's change, asset allocation donut chart, portfolio value over time
  chart, and a "today's biggest movers" list.
- **Mutual Funds** — add holdings by searching AMFI scheme names, tracks
  units, average cost, current NAV, gain/loss and day change.
- **Stocks** — add holdings by searching NSE symbols (via Yahoo Finance),
  tracks quantity, average price, LTP, gain/loss and day change.
- **NPS** — manual NAV entry (no public NPS NAV feed exists), tracks units,
  average cost and computed value per scheme/tier.
- **Daily auto-refresh** — a scheduled job pulls fresh Mutual Fund NAVs from
  AMFI and stock prices from Yahoo Finance (NSE `.NS` tickers) every morning,
  and records a daily portfolio snapshot for the value-over-time chart. A
  manual "Refresh now" button is also available on every page.
- Single-user login (Supabase Auth), with Row Level Security on every table.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript + Tailwind CSS
- [Supabase](https://supabase.com) — Postgres, Auth, Row Level Security
- [Recharts](https://recharts.org) for the dashboard charts
- Deployed on [Vercel](https://vercel.com), refreshed daily by [Vercel Cron](https://vercel.com/docs/cron-jobs)

### Data sources

- **Mutual Fund NAVs**: [AMFI's public daily NAV file](https://www.amfiindia.com/spider/webpages/spider/mfNAVAll.txt) — free, official, no key required.
- **Stock prices**: Yahoo Finance's chart API using `SYMBOL.NS` tickers. This
  is unofficial (NSE has no free public quote API) but is what most personal
  finance tools use in practice.
- **NPS NAVs**: entered manually. NPS NAVs are published by CRAs (Protean/NSDL,
  KFintech) without a stable public feed, so you paste the NAV in from your
  CRA statement whenever you check in — the app computes the value from there.

## Setup

### 1. Create a Supabase project

1. Create a new project at [supabase.com](https://supabase.com).
2. In the SQL editor, run the migration in `supabase/migrations/0001_init.sql`.
   (Or use the Supabase CLI: `supabase link` then `supabase db push`.)
3. Under **Authentication → Users**, manually create your one user
   (email + password) — there is no public sign-up page by design.
4. Grab your Project URL, `anon` public key, and `service_role` key from
   **Project Settings → API**.

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
```

Generate `CRON_SECRET` with `openssl rand -hex 32`.

### 3. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with the
user you created in Supabase.

### 4. Deploy to Vercel

1. Import the repo into Vercel.
2. Add the same four environment variables in the Vercel project settings.
3. Deploy. `vercel.json` already defines a daily cron job that calls
   `/api/cron/refresh` at 02:30 UTC (08:00 IST) — Vercel automatically sends
   `Authorization: Bearer $CRON_SECRET` to cron invocations, which the route
   verifies.

You can trigger a refresh manually any time from the "Refresh now" button in
the app, or by calling:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.vercel.app/api/cron/refresh
```

## Project structure

```
src/app/(app)/          Authenticated pages: dashboard, mutual-funds, stocks, nps
src/app/login/          Login page + sign-in/sign-out server actions
src/app/api/cron/refresh/  Daily scheduled refresh (service-role, all users)
src/app/api/refresh/    Manual "Refresh now" (runs as the logged-in user)
src/app/api/search/     AMFI scheme / NSE symbol search used by the add forms
src/lib/data-sources/   AMFI NAV file parser, Yahoo Finance quote/search client
src/lib/refresh.ts      Shared refresh logic (NAV/price update + snapshotting)
src/lib/supabase/       Server/browser/admin Supabase clients + shared types
supabase/migrations/    SQL schema (tables, RLS policies, triggers)
```

## Notes

- Row Level Security scopes every row to its owner, so the public `anon` key
  is safe to use from the browser. The cron route uses the `service_role`
  key (server-side only) so it can update every user's holdings.
- The AMFI NAV list (~20k schemes) is cached in-memory per server instance
  for 6 hours to keep scheme search and refreshes fast.
