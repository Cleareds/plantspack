#!/bin/bash
# Contact sheets of the face crop, one frame per second, 30 frames per sheet, so
# the lens-contact seconds can be marked by eye before cutting.
#   docs/marketing/tiktok-templates/video/gaze-sheet.sh <take.mov> <outDir>
set -euo pipefail
TAKE="$1"; OUT="$2"; mkdir -p "$OUT"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$TAKE" | cut -d. -f1)
N=$(( (DUR + 29) / 30 ))
for i in $(seq 0 $((N - 1))); do
  ffmpeg -v error -y -ss $((i * 30)) -t 30 -i "$TAKE" \
    -vf "fps=1,crop=iw:ih*0.45:0:ih*0.12,scale=300:-1,tile=6x5" -frames:v 1 "$OUT/gaze-$i.jpg"
done
echo "$N sheets in $OUT (sheet i = seconds $((0))..; tile k on sheet i = second i*30+k, row-major)"
