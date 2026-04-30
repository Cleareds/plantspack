---
name: import-places
description: Bulk import vegan places from a city, country, region, or URL list. Invoke via /import-places <source>, or when the user writes "import all vegan places from [city/country]", "scrape vegan places in [city]", or provides a list of URLs/names to add. Runs the full pipeline (OSM fetch → geocode → enrich → insert) with a preview before inserting.
---

# import-places

Bulk-imports vegan and vegan-friendly places using the full pipeline:
**OSM fetch → chain filter → Nominatim geocoding → dedup → insert → enrich (OG image + description)**

Output is a count of places imported + any notable issues.

`$ARGUMENTS` should be one of:
- `--country BE,NL,SE` — import all OSM vegan places for one or more ISO country codes
- `--city "Berlin, Germany"` — focused city-level import via Overpass bbox
- `<URL list>` — a newline-separated list of website URLs (one per line); each goes through the single-place pipeline

## Deciding which mode to use

| Source | Mode | Script |
|---|---|---|
| "all vegan places in France" / country code | `--country` | `import-osm-countries.ts` |
| "vegan places in Barcelona" / city name | `--city` (Overpass + bbox) | `import-osm-countries.ts` with city bbox |
| "add all these places: [URL list]" | URL-per-line → `add-place.ts` | individual calls |
| "here's a CSV / spreadsheet" | Parse → JSON → `add-place.ts` | individual calls |

## Standard pipeline shape (every OSM import gets all of these)

Every imported place lands in the DB with the following fields populated.
Sourced in this priority order; each step is mandatory and runs as part
of `scripts/import-osm-countries.ts`:

| Field | Source priority |
|---|---|
| `vegan_level` | OSM `diet:vegan=only` → `fully_vegan`; `diet:vegan=yes` / `cuisine=vegan` → `fully_vegan`; `diet:vegetarian=only` → `vegan_friendly`. 4-tier system (`fully_vegan` / `mostly_vegan` / `vegan_friendly` / `vegan_options`) preserved end-to-end - admin re-tiers in staging. |
| `address` | OSM `addr:street`+`addr:housenumber` if present, else **Nominatim reverse-geocode** (`zoom=18`) - same call that resolves city, no extra API traffic. Always populated. |
| `city` | OSM `addr:city` / `addr:town` / `addr:village` / `addr:suburb` if present, else Nominatim reverse-geocode. Always populated. |
| `description` | og:description / `<meta name="description">` scrape from website if present, else **`buildFallbackDescription()` deterministic template** (category + cuisine + vegan_level + city). Always populated. |
| `main_image_url` | OSM `image` tags first, then og:image / twitter:image scrape from website. Best-effort - many small spots use Instagram/Facebook only. |

After import, the operator can Claude-improve specific descriptions via
`scripts/_fetch-places-needing-desc.ts` → manual JSON edit →
`scripts/_apply-descriptions.ts`. **Never use OpenAI for descriptions.**

## Full pipeline for country/city imports

The pipeline in `scripts/import-osm-countries.ts` does all of this automatically:

1. **Fetch from OSM Overpass** — widened filter:
   - `diet:vegan=yes|only` (explicit vegan menu) → imported as `fully_vegan` initially
   - `diet:vegetarian=only` (fully vegetarian — imported as `vegan_friendly`)
   - `cuisine=vegan` (explicit vegan cuisine tag)

   **Note:** OSM tags are a starting signal, not final truth. If the enrich pass produces a description, the admin staging triage step should re-evaluate the tier. Use the 4-tier system:
   | Level | When to assign |
   |---|---|
   | `fully_vegan` | Admin confirms zero animal products on menu (V key in staging) |
   | `mostly_vegan` | 85%+ vegan but a few non-vegan items exist (M key in staging) |
   | `vegan_friendly` | Genuine vegan section with 3+ dishes (A key in staging, safe default) |
   | `vegan_options` | Just a few items, not a vegan-focused place (Shift+O in staging) |

