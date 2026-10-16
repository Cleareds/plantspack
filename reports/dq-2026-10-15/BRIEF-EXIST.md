# Existence check - brief for one chunk

You check whether each place in your input chunk is a REAL business/organisation that exists NOW at the stored city, and (for food places) its vegan level.
These rows came from bulk imports. Queue `S`: stub (no website, address is only "City, Country"). Queue `D`: the stored website's domain no longer exists in DNS. Queue `O`: OpenStreetMap now marks the place as closed (disused/was: tags) or the OSM object was deleted; OSM alone is not proof, find out if it is really closed. Some imports invented venues. Be strict.

## Input
A JSON array. Each row: `id, name, city, country, website, vegan_level, category, queue`.
`category` = eat / store / organisation (animal sanctuary, charity, ...) / other. Organisations have no vegan level.

## Method
- Queue D: the website is dead. Do NOT fetch it. ONE WebSearch: `"<name>" <city>`. Look for a new website, social page, Google/HappyCow/Yelp listing, news of closure.
- Queue O: if `website` is set, WebFetch it first (a dead or parked site is a closure sign, not proof). Then ONE WebSearch `"<name>" <city>` if still unclear.
- Queue S: ONE WebSearch: `"<name>" <city>` (add "vegan" for eat/store). A second search only for a strong lead.
- If you find the venue's own site or social page, you may WebFetch it once for the address / menu.
- Hard cap: the lookup budget in your task. When you reach it, write the remaining rows as `unchecked`.

## What counts as evidence
Strong: the venue's own website or social page with recent activity, an official registry (charity register, company register), a HappyCow/Google listing that shows it open or "permanently closed", a recent news article.
Weak: directory pages that copy each other, AI summaries, our own PlantsPack page (never use it).
Vegetarian is NOT vegan.

## Verdicts (use exactly these words)
- `exists` - real and active at this city (use for organisations, and for eat/store when the vegan level is unclear).
- `fully_vegan` / `mostly_vegan` / `vegan_friendly` / `vegan_options` - eat/store only: exists AND the evidence shows this vegan level.
- `no_vegan` - eat/store with evidence of no vegan food.
- `closed` - permanently closed / dissolved.
- `not_found` - no trace of a business/organisation with this name in this city.
- `moved` - exists, but in another city (put the city in evidence).
- `unclear` - something with this name exists, but you cannot tell if it is this place or if it is active.
- `unchecked` - out of budget.

## Confidence
- `high` - own site/social or an official registry, or two independent strong sources agree. For `not_found`: high only if the search returned nothing plausible at all for the name in that city.
- `medium` - one strong source.
- `low` - anything weaker.

## Output
Write a JSON array to the output path, one object per input row, same order:
```json
{"id":"<uuid>","name":"<name>","verdict":"<verdict>","confidence":"high|medium|low","evidence":"<source + short quote, max 200 chars>","website_found":"<url or null>","address_found":"<street address or null>"}
```
Every input row must appear exactly once. Copy `id` exactly. Write the file with the Write tool. Do not touch the database or any other file.
Reply with ONE LINE only: `<chunk>: <n> rows, <e> exists/level, <c> closed, <nf> not_found, <u> unclear/moved, <k> unchecked, <s> lookups`.
