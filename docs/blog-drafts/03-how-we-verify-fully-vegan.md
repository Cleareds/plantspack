---
status: draft
target_publish: 2026-06
slug: how-we-verify-fully-vegan-places
target_queries:
  - what does fully vegan mean
  - how do you verify vegan restaurants
  - 100% vegan restaurant definition
  - is HappyCow accurate
  - trust vegan directories
title_tag: What "fully vegan" actually means — and how we verify it
meta_description: Most vegan directories let restaurants self-label as fully vegan. Here's why that's wrong, what 100% vegan actually means, and the process we use to check.
suggested_h1: What "fully vegan" actually means — and how we verify it
estimated_words: 1200-1500
internal_links:
  - /support
  - /vegan-places
  - /roadmap
---

# What "fully vegan" actually means — and how we verify it

Most vegan directories are not honest about what their "fully vegan"
tag means. Some let restaurants self-label. Some inherit tags from
upstream data sources (OpenStreetMap, Foursquare, Google Places) and
never re-check. Some use a vague "vegan-friendly" badge that covers
everything from a single salad on the menu to a fully plant-based
kitchen.

We've spent over a year cleaning this up on PlantsPack. Here's why
it matters and what the actual verification process looks like.

## The two failure modes

**Failure mode #1: trusting the source data.**

Most of our places start their life as imports from OpenStreetMap or
similar. OSM contributors are well-intentioned but inconsistent —
the `diet:vegan=only` tag is sometimes applied to places that have
one vegan menu and ten meat dishes. Inheriting that tag without
checking lands you with "fully vegan" labels on places that aren't.

**Failure mode #2: trusting the restaurant.**

A restaurant has every incentive to claim "fully vegan" because it
attracts a more loyal customer. Vegans repeat-visit, post about it,
review it. The downside of mis-labelling is small (a complaint email)
compared to the upside of being on the "100% vegan" list. So
self-labelling, even from honest restaurants, is biased upward.

## What "fully vegan" should mean

There's one workable definition:

> Every item on the menu — including specials, drinks, desserts,
> condiments, and breads — is vegan. No exceptions. The kitchen does
> not handle animal products at all.

That last clause matters. A restaurant with a 100% vegan menu but a
kitchen that also handles a non-vegan catering business is different
from a kitchen that has never touched animal protein. Strict-vegan
travellers care about cross-contamination; casual plant-based eaters
mostly don't. We mark both as "fully vegan" today, but the long
roadmap includes splitting "fully vegan kitchen" vs. "fully vegan
menu" as separate tags.

## The verification process

Every place tagged `fully_vegan` on PlantsPack with the
`is_verified = true` flag has gone through this check:

1. **Source check.** What does the venue's own website / menu page
   say? Is "vegan", "vegano", "vegetalisch", or the local-language
   equivalent visible on the page?
2. **Menu PDF or full menu page.** We look at the most recent menu
   we can find. If desserts or drinks are missing from the public
   menu, we flag the place "needs verification" and don't tag
   `is_verified` until we resolve.
3. **Recent reviews.** Any review in the last 90 days mentioning
   meat, dairy, or honey items? If so, it's a soft veto.
4. **Cuisine-specific knowledge.** Some cuisines have hidden animal
   ingredients (kimchi often has fish sauce, certain wines use
   isinglass, some breads use eggs). A "vegan" tag on a place that
   serves these without explicit substitution gets a closer look.
5. **AI-assisted web search.** We use search to surface menu items
   the venue might not have on their site (third-party review
   mentions, social media). Helpful for places without a website.

If the place passes all five, it gets `is_verified = true`. Otherwise
it stays at `verification_level = 2` (machine-confidence) and we
revisit later.

## Why our "fully vegan" numbers are smaller than other directories

A consequence of this process: PlantsPack's verified fully-vegan
counts are visibly smaller than what you'll see on HappyCow or
Google Maps for the same city. That's deliberate.

If we listed 200 fully-vegan places in Berlin and only 30 of them
had actually been checked, the "fully vegan" tag would mean nothing
to a strict-vegan traveller. So we don't. We'd rather under-promise
and be trusted than over-claim and get caught.

## What you can do

- Click "report update" on any place page where the tag is wrong.
  Corrections flow into a daily review queue.
- If you're a venue owner, the same form has a section for owner
  claims — you can self-report your menu changes and we'll fold
  them in.
- If you find a fully-vegan place we haven't listed yet,
  [add it](/add-place) — we audit submissions within 7 days.

---

PlantsPack is funded by supporters, not paid listings. We don't take
money to list a place, change its rating, or move it up search
results. That's structural — the "no paid listings, ever" rule is
what lets the verification process stay honest. [Become a supporter
for €3/month →](/support)
