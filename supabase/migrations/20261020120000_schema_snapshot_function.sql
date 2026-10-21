-- Backup helper for grant/RLS work (2026-10-20).
--
-- Returns, as one jsonb document, everything a grants migration can change:
-- per-relation ACLs, owners, RLS flags and view options; every RLS policy with
-- its full definition; sequence ACLs; and the schema-level default privileges.
-- Read it with the service role and save the result under backups/ BEFORE any
-- migration that touches grants, then again afterwards to diff.
--
-- Why a function: no exec_sql RPC, no psql, `supabase db dump` needs Docker.
-- service_role only: it describes the security configuration in full.

create or replace function public.schema_snapshot()
returns jsonb
language sql
security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'taken_at', now(),
    'relations', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', c.relname,
        'kind', c.relkind,
        'owner', pg_get_userbyid(c.relowner),
        'acl', c.relacl::text[],
        'rls_enabled', c.relrowsecurity,
        'rls_forced', c.relforcerowsecurity,
        'reloptions', c.reloptions,
        'view_def', case when c.relkind in ('v','m') then pg_get_viewdef(c.oid, true) end,
        'column_acls', (
          select coalesce(jsonb_object_agg(a.attname, a.attacl::text[]), '{}'::jsonb)
          from pg_attribute a
          where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped and a.attacl is not null
        )
      ) order by c.relname), '[]'::jsonb)
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r','p','v','m','f','S')
    ),
    'policies', (
      select coalesce(jsonb_agg(to_jsonb(p) order by p.tablename, p.policyname), '[]'::jsonb)
      from pg_policies p
      where p.schemaname = 'public'
    ),
    'default_acls', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'role', pg_get_userbyid(d.defaclrole),
        'schema', n.nspname,
        'objtype', d.defaclobjtype,
        'acl', d.defaclacl::text[]
      )), '[]'::jsonb)
      from pg_default_acl d
      left join pg_namespace n on n.oid = d.defaclnamespace
    ),
    'role_memberships', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'role', r.rolname,
        'member_of', (select array_agg(g.rolname) from pg_auth_members m join pg_roles g on g.oid = m.roleid where m.member = r.oid)
      )), '[]'::jsonb)
      from pg_roles r
      where r.rolname in ('postgres','anon','authenticated','service_role','supabase_admin')
    )
  );
$$;

comment on function public.schema_snapshot() is
  'Full ACL / RLS / policy / view-definition snapshot of the public schema as jsonb. service_role only. Save to backups/ before and after any grants migration.';

revoke all on function public.schema_snapshot() from public;
revoke all on function public.schema_snapshot() from anon;
revoke all on function public.schema_snapshot() from authenticated;
grant execute on function public.schema_snapshot() to service_role;
