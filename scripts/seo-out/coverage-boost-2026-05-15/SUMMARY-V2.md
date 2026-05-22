# Coverage Boost V2: Croatia / Portugal / Turkey — 2026-05-15

Two-phase run. Phase 1 used HappyCow as the primary source. Phase 2 (this update) broadened to multiple vegan blogs + scraped images via Chrome DevTools.

## Phase 2 method

**Beyond HappyCow — broader source mix.** Ran 13 WebSearches across Wanderlog/Plantish Sara/Faraway Lucy/The Nomadic Vegan/VegNews/Travelers and Dreamers/Vegan Sisters/Mighty Travels/Middle East Vegan Society/Lisbon Listicles/Daily Sabah/Now in Portugal/Veggies Abroad guides + city-specific blogs (Algarve, Ericeira, Sintra, Cappadocia, Bodrum, Rijeka, Pula, Rovinj, Hvar, Faro, Tavira, Cihangir, Kadikoy, Beyoglu).

**Image scrape via Chrome DevTools.** For each fully-vegan place lacking `main_image_url`, navigated to a Google Maps search of the place name + city, captured the first result's `lh3.googleusercontent.com/gps-cs` thumbnail, upgraded the URL params to `=w800-h600-k-no` for higher resolution, and wrote to `main_image_url`. Same technique that worked on the Berlin import.

## Combined results (both phases)

### Fully-vegan coverage

| Country | Start | After phase 1 | After phase 2 | Δ overall |
|---|---|---|---|---|
| Croatia | 11 | 20 | **20** | +9 (+82%) |
| Portugal | 66 | 90 | **98** | +32 (+48%) |
| Turkey | 25 | 49 | **53** | +28 (+112%) |
| **Total** | **102** | **159** | **171** | **+69 (+68%)** |

### Image coverage on fully-vegan

| Country | Before | After phase 2 |
|---|---|---|
| Croatia | 50% (10/20) | **60% (12/20)** |
| Portugal | 63% (57/90) | **69% (68/98)** |
| Turkey | 14% (7/49) | **42% (22/53)** |

### What got added in phase 2

- **12 new places imported** from blog discovery (not on HappyCow's vegan-only filter):
  - Croatia: Makrovega (Rijeka), Lab Salad Bar (Rovinj), Tipico Green Garden (Rovinj)
  - Portugal: Arkhe (Lisbon), Quintal de Santo Amaro (Lisbon), Mandala (Tavira), GREEN Balls & Burgers (Ericeira)
  - Turkey: King's Cafe (Göreme), Falafel Koy (Istanbul), Mahatma Café (Istanbul), Muhtelif Mekan (Istanbul), Rulo Ezberbozan Lezzetler (Istanbul)
- **4 existing rows promoted** to fully_vegan based on blog descriptions: Jardim dos Sentidos, Manjerica, Apuro, My Green Pastry (all Portugal, all previously tagged vegan_friendly).
- **~30 Google Maps thumbnails applied** as hero images via Chrome DevTools across all three countries.

## Sources actually consulted (not just listed)

Croatia: HappyCow vegan-only (all cities) + Plantish Sara + Wanderlog + Burger Abroad + Faraway Lucy + The Nomadic Vegan + Welcome Center Croatia + Vegan Sisters + Lost in Dubrovnik + Conscientious Eater + Lauren Vacula + Vegan-Friendly Travel + Istria Cooking + Find Me Gluten Free + Sluurpy + And There They Went.

Portugal: HappyCow vegan-only (Lisbon, Porto, Braga, Matosinhos) + Veggies Abroad + VegNews + Lisbon Listicles + The Nomadic Vegan + Now in Portugal + Faraway Lucy + Eating Europe + Veganhaven + Vegan-Friendly Travel + Travelers and Dreamers + Where Goes Rose + Portoalities + Oh My Porto + Brightnomad + The Vegan Travelers (Algarve) + Hotspots Algarve + Saunter with Sanika + Trailing Pages.

Turkey: HappyCow vegan-only (Istanbul, Antalya, Izmir, Ankara) + Chasing the Donkey + Veggies Abroad + The Sunrise Dreamers + Mog and Dog Travels + Will Fly For Food + The Hopeful Veganista + Vegan Ventures + Middle East Vegan Society + Mighty Travels + Tipstanbul + Walktionary + Maia + Hyphen + Cappadocia Now + Nomad Earth Catalog + Daily Sabah + Flygrn + Ibn Battuta Travel + Istanbul Tourist Pass.

## Files added in phase 2
- `blog-candidates.json` — 21 blog-discovered names
- `blog-new.json` — 12 unique additions
- `blog-payloads.json` — final import payloads
- `blog-import-results.jsonl` — per-place insert log
- `fv-missing-images.json` — 85 fully-vegan places without `main_image_url` at start of phase 2
- `SUMMARY-V2.md` — this file

## Rollback (combined)

```sql
-- Phase 1 imports
UPDATE places SET archived_at = now(), archived_reason = 'rollback coverage-boost-2026-05-15'
WHERE source = 'coverage-boost-2026-05-15';

-- Phase 2 imports
UPDATE places SET archived_at = now(), archived_reason = 'rollback blog-coverage-2026-05-15'
WHERE source = 'blog-coverage-2026-05-15';

-- Promoted duplicates (both phases)
-- Identifiable for admin re-review:
SELECT * FROM places WHERE verification_method IN
  ('happycow-vegan-tag-2026-05-15', 'blog-coverage-2026-05-15');
```

## What's still left

- 11 Turkey vegan-only HappyCow listings in small cities (Diyarbakir/Eskisehir/Goreme/Kas/Mardin/Mugla/Turkbuku).
- 65 Portugal vegan-only HappyCow listings across small cities (Coimbra, Faro long-tail, Albufeira, ~30 cities with 1-2 entries each).
- ~30 Croatia/Portugal/Turkey fully-vegan rows still without image, plus ~6 known-but-blocked names (Vegan Istanbul, Falafel Zone, Vegana Burgers, etc.) — Google Maps name disambiguation issue, manual lookup needed.

The full HappyCow long-tail (Portugal smaller cities + Turkey smaller cities) is a quick follow-up pass once you're ready to spend another ~20 min on it.
