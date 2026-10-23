-- Whole-word match for admin-unit city labels: the first version matched
-- substrings, so "Peterborough" (borough) and "Urbana" (urban) were flagged.
create or replace function public.admin_country_dq_summary()
returns table (
  country text, total bigint, fully_vegan bigint, fv_checked bigint, mostly_vegan bigint,
  checked bigint, human_verified bigint, no_website bigint, no_image bigint, odd_city bigint,
  community bigint, last_verified_at timestamptz, cities bigint
)
language sql stable security definer set search_path = public as $$
  select
    p.country,
    count(*),
    count(*) filter (where p.vegan_level = 'fully_vegan'),
    count(*) filter (where p.vegan_level = 'fully_vegan' and coalesce(p.verification_level, 0) >= 3),
    count(*) filter (where p.vegan_level = 'mostly_vegan'),
    count(*) filter (where coalesce(p.verification_level, 0) >= 3),
    count(*) filter (where p.is_verified),
    count(*) filter (where p.website is null or p.website = ''),
    count(*) filter (where p.main_image_url is null and coalesce(array_length(p.images, 1), 0) = 0),
    count(*) filter (where p.city ~* '\m(hromada|municipality|district|gemeinde|bezirk|oblast|raion|county|province|arrondissement|landkreis|kreis|metropolitan borough|london borough)\M'),
    count(*) filter (where p.verification_method = 'community_submission' or p.source in ('user', 'mobile-suggest')),
    max(p.last_verified_at),
    count(distinct p.city)
  from public.places p
  where p.archived_at is null and p.country is not null and p.country <> ''
  group by p.country
  order by count(*) desc;
$$;

revoke all on function public.admin_country_dq_summary() from public, anon, authenticated;
grant execute on function public.admin_country_dq_summary() to service_role;
