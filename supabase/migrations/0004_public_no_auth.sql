-- Open the app up with no sign-in.
--
-- The app no longer authenticates: every visitor hits Postgres as the `anon`
-- role. Two things have to change for that to work.
--
-- 1. `user_id` defaulted to auth.uid(), which is null without a session, so
--    inserts would fail the NOT NULL. It now defaults to the owner below.
-- 2. The RLS policies compared auth.uid() to user_id, which is never true for
--    an anonymous caller, so every read and write was denied.
--
-- RLS stays ENABLED and the new policies pin every row to the single owner,
-- rather than being dropped for a blanket `using (true)`. That matters: the
-- database still holds rows belonging to a leftover test account, and without
-- the pin those rows would show up merged into the portfolio totals. Scoping
-- it here also means no page or query needs a user filter of its own.
--
-- Consequence, stated plainly: anyone with the site URL (or with the public
-- anon key, which ships to the browser) can now read and write this owner's
-- holdings, snapshots and weight history. That is the intended trade.
--
-- To undo: restore the `auth.uid() = user_id` policies and the auth.uid()
-- defaults from 0001_init.sql / 0002_weight_tracker.sql, and restore
-- src/proxy.ts and the /login route.

do $$
declare
  -- chaitanyajkhire@gmail.com — the account whose data the public app shows.
  owner_id constant uuid := '60c78920-1cb7-4260-82fd-37a491747d12';
  t text;
begin
  foreach t in array array[
    'mutual_funds',
    'stocks',
    'nps_schemes',
    'daily_snapshots',
    'refresh_logs',
    'health_profiles',
    'weight_entries'
  ]
  loop
    -- Inserts arrive with no session, so user_id has to default to the owner.
    execute format(
      'alter table public.%I alter column user_id set default %L::uuid',
      t, owner_id
    );

    -- Replace the per-user policies with owner-scoped public access.
    execute format('drop policy if exists "Owner can manage mutual funds" on public.%I', t);
    execute format('drop policy if exists "Owner can manage stocks" on public.%I', t);
    execute format('drop policy if exists "Owner can manage nps schemes" on public.%I', t);
    execute format('drop policy if exists "Owner can manage snapshots" on public.%I', t);
    execute format('drop policy if exists "Owner can manage refresh logs" on public.%I', t);
    execute format('drop policy if exists "Owner can manage health profile" on public.%I', t);
    execute format('drop policy if exists "Owner can manage weight entries" on public.%I', t);
    execute format('drop policy if exists "Public access to owner rows" on public.%I', t);

    execute format(
      'create policy "Public access to owner rows" on public.%I
         for all to anon, authenticated
         using (user_id = %L::uuid)
         with check (user_id = %L::uuid)',
      t, owner_id, owner_id
    );
  end loop;
end $$;
