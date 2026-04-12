-- Add indexes for faster search on directory materialized views
CREATE INDEX IF NOT EXISTS idx_directory_cities_city ON directory_cities (city);
CREATE INDEX IF NOT EXISTS idx_directory_cities_country ON directory_cities (country);
CREATE INDEX IF NOT EXISTS idx_directory_countries_country ON directory_countries (country);

-- Add index for place name search
CREATE INDEX IF NOT EXISTS idx_places_name_trgm ON places USING gin (name gin_trgm_ops);

-- Add index for city search on places
CREATE INDEX IF NOT EXISTS idx_places_city ON places (city);
CREATE INDEX IF NOT EXISTS idx_places_country ON places (country);
