#!/bin/bash
# Monthly OSM closure check (data-quality 10). FLAG ONLY: deleted / disused OSM objects go to
# /data-quality Research Review; stale osm_refs (venue re-mapped) are relinked. Nothing is archived.
# Installed as ~/Library/LaunchAgents/com.plantspack.osm-closure.plist (1st of the month, 09:00).
# Log: /tmp/osm-closure.log, report: reports/osm-closure/<date>.json
set -eo pipefail
export PATH="/Users/antonkravchuk/.nvm/versions/node/v22.19.0/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
cd /Users/antonkravchuk/sidep/Cleareds/plantspack
echo "=== $(date) osm-closure monthly ==="
node scripts/osm-closure-check.mjs --relink --file
echo "=== $(date) done ==="
