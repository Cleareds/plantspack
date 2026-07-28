-- Keep place pages correct the moment a review is written, whatever client wrote it.
--
-- Problem this fixes (2026-07-28):
--   The web review route (/api/places/[id]/reviews) calls revalidatePath() after
--   an insert, so web reviews appear immediately. The mobile app upserts straight
--   into place_reviews through the Supabase client and never touches a Next
--   route, so a mobile review was invisible on the web place page for up to 24h
--   (the ISR revalidate window) while appearing instantly in the feed, which
--   reads Supabase live. Confirmed on have-a-roll-antwerp-antwerp: the page was
--   served with `x-vercel-cache: HIT, age: 82628`.
--
--   Separately, places.review_count / places.average_rating are denormalised
--   columns that only got recomputed by a nightly batch
--   (scripts/recompute-place-stats.ts), so listing cards, rating sorts and the
--   aggregateRating JSON-LD lagged a full day behind. The place detail page
--   recomputes live via get_place_average_rating(), which is why the detail page
--   looked fine while the cards did not.
--
-- Doing both from a row trigger covers every client - web, mobile, CLI scripts,
-- anything added later - with no app release and no per-client bookkeeping.

create extension if not exists pg_net with schema extensions;

-- 1. Denormalised rating stats, maintained in-band.
create or replace function public.sync_place_review_stats(p_place_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.places p
  set review_count = agg.cnt,
      average_rating = agg.avg_rating
  from (
    select count(*)::int as cnt,
           coalesce(round(avg(rating)::numeric, 2), 0) as avg_rating
    from public.place_reviews
    where place_id = p_place_id
      and deleted_at is null
  ) agg
  where p.id = p_place_id
    -- Only write when something actually changed: this trigger fires on every
    -- review edit, and places carries its own triggers that we do not want to
    -- re-run for a no-op.
    and (p.review_count is distinct from agg.cnt
         or p.average_rating is distinct from agg.avg_rating);
end;
$$;

comment on function public.sync_place_review_stats(uuid) is
  'Recompute places.review_count / average_rating for one place from place_reviews. Mirrors scripts/recompute-place-stats.ts, which stays as a drift backstop.';

-- 2. Ask the site to drop its ISR cache for that one place page.
create or replace function public.notify_place_review_change()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_place_id uuid;
  v_slug     text;
begin
  v_place_id := coalesce(new.place_id, old.place_id);

  perform public.sync_place_review_stats(v_place_id);

  select slug into v_slug from public.places where id = v_place_id;

  -- pg_net is fire-and-forget: it queues the request and returns immediately, so
  -- a slow or failing site never blocks or fails the review write. Wrapped
  -- anyway so a missing/misconfigured pg_net cannot break reviews.
  begin
    perform net.http_post(
      url     := 'https://www.plantspack.com/api/revalidate',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body    := jsonb_build_object('place_id', v_place_id, 'place_slug', v_slug)
    );
  exception when others then
    raise warning 'notify_place_review_change: revalidate ping failed for place %: %', v_place_id, sqlerrm;
  end;

  return coalesce(new, old);
end;
$$;

comment on function public.notify_place_review_change() is
  'After a place_reviews write: resync the denormalised rating stats and ping /api/revalidate so the place page ISR cache is dropped for every client, including the mobile app which writes directly to Supabase.';

drop trigger if exists trg_place_review_revalidate on public.place_reviews;

create trigger trg_place_review_revalidate
after insert or update or delete on public.place_reviews
for each row
execute function public.notify_place_review_change();

-- 3. Backfill the stats that the nightly batch had not caught up with yet.
do $$
declare
  r record;
begin
  for r in
    select distinct place_id from public.place_reviews where deleted_at is null
  loop
    perform public.sync_place_review_stats(r.place_id);
  end loop;
end;
$$;
