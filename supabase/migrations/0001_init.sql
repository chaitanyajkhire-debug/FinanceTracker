-- FinanceTracker initial schema
-- Holdings for mutual funds, stocks and NPS, plus daily portfolio snapshots
-- and refresh run logs. RLS scopes every row to its owning user so the
-- public anon key can be used safely from the browser.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Mutual funds
-- ---------------------------------------------------------------------------
create table if not exists public.mutual_funds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  scheme_code text not null,
  scheme_name text not null,
  folio_number text,
  category text,
  units numeric(18, 4) not null check (units >= 0),
  avg_cost_per_unit numeric(18, 4) not null check (avg_cost_per_unit >= 0),
  purchase_date date,
  current_nav numeric(18, 4),
  current_nav_date date,
  previous_nav numeric(18, 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mutual_funds_user_id_idx on public.mutual_funds (user_id);
create index if not exists mutual_funds_scheme_code_idx on public.mutual_funds (scheme_code);

-- ---------------------------------------------------------------------------
-- Stocks (NSE)
-- ---------------------------------------------------------------------------
create table if not exists public.stocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  symbol text not null,
  company_name text not null,
  sector text,
  quantity numeric(18, 4) not null check (quantity >= 0),
  avg_price numeric(18, 4) not null check (avg_price >= 0),
  purchase_date date,
  current_price numeric(18, 4),
  current_price_date date,
  previous_close numeric(18, 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stocks_user_id_idx on public.stocks (user_id);
create index if not exists stocks_symbol_idx on public.stocks (symbol);

-- ---------------------------------------------------------------------------
-- NPS scheme holdings (NAV entered manually - no reliable public feed)
-- ---------------------------------------------------------------------------
create table if not exists public.nps_schemes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  pran text,
  scheme_name text not null,
  fund_manager text,
  tier text check (tier in ('Tier I', 'Tier II')) default 'Tier I',
  asset_class text check (asset_class in ('E', 'C', 'G', 'A')),
  units numeric(18, 4) not null check (units >= 0),
  avg_cost_per_unit numeric(18, 4) not null check (avg_cost_per_unit >= 0),
  current_nav numeric(18, 4),
  current_nav_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nps_schemes_user_id_idx on public.nps_schemes (user_id);

-- ---------------------------------------------------------------------------
-- Daily portfolio value snapshots (for the "value over time" chart)
-- ---------------------------------------------------------------------------
create table if not exists public.daily_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  snapshot_date date not null,
  mutual_funds_value numeric(18, 2) not null default 0,
  stocks_value numeric(18, 2) not null default 0,
  nps_value numeric(18, 2) not null default 0,
  total_value numeric(18, 2) not null default 0,
  total_invested numeric(18, 2) not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, snapshot_date)
);

create index if not exists daily_snapshots_user_id_idx on public.daily_snapshots (user_id);

-- ---------------------------------------------------------------------------
-- Refresh job run log
-- ---------------------------------------------------------------------------
create table if not exists public.refresh_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  run_at timestamptz not null default now(),
  status text not null check (status in ('success', 'partial', 'failed')),
  mf_updated integer not null default 0,
  mf_failed integer not null default 0,
  stocks_updated integer not null default 0,
  stocks_failed integer not null default 0,
  message text
);

create index if not exists refresh_logs_user_id_idx on public.refresh_logs (user_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on public.mutual_funds;
create trigger set_updated_at before update on public.mutual_funds
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.stocks;
create trigger set_updated_at before update on public.stocks
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.nps_schemes;
create trigger set_updated_at before update on public.nps_schemes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: every row is only visible/writable by its owner.
-- The daily cron job runs with the service role key, which bypasses RLS.
-- ---------------------------------------------------------------------------
alter table public.mutual_funds enable row level security;
alter table public.stocks enable row level security;
alter table public.nps_schemes enable row level security;
alter table public.daily_snapshots enable row level security;
alter table public.refresh_logs enable row level security;

create policy "Owner can manage mutual funds" on public.mutual_funds
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Owner can manage stocks" on public.stocks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Owner can manage nps schemes" on public.nps_schemes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Owner can manage snapshots" on public.daily_snapshots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Owner can manage refresh logs" on public.refresh_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
