# PlantsPack - what to focus on next (2026-07-26)

Marketing/product read based on live DB + store data. No code changed.

## 1. The one thing the data says

**You have two channels compounding at once, not one.** (Corrected after pulling GSC/GA4
- see section 1b. An earlier draft of this brief said the app stores were the only channel
that worked; that was wrong.)

Signups per week:

| Week | Signups | Took >=1 action |
|---|---|---|
| 2026-06-01 | 4 | 0 |
| 2026-06-08 | 4 | 3 |
| 2026-06-15 | 2 | 1 |
| 2026-06-22 | 7 | 2 |
| **2026-06-29** (Android live) | **53** | 22 |
| 2026-07-06 | 24 | 10 |
| 2026-07-13 | 62 | 20 |
| 2026-07-20 | 21 | 5 |

Baseline was 2-7 signups/week for months. Post-launch it is 20-60/week - roughly a
10x step change. 160 of the 241 total users signed up in the last 30 days.
iOS went live 2026-07-25 (v1.0.6) and has not had time to contribute yet.

Conclusion: the bottleneck moved. It is no longer supply (52,689 live places is a real
moat and that work is done). It is now retention measurement, engagement loops, and
store conversion.

## 1b. Web SEO is not flat - it is up ~5x in 8 weeks

GSC weekly clicks (Mon-start):

| Week | Clicks | Impressions | Avg pos |
|---|---|---|---|
| 2026-05-25 | 114 | 20,437 | 17.6 |
| 2026-06-01 | 176 | 23,720 | 14.5 |
| 2026-06-08 | 191 | 29,839 | 14.3 |
| 2026-06-15 | 288 | 59,240 | 14.0 |
| 2026-06-22 | 606 | 132,361 | 12.6 |
| 2026-06-29 | 489 | 96,949 | 14.3 |
| 2026-07-06 | 482 | 70,480 | 13.3 |
| 2026-07-13 | **559** | 73,153 | **12.4** |

GA4 weekly sessions rose 113 -> 215-281, organic 41 -> 144. (GSC 559 clicks vs GA 144
organic sessions is a ~4x undercount, wider than the ~2x noted previously - trust GSC.)

Cohort split, last 14d vs previous 14d:

| Cohort | Clicks | Impressions |
|---|---|---|
| **Dish pages** | 259 -> **418 (+61%)** | 29,357 -> 34,324 (+17%) |
| **Events** | 46 -> 70 (+52%) | 1,837 -> 3,310 (+80%) |
| **City/country hubs** | 99 -> 115 (+16%) | 21,439 -> **44,047 (+105%)** |
| Place pages | 627 -> **492 (-22%)** | 125,841 -> **66,607 (-47%)** |
| Recipes | 1 -> 6 | 1,133 -> 1,660 |
| **Tools** | **0 -> 0** | 29 -> 80 |

Read: the 2026-06-29 SEO work (dish-page ISR + `noindex` under 3, crawlable city nav,
country-hub unique copy + `noindex` under 5) worked exactly as designed. Dish pages and
hubs are up; the -47% place-page impression drop plus 2,589 pages falling from >=5
impressions to zero is the thin-page pruning you asked for. Position improved 12.6 ->
12.4 and total clicks still rose +16% WoW, so this looks like healthy consolidation
rather than a penalty. Worth one confirming look, not alarm.

Two things this changes:

1. **Dish pages are the proven scalable pattern.** +61% clicks off 1,772 pages. This is
   producible from data you already have, with no camera and no personality. It is a
   better use of the next 20 hours than starting a new channel.
2. **Tools have zero organic presence** - 0 clicks, 80 impressions across 4 pages. The
   scanners are simultaneously your most marketable feature (19 lifetime uses) and
   invisible in search, while "is X vegan" is enormous query volume. That gap is the
   bridge between the channel that already works and the feature that does not get used.

## 2. Engagement depth - the weak spot

| Action | Rows | Distinct users |
|---|---|---|
| Place submissions | 91 | **37** |
| Followed cities | 40 | 27 |
| Place reviews | 108 | 26 |
| Place corrections | 279 | 13 |
| Follows (social graph) | 95 | 12 |
| Comments | 29 | - |
| Post likes | 6 | - |
| Packs | 9 | - |
| **Tool scans (AI scanners)** | **19** | **8** |

Activated: 89 of 241 users (37%) took at least one action.

Two things fall out of this:

- **Utility and contribution work. Social does not.** 37 people bothered to submit a
  place; 12 people have ever followed anyone; there are 6 post likes lifetime.
- **The AI scanners - the most marketable feature - have 19 lifetime uses.** That is a
  discoverability problem, not a demand problem. They are behind a Tools tab instead of
  being at the point of need.

## 3. Blind spots that block any marketing decision

1. **Mobile has zero product analytics.** `src/lib/analytics.ts` implements PostHog with
   25 `track()` call sites, but it no-ops unless `EXPO_PUBLIC_POSTHOG_KEY` is set - and
   that key is not set in `.env*` or `eas.json`. So there is no D1/D7/D30, no funnel, no
   way to know whether those 160 new signups came back. Fix is ~1 hour and ships OTA
   (no store review).
2. **No segmentation data.** `is_vegan` and `home_country` are empty for all 1000 sampled
   users. Onboarding captures nothing usable for targeting or personalization.
