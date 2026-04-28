#!/bin/bash
# Daily light maintenance - cheap tasks that genuinely need to run every day.
# OpenAI-heavy enrichment lives in _weekly-enrichment.sh, not here.

set -eo pipefail

export PATH="/Users/antonkravchuk/.nvm/versions/node/v21.5.0/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

trap 'echo "[$(date)] FAIL line $LINENO (exit $?)" >> /tmp/daily-maintenance.log' ERR

cd /Users/antonkravchuk/sidep/Cleareds/plantspack

LOG=/tmp/daily-maintenance.log
echo "=== $(date) daily maintenance starting ===" >> $LOG

# 1. Moderation queue for last 24h of submissions
echo "[$(date)] Moderation..." >> $LOG
npx tsx scripts/moderate-content.ts >> /tmp/daily-moderation.log 2>&1 || echo "[$(date)] moderation failed (non-fatal)" >> $LOG

# 2. Recompute denormalized review_count / average_rating drift
echo "[$(date)] Recompute stats..." >> $LOG
npx tsx scripts/recompute-place-stats.ts >> /tmp/daily-recompute.log 2>&1 || echo "[$(date)] recompute failed (non-fatal)" >> $LOG

# 3. Daily quality snapshot
echo "[$(date)] Quality report..." >> $LOG
DATE=$(date +%Y-%m-%d)
npx tsx scripts/data-quality-report.ts > /tmp/quality-${DATE}.log 2>&1 || true

echo "=== $(date) daily maintenance complete ===" >> $LOG
