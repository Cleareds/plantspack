-- Schedule-a-future-archive column.
-- Use case: a place we know is closing on a specific date, but we want it
-- live on the platform until then. Millennium Oakland is the first customer
-- (closes 2026-05-17 after 31 years).
--
-- The daily refresh-scores cron picks up anything whose scheduled_archive_at
-- is in the past and archives it — no new cron slot needed.

ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS scheduled_archive_at TIMESTAMPTZ;

-- Partial index so the cron's WHERE clause is an index scan, not a seq scan.
CREATE INDEX IF NOT EXISTS idx_places_scheduled_archive
  ON public.places (scheduled_archive_at)
  WHERE scheduled_archive_at IS NOT NULL AND archived_at IS NULL;

COMMENT ON COLUMN public.places.scheduled_archive_at IS
  'When set, the daily cron will archive this row at this timestamp. Lets us pre-queue closures without a separate timer infrastructure.';
