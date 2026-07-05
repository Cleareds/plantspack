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
claude -p "/approve-submissions" \
  --permission-mode bypassPermissions \
  --max-turns 100

echo "=== $(date) done ==="
