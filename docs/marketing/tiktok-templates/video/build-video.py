"""Spec-driven TikTok video builder (face take + app clips + stills + captions + outro).

    ~/.venvs/whisper/bin/python docs/marketing/tiktok-templates/video/build-video.py <spec.json>

spec.json:
{
  "face": "/path/to/take.mov",                 # the camera recording (any size, scaled to 1080x1920)
  "out": "/path/to/final.mp4",
  "parts": [[0.6, 56.6], [74.8, 101.7]],        # source ranges to KEEP, in order (retakes cut out)
  "cuts": [ {"from": 6.7, "to": 15.3, "file": "clip.mp4", "offset": 0.0} ],   # source times of the face take
  "stills": [ {"from": 25.1, "to": 36.0, "file": "slide.png"} ],
  "captions": [ {"from": 0.8, "to": 5.8, "text": "Belgium: country #1", "pos": "low"} ],
  "outro": "/path/to/outro.mp4"                 # optional
}
All times are SOURCE times of the face take; the builder maps them onto the
final timeline after the parts are concatenated. Cutaways dissolve 0.35 s.
Audio is the face take, loudness-normalised to -16 LUFS.
"""
import json, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

spec = json.load(open(sys.argv[1]))
S = os.path.dirname(os.path.abspath(sys.argv[1]))
FACE, OUT = spec["face"], spec["out"]
W, H = 1080, 1920

def run(cmd):
    print(" ".join(cmd)[:240]); subprocess.run(cmd, check=True)

parts = [tuple(p) for p in spec["parts"]]
offs, t = [], 0.0
for a, b in parts: offs.append(t); t += b - a
def fin(src):
    for (a, b), o in zip(parts, offs):
        if a - 0.01 <= src <= b + 0.01: return round(src - a + o, 2)
    raise ValueError(f"source time {src} is inside a removed range")

# 1. base: kept parts, scaled, audio normalised
base = os.path.join(S, "_base.mp4")
fc = []
for i, (a, b) in enumerate(parts):
    fc.append(f"[0:v]trim={a}:{b},setpts=PTS-STARTPTS,scale={W}:{H},fps=30[v{i}]")
    fc.append(f"[0:a]atrim={a}:{b},asetpts=PTS-STARTPTS[a{i}]")
fc.append("".join(f"[v{i}][a{i}]" for i in range(len(parts))) + f"concat=n={len(parts)}:v=1:a=1[v][a];[a]loudnorm=I=-16:TP=-1.5:LRA=11[an]")
run(["ffmpeg", "-v", "error", "-y", "-i", FACE, "-filter_complex", ";".join(fc), "-map", "[v]", "-map", "[an]",
     "-c:v", "libx264", "-preset", "fast", "-crf", "16", "-c:a", "aac", "-b:a", "192k", base])

# 2. captions -> PNG overlays
font = ImageFont.truetype("/System/Library/Fonts/Avenir Next.ttc", 64, index=0)
try: font = ImageFont.truetype("/System/Library/Fonts/Avenir Next.ttc", 64, index=2)
except Exception: pass
cap_files = []
for i, c in enumerate(spec.get("captions", [])):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    lines = c["text"].split("\n"); lh = 84
    tw = max(d.textlength(l, font=font) for l in lines); th = lh * len(lines)
    y0 = int(H * (0.12 if c.get("pos", "top") == "top" else 0.80)) - th // 2
    pad = 28
    d.rounded_rectangle([(W - tw) / 2 - pad, y0 - pad + 8, (W + tw) / 2 + pad, y0 + th + pad - 8], radius=28, fill=(0, 0, 0, 170))
    for j, l in enumerate(lines):
        d.text(((W - d.textlength(l, font=font)) / 2, y0 + j * lh), l, font=font, fill=(255, 255, 255, 255))
    p = os.path.join(S, f"_cap{i}.png"); img.save(p); cap_files.append((fin(c["from"]), fin(c["to"]), p))

# 3. overlays with dissolves
XFD = 0.35
layers = [("vid", fin(c["from"]), fin(c["to"]), c["file"], c.get("offset", 0.0)) for c in spec.get("cuts", [])]
layers += [("img", fin(s["from"]), fin(s["to"]), s["file"], None) for s in spec.get("stills", [])]
layers.sort(key=lambda L: L[1])
inputs = ["-i", base]; fc = []; cur = "[0:v]"; n = 1
for i, (kind, s0, e0, f, off) in enumerate(layers):
    nxt = layers[i + 1][1] if i + 1 < len(layers) else None
    chained = nxt is not None and nxt <= e0 + 0.05
    hold = e0 + (XFD if chained else 0)
    length = round(hold - s0 + 0.3, 2)
    if kind == "vid":
        inputs += ["-ss", str(off), "-t", str(length), "-i", f]
        pre = f"[{n}:v]setpts=PTS-STARTPTS,scale={W}:{H},format=yuva420p"
    else:
        inputs += ["-loop", "1", "-t", str(length), "-i", f]
        pre = (f"[{n}:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},gblur=sigma=40,eq=brightness=-0.05[bg{n}];"
               f"[{n}:v]scale=-2:{H}[fg{n}];[bg{n}][fg{n}]overlay=(W-w)/2:(H-h)/2,setpts=PTS-STARTPTS,format=yuva420p")
    fades = f"fade=t=in:st=0:d={XFD}:alpha=1"
    if not chained:
        fades += f",fade=t=out:st={max(0, e0 - s0 - XFD):.2f}:d={XFD}:alpha=1"
    fc.append(f"{pre},{fades},setpts=PTS+{s0}/TB[c{n}]")
    fc.append(f"{cur}[c{n}]overlay=0:0:enable='between(t,{s0},{hold})':eof_action=pass:format=auto[v{n}]"); cur = f"[v{n}]"; n += 1
for (s0, e0, f) in cap_files:
    inputs += ["-loop", "1", "-t", str(round(e0 - s0 + 0.2, 2)), "-i", f]
    fc.append(f"[{n}:v]format=yuva420p,fade=t=in:st=0:d=0.25:alpha=1,fade=t=out:st={max(0, e0 - s0 - 0.25):.2f}:d=0.25:alpha=1,setpts=PTS-STARTPTS+{s0}/TB[c{n}]")
    fc.append(f"{cur}[c{n}]overlay=0:0:enable='between(t,{s0},{e0})':eof_action=pass:format=auto[v{n}]"); cur = f"[v{n}]"; n += 1
fc.append(f"{cur}format=yuv420p[vout]")
main = os.path.join(S, "_main.mp4")
run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(fc), "-map", "[vout]", "-map", "0:a",
     "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-r", "30", "-c:a", "aac", "-b:a", "192k", "-shortest", main])

# 4. outro
if spec.get("outro"):
    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", main]).decode().strip())
    odur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", spec["outro"]]).decode().strip())
    XF = 0.4
    run(["ffmpeg", "-v", "error", "-y", "-i", main, "-i", spec["outro"], "-f", "lavfi", "-t", str(odur), "-i", "anullsrc=r=48000:cl=stereo", "-filter_complex",
         f"[0:v][1:v]xfade=transition=fade:duration={XF}:offset={dur - XF:.3f}[v];[0:a][2:a]acrossfade=d={XF}[a]",
         "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-r", "30", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", OUT])
else:
    os.replace(main, OUT)
print("final", OUT, "face parts", round(t, 1), "s")
