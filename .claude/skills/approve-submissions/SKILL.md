---
name: approve-submissions
description: Review + publish pending mobile place submissions (the "short add-place"). Invoke via /approve-submissions, or when the user says "process the submission queue" / "approve mobile submissions". Vets each pending place_submissions row (dedupe, vegan-level check, website fix-ups), publishes it attributed to the submitter, scrapes a hero image if missing, and notifies the submitter. Runs headless from cron (scripts/_process-submissions.sh).
---

# approve-submissions

The lightweight sibling of `add-place` for community submissions from the mobile app. The submitter already provided name/city/level — your job is to **vet, enrich, publish, credit**. The heavy lifting is in two CLIs:

- `npx tsx scripts/submission-actions.ts` — list / fix / approve / duplicate / hold / digest (see its header comment)
- `npx tsx scripts/place-hero-image.ts --id <placeId>` — scrape + re-host a hero image after publishing

`approveSubmission` (called by the `approve` subcommand) already does: geocoding, country/city normalization, place insert with `created_by = submitter` + `place_contributors` creator row, `is_verified=false` + `verification_method='community_submission'` (honest semantics), feed post authored by the submitter, `submission_approved` notification, nearby-user notifications, submission row linked + closed. **Do not redo any of that.**

## Procedure

1. `npx tsx scripts/submission-actions.ts list` → JSON of pending submissions. Skip any with `autoHeld: true` (a previous run already flagged them for the admin). If nothing actionable, stop and report "queue empty".

2. **Per submission, in order** (cap: 15 per run; leave the rest for the next run):

   a. **Duplicate check.** Inspect `dupeCandidates`. If one is clearly the same venue (same name modulo punctuation/diacritics, same city or within a block):
      `submission-actions.ts duplicate <subId> --place-id <existingId>` — credits the submitter as co_submitter and notifies them. Move on.
      If unsure whether it's the same venue, prefer `hold` over guessing.

   b. **Plausibility check.** Gibberish name, test entry, obviously non-vegan-relevant business (e.g. a butcher), or a Russian place (excluded per policy) → `hold` with a short reason. NEVER reject or delete — hold keeps it pending for the human queue in /admin.

   b2. **Location + existence check.** `npx tsx scripts/check-submissions.ts --submission <subId> --json`. It geocodes the submitted address and compares it with the submitted coordinates (the mobile map sends its default Amsterdam centre when the submitter never moved the pin), reverse-checks the country, and writes every finding to `place_submission_checks`.
      - No findings → continue.
      - `default_coords` only, and the submission has a street address → approving is fine: `approveSubmission` now ignores the default centre and geocodes the address itself.
      - `far_from_address`, `country_mismatch`, `geocode_failed` or `suspicious_name` → WebSearch `"<name>" <city>` to confirm the venue exists where the submitter says. If one source gives the street address with no doubt, `submission-actions.ts fix <subId> --address "<street address>"` (and `--city` / `--country` if they were wrong) and re-run the check. If the place cannot be confirmed, `hold` with the finding as the note.
      - Do not add anything the submitter did not provide (phone, hours, description, website) unless a primary source makes it certain. Correcting a wrong address, city or coordinates is in scope; enriching is not.

   c. **Website fix-up.** If `website` is an Instagram/Facebook URL, WebSearch `"<name>" <city> website` for the real site. Found one → `submission-actions.ts fix <subId> --website <realUrl>`. None exists → leave as-is (a social link is genuinely all some places have).

   d. **Vegan-level check** (the same discipline as add-place, abbreviated):
      - Claimed `fully_vegan` → REQUIRE corroboration: WebSearch `is <name> <city> 100% vegan` and/or WebFetch the website menu. Corroborated → keep. Contradicted or no evidence → approve at the evidenced level (default `vegan_friendly`) with `--note "fully_vegan claim not corroborated (<evidence>); published as <level>"`. Never publish an unverified fully_vegan.
      - Claimed `mostly_vegan` → quick website check; "plant-based"/"vegetarian" language alone → downgrade to `vegan_friendly` with a note.
      - Claimed `vegan_friendly` / `vegan_options` → low-risk; WebFetch the website if it resolves easily. Only intervene if the place looks 100% vegan (upgrade is fine with evidence) or has zero vegan signal (then `--note "level unchecked — no web presence"`). Don't burn searches on every entry.
      - Community submissions are ALWAYS kept regardless of chain policy — a user vouching for a pizzeria's vegan options is exactly the signal we want. Chain policy applies to admin imports only.

   e. **Publish.** `submission-actions.ts approve <subId> [--vegan-level <level>] [--note "…"]` → returns `{placeId, slug}`. If it fails on geocoding, retry once after `fix`-ing the address/city; still failing → `hold` with the error.

   f. **Image.** Submissions rarely carry photos. If the approve result's place has no image (submission `images` was null/empty):
      `npx tsx scripts/place-hero-image.ts --id <placeId>` (add `--website <realUrl>` if you fixed the website in step c).
      Instagram/Facebook/TikTok URLs are auto-refused by the scraper (they yield the platform's logo, not a photo — this shipped the IG logo as a restaurant image once). For social-only places go straight to the chrome-devtools fallback or skip.
      Exit 3 = scraper found nothing. If chrome-devtools MCP is available (interactive session), fall back to the add-place browser snippet and then `--image-url <found>`. Headless/cron: skip — note it in the digest; the place ships with a category icon.

3. **Digest.** Write a JSON array of `{name, city, country, submitter, outcome: 'approved'|'failed'|'skipped', slug?, note?}` to the scratchpad and send: `submission-actions.ts digest --file <path>`. Include held + duplicate outcomes as `skipped` with the reason in `note`.

4. **Report**: per-place one-liners (name → /place/slug, level kept/changed, image yes/no) + anything held for human review.

## Never

- Never DELETE a submission or a place; `hold` is the only negative action you have.
- Never set `is_verified=true` or `verification_method='admin_review'` — those are UI-only signals.
- Never publish `fully_vegan` without corroborating evidence (step 2d).
- Never call `notifyNearbyUsers` yourself or approve in bulk without the per-item checks — the whole point of this skill vs. the old blind batch is that each place gets vetted.
- Never chain more than 15 approvals in one run.
- Never publish a submission whose coordinates or city are unconfirmed after step 2b2; hold it. Published places with doubtful locations show up in Research Review via the same check script (`--approved-days 30 --fix` is run by the cron wrapper after approvals).
