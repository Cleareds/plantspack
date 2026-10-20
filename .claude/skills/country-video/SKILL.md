---
name: country-video
description: Video factory for the "one country per week" series. Invoke via /country-video <path-to-face-take.mov> [country], or when the user says "cut the <country> video" / "assemble the video from my recording". Transcribes the take, finds where the user looks into the lens, maps every script line to face or app footage, records missing app clips on the iOS simulator, builds the 9:16 video with captions and outro, and gives honest delivery feedback.
---

# country-video

Inputs: a vertical face recording (any resolution, 30 fps) and the country. Output: `docs/marketing/tiktok-<yyyy-mm>/<name>-final.mp4` (1080x1920) plus a spec file that can be edited and rebuilt. Tooling lives in `docs/marketing/tiktok-templates/video/` (web repo) and `mobileapp/scripts/tiktok/` (simulator recorder).

Prerequisites (all present on this Mac, see memory `project_mobile_app_build_toolchain`): whisper venv `~/.venvs/whisper` (openai-whisper + pillow, model cached), ffmpeg, Playwright + Chrome, Maestro in `~/.maestro/bin`, JDK 17 in `~/jdk17`, the local Release simulator app at `mobileapp/ios/build/Build/Products/Release-iphonesimulator/PlantsPack.app`, simulator "PlantsPack Rec 26" (iOS 26.x; the app crashes on iOS 27 simulators).

## Procedure

1. **Transcribe.** `~/.venvs/whisper/bin/python docs/marketing/tiktok-templates/video/transcribe.py "<take.mov>"` -> segments on stdout, words in `<take>.transcript.json`. Identify retakes (the same line said twice: keep the later, cleaner one) and the clean ranges to keep.

2. **Gaze review.** `docs/marketing/tiktok-templates/video/gaze-sheet.sh "<take.mov>" <scratchDir>` and READ every sheet (one tile per second, 30 per sheet). Note the seconds where the eyes are on the lens. Those, and only those, stay on the face: the hook, admissions ("it's not perfect"), and the ask. Everything read off-camera becomes app footage with the voice underneath.

3. **Map lines to footage.** For each kept range decide: face, an existing clip (`video1-app-clips`, `video<N>-app-clips`, README tables list what each shows), a slideshow still (`country-slides/<country>/slides/story/0N-xx-story.png`), or a new clip. New clips, from the web repo root, with the simulator booted:
   - place page: `mobileapp/scripts/tiktok/record.sh <outDir> --place <slug> "<visible name>" <clipName>`
   - map move: `mobileapp/scripts/tiktok/record.sh <outDir> --map "plantspack:///?lat=..&lng=..&zoom=..&duration=300" "plantspack:///?lat=..&lng=..&zoom=..&duration=4500" <clipName>`
   Several `--place`/`--map` groups can follow in one call. Check each clip with a frame strip (`ffmpeg -vf "fps=1/2,scale=240:-1,tile=8x1"`): the header must be visible on a place page, the map must actually move. Gotchas are in the clip README (recorder writes frames only while pixels change; a 1% nudge is a tap; a delayed zoomTo in a deep link fires before the recorder starts).

4. **Spec + build.** Write `<name>.spec.json` (format documented at the top of `build-video.py`: `parts` = kept source ranges, `cuts`/`stills`/`captions` in SOURCE time, optional `outro`). Captions: 2-6 words, numbers only when they are in the audio, `low` for face segments, `top` for app footage, never over a slide's own title. Build: `~/.venvs/whisper/bin/python docs/marketing/tiktok-templates/video/build-video.py <spec.json>`. Review with a frame sheet (`fps=1/4,tile=8x3`); fix caption collisions and gaps.

5. **Content check** against the database and the memory notes for the country: every number spoken must match the live counts (or be marked "re-check on posting day"), places named must be live and labelled as described, no region league tables, no "verified" claims for label counts.

6. **Honest delivery feedback** to the user, concrete and kind: eye contact (seconds on/off lens), background and light, audio levels (ffmpeg `volumedetect`), length vs the 30-60 s target with named cut candidates, and any spoken claim that does not match the data.

7. **Report**: final path and length, the face/app split, new clips recorded, the spec path for edits, the caption suggestion, and what is NOT done (not posted).

## Never

- Never keep off-camera reading on the face when app footage can cover the line.
- Never invent a caption number that is not spoken or in the data.
- Never publish OTA, post, or touch the mobile repo beyond `scripts/tiktok/` from this skill.
