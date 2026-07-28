-- Follow-up to 20260728200000, which did NOT actually close the hole.
--
-- That migration ran and is recorded, but `anon` could still insert afterwards
-- (POST returned 400 "null value in column srid", i.e. authorisation passed).
-- Reason: the privileges are not granted to `anon` directly, they are granted to
-- the PUBLIC pseudo-role, and every role inherits those. `REVOKE ... FROM anon`
-- cannot take away a PUBLIC grant - you have to revoke from PUBLIC itself.
--
-- (information_schema.role_table_grants lists PUBLIC grants once per concrete
-- role, which is why the audit appeared to show a direct `anon` grant and the
-- first fix looked like it should have worked.)

do $$
declare
  acl_before text;
  acl_after  text;
begin
  select coalesce(array_to_string(relacl, ' | '), '(default: owner only)')
    into acl_before
  from pg_class where oid = 'public.spatial_ref_sys'::regclass;
  raise notice 'spatial_ref_sys ACL BEFORE: %', acl_before;

  -- The actual fix. An ACL entry with an empty grantee ("=arwdDxt/owner") is PUBLIC.
  revoke all on public.spatial_ref_sys from public;
  revoke all on public.spatial_ref_sys from anon;
  revoke all on public.spatial_ref_sys from authenticated;

  -- Reads must keep working: PostGIS resolves SRIDs out of this table as the
  -- calling role, so removing SELECT from anon would break geography queries for
  -- unauthenticated visitors (the map, nearby-places, distance sorting). The
  -- contents are the public EPSG registry, identical on every PostGIS install.
  grant select on public.spatial_ref_sys to anon, authenticated;

  select coalesce(array_to_string(relacl, ' | '), '(default: owner only)')
    into acl_after
  from pg_class where oid = 'public.spatial_ref_sys'::regclass;
  raise notice 'spatial_ref_sys ACL AFTER:  %', acl_after;
end;
$$;

-- Same PUBLIC-grant problem on the PostGIS metadata views.
do $$
begin
  revoke all on public.geometry_columns from public;
  revoke all on public.geography_columns from public;
  grant select on public.geometry_columns to anon, authenticated;
  grant select on public.geography_columns to anon, authenticated;
exception when others then
  raise notice 'postgis metadata views: %', sqlerrm;
end;
$$;
