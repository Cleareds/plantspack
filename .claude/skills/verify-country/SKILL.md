# verify-country

Run a structured multi-pass data-quality + verification audit on every PlantsPack place for a given country, with a strong bias toward defending the integrity of the 100% vegan tier. Outputs **TaskCreate todos** (not CSVs) so the session continues with concrete next-step actions.

Invoke as `/verify-country <country>` (e.g. `/verify-country germany`, `/verify-country belgium`).

## Mission

Improve the quality, trustworthiness, and completeness of the given country's dataset, with priority on fully-vegan places. Reusable across all PlantsPack country datasets.

## PlantsPack vegan levels (4 tiers only)

| Tier | When to apply |
|---|---|
| `fully_vegan` | Everything food/drink-wise is vegan. Use ONLY if official site / menu / strong source confirms fully plant-based. |
| `mostly_vegan` | Strongly vegan/plant-based focused, with a few non-vegan exceptions. |
| `vegan_friendly` | Comfortable for vegans, not meat/fish/grill dominated; multiple clear vegan dishes. |
| `vegan_options` | Mixed/meat-heavy place where vegan dishes exist but vegan food is not the main focus. Burger/grill/kebab/chicken/steak/seafood places default here, not vegan_friendly. |

**Critical:** Never inflate vegan levels. Never trust existing imported `vegan_level` blindly. Never keep `fully_vegan` unless source evidence proves it.

## Hard rules

- **No deletes** without explicit "Yes delete" — see [data_policy]. Use `vegan_level` downgrades, `archived_at` flag, or `temporarily_closed` only.
- **No CLI claims of admin_review or is_verified=true** — see [feedback_verification_claims]. CLI scripts set `verification_method` to a descriptive tag like `<country>-archive-review-<date>` and leave `is_verified=false`.
- **Outputs are TaskCreate calls, not CSVs.** Each audit pass emits one or more numbered tasks describing the next batch of fix-work.
- **Save partial progress every 50 records** (write intermediate state to `scripts/seo-out/<country>-verify-<date>/state.json`).

## Execution order

### P0.1 — Wrong-country contamination
Find places in this country's dataset that are not actually in this country (cross-border OSM/Foursquare imports usually). Example tells: Besançon / Belfort (FR) under Germany, Kaprun / Dornbirn (AT) under Germany, Mariánské Lázně (CZ) under Germany, Kloten (CH) under Germany.

For each: detect via `addr:country` tag (when from OSM), coordinate bbox check, or city-not-in-country-list lookup. Either migrate to correct country dataset (UPDATE `country`) or archive with reason `wrong-country-contamination`.

Emit one task per cluster ("Move 4 Czech-border places out of Germany dataset").

### P0.2 — Duplicate / branch dedup
Find dupes by:
- Same name + same city
- Same name + same address  
- Same chain + same city (audit branch addresses)
- Same coordinates (within ~30m)
- Same website / social URL
- Same place with diacritic/spelling variants

For real branches: each row must have unique address, slug, branch source URL. For true dupes: keep the richest/most-verified row, archive the rest with `verification_method=<country>-dedup-<date>`.

Emit task per dupe-group ("Merge 3 Brammibal's Donuts Berlin duplicates").

### P0.3 — Verify low-confidence FV places
Scope: `vegan_level='fully_vegan'` AND `verification_level < 3` AND no recent audit tag.

Per place, verify in this order:
1. Official website / menu
2. Google Maps (open status)
3. HappyCow listing
4. Instagram / Facebook (if no official site)
5. Local vegan blogs / directories (weak support only)

**Keep at FV only if:** official says "100% vegan / rein vegan / voll vegan / 100% pflanzlich / fully vegan / plant-based only" OR menu contains only vegan items OR HappyCow says Vegan + recent reviews confirm + no contradiction.

**Downgrade if:** dairy / milk / eggs / honey / meat / fish / cheese (non-vegan) / mixed menu / venue is vegetarian or vegan-friendly or supermarket / canteen / kindergarten / hotel / bakery (non-vegan) / generic retail without all-vegan proof.

Emit task per batch ("WebSearch-verify 15 high-risk Berlin FV").

### P1.1 — Enrich existing FV places
For every current FV record, fill missing core data: official website, source URL proving vegan status, Google Maps URL, address, city, phone, opening hours, main image, concise description, open status, last verified date, confidence.

**Opening hours format (strict):**
```
Monday: 09:00–17:00; Tuesday: Closed; Wednesday: 09:00–17:00; Thursday: 09:00–17:00; Friday: 09:00–21:00; Saturday: 10:00–16:30; Sunday: 10:00–16:30
```
English weekday names; 24h; semicolons between days; exact word "Closed"; split services use comma: `Monday: 11:30–15:00, 17:30–22:00`. **Never guess hours** — if uncertain, leave blank and set `hours_confidence=Low`.

