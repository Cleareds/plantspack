# Enable mobile product analytics (PostHog) - runbook

Status: instrumentation is already written and wired. Only the API key is missing.
Effort: ~20 minutes. Ships OTA - no store review, no native build.

## Why this is the first thing to do

`mobileapp/src/lib/analytics.ts` is a complete PostHog HTTP-capture client with 25
`track()` call sites, and it `return`s immediately on every call while
`EXPO_PUBLIC_POSTHOG_KEY` is unset. So right now the app emits nothing.

Already instrumented (no code needed):

| Event | Where |
|---|---|
| `app_open` (`cold_start` true/false) | `app/_layout.tsx:81,104` |
| `signed_up` / `signed_in` (per method) | `app/auth.tsx`, `app/auth/callback.tsx` |
| `place_viewed` (vegan_level, country) | `app/place/[slug].tsx:140` |
| `place_saved` / `place_unsaved` / `save_blocked_guest` | `app/place/[slug].tsx:145,148` |
| `suggest_place_submitted` (category, level, coords, photos) | `app/suggest-place.tsx:162` |
| `place_correction_submitted` | `app/edit-place.tsx:150` |
| `tool_opened` (tool id) | `app/(tabs)/tools.tsx:90` |
| `city_followed` | `app/follow-city.tsx:55` |
| `learn_article_opened` | `app/(tabs)/learn.tsx:52` |
| `map_location_search`, `map_view_mode` | `app/(tabs)/index.tsx:117,323` |
| `directions_opened` | `src/lib/maps.ts:59` |
| `impact_share` / `impact_share_open` | `app/tools/impact.tsx` |
| `place_note_added` / `_updated` | `src/components/places/MyPlaceNote.tsx:42` |

Identity is handled correctly too: a persistent `pp_device_id` in AsyncStorage covers
guests, and `identify(session.user.id)` at `app/_layout.tsx:91,97` aliases the anonymous
device to the user on both session restore and fresh sign-in, with `resetIdentity()` on
sign-out. That means **D1/D7/D30 retention works out of the box** - no extra code.

## Steps

### 1. Create the PostHog project

Sign up at <https://eu.posthog.com> (**EU cloud - important**: the code defaults to
`https://eu.i.posthog.com`, and your users are mostly EU). Create a project named
`plantspack-mobile`, then copy the **Project API key** (starts with `phc_`).

Free tier is 1M events/month. At ~250 users you will use a rounding error of that.

If you accidentally create a US-region project, also set
`EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com` in step 2.

### 2. Add the key - to EAS, not just `.env`

> **This step was wrong in the first version of this runbook.** A local `.env` is NOT
> sufficient for this project. `eas update` resolves `EXPO_PUBLIC_*` vars from the
> **EAS server-side environment**, not from your local `.env`, and it silently ignores
> the local file. The first publish attempt inlined `undefined`, and because
> `analytics.ts` starts with `if (!KEY) return;` the minifier then dead-stripped the
> entire `send()` body - so the bundle shipped with no PostHog code in it at all and no
> error anywhere. Verify, do not assume.

This project keeps `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` as EAS
environment variables (`eas env:list --environment production`). Do the same:

```bash
cd mobileapp
export PATH="$HOME/.nvm/versions/node/v22.19.0/bin:$PATH"
CI=1 npx --yes eas-cli@latest env:set \
  --name EXPO_PUBLIC_POSTHOG_KEY --value phc_your_key_here \
  --environment production --environment preview --environment development \
  --visibility sensitive --scope project --type string --non-interactive
```

Also append it to local `mobileapp/.env` (gitignored, `.gitignore:48`) so `expo start`
works locally, and add the bare name to `mobileapp/.env.example` for the next machine.

A `phc_` project key is a write-only client key designed to ship inside app bundles - it
is not a secret, so `sensitive` visibility is for tidiness, not security.

### 3. Verify locally before publishing

```bash
cd mobileapp
npx expo start --clear      # --clear matters: the old bundle has the key inlined as undefined
```

Open the app, then watch PostHog -> **Activity** (live events). You should see `app_open`
within seconds. If nothing arrives, the key did not make it into the bundle - confirm
with a temporary `console.log(!!process.env.EXPO_PUBLIC_POSTHOG_KEY)`.

### 4. Publish OTA

`app.json` has `runtimeVersion: { policy: 'appVersion' }` and `version: 1.0.6`, and the
live store build is 1.0.6 on both platforms - so this OTA reaches every current install.

Node 22 is required; the default `node 21.5.0` on this machine crashes `eas update` with
a `parseEnv` error:

```bash
cd mobileapp
export PATH="$HOME/.nvm/versions/node/v22.19.0/bin:$PATH"
CI=1 npx --yes eas-cli@latest update --branch production --environment production \
  --message "enable posthog analytics"
```

`--environment production` is required so EAS loads the server-side env vars from step 2.
`eas-cli` is not installed globally here, so `npx eas` fails with "could not determine
executable to run" - use `npx --yes eas-cli@latest`.

This is pure JS - no native module added - so no rebuild and no store review. Existing
users pick it up on next launch (`src/lib/otaUpdates.ts` does active update checks).

**Always verify the key actually landed in the bundle** (this is how the silent failure
above was caught - `.hbc` is Hermes bytecode but string literals stay greppable):

```bash
grep -qa "phc_your_key_here" dist/_expo/static/js/ios/*.hbc && echo "key ✓" || echo "key MISSING"
grep -qa "eu.i.posthog.com" dist/_expo/static/js/ios/*.hbc && echo "host ✓" || echo "dead-stripped"
```

If `eu.i.posthog.com` is absent, the key was `undefined` and `send()` was minified away.

### 5. Set up the three things worth looking at

In PostHog:

1. **Retention insight** - event `app_open`, weekly granularity. This is the number that
   decides whether to spend on acquisition. Watch the 2026-06-29 and 2026-07-13 cohorts.
2. **Funnel** - `app_open` -> `place_viewed` -> `place_saved` OR `suggest_place_submitted`.
   Tells you where the 63% who never take an action drop off.
3. **Trend on `tool_opened` broken down by `tool`** - the AI scanners have 19 lifetime
   uses. This will show whether that is a placement problem (few `tool_opened`) or a
   completion problem (many opens, few scans).

## One compliance item

Adding analytics changes what the app collects, so the **App Store privacy declaration**
needs updating: App Store Connect -> App Privacy -> add *Usage Data* (Product
Interaction) and *Identifiers* (Device ID), purpose **Analytics**, linked to identity for
signed-in users. Same for the Play Data safety form. Both are metadata edits - no
resubmission of a build. Also worth a line in the mobile privacy policy.

Do this in the same sitting; Apple does spot-check and it is a 5-minute form.

## Caveat

Retention is not backfillable - the cohort clock starts the day you publish. That is the
argument for doing it this week rather than after a Product Hunt launch, so you are
reading real numbers when the traffic arrives.
