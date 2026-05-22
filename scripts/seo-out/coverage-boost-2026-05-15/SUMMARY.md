# Coverage Boost: Croatia / Portugal / Turkey — 2026-05-15

Goal: best-possible 100% vegan coverage for these three countries.

## Method

1. **WebSearch sweeps** for top vegan venues in Croatia, Portugal, Turkey (general + HappyCow-specific queries).
2. **Chrome DevTools harvest of HappyCow** filtered to `?filters=vegan` (vegan-only) — country index + per-city pages.
   - Croatia: all 18 vegan-only listings (Zagreb 9, Split 4, Bol 2, Osijek 1, Zadar 1, Simuni 1).
   - Portugal: top 4 cities (Lisbon 27, Porto 24, Braga 7, Matosinhos 5) = 63 of 128 nationwide.
   - Turkey: top 4 cities (Istanbul 19, Antalya 5, Izmir 5, Ankara 4) = 33 of 44 nationwide.
3. **Dedup vs DB** (case/diacritic-insensitive + substring fallback) → identified candidates already in DB vs new.
4. **Imported new** 40 candidates with `scripts/add-place.ts --imported --force-vegan-level` (Nominatim geocode, slug, level=2 `verification_method='imported'`, source=`coverage-boost-2026-05-15`).
5. **Promoted existing** 19 places that were already in DB but tagged below fully_vegan: bumped to `vegan_level='fully_vegan'`, level=2, `verification_method='happycow-vegan-tag-2026-05-15'`. Admin can confirm and flip is_verified=true.

## Results

### Fully-vegan coverage delta

| Country | Before | After | Δ |
|---|---|---|---|
| Croatia | 11 | **20** | +9 |
| Portugal | 66 | **90** | +24 |
| Turkey | 25 | **49** | +24 |
| **Total** | **102** | **159** | **+57 (+56%)** |

### What happened to the candidates

| Bucket | Count |
|---|---|
| Open candidates harvested from HappyCow vegan-only | 100 |
| Closed (skipped) | 14 |
| Already in DB | 60 |
| - of which already fully_vegan | 40 |
| - **promoted to fully_vegan** | **19** (1 failed under DB constraint) |
| **Imported new** | **38** (40 attempted; 2 failed on duplicate slug / geocode) |

### Imports by country

| Country | Imported new | Failed |
|---|---|---|
| Croatia | 4 | 0 |
| Portugal | 13 | 2 (Gaya Veggie Market Lisbon, NOT SO VEGAN Matosinhos) |
| Turkey | 21 | 0 |

### Image coverage on fully_vegan

| Country | With image / Total | % |
|---|---|---|
| Croatia | 10 / 20 | 50% |
| Portugal | 57 / 90 | 63% |
| Turkey | 7 / 49 | 14% |

**Image gap remains** — the newly-imported rows don't yet have hero images because most don't carry a website field, and HappyCow blocks anonymous og:image scrapes. Next pass: grab Google Maps thumbnails per place via Chrome DevTools (same technique that worked for Berlin), or scrape via authenticated Chrome session on HappyCow review pages.

## What's still missing (smaller hubs not yet covered)

Portugal: 65 more vegan-only listings spread across small cities (Coimbra 3, Faro 3, Albufeira 3, Guimaraes 2, Vila Nova De Gaia 2, plus ~30 with 1 listing each).
Turkey: 11 more vegan-only listings in smaller cities (Kas 3, Eskisehir 2, plus Diyarbakir/Goreme/Mardin/Mugla/Turkbuku 1 each).
Croatia: 0 more (we covered every city with a vegan-only listing on HappyCow).

These long-tail cities can be picked up in a single follow-up pass — each is only 1–3 places.

## Files
- `croatia-happycow.json`, `portugal-lisbon-happycow.json`, `portugal-porto-happycow.json`, `portugal-braga-happycow.json`, `portugal-matosinhos-happycow.json`, `turkey-istanbul-happycow.json`, `turkey-antalya-happycow.json`, `turkey-izmir-happycow.json`, `turkey-ankara-happycow.json` — raw harvests
- `all-candidates.json` — combined
- `new-to-import.json` — 40 dedup'd candidates
- `duplicates.json` — 60 already-in-DB matches with current level + image flag
- `payloads.json` — final add-place payloads
- `import-results.jsonl` — per-place import log

## Rollback

```sql
-- New imports
UPDATE places SET archived_at = now(), archived_reason = 'rollback coverage-boost-2026-05-15'
WHERE source = 'coverage-boost-2026-05-15';

-- Promoted duplicates: cannot mechanically rollback (we don't store prior level),
-- but the verification_method tag flags them for admin re-review.
SELECT id, name, country, city, vegan_level FROM places
WHERE verification_method = 'happycow-vegan-tag-2026-05-15';
```
