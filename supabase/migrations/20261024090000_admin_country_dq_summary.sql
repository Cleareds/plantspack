-- Per-country data-quality rollup for the admin Country audits panel.
-- One aggregate query instead of paging 52K rows through PostgREST.
-- Service role only: the admin API route checks the caller's role first.

create or replace function public.admin_country_dq_summary()
returns table (
  country            text,
  total              bigint,
  fully_vegan        bigint,
  fv_checked         bigint,   -- fully_vegan with verification_level >= 3
  mostly_vegan       bigint,
  checked            bigint,   -- any level with verification_level >= 3
  human_verified     bigint,   -- is_verified = true (admin_review through the UI)
  no_website         bigint,
  no_image           bigint,
  odd_city           bigint,   -- city labels that look like admin units, not towns
  community          bigint,   -- rows added by members
  last_verified_at   timestamptz,
  cities             bigint
)
language sql stable security definer set search_path = public as $$
  select
    p.country,
    count(*)                                                                   as total,
    count(*) filter (where p.vegan_level = 'fully_vegan')                      as fully_vegan,
    count(*) filter (where p.vegan_level = 'fully_vegan'
                       and coalesce(p.verification_level, 0) >= 3)             as fv_checked,
    count(*) filter (where p.vegan_level = 'mostly_vegan')                     as mostly_vegan,
    count(*) filter (where coalesce(p.verification_level, 0) >= 3)             as checked,
    count(*) filter (where p.is_verified)                                      as human_verified,
    count(*) filter (where p.website is null or p.website = '')                as no_website,
    count(*) filter (where p.main_image_url is null
                       and coalesce(array_length(p.images, 1), 0) = 0)         as no_image,
    count(*) filter (where p.city ~* '(hromada|municipality|district|gemeinde|bezirk|oblast|raion|county|province|borough|urban|rural|metropolitan|arrondissement|kreis|landkreis)') as odd_city,
    count(*) filter (where p.verification_method = 'community_submission'
                       or p.source in ('user', 'mobile-suggest'))              as community,
    max(p.last_verified_at)                                                    as last_verified_at,
    count(distinct p.city)                                                     as cities
  from public.places p
  where p.archived_at is null
    and p.country is not null
    and p.country <> ''
  group by p.country
  order by count(*) desc;
$$;

revoke all on function public.admin_country_dq_summary() from public, anon, authenticated;
grant execute on function public.admin_country_dq_summary() to service_role;
