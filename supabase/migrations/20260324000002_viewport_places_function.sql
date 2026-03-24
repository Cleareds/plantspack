-- Function to get places within a map viewport (bounding box)
-- Used by the map to show all visible places when panning/zooming
CREATE OR REPLACE FUNCTION viewport_places(
  min_lat float8,
  min_lng float8,
  max_lat float8,
  max_lng float8,
  cat text DEFAULT 'all',
  lim int DEFAULT 500
)
RETURNS SETOF places AS $$
  SELECT * FROM places
  WHERE latitude BETWEEN min_lat AND max_lat
    AND longitude BETWEEN min_lng AND max_lng
    AND (cat = 'all' OR category = cat)
  ORDER BY name
  LIMIT lim;
$$ LANGUAGE sql STABLE;
