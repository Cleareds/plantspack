-- Service-role helper: the last pg_net responses (status + short body), to
-- check that DB-triggered calls (notification dispatch, review revalidate)
-- actually reach the site. pg_net keeps responses for a few hours only.
create or replace function public.recent_http_responses(p_limit int default 20)
returns table (id bigint, status_code int, created timestamptz, body text, error_msg text)
language sql
security definer
set search_path = pg_catalog, public
as $$
  select r.id, r.status_code, r.created, left(r.content, 200), r.error_msg
    from net._http_response r
   order by r.created desc
   limit greatest(1, least(p_limit, 200))
$$;

revoke all on function public.recent_http_responses(int) from public, anon, authenticated;
grant execute on function public.recent_http_responses(int) to service_role;
