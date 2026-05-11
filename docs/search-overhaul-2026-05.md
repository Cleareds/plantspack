# Search Overhaul — May 2026

Draft proposal. Nothing in this file has been applied to the database or
shipped to production. Intentionally placed under `docs/` rather than
`supabase/migrations/` so `supabase db push` will not pick it up.

Reviewer: Anton. Author: Claude. Date drafted: 2026-05-10 (night).

## Why

Current search:
- `ilike('%term%')` on `places.name` only.
- 4 parallel browser→Supabase queries per keystroke (cities, countries, places,
  recipes) — no server caching, no analytics.
- No diacritic handling, no typo tolerance, no cuisine/address coverage,
  no word-order tolerance, no ranking beyond `average_rating DESC`.
- No `/search?q=…` page → no SEO landing surface for long-tail queries.
- No `WebSite.potentialAction.SearchAction` JSON-LD because we have no
  search results page to point it at.

## Scope of this proposal

A Postgres-native search overhaul (no Algolia/Typesense/embeddings) shipped
across two small PRs:

1. SQL: add `unaccent` extension, generated `search_vector` tsvector on
   `places`, trigram indexes, three ranked search RPCs.
2. App: `/api/search` endpoint, indexable `/search?q=…` page, hero search
   on `/`, rewire `useSearch.ts` to single round-trip, add SearchAction
   JSON-LD.

P1 (UX polish), P2 (analytics), P3 (synonyms/trending) come after.

## Migration SQL (P0)

Filename when ready to ship: `supabase/migrations/<timestamp>_search_overhaul.sql`.

```sql
-- Search overhaul: FTS + trigram + unaccent, ranked RPCs.
-- Safe to run on production; touches only places + directory_cities +
-- posts and creates new objects. No data destruction.

create extension if not exists unaccent;
-- pg_trgm + earthdistance already present per existing migrations.

-- 1. Generated tsvector on places. Weight scheme:
--    A = name (strongest), B = city/country, C = cuisine_types,
--    D = description (weakest).
--    Config = 'simple' so we don't apply language stemming to a
--    multilingual directory.
alter table places
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', unaccent(coalesce(name, ''))), 'A') ||
    setweight(to_tsvector('simple', unaccent(coalesce(city, ''))), 'B') ||
    setweight(to_tsvector('simple', unaccent(coalesce(country, ''))), 'B') ||
    setweight(to_tsvector('simple', unaccent(coalesce(array_to_string(cuisine_types, ' '), ''))), 'C') ||
    setweight(to_tsvector('simple', unaccent(coalesce(description, ''))), 'D')
  ) stored;

create index if not exists idx_places_search_vector
  on places using gin(search_vector);

-- 2. Diacritic-insensitive trigram on name for fuzzy / "did you mean".
--    Wrap unaccent(name) in an immutable expression for the index.
create index if not exists idx_places_name_unaccent_trgm
  on places using gin((unaccent(name)) gin_trgm_ops);

-- 3. Cities: trigram index for autocomplete on directory_cities materialized view.
create index if not exists idx_directory_cities_city_unaccent_trgm
  on directory_cities using gin((unaccent(city)) gin_trgm_ops);

-- 4. RPC: search_places.
create or replace function search_places(
  q text,
  vl text default null,            -- 'fully_vegan' | 'mostly_vegan' | ... | null
  cat text default null,           -- 'eat' | 'store' | ... | null
  near_lat double precision default null,
  near_lng double precision default null,
  result_limit int default 12
)
returns table (
  id uuid,
  slug text,
  name text,
  city text,
  country text,
  vegan_level text,
  category text,
  main_image_url text,
  average_rating numeric,
  review_count int,
  verification_level smallint,
  distance_km double precision,
  rank real
)
language sql stable as $$
  with q_norm as (
    select unaccent(q) as qn,
           plainto_tsquery('simple', unaccent(q)) as tsq
  )
  select
    p.id, p.slug, p.name, p.city, p.country, p.vegan_level, p.category,
    p.main_image_url, p.average_rating, p.review_count, p.verification_level,
    case when near_lat is not null and p.latitude is not null
         then earth_distance(ll_to_earth(near_lat, near_lng),
                             ll_to_earth(p.latitude, p.longitude)) / 1000
         else null end as distance_km,
    (
      ts_rank(p.search_vector, (select tsq from q_norm)) * 4
      + similarity(unaccent(p.name), (select qn from q_norm)) * 3
      + coalesce(p.average_rating, 0) * 0.15
      + ln(1 + coalesce(p.review_count, 0)) * 0.4
      + case p.vegan_level
          when 'fully_vegan'    then 0.8
          when 'mostly_vegan'   then 0.4
          when 'vegan_friendly' then 0.1
          else 0 end
      + coalesce(p.verification_level, 0) * 0.2
      - case when near_lat is not null and p.latitude is not null
             then least(earth_distance(ll_to_earth(near_lat, near_lng),
                                        ll_to_earth(p.latitude, p.longitude)) / 50000, 1.0)
             else 0 end
    )::real as rank
  from places p, q_norm
  where p.archived_at is null
    and (vl  is null or p.vegan_level = vl)
    and (cat is null or p.category    = cat)
    and (
      p.search_vector @@ (select tsq from q_norm)
      or unaccent(p.name) % (select qn from q_norm)
    )
  order by rank desc
  limit result_limit;
$$;

-- 5. RPC: search_cities.
create or replace function search_cities(
  q text,
  vl text default null,
  result_limit int default 8
)
returns table (
  city text,
  country text,
  city_slug text,
  country_slug text,
  place_count int,
  fully_vegan_count int,
  rank real
)
language sql stable as $$
  with q_norm as (select unaccent(q) as qn)
  select
    dc.city, dc.country, dc.city_slug, dc.country_slug,
    case when vl = 'fully_vegan' then dc.fully_vegan_count
         else dc.place_count end as place_count,
    dc.fully_vegan_count,
    (
      similarity(unaccent(dc.city), (select qn from q_norm)) * 4
      + ln(1 + dc.place_count) * 0.5
    )::real as rank
  from directory_cities dc, q_norm
  where unaccent(dc.city) % (select qn from q_norm)
     or unaccent(dc.city) ilike (select qn from q_norm) || '%'
  order by rank desc
  limit result_limit;
$$;

-- 6. RPC: search_recipes (posts where category = 'recipe').
create or replace function search_recipes(q text, result_limit int default 6)
returns table (
  id uuid,
  slug text,
  title text,
  image_url text,
  created_at timestamptz,
  rank real
)
language sql stable as $$
  with q_norm as (
    select unaccent(q) as qn,
           plainto_tsquery('simple', unaccent(q)) as tsq
  )
  select
    p.id, p.slug, p.title, p.image_url, p.created_at,
    (
      ts_rank(
        to_tsvector('simple', unaccent(coalesce(p.title, ''))),
        (select tsq from q_norm)
      ) * 4
      + similarity(unaccent(p.title), (select qn from q_norm)) * 3
    )::real as rank
  from posts p, q_norm
  where p.category = 'recipe'
    and p.deleted_at is null
    and (
      to_tsvector('simple', unaccent(coalesce(p.title, ''))) @@ (select tsq from q_norm)
      or unaccent(p.title) % (select qn from q_norm)
    )
  order by rank desc
  limit result_limit;
$$;

-- 7. Grants for anon + authenticated.
grant execute on function search_places(text, text, text, double precision, double precision, int) to anon, authenticated;
grant execute on function search_cities(text, text, int)                                              to anon, authenticated;
grant execute on function search_recipes(text, int)                                                    to anon, authenticated;
```

