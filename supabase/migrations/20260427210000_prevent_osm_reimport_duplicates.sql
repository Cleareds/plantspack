-- Prevent the OSM reimport duplicate problem at the DB layer.
--
-- Background: 13K+ duplicate places accumulated because earlier OSM imports
-- left source_id NULL, so later runs that deduplicated on source_id didn't
-- see them and re-inserted the same OSM nodes under different slugs.
--
-- This partial UNIQUE index makes a second insert with the same source_id
-- impossible at the database level, regardless of what the import script does.
-- Archived rows are excluded so the dedup-archive script can keep its history.

CREATE UNIQUE INDEX IF NOT EXISTS places_source_id_active_unique
  ON public.places (source_id)
  WHERE source_id IS NOT NULL AND archived_at IS NULL;

-- Helpful for the dedup-archive script and admin queries
CREATE INDEX IF NOT EXISTS places_archived_reason_idx
  ON public.places (archived_reason)
  WHERE archived_reason IS NOT NULL;
