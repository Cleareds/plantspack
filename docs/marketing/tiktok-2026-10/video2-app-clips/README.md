# TikTok video 2 "Vegan Belgium" - app clips (iOS Simulator, recorded 2026-10-19)

Same pipeline as video1-app-clips: `mobileapp/scripts/tiktok/record.sh <outDir> 10 11 12`.
Assembled by `../build-video2.py` -> `../video2-final.mp4` (face take 2026-10-16 19-16-13.mov).

| Script line | Clip |
|---|---|
| "more and more normal frituurs have a labelled vegan range ... Ostend and Wetteren" | 10-place-frituur-franky.mp4 (page header, Vegan Friendly badge, scroll to the About text that says "labelled vegan range") |
| "And Wallonia, the French-speaking south ... about 100 places" | 11-map-wallonia-to-liege.mp4 (wide over Namur, eases into Liege; the zoom is a second deep link fired by 11-rec.yaml while recording) |
| "we found just four fully vegan ones that are still open" | 12-place-ventre-content.mp4 (Fully Vegan badge, "Confirmed by the community", hours) |

Reused from video 1: 06-map-belgium, 07-map-vegan-toggle (Ghent, 100% Vegan filter), 03-place-pepas-scroll.
Slideshow still `tiktok-templates/country-slides/belgium/slides/03-be.png` covers "22 of them ... Antwerp and Leuven".

Gotchas learned: the simulator recorder writes frames only while pixels change, so a
place-page clip needs a short real swipe first (4-5% of the screen, 450 ms) or the
header is never in the clip; a 1% "nudge" registers as a TAP (it opened the sign-up
sheet). A delayed `zoomTo` in the deep link fires before the recorder starts: trigger
the second move from the rec flow instead.
