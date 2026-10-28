-- Places whose coordinates are a city or country centre (geocoding fallback,
-- imports without a street address) carry the tag 'approximate_location'.
-- Apps keep them out of "Near you" and /admin/data-quality lists them.
-- When the coordinates are changed (admin fix, OSM match), the tag is dropped
-- unless the same update adds it on purpose.

create or replace function public.places_clear_approximate_location()
returns trigger
language plpgsql
as $$
begin
  if (new.latitude is distinct from old.latitude or new.longitude is distinct from old.longitude)
     and 'approximate_location' = any(coalesce(old.tags, '{}'))
     and 'approximate_location' = any(coalesce(new.tags, '{}')) then
    new.tags := array_remove(new.tags, 'approximate_location');
  end if;
  return new;
end;
$$;

drop trigger if exists places_clear_approximate_location on public.places;
create trigger places_clear_approximate_location
  before update of latitude, longitude on public.places
  for each row execute function public.places_clear_approximate_location();
