# Canada audit, second pass (2026-10-30)

Continues reports/canada-audit-2026-10-30/. No rows deleted. No CLI write set
`admin_review` or `is_verified=true`. Every write has a rollback file in this folder
(`rollback-plan-*.json` = the row values before the change). Writes were made with
`scripts/_canada-audit-2026-10-30b.mjs <plan> --apply`. Images were added with
`scripts/_canada-audit-2026-10-30b-images.ts`, which rehosts the image and writes `image_sources`.
New places came from `scripts/add-place.ts --imported` (L2, `source=canada-discovery-2026-10-30`).
Agent research output: `evidence/`. WebSearch used: about 125 of the 150 budget.

## Result

| | Before (this morning) | After |
|---|---|---|
| Live Canada rows | 1,036 | 1,083 (+83 moved from `United States`, +22 new, -58 archived) |
| fully_vegan | 156 | 157 |
| fully_vegan with per-place evidence from this pass | 0 | 76 kept (L3 if open status is confirmed, else L2) |
| Rows with `canada-fv-l3-upgrade-2026-05-25` | 132 | 20 (19 have an open Research Review item, 1 temporarily closed) |

## 1. Bulk-L3 fully_vegan rows (`canada-fv-l3-upgrade-2026-05-25`)

113 rows checked (rows with a Research Review item were skipped). Also checked: 21 rows with the US variant
(`united-states-fv-l3-upgrade-2026-05-25`) that were Canadian rows under the wrong country (see 5).
`verification_method = canada-fv-verify-2026-10-30`. Evidence is in `admin_notes`.

- Kept fully_vegan: 76. Set to L3 when the own site confirms vegan status and the venue is open. Set to L2 when open status is weaker ("likely open").
- Downgraded: 15. Examples: Iconoglace (dairy soft serve) -> vegan_options; Shushu Haru (shares a dining room with non-vegan Shushuto) -> vegan_friendly; Vegan Fried Chick'un (dairy cheese) -> vegan_friendly; Buddha-Full Northwoods, The Juice Truck (honey) -> mostly_vegan; Royal Dosa Hut (ghee, paneer) -> vegan_options; Kirtida Kitchen ("100% vegetarian") -> vegan_friendly; Cafe Pyrus, La Vie La Vie -> mostly_vegan; Lazy Tulip Barrie (bacon, cheddar) -> vegan_options. Hindusthali, Tuba Cafe and Spirit of the Earth were lowered because the evidence was not clear.
- Archived with evidence of closure (`archived_reason` starts with `closed:`): The Hogtown Vegan (both rows, closed 27 Sep 2026), Resto Vego (both rows, closed July 2026), Vegan Shoku (closed 8 Oct 2026), Odd Burger Toronto x2 and Edmonton Ellerslie, Rise Above Pizza Hamilton, Hibiscus, Cafe Frida, Coven Hamilton (moved) and Kitchener, Veg Out London, Boardwalk Chocolates, Cafe Venosa, Backstairs, and others.
- Archived with no trace after 2023 (`archived_reason` starts with `no-trace-2025-2026:`): 12. These rows have a dead domain or no web presence. Examples: Mighty Vegan Supermarket, Vegan Bay B&B Tofino (no Wayback captures, possibly a fabricated import), Secret Supper, Soylent Green Bowen Island, Rawbyn's, V-Edge Elora. Restore a row from its rollback file if a person confirms that the venue is open.
- Strawberry Blonde Bakery Kanata: `business_status = temporarily_closed`, as the bakery's own site says.

## 2. Discovery (15 cities)

20 new places were added at L2. Each was checked against all countries by name and website domain:
Stefano's Diner, Honey's Ice Cream x2, Fresh Kitchen + Juice Bar (Front St), The Organic Press (Toronto); Hum, Veganarie (Montreal);
Keepin' it Vegan, Chickpeas (Ottawa); Democracy (Hamilton, mostly_vegan: dairy milk for coffee); Bramble Cafe (Halifax);
Cinnaholic Waterloo and London; Padmanadi Calgary and Edmonton Southside; Homey Food & Cafe, Canela Bridgeland,
Magpie (vegan_friendly: own site says only "all vegan friendly") (Calgary); Thyme Cafe and Books (Winnipeg); Be Love (Victoria).

