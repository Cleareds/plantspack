-- Read-only introspection helper (2026-10-25), companion to schema_snapshot().
-- Returns every trigger on public tables and the full source of every public
-- function, so CLI work can see the LIVE definitions (migrations drift; there
-- is no psql and `supabase db dump` needs Docker). service_role only.

create or replace function public.schema_routines()
returns jsonb
language sql
security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'taken_at', now(),
    'triggers', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'table', c.relname,
        'name', t.tgname,
        'enabled', t.tgenabled,
        'def', pg_get_triggerdef(t.oid)
      ) order by c.relname, t.tgname), '[]'::jsonb)
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and not t.tgisinternal
    ),
    'functions', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', p.proname,
        'args', pg_get_function_identity_arguments(p.oid),
        'security_definer', p.prosecdef,
        'acl', p.proacl::text[],
        'def', pg_get_functiondef(p.oid)
      ) order by p.proname), '[]'::jsonb)
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prokind = 'f'
        and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
    )
  )
$$;

revoke all on function public.schema_routines() from public;
revoke all on function public.schema_routines() from anon;
revoke all on function public.schema_routines() from authenticated;
grant execute on function public.schema_routines() to service_role;
