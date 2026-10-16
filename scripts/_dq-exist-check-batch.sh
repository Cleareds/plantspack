#!/bin/bash
# Research-only existence check (data-quality 5, 2026-10-15). Same pattern as
# _label-check-auto-batch.sh, but it never applies anything: the results are applied
# by scripts/_dq-exist-apply-2026-10-15.mjs after a human-readable dry run.
#   scripts/_dq-exist-check-batch.sh <dir>      (dir has chunks/ and out/)
# Each run researches the next 2 chunks that have no output.
set -eo pipefail
export PATH="/Users/antonkravchuk/.local/bin:/Users/antonkravchuk/.nvm/versions/node/v22.19.0/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
REPO=/Users/antonkravchuk/sidep/Cleareds/plantspack
cd "$REPO"
D=${1:?dir}
BRIEF=reports/dq-2026-10-15/BRIEF-EXIST.md
PENDING=()
for f in "$D"/chunks/*.json; do b=$(basename "$f" .json); [ -f "$D/out/$b.json" ] || PENDING+=("$b"); done
[ ${#PENDING[@]} -eq 0 ] && { echo "nothing pending in $D"; exit 0; }
LIST="${PENDING[*]:0:2}"
echo "=== $(date) exist-check $D: ${#PENDING[@]} pending; this run: $LIST"
claude -p "Run one batch of the PlantsPack existence check.
Chunks for THIS batch (already selected): $LIST
Spawn one subagent per chunk, in parallel, each with exactly this task:
  Read $REPO/$BRIEF and follow it exactly.
  Chunk name: <NAME>
  Input:  $REPO/$D/chunks/<NAME>.json
  Output: $REPO/$D/out/<NAME>.json
  Lookup budget: 80 lookups (WebSearch + WebFetch together) for the chunk.
  Reply with ONE LINE only, in the format the brief specifies.
When they finish, append each one-line result to $D/RUNLOG.md under a '## <date time>' heading.
Do NOT modify the database or any file outside $D/out/ and $D/RUNLOG.md.
If WebSearch reports its budget is exhausted, tell the subagents to write their remaining rows as unchecked and stop." \
  --allowedTools "Read" "Grep" "Glob" "WebSearch" "WebFetch" "Task" "Agent" "Edit($D/out/*)" "Edit($D/RUNLOG.md)" \
  --max-turns 150 || echo "claude exited non-zero"
echo "=== $(date) done"