8 existing rows were upgraded (`canada-discovery-upgrade-2026-10-30`, L2): Good Grains, The Hearty Hooligan,
Real Fake Meats, Viet Family, Hearts Choices Cafe Market, Seitans and Fern Cafe to fully_vegan. The Buckingham went to mostly_vegan.

Not added: Bar Avelo (same address as Avelo), Fat Choi (a pop-up inside the non-vegan Soos), Taqueria Vegana Bloor
(the row exists as vegan_friendly; a Research Review item asks for an upgrade). The agents also found leads that the
venues' own sites could not confirm. These are in `evidence/disc_*.json` and in the agents' notes below.

No new candidates were found in Quebec City, Saskatoon or Regina. The candidates that were found had all closed.

## 3. Copper Branch

The chain's own locator (eatcopperbranch.com/restaurants, footer 2026) lists 5 Canadian branches:
Bois Franc, Complexe Desjardins and Stanley (Montreal), Mavis (Mississauga) and Oshawa.
- The 3 Montreal rows were kept as fully_vegan and their address, phone and hours were filled from the branch pages.
- Mavis and Oshawa were added.
- 15 rows were archived because the branch is not on the locator. Mont-Royal closed on 31 Mar 2026 (Noovo Moi). Also archived: Rene-Levesque, Atwater, Ottawa Albert St, Sainte-Therese, Candiac, Laval x2, Waterloo, Clarington, Vaughan, East Gwillimbury, London, Town of Mont-Royal and Pointe-Claire.
- Oakville appears only on a 2024 French page and is not on the current list, so it was not added.

## 4. Enrichment of fully_vegan rows

Hours were filled on 58 rows, websites on 38 rows and addresses on 80 rows (21 rows were moved to the
address on the venue's own site and re-geocoded). 7 images were added from the venues' own sites
(each recorded in `image_sources`). Hours were left empty when the venue's site did not show them or
contradicted itself. Hours were never guessed. Still missing on live fully_vegan rows: website 15, hours 51,
image 21. Most of these are brands or online shops without opening hours, or rows with an open Research Review item.

## 5. Found during the pass: Canadian rows under `country='United States'`

A reverse geocode of every `United States` row north of the border line found 206 rows that are in Canada
(83 live). The 83 live rows now have `country='Canada'`, and the false "United States" text was removed
from 26 addresses and 54 descriptions. The archived rows were not changed. After the move:
- 4 duplicates were archived (alk, swagruhas-dosa-home, fluide-mont-tremblant, nuba).
- 2 chain-policy rows were archived (Freshslice Pizza, A&W St. Catharines).
- 7 Copper Branch rows were archived (see 3).
- 8 Odd Burger rows: the chain site returns HTTP 402 and branches are closing. These rows were set to L1 and a Research Review item was opened for each.

Other countries probably have the same problem, because the geocoder adds ", United States" at the
same step. This was not checked.

## 6. Research Review items opened (21, `source = canada-audit-2026-10-30b`)

- Open status (14): Odd Burger x9 (including Ottawa), Caked Coffee, Swirl, Tula, The Clever Rabbit, Springhouse Market.
- Vegan level (3): Hindusthali, Spirit of the Earth, Taqueria Vegana Bloor (upgrade?).
- Address (3): nooch. (888 Erie St E did not geocode), New Moon Kitchen (placeholder address), The Juice Truck (no address).
- Duplicate (1): Hearts Choices Calgary.

## Agent notes not acted on

- planta-queen-toronto: Planta's site links a VegNews story "Why Planta Left Canada Behind", but both Toronto venues are still listed on the site. Not changed.
- Possible missing branches: Lettuce Love Hamilton, Vegan Danish Bakery Newmarket, To Live For kiosk (opens Nov 2026), Cinnaholic Edmonton x2, Calgary and Winnipeg (the own site was not confirmed).
- Kirtida Kitchen has a second address (265 Eramosa Rd). This may be a duplicate row.
