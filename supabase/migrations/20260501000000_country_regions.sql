-- Generic country-regions support: aggregation pages between country and city.
--
-- Each row maps a region (e.g. "Brussels-Capital", "Flanders") under a country
-- to the canonical place.city values that belong to it. Used for:
--   1. Region landing pages /vegan-places/<country>/region/<region>
--   2. "Browse by region" section on the country page
--   3. City→region back-link banner on the city page
--
-- Generic by design: no Belgium-specific columns. Other countries (Germany
-- Länder, UK home nations, Spain CCAA) seed the same shape later. Country
-- and region slugs follow the same accent-stripping rule used elsewhere
-- (lib/places/slugify.ts), pre-computed at insert time.

CREATE TABLE IF NOT EXISTS country_regions (
  id BIGSERIAL PRIMARY KEY,
  country_slug TEXT NOT NULL,
  region_slug TEXT NOT NULL,
  region_name TEXT NOT NULL,
  -- Optional intro paragraph rendered on the region page. Keep short,
  -- factual; same honesty rules as everywhere else.
  description TEXT,
  -- Order regions appear in country-page list / dropdown. Lower first.
  sort_order INT NOT NULL DEFAULT 0,
  -- Canonical city names as they appear in places.city. Multiple variants
  -- of the same commune (e.g. "Saint-Josse" and "Saint-Josse-ten-Noode")
  -- are listed individually so the GIN lookup matches every row.
  city_names TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country_slug, region_slug)
);

CREATE INDEX IF NOT EXISTS country_regions_country_idx
  ON country_regions(country_slug);

-- Lets us answer "which region contains this city?" in O(log n) by checking
-- if the input value is = ANY(city_names) on every row.
CREATE INDEX IF NOT EXISTS country_regions_city_names_gin
  ON country_regions USING GIN (city_names);

ALTER TABLE country_regions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS country_regions_public_read ON country_regions;
CREATE POLICY country_regions_public_read ON country_regions
  FOR SELECT USING (true);

-- Writes are admin-only; no public/authenticated INSERT/UPDATE/DELETE policy
-- so service-role is the only writer.

-- ----------------------------------------------------------------------
-- Belgium seed: 3 regions matching the official subdivision (Brussels-
-- Capital, Flanders, Wallonia). Cities listed are the exact place.city
-- values currently in the DB; spelling/variant duplicates are included
-- so the lookup catches every place.
-- ----------------------------------------------------------------------

INSERT INTO country_regions (country_slug, region_slug, region_name, description, sort_order, city_names) VALUES
(
  'belgium',
  'brussels-capital',
  'Brussels-Capital Region',
  'The 19 communes of the Brussels-Capital Region. Together they hold Belgium''s densest cluster of fully vegan restaurants, cafes, and stores.',
  10,
  ARRAY[
    'Anderlecht',
    'Auderghem',
    'Brussels',
    'Etterbeek',
    'Evere',
    'Ixelles',
    'Molenbeek',
    'Saint-Gilles',
    'Saint-Josse',
    'Saint-Josse-ten-Noode',
    'Schaerbeek',
    'Uccle - Ukkel',
    'Watermael-Boitsfort',
    'Woluwe-Saint-Lambert',
    'Woluwe-Saint-Pierre'
  ]
),
(
  'belgium',
  'flanders',
  'Flanders',
  'The Dutch-speaking northern region — Antwerp, Ghent, Bruges, Leuven, Hasselt and the rest of the five Flemish provinces.',
  20,
  ARRAY[
    -- West Flanders
    'Bruges', 'Kortrijk', 'Oostende', 'Roeselare', 'Heuvelland', 'Houthulst',
    'Izegem', 'Poperinge', 'Izenberge', 'Knokke-Heist', 'Adinkerke', 'Bredene',
    'Aartrijke', 'Diksmuide', 'Wenduine', 'Sint-Eloois-Vijve', 'De Panne',
    'Ieper', 'Oostkamp', 'Sint-Andries', 'Assebroek',
    -- East Flanders
    'Ghent', 'Aalst', 'Sint-Niklaas', 'Oostakker', 'Ledeberg', 'Hamme', 'Temse',
    'Zelzate', 'Ninove', 'Pajottegem', 'Geraardsbergen', 'Ronse', 'Wachtebeke',
    'Lokeren', 'Wetteren', 'Merelbeke', 'Lemberge', 'Deinze', 'Dikkelvenne',
    -- Antwerp province
    'Antwerp', 'Mechelen', 'Geel', 'Olen', 'Westerlo', 'Retie', 'Kasterlee',
    'Mortsel', 'Hulshout', 'Laakdal', 'Brecht', 'Berchem',
    -- Flemish Brabant
    'Leuven', 'Heverlee', 'Wilsele', 'Vilvoorde', 'Halle', 'Aarschot', 'Bertem',
    'Tervuren', 'Dilbeek',
    -- Limburg (BE)
    'Hasselt', 'Genk', 'Neeroeteren', 'Bocholt', 'Lanaken', 'Beringen',
    'Leopoldsburg', 'Vroenhoven', 'Vroenhoven (Riemst)'
  ]
),
(
  'belgium',
  'wallonia',
  'Wallonia',
  'The French-speaking southern region — Liège, Namur, Mons, Charleroi and the German-speaking communities around Eupen.',
  30,
  ARRAY[
    -- Hainaut
    'Mons', 'Charleroi', 'Tournai', 'Gosselies', 'Gosselie', 'Gerpinnes',
    'Blaregnies', 'Mevergnies-lez-Lens',
    -- Liège (province)
    'Liège', 'Eupen', 'Huy', 'Sprimont', 'Nandrin', 'Aubel', 'Soumagne',
    'Awan', 'Herbiester', 'Chenee', 'St. Vith',
    -- Luxembourg (BE)
    'Bouillon', 'Durbuy', 'Virton',
    -- Namur
    'Namur', 'Dinant', 'Gembloux', 'Andenne', 'Eghezee', 'Florenne',
    'Profondeville', 'Jambe',
    -- Walloon Brabant
    'Louvain-la-Neuve', 'Nivelles', 'Nivelle', 'Waterloo', 'Braine L''Alleud'
  ]
)
ON CONFLICT (country_slug, region_slug) DO NOTHING;
