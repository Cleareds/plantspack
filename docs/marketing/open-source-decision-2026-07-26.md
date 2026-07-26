# Open source / F-Droid / Lemmy - decision brief (2026-07-26)

Question asked: go full open source, or ship a separate open-source app reusing the same
data for F-Droid? Motivation: unlock the lemmy.world audience. Constraint: not enough
time to maintain everything properly.

## The reframe

**Lemmy is not gated on F-Droid.** That audience screens for: no tracking, no lock-in,
open data, independent, honest about limitations. F-Droid presence is one *signal* of
those, not the requirement. You can satisfy most of the list without ever solving
F-Droid's build infrastructure.

And the highest-value "open" move here is not the app code at all - it is the data.

## The load-bearing fact: 87.3% of the data is OSM-derived

Live places by source (52,690 total):

| Bucket | Count | Share |
|---|---|---|
| OSM-derived (`osm*`) | 31,665 | 60.1% |
| `openstreetmap` | 14,340 | 27.2% |
| VegGuide | 3,341 | 6.3% |
| manual / admin | 704 | 1.3% |
| everything else | ~640 | ~1.2% |

**`ODbL` / "Open Database License" appears nowhere in the repo.** Current OSM credit is:

- `src/components/places/PlaceMap.tsx:119` - `© Stadia Maps © OpenStreetMap` (this covers
  the *tiles*, not the place data)
- `src/app/methodology/page.tsx:110` - prose describing OSM-sourced entries

Two consequences:

1. **Attribution for the data is thin and should be fixed regardless of any of this.**
   ODbL requires attribution for a Produced Work built from OSM data. Prose on one page
   plus tile credit is weak for a database that is 87% OSM.
2. **Share-alike is a live question, not a hypothetical.** ODbL distinguishes a *Produced
   Work* (a rendered site - attribution only) from a *Derivative Database* (what you have:
   46K OSM records plus your added attributes). Section 4.4(b) says that if you Publicly
   Use a Derivative Database you must offer it under ODbL. Plenty of commercial services
   operate in this grey area, and this brief is not legal advice - but the honest read is
   that publishing an ODbL export moves you from "arguably non-compliant" to "clearly
   compliant," and it happens to be the exact thing the Lemmy audience values.

**This is the risk nobody flagged: posting on Lemmy about being "open" while 87%
OSM-derived with tile-only attribution invites someone to check.** That crowd does check.
A licence-compliance callout in the comments would do more damage than the post earns.

## Repo audit - the good news

Checked `papasoft23/plantspack-mobile` (currently **private**):

- **No secrets in git history.** `AuthKey_*.p8` and `.env` were never committed.
  `google-play-key.json` appears in 2 commits but the blob was **0 bytes** both times (an
  empty placeholder, later deleted). **No history rewrite needed** - this was the biggest
  unknown cost and it is zero.
- `google-services.json` **is tracked**. It is FCM *client* config, shipped inside every
  APK anyway, so not a secret - but decide deliberately.
- `LICENSE` is untouched `create-expo-app` boilerplate: *"The MIT License - Copyright
  2015-present 650 Industries, Inc. (aka Expo)"*. GitHub reports the repo as MIT. **You
  currently have a licence file assigning copyright to Expo.** Must be replaced before
  going public.
- MapLibre (not Google Maps) - genuinely FOSS-friendly, as the backlog noted.

## F-Droid blockers, specifically

| Dependency | F-Droid problem |
|---|---|
| `expo-updates` | **Hard blocker.** Self-updating code is disallowed. |
| `@sentry/react-native` | Tracking anti-feature. |
| `expo-notifications` | Pulls FCM on Android - Google dependency. |
| PostHog (just enabled) | Telemetry. Not a blocker, but see below. |

Stripping `expo-updates` is the expensive part - not the work itself, but the
consequence: **the libre flavor loses OTA.** OTA is how you ship everything (it is how
PostHog shipped an hour ago). Every fix for that flavor becomes a full rebuild and
resubmit. That is a permanent tax on exactly the resource you said you do not have.

## The options, costed

### A. Full open source (web + mobile) - NO

The main repo holds 200+ untracked `_*.mjs` scripts, CSV exports, GSC dumps,
`gpt_support/`, `backups/`, and `.env.local` with the service-role key. A history secret
audit alone is days. Worse, publishing the import/scraping pipeline plus the verification
heuristics and anti-abuse thresholds hands a competitor the whole operation and makes
moderation gameable. **Weeks of work, real downside, and it buys nothing that mobile-only
does not.**

