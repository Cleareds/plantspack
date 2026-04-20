-- Redirect table: old/historical place slugs → canonical place_id.
-- Used by the /place/[id] route to 301-redirect stale external links to the
-- current canonical slug after the mass-backfill of broken auto-generated
-- slugs (bug fixed in 20260420000000_fix_slug_trigger_case.sql).

CREATE TABLE IF NOT EXISTS place_slug_aliases (
  old_slug    TEXT PRIMARY KEY,
  place_id    UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_place_slug_aliases_place_id ON place_slug_aliases (place_id);

ALTER TABLE place_slug_aliases ENABLE ROW LEVEL SECURITY;
-- Public read is fine — it's just a slug → id mapping used by the redirect.
CREATE POLICY place_slug_aliases_public_read ON place_slug_aliases
  FOR SELECT USING (true);
-- Writes only through service role (admin scripts).
