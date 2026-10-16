# Product direction 2026-10-16: parity, social, homepage

Research only. Nothing in this document is built. Every number was read from the database, PostHog, GSC or Lighthouse on 2026-10-16. Counts "30 d" / "90 d" are rows created in the last 30 / 90 days.

## 1. The numbers that decide

| Signal | Value | Source |
|---|---|---|
| Live places | 52,299 (5,875 fully vegan, 115 of them admin-verified) | places |
| Places with a review | 141 | places.review_count > 0 |
| Places with a photo | 24,378 (47%) | places.main_image_url |
| Users | 400 (43 new in 30 d, 186 in 90 d) | users |
| Paying supporters | 4 | users.subscription_tier medium/premium, active |
| Web organic clicks | ~1,750 / week; dish pages 1,822, place pages 960, city hubs 271, events 106, recipes 50, tools 11, homepage 3 (14 d, 28 Sep - 11 Oct) | GSC, scripts/_gsc-daily-2026-10-15.mjs |
| Mobile weekly active users | 33-46 / week in October (iOS 23-32, Android 10-16) | PostHog app_open |
| Mobile users ever seen | 310; 191 viewed a place, 71 opened a tool, 34 opened directions, 16 saved a place, 15 suggested a place | PostHog activation |
| Mobile return rate (active on 2+ days) | all 55%; directions_opened 88%; map search 78%; tool 73%; saved 75% | PostHog |
| Mobile OTA reach | last 14 d: 79 users on 1.0.6, 5 on 1.0.7 | PostHog app_version |
| Reviews | 151 total; 54 in 90 d; 6 in 30 d; 67 have photos | place_reviews |
| Saved places | 90 total; 13 in 30 d | favorite_places |
| Followed cities | 68 total; 8 in 30 d | user_followed_cities |
| User follows | 102 total; 0 in 30 d | follows |
| Human posts (not recipe, article, event or auto "Just added") | 72 total; 3 in 90 d; 1 in 30 d | posts |
| Auto "Just added a new vegan spot" posts | 134 total; 55 in 90 d | posts |
| Comments | 30 total; 0 in 30 d. Post likes 6 total | comments, post_likes |
| Packs (lists) | 9 total; 0 new in 90 d; 0 pack follows | packs |
| Private place notes | 0 ever (web MyPlaceNote.tsx + mobile placeNotes.ts) | user_place_notes |
| Roadmap votes | 3 ever. Forest trees: 1 ever. Event RSVPs: 1 ever | roadmap_votes, user_forest_trees, event_responses |
| Place submissions (mobile "suggest a place") | 120 total; 4 in 30 d; 118 approved | place_submissions |
| Human place reports | 700 total; 21 in 30 d; 156 pending | place_reports |
| Push tokens | 29 | user_push_tokens |
| Onboarding profile fields (is_vegan, home_city) | 0 of 400 users have a value | users |

Reading: PlantsPack is a directory with tools. People use the map, directions, scanners and place pages. The social network layer (posts, comments, likes, follows, packs) has no activity. Reviews, saved places and followed cities have a small but real pulse.

## 2. Feature inventory: web vs mobile