**Description style:** one concise paragraph mentioning cuisine/style/atmosphere + vegan relevance naturally. No "vegan-friendly" wording for FV places. No marketing fluff. No unsupported overclaims.
> Good: "Fully vegan Vietnamese restaurant in Berlin serving plant-based noodle soups, rice dishes and small plates in a casual setting."

### P1.2 — City canonicalization
Detect: Munich vs München, Freiburg im Breisgau vs Freiburg Im Breisgau, Halle vs Halle (Saale), Worm vs Worms, Kempten vs Kempten (Allgäu), Lindau vs Lindau (Bodensee), any city = "<country name>" by mistake, any city actually outside the country.

For each row migrate to canonical_city and store original in audit log.

### P1.3 — Chain branch coverage
For known fully-vegan chains, check official locator pages and add missing active branches (Katzentempel, Vincent Vegan, Brammibal's Donuts, etc.). One row per real physical branch — confirm address, hours, phone, open status, branch is still active.

Never add a branch based only on old blogs / third-party directories. Use the chain's own location page first.

### P2.1 — Missing FV discovery
City-by-city sweep starting with priority cities (top 20 by population). Search in local language + English:
- `vegan restaurant <city>`
- `100% vegan <city>`
- `rein vegan <city>` (DE) / `100% végétalien <city>` (FR) / etc.
- `veganes Restaurant <city>` (DE)
- `vegane Bäckerei <city>` (DE)
- `plant-based restaurant <city>`
- `site:happycow.net <city>`
- `site:instagram.com vegan <city>`

For each candidate: check DB, then either Add / Upgrade / Merge / Skip-closed.

### P2.2 — Reclassify suspicious FV names
Flag for manual verify any FV with these terms in name/cuisine/description:
`kebab, kebap, döner, doner, grill, steak, chicken, hähnchen, fish, fisch, seafood, bbq, burger, mcdonald, nordsee, eiscafe, gelato, ice cream, bakery, bäckerei, rewe, lidl, aldi, dm, rossmann, mensa, cafeteria, canteen, kindergarten, hotel, friseur, supermarket`

**Do not auto-downgrade** — vegan döner / vegan burger / vegan bakery are legitimate. WebSearch first.

### P3 — Provenance fields
Populate per FV record (where missing): `vegan_status_source_url`, `open_status_source_url`, `last_verified_at`, `verification_method`, `verification_evidence_summary` (free text), `confidence`, `is_chain_branch`, `chain_name`, `image_source_url`, `hours_confidence`, `needs_owner_confirmation`.

**Confidence rules:**
- `High`: official site/menu confirms FV + Google confirms active.
- `Medium`: HappyCow + social strongly confirm, but official source missing/incomplete.
- `Low`: conflicting sources / old data / no official proof / unclear open status.

## Output format

**Instead of CSV, emit TaskCreate tasks.** One task per actionable fix-batch (group ~10–25 related records into one task so the session can chew through them without spawning hundreds of trivial tasks).

For each task:
- `subject`: imperative, names country + scope ("Downgrade 8 vegetarian-not-vegan Berlin FV places")
- `description`: lists the affected place slugs + the exact action + the evidence link
- One task per batch, not per record

Track progress with `TaskUpdate(status=in_progress)` when starting a batch, `completed` when done. Save the affected slugs to `scripts/seo-out/<country>-verify-<date>/state.json` so a future session can resume.

## Procedure

1. Read country arg from invocation. Normalize (germany → "Germany", uk → "United Kingdom", us → "United States").
2. Print baseline stats: total places, FV count, verified L≥3 count, missing-image count, missing-website count.
3. Run passes P0.1 → P3 in order. Each pass:
   - Identifies records needing action
   - Groups into batches of 10–25
   - Creates one TaskCreate per batch
4. Save state to `scripts/seo-out/<country>-verify-<date>/state.json` after each pass.
5. Print final summary: tasks created, records flagged per pass, top cities affected.

## Don't

- Never set `verification_method='admin_review'` or `is_verified=true` from CLI. (See [feedback_verification_claims].)
- Never delete rows. Archive (`archived_at`) or downgrade only. (See [data_policy].)
- Never inflate to `fully_vegan` without explicit source evidence. Default ambiguous to `vegan_friendly`.
- Never trust `addr:city` blindly — OSM imports bleed across borders.
- Never optimize for raw FV count. Optimize for trust, freshness, and source-backed accuracy.

## Reuse

After Germany completes, run the same workflow per country: Belgium → Netherlands → Croatia → France → Spain → Italy → UK → etc. The skill takes the country name as parameter; everything else (priority cities, language searches, chain list) is derived from the country.
