-- Business tools round 2 (2026-10-23). Additive only.
--
-- user_preferences.venue_updates  opt-out for Partner venue messages (default on: following a city or saving a place)
-- places.booking_url / order_url  "Book a table" / "Order online" buttons (Partner venues)
-- event_features                  one featured ("Sponsored") event slot per Partner place per month
-- nearby_deals()                  live deals of Partner places near a point (app "Deals near you")

alter table public.user_preferences
  add column if not exists venue_updates boolean not null default true;
comment on column public.user_preferences.venue_updates is
  'false = do not show monthly messages from Partner venues (in-app notifications).';

alter table public.places
  add column if not exists booking_url text check (booking_url is null or (char_length(booking_url) <= 500 and booking_url ~* '^https?://')),
  add column if not exists order_url text check (order_url is null or (char_length(order_url) <= 500 and order_url ~* '^https?://'));

create table if not exists public.event_features (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  place_id    uuid not null references public.places(id) on delete cascade,
  month       date not null check (extract(day from month) = 1),
  created_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (place_id, month)
);
create index if not exists event_features_month_idx on public.event_features (month);
alter table public.event_features enable row level security;
drop policy if exists event_features_public_read on public.event_features;
create policy event_features_public_read on public.event_features
  for select to anon, authenticated using (public.place_has_partner_plan(place_id));
grant select on table public.event_features to anon, authenticated;
grant all on table public.event_features to service_role;

create or replace function public.nearby_deals(p_lat double precision, p_lng double precision, p_km double precision default 25, p_limit integer default 20)
returns table (
  deal_id uuid, title text, details text, audience text, ends_on date,
  place_id uuid, place_slug text, place_name text, city text, main_image_url text, distance_km double precision
)
language sql stable security definer set search_path = public as $$
  with box as (
    select p_km / 111.0 as dlat, p_km / (111.0 * greatest(cos(radians(p_lat)), 0.01)) as dlng
  )
  select d.id, d.title, d.details, d.audience, d.ends_on,
         p.id, p.slug, p.name, p.city, p.main_image_url,
         6371 * 2 * asin(sqrt(power(sin(radians(p.latitude - p_lat) / 2), 2)
           + cos(radians(p_lat)) * cos(radians(p.latitude)) * power(sin(radians(p.longitude - p_lng) / 2), 2))) as distance_km
  from public.place_deals d
  join public.places p on p.id = d.place_id
  cross join box
  where d.status = 'active'
    and d.starts_on <= current_date
    and (d.ends_on is null or d.ends_on >= current_date)
    and p.archived_at is null
    and p.latitude between p_lat - box.dlat and p_lat + box.dlat
    and p.longitude between p_lng - box.dlng and p_lng + box.dlng
    and public.place_has_partner_plan(p.id)
  order by distance_km
  limit least(greatest(p_limit, 1), 50);
$$;
grant execute on function public.nearby_deals(double precision, double precision, double precision, integer) to anon, authenticated;
