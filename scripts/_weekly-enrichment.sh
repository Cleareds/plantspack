#!/bin/bash
# Weekly enrichment - runs Sundays. Catches up on whatever was inserted
# during the week (manual additions, OSM delta scrapes, user submissions).
# All heavy OpenAI work lives here so the daily maintenance stays cheap.

set -eo pipefail

export PATH="/Users/antonkravchuk/.nvm/versions/node/v21.5.0/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

LOG=/tmp/weekly-enrichment.log
trap 'echo "[$(date)] FAIL line $LINENO (exit $?)" >> $LOG' ERR

cd /Users/antonkravchuk/sidep/Cleareds/plantspack

# Cutoff for --since: anything created in the last 8 days, with a one-day
# overlap so the boundary is safe even if the cron drifts an hour.
SINCE_STAMP=$(date -u -v-8d +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d '8 days ago' +%Y-%m-%dT%H:%M:%SZ)

echo "=== $(date) weekly enrichment starting (since=$SINCE_STAMP) ===" >> $LOG

# 1. Bulk vegan verification - checkpoint-based, so only processes
#    fully_vegan rows we have not yet classified. Aborts on quota wall.
echo "[$(date)] Bulk verify..." >> $LOG
npx tsx scripts/bulk-verify-vegan-fast.ts >> /tmp/weekly-verify.log 2>&1 || echo "[$(date)] verify exited non-zero (likely quota; continuing)" >> $LOG

# 2. Fill missing descriptions for newly-imported places
echo "[$(date)] Generate missing descriptions..." >> $LOG
npx tsx scripts/generate-missing-descriptions.ts >> /tmp/weekly-descriptions.log 2>&1 || echo "[$(date)] descriptions exited non-zero" >> $LOG

# 3. Reclassify recently-imported places only - existing corpus is stable
echo "[$(date)] Reclassify since $SINCE_STAMP..." >> $LOG
npx tsx scripts/reclassify-vegan-levels.ts --since="$SINCE_STAMP" >> /tmp/weekly-reclassify.log 2>&1 || echo "[$(date)] reclassify exited non-zero" >> $LOG

# 4. Dedup sweep - catches duplicates introduced by the week's inserts
echo "[$(date)] Dedup sweep..." >> $LOG
npx tsx scripts/dedup-archive.ts --apply >> /tmp/weekly-dedup.log 2>&1 || echo "[$(date)] dedup exited non-zero" >> $LOG

# 5. Broken-image audit (slow, ~30-60 min for 24K places)
echo "[$(date)] Broken-image scan..." >> $LOG
npx tsx scripts/detect-broken-images.ts --apply >> /tmp/weekly-broken-images.log 2>&1 || echo "[$(date)] broken-image scan exited non-zero" >> $LOG

# 6. End-of-week quality report
DATE=$(date +%Y-%m-%d)
npx tsx scripts/data-quality-report.ts > /tmp/quality-${DATE}-weekly.log 2>&1 || true

echo "=== $(date) weekly enrichment complete ===" >> $LOG
