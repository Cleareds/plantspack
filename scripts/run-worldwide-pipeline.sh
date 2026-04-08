#!/bin/bash
#
# Worldwide Vegan Places Import Pipeline
# =======================================
# Runs the full import pipeline: OSM query → filter → verify → enrich → translate → import
#
# Usage:
#   ./scripts/run-worldwide-pipeline.sh                         # Full pipeline
#   ./scripts/run-worldwide-pipeline.sh --region=north-america  # Single region
#   ./scripts/run-worldwide-pipeline.sh --step=3                # Resume from step 3
#   ./scripts/run-worldwide-pipeline.sh --dry-run               # Skip DB import
#
# All output is logged to scripts/pipeline.log (tee'd to stdout)
#
set -uo pipefail

START_STEP=1
DRY_RUN=false
REGION_ARG=""
LOG_FILE="scripts/pipeline.log"

for arg in "$@"; do
  case $arg in
    --step=*) START_STEP="${arg#*=}" ;;
    --dry-run) DRY_RUN=true ;;
    --region=*) REGION_ARG="$arg" ;;
  esac
done

# Shared variables
OSM_OUTPUT="scripts/osm-worldwide-vegan-places.json"
FILTER_OUTPUT="scripts/high-confidence-places.json"

log() { echo -e "\n\033[1;32m═══ $1 ═══\033[0m\n"; }
elapsed() { echo "$(( ($(date +%s) - START_TIME) / 60 ))m $(( ($(date +%s) - START_TIME) % 60 ))s"; }

START_TIME=$(date +%s)

echo "Pipeline started at $(date)" | tee "$LOG_FILE"
echo "Arguments: $*" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

run_step() {
  local step_num=$1
  local step_name=$2
  shift 2
  local cmd="$@"

  if [ "$START_STEP" -gt "$step_num" ]; then
    echo "⏭️  Skipping step $step_num ($step_name)" | tee -a "$LOG_FILE"
    return 0
  fi

  log "STEP $step_num: $step_name"
  echo "--- Step $step_num started at $(date) ---" >> "$LOG_FILE"

  if eval "$cmd" 2>&1 | tee -a "$LOG_FILE"; then
    echo "✅ Step $step_num done in $(elapsed)" | tee -a "$LOG_FILE"
  else
    echo "❌ Step $step_num FAILED after $(elapsed)" | tee -a "$LOG_FILE"
    echo "   You can resume from this step with: ./scripts/run-worldwide-pipeline.sh --step=$step_num" | tee -a "$LOG_FILE"
    return 1
  fi
}

# ═══ STEP 1: Query OSM ═══
run_step 1 "Query OSM for worldwide vegan places" \
  "npx tsx scripts/import-osm-worldwide.ts --output=$OSM_OUTPUT $REGION_ARG --resume" || exit 1

# ═══ STEP 2: Filter ═══
run_step 2 "Filter high-confidence places" \
  "node scripts/filter-high-confidence.js --input=$OSM_OUTPUT --output=$FILTER_OUTPUT --min-score=45" || exit 1

# ═══ STEP 3: Verify & classify ═══
run_step 3 "Verify & classify (website checks)" \
  "node scripts/verify-and-classify.js --concurrency=15" || exit 1

# ═══ STEP 4: Enrich ═══
run_step 4 "Enrich (images, descriptions, cities)" \
  "node scripts/enrich-places.js --concurrency=10" || exit 1

# ═══ STEP 5: Fetch OSM/Wikidata images ═══
if [ -f scripts/fetch-images.js ]; then
  run_step 5 "Fetch OSM & Wikidata images" \
    "node scripts/fetch-images.js" || true
else
  echo "⏭️  Step 5: fetch-images.js not found, skipping" | tee -a "$LOG_FILE"
fi

# ═══ STEP 6: Translate ═══
run_step 6 "Translate descriptions to English" \
  "npx tsx scripts/translate-places.ts" || true

# ═══ STEP 7: Import to Supabase ═══
if [ "$DRY_RUN" = true ]; then
  log "DRY RUN — Skipping Supabase import"
  npx tsx scripts/import-to-supabase.ts --dry-run 2>&1 | tee -a "$LOG_FILE"
else
  run_step 7 "Import to Supabase" \
    "npx tsx scripts/import-to-supabase.ts --batch-size=50" || exit 1
fi

TOTAL_TIME=$(elapsed)
log "PIPELINE COMPLETE — Total time: $TOTAL_TIME"
echo "Pipeline finished at $(date) — Total: $TOTAL_TIME" >> "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "Results:" | tee -a "$LOG_FILE"
echo "  Raw OSM data:    $OSM_OUTPUT" | tee -a "$LOG_FILE"
echo "  Import-ready:    scripts/import-ready-places.json" | tee -a "$LOG_FILE"
echo "  Log:             $LOG_FILE" | tee -a "$LOG_FILE"
