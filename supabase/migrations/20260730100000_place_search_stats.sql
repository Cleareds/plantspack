-- Per-place Google Search performance, backfilled from the Search Console API.
--
-- Why a separate table instead of columns on `places`:
--   1. `places` is 60,965 rows and heavily indexed; bulk UPDATEs against it have
--      to be batched and are slow. This table can be truncated and re-run freely.
--   2. The numbers are derived, not authored. Keeping them out of `places` means
--      a re-run can never corrupt curated place data.
--   3. GSC only has 16 months of retention, so this is a rolling snapshot with an
--      explicit period, not a fact about the place. The period columns record
--      exactly what window the numbers cover.
--
-- IMPORTANT semantics, because these are easy to misreport:
--   * `impressions` = times the place page appeared in Google search results.
--   * `clicks`      = times someone opened it FROM Google search.
--   These are Google organic ONLY. They exclude direct traffic, internal
--   navigation, referrals, and the mobile app entirely. They are therefore a
--   LOWER BOUND on "views" and must never be labelled as total views, nor summed
--   with the counts in `content_view_daily`, which measure a different thing.

CREATE TABLE IF NOT EXISTS public.place_search_stats (
  place_id      uuid PRIMARY KEY REFERENCES public.places(id) ON DELETE CASCADE,
  clicks        integer NOT NULL DEFAULT 0,
  impressions   integer NOT NULL DEFAULT 0,
  -- Derived as clicks/impressions over the whole window rather than averaged
  -- across GSC's per-month ctr values, which would weight small months equally.
  ctr           numeric,
  -- Impressions-weighted mean of GSC's per-month average position. A plain mean
  -- would let a 1-impression month move the number as much as a 10,000-one.
  avg_position  numeric,
  period_start  date NOT NULL,
  period_end    date NOT NULL,
  source        text NOT NULL DEFAULT 'gsc',
  fetched_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.place_search_stats IS
  'Google-organic-only search performance per place page, from the GSC API. Lower bound on views; never sum with content_view_daily.';

-- Sorting/filtering the contribution-impact view by reach.
CREATE INDEX IF NOT EXISTS place_search_stats_impressions_idx
  ON public.place_search_stats (impressions DESC);

ALTER TABLE public.place_search_stats ENABLE ROW LEVEL SECURITY;

-- Public read: these are aggregate statistics about our own public pages, with
-- no personal data, and they are rendered on public profile/place surfaces.
-- No INSERT/UPDATE/DELETE policy exists, so writes are service-role only.
DROP POLICY IF EXISTS place_search_stats_public_read ON public.place_search_stats;
CREATE POLICY place_search_stats_public_read
  ON public.place_search_stats FOR SELECT
  TO anon, authenticated
  USING (true);