### Migration risk notes

- Adding a `STORED` generated column rewrites the whole `places` table.
  At 52K rows this is ~30 seconds and locks the table for writes during
  the rewrite. Run during a low-traffic window or accept the brief lock.
  Alternative if we want zero downtime: add a plain `tsvector` column,
  backfill in batches, attach a trigger, then make it `STORED` later.
  For 52K rows the simple path is fine.
- `pg_trgm` and `earthdistance` extensions are already enabled per
  existing migrations — no new extension installs other than `unaccent`.
- All three RPCs are pure-SQL `STABLE` functions — no side effects,
  no triggers, safe to recreate.
- Existing `idx_places_name_trgm` (the old one) can stay or be dropped
  after the new index is in place; no functional collision.

## App-side changes (P0)

### `/api/search` route

```ts
// src/app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const revalidate = 10

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const q = (url.searchParams.get('q') || '').trim()
  if (q.length < 2) {
    return NextResponse.json({ places: [], cities: [], recipes: [] })
  }
  const vl   = url.searchParams.get('vl')
  const cat  = url.searchParams.get('cat')
  const near = url.searchParams.get('near')           // "lat,lng"
  const [nearLat, nearLng] = near ? near.split(',').map(Number) : [null, null]

  const sb = await createClient()
  const [placesRes, citiesRes, recipesRes] = await Promise.all([
    sb.rpc('search_places', {
      q, vl, cat,
      near_lat: nearLat, near_lng: nearLng,
      result_limit: 12,
    }),
    sb.rpc('search_cities',  { q, vl, result_limit: 6 }),
    sb.rpc('search_recipes', { q, result_limit: 6 }),
  ])

  return NextResponse.json({
    places:  placesRes.data  || [],
    cities:  citiesRes.data  || [],
    recipes: recipesRes.data || [],
  }, {
    headers: { 'Cache-Control': 's-maxage=10, stale-while-revalidate=60' },
  })
}
```

### `/search?q=…` page

