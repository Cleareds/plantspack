-- Foursquare enrichment tracking
-- Stores match results from Foursquare Places API cross-check
ALTER TABLE places
  ADD COLUMN IF NOT EXISTS foursquare_id TEXT,
  ADD COLUMN IF NOT EXISTS foursquare_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS foursquare_status TEXT,
  ADD COLUMN IF NOT EXISTS foursquare_data JSONB;

-- foursquare_status values:
--   'matched'         - high-confidence name+location match found
--   'weak_match'      - low-confidence match (manual review)
--   'no_match'        - searched but no candidate found
--   'permanently_closed' - FSQ reports closed
--   'error'           - API error during lookup

CREATE INDEX IF NOT EXISTS idx_places_foursquare_id ON places (foursquare_id) WHERE foursquare_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_places_foursquare_status ON places (foursquare_status) WHERE foursquare_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_places_foursquare_checked_at ON places (foursquare_checked_at);
