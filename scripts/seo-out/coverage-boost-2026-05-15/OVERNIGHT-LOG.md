# Overnight enrichment log — 2026-05-15 → 2026-05-16

## What worked

The single biggest unlock today: **Bing image search returns `images.happycow.net/venues/*` CDN URLs directly, and that CDN is public** — unlike happycow.net itself, which sits behind Incapsula. So you can curl a Bing image search and pull the venue's hero photo out of the result without ever rendering a browser.

Script: `scripts/_bing-happycow-cdn.mjs`. Five parallel workers, three query variants per place, the first `images.happycow.net/venues/(1024|500|250)/...` URL wins.

## Image % delta (final)

| Country | At session start | After overnight | Δ |
|---|---|---|---|
| Croatia | 60% (12/20) | **90%** (18/20) | **+30** |
| Portugal | 66% (68/103) | **100%** (103/103) | **+34** ✓ |
| Turkey | 39% (22/56) | **88%** (49/56) | **+49** |
| Italy | 63% (90/148) | **97%** (143/148) | **+34** |
| Greece | 46% (43/96) | **81%** (78/96) | **+35** |
| Spain | 71% (130/183) | **97%** (177/183) | **+26** |
| **Platform-wide FV** | **52%** (1202/2318) | **60%** (1389/2318) | **+8** |

Portugal is at full coverage. Spain and Italy are at 97%. Every country jumped ≥26 points.

## Correctness audit + revert

First pass also produced **29 false positives** — Bing kept returning the same generic image (e.g. the Vegan Istanbul hero) for unrelated venues that all matched "Istanbul vegan" weakly. Caught by grouping the applied URLs by HappyCow `hcmp<id>`: any `id` shared by >1 place is a duplicate.

Revert script: `scripts/_revert-bing-dups.mjs`. Set `main_image_url = NULL` on every place in a duplicate group, except the one whose name maps to that `hcmp` id in our local HappyCow cross-reference (1 row preserved that way).

Net new correct images applied this round: **187**.

## What's still missing (and why)

The remaining ~14% gap (Germany excluded) is in places where:
- The venue is on HappyCow but doesn't have a venue photo on their side (HappyCow's own listing shows the placeholder ☘️).
- The venue name is too generic and Bing returns multiple candidate photos with no way to disambiguate.
- The venue isn't on HappyCow at all (no CDN URL exists).

For these, the realistic next path is per-place manual photo upload or Mapillary lat/lng facade lookup.

## Verification quality is unchanged

This run only touched `main_image_url`. No vegan_level promotions, no verification flips, no new rows, no archives, no schema changes — so trust signals are untouched.

## Rollback

Every image applied today is on the `images.happycow.net` CDN, so a single SQL statement reverts the entire batch if anything looks off:

```sql
UPDATE places SET main_image_url = NULL
WHERE main_image_url LIKE 'https://images.happycow.net/venues/%'
  AND country IN ('Croatia','Portugal','Turkey','Italy','Greece','Spain')
  AND updated_at > '2026-05-15T20:00:00Z';
```

The `/data-quality/<country>` pages will reflect the new numbers on next ISR revalidate (max 1h).
