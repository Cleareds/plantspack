#!/bin/bash
# Drive scripts/add-place.ts for each payload, marking as --imported.
# Skip --pending so they go live; verification_method='imported' keeps them at level=2.
set -u
PAYLOADS=scripts/seo-out/berlin-import-2026-05-15/payloads.json
RESULTS=scripts/seo-out/berlin-import-2026-05-15/import-results.jsonl
> "$RESULTS"

# Iterate items via node
node <<'NODEEOF' | while IFS= read -r line; do
  if [ -z "$line" ]; then continue; fi
  echo "$line" > /tmp/berlin-payload.json
  NAME=$(echo "$line" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{console.log(JSON.parse(d).name)}catch{}})')
  echo "==> $NAME"
  OUT=$(cat /tmp/berlin-payload.json | npx tsx scripts/add-place.ts --imported 2>&1)
  STATUS=$?
  echo "{\"name\":\"$NAME\",\"status\":$STATUS,\"out\":$(echo "$OUT" | tail -3 | jq -Rs .)}" >> "$RESULTS"
  echo "  status=$STATUS"
done
import { readFileSync } from 'node:fs'
const payloads = JSON.parse(readFileSync('scripts/seo-out/berlin-import-2026-05-15/payloads.json','utf8'))
for (const p of payloads) console.log(JSON.stringify(p))
NODEEOF
echo "Done. Results in $RESULTS"
