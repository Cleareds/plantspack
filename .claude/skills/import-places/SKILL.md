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

## Full pipeline for country/city imports

The pipeline in `scripts/import-osm-countries.ts` does all of this automatically:

1. **Fetch from OSM Overpass** — widened filter:
   - `diet:vegan=yes|only` (explicit vegan menu)
   - `diet:vegetarian=only` (fully vegetarian — imported as `vegan_friendly`)
   - `cuisine=vegan` (explicit vegan cuisine tag)

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

To enrich **existing** places (already in DB) that have websites but no images:

```bash
# All places with website but no image
npx tsx scripts/fetch-og-images.ts --limit 1000

# Specific source tag (e.g. the OSM import batch)
npx tsx scripts/fetch-og-images.ts --source osm-import-2026-04 --limit 5000
```

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
