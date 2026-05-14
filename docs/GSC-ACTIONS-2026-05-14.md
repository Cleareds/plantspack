# GSC action plan (2026-05-14)

Based on the Search Console export dropped into `GSC/` on 2026-05-14.

## Headline diagnosis

| Metric | Value | Interpretation |
|---|---|---|
| Pages indexed | 3,847 | Real, growing fast since 2026-04-11 |
| Pages NOT indexed | 98,399 | **96.3% of submitted URLs** |
| "Discovered – not indexed" | 95,099 | 🔥 Google found them, hasn't crawled |
| "Crawled – not indexed" | 142 | Google rejected as thin |
| Duplicates without canonical | 46 | Fix-able |
| 404s | 132 | Archived URLs |
| Daily impressions | 567–835 | Real signal — climbing |

**This is a crawl-budget problem, not a content problem.** Google has
discovered the URLs and is choosing not to crawl most of them yet. The
remedy is to raise authority signals + reduce URL bloat, not to add
more pages.

## Action plan, ordered by leverage

### 1. Slim the sitemap to high-quality URLs only

**Why**: a 100K-URL sitemap signals to Google "these are all equally
important". Google's response is to crawl a small fraction at a time.
A 10K-URL sitemap of *only the pages worth indexing* signals "these
matter" — crawl rate per URL goes up.

**What to drop from the sitemap** (NOT from the site — these stay
crawlable, just not in the sitemap):
- Place pages with <2 review_count AND no description AND no
  main_image_url (essentially OSM-import-only stubs)
- City pages with <5 places
- Country pages with <50 places
- Profile pages
- Tag/filter combinations (e.g. `?level=fully-vegan` already
  rewrites to a canonical URL; double-check sitemap doesn't
  duplicate)

**What to keep in the sitemap**:
- All places with a description OR a Supabase-hosted image OR ≥1 review
- All cities with ≥5 places
- All countries with ≥50 places
- All blog posts
- All recipes
- The homepage + summer hub + roadmap + support + key static pages

**Expected outcome**: sitemap from ~100K → ~20K URLs. Within 4–6
weeks, Google should crawl-rate the remaining 20K much faster.

**Effort**: 2–3 hours.

---

### 2. Identify and fix the 142 "Crawled – not indexed" pages

**Why**: these are pages Google actively rejected. Diagnosing why
unlocks a pattern that may apply to others.

**How to action**:
- In GSC → Pages → "Crawled – currently not indexed" → click into
  the list → see the 142 URLs
- Spot-check 10: are they thin? duplicate? slow? bad title?
- Most likely diagnosis (given the platform): they're place pages
  that have no description, no image, no reviews — Google judges
  them as low value
- Fix: bulk-archive any place row matching `description IS NULL AND
  review_count = 0 AND main_image_url IS NULL` from cities outside
  the top-100 priority. Either archive (set `archived_at`) or
  improve (run the AI description generator over them).

**Effort**: 1 hour audit + a half-day to ship a backfill script.

---

### 3. Resolve the 46 "Duplicate without canonical"

**Why**: these are pages where Google found two URLs with the same
content but didn't get a canonical hint. Most likely sources:
- Trailing-slash vs non-trailing
- Pagination (`?page=2`) without `rel=canonical`
- Country / city URL aliases (some places have moved as cities got
  renamed)

**How to action**:
- GSC → Pages → "Duplicate without user-selected canonical" → list
  the 46 URLs
- For each, ensure `<link rel="canonical">` is set in the page
  metadata
- For city/country aliases, ensure 301 redirect to canonical URL
  (we already do this for some — `COUNTRY_REDIRECTS` map exists)

**Effort**: 2–3 hours.

---

### 4. 301 the 132 404s

**Why**: 132 4xxs is small but each one is a wasted crawl. If they're
archived place pages, redirect them to the city they were in. If
they're typos in old marketing, redirect to closest canonical.

**How to action**:
- GSC → Pages → "Not found (404)" → export the URL list
- For each:
  - If `/place/[old-slug]` → check if a successor place exists, 301
    to it; otherwise 301 to the city page
  - If `/vegan-places/[bad-country]/[city]` → 301 to canonical via
    the COUNTRY_REDIRECTS map
- Add the redirect rules to `next.config.ts` or `proxy.ts`

**Effort**: 2–4 hours, depending on how many of the 132 cluster
into patterns.

---

### 5. Improve internal link density on the top-100 cities

**Why**: more internal links pointing at a page = higher crawl
priority. The city pages with `>=100` places should be linked from:
- The country page (already done)
- The homepage top-cities grid (already done)
- The summer hub (already done, but only 29 cities)
- **NEW**: every place page links back to its city (we do), and
  links to 2-3 sibling cities in the same country (this we DON'T do)

**How to action**:
- Add a "Nearby vegan cities" block to each place page footer
- Compute: top 3 cities by place count within the same country,
  excluding the current city
- Internal-link those

**Effort**: 1–2 hours.

---

### 6. Boost authority signals (this is the slow burn)

**Why**: at the bottom of all the technical fixes is the
authority problem. Google won't crawl deeply into a site it doesn't
trust enough yet. Authority comes from:
- Backlinks (the slowest to build, biggest impact)
- Page quality (improving by content depth)
- User signals (low traffic = low signals = doom loop)
- Time

**What we're already doing right**:
- Honest data (no inflated counts)
- Schema markup (ItemList, FAQ, LocalBusiness)
- Fast pages (post-perf-overhaul work)
- Internal linking growing

**What needs to happen**:
- Ship the blog drafts already in `docs/blog-drafts/`
- Get 2-3 backlinks from vegan creator sites/blogs
- Be patient — items #1-5 above should show measurable improvement
  in 4-8 weeks

---

## Suggested sequencing

**Week 1**:
- Day 1-2: Item #1 (sitemap slim). Highest leverage, no risk.
- Day 3-4: Item #2 (Crawled-not-indexed audit + archival pass).

**Week 2**:
- Day 1: Item #3 (canonical fixes).
- Day 2: Item #4 (404 redirects).
- Day 3-5: Item #5 (nearby-cities block on place pages).

**Week 3-12**:
- Item #6 (authority building). Ship one blog draft per week.

---

## Metric to track

The single best signal we'll have a 4-week reading on is:

**Indexed / Discovered ratio.** Today it's 3,847 / 98,399 ≈ **3.9%**.

After items #1-5, target is **15-25%** within 8 weeks. That would
mean ~15K-25K indexed pages — enough to start moving the impressions
counter materially upward (from 600-800/day toward 2K-5K/day).

Re-export GSC stats every 2 weeks; track this ratio in this doc.
