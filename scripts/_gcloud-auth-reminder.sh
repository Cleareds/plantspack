#!/bin/bash
# Daily: if the gcloud ADC login (used by seo-monitor and the GSC scripts) has expired,
# show a macOS notification. Silent when the login still works.
export PATH="/opt/homebrew/bin:/usr/local/bin:/opt/homebrew/share/google-cloud-sdk/bin:$PATH"
if ! gcloud auth application-default print-access-token >/dev/null 2>&1; then
  osascript -e 'display notification "Run: gcloud auth application-default login" with title "PlantsPack: Google login expired" subtitle "Weekly SEO report and GSC scripts need it" sound name "Glass"'
fi