### B. Open-source the existing mobile repo (one repo) - ~2-4 days

- Replace the Expo boilerplate LICENSE. ~1h.
- Decide on `google-services.json`. ~30m.
- **Adversarial RLS audit - the real cost, 1-2 days.** Publishing the client publishes
  every table name, query shape, and filter against a public anon key. The users-table
  issue found on 2026-07-14 proves this surface has had at least one real hole. Budget
  properly for this.
- README / CONTRIBUTING / SECURITY / issue templates. ~half day.

Note: **the licence does not protect your backend or data.** AGPL's network clause targets
server software; on a mobile client it does almost nothing. "Someone forks the app and
points it at my Supabase" is a ToS, rate-limit and RLS problem, not a licensing one. Pick
GPL-3.0 or AGPL-3.0 for signalling, not protection.

### C. Separate second app for F-Droid - NO, this is the trap

It looks like the cheap option and is the most expensive. A second codebase rots: every
feature either gets duplicated or the FOSS app degrades into a stale, worse PlantsPack.
**With this audience an abandoned FOSS app is worse than no FOSS app** - it reads as
open-source washing. It also splits your install base and ratings.

Your stated fear - "not enough time to maintain everything right" - is an argument
*against* a second codebase, not for one.

### C-corrected. One repo, two build flavors - ~3-5 days + ongoing

This is what backlog #9 actually describes ("libre flavor"). Same codebase, a build
variant with `expo-updates` / Sentry / FCM stripped. Maintenance lands in build plumbing
rather than feature duplication. Still carries the no-OTA tax above.

### D. IzzyOnDroid + Obtainium - the pragmatic F-Droid substitute

**IzzyOnDroid accepts prebuilt APKs from GitHub Releases** - no building on F-Droid infra,
no reproducible-build requirement. It is a widely-used F-Droid-compatible repo that this
audience adds to their F-Droid client, and **Obtainium** installs straight from GitHub
Releases. Requires a FOSS licence and a scan-clean APK (Sentry would likely need to go, or
be flagged). Roughly 80% of the credibility for a fraction of the effort.

Confirm current IzzyOnDroid inclusion requirements before committing - they change.

### E. Official F-Droid inclusion - park it

Expo/RN on F-Droid's build servers is genuinely weeks-to-months and mostly outside your
control. Combined with the permanent no-OTA tax, this fails your time constraint.

### F. Open the data (ODbL export + real attribution) - ~1-2 days, do this first

- Publish a periodic ODbL-licensed export. `scripts/_export-places.mjs` exists and
  `reports/places-export-2026-07-23/` shows the shape is already there.
- Add a proper data-attribution + licence page; strengthen the OSM credit beyond tiles.
- **Do NOT bulk-push edits back to OSM.** The OSM community requires consultation for
  imports and reacts badly to unannounced bulk edits - done wrong this damages the exact
  reputation you are trying to build. Publish the dataset for mappers, or contribute
  narrowly and manually, and discuss on the mailing list first.

Highest credibility per hour available, and it is the honest differentiator against
HappyCow, whose data is closed.

## One tension created by today's work

**You enabled PostHog an hour ago.** The FOSS/Lemmy audience is precisely the crowd that
objects to telemetry, and once the client is open-source the capture calls are visible in
the source. Before any Lemmy post:

- Disclose it plainly (what is collected, EU-hosted, no ad networks - all true and all
  defensible).
- Ideally ship an opt-out toggle in settings. Cheap, and it converts the single most
  likely objection into a trust signal.

Do not let them discover it by reading `src/lib/analytics.ts`.

## Recommended sequence

1. **Fix OSM attribution + publish an ODbL export** (~1-2 days). Unlocks the Lemmy story,
   resolves the compliance question, differentiates vs HappyCow.
2. **Adversarial RLS audit** (1-2 days). Needed for #3, worth doing regardless.
3. **Open-source the mobile repo**, one repo, real LICENSE (~1 day after #2).
4. **Analytics opt-out toggle** (~half day). Removes the obvious objection.
5. **GitHub Releases APK + Obtainium, then IzzyOnDroid** (~1 day). The pragmatic F-Droid
   answer.
6. **Then** post to Lemmy - with open data, open client, an opt-out, and an honest "F-Droid
   proper is hard with React Native, here is the repo and an APK meanwhile."
7. Official F-Droid: park indefinitely. Revisit only if contributors show up who want it.

Total to a credible Lemmy launch: **roughly a week of real work**, none of it creating a
second codebase, and steps 1, 2 and 4 are things you should do anyway.

Never: option A (full open source) or option C (separate second app).
