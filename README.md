# FinanceTracker

A personal dashboard for tracking Indian Mutual Funds, Stocks (NSE) and NPS
holdings in one place, with daily automatic NAV/price updates — plus a daily
weight-loss tracker with BMI and progress insights.

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
- **Weight tracker** (`/weight`) — log your weight once a day and get a
  day-on-day progress chart with a smoothed trend line, BMI against the WHO
  scale, goal-progress ring, projected finish date, week-over-week change,
  logging streak/consistency, and BMR/TDEE estimates. Body fat %, waist and a
  note are optional per entry. Works in kg/cm or lb/ft-in.
- **Installable on mobile** — a web app manifest means you can add it to your
  phone's home screen and open it full-screen; every page is responsive.
- **No sign-in.** The app is open to anyone with the URL: there is no login
  page and no session. Row Level Security is still on, but the policies pin
  every table to a single owner's rows (see
  `supabase/migrations/0004_public_no_auth.sql`), so the app reads and writes
  one person's data without needing to know who is visiting. Anyone who has
  the URL — or the public anon key, which ships to the browser — can read and
  change that data, so keep the URL to yourself.

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
2. In the SQL editor, run the migrations in `supabase/migrations/`, in order:
   `0001_init.sql` (portfolio tables) then `0002_weight_tracker.sql` (weight
   tracker tables). (Or use the Supabase CLI: `supabase link` then
   `supabase db push`.)
3. Grab your Project URL, `anon` public key, and `service_role` key from
   **Project Settings → API**.

   The migrations pin the owner to a fixed `auth.users` id. If you are setting
   this up fresh, create one user under **Authentication → Users** and replace
   the `owner_id` in `0004_public_no_auth.sql` with their id before running it
   — nobody ever signs in as that user, it just gives the rows an owner.

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

Open [http://localhost:3000](http://localhost:3000). There is no sign-in
step — the app opens straight onto the dashboard.

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
src/app/(app)/          Authenticated pages: dashboard, mutual-funds, stocks, nps, weight
src/app/api/cron/refresh/  Daily scheduled refresh (service-role, all users)
src/app/api/refresh/    Manual "Refresh now" (runs as the logged-in user)
src/app/api/search/     AMFI scheme / NSE symbol search used by the add forms
src/lib/data-sources/   AMFI NAV file parser, Yahoo Finance quote/search client
src/lib/refresh.ts      Shared refresh logic (NAV/price update + snapshotting)
src/lib/health.ts       BMI, BMR/TDEE, trend smoothing and goal projection maths
src/components/weight/  Weight charts, BMI scale and goal ring
src/app/manifest.ts     Web app manifest (home-screen install)
src/lib/supabase/       Server/browser/admin Supabase clients + shared types
supabase/migrations/    SQL schema (tables, RLS policies, triggers)
```

## Notes

- Row Level Security scopes every row to its owner, so the public `anon` key
  is safe to use from the browser. The cron route uses the `service_role`
  key (server-side only) so it can update every user's holdings.
- The AMFI NAV list (~20k schemes) is cached in-memory per server instance
  for 6 hours to keep scheme search and refreshes fast.

### Weight tracker notes

- Weights and heights are always stored in metric (kg / cm). The unit
  preference on your profile only changes how they're entered and displayed,
  so switching between kg and lb never rewrites your history.
- One entry per day: logging the same date twice updates that day's entry
  rather than adding a duplicate.
- The trend line is an exponentially weighted moving average with a 7-day
  half-life, which is what makes day-to-day water-weight swings readable. The
  weekly rate is a least-squares fit over the trailing 4 weeks.
- BMI bands follow the WHO international classification; BMR uses
  Mifflin–St Jeor, scaled by the standard activity factors for TDEE. These are
  population-level estimates, not medical advice.
