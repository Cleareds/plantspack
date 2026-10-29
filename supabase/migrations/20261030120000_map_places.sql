-- Map markers for a viewport, most important first.
--
-- The app used to select places in the box with limit 300 and no order, so in
-- a big city (Berlin 1,767 places, London 1,186, Munich 761, Vienna 662) the
-- map showed an arbitrary 300 and often missed 100% vegan places. This returns
-- the top p_limit by vegan level, then verification, then rating, so a zoomed-
-- out view always shows the fully vegan places first and zooming in fills in
-- the rest.
create or replace function public.map_places(
  p_min_lat double precision,
  p_max_lat double precision,
  p_min_lng double precision,
  p_max_lng double precision,
  p_vegan_only boolean default false,
  p_category text default null,
  p_subcategory text default null,
  p_cuisine text default null,
  p_pet_friendly boolean default false,
  p_limit int default 600
)
returns table (
  id uuid, slug text, name text, latitude double precision, longitude double precision,
  vegan_level text, category text, main_image_url text, city text, country text,
  average_rating numeric, opening_hours jsonb, tags text[]
)
language sql
stable
set search_path to 'public'
as $$
  select p.id, p.slug, p.name, p.latitude, p.longitude, p.vegan_level, p.category, p.main_image_url,
         p.city, p.country, p.average_rating, p.opening_hours::jsonb,
         -- Only the tag the map reads (keeps the payload small).
         array(select t from unnest(p.tags) t where t = 'approximate_location')
    from places p
   where p.latitude between p_min_lat and p_max_lat
     and p.longitude between p_min_lng and p_max_lng
     and p.archived_at is null
     and (not p_vegan_only or p.vegan_level = 'fully_vegan')
     and (p_category is null or p.category = p_category)
     and (p_subcategory is null or p.subcategory = p_subcategory)
     and (p_cuisine is null or p.cuisine_types @> array[p_cuisine])
     and (not p_pet_friendly or p.is_pet_friendly)
   order by case p.vegan_level
              when 'fully_vegan' then 0 when 'mostly_vegan' then 1
              when 'vegan_friendly' then 2 when 'vegan_options' then 3 else 4 end,
            coalesce(p.verification_level, 0) desc,
            p.average_rating desc nulls last,
            p.review_count desc nulls last,
            p.id
   limit least(greatest(p_limit, 1), 1000)
$$;

grant execute on function public.map_places(double precision, double precision, double precision, double precision, boolean, text, text, text, boolean, int) to anon, authenticated;

-- Exact copy of idx_places_location (btree on latitude, longitude). The 2024
-- schema made places_location_idx, and the 2025 performance migration added
-- idx_places_location under another name, so "if not exists" did not catch it.
-- Not unique, no constraint uses it, 0 scans since the stats began (the other
-- copy: 251,587). Every write to places had to update both.
drop index if exists public.places_location_idx;
