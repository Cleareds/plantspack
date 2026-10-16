# Label check - brief for one chunk

You check the vegan label of each place in your input chunk and write one verdict per row.

## Input
A JSON array. Each row: `id, name, city, country, website, vegan_level, category, queue`.
- `queue: "A"` = we label it `fully_vegan` but nobody has checked it.
- `queue: "B"` = the name says vegetarian ("veg", "vegetariano", "pure veg", ...) and we have no vegan evidence.

## What counts as evidence
The VEGAN claim is what matters, not that the business exists.
Strong: the venue's own website or own social page, its own menu, HappyCow listing text, a recent review that describes the menu.
Weak: directory pages that copy each other, AI summaries, our own PlantsPack page (never use it as evidence).
"Vegetarian" is NOT vegan. Eggs, dairy, paneer, ghee, honey on the menu mean the place is not fully vegan.

## Method
- If `website` is set: WebFetch it first (menu / about page). Then at most one WebSearch if still unclear.
- If no website: ONE WebSearch, e.g. `"<name>" <city> vegan`. A second search only if the first gives a strong lead.
- Hard cap: the lookup budget in your task. When you reach it, write the remaining rows with verdict `unchecked`.

## Verdicts (use exactly these words)
- `fully_vegan` - 100% vegan menu, stated by the venue or a strong source.
- `mostly_vegan` - almost all vegan, a few non-vegan items (e.g. dairy milk for coffee).
- `vegan_friendly` - real vegan section / several clearly marked vegan dishes, but also non-vegan food.
- `vegan_options` - one or two vegan items, or "vegan on request".
- `no_vegan` - evidence the place has no vegan food (e.g. vegetarian with dairy in every dish, or a meat place).
- `closed` - permanently closed (Google/HappyCow "permanently closed", own site says so, company dissolved).
- `not_found` - no trace of this business at this location.
- `wrong_site` - the stored website belongs to another business.
- `unclear` - the business exists, but the evidence does not show the vegan level.
- `unchecked` - you ran out of budget before this row.

## Confidence
- `high` - the venue's own site/menu/social, or two independent strong sources agree.
- `medium` - one strong source (e.g. a HappyCow listing text, a detailed recent review).
- `low` - anything weaker. Low confidence never changes data, so do not guess high.
`fully_vegan` for a B row and `no_vegan` / `closed` need `high` to act. Be strict.

## Output
Write a JSON array to the output path, one object per input row, same order:
```json
{"id":"<uuid>","name":"<name>","verdict":"<verdict>","confidence":"high|medium|low","evidence":"<source + short quote, max 200 chars>","website_found":"<url or null>"}
```
Every input row must appear exactly once. Copy `id` exactly - never shorten it.
Write the file with the Write tool. Do not touch the database or any other file.
Reply with ONE LINE only: `<chunk>: <n> rows, <x> fully_vegan, <y> demote-level, <z> closed/no_vegan, <u> unclear/not_found, <k> unchecked, <s> lookups`.
