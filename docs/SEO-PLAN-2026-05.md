# SEO plan — top 5 improvements (2026-05-13)

Ranked by **leverage × confidence**, assuming a single developer's time and
the current ~30 visits/day baseline. Each item is scoped so it can ship
in 1-5 working sessions.

**Note on GSC data**: `GSC/` was empty at the time of writing, so this
plan is grounded in platform-knowledge (DB inventory, the summer-hub
audit on 2026-05-13, session memory) rather than a fresh Search Console
export. Drop a CSV into `GSC/` and these recommendations can be sharpened
against real query-position data.

---

## 1. Auto-generated city-page intros for every city with ≥5 places

**Leverage**: highest of anything on this list. ~10,000 cities in the DB.
Currently most city pages are a place list + a thin h1. Adding 100-150
words of programmatic prose per city gives Google something to rank on
for the long-tail mass.

**Why programmatic, not hand-written**: 10,000 cities × 10 minutes of
hand-writing = unworkable. With data we already have, the prose
template can produce specific, non-spammy text:

> Düsseldorf has 47 vegan and vegan-friendly places across the city,
> including 12 fully vegan venues. The strongest neighbourhoods are
> Flingern (12 spots, average rating 4.3) and Bilk (9 spots). The
> dominant cuisines are Italian (8 venues), Asian (6), and bakery (5).
> 23 venues have been added in the last 6 months — the scene is
> growing fast.

**How to ship**:
1. Pull aggregates per city: count, count-fully-vegan, top-3 neighbourhoods,
   top-3 cuisines, count-added-last-90-days, top-3 places by rating.
2. Template the prose with conditional sentences (skip "fully vegan"
   line if count is 0, etc.).
3. Render server-side on each city page above the place list.
4. Cache (already do — `revalidate: 3600`).

**Expected impact**: each city page goes from ~30 indexable words to
~150-200. Compound effect: even 50 extra monthly visitors per city ×
10K cities = 500K monthly potential ceiling (12-24 month horizon, with
linking + freshness).

**Effort**: ~6-10 hours including data queries + template + visual QA on
a handful of city pages.

---

## 2. Programmatic "Best vegan [category] in [city]" listicle pages

**Leverage**: captures intent queries we currently don't rank for at all.
"Best vegan bakery Berlin", "best vegan pizza Lisbon", "100% vegan
restaurant Madrid" — these are low-competition long-tail queries with
high commercial intent.

**Scope**: top 50 cities × 6 categories = 300 pages.

Categories worth shipping:
- restaurant (most general — needs careful wording to avoid duplicating
  the city page)
- bakery / dessert
- pizza
- brunch
- coffee
- ice cream / gelato

**Page shape**: H1 = "Best vegan bakery in Berlin", intro sentence,
3-5 ranked cards pulling top-rated `category=eat AND
cuisine_types contains 'bakery'` places, plus a "see all bakeries in
Berlin" link.

**Where to slot it**:
- Route: `/vegan/[city-slug]/[category-slug]` or
  `/vegan-places/[country]/[city]/[category]` (the second nests under
  existing URL structure — preferred)
- Add to sitemap at priority 0.65
- Internal-link from the city page's category counts (e.g.,
  "12 bakeries" becomes a link)

**Risk**: thin content per page if the city has <5 entries in that
category. Gate behind a min-count threshold (≥3 places) so we only
ship pages that have substance.

**Effort**: ~8-12 hours for route + template + data layer + sitemap
generation.

**Expected impact**: at conservative 30 monthly visits per page × 300
pages = 9,000 monthly visitors. Higher if ranking lands top-3.

---

## 3. Country-page editorial intros (matches the summer-hub treatment)

**Leverage**: 163 country pages, all currently thin. The summer-hub
fix-pack 2 just established the pattern: 60-100 word intro per country
above the city grid. Apply the same to every country page.

**Why this is fast**: the template is built; the prose can be
half-templated (autocompute leading cities + counts) and half hand-
written (cuisine context).

**How to ship**:
- For each country, query: top 5 cities by count, total places,
  total fully-vegan-verified, dominant cuisines.
- Combine with a ~30-word hand-written cuisine context line per country
  (or skip the hand-written part initially and let it be 100%
  programmatic — Google will still rank it).
- Render server-side on `/vegan-places/[country]` page.

**Expected impact**: country pages start ranking for "vegan in
[country]" and "is [country] vegan-friendly" — moderate-volume queries
(500-3K/month for big countries) that PlantsPack should naturally win.

**Effort**: ~4-6 hours. Most is template work; per-country prose can
roll out 10-20 at a time.

---

## 4. FAQ + "People also ask" schema on top-N city pages

**Leverage**: rich-result eligibility on the highest-traffic pages.
The summer-hub now has FAQPage JSON-LD; that pattern can extend.

**Scope**: top 50 cities by place count. For each, generate 4-6
data-grounded FAQs:
- "How many vegan places are in [city]?" → answer from DB
- "What's the highest-rated vegan place in [city]?" → top place
- "Are there fully vegan restaurants in [city]?" → fully-vegan count
- "What neighbourhoods are best for vegan food in [city]?" → top 3
  neighbourhoods by density
- "Is [city] good for fully vegan travellers?" → comparative answer

**How to ship**:
- Template the FAQ generator using city aggregates.
- Render both visible accordion FAQ block + matching `FAQPage`
  JSON-LD.
- A/B with vs. without to measure CTR impact.

**Expected impact**: Google's "People Also Ask" carousels often surface
these. CTR uplift of 10-30% on city pages that win the carousel slot.

**Effort**: ~4-6 hours including template + visual rendering + JSON-LD.

---

## 5. Internal linking pass: every place links back to its city's
       category page

**Leverage**: cheap one-time engineering, compounding ranking signal.

The current place page links to its city page and to similar nearby
places. It should also link to:
- Its city's "Best vegan [category] in [city]" page (item #2)
- The country page
- 2-3 named places in the same cuisine

**Why this matters**: Google rewards sites with clear topical clusters.
Currently PlantsPack has a flat link graph; making it hierarchical
(country → city → category → place) signals to Google that the city +
category pages are hub nodes.

**How to ship**:
- Add a "More vegan [category] in [city]" link block to the place
  page footer once item #2 ships.
- Add 2-3 "similar places" links keyed off `cuisine_types` overlap
  within the same city.

**Expected impact**: indirect but compounds. Pages that get more
internal inbound links rank measurably better over 3-6 months.

**Effort**: ~3-4 hours. Mostly template + a small `similar_places()`
query.

---

## Ordering for execution

If the goal is "max traffic in 90 days", the order is:

1. Country intros (item #3) — fast, every country page gets a depth
   bump immediately
2. City intros (item #1) — biggest leverage, takes a session to
   template right
3. FAQ schema on top cities (item #4) — once cities have intros,
   layer FAQ
4. Best-of category pages (item #2) — the long-tail mass
5. Internal linking pass (item #5) — wires the new pages into the
   existing graph

All five together represent maybe 25-35 hours of focused work. Done
in cadence, traffic should compound visibly by month 3 and meaningfully
by month 6.
