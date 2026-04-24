-- Add mostly_vegan tier (weight 0.70) and activate vegan_options (weight 0.10).
-- Drops and recreates the city_scores materialized view with updated VE weights.
-- Data is not lost — scores are recomputed from places on next REFRESH.

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
      WHEN 'fully_vegan'    THEN 1.00
      WHEN 'mostly_vegan'   THEN 0.70
      WHEN 'vegan_friendly' THEN 0.35
      WHEN 'vegan_options'  THEN 0.10
      ELSE 0
    END::numeric AS ve,
    (5.0 * 3.8 + COALESCE(review_count, 0) * COALESCE(average_rating, 0)::numeric)
      / (5.0 + COALESCE(review_count, 0)) AS smoothed_rating
  FROM places
  WHERE archived_at IS NULL
    AND city IS NOT NULL
    AND country IS NOT NULL
    AND latitude IS NOT NULL
    AND longitude IS NOT NULL
),
agg AS (
  SELECT
    city,
    country,
    count(*) AS place_count,
    count(*) FILTER (WHERE vegan_level = 'fully_vegan')  AS fv_count,
    count(*) FILTER (WHERE vegan_level = 'vegan_friendly') AS vf_count,
    SUM(ve) AS ve_total,
    count(*) FILTER (WHERE category = 'eat'          AND ve > 0) AS ve_eat,
    count(*) FILTER (WHERE category = 'store'        AND ve > 0) AS ve_store,
    count(*) FILTER (WHERE category = 'hotel'        AND ve > 0) AS ve_hotel,
    count(*) FILTER (WHERE category = 'event'        AND ve > 0) AS ve_event,
    count(*) FILTER (WHERE category = 'organisation' AND ve > 0) AS ve_org,
    SUM(rc * smoothed_rating) / NULLIF(SUM(rc), 0) AS weighted_rating,
    SUM(rc) AS total_reviews,
    AVG(latitude)::numeric(9,6)  AS center_lat,
    AVG(longitude)::numeric(9,6) AS center_lng
  FROM per_place
  GROUP BY city, country
),
scored AS (
  SELECT
    a.*,
    cp.population,
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
    LEAST(
      25::numeric,
      20.0 * ln(1 + a.ve_total) / ln(81)
      + 5.0 * sqrt(LEAST(1.0, (a.fv_count::numeric / NULLIF(a.place_count, 0)) * 2))
    ) AS choice_raw,
    LEAST(
      25::numeric,
      10.0 * CASE WHEN a.ve_eat   >= 8 THEN 1.0 WHEN a.ve_eat   >= 3 THEN 0.7 WHEN a.ve_eat   >= 1 THEN 0.4 WHEN a.ve_eat   > 0 THEN 0.15 ELSE 0 END
    +  6.0 * CASE WHEN a.ve_store >= 8 THEN 1.0 WHEN a.ve_store >= 3 THEN 0.7 WHEN a.ve_store >= 1 THEN 0.4 WHEN a.ve_store > 0 THEN 0.15 ELSE 0 END
    +  5.0 * CASE WHEN a.ve_hotel >= 8 THEN 1.0 WHEN a.ve_hotel >= 3 THEN 0.7 WHEN a.ve_hotel >= 1 THEN 0.4 WHEN a.ve_hotel > 0 THEN 0.15 ELSE 0 END
    +  2.0 * CASE WHEN a.ve_event >= 8 THEN 1.0 WHEN a.ve_event >= 3 THEN 0.7 WHEN a.ve_event >= 1 THEN 0.4 WHEN a.ve_event > 0 THEN 0.15 ELSE 0 END
    +  2.0 * CASE WHEN a.ve_org   >= 8 THEN 1.0 WHEN a.ve_org   >= 3 THEN 0.7 WHEN a.ve_org   >= 1 THEN 0.4 WHEN a.ve_org   > 0 THEN 0.15 ELSE 0 END
    ) AS variety_raw,
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
    WHEN score >= 70 THEN 'B+'
    WHEN score >= 62 THEN 'B'
    WHEN score >= 54 THEN 'C+'
    WHEN score >= 45 THEN 'C'
    WHEN score >= 37 THEN 'D+'
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

-- Partial index for the new tier (for quick lookups by city)
CREATE INDEX idx_places_mostly_vegan ON places (city, country) WHERE vegan_level = 'mostly_vegan';
CREATE INDEX idx_places_vegan_options ON places (city, country) WHERE vegan_level = 'vegan_options';

-- Refresh now so scores reflect updated weights immediately
REFRESH MATERIALIZED VIEW CONCURRENTLY city_scores;