3. **No current web traffic read.** GA4/GSC need `gcloud auth application-default login`
   (ADC expired), so `scripts/seo-monitor.ts` cannot run.

## 4. Store conversion (checked live)

- Play: 100+ downloads, no visible ratings.
- iOS: live, v1.0.6, **0 ratings**, EN-only, seller shows as "Anton Kravchuk".
- The iTunes lookup API returns **0 screenshots** for iPhone and iPad. This may be a
  stale index on a day-old listing - **verify in App Store Connect immediately.** If it
  is real, it is the single biggest conversion leak you have.
- Web -> app funnel is already fine: iOS smart banner sitewide (`itunes.appId` in
  layout), Android slim banner via AppShell, badges in footer + a real `/app` page.
  Nothing to do here.

Zero ratings caps the return on every acquisition channel below. Fix before spending
attention anywhere else.

## 5. Feature calls

**Do not build the mobile feed (currently slated for 1.1.0).** ~1-1.5 weeks of work to
serve a social graph that does not exist: 12 people follow anyone, 6 lifetime likes.
This is building a feed for an empty room.

Ranked instead:

1. **PostHog key on** - OTA, ~1h. Unblocks everything.
2. **ASO + ratings** - verify iOS screenshots; add an in-app rating prompt after a
   positive moment (place saved, scan completed); localize store listings to DE / PT /
   NL / ES where the place data is strongest. Highest ROI per hour available.
3. **Contribution loop, not social loop** - 37 submitters out of 241 is a strong signal.
   Give them submission status, contributor visibility, "your place was viewed N times"
   notifications. The Sprouts ledger already exists and is admin-gated - this is what it
   is for.
4. **Surface the scanners at point of need** - on place pages and in-store context, not
   behind a tab. 19 lifetime scans is a placement failure.
5. **Recipes on mobile** - web has ~718, mobile has none. Cooking is a daily use case;
   finding places is weekly-to-travel frequency. Better 1.1.0 candidate than the feed.

## 6. The three channels asked about

### Product Hunt - yes, once, timeboxed. Not a growth channel.
One day, mostly a maker audience. Realistic: 200-600 visits, 30-80 installs, one
high-authority backlink, and a permanent credibility asset. It will not retain.
Preconditions: store screenshots confirmed and some ratings on the board first. Lead
with the AI scanner and "52,689 places, nobody pays to rank" - not "a vegan directory".

### LinkedIn - yes, but the goal is not user acquisition.
Your read is correct: that audience is not vegan. Do not use it for installs. Use it for
the build story - a Head of Engineering shipping a 52K-place directory plus two native
apps solo. That serves personal and Vaimo brand, attracts open-source contributors
(AGPL-3.0 is already item #7 in the mobile backlog), and generates partnership inbound.
Expect roughly zero vegan users and treat that as fine. 1-2 posts, low effort, real
return on a different axis.

### TikTok - downgraded. See section 1b.

The original case for TikTok was "you have no compounding acquisition channel, so you
need one." The GSC data says you already have one, it is growing ~5x per 8 weeks, and it
costs no ongoing content treadmill. Short-form is now the *third* priority behind
scaling dish pages and closing the tools/search gap.

Keep it on the list, do not start it this quarter. The rest of this section stands if and
when you do.
Vegan discovery genuinely happens on short-form. But it is a treadmill: 3-5 posts/week
for 8-12 weeks before the algorithm commits. The real question is not whether TikTok
works, it is whether you can sustain 4 posts/week. A dead account is worse than no
account.

If you do it, make it producible from data rather than from your face, and batch it:

- "Is it vegan?" scanner reveals on surprising products (E-numbers, wine, beer - the
  Barnivore data is already in).
- "N fully vegan places in [city]" - 117 verified fully-vegan places + city ranks.
- "Things you did not know are not vegan" - the glossary and ingredient content is
  already written.

Same asset cross-posts to Reels and Shorts: three platforms, one production cost.

Note: Reddit already returned modest results with visible update fatigue. Do not go back
with another "update" post.

## 7. Sequence (revised after the GSC/GA4 pull)

**Weeks 1-2 - instrumentation and conversion, no new channel:**
PostHog key (see `posthog-enable-runbook.md`) -> verify iOS screenshots in ASC -> in-app
rating prompt -> store localization DE/PT/NL/ES. Also fix the empty
`mobileapp/google-play-key.json` (0 bytes - breaks `eas submit -p android`).

**Weeks 2-4 - feed the channel that is already compounding:**
Scale the dish-page pattern (+61%) and city hubs (+105% impressions). Build out
"is X vegan" search coverage that lands on the scanners - this fixes the 0-organic-clicks
tools gap and the 19-lifetime-scans usage gap with one piece of work.

**Week 4+ - read retention, then decide on Product Hunt:**
D7 from PostHog is the gate. Healthy -> launch on PH for the backlink and credibility.
Poor -> fix the contribution loop first, because pouring PH traffic into a leaky bucket
wastes a one-shot channel.

**Ongoing, low effort:** LinkedIn build story, 1-2 posts, decoupled from growth.

**Not this quarter:** TikTok / short-form.

The headline: you do not need a new channel. You need to instrument the app you launched,
fix store conversion, and keep feeding the SEO pattern that is already up 5x. The one
genuinely open question is whether the 160 new signups stayed - and PostHog answers it
within a week of publishing.
