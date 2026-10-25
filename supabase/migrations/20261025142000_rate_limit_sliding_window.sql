-- check_rate_limit() kept one counter per minute bucket and compared only that
-- bucket with p_max_requests, so "10 posts per hour" was really "10 per
-- minute". Keep the per-minute buckets (cheap upsert) but compare the SUM of
-- the buckets inside the window. Same signature and JSON shape.
create or replace function public.check_rate_limit(p_identifier text, p_action text, p_max_requests integer, p_window_seconds integer)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_bucket timestamptz := date_trunc('minute', now());
  v_total integer;
  v_reset timestamptz;
begin
  insert into rate_limits (identifier, action, count, window_start, window_end)
  values (p_identifier, p_action, 1, v_bucket, v_bucket + make_interval(secs => p_window_seconds))
  on conflict (identifier, action, window_start)
  do update set count = rate_limits.count + 1, updated_at = now();

  select coalesce(sum(count), 0), min(window_end)
    into v_total, v_reset
    from rate_limits
   where identifier = p_identifier
     and action = p_action
     and window_start > now() - make_interval(secs => p_window_seconds);

  if v_total > p_max_requests then
    return json_build_object(
      'allowed', false,
      'current', v_total,
      'limit', p_max_requests,
      'reset_at', v_reset,
      'retry_after', greatest(extract(epoch from (v_reset - now()))::integer, 1)
    );
  end if;

  return json_build_object(
    'allowed', true,
    'current', v_total,
    'limit', p_max_requests,
    'remaining', p_max_requests - v_total,
    'reset_at', v_reset
  );
end;
$function$;
