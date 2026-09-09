-- Make places.osm_ref a real key. Step 1 of docs/osm-sync-plan.md.
--
-- Until now `idx_places_osm_ref` (20260417200000) was a plain, NON-unique
-- index, and 287 osm_ref values were claimed by two live rows each. One of
-- them pointed at two genuinely different London businesses - way:337127148
-- was claimed by both "Ravi Shankar" and "Crown & Anchor" - so a sync keyed on
-- osm_ref would have written one venue's OSM data onto another venue's row.
--
-- Those 287 collisions were resolved first by clearing osm_ref on the weaker
-- claimant (scripts/_osm-sync-step1-2-2026-09-09.mjs, with every cleared value
-- backed up to backups/osm-ref-cleared-2026-09-09.json). This migration locks
-- the invariant in so it cannot come back.
--
-- Partial on two counts:
--   * WHERE osm_ref IS NOT NULL  - most non-OSM places have no ref.
--   * AND archived_at IS NULL    - an archived duplicate keeps its ref as
--                                  history, and must not block the live row
--                                  that inherited the element. Same pattern as
--                                  the source_id index in 20260427210000.
--
-- The format CHECK is NOT VALID on purpose: it enforces the shape for every
-- future write without demanding a full-table rewrite of 61k rows now. Run
-- `ALTER TABLE places VALIDATE CONSTRAINT places_osm_ref_format;` once the
-- existing rows are confirmed clean.

CREATE UNIQUE INDEX IF NOT EXISTS idx_places_osm_ref_unique
  ON public.places (osm_ref)
  WHERE osm_ref IS NOT NULL AND archived_at IS NULL;

ALTER TABLE public.places
  DROP CONSTRAINT IF EXISTS places_osm_ref_format;

ALTER TABLE public.places
  ADD CONSTRAINT places_osm_ref_format
  CHECK (osm_ref IS NULL OR osm_ref ~ '^(node|way|relation):[0-9]+$')
  NOT VALID;

COMMENT ON INDEX public.idx_places_osm_ref_unique IS
  'One live place per OSM element. Prerequisite for the three-way OSM merge; see docs/osm-sync-plan.md.';
