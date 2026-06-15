# SEO Queue

Working backlog of SEO opportunities surfaced from GSC. Picked up between content/data work.

Order is rough priority. Update dates when a row ships.

---

## 1. "vegan restaurants" head term — title/snippet mismatch (SHIPPED 2026-06-15)

**Shipped fix:** conditional title template in `src/app/vegan-places/[country]/page.tsx` and `src/app/vegan-places/[country]/[city]/page.tsx`. When eat_count / total ≥ 60% **and** total ≥ 5, the title uses "Vegan Restaurants in X" instead of "Vegan Places in X". For fully-vegan filter mode, uses "100% Vegan Restaurants in X" when the FV-filtered inventory passes the same threshold.

**Coverage:** 109 of 167 countries flip to "Restaurants", 352 of 1,000+ cities flip. 4 countries + 12 cities stay "Places" because restaurants are <60% of their inventory (Hungary, Pakistan, Jersey, Czechia; Chennai, Santa Rosa, Pecs, Debrecen, etc.) — honest by design.

**Measure:** GSC export at +28 days. Expected: CTR on the 30+ impression pages lifts from ~0% to ~2-4% (still position 8-12, but with query match), recovering ~70-140 clicks/month at current impression volume.

---

## 1b. Original analysis (kept for context)

**Source:** GSC export 2026-06-15, folder `GSC/15.06/vegan restaurants/Сторінки.csv`.

Generic query "vegan restaurants": 3,534 impressions over 90 days, avg position 12.6, **0 clicks**.

The impressions are spread across 30+ small-country/city directory pages, all ranking position 4-10:

| Page | Impr | Pos | Clicks |
|---|---:|---:|---:|
| /vegan-places/moldova | 476 | 9.16 | 0 |
| /vegan-places/brazil/fortaleza | 350 | 6.25 | 0 |
| /vegan-places/united-states/richardson | 287 | 32.29 | 0 |
| /vegan-places/iraq/duhok | 275 | **4.07** | 0 |
| /vegan-places/ukraine/odesa/best-vegan | 238 | 9.88 | 0 |
| /vegan-places/guatemala/guatemala | 233 | 10.29 | 0 |
| /vegan-places/congo-brazzaville | 227 | 6 | 0 |
| /vegan-places/togo/lome | 151 | 7.83 | 0 |
| /vegan-places/belarus/fully-vegan | 146 | 9.15 | 0 |
| /vegan-places/guatemala | 114 | 9.11 | 0 |

Iraq/Duhok at **position 4 with 275 impressions and zero clicks** is the smoking gun. The title likely says "Vegan Places in Duhok" — a user searching "vegan restaurants" sees that and bounces because the title doesn't echo their query.

**Hypothesis:** geo-targeted search ("vegan restaurants" as searched FROM Iraq/Moldova/Togo) is reaching our country pages, but the title format `Vegan Places in <city>` doesn't match the query intent.

**Action to test:**
- Audit current title template for country/city directory pages
- Test variant: `Vegan Restaurants in <city>, <country> — N spots verified | PlantsPack` (replaces "Places" with "Restaurants" where category mix is eat-dominant)
- Measure CTR shift on the top 10 pages over 28 days

Risk: country pages cover stores + sanctuaries too, "Restaurants" would be inaccurate. Solution: use "Restaurants" only when eat_count / total_count > 80%, else keep "Places".

---

## 2. Rank 8-25 opportunities — 276 queries

**Source:** `GSC/15.06/plantspack.com-Performance-on-Search-2026-06-15/opportunities.csv`

Run `node scripts/gsc-opportunities.mjs <gsc-folder>` after each export.

Top 15 by projected upside (clicks if we moved to position 3):

