-- /api/revalidate now requires a bearer token (it was open to the world and
-- could be looped to force MV refreshes + mass ISR purges). The place_reviews
-- trigger (20260728120000) pings that route from Postgres, so it needs the
-- token too. Keep it in Vault, generated here so it never lives in git (the
-- repo is public); the web app reads it once via revalidate_secret() with the
-- service role and stores it as the REVALIDATE_SECRET env var on Vercel.

create extension if not exists supabase_vault;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'revalidate_secret') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'revalidate_secret',
      'Bearer token for POST https://www.plantspack.com/api/revalidate (web env REVALIDATE_SECRET)'
    );
  end if;
end;
$$;

-- Service-role-only reader. Used once to copy the value into the Vercel env
-- (scripts/_read-revalidate-secret.mjs); never exposed to anon/authenticated.
create or replace function public.revalidate_secret()
returns text
language sql
security definer
set search_path = public, vault
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'revalidate_secret' limit 1
$$;

revoke all on function public.revalidate_secret() from public;
revoke all on function public.revalidate_secret() from anon;
revoke all on function public.revalidate_secret() from authenticated;
grant execute on function public.revalidate_secret() to service_role;

comment on function public.revalidate_secret() is
  'Vault-backed bearer token for /api/revalidate. service_role only.';

-- Same trigger body as 20260728120000, plus the Authorization header.
create or replace function public.notify_place_review_change()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_place_id uuid;
  v_slug     text;
  v_secret   text;
begin
  v_place_id := coalesce(new.place_id, old.place_id);

  perform public.sync_place_review_stats(v_place_id);

  select slug into v_slug from public.places where id = v_place_id;

  -- pg_net is fire-and-forget: it queues the request and returns immediately, so
  -- a slow or failing site never blocks or fails the review write. Wrapped
  -- anyway so a missing/misconfigured pg_net or Vault cannot break reviews.
  begin
    v_secret := public.revalidate_secret();
    perform net.http_post(
      url     := 'https://www.plantspack.com/api/revalidate',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(v_secret, '')
      ),
      body    := jsonb_build_object('place_id', v_place_id, 'place_slug', v_slug)
    );
  exception when others then
    raise warning 'notify_place_review_change: revalidate ping failed for place %: %', v_place_id, sqlerrm;
  end;

  return coalesce(new, old);
end;
$$;