| Feature | Web | Mobile | State / evidence |
|---|---|---|---|
| Map with nearby places | yes `/map` | yes, first tab `app/(tabs)/index.tsx` | shipped, core |
| Search | yes `/search` | yes `app/(tabs)/search.tsx` | shipped |
| Country / city browse | yes `/vegan-places/...` | yes `app/browse/country.tsx`, `city.tsx` | shipped |
| Dish pages ("best vegan pizza in Berlin") | yes `/vegan-places/[country]/[city]/best-vegan/[dish]` | no | web only; largest traffic cohort |
| City ranks / vegan score | yes `/city-ranks`, `/vegan-score` | no (city_scores not read in mobileapp) | web only |
| Place page | yes `/place/[id]` | yes `app/place/[slug].tsx` | shipped |
| Reviews with photos | yes | yes `src/components/places/PlaceReviews.tsx` | shipped both; 6 / 30 d |
| Save a place | yes | yes `app/saved.tsx` | shipped both |
| Follow a city | yes `FollowCityButton` | yes `app/follow-city.tsx` | shipped both |
| Follow a user | yes `/profile/.../followers` | no | 0 in 30 d |
| Suggest a place | yes `/map?add=true` | yes `app/suggest-place.tsx` | shipped both |
| Suggest a correction / edit | yes | yes `app/edit-place.tsx` | shipped both |
| Report a place | yes | yes `src/lib/placeReports.ts` | shipped both |
| Private place notes | yes `MyPlaceNote.tsx` | yes `placeNotes.ts` | dead: 0 rows ever |
| Posts, feed, comments, likes | yes `/feed`, `/post/[id]` | no (`src/components/feed/PostCard.tsx` exists, no feed screen) | web only; 1 human post / 30 d |
| Packs (place lists) | yes `/packs` | no | 9 packs, dormant |
| Events | yes `/events` (posts, category=event: 203, 69 in 90 d) | no | web only; 106 clicks / 14 d |
| Recipes | yes `/recipes` (581 recipe posts) | no | web only; 50 clicks / 14 d |
| Articles / library | yes `/vegan/[topic]`, `/library`, `/blog` | yes Learn tab, 20 bundled articles | both, different content sets |
| Barcode scanner | yes | yes | both; most used mobile tool (137 opens, 37 users) |
| Ingredient scanner | yes | yes | both |
| Menu scanner | yes | yes | both |
| Substitutes, cards, drinks | yes | yes | both |
| E-codes | `/glossary` + `/vegan/e-codes` article | yes `app/tools/ecodes.tsx` | mobile has a tool, web has text |
| Impact calculator + share image | yes `/tools/calculator` (no share image) | yes `app/tools/impact.tsx` with share card | web misses the share card (web todo 6) |
| Baking calculator | yes `/tools/baking` | no | pure JS, cheap to port |
| Scan history | yes `/tools/history` (tool_scans) | local barcode history only | not synced |
| Notifications | yes `/profile/.../notifications` | yes tab + push | both |
| Profile edit, contributions | yes | yes | both |
| Onboarding (vegan since, reasons) | no | yes `app/onboarding.tsx` | 0 users have the fields set: verify it writes |
| Supporters / subscription | yes `/support` | no (iOS: no IAP) | web only by decision |
| Sprouts, forest, roadmap votes, claims | yes | no | admin-gated or near zero use |

## 3. Parity plan

Order by evidence, not by symmetry. Web and mobile do not need the same feature list. They need the same data and the same trust.

**P0. Get OTA reach back before any mobile parity work.** 79 of 84 active users in the last 14 days run 1.0.6. OTA updates from the main tree now target runtime 1.0.7, so they reach 5 users. The App update prompt (`app_release_config`, admin page `/admin/notifications`) must say latest = 1.0.7 on both platforms, and the push about 1.0.7 should go out. Check `app_version` in PostHog two weeks later. Until then, any mobile OTA work is invisible.

**P1. Mobile gets the web features that carry traffic and return visits (all OTA-able, JS only):**
1. City ranks screen (read `city_scores`, same ranking as `/city-ranks`). 1 day. Reason: ranks are the one web surface with a reason to come back monthly.
2. Events list for the user's followed cities (read posts category=event). 1 day. 69 events in 90 d exist already; mobile shows none.
3. Baking calculator (copy the pure function into `src/shared`, same as allergens). Half a day.
4. Scan history sync: write mobile scans to `tool_scans` (mobile writes directly to Supabase) so `/tools/history` shows them. Half a day.
Not worth porting now: recipes (50 clicks / 14 d on web, zero evidence of mobile demand), packs, posts.

**P1. Web gets the mobile pieces that are better:**
1. E-codes as a tool at `/tools/e-codes` using the mobile data file, linked from `/glossary`. Half a day.
2. Impact share image (already web todo 6). 1 day.
3. Directions buttons on place pages that open the user's map app (mobile 1.0.7 has Organic Maps / OsmAnd). Web has Google / Apple / OSM links in the city list; make the place page match. 2 hours.

**Keep platform-specific:** push notifications and camera flows stay mobile. Supporters, claims, admin, dish pages (SEO) stay web. Posts, packs, comments, forest, roadmap voting: do not port; see section 4.

**Mechanics:** keep one source of truth for tool logic in `src/shared` and copy to `mobileapp/src/shared` (the allergens pattern). Mobile reads and writes Supabase directly, so anything that needs server logic belongs in a Postgres trigger, not a Next route handler. Mobile React Query caches 24 h: data fixes show late on mobile; keep that in mind when you judge a change.

## 4. Social features

What exists and what people do with it: section 1. The honest conclusion: PlantsPack has one social unit that works, the review. Everything else is a network with no network. The posts feed on the homepage shows auto-generated "Just added a new vegan spot: Edison nj" lines and a review by an account named "test". An empty social layer makes the site look abandoned to a first visitor and costs trust.