| Upside | Pos | Impr | Query | Target page |
|---:|---:|---:|---|---|
| +318 | 12.6 | 3,534 | vegan restaurants | (head term — see item #1) |
| +71 | 9.4 | 787 | vegan indian restaurant bellevue fully v… | /vegan-places/united-states/bellevue/best-vegan/indian |
| +46 | 8.9 | 534 | bo de vegetarian | /place/bo-de-vegetarian-restaurant |
| +25 | 9.2 | 278 | xaia lyon | /place/xaia-lyon |
| +13 | 12.6 | 148 | the no sugar specialty coffee | /place/the-no-sugar-specialty-coffee-city-of-brisbane |
| +10 | 8.6 | 116 | everest cafe varanasi | /place/everest-cafe-momo-corner-restaurant-varanasi |
| +7 | 10.1 | 82 | konfetti leipzig | /place/konfetti-cafe-und-bistro-leipzig |
| +6 | 24.6 | 66 | vegan brunch barcelona | /vegan-places/spain/barcelona/best-vegan/brunch |
| +6 | 12.8 | 64 | vegan restaurants in protaras | /vegan-places/cyprus/protaras |
| +5 | 8.6 | 55 | sinbad kebab | /place/sinbad-kebab-house-kilbirnie |
| +5 | 8.8 | 55 | lila luft kiel | /place/lila-luft-lokal-kiel |
| +5 | 11.6 | 53 | pizza renate | /place/pizza-renate |
| +5 | 10.0 | 51 | poke scuse - ancona foto | /place/poke-scuse-ancona |

**Action per row:** rewrite `<title>` and meta description on the target page to (a) lead with the exact query terms, (b) add a differentiator (verified, count, free, no ads — true things only per data policy), (c) keep title under 60 chars.

Process: open GSC → Performance → filter by query → confirm landing page → rewrite via codebase edit.

---

## 3. Thin-page noindex cleanup (SHIPPED 2026-06-15)

11,196 pages now serve `robots: noindex, follow` via `src/app/place/[id]/page.tsx` `generateMetadata`. Keep-criteria: verified, fully/mostly_vegan, has reviews, has website, or has ≥2 of {description ≥80 chars, image, opening_hours}.

**Follow-up:** monitor GSC "Discovered – not indexed" count over next 4 weeks. Expectation: stays roughly flat (Google was already not indexing them) but our crawl budget redirects to the 41k keep cohort, lifting indexation of the marginal pages.

---

## 4. Enrichment queue (Tier C — kept indexable but thin)

1,355 pages have only a website — no description, image, or hours.

### 4a. Curl-only batch results (2026-06-15) — yield ~6% across markets

Ran 5 batches: HK, Germany, UK, US-1, US-2. **32 of 498 enrichments applied (6.4%).** Pattern is robust across markets — the bottleneck is data, not tooling. Most Tier-C URLs are either dead, parked, hijacked, or behind Cloudflare-style bot challenges. Sites that loaded often returned JS-only SPAs with no og tags in initial HTML.

Notable: 2 UK domains (Demuths, Carnevale) had been hijacked into non-GamStop gambling sites. URLs cleared 2026-06-15 (places kept).

### 4b. Mitigation — dead-site HEAD sweep (in flight 2026-06-15)

Cheap one-time pass over all ~50K rows with website set. Categorises each URL as LIVE / DNS_FAIL / 4XX_HARD / 5XX / CERT_ERROR / TIMEOUT / BOT_BLOCKED / 3XX_LOOP / NETWORK.

Rows in the hard categories get `website = NULL` after explicit user go-ahead on the preview. Soft categories (BOT_BLOCKED, 3XX_LOOP) stay — they often resolve on a real browser hit.

Script: `scripts/_website-head-sweep.mjs`. Preview written to `/tmp/website-head-sweep-preview.json`. Apply step is separate.

Expected outcome:
- 15-25% of website URLs nulled (~7-12k rows)
- Rows that lose their last signal flip Tier C → Tier A → noindex automatically (no schema change)
- Future enrichment runs target a known-live URL base → 30-40%+ hit rate

### 4c. Next: WebSearch + Chrome-DevTools-MCP enrichment on clean base

Re-run Tier C enrichment on the cleaned URL base. Two paths:
- **WebSearch-led** for rows where the on-file site is dead but the venue might still exist on a new domain. ~2 searches per place, ~30-40% hit rate expected (proven on HK).
- **Chrome DevTools MCP** for the BOT_BLOCKED + 3XX_LOOP rows where curl is fooled but a real browser would render. Higher per-place cost (~30s headless) but unlocks the Cloudflare-protected long tail.

Sequencing: WebSearch first (cheaper, broader coverage), Chrome-DevTools-MCP for the remaining stubborn segment.

### Per-country queue order (after sweep applies)
Germany → UK → US (×2) → France → Italy → Spain.

Helper template: `scripts/_hk-enrich.mjs`. Per-country runs: `scripts/_tier-c-{country}-*.{mjs,ts}`.

---

## 6. Dead-site HEAD sweep (SHIPPED 2026-06-15)

Scanned all 32,483 places with a website set. 6,260 (19.3%) failed in hard categories (DNS_FAIL / 4XX_HARD / 5XX / CERT_ERROR / TIMEOUT / NETWORK). After excluding Facebook URLs (kept per user direction — relevant info pages even if HEAD-blocked), 6,246 rows had their `website` field nulled with full audit trail in `admin_notes`.

**Tier shifts as a result:**
- KEEP: 41,675 → 39,778 (−1,897)
- Noindex (Tier A + Tier B): 11,196 → 13,092 (+1,896)
- Tier A specifically grew by ~485 (rows that had ONLY a website and lost their last signal)

Facebook URLs preserved: 14 rows that failed HEAD but were Facebook pages → kept as relevant info source per user policy 2026-06-15.

**Data-report angle:** the 6,260 number is itself linkable content for the next /research/ piece — "How many vegan-restaurant websites are dead? A 2026 audit of 32,483 venues." Hold for the Q3 data report.

---

## 7. WebSearch-led re-enrichment (NEXT)

The 1,897 rows that just lost their website still exist as places — just without a URL. Run a focused WebSearch pass to find their new (live) website where it exists. Pattern: search "<name> <city>", filter out aggregators (HappyCow / TripAdvisor / Yelp / Yellow Pages), WebFetch the first viable result for og:image + description.

Expected hit rate: 20-30% (some venues are simply closed, but a meaningful share have moved to a new domain or social-media-only presence). On top of that, the original Tier C cohort (where the on-file website was alive but yielded no og tags) gets a second pass with a better extraction strategy.

Sequenced after the next session.

---

## 5. Lower-priority cleanups

- **632 GSC 404s** — likely stale URLs from previous schema. Worth a one-time `curl -I` sweep to identify pattern; if they cluster around old slug formats, add redirects in `next.config.ts`.
- **30 "Google chose different canonical" + 18 "Duplicate without canonical"** — only 48 URLs but worth spot-checking; usually chain branches that share name+city.
- **Soft 404, redirect error** — single-digit counts, ignore until they grow.

---

## Tracking method

After each GSC export:
1. Drop the export under `GSC/<date>/`.
2. Run `node scripts/gsc-opportunities.mjs <folder>` to regenerate the rank-8-25 list.
3. Update this file with new findings; mark shipped items with date and PR.
4. Don't chase "near me" queries — they get Maps Pack results, not web.
