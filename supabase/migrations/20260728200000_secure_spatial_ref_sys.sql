-- Close the Supabase "rls_disabled_in_public" advisory (2026-07-26).
--
-- Audited with public.rls_audit(): of 66 tables in the public schema, exactly ONE
-- had RLS disabled - `spatial_ref_sys`, the table PostGIS creates to hold EPSG
-- coordinate-system definitions. It holds no user data, so this is not the data
-- breach the advisory wording implies, but it was genuinely writable:
--
--   POST /rest/v1/spatial_ref_sys  {}   with the ANON key
--     -> 400 23502 "null value in column srid violates not-null constraint"
--
-- Reaching a column constraint means authorisation had already passed (the
-- control, `places`, returns 42501 "violates row-level security policy"). anon
-- and authenticated both held INSERT/UPDATE/DELETE/TRUNCATE. Anyone with the
-- publishable anon key - which ships in the JS bundle by design - could have
-- truncated the table or dropped SRID 4326 and broken every geography operation
-- on the platform: the map, nearby-places, distance sorting. An integrity and
-- availability problem rather than a confidentiality one, but a real one.
--
-- Fix: take away the writes, keep SELECT. SELECT is required because PostGIS
-- functions that resolve an SRID (ST_Transform and friends) read this table as
-- the calling role, and the contents are public reference data - the same EPSG
-- registry values every PostGIS install ships.

revoke insert, update, delete, truncate, references, trigger
  on public.spatial_ref_sys from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.spatial_ref_sys from authenticated;

grant select on public.spatial_ref_sys to anon, authenticated;

-- Enable RLS as well, so the advisory itself clears and not merely the exploit
-- path. The table is owned by the PostGIS extension, so ALTER TABLE may be
-- refused depending on how the extension was installed; that is fine, the
-- revokes above already remove the capability. Never let this fail the migration.
do $$
begin
  execute 'alter table public.spatial_ref_sys enable row level security';

  if not exists (
    select 1 from pg_policy
    where polrelid = 'public.spatial_ref_sys'::regclass
      and polname = 'spatial_ref_sys_public_read'
  ) then
    -- Read-only for everyone: with RLS on and no policy, PostGIS SRID lookups
    -- performed as anon/authenticated would start returning nothing and silently
    -- break geography queries.
    execute $pol$
      create policy spatial_ref_sys_public_read
        on public.spatial_ref_sys
        for select
        to anon, authenticated
        using (true)
    $pol$;
  end if;

  raise notice 'spatial_ref_sys: RLS enabled with a public read policy';
exception
  when insufficient_privilege or wrong_object_type then
    raise notice 'spatial_ref_sys: cannot ALTER (owned by the extension); write grants revoked instead: %', sqlerrm;
  when others then
    raise notice 'spatial_ref_sys: RLS enable skipped (%): %', sqlstate, sqlerrm;
end;
$$;

-- Same treatment for the two PostGIS metadata views. They are catalog views and
-- cannot really be written through, so this is tidying rather than a fix: no
-- client role has any business holding INSERT/UPDATE/DELETE on them.
do $$
begin
  execute 'revoke insert, update, delete, truncate, references, trigger on public.geometry_columns from anon, authenticated';
  execute 'revoke insert, update, delete, truncate, references, trigger on public.geography_columns from anon, authenticated';
exception when others then
  raise notice 'postgis metadata views: revoke skipped: %', sqlerrm;
end;
$$;
