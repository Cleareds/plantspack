-- Reusable RLS/grant audit, for answering Supabase's "rls_disabled_in_public"
-- security advisories precisely instead of guessing.
--
-- Why a function: PostgREST cannot query pg_catalog, there is no exec_sql RPC in
-- this project, `supabase db dump` needs Docker, and probing from the client is
-- ambiguous - a PATCH filtered to zero rows returns 204 whether RLS would have
-- blocked it or not, and a SELECT returning 0 rows looks identical to a SELECT
-- that RLS filtered to nothing. Only pg_catalog gives a straight answer.
--
-- service_role only: it reports where the security gaps are, so it must never be
-- callable with the anon or authenticated key.

create or replace function public.rls_audit()
returns table (
  table_name       text,
  kind             text,
  rls_enabled      boolean,
  rls_forced       boolean,
  policy_count     int,
  anon_privs       text,
  authenticated_privs text,
  approx_rows      bigint
)
language sql
security definer
set search_path = pg_catalog, public
as $$
  select
    c.relname::text,
    case c.relkind
      when 'r' then 'table'
      when 'p' then 'partitioned table'
      when 'v' then 'view'
      when 'm' then 'materialized view'
      when 'f' then 'foreign table'
      else c.relkind::text
    end,
    c.relrowsecurity,
    c.relforcerowsecurity,
    (select count(*)::int from pg_policy p where p.polrelid = c.oid),
    coalesce((
      select string_agg(distinct pr.privilege_type, ',' order by pr.privilege_type)
      from information_schema.role_table_grants pr
      where pr.table_schema = 'public' and pr.table_name = c.relname and pr.grantee = 'anon'
    ), ''),
    coalesce((
      select string_agg(distinct pr.privilege_type, ',' order by pr.privilege_type)
      from information_schema.role_table_grants pr
      where pr.table_schema = 'public' and pr.table_name = c.relname and pr.grantee = 'authenticated'
    ), ''),
    c.reltuples::bigint
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p', 'v', 'm', 'f')
  order by
    -- Worst first: a real table that is reachable by anon/authenticated with RLS off.
    (c.relkind in ('r', 'p') and not c.relrowsecurity) desc,
    c.relname;
$$;

comment on function public.rls_audit() is
  'Per-table RLS status, policy count and anon/authenticated grants in the public schema. service_role only. Used to triage Supabase rls_disabled_in_public advisories.';

revoke all on function public.rls_audit() from public;
revoke all on function public.rls_audit() from anon;
revoke all on function public.rls_audit() from authenticated;
grant execute on function public.rls_audit() to service_role;
