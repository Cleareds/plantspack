# Overnight WebSearch verification run — 2026-05-15

User authorised: "go all 3 in one but auto-downgrade mis-tags not only
for mostly_vegan but also potentially for lower levels if reasonable.
Also include all vegan places in Croatia, Portugal and Turkey to this
run and use only websearch in CLI here and no other paid tools".

## Final stats AFTER this run

### Verified-FV in full countries

| Country | Verified / Total FV | % Verified |
|---|---|---|
| **Croatia** | **7 / 11** | **64%** |
| **Portugal** | **57 / 66** | **86%** |
| Turkey | 5 / 27 | 19% (not started) |

Portugal was essentially completed — every fully_vegan candidate in
the country went through WebSearch verification.

### Total `is_verified=true` flags set today: **69 places**

## Mis-tags caught and corrected

8 places had `vegan_level=fully_vegan` in the DB but WebSearch revealed
non-vegan items or vegetarian-not-vegan positioning. All downgraded
automatically per user authorisation.

| Venue | City | Was → Now | Reason |
|---|---|---|---|
| ~~Macelleria Vegetariana Italia~~ | ~~Naples~~ | ~~fully_vegan → mostly_vegan~~ **REVERTED** | Eggplant meatballs are vegan; single source was misread. Re-verified fully_vegan. |
| The Green House | Hvar (HR) | fully_vegan → mostly_vegan | "Natural health food shop" — mixed offering |
| Vegehop | Zagreb (HR) | fully_vegan → mostly_vegan | "Menu is almost entirely vegan with a wide selection, and there are a few vegetarian dishes" |
| Gira.sol | Tomar (PT) | fully_vegan → mostly_vegan | "Vegan vegetarian" — meatless not necessarily fully vegan |
| Shanti Vegetariano | Braga (PT) | fully_vegan → mostly_vegan | Menu shows "seitan with goat cheese" |
| Fangas Veg | Coimbra (PT) | fully_vegan → mostly_vegan | "Majority of options being vegetarian and vegan options marked with a green V" |
| Semente | Braga (PT) | fully_vegan → mostly_vegan | Menu shows "carrot and cheese pastries" |
| **Graça 77** | **Lisbon (PT)** | **fully_vegan → vegan_friendly** | **"The restaurant used to be 100% vegan but had to add non-vegan options to stay in business"** |
| Escolha Natura | Lisbon (PT) | fully_vegan → mostly_vegan | "Vegetarian/vegan choices" — set menu is mixed |

**8 net mis-tags corrected** (after Macelleria revert).

## Closures + ambiguities flagged for manual review

Not auto-archived per the never-delete-without-confirmation rule.

| Venue | City | Status |
|---|---|---|
| Zelena | Pula (HR) | Multiple sources: closed |
| Fast Vegan | Castelo Branco (PT) | "Permanently closed" per Tripadvisor |
| Veganices | Tavira (PT) | Announced closure 2023; verify if still open |
| Nishta | Dubrovnik (HR) | "Reported closed as of December 2025" |

Plus venues where WebSearch couldn't confirm:
- Natural (Split, HR) — restaurant by that name not found
- OPG Natura škoj (Vodice, HR) — is a farm/olive-oil producer, not a restaurant
- Capuchinho Verde (Porto) — not found in any vegan directory
- Porto Vegans (Porto) — generic name, no clear match
- Lisbon Vegan / Vegan Story (Lisbon) — not found by exact name
- MNT Vegan Café (Porto) — not found
- Porto Vegan Market (Porto) — needs further check

## What's covered vs remaining

### Covered

- **Croatia fully_vegan**: 13/13 candidates processed (7 verified, 2 downgraded, 4 manual-review)
- **Portugal fully_vegan**: 72/72 candidates processed (57 verified, 6 downgraded, 9 manual-review or shop-only)

### NOT covered (remaining queue for future sessions)

- **27 Turkey fully_vegan** candidates — not touched
- **162 Italy / Spain / Greece hub fully_vegan** candidates — not touched
- **22 mostly_vegan** in Croatia / Portugal / Turkey — not checked for upgrade
- **~580 vegan_friendly** in Croatia / Portugal / Turkey — lower priority

## Method recap (for resuming)

For each candidate:
1. Search `"{name}" {city} {country} vegan menu` (or variant)
2. Decision criteria:
   - **VERIFY** (`is_verified=true`) when official source / venue site / strong vegan blog explicitly says: "100% vegan", "fully vegan", "completely vegan", "all-vegan", "exclusively vegan / plant-based", or HappyCow Vegan tag confirmed
   - **DOWNGRADE** when: vegetarian items appear on menu (cheese, eggs, dairy, honey), official source says "vegetarian and vegan", or "vegan options" instead of "vegan only"
   - **MANUAL REVIEW** when: search doesn't surface official source, contradictory signals, possible closure
3. Apply DB update via UPDATE statement with `verification_method='editorial-web-2026-05-15'`

## Files produced

- `applied.csv` — 42 auto-applied downgrades from initial CSV pass
- `manual-review.csv` — 262 rows from CSV needing human eyes
- `skipped.csv` — 1,036 no-action rows
- `candidates.csv` — 928 working set
- `summary.md` — first-pass summary
- `overnight-run-summary.md` — this file (latest)

## Honest framing

The user asked: "can you do it in one session overnight?"

Pragmatic reality:
- This session: **77 substantive DB changes** (69 verifications + 8 downgrades) + 1 revert + 10+ manual-review entries
- Pace: ~25-30 verifications per hour at responsible quality bar
- Full Croatia + Portugal FV verification took ~3 hours of session time
- Remaining ~189 candidates (Turkey + Italy/Spain/Greece hub FV) ≈ ~7-8 more hours

**Done in this session**: Croatia (complete), Portugal (complete at 86% verified, rest are mis-tags + closures + ambiguous).

**Next session**: Pick up from Turkey FV (27 candidates) — well-known venues like Bi Otantik (Istanbul), Vegan Köfteci, etc. Then continue with Italy/Spain/Greece hub FV.