2. **Chain filter** — EXCLUDED_CHAINS set in `scripts/lib/place-pipeline.ts` removes animal-centric chains (McDonald's, Burger King, KFC, IKEA, Texas Longhorn, etc.) per Platonic-form-is-vegan policy. Coffee chains, smoothie bars, açaí places, and vegan-first brands are kept.

3. **City normalization** — OSM `addr:city`, `addr:town`, `addr:village`, `addr:suburb` tags used first. Missing cities filled by Nominatim reverse geocoding (1.2s per request rate limit).

4. **Deduplication** — by `source_id` (exact OSM node ID match) and by name+coordinates proximity (within ~100m).

5. **Slug generation** — unique: `name-slug` → `name-city-slug` → `name-city-xxxx` if collision.

6. **Insert** — `verification_status='approved'`, `is_verified=true`, `source='osm-import-YYYY-MM'`.

7. **Enrich pass** — for newly inserted places with a `website`, scrapes:
   - `og:image` → `main_image_url`
   - `og:description` / meta description → `description`
   Uses 2s per-domain rate limiting. Skip with `--no-enrich` if you're doing a quick test run.

## Running a country import

```bash
# Dry run first — preview counts and top cities
npx tsx scripts/import-osm-countries.ts --countries FR --dry-run

# Real import with enrichment
npx tsx scripts/import-osm-countries.ts --countries FR

# Multiple countries
npx tsx scripts/import-osm-countries.ts --countries AU,NZ,CA

# Skip enrichment pass (faster, do it later)
npx tsx scripts/import-osm-countries.ts --countries JP --no-enrich
```

Cross-border contamination is avoided: European countries use ISO area queries (not bounding boxes). Only US and Canada use bbox splits due to Overpass timeout limits.

## Running a URL-list import

When the user gives you a list of specific places by URL or name+city:

1. For each item, invoke the `/add-place` skill logic (fetch website, determine vegan_level, build JSON).
2. Batch-pipe to CLI: `cat <<'EOF' | npx tsx scripts/add-place.ts { ...payload } EOF`
3. The CLI auto-runs OSM cross-reference, geocodes, scrapes hero image, inserts.

For lists > 10 items, inform the user of estimated time (geocoding = ~2s/item, image scraping = ~10-30s/item with website).

## Enrichment for existing places

**Step 1 — OG image + website description** (for places with websites):

```bash
# All places with website but no image
npx tsx scripts/fetch-og-images.ts --limit 1000

# Specific source tag (e.g. the OSM import batch)
npx tsx scripts/fetch-og-images.ts --source osm-import-2026-04 --limit 5000
```

**Step 2 — AI descriptions via OpenAI gpt-4o-mini** (for places still without descriptions after step 1):

```bash
# Dry run to preview prompt
npx tsx scripts/generate-descriptions.ts --dry-run --limit 5

# Generate for specific source batch (~$0.07/1,000 places)
npx tsx scripts/generate-descriptions.ts --source=osm-import-2026-04 --limit=5000

# Generate for all places without descriptions
npx tsx scripts/generate-descriptions.ts --limit=10000
```

gpt-4o-mini generates 2-3 sentence descriptions based on name, type, location, cuisine, and tags. Cost: ~$0.008/1k places. Requires `OPENAI_API_KEY` in `.env.local`. Run after `fetch-og-images.ts` so website-sourced descriptions take priority.

## Data quality checks

Before reporting the import as complete:

- Check for `city=null` places: `SELECT COUNT(*) FROM places WHERE city IS NULL AND source LIKE 'osm-import%'`
- Check for slug collisions: `SELECT slug, COUNT(*) FROM places GROUP BY slug HAVING COUNT(*) > 1`
- Check for cross-border contamination: spot-check cities in the imported country match expectations

## Never

- **Never import places from countries where we have a "no" policy** (Russia, Belarus — check CLAUDE.md)
- **Never import a new country without a `--dry-run` first** — review top cities and counts before committing
- **Never mark OSM `diet:vegetarian=only` places as `fully_vegan`** — they may serve dairy; `vegan_friendly` is correct
- **Never run enrichment on the whole DB at once** — scope to `--source` tag or `--limit` to avoid rate-limiting thousands of domains simultaneously
