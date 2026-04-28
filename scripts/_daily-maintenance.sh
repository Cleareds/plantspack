#!/bin/bash
# Daily light maintenance - cheap tasks that genuinely need to run every day.
# OpenAI-heavy enrichment lives in _weekly-enrichment.sh, not here.

set -eo pipefail

export PATH="/Users/antonkravchuk/.nvm/versions/node/v21.5.0/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

trap 'echo "[$(date)] FAIL line $LINENO (exit $?)" >> /tmp/daily-maintenance.log' ERR

cd /Users/antonkravchuk/sidep/Cleareds/plantspack

LOG=/tmp/daily-maintenance.log
echo "=== $(date) daily maintenance starting ===" >> $LOG

# 1. Refresh materialized directory views (countries, cities). These power
#    the /vegan-places counts and city pages. Bulk DB ops (reclassify, dedup,
#    description fills) mutate places without going through the API routes
#    that auto-refresh, so the views drift stale until something else triggers
#    a refresh. Cheap (sub-second), idempotent, prevents stale public counts.
echo "[$(date)] Refresh directory views..." >> $LOG
npx tsx -e "
import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
(async () => { const { error } = await sb.rpc('refresh_directory_views'); if (error) { console.error(error.message); process.exit(1); } console.log('refreshed'); })();
" >> /tmp/daily-refresh-views.log 2>&1 || echo "[$(date)] view refresh failed (non-fatal)" >> $LOG

# 2. Moderation queue for last 24h of submissions
echo "[$(date)] Moderation..." >> $LOG
npx tsx scripts/moderate-content.ts >> /tmp/daily-moderation.log 2>&1 || echo "[$(date)] moderation failed (non-fatal)" >> $LOG

# 3. Recompute denormalized review_count / average_rating drift
echo "[$(date)] Recompute stats..." >> $LOG
npx tsx scripts/recompute-place-stats.ts >> /tmp/daily-recompute.log 2>&1 || echo "[$(date)] recompute failed (non-fatal)" >> $LOG

# 4. Daily quality snapshot
echo "[$(date)] Quality report..." >> $LOG
DATE=$(date +%Y-%m-%d)
npx tsx scripts/data-quality-report.ts > /tmp/quality-${DATE}.log 2>&1 || true

echo "=== $(date) daily maintenance complete ===" >> $LOG
