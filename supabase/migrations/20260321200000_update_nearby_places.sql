-- Update nearby_places to support category filtering and no radius limit
-- Drop and recreate to change signature
DROP FUNCTION IF EXISTS nearby_places(float8, float8, float8, int, int);

CREATE OR REPLACE FUNCTION nearby_places(
  lat float8,
  lng float8,
  lim int DEFAULT 20,
  off_set int DEFAULT 0,
  cat text DEFAULT 'all'
)
RETURNS SETOF places AS $$
  SELECT * FROM places
  WHERE geom IS NOT NULL
  AND (cat = 'all' OR category = cat)
  ORDER BY geom <-> ST_SetSRID(ST_MakePoint(lng, lat), 4326)
  LIMIT lim OFFSET off_set;
$$ LANGUAGE sql STABLE;

-- Ensure all places have geom populated (for newly added places)
UPDATE places SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND geom IS NULL;

-- Create trigger to auto-populate geom on insert/update
CREATE OR REPLACE FUNCTION places_update_geom()
RETURNS trigger AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS places_geom_trigger ON places;
CREATE TRIGGER places_geom_trigger
  BEFORE INSERT OR UPDATE OF latitude, longitude ON places
  FOR EACH ROW
  EXECUTE FUNCTION places_update_geom();
