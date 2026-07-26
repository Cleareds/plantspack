# Growth + supporters plan (2026-07-26)

Everything below was checked against the codebase first. Section 5 lists what is already
done, so nothing here is a re-suggestion.

## 1. Where you actually are

**Traffic:** organic 559 clicks/wk, up ~5x in 8 weeks. Dish pages +61%, city hubs +105%
impressions. Tools: **0 organic clicks**. App: 160 signups in 30 days.

**Supporters: 2 paid of 241 users (0.8%)** - one `medium` (EUR3/mo), one legacy `premium`.

## 2. CORRECTED after implementation (2026-07-26)

**Causes 2, 3 and 4 below were wrong.** I verified them properly while implementing and
they do not hold. Keeping them visible rather than quietly deleting, because the corrected
conclusion is the useful part.

- **"The offer has no exclusive value" - WRONG.** My string-grep truncated at 14 matches so
  I saw only the badge. The Supporter column actually carries **nine** perks, and I
  verified four of the substantive ones are really implemented: Packs CSV/GPX export
  (`src/app/api/export/packs/route.ts` + `ExportPacksButton`, placed on the packs page),
  prioritised verification requests (`src/app/api/places/[id]/request-verification/route.ts`
  + `RequestVerificationButton`), roadmap voting (gated to supporters, non-supporters see a
  lock + CTA), and the Supporters wall. The sanctuary-split line is correctly hedged as a
  future goal. **`/support` does not need a rewrite - that item is dropped.**
- **"The one good hook is buried" - WRONG.** `/support` is linked from the Footer, the
  Sidebar, and the TopBar menu.
- **"The rating prompt is dead code" - WRONG.** It had one call site
  (`app/place/[slug].tsx:150`, on place-save). My grep searched for the wrong symbol names.
  The *practical* problem was real though: with `THRESHOLD = 3` and only one qualifying
  action, a user had to save three separate places on one install to ever be asked.

**Corrected conclusion: the supporter funnel is well built and is not the bottleneck.**
Offer is real, page is good, nav links exist, the nudge does honest cost-transparent
framing with live numbers. 2 paid of 241 users (0.8%) is roughly normal for a
donation-supported product at this size.

**Supporters are therefore a traffic problem, not a funnel problem.** The section 3
arithmetic stands and is the thing to act on: grow users, and the supporter count follows.
The two genuinely worthwhile fixes were placement of the nudge and reachability of the
rating prompt - both now shipped, both cheap.

## 2b. Original diagnosis (causes 1 and 5 hold; 2-4 refuted above)

1. **The ask exists in exactly one place.** `SupportNudge` is rendered only at
   `src/app/profile/[username]/page.tsx:358`, gated on `isOwnProfile`. That is the
   lowest-traffic authenticated surface on the site. Most users never open their own
   profile.
2. **The offer has no exclusive value.** `/support` lists: *browse 50,000+ places*, *see
   city rankings, ratings, reviews*, *add places, write reviews, follow cities*. All three
   are free for everyone. *No ads, no paid listings* is a platform promise, not a perk. The
   only genuinely exclusive thing is the **Founding Supporter badge (first 100)**. This is
   a donation model wearing a tier-list costume.
3. **The one good hook is buried.** "First 100 supporters, permanent badge" is real
   scarcity with a real deadline. It appears only on a page nobody visits.
4. **No ask at the highest-intent moment.** `submission_approved`
   (`src/lib/submissions/approve.ts`) fires with no support ask. **37 distinct users have
   submitted places** - they already donated labour. That notification is the single
   highest-conversion moment on the platform and it is empty.
5. **Recognition layer is built and switched off.** `SPROUTS_ENABLED_FOR_ALL = false`
   (`src/lib/sprouts-constants.ts:24`). The identity/status system that drives
   donation behaviour in mission products is finished and disabled.

Plus one upstream throttle: **the mobile rating prompt is dead code.**
`recordPositiveAction()` in `mobileapp/src/lib/review.ts` is fully implemented (threshold
3, once-per-install, defensive) and has **zero call sites**. Nobody is ever asked, which is
why you have 4 ratings, which caps store conversion, which caps the user base supporters
come from.

## 3. Honest arithmetic - set the target at cost recovery

At EUR3/mo, 2 supporters = EUR6/mo against ~EUR45/mo infrastructure.

| Users | At 0.8% (today) | At 3% (good mission funnel) |
|---|---|---|
| 241 (now) | 2 | ~7 (EUR21/mo) |
| 500 (~2 months at current signup rate) | 4 | ~15 (**EUR45/mo - costs covered**) |
| 1,000 | 8 | ~30 (EUR90/mo) |

**The goal to aim at is "PlantsPack pays for itself" at roughly 15 supporters**, not a
vague "more supporters". It is concrete, honest, reachable this autumn, and it is a
genuinely motivating thing to say publicly.

Note the structural point: supporters scale with users, so the traffic work *is* the
supporter work. The funnel fixes below are worth doing first only because they are cheap
and they compound over every future visitor.

## 4. What I can do

Ordered by impact per hour. All require your go-ahead to touch code - this session started
as marketing-only.

