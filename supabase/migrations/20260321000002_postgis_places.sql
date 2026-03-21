-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geometry column
ALTER TABLE places ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326);

-- Populate geom from existing lat/lng
UPDATE places SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND geom IS NULL;

-- Spatial index
CREATE INDEX IF NOT EXISTS idx_places_geom ON places USING GIST(geom);

-- New columns for import support
DO $$ BEGIN
  ALTER TABLE places ADD COLUMN source TEXT DEFAULT 'user';
  EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE places ADD COLUMN source_id TEXT;
  EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE places ADD COLUMN images TEXT[] DEFAULT '{}';
  EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE places ADD COLUMN price_range TEXT;
  EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE places ADD COLUMN cuisine_types TEXT[] DEFAULT '{}';
  EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE places ADD COLUMN vegan_level TEXT;
  EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE places ADD COLUMN average_rating NUMERIC(3,2) DEFAULT 0;
  EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE places ADD COLUMN review_count INT DEFAULT 0;
  EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Unique index for dedup on imports
CREATE UNIQUE INDEX IF NOT EXISTS idx_places_source ON places(source, source_id) WHERE source_id IS NOT NULL;

-- Nearby places function
CREATE OR REPLACE FUNCTION nearby_places(lat float8, lng float8, radius_km float8 DEFAULT 50, lim int DEFAULT 20, off_set int DEFAULT 0)
RETURNS SETOF places AS $$
  SELECT * FROM places
  WHERE geom IS NOT NULL
  AND ST_DWithin(geom, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, radius_km * 1000)
  ORDER BY geom <-> ST_SetSRID(ST_MakePoint(lng, lat), 4326)
  LIMIT lim OFFSET off_set;
$$ LANGUAGE sql STABLE;
