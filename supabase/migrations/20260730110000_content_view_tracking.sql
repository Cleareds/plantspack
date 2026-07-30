-- Forward view tracking for places, packs and posts.
--
-- WHY A POSTGRES RPC AND NOT A NEXT ROUTE HANDLER
--
-- Two constraints in this codebase rule out the obvious approaches:
--
--   1. Place pages are ISR/CDN-cached (the 2026-07-12 `generateStaticParams`
--      fix). Counting server-side inside the page component would only fire on
--      a cache MISS, so a page that ranks well - exactly the one worth counting -
--      would report almost nothing.
--   2. The mobile app writes DIRECTLY to Supabase and never goes through Next
--      route handlers. Anything implemented in `src/app/api/**` is invisible to
--      it, which is the same trap that made place-review revalidation a Postgres
--      trigger in 20260728120000.
--
-- A SECURITY DEFINER function callable from supabase-js satisfies both: web and
-- mobile call the identical path, and it costs zero Vercel function invocations
-- (observability events and invocations have been the largest variable line on
-- the bill, so this matters).
--
-- DAILY GRAIN, NOT AN EVENT LOG
--
-- One row per (entity, day) instead of one row per view. A view becomes an UPDATE
-- of an existing row on all but the first hit of the day, so table growth is
-- bounded by entities-actually-viewed x days rather than by traffic, and a time
-- series comes for free.
--
-- NO IDENTIFIERS, DELIBERATELY
--
-- No IP, no user_id, no cookie, no user agent. A pure aggregate counter with no
-- personal data needs no consent basis and cannot become a privacy liability.
-- Keep it that way: do not add a "who viewed" column here.
--
-- ABUSE POSTURE, STATED PLAINLY
--
-- Anyone can call this RPC in a loop and inflate a counter. That is accepted,
-- because the counter carries no payoff: view counts must NEVER feed search
-- ranking, sort order on public discovery surfaces, or verification level. They
-- are a contributor thank-you and a public curiosity. If a future change makes
-- views influence ranking, this function needs rate limiting FIRST.
--
-- WHY `places` GETS NO CACHED COLUMN
--
-- `packs` and `posts` already have a `view_count` column, and both tables are
-- small, so a trigger maintains them (and finally makes the "most viewed packs"
-- sort in /api/packs/route.ts:123 mean something - it has been ordering by a
-- column nothing ever wrote). `places` is 60,965 heavily-indexed rows where bulk
-- updates have to be batched, so place totals are read with a SUM over the PK
-- index prefix instead. That is cheap and avoids write amplification on the
-- largest table in the database.

CREATE TABLE IF NOT EXISTS public.content_view_daily (
  entity_type text    NOT NULL CHECK (entity_type IN ('place', 'pack', 'post')),
  entity_id   uuid    NOT NULL,
  day         date    NOT NULL DEFAULT CURRENT_DATE,
  views       integer NOT NULL DEFAULT 0,
  PRIMARY KEY (entity_type, entity_id, day)
);

COMMENT ON TABLE public.content_view_daily IS
  'Identifier-free daily view counters. Measures actual page opens (all sources). Never sum with place_search_stats, which counts Google impressions only.';

ALTER TABLE public.content_view_daily ENABLE ROW LEVEL SECURITY;

-- Read is public: aggregate, non-personal, and rendered on public surfaces.
-- No INSERT/UPDATE/DELETE policy, so the only write path is the SECURITY DEFINER
-- function below.
DROP POLICY IF EXISTS content_view_daily_public_read ON public.content_view_daily;
CREATE POLICY content_view_daily_public_read
  ON public.content_view_daily FOR SELECT
  TO anon, authenticated
  USING (true);


-- Keep the cached counters on the two small tables that already have the column.
CREATE OR REPLACE FUNCTION public.sync_entity_view_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  delta integer;
BEGIN
  delta := NEW.views - COALESCE(OLD.views, 0);
  IF delta = 0 THEN RETURN NEW; END IF;

  IF NEW.entity_type = 'pack' THEN
    UPDATE public.packs SET view_count = COALESCE(view_count, 0) + delta WHERE id = NEW.entity_id;
  ELSIF NEW.entity_type = 'post' THEN
    UPDATE public.posts SET view_count = COALESCE(view_count, 0) + delta WHERE id = NEW.entity_id;
  END IF;
  -- 'place' intentionally has no cached column - see the header comment.

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS content_view_daily_sync ON public.content_view_daily;
CREATE TRIGGER content_view_daily_sync
  AFTER INSERT OR UPDATE OF views ON public.content_view_daily
  FOR EACH ROW EXECUTE FUNCTION public.sync_entity_view_count();


-- The single write path, called from the web client and the mobile app alike.
CREATE OR REPLACE FUNCTION public.record_content_view(
  p_entity_type text,
  p_entity_id   uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  exists_row boolean;
BEGIN
  -- Unknown types return quietly rather than raising: this is called
  -- fire-and-forget from clients, and an error surfaces as console noise on a
  -- page that is otherwise fine.
  IF p_entity_type NOT IN ('place', 'pack', 'post') THEN
    RETURN;
  END IF;

  -- Existence check keeps table growth bounded to real entities. Without it,
  -- anyone could seed unbounded rows with random UUIDs.
  IF p_entity_type = 'place' THEN
    SELECT EXISTS (SELECT 1 FROM public.places WHERE id = p_entity_id) INTO exists_row;
  ELSIF p_entity_type = 'pack' THEN
    SELECT EXISTS (SELECT 1 FROM public.packs WHERE id = p_entity_id) INTO exists_row;
  ELSE
    SELECT EXISTS (SELECT 1 FROM public.posts WHERE id = p_entity_id) INTO exists_row;
  END IF;

  IF NOT exists_row THEN
    RETURN;
  END IF;

  INSERT INTO public.content_view_daily (entity_type, entity_id, day, views)
  VALUES (p_entity_type, p_entity_id, CURRENT_DATE, 1)
  ON CONFLICT (entity_type, entity_id, day)
  DO UPDATE SET views = public.content_view_daily.views + 1;
END;
$$;

REVOKE ALL ON FUNCTION public.record_content_view(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_content_view(text, uuid) TO anon, authenticated;


-- Totals for a set of places, for the contribution-impact view. Returning a set
-- keeps the profile page to one round trip instead of one query per place.
CREATE OR REPLACE FUNCTION public.place_view_totals(p_place_ids uuid[])
RETURNS TABLE (place_id uuid, views bigint)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT entity_id, SUM(views)::bigint
  FROM public.content_view_daily
  WHERE entity_type = 'place' AND entity_id = ANY(p_place_ids)
  GROUP BY entity_id;
$$;

REVOKE ALL ON FUNCTION public.place_view_totals(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_view_totals(uuid[]) TO anon, authenticated;
