---
name: country-slides
description: Slideshow factory for the "one country per week" social series. Invoke via /country-slides <Country> <ISO2>, or when the user says "make the slides for <country>" / "render the <country> carousel". Pulls live PlantsPack data, picks six unique places, renders six slides in both story (1080x1920, TikTok-safe) and feed (1080x1350) formats, and drafts the caption. Honest numbers only.
---

# country-slides

Produces `docs/marketing/tiktok-templates/country-slides/<country>/slides/{story,feed}/*.png` plus a caption. Everything runs from the web repo root. Template, builder and renderer live in `docs/marketing/tiktok-templates/country-slides/` (README there has the details and the TikTok safe-area rule).

## Procedure

1. **Data.** `node docs/marketing/tiktok-templates/country-slides/build-data.mjs "<Country>" <ISO2> [adminLevel] [extraRegionISO]`
   - `<Country>` exactly as stored in `places.country`. `adminLevel` is the OSM level of the "province" layer (6 for Belgium, Netherlands, France departments; 4 for German Länder, Austrian Bundesländer, Spanish autonomous communities). A capital region that is a hole in a province goes in `extraRegionISO` (Belgium: `BE-BRU`).
   - It writes `<country>/data.json` and prints totals, top cities and regions. Overpass is cached next to data.json; if it 406s, retry once.
   - Counting rules are in the script: live rows only; `fv_mode` defaults to `label` (vegan_level = fully_vegan, the number the hub pages and video scripts use). Switch to `confirmed` only if the user asks for the stricter is_verified number, and keep the two consistent across a campaign.

2. **Hand-pick the six unique places.** Open `<country>/data.json`, read `unique_candidates` (fully vegan or organisations, non-restaurant categories or rare subcategories, with a photo). Choose six that a local would not expect: a Michelin star, a fully vegan chip shop, a sanctuary, a tattoo studio, a chocolate maker, a hotel. Write them into `unique` as `{name, city, line, image, slug}`; `line` is one factual sentence from the place's own description (no invented claims). Set `cover_line`, `ask_line` and `ask_regions` (4-5 thinnest regions, mixed across the country, phrased as an ask, never as a league table between regions).

3. **Render both formats.** `node docs/marketing/tiktok-templates/country-slides/render.cjs <country>` (add `--format story|feed` or `--slides 1,3` to re-render a subset). Build one review strip per format with ffmpeg `hstack` and LOOK at it: footer not overlapping text, no empty slide, map centred, chips on one or two lines. Story format must keep every line inside 290..1430 px (TikTok crops 240 px top and bottom and overlays header, caption and buttons).

4. **Caption.** Short, numbers from data.json, end with the ask, then the bio link and 6-8 hashtags: `#vegan<country> #vegan<topcity>... #vegantravel #veganfood #plantbased #<country>`. Pinned comment: "Which country should we map next? Most liked comment wins." Say explicitly that the numbers must be re-run on posting day if more than a few days pass.

5. **Report**: paths of both sets, the six unique picks, the ask regions, the caption, and anything in the data that looked wrong (a mislabelled place, a city split across two names) as todo items; do not fix data silently inside this skill.

## Never

- Never show a region-vs-region comparison as a ranking; slide 5 is an ask.
- Never use the word "verified" or "confirmed" for the `label` count.
- Never invent a line for a unique place; quote or condense its own description.
- Never post; the user posts. Posting cadence and channel rules are in the user's memory (TikTok plan).
