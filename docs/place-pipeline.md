# Place Pipeline: Scraping and Verification

This document describes every step taken to get a place into PlantsPack, from initial discovery to the live database record. The same logical stages apply regardless of entry point — only the first step differs.

---

## Entry Points

| Entry point | Who triggers it | Starting state |
|---|---|---|
| **OSM bulk import** | Admin runs `scripts/import-osm-countries.ts` | Raw OSM element from Overpass |
| **Manual add** | Admin/Claude runs `/add-place <URL>` | Website or Google Maps URL |
| **Staging pipeline** | Scheduled / batch from Foursquare or other sources | Row in `place_staging` with `decision='pending'` |

The staging pipeline is a separate track for large third-party data sources (Foursquare, etc.) that need heavier gatekeeping before hitting the main `places` table. OSM and manual-add bypass it and write directly to `places`.

---

## Stage 1 — Discovery

### OSM import
**What the API does:** Sends a structured query to the Overpass API (OpenStreetMap's data server). The query uses three filter conditions — the place must have at least one of:
- `diet:vegan=yes` or `diet:vegan=only`
- `diet:vegetarian=only`
- `cuisine=vegan`

The API returns raw GeoJSON-like elements: nodes (single point) or ways (polygon). Each element has a latitude/longitude and a `tags` dictionary with everything OSM contributors have entered: `name`, `addr:street`, `website`, `phone`, `opening_hours`, `cuisine`, etc.

**What AI does:** Nothing in this stage. The OSM data is what OSM contributors wrote.

### Manual add
**What the API does:** Nothing yet.

**What Claude (AI) does:**
1. `WebFetch` the provided URL to extract structured text: name, address, phone, opening hours, menu description, "about" text, footer contact details.
2. `WebSearch` for `"<name>" <city> address` to cross-reference press articles, TripAdvisor, Yelp, HappyCow — filling gaps the site doesn't advertise.
3. `WebSearch` for `is <name> 100% vegan?` — this single query reliably surfaces community confirmations or contradictions that the business's own site often hedges around.
4. Assigns all structured fields from the research and writes a short description.

**Decision point:** Claude assigns `vegan_level` here (see Stage 4) before any code runs.

---

## Stage 2 — Deduplication

**What the code does (deterministic, no AI):**

- Loads all existing places from Supabase into memory: `source_id`, `name`, `latitude`, `longitude`, `slug`.
- For each candidate:
  1. Checks `source_id` (e.g. `osm-node-12345678`) against the in-memory set — exact match → skip.
  2. Checks coordinate proximity: if a place with the same transliterated name exists within 0.001 degrees (~100m) → skip.
  3. For manual add: checks if a matching OSM node exists within ~55m via a targeted Overpass lookup, and merges its data if found.

**Chain filter (deterministic, blocklist):** If the place name matches any entry in `EXCLUDED_CHAINS` — a hardcoded set of ~30 chain names with animal-centric Platonic forms (McDonald's, KFC, Burger King, Pizza Hut, etc.) — it is dropped silently. This runs before geocoding or any network call.

**What AI does:** Nothing.

---

## Stage 3 — City Resolution (Geocoding)

**What the code does:**

OSM tags sometimes include `addr:city`. If they do, the value is run through:
1. `transliterate()` — strips diacritics and converts non-ASCII characters to ASCII approximations (e.g. `ü → u`, `ñ → n`)
2. `CITY_OVERRIDES` lookup — a table of ~300 known problematic names: bilingual administrative names (e.g. `bruxelles - brussel → Brussels`), non-Latin scripts (e.g. `서울특별시 → Seoul`, `القاهرة → Cairo`), district-to-city mappings (e.g. `千代田区 → Tokyo`), and local administrative suffixes stripped (`district`, `municipality`, `gemeinde`, etc.)

If no city comes from OSM tags (roughly 20-40% of places), **Nominatim reverse geocode API** is called:
- Input: latitude + longitude
- Output: structured address object with `city`, `town`, `village`, `suburb` fields
- The response is passed through the same `CITY_OVERRIDES` table
- Nominatim is rate-limited to 1 request per second (1.2s delay between calls)
- Results are cached in memory by approximate coordinate key to avoid duplicate calls for nearby places

**What AI does:** Nothing. All city resolution is deterministic lookups and regex.

---

## Stage 4 — Vegan Level Assignment

This is the most consequential step. The logic differs by entry point.

### OSM import (rule-based, no AI)

The `mapVeganLevel()` function reads two OSM tags:

| OSM tag | → `vegan_level` |
|---|---|
| `diet:vegan=only` | `fully_vegan` |
| `diet:vegetarian=only` (without `diet:vegan`) | `vegan_friendly` |
| `diet:vegan=yes` | `vegan_friendly` |
| `cuisine=vegan` (without diet tags) | `vegan_friendly` |

No probabilistic reasoning. The OSM community's tag is taken at face value.

**Known limitation:** OSM tags can be wrong or outdated. A place tagged `diet:vegan=only` years ago may have since added animal products. This is caught by the post-import reclassification pass (Stage 9).

### Manual add (Claude AI)

Claude uses the research from Stage 1 to apply the 4-tier classification:

| Level | Assign when | Example signals |
|---|---|---|
| `fully_vegan` | 100% vegan menu, zero animal products | Yelp "Vegan" category, HappyCow confirms 100% vegan, menu shows no animal items |
| `mostly_vegan` | Presents as vegan but a few non-vegan items visible | Reviews mention "they added salmon"; one non-vegan dish out of 20 |
| `vegan_friendly` | Non-vegan place with genuine vegan section or 3+ dedicated dishes | Thai restaurant with extensive vegan menu; health café |
| `vegan_options` | Mainstream place with only 1-2 vegan items | Italian with pasta pomodoro; steakhouse with one salad |

Default is `vegan_friendly` when evidence is ambiguous. Never assigns `fully_vegan` without positive evidence from a third-party source (HappyCow, press, reviews).

### Staging pipeline (rule-based classifier, no AI)

`src/lib/places/vegan-signal.ts` runs 9 rules in order of confidence, stopping at the first match:

1. `osm_diet_vegan_only` — OSM tag present → `fully_vegan` (confidence 0.95)
2. `fully_vegan_phrase` — Phrase like "100% vegan", "entirely plant-based", "no animal products" found in website title, description, og: tags, or JSON-LD body → `fully_vegan` (0.90)
3. `ld_json_vegan_cuisine` — JSON-LD `servesCuisine` contains "Vegan" without "Vegetarian" → `fully_vegan` (0.85)
4. `name_vegan_only` — Business name contains "vegan" but not "vegetarian" → `fully_vegan` (0.75)
5. `osm_diet_vegan_yes` — OSM `diet:vegan=yes/limited` → `vegan_friendly` (0.80)
6. `vegan_friendly_phrase` — Phrases like "vegan options", "vegan menu available", "plant-based options" → `vegan_friendly` (0.75)
7. `fsq_mixed_category` — Foursquare category is "Vegan and Vegetarian" + "vegan" appears in body → `vegan_friendly` (0.70)
8. `vegetarian_only_phrase` — Site says "vegetarian restaurant" with no vegan phrase → `vegetarian_reject` — **not imported**
9. `no_signal` or single stray mention → `unknown` — goes to `needs_review`

---

## Stage 5 — Website Enrichment (images + description from the place's own site)

This runs immediately after import for any newly inserted place that has a `website` field. It is entirely code-driven, no AI.

### Hero image scraping

**What the code does:**

1. Tries up to 7 URL paths on the website: `/`, `/menu`, `/gallery`, `/about`, `/about-us`, `/food`, `/press`
2. On each page, fetches the first ~60KB of HTML
3. Extracts image candidates from:
   - `og:image` meta tag
   - `twitter:image` meta tag
   - `<img src>`, `data-src`, `data-original`, `data-lazy-src` attributes
4. Filters out logos, favicons, SVGs, icons (regex: `logo|favicon|sprite|icon|avatar|emoji|\.svg`)
5. For each candidate URL: fetches the image, measures pixel dimensions using the `sharp` library
6. Rejects images that are: < 5KB, < 600px wide, < 300px tall, or have extreme aspect ratios (wider than 6:1 or taller than 3:1)
7. Picks the largest image by pixel area

**What AI does:** Nothing. Pure HTTP + regex + image measurement.

**Fallback for JavaScript-rendered sites:** If the static scraper finds nothing (common on React/Framer/SPA sites), the add-place skill uses the `chrome-devtools` MCP to open the URL in a real browser, wait 4 seconds for JS to render, then evaluate a script to extract fully-rendered `<img>` dimensions and CSS background-image URLs. Same size filtering applies.

### Description from website

**What the code does:**

Fetches the homepage HTML and extracts `og:description` or `<meta name="description">`. Cleans HTML entities, trims to 400 characters. If neither tag is present, returns null — AI fills the gap in Stage 6.

**What AI does:** Nothing here.

---

## Stage 6 — AI Description Generation (batch pass)

Runs as a separate batch job via `scripts/generate-descriptions.ts`, not inline with the import.

**When it runs:** After bulk imports, manually triggered: `npx tsx scripts/generate-descriptions.ts --limit=3000`

**What the code does:** Queries all `places` records where `description IS NULL`, in batches.

**What AI does (gpt-4o-mini):**

Input sent to the model (per place):
```
Name: <name>
Type: <100% vegan / vegan-friendly> <subcategory or category>
Location: <city, country>
Cuisine/focus: <cuisine_types if present>
Notable for: <tags, filtered to remove system tags>
```

Instruction: "Write a 2-3 sentence description for a vegan place directory entry. Be specific and informative. Don't start with 'This' or the place name. Don't be generic. Focus on what kind of experience or food you'd actually find there."

Output: 2-3 sentences, max 400 characters, saved directly to `places.description`.

**Parameters:** gpt-4o-mini, `max_tokens=150`, `temperature` default (0). Concurrency: 10 simultaneous requests, 100ms sleep between batches.

**Cost:** ~$0.008 per 1,000 places at current gpt-4o-mini rates (~$0.30 for the full 37K database).

**Known failure modes:**
- Rate limiting (HTTP 429): waits 15s, counts as failed, does not retry in same pass
- Hallucination of specific facts (hours, prices, menu items): the prompt is intentionally vague to avoid this, but it can still occur — see the Indianapolis examples in the data quality runbook
- Wrong vegan_level in the description: if `vegan_level='fully_vegan'` but the place is actually not, the generated text will say "fully vegan menu" — incorrect. Caught by community reports and the reclassification pass.

---

## Stage 7 — Image Hosting (manual add only)

**What the code does (`scripts/add-place.ts`):**

1. Downloads the selected hero image
2. Re-encodes it as JPEG quality 88, max 1600×1600 pixels, using `sharp`
3. Uploads to Supabase `place-images` storage bucket as `{place_id}.jpg`
4. Sets `main_image_url` to the Supabase public CDN URL

This means the UI never depends on the origin website's CDN staying up. Bulk imports (OSM) skip this step — they store the original URL directly in `main_image_url`. A separate batch job (`scripts/fetch-og-images.ts`) can re-host those later.

**What AI does:** Nothing.

---

## Stage 8 — Database Insert

**What the code does:**

Inserts a row into the `places` table with all collected fields. The key schema fields set at insert time:

| Field | Source |
|---|---|
| `name` | OSM tag / manual research |
| `category` | OSM tags (shop→store, tourism→hotel, else→eat) / Claude research |
| `vegan_level` | Stage 4 rules / Claude assignment |
| `latitude`, `longitude` | OSM coordinates / Nominatim geocoding |
| `city`, `country` | Stage 3 geocoding |
| `address` | OSM addr tags / manual / Nominatim |
| `website`, `phone` | OSM tags / manual research |
| `opening_hours` | OSM tag / manual research |
| `images`, `main_image_url` | Stage 5 scraping |
| `description` | Stage 5 meta scrape (or null, filled by Stage 6) |
| `source` | Tag like `osm-import-2026-04` for bulk, or `manual` for single adds |
| `source_id` | `osm-node-{id}` or `osm-way-{id}` |
| `slug` | Unique URL-safe slug: `{name}-{city}` if name alone is taken |
| `tags` | System tags like `vegan shop`, `vegan stay` + any extra |
| `verification_status` | `approved` (OSM / manual) or `pending` (staging pipeline) |
| `created_by` | Admin user ID |

After insert, `refresh_directory_views()` is called to update the `city_scores`, `directory_cities`, and `directory_countries` materialized views.

**What AI does:** Nothing.

---

## Stage 9 — Staging Pipeline Verification (Foursquare / third-party sources)

This stage only applies to places that entered via `place_staging`, not via OSM or manual add.

### Website verification (`src/lib/places/website-verify.ts`)

**What the code does (no AI):**

1. HEAD request: checks if the URL is alive (filters 404/5xx/timeouts cheaply)
2. GET request: fetches up to 64KB of HTML
3. Extracts: `<title>`, `<meta name="description">`, all `og:` tags, all `<script type="application/ld+json">` blocks (parsed as JSON), detected menu links (URLs containing /menu, /carte, /speisekarte, etc.), page language from `<html lang>`
4. **Closure detection:** Scans full body for 12+ closure phrases in 8 languages: "permanently closed", "definitively closed", "we have closed", "chiuso definitivamente", "dauerhaft geschlossen", etc.
5. **Parked domain detection:** Flags pages < 400 bytes or containing "domain for sale", "buy this domain" — signals expired/abandoned domain

Output: a `WebsiteSignal` object — `ok`, `title`, `description`, `og`, `ld_json`, `menu_links`, `lang`, `closure_hint`, `parking`, etc.

### Vegan signal classification (`src/lib/places/vegan-signal.ts`)

Already described in Stage 4. Runs on the `WebsiteSignal` output.

### Quality scoring (`src/lib/places/score.ts`)

**What the code does (no AI):**

Additive scoring from independent signals:

| Signal | Points |
|---|---|
| Required fields present | 15 |
| Website reachable (HTTP 200) | 15 |
| JSON-LD structured data present | 10 |
| Website language matches country | 10 |
| Source data freshness ≤ 12 months | 10 |
| Menu link detected on website | 10 |
| Vegan signal: `fully_vegan` high confidence | 20 |
| Vegan signal: `fully_vegan` medium confidence | 15 |
| Vegan signal: `vegan_friendly` high confidence | 10 |
| Vegan signal: `vegan_friendly` medium confidence | 5 |
| Phone number present | 5 |
| **Maximum possible** | **100** |

**Hard overrides (score → 0, immediate reject):**
- Vegan signal is `vegetarian_reject` (site explicitly says "vegetarian restaurant" with no vegan content)
- `closure_hint` detected on website (business has self-reported closing)
- `parking` detected (domain expired/parked)

**Decision thresholds:**
- Score ≥ 80 → `auto_import` (inserted to `places` automatically)
- Score 55-79 → `needs_review` (goes to admin staging queue)
- Score < 55 → `reject` (stays in `place_staging` with reason, not deleted — can be reconsidered)
- Score = any AND `vegan_level='unknown'` AND score < 60 → `reject` (no vegan evidence = shouldn't be on a vegan platform)

### Admin staging review

For `needs_review` rows, an admin sees the place in `/admin/staging` with the score breakdown, vegan evidence, and the website signal. Actions:
- **Approve** → copies the row to `places` with `vegan_level=vegan_friendly` (default)
- **Approve as 100% Vegan** (M key) → `vegan_level=fully_vegan`
- **Approve as Mostly Vegan** → `vegan_level=mostly_vegan`
- **Approve as Has Options** → `vegan_level=vegan_options`
- **Reject** → marks with reason, row stays in staging

---

## Stage 10 — Post-Import AI Reclassification (batch, periodic)

Two scripts can reclassify existing places after import. Both use **gpt-4o-mini**.

### `scripts/reclassify-to-vegan-options.ts`

**Purpose:** Downgrades `vegan_friendly` places whose description signals they're mainstream venues with only 1-3 token vegan items.

**What AI does:**

Input per place:
```
Place: <name>
Category: <category>
Description: <description>
Tags: <tags>
```

Classification prompt defines two tiers:
- `vegan_friendly`: genuine vegan section OR 4+ clearly dedicated vegan dishes, Thai/Indian/Middle-Eastern/East-Asian with strong plant-based selection
- `vegan_options`: mainstream venue with only 1-3 token vegan items; steakhouse/pizza/burger/seafood with a single vegan dish

Output: one of `vegan_friendly` or `vegan_options`. "If in doubt → vegan_friendly."

**Pre-filter (no AI):** If the place name or description contains any of: `vegan`, `vegetarian`, `veggie`, `plant-based`, `herbivore`, `vegane`, `végétal` — classified as `vegan_friendly` without calling the API.

**Result so far:** 263 places downgraded to `vegan_options`, 30,681 kept as `vegan_friendly`.

### `scripts/reclassify-vegan-levels.ts`

**Purpose:** Full 4-tier reclassification of all places (including `fully_vegan`) using the description as input. Catches cases like a formerly-vegan restaurant that added non-vegan items.

**What AI does:**

Same general structure — classifies into `fully_vegan`, `mostly_vegan`, `vegan_friendly`, `vegan_options`.

Only writes back if the classification **changes** from the current value. Places without a description are skipped (insufficient signal).

---

## Stage 11 — Community Verification (ongoing)

Once a place is live, users can report issues via the verify prompt on each place page.

**What the code does:**

Each report type adds a tag to the place's `tags` array:
- `community_report:not_fully_vegan`
- `community_report:actually_fully_vegan`
- `community_report:non_vegan_chain`
- `community_report:few_vegan_options`
- `community_report:not_vegan_friendly`
- `community_report:permanently_closed`
- `community_report:hours_wrong`

These surface in the `/admin/data-quality` page under the "Vegan Status" tab.

**Admin confirm actions (one-click in the UI):**
- "Upgrade to 100% Vegan" → sets `vegan_level='fully_vegan'`, clears all vegan report tags
- "Downgrade to Mostly Vegan" → sets `vegan_level='mostly_vegan'`, clears tags
- "Set: Has Vegan Options" → sets `vegan_level='vegan_options'`, clears tags
- "Archive Chain" → soft-archives the place

**What AI does:** Nothing. The admin makes the final call.

---

## Summary: what APIs do vs. what AI does

### Pure APIs (deterministic, reproducible)
| System | What it provides |
|---|---|
| Overpass API (OSM) | Raw place data: name, coordinates, phone, website, opening hours, diet tags |
| Nominatim (OSM) | Reverse geocoding: lat/lon → city name |
| Place website (HTTP) | og:image, meta description, JSON-LD, closure keywords, menu links |
| Supabase | Database reads/writes |
| sharp (local) | Image pixel dimensions |

### Rule-based code (deterministic, but authored logic)
| Component | What it decides |
|---|---|
| `CITY_OVERRIDES` table (~300 entries) | Non-Latin / bilingual city names → English |
| `EXCLUDED_CHAINS` blocklist (~30 entries) | Chain filter by Platonic-form policy |
| `mapVeganLevel()` | OSM diet tag → `fully_vegan` or `vegan_friendly` |
| `vegan-signal.ts` (9 rules) | Website content → vegan level + confidence score |
| `score.ts` (additive) | All signals → 0-100 score → import/review/reject |
| `isExcludedChain()` | Name blocklist check |
| Slug generator | Unique URL-safe slug from name + city |

### AI models (probabilistic, can hallucinate)
| Model | Where used | What it decides |
|---|---|---|
| **Claude** (add-place skill) | Manual add, one place at a time | Researches place from URLs, assigns all fields including `vegan_level` with reasoning |
| **gpt-4o-mini** (generate-descriptions) | Batch, after import | 2-3 sentence description from structured metadata |
| **gpt-4o-mini** (reclassify-to-vegan-options) | Batch, periodic | Downgrades `vegan_friendly` → `vegan_options` using description text |
| **gpt-4o-mini** (reclassify-vegan-levels) | Batch, periodic | Full 4-tier re-classification using description text |

### Key limitations of the AI steps
- **generate-descriptions** can assert wrong facts if the metadata is thin (e.g. "fully vegan menu" for a place that's only vegan_friendly — the vegan_level field is the source of truth for the prompt, so wrong level = wrong description)
- **reclassify scripts** only run on places that have a description — ~20% of the database has no description and keeps its imported level indefinitely
- **Claude (add-place)** can be fooled by hedge language on place websites; the mandatory `is X 100% vegan?` WebSearch step is the main guard against this
- **OSM import** takes OSM tags at face value — no AI verification of whether `diet:vegan=only` is actually true

---

## Scripts reference

| Script | Purpose | Trigger |
|---|---|---|
| `scripts/import-osm-countries.ts` | Bulk OSM import for one or more countries | Manual |
| `scripts/generate-descriptions.ts` | AI descriptions for places with none | Manual, after bulk import |
| `scripts/staging-verify.ts` | Website-verify + score all pending staging rows | Manual / cron |
| `scripts/reclassify-to-vegan-options.ts` | Downgrade vegan_friendly → vegan_options | Manual, periodic |
| `scripts/reclassify-vegan-levels.ts` | Full 4-tier reclassification | Manual, periodic |
| `scripts/add-place.ts` | Single place insert (used by /add-place skill) | Via skill |
| `scripts/refresh-directory-views.ts` | Refresh city_scores + directory views | After bulk ops |
| `scripts/fetch-og-images.ts` | Re-host images from place websites to Supabase bucket | Manual, batch |
