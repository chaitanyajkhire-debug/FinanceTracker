-- Weight loss tracker
-- A per-user health profile (height, goal, activity) plus one weight entry
-- per day. Everything is stored in metric (kg / cm); the "units" preference
-- only controls how values are displayed and entered in the UI.
-- RLS scopes every row to its owner, matching the rest of the schema.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Health profile (one row per user)
-- ---------------------------------------------------------------------------
create table if not exists public.health_profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  height_cm numeric(6, 2) check (height_cm > 0 and height_cm < 300),
  sex text check (sex in ('male', 'female')),
  birth_date date,
  goal_weight_kg numeric(6, 2) check (goal_weight_kg > 0 and goal_weight_kg < 700),
  activity_level text
    check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active'))
    default 'sedentary',
  units text check (units in ('metric', 'imperial')) default 'metric',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Daily weight entries (at most one per user per day)
-- ---------------------------------------------------------------------------
create table if not exists public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  entry_date date not null default current_date,
  weight_kg numeric(6, 2) not null check (weight_kg > 0 and weight_kg < 700),
  body_fat_pct numeric(5, 2) check (body_fat_pct > 0 and body_fat_pct < 100),
  waist_cm numeric(6, 2) check (waist_cm > 0 and waist_cm < 400),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

create index if not exists weight_entries_user_date_idx
  on public.weight_entries (user_id, entry_date desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers (public.set_updated_at() is created in 0001_init.sql)
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on public.health_profiles;
create trigger set_updated_at before update on public.health_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.weight_entries;
create trigger set_updated_at before update on public.weight_entries
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.health_profiles enable row level security;
alter table public.weight_entries enable row level security;

drop policy if exists "Owner can manage health profile" on public.health_profiles;
create policy "Owner can manage health profile" on public.health_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Owner can manage weight entries" on public.weight_entries;
create policy "Owner can manage weight entries" on public.weight_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
