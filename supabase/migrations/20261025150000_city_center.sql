-- Map centre + extent of a city, from its places (median, so one mis-geocoded
-- row does not drag the centre). Used by the app's map search: tapping a city
-- flies the map there. Read-only, public data.
create or replace function public.city_center(p_city text, p_country text)
returns table (lat double precision, lng double precision, span_km double precision)
language sql
stable
set search_path = public
as $$
  select
    percentile_cont(0.5) within group (order by p.latitude) as lat,
    percentile_cont(0.5) within group (order by p.longitude) as lng,
    greatest(
      (percentile_cont(0.9) within group (order by p.latitude) - percentile_cont(0.1) within group (order by p.latitude)) * 111,
      (percentile_cont(0.9) within group (order by p.longitude) - percentile_cont(0.1) within group (order by p.longitude)) * 111
        * cos(radians(percentile_cont(0.5) within group (order by p.latitude)))
    ) as span_km
  from places p
  where p.archived_at is null
    and p.latitude is not null and p.longitude is not null
    and lower(p.city) = lower(p_city)
    and lower(p.country) = lower(p_country)
$$;

grant execute on function public.city_center(text, text) to anon, authenticated;
