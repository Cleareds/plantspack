-- City scoring v2: SQL-backed materialized view replacing request-time TS aggregation
--
-- Adds:
--   1. city_populations table (seeded separately from public/data/city-populations.json)
--   2. sync_place_rating trigger on place_reviews -> places.average_rating/review_count
--   3. city_scores materialized view (Bayesian-smoothed quality, VE-weighted dimensions)
--   4. refresh_directory_views() extended to refresh city_scores
--   5. user_followed_cities.score_formula_version + baseline reset to prevent fake deltas

-- =========================================================================
-- 1. city_populations table
-- =========================================================================
CREATE TABLE IF NOT EXISTS city_populations (
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  population INTEGER NOT NULL CHECK (population > 0),
  source TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (city, country)
);

CREATE INDEX IF NOT EXISTS idx_city_populations_country ON city_populations(country);

ALTER TABLE city_populations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS city_populations_select ON city_populations;
CREATE POLICY city_populations_select ON city_populations FOR SELECT USING (true);
-- Writes are service-role-only (bypasses RLS). No insert/update/delete policies needed.

-- =========================================================================
-- 2. Review-sync trigger on place_reviews
-- =========================================================================
CREATE OR REPLACE FUNCTION sync_place_rating()
RETURNS TRIGGER AS $$
DECLARE
  pid UUID := COALESCE(NEW.place_id, OLD.place_id);
BEGIN
  UPDATE places SET
    review_count = (
      SELECT count(*) FROM place_reviews
      WHERE place_id = pid AND deleted_at IS NULL
    ),
    average_rating = COALESCE((
      SELECT avg(rating)::numeric(3,2) FROM place_reviews
      WHERE place_id = pid AND deleted_at IS NULL
    ), 0)
  WHERE id = pid;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_place_reviews_sync ON place_reviews;
CREATE TRIGGER trg_place_reviews_sync
  AFTER INSERT OR UPDATE OF rating, deleted_at OR DELETE ON place_reviews
  FOR EACH ROW EXECUTE FUNCTION sync_place_rating();

-- Backfill existing denormalized values from the reviews table
UPDATE places p SET
  review_count = COALESCE(sub.rc, 0),
  average_rating = COALESCE(sub.avg_rating, 0)
FROM (
  SELECT place_id, count(*) AS rc, avg(rating)::numeric(3,2) AS avg_rating
  FROM place_reviews
  WHERE deleted_at IS NULL
  GROUP BY place_id
) sub
WHERE p.id = sub.place_id;

-- =========================================================================
-- 3. city_scores materialized view
-- =========================================================================
DROP MATERIALIZED VIEW IF EXISTS city_scores;

