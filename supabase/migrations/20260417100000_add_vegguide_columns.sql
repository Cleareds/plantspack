-- VegGuide.org cross-reference tracking
ALTER TABLE places
  ADD COLUMN IF NOT EXISTS vegguide_id INTEGER,
  ADD COLUMN IF NOT EXISTS vegguide_checked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_places_vegguide_id ON places (vegguide_id) WHERE vegguide_id IS NOT NULL;
