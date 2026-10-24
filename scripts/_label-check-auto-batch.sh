#!/bin/bash
# One batch of the automated label check (2026-10-14).
#
# ~1,160 places still need a vegan-label check (fully_vegan never checked, or a
# vegetarian name with no vegan evidence). Search is the evidence route and each
# Claude session has a WebSearch cap (~200), so each run does 2 chunks (120 rows)
# and relies on repetition, like _desc-audit-batch.sh.
#
# Each run: research 2 chunks (headless Claude, no DB access) -> apply every
# chunk that has output but no applied marker, with the conservative rules in
# _label-check-apply-2026-10-14.mjs (only high/medium act; archive only at high;
# never archives rows with reviews; per-chunk rollback file) -> re-queue rows the
# agents marked "unchecked". When nothing is left it unloads its own launchd job.
#
# Installed as ~/Library/LaunchAgents/com.plantspack.label-check.plist (every 15 min).
#   launchctl bootout gui/$(id -u)/com.plantspack.label-check   # to stop by hand
# Progress: reports/label-check/auto/RUNLOG.md and /tmp/label-check.log

set -eo pipefail

export PATH="/Users/antonkravchuk/.local/bin:/Users/antonkravchuk/.nvm/versions/node/v24.22.1/bin:/Users/antonkravchuk/.nvm/versions/node/v22.19.0/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

REPO=/Users/antonkravchuk/sidep/Cleareds/plantspack
cd "$REPO"

A=reports/label-check/auto
mkdir -p "$A/out" "$A/applied"

pending_chunks() {
  PENDING=()
  for f in "$A"/chunks/*.json; do
    [ -e "$f" ] || continue
    b=$(basename "$f" .json)
    [ -f "$A/out/$b.json" ] || PENDING+=("$b")
  done
}

apply_new_outputs() {
  for f in "$A"/out/*.json; do
    [ -e "$f" ] || continue
    b=$(basename "$f" .json)
    [ -f "$A/applied/$b.done" ] && continue
    # A half-written or broken file must not be applied (and must not block the rest).
    if ! node -e "const a=JSON.parse(require('fs').readFileSync('$f','utf8')); if(!Array.isArray(a)||!a.length) process.exit(1)"; then
      echo "skip $b: output is not a JSON array"; continue
    fi
    echo "--- apply $b"
    node scripts/_label-check-apply-2026-10-14.mjs "$f" --tag="label-check-auto-$b" --apply \
      | tee "$A/applied/$b.done"
  done
}

echo "=== $(date) label-check run ==="

# Outputs from a run that was killed after research but before apply.
apply_new_outputs

pending_chunks
if [ ${#PENDING[@]} -eq 0 ]; then
  node scripts/_label-check-auto-prep.mjs --requeue
  pending_chunks
fi
if [ ${#PENDING[@]} -eq 0 ]; then
  echo "=== queue empty: unloading com.plantspack.label-check ==="
  echo "## $(date +%F) queue empty - runner unloaded itself" >> "$A/RUNLOG.md"
  launchctl bootout "gui/$(id -u)/com.plantspack.label-check" || true
  exit 0
fi

BATCH=("${PENDING[@]:0:2}")
LIST="${BATCH[*]}"
echo "queue: ${#PENDING[@]} chunks pending; this run: $LIST"

# Scoped allowlist, NOT a blanket bypass: read the repo, web lookups, spawn
# agents, write ONLY the chunk outputs and the run log. No database access -
# applying is done by this wrapper with the reviewed apply script.
claude -p "Run one batch of the PlantsPack label check.

The chunks for THIS batch are already selected - do not re-derive them:
$LIST

Spawn one subagent per chunk, in parallel, each with exactly this task:
  Read $REPO/$A/BRIEF.md and follow it exactly.
  Chunk name: <NAME>
  Input:  $REPO/$A/chunks/<NAME>.json
  Output: $REPO/$A/out/<NAME>.json
  Lookup budget: 80 lookups (WebSearch + WebFetch together) for the chunk.
  Reply with ONE LINE only, in the format the brief specifies.

When they finish, append each one-line result to $A/RUNLOG.md under a
'## <today's date and time>' heading.

Do NOT modify the database or any file outside $A/out/ and $A/RUNLOG.md.
If WebSearch reports its budget is exhausted, tell the subagents to write their
remaining rows as unchecked and stop." \
  --allowedTools "Read" "Grep" "Glob" "WebSearch" "WebFetch" "Task" "Agent" \
                 "Edit($A/out/*)" "Edit($A/RUNLOG.md)" \
  --max-turns 150 || echo "claude exited non-zero; applying whatever was written"
# NB: path rules must be Edit(...), not Write(...) - see _desc-audit-batch.sh.

apply_new_outputs
node scripts/_label-check-auto-prep.mjs --requeue || true
echo "=== $(date) label-check run done ==="
