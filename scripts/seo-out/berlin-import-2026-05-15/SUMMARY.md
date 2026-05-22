# Berlin Google Map Import — 2026-05-15

Source: shared Google Maps list "Berlin without eggs&butter / Vegan life" by Hoy sin Huevos (166 places, of which 163 unique extracted).

## Pipeline

1. Loaded the saved-list page in Chrome DevTools, scrolled through all panel entries, and extracted name + rating + price + category + description for every card (163 unique).
2. Filtered out 23 places marked Permanently/Temporarily closed → 140 open candidates.
3. Cross-referenced against 1,732 existing Berlin DB entries (case/diacritic-insensitive + substring fallback) → 72 duplicates, 68 new.
4. Classified each new place into one of the four PlantsPack vegan_levels based on the curator's description (e.g. "100% vegan" → `fully_vegan`, "vegan & vegetarian" → `mostly_vegan`, "omnivor with vegan options" → `vegan_options`, default → `vegan_friendly`).
5. Ran each through `scripts/add-place.ts --imported --force-vegan-level` for Nominatim geocoding, auto-slug, and insert with `source='berlin-google-map-2026-05-15'`. First pass: 33 inserted, 35 failed on NOT NULL address. Retry with `address: 'Berlin, Germany'` fallback: 35 inserted.
6. Re-visited the Google Maps page in Chrome DevTools, harvested the `lh3.googleusercontent.com` thumbnail URL for each place, upgraded resolution to `w800-h600`, and applied via direct DB update.
7. Also applied harvested images to 23 pre-existing Berlin places that previously had no image.

## Results

**68 new places added** with `source='berlin-google-map-2026-05-15'`.

### Vegan level distribution
| Level | Count |
|---|---|
| fully_vegan | 15 |
| mostly_vegan | 3 |
| vegan_options | 19 |
| vegan_friendly | 31 |

### Enrichment coverage
| Field | Count | % |
|---|---|---|
| Image (Google Maps thumb) | 68 | 100% |
| Coordinates (lat/lng) | 68 | 100% |
| Geocoded street address | 33 | 49% |
| Website | 13 | 19% |

The 35 places without a geocoded street address are flagged with placeholder `'Berlin, Germany'` and can be enriched later from Google Maps place cards (their thumbnail URL is preserved so re-clicking each card to capture address + hours + website is straightforward).

### Bonus
- **23 existing Berlin places** in the DB that lacked an image were also enriched from the same Google Maps thumbnail set (they appeared on this list AND were already in our DB).

### Closures flagged (not imported)
23 places on the list were marked closed in Google Maps and skipped: Café Bravo, Greenfinch, Delabuu, The Hummus Guys, Madami 2, GOOD n' Vegan, FREA, Genuine Treats, W - Der Imbiss, sakura, VEG'D X-Berg, Plant Base, Ryong, Swing Kitchen, Vedang Alexa, TopTep, Beyond Ramen, Baba Vegan, Chungking Noodles, Grado Babo, Vincent Vegan, Vegan Dünyası çiğköfte, Bliss Café.

### Rollback handle
`UPDATE places SET archived_at = now(), archived_reason = 'rollback berlin-google-map-2026-05-15' WHERE source = 'berlin-google-map-2026-05-15';`

## Files
- `extracted.json` — 163 raw entries from the map
- `new-to-import.json` — 68 unique-not-in-DB candidates
- `duplicates.json` — 72 already-in-DB matches
- `payloads.json` — final import payloads
- `images.json` — Google Maps thumbnail URLs (upgraded to w800-h600)
- `import-results.jsonl` + `import-results-retry.jsonl` — per-place add-place.ts output