### Remove or hide first (2-4 hours, no data loss)
- Homepage: drop the "Community" block (auto posts, test account) and the "Featured vegan places" block (12 places with rating 5.0, half of them in Belgium: it looks arbitrary). Replace with reviews that have photos and text (section 5).
- Top nav "Community" menu: remove Feed and Packs. Keep `/feed` reachable from the profile and the footer. Do not delete posts or packs (data policy).
- Hide: private place notes (0 ever), post comments and likes UI on the feed, roadmap voting, forest. Keep the routes, remove the entry points.
- Mobile: nothing to hide; it never had the social layer. Keep it that way.

### Ideas, ordered by value / effort

1. **Review in three taps after a visit** (both; mobile first). Trigger: on mobile 24 h after `directions_opened` (34 users, 88% return) or `place_saved`; on web after a place page visit on a return session. Ask: rating, one photo, "what did you eat" as dish chips (pizza, ramen, burger, ...). Dish chips feed the dish pages, the strongest SEO cohort (1,822 clicks / 14 d), and later `place_menu_items`. Effort: 1.5 days mobile (OTA), 1 day web. Risk: nag; cap at one prompt per place and one per week. Measure: reviews per 30 d (now 6), share with a photo (now 44%).

2. **"Since your last visit" for followed cities** (both). The 68 city follows are the only follow type people still use (8 in 30 d). Show on the mobile home and the web "My Cities" block: "Berlin: 3 new places, 2 reviews, 1 event this month", from `places.created_at`, `place_reviews`, event posts. One optional push per month for the 29 tokens, no email. Effort: 1 day web (one query per followed city, cached), 1 day mobile. Measure: return rate of users with a followed city vs without.

3. **Add a photo** (both). 28,000 live places have no image. A camera button on the place page ("Add the first photo") writes to `place_reviews.images` without a rating, or to a new `place_photos` table with user_id. Moderation: OpenAI Moderation on upload (exists for reviews) plus a size cap; the admin can hide a photo from the data-quality page. Effort: 1 day mobile, 1 day web, half a day admin. Risk: low-quality photos; keep the uploader's name on the photo. Measure: photos per 30 d, places with a photo (now 47%).

4. **Contributors on city hubs** (web, read-only on mobile). "People who keep Berlin up to date" with the top three reviewers and submitters of that city, linked to their public profile. Only when the city has at least three contributors, so the block never looks empty. Recognition without points (Sprouts stay admin-only until deals ship). Effort: half a day. Measure: reviews by returning users.

5. **One place, one question** (both). On a place page: "Is it still open?", "Still fully vegan?" as two buttons that write a `place_reports` row with a type and the user id. This is the cheapest verification signal we can get and it feeds the existing report queue (21 human reports / 30 d today). Effort: half a day each platform. Risk: more queue work for the admin; the queue tooling exists. Measure: reports per 30 d, places confirmed in the last 90 d.

6. **Events: "I'm going" is dead (1 RSVP ever). Replace with "Add to calendar" and share.** Effort: 2 hours web. Measure: event page clicks (106 / 14 d).

7. **Review replies by owners** (web). 17 place owners exist; `place_review_replies` has 7 rows. Show "Owner replied" on the review and notify the reviewer in-app. Effort: half a day. Keep for later: owners are few.

Not proposed: a public post feed on mobile, points, follower counts, DMs, group chats, anything that needs daily moderation.

## 5. Homepage

Measured 2026-10-16: 169 KB HTML, 3,868 characters of visible text, Lighthouse mobile performance 75, FCP 1.1 s, LCP 7.7 s. The LCP element is the hero city image: 43% load delay and 47% load time in the lab, although the server HTML preloads it (`src/components/ui/SmartImg.tsx`, `priority`). The hero box is 128 px tall on mobile but the preloaded srcset is desktop-sized, and `HomeClient.tsx` line 257 swaps the image client-side after the location lookup, so the browser can load two hero images.

What a new visitor sees in the first screen: h1 "Find vegan and vegan-friendly places", sub-line, search box, "Explore the map". That is correct. Below it the page carries claims that are not true for all rows: "✓ No chains" (the chain policy keeps vegan chains and supermarkets) and "✓ Community-verified" (115 of 5,875 fully vegan places have a human verification). The honesty rule in claude.md says these must go.

