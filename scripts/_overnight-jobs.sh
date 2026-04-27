#!/bin/bash
# Overnight automation — runs at midnight UTC when OpenAI RPD resets.
# Full pipeline: verify → generate descriptions → reclassify
# Logs to /tmp/overnight-*.log

set -e
cd /Users/antonkravchuk/sidep/Cleareds/plantspack

echo "=== $(date) overnight jobs starting ===" >> /tmp/overnight-main.log

# 1. Bulk vegan verification (OpenAI RPD resets at midnight UTC)
echo "[$(date)] Starting bulk vegan verification..." >> /tmp/overnight-main.log
npx tsx scripts/bulk-verify-vegan-fast.ts >> /tmp/overnight-verify.log 2>&1
echo "[$(date)] Verification done." >> /tmp/overnight-main.log

# 2. Generate descriptions for places that have none (cheap, ~$0.03 total)
echo "[$(date)] Generating missing descriptions..." >> /tmp/overnight-main.log
npx tsx scripts/generate-missing-descriptions.ts >> /tmp/overnight-descriptions.log 2>&1
echo "[$(date)] Descriptions done." >> /tmp/overnight-main.log

# 3. Reclassify into 4 tiers — runs AFTER descriptions so all places have signal
echo "[$(date)] Starting 4-tier reclassification..." >> /tmp/overnight-main.log
npx tsx scripts/reclassify-vegan-levels.ts >> /tmp/overnight-reclassify.log 2>&1
echo "[$(date)] Reclassification done." >> /tmp/overnight-main.log

# 4. Async content moderation — flags problematic reviews/places into the
#    admin reports queue. Non-blocking, runs against last 24h of submissions.
echo "[$(date)] Running content moderation..." >> /tmp/overnight-main.log
npx tsx scripts/moderate-content.ts >> /tmp/overnight-moderation.log 2>&1 || true
echo "[$(date)] Moderation done." >> /tmp/overnight-main.log

# 5. Recompute denormalized review_count / average_rating drift from place_reviews
echo "[$(date)] Recomputing review counts..." >> /tmp/overnight-main.log
npx tsx scripts/recompute-place-stats.ts >> /tmp/overnight-recompute.log 2>&1 || true
echo "[$(date)] Recompute done." >> /tmp/overnight-main.log

echo "=== $(date) overnight jobs complete ===" >> /tmp/overnight-main.log