- SSR, indexable (`robots: index, follow`).
- Reads `?q`, `?vl`, `?cat`, `?near` from URL.
- Calls the same RPCs server-side.
- Renders real `<a>` to `/place/<slug>` and `/vegan-places/<country>/<city>`
  so Googlebot follows.
- Emits `BreadcrumbList` + `SearchResultsPage` JSON-LD.
- Title/description/canonical based on the query: e.g. for `?q=ramen`,
  `<title>"ramen" — Vegan places matching your search | PlantsPack</title>`.

### Rewire `useSearch.ts`

- Replace the 4 parallel Supabase queries with a single `fetch('/api/search?q=…')`.
- Same dropdown shape, same debounce, fewer round-trips, server-side
  cacheable.

### Homepage hero search

- New component above the city-rank carousel:
  `<HeroSearch placeholder="Find vegan ramen in Tokyo" />`
- Submits to `/search?q=<query>`.
- Rotating placeholders driven by an array of curated examples that hit
  cuisine + city combinations, to teach users what kind of query works.

### `WebSite.potentialAction.SearchAction` JSON-LD

In `src/app/layout.tsx`, replace the comment that says we intentionally
omit it with:

```ts
{
  '@type': 'WebSite',
  '@id': 'https://www.plantspack.com/#website',
  url:  'https://www.plantspack.com',
  name: 'PlantsPack',
  publisher: { '@id': 'https://www.plantspack.com/#organization' },
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://www.plantspack.com/search?q={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
}
```

## P1 — UX polish (later PR)

- Inferred facet chips from the query: detect known city names
  ("berlin") and category words ("bakery", "cafe") in `q` and surface
  them as removable chips above results. Pre-fill `vl`/`cat` filters.
- Highlight matched substring in result names (use the same `unaccent`-aware
  normalizer client-side).
- Show distance + small map pin icon when user has geolocation.
- Zero-result page: popular cities grid + "Add a missing place" CTA.

## P2 — Instrumentation

```sql
create table if not exists search_logs (
  id uuid primary key default gen_random_uuid(),
  q text not null,
  result_count int not null,
  clicked_slug text,
  session_id text,
  user_id uuid references users(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_search_logs_q on search_logs (q);
create index if not exists idx_search_logs_created_at on search_logs (created_at desc);
```

Endpoint: `POST /api/search/log` — fire-and-forget from client when a
result is clicked. Used for weekly digest of zero-result queries.

## P3 — Later

- Synonym/redirect map: `nyc → New York`, `ldn → London`, `roma → rome`,
  `100% vegan → vl=fully_vegan`. Cheap dict in TS, applied to `q` before
  the RPC.
- Trending searches in the dropdown when input is empty.
- Pre-render top-100 search queries as static `/search/<slug>` pages for
  SEO long-tail (e.g. `/search/vegan-bakery-berlin`).
- Reconsider Algolia/Typesense only if visits exceed ~5K/day or row
  count exceeds ~500K. Postgres FTS at 50K rows is essentially free.

## Connection to the SEO work (Tier 1+2 already shipped, Tier 3 pending)

- Building `/search?q=…` unlocks `SearchAction` JSON-LD, which adds a
  brand sitelinks-searchbox signal in Google SERPs.
- Indexable search result pages give us long-tail SEO surfaces ("vegan
  bakery berlin", "fully vegan ramen tokyo") with real organic
  potential.
- Together with the Tier 3 Wikidata + Crunchbase + Product Hunt
  entity-grounding, this materially strengthens the brand-entity cluster
  Google builds around "PlantsPack".

## Out of scope on purpose

- Algolia / Typesense / Elastic / Meilisearch.
- Embeddings / vector search.
- OpenAI query reformulation (cost rule, marginal value at this scale).
- Per-locale language stemming (premature; `simple` + unaccent is
  the right default for a 160-country directory).
- Rewriting the existing `/api/places/directory` endpoint — it's
  doing browse, not search; leave it alone.

## Rollout order when ready to ship

1. Merge the SQL migration. Verify `select count(*) from places where
   search_vector is null` returns 0.
2. Ship the `/api/search` endpoint + the `/search?q=…` page in the
   same PR. They depend on the RPCs from step 1.
3. Rewire `useSearch.ts` to call `/api/search`. Drop the 4-query
   parallel pattern.
4. Add the hero search component on `/`.
5. Add `SearchAction` JSON-LD to `layout.tsx`.
6. P1 / P2 / P3 in subsequent PRs as bandwidth allows.

## What this fixes, concretely

- `ecru rome` → finds écru.
- `vegan bakery berlin` → finds Berlin bakeries, ranked by popularity.
- `restauarant` → finds restaurants (trigram covers the typo).
- `ramen` → finds places with cuisine_types containing ramen.
- `bodhi leuven` → still finds Bodhi (no regression).
- Google sees a search box in the brand SERP via `SearchAction`.
- We can finally answer "what are people searching for?".
