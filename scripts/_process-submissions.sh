#!/bin/bash
# Periodic mobile-submission processing: when the queue has pending items,
# run headless Claude with the approve-submissions skill (vet → publish →
# image → notify submitter). Cheap no-op when the queue is empty — the
# Claude invocation only happens if count > 0.
#
# Installed in crontab at 07:23, 13:23 and 19:23 daily:
#   23 7,13,19 * * * /Users/antonkravchuk/sidep/Cleareds/plantspack/scripts/_process-submissions.sh >> /tmp/process-submissions.log 2>&1

set -eo pipefail

export PATH="/Users/antonkravchuk/.local/bin:/Users/antonkravchuk/.nvm/versions/node/v21.5.0/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

cd /Users/antonkravchuk/sidep/Cleareds/plantspack

echo "=== $(date) submission check ==="

COUNT=$(npx tsx scripts/submission-actions.ts count 2>/dev/null | tail -1)
if ! [[ "$COUNT" =~ ^[0-9]+$ ]]; then
  echo "count failed (got: $COUNT) — aborting"
  exit 1
fi
if [ "$COUNT" -eq 0 ]; then
  echo "queue empty"
  exit 0
fi

echo "$COUNT pending — invoking approve-submissions skill"
# Scoped allowlist, NOT a blanket permission bypass: the headless run may only
# execute the two submission CLIs, tsc-free reads, and web lookups.
claude -p "/approve-submissions" \
  --allowedTools "Bash(npx tsx scripts/submission-actions.ts *)" "Bash(npx tsx scripts/place-hero-image.ts *)" "Bash(npx tsx scripts/check-submissions.ts *)" "Read" "Grep" "Glob" "WebSearch" "WebFetch" "Skill" "Write" \
  --max-turns 100

# Location sanity pass over what was just published (and the last week): fixes
# unambiguous coordinate errors, mirrors the rest into Research Review.
npx tsx scripts/check-submissions.ts --approved-days 7 --fix 2>&1 | tail -20

echo "=== $(date) done ==="
