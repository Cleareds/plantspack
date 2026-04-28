#!/bin/bash
# Territories + new-countries import - runs at 06:00 CEST (04:00 UTC).
# Waits for the all-countries import to finish, then imports territories,
# runs the new-countries second pass, and finally re-runs the full enrichment
# pipeline (verify -> descriptions -> reclassify) to cover all new additions.

set -eo pipefail

# Cron's PATH excludes nvm. Pin the active node version explicitly so npx works.
export PATH="/Users/antonkravchuk/.nvm/versions/node/v21.5.0/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

cd /Users/antonkravchuk/sidep/Cleareds/plantspack

LOG=/tmp/overnight-territories.log

trap 'echo "[$(date)] FAIL line $LINENO (exit $?)" >> $LOG' ERR

# Stamp the run start so a prior territories cycle leaves a clear "since" cutoff
# for the reclassify pass below (only re-score places imported by THIS run).
SINCE_STAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

echo "=== $(date) territories/new-countries job starting ===" >> $LOG

# Wait for OSM all-countries to finish if still running
while pgrep -f "import-osm-all-countries" > /dev/null; do
  echo "[$(date)] OSM all-countries still running, waiting 5 min..." >> $LOG
  sleep 300
done

# 1. Territories import (islands, overseas departments, dependencies)
echo "[$(date)] Starting territories import..." >> $LOG
npx tsx scripts/import-osm-territories.ts >> $LOG 2>&1
echo "[$(date)] Territories done." >> $LOG

# 2. Second pass: new countries added after the initial 101-country run
echo "[$(date)] Starting new-countries pass..." >> $LOG
npx tsx scripts/import-osm-all-countries.ts --only=americas --resume >> $LOG 2>&1
npx tsx scripts/import-osm-all-countries.ts --only=africa --resume >> $LOG 2>&1
npx tsx scripts/import-osm-all-countries.ts --only=asia --resume >> $LOG 2>&1
npx tsx scripts/import-osm-all-countries.ts --only=oceania --resume >> $LOG 2>&1
echo "[$(date)] New-countries pass done." >> $LOG

# 3. Verify new fully_vegan imports
echo "[$(date)] Verifying new fully_vegan places..." >> $LOG
npx tsx scripts/bulk-verify-vegan-fast.ts >> /tmp/overnight-verify2.log 2>&1
echo "[$(date)] Verification done." >> $LOG

# 4. Generate descriptions for anything still missing
echo "[$(date)] Generating missing descriptions..." >> $LOG
npx tsx scripts/generate-missing-descriptions.ts >> /tmp/overnight-descriptions2.log 2>&1
echo "[$(date)] Descriptions done." >> $LOG

# 5. Reclassify with fresh descriptions - scoped to places imported in this run.
# The midnight job already covered the existing corpus, so re-running over all
# ~54K places nightly is wasted spend. --since limits to created_at >= cutoff.
echo "[$(date)] Reclassifying places imported since $SINCE_STAMP..." >> $LOG
npx tsx scripts/reclassify-vegan-levels.ts --since="$SINCE_STAMP" >> /tmp/overnight-reclassify2.log 2>&1
echo "[$(date)] Reclassification done." >> $LOG

# 6. Weekly dedup sweep (Sundays) — catches any duplicates introduced by
# the territories + new-countries imports. Runs after enrichment so the
# winner-selection scoring sees the freshest data.
if [ "$(date +%u)" = "7" ]; then
  echo "[$(date)] Sunday dedup sweep..." >> $LOG
  npx tsx scripts/dedup-archive.ts --apply >> /tmp/overnight-dedup.log 2>&1
  echo "[$(date)] Dedup done." >> $LOG

  # Weekly broken-image audit (Sundays only — slow, ~30-60 min for 24K places)
  echo "[$(date)] Weekly broken-image scan..." >> $LOG
  npx tsx scripts/detect-broken-images.ts --apply >> /tmp/broken-images-weekly.log 2>&1 || true
  echo "[$(date)] Broken-image scan done." >> $LOG
fi

echo "=== $(date) all jobs complete ===" >> $LOG