### Tier 1 - cheap, directly moves the two numbers

| # | Task | Effort | Why |
|---|---|---|---|
| 1 | **Wire `recordPositiveAction()`** into 3-4 moments (place saved, scan completed, submission sent) | ~20 min, ships OTA | The prompt already exists. This is the highest-leverage change available: ratings drive store ranking, which drives installs, which drive supporters. |
| 2 | **Add a support ask to the `submission_approved` notification** | ~1h | Highest-intent moment on the platform, currently empty. 37 people qualify already. |
| 3 | **Rewrite `/support`** - drop the fake tier list, lead with mission + "Founding Supporter, N of 100 left" + the cost-recovery goal | ~2h | Current copy advertises free features as benefits. Honest scarcity converts; a fake perk list does not. Live counter from the `founding_supporter` column. |
| 4 | **Surface `SupportNudge` beyond the profile page** - contributions page, impact screen, post-approval. Explicitly NOT on place pages (hurts the SEO surface). | ~2h | The ask currently reaches almost nobody. |

### Tier 2 - the traffic engine

| # | Task | Effort | Why |
|---|---|---|---|
| 5 | **Expand the dish-page pattern** | days, batchable | The only proven scalable pattern: +61% clicks. I can generate these from existing data. |
| 6 | **Build "is X vegan" content that lands on the scanners** | days | Fixes the 0-organic-clicks tools gap *and* the 19-lifetime-scans usage gap with one body of work. Largest untapped search intent you have. |
| 7 | **Write DE/PT/NL/ES store listing copy** | ~3h | Your strongest data regions; listings are EN-only. You paste into ASC/Play. |
| 8 | **Define the PostHog insights** (retention on `app_open`, activation funnel, `tool_opened` by tool) | ~1h | Turns the analytics we shipped today into decisions. |

### Tier 3 - needs a decision from you first

| # | Task | Blocked on |
|---|---|---|
| 9 | Turn Sprouts on for all users | Your product call - see 5.2 below |
| 10 | Recipes on mobile | Roadmap slot vs the feed |

## 5. What only you can do

Each checked against the codebase - none of these are already done.

1. **Confirm the iOS screenshots in App Store Connect.** Still unresolved from earlier;
   the ASC API script is blocked by the permission classifier. 10 seconds of your time.
2. **Decide what "Supporter" is.** This is the fork everything else hangs off:
   - *Donation* -> keep nothing gated, lean fully into mission + badge + cost-recovery
     goal. Cheap, honest, fits the product. **My recommendation.**
   - *Tier* -> you must build real exclusive value. Months, and it conflicts with
     "no paid advantage" positioning.
3. **Decide the Sprouts flag.** Built, tested, admin-only. Turning it on is the single
   biggest untapped engagement lever you own, but it is a product-identity decision (and
   note the game plan deliberately keeps game Seeds out of this ledger). I can flip it and
   audit the gates; I should not make the call.
4. **Personally message the 37 submitters.** Highest-conversion outreach available and it
   needs a human voice, not a template. "You added X, it's live, here's what it's for."
5. **Reply to the iOS reviews** (you have done this on Android). Public replies are a
   visible store-conversion signal.
6. **Re-download `google-play-key.json`** - it is 0 bytes, which breaks
   `eas submit -p android`. Needs Google Cloud console access.
7. **Update App Store / Play privacy declarations** for the analytics shipped today
   (Usage Data + Identifiers, purpose Analytics). Metadata forms, no resubmission.
8. **Product Hunt launch** - your account, your voice. Gate on ratings + screenshots.
9. **LinkedIn build-story post** - your voice. Brand, not growth.

## 6. Already done - deliberately NOT suggested

Verified present, so these are off the list:

- Mobile "Rate PlantsPack" + "Support PlantsPack" rows in the profile tab (BMC link,
  iOS-gated behind a remote `iosSupportEnabled` kill switch)
- The **supporter scan perk bug is fixed** - `SUPPORTER_TIERS` now correctly contains
  `medium` + `premium` (`src/lib/tool-quota.ts:39`)
- Web one-time donation path - BMC link at `src/app/support/SupportClient.tsx:229`
- Web -> app funnel: iOS smart banner sitewide, Android slim banner via AppShell, `/app`
  landing page, footer store badges
- `founding_supporter` column + badge concept
- AlternativeTo listing (per you)
- PostHog analytics (shipped today, verified inlined)
- OSM tile attribution on maps
- Newsletter opt-in column exists - but only 5 users opted in, and per the standing
  no-email-marketing rule this is not a channel without explicit consent
- Thin-page pruning / dish-page ISR / crawlable city nav (the 2026-06-29 work that
  produced the current SEO growth)

## 7. If you only do four things

1. I wire the rating prompt (20 min) - unblocks the store channel
2. I rewrite `/support` around the Founding Supporter scarcity + cost-recovery goal (2h)
3. I add the support ask to submission approval (1h)
4. You message the 37 submitters personally

That is roughly half a day of my time plus an evening of yours, and it attacks every
verified cause in section 2 except the Sprouts flag.
