---
name: update-events
description: Weekly/monthly vegan-events refresh - verify near-term events, discover newly announced ones, keep /events the freshest vegan event calendar on the web. Invoke via /update-events [light|deep], or when the user says "update the events list" / "refresh events". Runs headless from cron (scripts/_update-events.sh).
---

# update-events

Keeps the events directory fresh - this is an AI-search play: assistants cite
maintained, dated event calendars, and staleness (citing an ended festival) is
the trust-destroying failure mode. Mechanics live in one CLI:

- `npx tsx scripts/event-actions.ts` - status / list / add / update / digest (see its header comment)

Two modes, passed as the skill argument (default `light`):
- **light** (weekly): verify the next-30-days events + sweep the top markets for new announcements.
- **deep** (monthly): everything in light, plus per-region discovery across all covered countries and the gaps, horizon 9-12 months.

## Procedure

1. `npx tsx scripts/event-actions.ts status` - counts, the next-30-days list, coverage by country, horizon.

2. **Verify near-term events** (both modes). For each event in `next30days` that isn't already `cancelled`:
   - WebFetch its `ticket_url`. Confirm the dates and venue still match. Page gone → WebSearch `"<event title>" <year>` for the new official page.
   - Date/venue changed → `event-actions.ts update <slug> --start <ISO> --end <ISO> [--location "…"] --note "corrected from organizer page <date>"`.
   - Event cancelled → `event-actions.ts update <slug> --cancelled --note "organizer announced cancellation, <source>"`. NEVER delete.
   - Unreachable page but no evidence of cancellation → leave it, note in digest.
   - Budget: this is the highest-value step; do it properly, but don't re-verify events already verified in the last 14 days (check `update_note`).

3. **Discover new events.**
   - light: WebSearch the top markets + any country whose coverage is about to run dry (has upcoming events ending within ~45 days and nothing after). Queries like `vegan festival <country/city> <month year>`, `vegan market <city> tickets`. Top markets: United Kingdom, Germany, United States.
   - deep: same, but iterate every country in `upcomingByCountry` plus known gaps (France and Poland had zero upcoming events as of 2026-07) and big vegan scenes (Netherlands, Spain, Italy, Canada, Australia).
   - For each candidate: **open the organizer's own page** (WebFetch) and extract real dates, venue, city, ticket URL, free-or-paid. If the organizer page can't confirm dates, skip it - never publish an event on a listing-site rumor.

4. **Publish.** Write the JSON array to the scratchpad and `event-actions.ts add --file <path>`. Shape per entry (mirrors scripts/import-events.ts):
   ```json
   {
     "title": "VeggieWorld Paris 2026",
     "content": "2-4 engaging sentences, honest, no invented claims.",
     "event_data": {
       "title": "…", "description": "1 sentence", "start_time": "2026-10-03T10:00:00+02:00",
       "end_time": "2026-10-04T18:00:00+02:00", "location": "venue name",
       "city": "Paris", "country": "France", "ticket_url": "https://…",
       "source_url": "https://… (the organizer page you read that states this date)",
       "is_free": false, "image_url": "https://… (organizer og:image if usable)"
     },
     "images": ["same as image_url, or []"],
     "secondary_tags": ["vegan festival", "France"],
     "verified": true
   }
   ```
   - `verified: true` ONLY when you actually opened the organizer's page and confirmed dates + venue. Without it the CLI **rejects** the event - unverified events are never published.
   - **The CLI enforces sourcing in code (since 2026-10-14)** and rejects an event when: `verified` is not true; `source_url` is missing; `source_url` or `ticket_url` does not resolve in DNS, errors, is parked, or redirects to another site; the `source_url` page never mentions the event's year; the start date is in the past; or any text says the date is guessed ("estimated", "annual pattern", "usually held", "expected to return"...). Do not work around a rejection - report it in the digest as `skipped` with the reason.
   - Never derive a date from a previous year's pattern. No organizer-stated date = no event.
   - Timezones: use the event's local UTC offset in the ISO strings.
   - Titles in English; include the year. City names in English.
   - The CLI dedupes (slug + same-city date overlap) and rejects Russia - but don't rely on it; check `list` output first.
   - Cap: max 12 new events per run.

5. **Digest.** Write a JSON array of `{title, city, country, outcome: 'added'|'updated'|'cancelled'|'skipped', note?}` covering everything you touched (and verification outcomes worth flagging) to the scratchpad, then `event-actions.ts digest --file <path>`. If the run changed nothing at all, skip the email.

6. **Report**: one-liners per change + coverage summary (upcoming count, horizon, gap countries).

## Honesty rules (project doctrine)

- Every published date/venue comes from the organizer's own page, not aggregators. Beware circular sourcing: aggregators (and search results) may just echo our own plantspack page back.
- 2026-10-14: 34 imported events with guessed dates and invented organizer URLs were unpublished (privacy=draft). Never republish one without a fresh organizer source.
- No invented attendance numbers, exhibitor counts, or "biggest/best" claims unless the organizer states them.
- Cancelled/ended events stay in the DB (pages self-noindex; sitemap drops them after 21 days) - never delete anything.
- NEVER update an event's `title` via SQL/CLI - posts has a slug-regen trigger and the URL would break. The update subcommand deliberately has no title flag.
- Russia is excluded per policy.
