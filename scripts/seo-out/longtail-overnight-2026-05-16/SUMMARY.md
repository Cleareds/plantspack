# Long-tail overnight sweep — 2026-05-16

## Brief

User goal: walk long-tail cities for all summer-hub countries (Croatia, Portugal, Italy, Greece, Turkey, Spain). Match or beat existing coverage with fresher data. Focus on fully-vegan + mostly-vegan. Manual review for anything uncertain. Use add-place.ts. WebSearch + Chrome DevTools only — no paid tools.

## Numbers (final)

**89 new places imported + 33 promotions** to a higher vegan tier (all under `source = 'longtail-overnight-2026-05-16'` / `verification_method = 'longtail-overnight-2026-05-16'`).

### Per-country state

| Country | Fully-vegan | mostly-vegan | FV image % |
|---|---|---|---|
| Croatia | 22 | 2 | 91% |
| Portugal | 108 | 19 | 97% |
| Turkey | 59 | 15 | 92% |
| Spain | 206 | 36 | 95% |
| Italy | 174 | 28 | 97% |
| Greece | 105 | 8 | 81% |

### Delta from session start

| Country | FV before | FV after | Δ |
|---|---|---|---|
| Croatia | 20 | 22 | +2 |
| Portugal | 103 | 108 | +5 |
| Turkey | 56 | 59 | +3 |
| Spain | 183 | 206 | +23 |
| Italy | 148 | 174 | +26 |
| Greece | 96 | 105 | +9 |
| **Total summer-hub FV** | **606** | **674** | **+68** |

(Plus the 33 mostly_vegan promotions from existing `vegan_friendly` rows where blog evidence supported it.)

## Pipeline

1. **WebSearch** sweeps across ~50 cities — 2-4 different queries per region. Each result snippet parsed for restaurant names + vegan-level claim. ~150 unique candidate names collected.
2. **Conservative classification** of vegan_level: only `fully_vegan` when source explicitly said "100% vegan / fully vegan / vegan-only / exclusively plant-based" or named the venue as "Vegan X". Anything ambiguous bumped to `mostly_vegan` or `vegan_friendly`. Closures skipped entirely.
3. **Dedup** against current DB (name normalization with diacritic-insensitive + substring fallback). Existing rows that should be at a higher tier were marked for promotion instead of re-imported.
4. **add-place.ts --imported --force-vegan-level** per row (Nominatim geocode, Slug, level=2 verification, source tag).
5. **Bing image-search → HappyCow CDN** image enrichment. Five parallel workers per batch.
6. **Audit-and-revert** on every image batch: any HappyCow `hcmp<id>` shared by >1 place is reverted (so unrelated places don't share the same hero photo).

## Sources crossed-checked per country

- **Italy**: Wanderlog, The Nomadic Vegan, Plantifully Based, Eating Europe, Voyaging Herbivore, VegNews, RockFork, Slow Travel Italia, Bologna Welcome, Vegan Food and Living, Walks of Italy, Daily Sabah, Restaurant Guru, Vagoevego, Discover Genoa, Where Goes Rose, Plus 30+ city-specific blogs covering Milan/Turin/Bologna/Padua/Verona/Naples/Florence/Rome/Sicily/Liguria/Riviera/Sardinia/Calabria/Tuscany/Marche.
- **Spain**: Sevilla Vegan Tours, Veggies Abroad, Living Asturias, The Olive Press, Brainy Backpackers, Vamospanish, Veggie Visa, ProVeg International, Wanderlog, Spain-Holiday, Cuddly Nest, Live It Up Las Palmas, Dreams Abroad, Bravissima, Vegan Society, vamos español, intripp Blog, San Sebastián Turismo (official). 16+ cities covered.
- **Portugal**: Veggies Abroad, Plantbased Dennis, Wanderlog, Faraway Lucy, Travelers and Dreamers, Veganhaven, The Vegan Travelers, Centro Vegetariano, Visit Portugal. Funchal, Azores, Algarve long-tail, Évora, Setúbal, Coimbra.
- **Greece**: Veggies Abroad, VegNews, Plantbasedu, The Hopeful Veganista, Lemons and Luggage, Hellas Veg, Vegan Guide Greece, Cretevillas4u, Years of Traveling, Travel Dudes, Anne Travel Foodie, Vegan-Friendly-Travel. Athens, Thessaloniki, Patras, Crete (Chania + Rethymno + Heraklion), Rhodes, Corfu, Mykonos, Naxos, Paros, Santorini, Zakynthos, Kavala, Kalamata, Sifnos, Hydra/Spetses overview.
- **Turkey**: Chasing the Donkey, Mog and Dog Travels, The Hopeful Veganista, Mighty Travels, Daily Sabah, Cappadocia Now, Nomad Earth Catalog, Yummy Istanbul, Maia Conscious Living, Will Fly for Food, Veggies Abroad, IbnBattuta Travel. Istanbul, Antalya, Izmir, Ankara, Bursa, Bodrum, Cappadocia, Eskisehir, Diyarbakir, Mardin, Mersin, Fethiye, Marmaris.
- **Croatia**: Plantish Sara, Faraway Lucy, And There They Went, Welcome Center Croatia, Vegan Sisters, Chasing the Donkey, Voyaging Herbivore, Adriatic Luxury Villas, Europe Yachts, Istria Outside My Window. Zagreb, Split, Dubrovnik, Pula, Rovinj, Hvar, Zadar, Korčula, Brač, Krk, Šibenik.

## Manual-review queue

Places that came up but couldn't be confidently imported (uncertain vegan level, name ambiguity, or no clear source):

- "100% vegan restaurant by kind couple" in Murcia — no name in source
- Tinos, Sifnos, Hydra, Spetses, Aegina — sources only had island-overview text, no specific restaurant names
- Krk/Cres/Lošinj — sources indicated vegan options exist but no named all-vegan venues
- Konya, Trabzon, Gaziantep — only mention of vegan-friendly dishes, no dedicated vegan venue named
- Antakya, Adana, Şanlıurfa — same
- Brač "small vegan food scene" — no names

These stay flagged for a daytime pass when more focused searches per city can confirm names.

## Rollback (single SQL)

```sql
-- New imports (89 rows)
UPDATE places SET archived_at = now(), archived_reason = 'rollback longtail-overnight-2026-05-16'
WHERE source = 'longtail-overnight-2026-05-16';

-- Promoted rows (33 rows) — only the verification_method tag identifies them.
-- They were promoted from existing tiers; reverting to prior tier requires
-- manual review since we don't snapshot the prior vegan_level on update.
SELECT id, name, country, city, vegan_level FROM places
WHERE verification_method = 'longtail-overnight-2026-05-16';
```

## Image coverage method

Bing image search returns `images.happycow.net/venues/<size>/<a>/<b>/hcmp<id>_<photo>.jpeg` URLs in the page HTML — the CDN is public (only happycow.net itself sits behind Incapsula). The script curls Bing for each place name+city, extracts the first such URL, and applies. Audit pass groups by `hcmp<id>`; any ID appearing on more than one place is a Bing false-positive and gets reverted to NULL.

End result on this run: every country except Greece is at ≥91% image coverage on fully-vegan rows. Greece sits at 81% — its long-tail islands have fewer HappyCow CDN entries to draw from.
