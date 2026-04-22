---
name: add-place
description: Add a vegan or vegan-friendly place to PlantsPack from a website URL, Google Maps link, or Facebook page. Invoke via /add-place <URL>, or when the user writes "add this place" / "add this stay" / "add this cafe" + a URL. Runs WebFetch + WebSearch to extract structured data, then pipes a JSON payload to scripts/add-place.ts which handles geocoding, image scraping, and the Supabase insert.
---

# add-place

Adds a single place to the `places` table with `verification_status='approved'` (live immediately) unless the user explicitly asks for a review-queue insert. Output is the public `/place/<slug>` URL.

`$ARGUMENTS` should be one or more of:
- The place's **website URL** (best — most structured data)
- A **Google Maps URL** (good for precise coords)
- A **Facebook page URL** (limited — FB blocks scrapers, but we can still extract the business name and then WebSearch for the real website)

If the user provides multiple URLs for the same place, use all of them as evidence sources.

## Required output fields — what you need to gather

Before running the CLI, you must have:

| Field | How to get it |
|---|---|
| `name` | Page title, `<h1>`, or "About" / "Our story" sections. |
| `city` | Address on the page, footer, or a WebSearch for "<name> <broad location>". |
| `country` | Same as city. |
| `category` | One of `eat` / `hotel` / `store` / `organisation` / `event`. Infer from content: restaurant/café → `eat`; hotel/B&B/retreat/glamping → `hotel`; shop/market → `store`; sanctuary/charity → `organisation`; one-off festival/class → `event`. |
| `vegan_level` | `fully_vegan` or `vegan_friendly`. Look for explicit claims: "100% vegan", "plant-based only", "vegan menu" → fully_vegan. "Vegan options available", "vegetarian café with vegan choices" → vegan_friendly. **If unclear after a WebFetch, do a WebSearch specifically for "<name> vegan" before defaulting.** Never guess fully_vegan unless you have direct evidence — misclassifying a vegan-friendly place as fully_vegan is a data-quality violation. |
| `subcategory` | Optional but valuable: `cafe`, `restaurant`, `retreat`, `guesthouse`, `glamping`, `sanctuary`, `bakery`, `farm_shop`, etc. |
| `address` | Full street address with postcode (UK) or ZIP (US/other). If missing from the site, do a WebSearch for "<name> <city> address postcode". |
| `latitude` / `longitude` | The CLI will geocode from the address via Nominatim. Only set these if you have them already (e.g. a Google Maps URL — the `@lat,lng` in the URL is reliable). |
| `website` | The place's own domain. If the user gave a Facebook or Google Maps URL, WebSearch for the real site and use that instead. Don't set `website` to a Facebook URL unless that's genuinely all they have. |
| `phone` | Optional. |
| `description` | A short 1–3 sentence paragraph explaining what the place is and what makes it notable. Focus on vegan angle + what's offered. Don't copy marketing fluff; be specific (e.g. "Fully-vegan glamping retreat with 4 eco-pods, spa treatments using plant-derived skincare, guests asked to bring plant-based food only.") |
| `tags` | Optional extras: `zero_waste`, `pet_friendly`, `seasonal_menu`, `county:<X>`, `sanctuary`, etc. |
| `country_code` | ISO-3166-1 alpha-2, lowercase. Default `gb`. Set to `de` for Germany, `fr` for France, `us` for USA, etc. Used by Nominatim to scope geocoding. |

## Procedure

Follow in order:

