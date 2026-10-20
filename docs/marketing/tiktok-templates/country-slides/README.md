# Country slideshow template (TikTok / Instagram, 1080x1920)

Six data-driven slides per country, rendered from `template.html` with Playwright.
Built for the "one country per week" TikTok series: the slideshow goes out before
the face video and shows the numbers the video then talks about.

Slides: 1 cover (country outline) · 2 totals + vegan-level bar · 3 best cities by
confirmed fully vegan places · 4 six hand-picked unique places with photos ·
5 "help us fill the gaps" choropleth of the least covered provinces · 6 CTA.

## Make one for a new country (run from the web repo root)

```bash
# 1. data (live DB + Overpass province polygons; cached in <country>/overpass-*.json)
node docs/marketing/tiktok-templates/country-slides/build-data.mjs "Belgium" BE 6 BE-BRU
#    args: country name as stored in places.country, ISO2, OSM admin_level of the
#    "province" layer (6 for BE/NL/FR departments... check on OSM), optional
#    ISO3166-2 code of a region that is a hole in a province (Brussels, Berlin...).
# 2. edit <country>/data.json: fill `unique` (6 items: name, city, line, image, slug)
#    from `unique_candidates`, tweak cover_line / ask_line / ask_regions.
# 3. render
node docs/marketing/tiktok-templates/country-slides/render.cjs belgium   # both formats
#    -> <country>/slides/story/01-xx-story.png (1080x1920, TikTok/Reels/Shorts)
#    -> <country>/slides/feed/01-xx-feed.png   (1080x1350, Instagram/LinkedIn carousel)
#    --format story|feed and --slides 1,3 narrow it down
```

## Number rules baked into build-data.mjs
- Live rows only (`archived_at IS NULL`), same as the hub pages.
- `fv_mode` in data.json: `label` (default) counts `vegan_level=fully_vegan`, the same number the hub pages and the video scripts use; `confirmed` counts label AND is_verified=true. With `label` the orange segment is "Not labelled yet". With `confirmed`, the raw
  fully_vegan label count is never shown; unconfirmed fully-vegan rows and rows with
  no level land in "Still checking".
- Province assignment is point-in-polygon on OSM boundaries; a few hundred metres at a
  border can flip a place. Good enough for "where the map is thin", not for claims.
- Slide 5 is an ask, not a league table. Keep the least-covered list mixed across the
  country's regions (see memory: no Flanders-vs-Wallonia framing).

## Files
- `template.html` fonts from Google Fonts (needs network when rendering), logo from
  `public/plantspack.svg`, brand colours from tailwind.config.
- `render.cjs` Playwright + Chrome, 1080x1920, DSF 1. `node render.cjs belgium 4` renders one slide.
- `<country>/data.json` is the only thing you edit by hand; re-running build-data keeps
  `unique`, `cover_line`, `ask_line`, `handle`, `link`.

## TikTok safe area (learned 2026-10-20)
TikTok shows photo posts in a 3:4 window and centre-crops 9:16 images: the top and
bottom 240 px of a 1080x1920 slide are cut for every viewer, and the app overlays the
header at the top, the caption and sound at the bottom, and the buttons on the right.
The template keeps every line inside 290..1430 px vertically, 150 px clear on the right,
and the footer at y 1590. Review strips: draw 240 px bands top and bottom before judging.
