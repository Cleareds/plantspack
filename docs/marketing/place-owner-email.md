# Place-owner outreach email

Goal: get fully-vegan venue owners to (a) know they're listed, (b) claim/edit, (c) share the link with their audience.

## Targeting rules

- `vegan_level = fully_vegan` only for the first batch (highest share rate, cleanest pitch).
- Has a `website` and a discoverable email (contact page, footer, or Instagram bio).
- Skip chains, supermarkets, places already claimed.
- Send 20/day, manually personalised. No bulk sender, no tracking pixels - they will read the headers.
- Sender: `hello@plantspack.com` (real inbox, monitored daily), not no-reply.

## Subject lines (A/B these)

1. `Your cafe is on PlantsPack - quick heads up`
2. `[Place name] is featured on our vegan map`
3. `Found [Place name] while building a vegan-only directory`

Subject 3 wins for cold; subjects 1-2 win when the venue is large enough that they get press regularly.

## Email - cold version (default)

```
Subject: Found [Place name] while building a vegan-only directory

Hi [first name if known, otherwise "[Place name] team"],

I'm Anton, I run PlantsPack - a 100% vegan-only directory (no
"vegetarian-friendly" noise, no places that serve animal products).

I came across [Place name] while curating [city] and added you with
the "fully vegan" verified badge:

[direct URL to the listing]

Two things, no strings:

1. The listing is free and stays free. If anything is wrong - hours,
   photos, a dish that's no longer on the menu - reply and I'll fix it,
   or you can claim the page in 30 seconds and edit it yourself.

2. If you'd like to share the link with your customers (Instagram bio,
   Google profile, newsletter), it helps vegans find you - we're vegan-
   first by design, so the people clicking through are already looking
   for what you serve.

That's it. Not selling anything, no premium tier, no upsell.

Thanks for what you do,
Anton
plantspack.com
```

## Variant - the venue is small / family-run

Drop the "press" tone. Make it warmer.

```
Subject: Quick note about [Place name]

Hi [name],

I added [Place name] to PlantsPack last week - it's a vegan-only map
I'm building (no mixed listings, no places that serve meat with one
vegan option). Here's your page:

[URL]

If anything's off - opening hours, the photo, the description - just
reply and I'll fix it the same day. And if you ever feel like sharing
the link with your customers, it really does help us reach more
vegans, which sends them back to you.

No catch, listing is free.

Anton
plantspack.com
```

## Variant - venue already has a strong online presence

Lean into the "trust signal" angle.

```
Subject: [Place name] - fully vegan badge on PlantsPack

Hi [name],

Quick one. I added [Place name] to PlantsPack with our "fully vegan"
verified badge - it's the trust signal we give venues whose menu is
100% plant-based, after we manually check.

[URL]

Two asks if you have a minute:

- Claim the page (free, 30 seconds) so you can edit hours/photos
  whenever you change them.
- Share the link once on Instagram or your Google Business profile.
  Vegan-only directories convert better than mixed maps because the
  audience is pre-filtered.

Reply if anything's wrong on the listing - I action corrections same day.

Anton
plantspack.com
```

## Reply playbook

| Reply type | Action |
|---|---|
| "Thanks, can you fix X?" | Fix within 24h, reply with screenshot of the change. Ask if they'd like to claim. |
| "How do I claim?" | Send direct claim URL + 2-line steps. Don't over-explain. |
| "Can you remove us?" | Remove same-day, reply confirming. Never argue. |
| Silence after 7 days | Do not follow up on the first batch. Note in CRM. Re-evaluate after 30 days only if you have something genuinely new (new feature, press mention). |

## What NOT to do

- No "limited time offer" framing - we're not selling anything.
- No automated follow-up sequences. One email, then silence unless they reply.
- No tracking pixels, no link shorteners, no UTM-spam in the URL (one clean UTM is fine: `?utm_source=owner_email`).
- Do not ask for a review, social tag, or backlink in the first email. The ask is "claim and share" - one ask, not three.

## Personalisation checklist (per email, ~60 seconds each)

- [ ] First name from their About / contact page (not the venue name)
- [ ] One specific detail: a signature dish, recent menu change, location quirk
- [ ] Direct URL to *their* listing, not the homepage
- [ ] Send from a real address, signed with a real name

## Tracking

Spreadsheet, not a CRM at this scale. Columns:

`venue | city | email | sent_at | reply_at | reply_type | claimed | shared_externally | notes`

Review weekly. If reply rate < 10% after 100 sends, the issue is the listing quality (bad photo, wrong hours), not the email - fix listings first, then resume.