1. **WebFetch the primary URL.** If it's a Facebook or Google Maps URL, skip straight to step 2 (they block scrapers).
2. **WebSearch for the real website + address + vegan status.** Query like `"<name>" <city> vegan` and `"<name>" address postcode`.
3. **Cross-check the vegan level.** At least one explicit "100% vegan" / "plant-based only" / equivalent statement is required before you pick `fully_vegan`. Otherwise default to `vegan_friendly`. This matches the project's NEVER-mark-fully-vegan-unless-verified rule in CLAUDE.md.
4. **Pick the category.** When in doubt between `eat` and `hotel` (e.g. B&B with a café), pick by *primary* business. The Miggi → hotel (guesthouse). A café with rooms → eat.
5. **Build a JSON payload** matching the schema above. Skip optional fields you don't have — the CLI fills them where it can.
6. **Run the CLI**:

   ```bash
   cat <<'EOF' | npx tsx scripts/add-place.ts
   {
     "name": "…",
     "city": "…",
     "country": "United Kingdom",
     "category": "hotel",
     "vegan_level": "fully_vegan",
     "website": "https://…",
     "address": "…",
     "description": "…",
     "country_code": "gb",
     "tags": ["user_recommended", "county:Cornwall"]
   }
   EOF
   ```

   The CLI will:
   - Geocode the address via Nominatim (exact + city-fallback).
   - Scrape a hero image from the website (og:image → twitter:image → first non-logo `<img>` with hero-ish alt/src; handles Wix lazy-loading via `data-src` and `srcset`).
   - Insert with `verification_status='approved'` + `is_verified=true` unless `--pending` was passed.

7. **Report to user**: the public `/place/<slug>` URL, plus flag anything that came back empty (hero image, coords, address). Ask them for a direct URL to patch the gap, or say "nothing more to add" and move on.

## Flags

- `--pending` → insert with `verification_status='pending'` (goes to the admin queue instead of going live). Use when the user says "queue for review" or similar.
- `--dry-run` → don't insert; just print the final payload. Useful when you want the user to eyeball before committing.

## Examples

### Example 1 — full flow from a website

User: `add this stay: https://hayecornwall.co.uk/`

You:
1. WebFetch → extracts name, description, identifies sanctuary + retreat.
2. WebSearch → confirms 100% vegan + finds Liskeard postcode PL17 7TD.
3. Build JSON with `category: "organisation"`, `subcategory: "sanctuary"`, `vegan_level: "fully_vegan"`.
4. Pipe to CLI → outputs live URL.

### Example 2 — Facebook-only place

User: `add https://www.facebook.com/cosmickitchenplymouth`

You:
1. Skip WebFetch (FB blocks).
2. WebSearch `"Cosmic Kitchen" Plymouth vegan address` → finds website + Barbican PL1 2AY address + 100% vegan confirmation.
3. Build JSON with the *real* website, not the FB URL.
4. Pipe to CLI.

### Example 3 — Google Maps URL

User: `add https://www.google.com/maps/place/Almanac+Cafe/@50.36941,-4.1394754,17z/...`

You:
1. Extract coords directly from the URL: `50.3694, -4.1395`.
2. WebSearch for "Almanac Cafe Plymouth" → get website + address.
3. Build JSON with `latitude` / `longitude` pre-filled so the CLI skips geocoding.
4. Pipe to CLI.

## Never

- **Never insert `vegan_level: "fully_vegan"` without evidence.** Must come from a direct claim on their site or in a reputable listing (HappyCow, My Vegan Town, Vegan Cornwall Guide, etc.).
- **Never use a Facebook or HappyCow URL as the `website` field.** Those are aggregators, not the business's primary web presence. Leave `website` empty if there's no real site.
- **Never chain-add more than 5 places in one skill invocation.** For batch imports use `scripts/seed-*.ts` with a hand-curated list.
- **Never skip the vegan cross-check.** PlantsPack's integrity is built on accurate `vegan_level` — if you can't verify, default to `vegan_friendly`.

## Error handling

- If the CLI reports "Insert failed" with a UNIQUE constraint error, it means another place with the same slug exists. Use a more specific `slug` (e.g. `the-miggi-paignton` instead of `the-miggi`) and retry.
- If `geocode failed`, the place is inserted with `latitude: null, longitude: null` — it won't appear on the map until coords are backfilled. Mention this to the user and offer to retry with a different address string.
- If `no hero image found`, the place is inserted without a photo — it'll show a category icon. Mention this and suggest the user provides a direct image URL if they have one.
