-- Add a "ranked cities" count to platform_stats so the homepage hero can
-- show an honest number. Today the hero shows 10,008 "cities covered"
-- but 6,000+ of those are 1-place tags (a single shop or brand HQ
-- happens to have a city tag) - which isn't really a "city covered" in
-- any meaningful directory sense.
--
-- The number we actually want to surface is "cities scored" - cities
-- that meet the >=5-places threshold for a city_score and therefore
-- have a real vegan-density score and a meaningful guide.

DROP MATERIALIZED VIEW IF EXISTS platform_stats CASCADE;

CREATE MATERIALIZED VIEW platform_stats AS
SELECT
  COUNT(*) FILTER (WHERE archived_at IS NULL)                                   AS total_places,
  COUNT(*) FILTER (WHERE archived_at IS NULL AND vegan_level = 'fully_vegan')   AS fully_vegan,
  COUNT(*) FILTER (WHERE archived_at IS NULL AND category = 'eat')              AS restaurants,
  COUNT(*) FILTER (WHERE archived_at IS NULL AND category = 'store')            AS stores,
  COUNT(*) FILTER (WHERE archived_at IS NULL AND category = 'hotel')            AS stays,
  COUNT(*) FILTER (WHERE archived_at IS NULL AND category = 'organisation')     AS sanctuaries,
  COUNT(DISTINCT country)
    FILTER (WHERE archived_at IS NULL AND country IS NOT NULL AND country <> '') AS countries,
  COUNT(DISTINCT (city, country))
    FILTER (WHERE archived_at IS NULL AND city IS NOT NULL AND city <> ''
                                       AND country IS NOT NULL AND country <> '') AS cities,
  -- Subset of `cities` that have >= 5 places, which is the threshold the
  -- city_score MV uses for ranking. Honest "cities covered" number.
  (SELECT COUNT(*) FROM city_scores)                                            AS cities_ranked
FROM places;

CREATE UNIQUE INDEX IF NOT EXISTS platform_stats_singleton
  ON platform_stats ((1));

REFRESH MATERIALIZED VIEW platform_stats;

GRANT SELECT ON platform_stats TO anon, authenticated;
