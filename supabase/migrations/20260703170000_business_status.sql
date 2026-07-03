-- Business status as a first-class column instead of only tags, so we can show
-- a public "Temporarily closed" label (and an optional expected reopen date)
-- and tell it apart from permanently closed (which gets archived).
--
--   open                -> normal (default)
--   temporarily_closed  -> closed now, plans to reopen (e.g. a seasonal or
--                          "culinary reflection" break) - stays listed, banner shown
--   permanently_closed  -> gone for good (usually then archived)
ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS business_status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS reopen_date date;

ALTER TABLE public.places DROP CONSTRAINT IF EXISTS places_business_status_check;
ALTER TABLE public.places ADD CONSTRAINT places_business_status_check
  CHECK (business_status IN ('open', 'temporarily_closed', 'permanently_closed'));

-- Backfill from the signals we already have (live places only): the Google scan
-- tag and the new community report tag. Permanently-closed handling stays with
-- the archive flow, so we don't touch it here.
UPDATE public.places
SET business_status = 'temporarily_closed'
WHERE archived_at IS NULL
  AND business_status = 'open'
  AND (tags @> ARRAY['google_temporarily_closed']::text[]
       OR tags @> ARRAY['community_report:temporarily_closed']::text[]);

-- Partial index: only the small closed set is worth indexing.
CREATE INDEX IF NOT EXISTS places_business_status_idx ON public.places (business_status) WHERE business_status <> 'open';