What drives traffic is not on the homepage: dish pages are 55% of organic clicks and the homepage has no link to any dish page. The homepage itself gets 3 clicks per 14 days, so its job is not SEO; its job is to turn a visitor who arrived on a place or dish page into a returning user (search their city, install the app, save a place).

### Proposed structure (mobile first, server-rendered, one client island for search + location)
1. **Hero**: h1, one honest line ("52,000+ vegan and vegan-friendly places in 181 countries. Free, no ads, no paid listings."), search box, "Use my location". No stats row with ticks.
2. **Near you** (only when a location is known): 4 places + 1 sanctuary + 1 stay, as now, but with a "Been here? Rate it" link on each card.
3. **Best vegan dishes near you / in your city**: 8 dish chips to `/vegan-places/<country>/<city>/best-vegan/<dish>`. New. Uses `getCityDishChips` which the hubs already have.
4. **Free vegan tools**: keep the three-tool strip; barcode first (most used on mobile).
5. **Recent reviews**: 6 latest reviews with text and a photo, real accounts only (exclude usernames like "test" and the admin import account), each linking to the place. Replaces the Community block.
6. **Top vegan cities**: keep (8 cities with grade), it links to the ranks.
7. **Get the app + support**: one block, two store badges, one sentence on the 4 supporters' cost transparency, no charity claim in present tense.
8. Footer as now.
Remove: Community feed block, Featured places block, the summer banner logic (already off-season), the ticks row.

### Quick wins (each under 1 hour)
- Delete "No chains" and "Community-verified" from `HomeClient.tsx` line 378.
- Filter the homepage review and post queries: no auto "Just added" posts, no accounts named test, minimum 40 characters of text.
- Hero image: `sizes="100vw"` with a 640 px cap on mobile, and no client-side swap on first paint (render the geolocated image only on the next visit from the cookie).
- Add the dish chips block (data function exists).
- Set `prefetch={false}` on the `/city-ranks` link (84 KB RSC fetch on every homepage load).

### Bigger changes
- Split `HomeClient.tsx` (1,063 lines, client component) into server sections plus one client island. Expected: LCP from 7.7 s to about 2 s in the lab, less JS on the hottest page. 1-2 days.
- A signed-in homepage that is the "since your last visit" view from section 4, idea 2. 1 day after that feature exists.

## 6. Top 10 across all areas

| # | Action | Who | Effort | Expected effect |
|---|---|---|---|---|
| 1 | Set app_release_config latest 1.0.7 (both platforms) and send the 1.0.7 push | user (admin page) | 10 min | OTA reach from 5 to ~80 users |
| 2 | Homepage quick wins: remove the two false ticks, filter test/auto content, dish chips, hero sizes, no city-ranks prefetch | me | 2 h | honest first screen, LCP down, dish pages linked |
| 3 | Hide the dormant social surfaces (Community block, Feed/Packs in nav, notes, likes, roadmap votes, forest) | me | 3 h | site stops looking empty; no data deleted |
| 4 | Review in three taps with dish chips (mobile OTA + web) | me | 2.5 d | reviews / 30 d from 6 upward; dish data for SEO |
| 5 | "Since your last visit" for followed cities (web My Cities + mobile home) | me | 2 d | a reason to return; measurable on 68 followers |
| 6 | City ranks + events screens on mobile (OTA) | me | 2 d | mobile gets the two web surfaces with return value |
| 7 | "Still open? Still fully vegan?" two-button report on place pages | me | 1 d | cheap verification signal into the existing queue |
| 8 | Add a photo on place pages, with moderation + admin hide | me | 2.5 d | fewer of the 28,000 image-less places |
| 9 | Homepage rebuild: server sections + one client island | me | 1.5 d | LCP 7.7 s to ~2 s on the hottest entry page |
| 10 | Verify mobile onboarding writes `users.is_vegan` / `home_city` (0 of 400 set); fix or remove the screen | me | 2 h | either data we can use, or one less dead screen |

Only the user can do #1, reply to supporters, and decide what to hide in #3.

## 7. Open questions for the user

1. May I remove the Community and Featured blocks from the homepage and Feed / Packs from the top navigation? Nothing is deleted; the pages stay reachable.
2. Review prompt: one prompt per place and at most one per week. OK, or stricter?
3. Photos from users: do you want to approve each photo before it shows, or hide after the fact from the data-quality page?
4. Mobile onboarding: keep the vegan-profile questions (0 users have answers) or drop the screen?
5. Events on mobile: only for followed cities, or a full list?
