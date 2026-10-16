# Web sign-up proposal (2026-10-16)

Goal: give a web visitor a reason to sign up, on the page where they arrive.
Target: 100 web sign-ups a month by Q1 2027 (1% of about 10,000 monthly visits).
Today: about 55 sign-ups a month, almost all from the app stores. 401 users.

## Verified state of the web (2026-10-16)

| Fact | Evidence |
|---|---|
| Visitors land on dish pages (55% of organic clicks), place pages (~30%), city hubs (~8%). The homepage gets 3 clicks per 14 days. | GSC, `scripts/_gsc-daily-2026-10-15.mjs` |
| Save a place exists on the web, but only on the place page, and the button is **invisible to guests** (`FavoriteButton.tsx` returns null without a user). Hub lists and dish pages have no save action. | `src/components/social/FavoriteButton.tsx` line 102; grep of CityPlacesList and dish-page |
| Follow a city exists on the hub, but a guest click **does nothing** (`FollowCityButton.tsx`: `if (!user) return`). No prompt, no redirect. | `src/components/places/FollowCityButton.tsx` line 22 |
| Sign-in is a separate page, /auth, with Google, Facebook and email + password (Turnstile). The callback honours `?next=`, but no button on the site passes it, so a visitor who signs in lands on the homepage and loses the place they were looking at. | `src/app/auth/callback/route.ts` line 86; grep for `next=` in LoginForm and auth page: none |
| Signed-in web users get: saved places on their profile, followed cities with score deltas on the homepage, reviews. | `src/app/profile/[username]/places`, `src/app/page.tsx` getFollowedCities |
| On mobile, saves are the second most used action (13 in 30 days) after reviews. | PostHog `place_saved` |

Conclusion: the web has the two features that make an account useful, and hides both from the people who would want them. Nothing on a dish, hub or place page asks a guest to sign up for a concrete benefit.

## Proposal

Four parts, in this order. Nothing new in the data model. No new perks, no newsletter.

### A. Sign-in sheet that comes back to the page, with the action completed
- A small modal (`AuthSheet`) opened from any save or follow click by a guest. Google, Facebook, email + password, same as /auth.
- Copy names the action: "Sign in to save Nordvegan" / "Sign in to follow Berlin".
- The pending action is stored in sessionStorage (`{type:'save', placeId}` or `{type:'follow', city, country}`) and `?next=<current path>` is passed to the callback. After sign-in the page reloads, the pending action runs, and the button shows the done state.
- One prompt per click. Never on page load, never on scroll.
- Effort: 1 day.

### B. Save on every card
- Heart button on hub list cards, dish page cards and the place page, visible to guests. Guest click opens the sheet (A). Signed-in click saves at once.
- Effort: 0.5 day. Depends on A.

### C. Follow a city from hubs and dish pages
- The existing follow button prompts guests through the sheet (A) instead of ignoring them. Add the same button to dish pages (header: "Follow Berlin: new vegan places and score changes").
- Effort: 0.5 day. Depends on A.

### D. A first page worth coming back to
- After the first sign-up, land on `/saved`: saved places (list + map), followed cities with "N new places since your last visit" and the score delta. This is item 5 of the product-direction doc ("since your last visit"), and it is what makes the account worth keeping.
- Until D exists, land on the page the visitor came from (A already does this).
- Effort: 1 day after item 5 exists.

## Measurement
- GA4 event `cta_click_signup` already carries `data-from`; add values `card_save`, `hub_follow`, `dish_follow`.
- Sign-ups per month from `users.created_at` (web vs app: `users` has no platform column; use the GA4 `sign_up` event count as the web number).
- Success for A to C after one full month: 50+ web sign-ups, 20+ saves per month from the web.

## Not doing, and why
- Email newsletter or digest: no opt-in consent collected (memory: no email marketing).
- Points, badges, streaks: Sprouts are gated to admin; deals come first.
- More supporter perks: conversion is limited by reach, not by the offer (August review).
- A sign-up wall on any page: the search traffic is the asset; walls cut it.