CREATE MATERIALIZED VIEW city_scores AS
WITH per_place AS (
  SELECT
    city,
    country,
    category,
    vegan_level,
    latitude,
    longitude,
    COALESCE(average_rating, 0)::numeric AS rating,
    COALESCE(review_count, 0) AS rc,
    CASE vegan_level
      WHEN 'fully_vegan' THEN 1.0
      WHEN 'vegan_friendly' THEN 0.35
      ELSE 0
    END::numeric AS ve,
    -- Bayesian smoothed per-place rating: prior m=3.8, strength C=5
    (5.0 * 3.8 + COALESCE(review_count, 0) * COALESCE(average_rating, 0)::numeric)
      / (5.0 + COALESCE(review_count, 0)) AS smoothed_rating
  FROM places
  WHERE city IS NOT NULL AND city != ''
    AND country IS NOT NULL AND country != ''
),
agg AS (
  SELECT
    city,
    country,
    count(*)::int AS place_count,
    count(*) FILTER (WHERE vegan_level = 'fully_vegan')::int AS fv_count,
    count(*) FILTER (WHERE vegan_level = 'vegan_friendly')::int AS vf_count,
    SUM(ve)::numeric AS ve_total,
    COALESCE(SUM(ve) FILTER (WHERE category = 'eat'), 0)::numeric AS ve_eat,
    COALESCE(SUM(ve) FILTER (WHERE category = 'store'), 0)::numeric AS ve_store,
    COALESCE(SUM(ve) FILTER (WHERE category = 'hotel'), 0)::numeric AS ve_hotel,
    COALESCE(SUM(ve) FILTER (WHERE category = 'event'), 0)::numeric AS ve_event,
    COALESCE(SUM(ve) FILTER (WHERE category = 'organisation'), 0)::numeric AS ve_org,
    COALESCE(
      SUM((0.5 + rc) * smoothed_rating) / NULLIF(SUM(0.5 + rc), 0),
      3.8
    )::numeric AS weighted_rating,
    COALESCE(SUM(rc), 0)::numeric AS total_reviews,
    AVG(latitude)::numeric AS center_lat,
    AVG(longitude)::numeric AS center_lng
  FROM per_place
  GROUP BY city, country
),
scored AS (
  SELECT
    a.city,
    a.country,
    a.place_count,
    a.fv_count,
    a.vf_count,
    a.ve_total,
    cp.population,
    a.center_lat,
    a.center_lng,
    -- Accessibility (0-25): hybrid of count-based and per-capita density
    CASE
      WHEN cp.population IS NULL OR cp.population <= 0 THEN
        LEAST(25::numeric, 24.0 * ln(1 + a.ve_total) / ln(51))
      ELSE
        LEAST(
          25::numeric,
          0.35 * (24.0 * ln(1 + a.ve_total) / ln(51))
          + 0.65 * (25.0 * (1 - exp(-(a.ve_total / (cp.population / 100000.0)) / 6.0)))
        )
    END AS accessibility_raw,
    -- Choice (0-25): log-scaled VE abundance + purity bonus
    LEAST(
      25::numeric,
      20.0 * ln(1 + a.ve_total) / ln(81)
      + 5.0 * sqrt(LEAST(1.0, (a.fv_count::numeric / NULLIF(a.place_count, 0)) * 2))
    ) AS choice_raw,
    -- Variety (0-25): per-category VE tiers (depth, not presence)
    LEAST(
      25::numeric,
      10.0 * CASE WHEN a.ve_eat   >= 8 THEN 1.0 WHEN a.ve_eat   >= 3 THEN 0.7 WHEN a.ve_eat   >= 1 THEN 0.4 WHEN a.ve_eat   > 0 THEN 0.15 ELSE 0 END
    +  6.0 * CASE WHEN a.ve_store >= 8 THEN 1.0 WHEN a.ve_store >= 3 THEN 0.7 WHEN a.ve_store >= 1 THEN 0.4 WHEN a.ve_store > 0 THEN 0.15 ELSE 0 END
    +  5.0 * CASE WHEN a.ve_hotel >= 8 THEN 1.0 WHEN a.ve_hotel >= 3 THEN 0.7 WHEN a.ve_hotel >= 1 THEN 0.4 WHEN a.ve_hotel > 0 THEN 0.15 ELSE 0 END
    +  2.0 * CASE WHEN a.ve_event >= 8 THEN 1.0 WHEN a.ve_event >= 3 THEN 0.7 WHEN a.ve_event >= 1 THEN 0.4 WHEN a.ve_event > 0 THEN 0.15 ELSE 0 END
    +  2.0 * CASE WHEN a.ve_org   >= 8 THEN 1.0 WHEN a.ve_org   >= 3 THEN 0.7 WHEN a.ve_org   >= 1 THEN 0.4 WHEN a.ve_org   > 0 THEN 0.15 ELSE 0 END
    ) AS variety_raw,
    -- Quality (0-25): Bayesian-smoothed rating + review coverage.
    -- Coverage bonus only fires when there are fully_vegan places to review.
    LEAST(
      25::numeric,
      GREATEST(0::numeric, 18.0 * (a.weighted_rating - 3.0) / 2.0)
      + CASE
          WHEN a.fv_count > 0 THEN 7.0 * LEAST(1.0, a.total_reviews / (3.0 * a.fv_count))
          ELSE 0
        END
    ) AS quality_raw
  FROM agg a
  LEFT JOIN city_populations cp ON cp.city = a.city AND cp.country = a.country
  WHERE a.place_count >= 5
),
final AS (
  SELECT
    city,
    country,
    place_count,
    fv_count,
    vf_count,
    ROUND(ve_total, 2) AS ve_total,
    population,
    CASE WHEN population IS NOT NULL AND population > 0
      THEN ROUND((fv_count::numeric / population) * 100000, 2)
    END AS per_capita,
    center_lat,
    center_lng,
    ROUND(COALESCE(accessibility_raw, 0))::int AS accessibility,
    ROUND(choice_raw)::int AS choice,
    ROUND(variety_raw)::int AS variety,
    ROUND(COALESCE(quality_raw, 0))::int AS quality,
    LEAST(100, ROUND(COALESCE(accessibility_raw, 0) + choice_raw + variety_raw + COALESCE(quality_raw, 0)))::int AS score
  FROM scored
)
SELECT
  city,
  country,
  regexp_replace(
    regexp_replace(lower(unaccent(city)), '[^a-z0-9]+', '-', 'g'),
    '^-|-$', '', 'g'
  ) AS city_slug,
  place_count,
  fv_count,
  vf_count,
  ve_total,
  population,
  per_capita,
  accessibility,
  choice,
  variety,
  quality,
  score,
  CASE
    WHEN score >= 88 THEN 'A+'
    WHEN score >= 78 THEN 'A'
    WHEN score >= 62 THEN 'B'
    WHEN score >= 45 THEN 'C'
    WHEN score >= 30 THEN 'D'
    ELSE 'F'
  END AS grade,
  center_lat,
  center_lng,
  NOW() AS computed_at
FROM final;

CREATE UNIQUE INDEX idx_city_scores_city_country ON city_scores (city, country);
CREATE INDEX idx_city_scores_score_desc ON city_scores (score DESC, place_count DESC);
CREATE INDEX idx_city_scores_country_score ON city_scores (country, score DESC);
CREATE INDEX idx_city_scores_slug ON city_scores (city_slug);

-- =========================================================================
-- 4. Extend refresh_directory_views() to refresh city_scores
-- =========================================================================
CREATE OR REPLACE FUNCTION refresh_directory_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY directory_countries;
  REFRESH MATERIALIZED VIEW CONCURRENTLY directory_cities;
  REFRESH MATERIALIZED VIEW CONCURRENTLY city_scores;
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- 5. score_formula_version + baseline reset on user_followed_cities
-- Prevents fake deltas when formula changes.
-- =========================================================================
ALTER TABLE user_followed_cities
  ADD COLUMN IF NOT EXISTS score_formula_version INT NOT NULL DEFAULT 2;

UPDATE user_followed_cities f
SET
  last_seen_score = cs.score,
  last_seen_grade = cs.grade,
  score_formula_version = 2
FROM city_scores cs
WHERE cs.city = f.city AND cs.country = f.country;
