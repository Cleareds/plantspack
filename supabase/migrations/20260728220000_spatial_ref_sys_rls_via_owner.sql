-- Third attempt at the spatial_ref_sys advisory, after establishing why the
-- first two silently did nothing.
--
-- The ACL is:
--   anon=arwdDxtm/supabase_admin        <- ALL privileges, granted BY supabase_admin
--   =r/supabase_admin                  <- PUBLIC holds only SELECT
--
-- Migrations run as `postgres`, which on Supabase is not a superuser and does not
-- own this table (PostGIS created it as supabase_admin). Postgres only lets you
-- revoke grants you issued yourself, so `REVOKE ... FROM anon` as `postgres` is a
-- silent no-op - it reports success and changes nothing. Same reason
-- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` fails: that needs ownership.
--
-- So: escalate to the owning role if we are allowed to, and only then revoke and
-- enable RLS. Every step is reported and nothing is allowed to fail the migration.

do $$
declare
  v_owner        text;
  v_can_setrole  boolean;
  v_acl_before   text;
  v_acl_after    text;
  v_rls          boolean;
begin
  select pg_get_userbyid(relowner), coalesce(array_to_string(relacl, ' | '), '(owner only)'), relrowsecurity
    into v_owner, v_acl_before, v_rls
  from pg_class where oid = 'public.spatial_ref_sys'::regclass;

  v_can_setrole := pg_has_role(current_user, v_owner, 'MEMBER');

  raise notice 'current_user=%  table_owner=%  member_of_owner=%  rls_enabled=%',
    current_user, v_owner, v_can_setrole, v_rls;
  raise notice 'ACL before: %', v_acl_before;

  if not v_can_setrole then
    raise notice 'CANNOT FIX FROM A MIGRATION: % is not a member of owner %. Needs Supabase support or a dashboard action.',
      current_user, v_owner;
    return;
  end if;

  -- Become the owner for the rest of this transaction.
  execute format('set local role %I', v_owner);
  raise notice 'assumed role %, now current_user=%', v_owner, current_user;

  -- 1. Take away write privileges from the client-facing roles. Keep SELECT:
  --    PostGIS resolves SRIDs from this table as the *calling* role, so removing
  --    read access would break geography queries (map, nearby-places, distance
  --    sorting) for anonymous visitors. The contents are the public EPSG registry.
  revoke all on public.spatial_ref_sys from anon;
  revoke all on public.spatial_ref_sys from authenticated;
  grant select on public.spatial_ref_sys to anon, authenticated;

  -- 2. Enable RLS so the advisory itself clears, with a read-only policy so
  --    SRID lookups keep working.
  begin
    alter table public.spatial_ref_sys enable row level security;
    if not exists (
      select 1 from pg_policy
      where polrelid = 'public.spatial_ref_sys'::regclass
        and polname = 'spatial_ref_sys_public_read'
    ) then
      create policy spatial_ref_sys_public_read
        on public.spatial_ref_sys for select to anon, authenticated using (true);
    end if;
    raise notice 'RLS enabled + read policy created';
  exception when others then
    raise notice 'RLS enable failed (%): % - write revokes above still apply', sqlstate, sqlerrm;
  end;

  select coalesce(array_to_string(relacl, ' | '), '(owner only)'), relrowsecurity
    into v_acl_after, v_rls
  from pg_class where oid = 'public.spatial_ref_sys'::regclass;
  raise notice 'ACL after:  %', v_acl_after;
  raise notice 'rls_enabled now: %', v_rls;
end;
$$;
