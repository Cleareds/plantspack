#!/bin/bash
# Weekly enrichment - runs Sundays. Catches up on whatever was inserted
# during the week (manual additions, OSM delta scrapes, user submissions).
#
# NO OPENAI WORK RUNS FROM CRON ANY MORE (removed 2026-07-26). Everything left
# in this file is free: Supabase queries, HTTP HEAD checks, view refreshes.
# The AI enrichment steps were pulled because the spend stopped being worth the
# yield - the last run made 260 OpenAI calls (91 of them on the expensive
# web-search model) and produced 6 actionable row changes, with 218 places
# coming back "uncertain". The scripts still exist and can be run by hand:
#
#   npx tsx scripts/bulk-verify-vegan-fast.ts --tier1-only   # cheap pass, no web search
#   npx tsx scripts/generate-missing-descriptions.ts
#   npx tsx scripts/reclassify-vegan-levels.ts --since=2026-07-26T00:00:00Z
#
# Run them deliberately, with a --limit, when there's a reason to.

set -eo pipefail

export PATH="/Users/antonkravchuk/.nvm/versions/node/v21.5.0/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

LOG=/tmp/weekly-enrichment.log
trap 'echo "[$(date)] FAIL line $LINENO (exit $?)" >> $LOG' ERR

cd /Users/antonkravchuk/sidep/Cleareds/plantspack

echo "=== $(date) weekly enrichment starting (no-AI maintenance only) ===" >> $LOG

# 1. Dedup sweep - catches duplicates introduced by the week's inserts
echo "[$(date)] Dedup sweep..." >> $LOG
npx tsx scripts/dedup-archive.ts --apply >> /tmp/weekly-dedup.log 2>&1 || echo "[$(date)] dedup exited non-zero" >> $LOG

# 2. Broken-image audit (slow, ~30-60 min for 24K places)
echo "[$(date)] Broken-image scan..." >> $LOG
npx tsx scripts/detect-broken-images.ts --apply >> /tmp/weekly-broken-images.log 2>&1 || echo "[$(date)] broken-image scan exited non-zero" >> $LOG

# 3. Refresh materialized directory views after the week's bulk mutations
#    (dedup-archive) so /vegan-places counts stay fresh.
echo "[$(date)] Refresh directory views..." >> $LOG
npx tsx -e "
import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
(async () => { const { error } = await sb.rpc('refresh_directory_views'); if (error) { console.error(error.message); process.exit(1); } console.log('refreshed'); })();
" >> /tmp/weekly-refresh-views.log 2>&1 || echo "[$(date)] view refresh failed (non-fatal)" >> $LOG

# 4. End-of-week quality report
DATE=$(date +%Y-%m-%d)
npx tsx scripts/data-quality-report.ts > /tmp/quality-${DATE}-weekly.log 2>&1 || true

echo "=== $(date) weekly enrichment complete ===" >> $LOG
