-- nearby_places previously returned archived rows. Combined with the
-- client-side enrichment query in useNearbyPlaces.fetchPage (which also
-- did not filter archived), closed/merged places appeared in the
-- "Nearby" sidebar AND as duplicate markers on the map at the same
-- coordinates as their successor live row. Bistro Tilo Retie was the
-- reported case: 1 live row + 1 archived row stacking on the map.
--
-- Add `archived_at IS NULL` to the function body. SETOF places signature
-- unchanged, so the client doesn't need a new RPC name.
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
  AND archived_at IS NULL
  AND (cat = 'all' OR category = cat)
  ORDER BY geom <-> ST_SetSRID(ST_MakePoint(lng, lat), 4326)
  LIMIT lim OFFSET off_set;
$$ LANGUAGE sql STABLE;
