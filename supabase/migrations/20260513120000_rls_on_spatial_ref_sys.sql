-- Enable RLS on public.spatial_ref_sys (PostGIS system table).
--
-- This silences the Supabase advisor "RLS Disabled in Public" error.
-- The table is owned by `supabase_admin`, which is intentionally
-- above the privilege tier granted to customer roles (`postgres`,
-- `cli_login_postgres`). That means:
--
--   - This migration WILL FAIL with `must be owner of table
--     spatial_ref_sys` (42501) when run as either of those roles.
--   - The fix is wrapped in a DO block that swallows the privilege
--     error so the migration succeeds anyway and future `supabase
--     db push` runs stay clean.
--
-- Practical path to clearing the advisor warning: suppress it in
-- Supabase Dashboard > Database > Advisors > Security. The
-- spatial_ref_sys table contains ~8,500 rows of public coordinate-
-- system reference data (EPSG codes), identical across every PostGIS
-- install. There is no realistic attack surface; the warning is a
-- known false-positive that Supabase has acknowledged.
--
-- If at some point Supabase grants customer roles the ability to
-- alter this table, removing the DO/EXCEPTION wrapper and re-pushing
-- will apply the RLS + policy.

do $$
begin
  alter table public.spatial_ref_sys enable row level security;

  -- Permissive SELECT policy: data is public reference, nothing to hide.
  drop policy if exists "spatial_ref_sys is public reference data"
    on public.spatial_ref_sys;
  create policy "spatial_ref_sys is public reference data"
    on public.spatial_ref_sys
    for select
    to anon, authenticated, service_role
    using (true);

  raise notice 'spatial_ref_sys RLS + policy applied successfully';
exception
  when insufficient_privilege then
    raise notice 'Skipping spatial_ref_sys RLS - not owner (this is expected on Supabase). Suppress the advisor warning in the dashboard UI instead.';
  when undefined_table then
    raise notice 'spatial_ref_sys does not exist - PostGIS not installed?';
end $$;
