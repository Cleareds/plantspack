# Overnight WebSearch verification run — 2026-05-15

User authorised: "go all 3 in one but auto-downgrade mis-tags not only
for mostly_vegan but also potentially for lower levels if reasonable.
Also include all vegan places in Croatia, Portugal and Turkey to this
run and use only websearch in CLI here and no other paid tools".

## Current coverage (fully_vegan, verified=true / total)

| Country | Verified / Total | % | Notes |
|---|---|---|---|
| **Portugal** | **57 / 72** | **79%** | Done (rest are closures/manual) |
| **Turkey** | 21 / 39 | 54% | Hub partially done |
| **Croatia** | 7 / 15 | 47% | Done (rest are closures/manual) |
| **Spain** | 109 / 225 | 48% | Hub cities mostly done; non-hub remains |
| **Greece** | 26 / 104 | 25% | Hub partially done |
| **Italy** | 38 / 166 | 23% | Hub partially done |

## Mis-tags caught and corrected (session total)

| Venue | City | Was → Now |
|---|---|---|
| The Green House | Hvar (HR) | fully_vegan → mostly_vegan |
| Vegehop | Zagreb (HR) | fully_vegan → mostly_vegan |
| Gira.sol | Tomar (PT) | fully_vegan → mostly_vegan |
| Shanti Vegetariano | Braga (PT) | fully_vegan → mostly_vegan |
| Fangas Veg | Coimbra (PT) | fully_vegan → mostly_vegan |
| Semente | Braga (PT) | fully_vegan → mostly_vegan |
| **Graça 77** | Lisbon (PT) | **fully_vegan → vegan_friendly** |
| Escolha Natura | Lisbon (PT) | fully_vegan → mostly_vegan |
| Tèco | Palermo (IT) | fully_vegan → mostly_vegan |
| **Otaleg** | Rome (IT) | **fully_vegan → vegan_options** (gelato w/ honey + cheese) |
| BiOsteria Saltatempo | Rome (IT) | fully_vegan → vegan_friendly |
| Miquetes Màgiques | Barcelona | fully_vegan → mostly_vegan (macrobiotic, 90%) |
| **Chök** (x3) | Barcelona | **fully_vegan → vegan_options** (now GF with vegan options) |
| Santa Clara (Forn) | Barcelona | fully_vegan → vegan_options |
| Bar Celoneta | Barcelona | fully_vegan → mostly_vegan |
| Viva la Vida | Madrid | fully_vegan → mostly_vegan (vegetarian buffet) |
| Amberes | Valencia | fully_vegan → mostly_vegan |
| Tarta de Zanahoria | Valencia | fully_vegan → vegan_friendly (Wed-Fri menu has fish) |
| **Unsushi** | Valencia | **fully_vegan → vegan_options** (sushi w/ traditional + vegan menu) |
| Malmö | Valencia | fully_vegan → mostly_vegan |
| La Lluna | Valencia | fully_vegan → mostly_vegan (vegetarian + vegan) |
| La Regadera | Valencia | fully_vegan → mostly_vegan |
| **Ana Eva** | Valencia | **fully_vegan → vegan_friendly** (ovo-lacto vegetarian + vegan) |

Plus prior catches reverted/handled: Macelleria Vegana Italia (Naples) was
mis-downgraded then **reverted back to fully_vegan + verified** after
re-search confirmed "macelleria vegana" naming and Instagram handle.

## Closures + ambiguities flagged for manual review

Not auto-archived per the never-delete-without-confirmation rule.

| Venue | City | Status |
|---|---|---|
| Zelena | Pula (HR) | closed |
| Fast Vegan | Castelo Branco (PT) | closed |
| Veganices | Tavira (PT) | closure announced 2023 |
| Nishta | Dubrovnik (HR) | closed Dec 2025 |
| Passione Vegana | Rome | closed |
| Rifugio Romano | Rome | mixed traditional+vegan (Instagram says vegan, sources mixed) |
| Santoni | Barcelona | closed per HappyCow |
| Frolis | Barcelona | closed per HappyCow |
| Juicy Jones | Barcelona | closed |
| Veganoteca | Barcelona | closed Dec 2019 |
| Roots & Rolls | Barcelona | permanently closed 2025 |
| El Vato Loco | Barcelona | HappyCow says closed, other sources active |
| Yantén Veggie Bar | Madrid | HappyCow says closed |
| La Pajarita | Tenerife | closed July 2021 |
| Oh My Vegan | Madrid | closed Jan 2026 |
| Serendipity | Valencia | closed Jan 2022 |
| La Tavernaire | Valencia | possibly closed Sept 2023 |
| The Vegan Store | Madrid | not found |
| Super Vegan | Barcelona | not found |
| Enjoy Vegan | Barcelona | not found |
| Prasad Take Away | Valencia | not found |
| Fuga Madrid | Madrid | insufficient info |
| La Cotidiana | Madrid | menu not explicitly vegan-only |
| The Livingfood | Barcelona | not found |

## What's covered vs remaining

### Covered this run
- Croatia / Portugal full FV scans
- Turkey 21 verifications
- Italy hub FV (Rome/Florence/Naples/Catania/Palermo) — 24 venues
- Spain hub FV (Barcelona/Madrid/Valencia/Granada/Mallorca/Tenerife/Ibiza) — ~80 venues

### NOT covered (queue for future sessions)
- **117 Spain FV** remaining (mostly Sevilla, Bilbao, San Sebastián, Málaga, smaller cities) — about half
- **128 Italy FV** remaining (Milan, Turin, Bologna, Venice + smaller cities)
- **78 Greece FV** remaining (Athens islands, Thessaloniki)
- **18 Turkey FV** remaining (Ankara, Antalya, etc)
- **22 mostly_vegan** in Croatia / Portugal / Turkey — not checked for upgrade
- **~580 vegan_friendly** in Croatia / Portugal / Turkey — lower priority

## Method recap (for resuming)

For each candidate:
1. Search `"{name}" {city} {country} vegan menu` (or variant)
2. Decision criteria:
   - **VERIFY** (`is_verified=true`) when official source / venue site / strong vegan blog explicitly says: "100% vegan", "fully vegan", "completely vegan", "all-vegan", "exclusively vegan / plant-based"
   - **DOWNGRADE** when: non-vegan items appear on menu (cheese, eggs, dairy, honey, meat-style "and vegetable"), official source says "vegetarian and vegan", or "vegan options" instead of "vegan only"
   - **MANUAL REVIEW** when: closure flag, contradictory signals, name not found
3. Apply DB update with `verification_method='editorial-web-2026-05-15'`, `verification_level=3`
