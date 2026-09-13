-- Pin the search_path on public.set_updated_at().
--
-- Supabase's database linter flags SECURITY-relevant functions whose
-- search_path is role-mutable (lint 0011): a caller can point an unqualified
-- name at their own schema and have the trigger run something else. This
-- function is attached to every table's BEFORE UPDATE trigger, so it is worth
-- pinning even though it only touches NEW and now().
--
-- Replacing the body leaves the existing triggers in place — they resolve the
-- function by oid, not by definition.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;
