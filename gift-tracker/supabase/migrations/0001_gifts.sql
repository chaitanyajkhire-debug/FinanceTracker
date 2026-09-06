-- Harshita's 40th birthday gift tracker
-- A single shared board. The app has no accounts by design: anyone who has
-- the link can read and edit the list, so the anon role is granted full
-- access to this one table (and nothing else in the database).

create extension if not exists "pgcrypto";

create table if not exists public.gifts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 200),
  note text check (char_length(note) <= 1000),
  buyer text check (char_length(buyer) <= 80),
  bought boolean not null default false,
  bought_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gifts_bought_idx on public.gifts (bought, created_at);

-- Keep updated_at / bought_at consistent no matter who writes the row.
create or replace function public.gifts_set_timestamps()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();

  if new.bought and not coalesce(old.bought, false) then
    new.bought_at = now();
  elsif not new.bought then
    new.bought_at = null;
  end if;

  return new;
end;
$$;

drop trigger if exists gifts_set_timestamps on public.gifts;
create trigger gifts_set_timestamps before insert or update on public.gifts
  for each row execute function public.gifts_set_timestamps();

-- Row Level Security stays on, with explicit policies scoping the open
-- access to this table only.
alter table public.gifts enable row level security;

drop policy if exists "Anyone with the link can read gifts" on public.gifts;
create policy "Anyone with the link can read gifts" on public.gifts
  for select to anon, authenticated using (true);

drop policy if exists "Anyone with the link can add gifts" on public.gifts;
create policy "Anyone with the link can add gifts" on public.gifts
  for insert to anon, authenticated with check (true);

drop policy if exists "Anyone with the link can edit gifts" on public.gifts;
create policy "Anyone with the link can edit gifts" on public.gifts
  for update to anon, authenticated using (true) with check (true);

drop policy if exists "Anyone with the link can remove gifts" on public.gifts;
create policy "Anyone with the link can remove gifts" on public.gifts
  for delete to anon, authenticated using (true);

-- Live sync across everyone's phones and laptops.
alter table public.gifts replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'gifts'
  ) then
    alter publication supabase_realtime add table public.gifts;
  end if;
end;
$$;
