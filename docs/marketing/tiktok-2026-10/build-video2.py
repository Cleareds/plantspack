"""TikTok video 2 - "Vegan Belgium". Face take 2026-10-16 19-16-13.mov (119 s).

Timeline (final = source minus the removed retakes):
  part A  src 0.60-56.60   hook + numbers + Ghent + Pepas + frituurs (first "open data" start is cut)
  part B  src 74.80-101.70 clean "open data / closed places / tell us" + Wallonia + "fix the most"
  part C  src 110.70-116.10 final ask (second, cleaner take)
Face stays on screen only where he looks into the lens: the hook (0-5 s), the
open-data admission (src 74.8-86.3) and the final ask. Everything else is app
footage or the slideshow still, with his audio continuing underneath.
Run: ~/.venvs/whisper/bin/python build-video2.py   (needs Pillow + ffmpeg)
"""
import subprocess, os
S = os.path.dirname(os.path.abspath(__file__))
FACE = "/Users/antonkravchuk/sidep/2026-10-16 19-16-13.mov"
C1 = f"{S}/video1-app-clips/video/mp4"       # clips recorded for video 1 (reused)
C2 = f"{S}/video2-app-clips/video/mp4"       # clips recorded for video 2
SLIDES = "/Users/antonkravchuk/sidep/Cleareds/plantspack/docs/marketing/tiktok-templates/country-slides/belgium/slides"
OUT = f"{S}/video2-final.mp4"
W, H = 1080, 1920
from PIL import Image, ImageDraw, ImageFont

def run(cmd):
    print(" ".join(cmd)[:300]); subprocess.run(cmd, check=True)

# ---- 1. base: three parts of the face take, scaled, audio normalised
parts = [(0.60, 56.60), (74.80, 101.70), (110.70, 116.10)]
offs = []  # final-time offset for each part: final = src - part_start + offs[i]
t = 0.0
for a, b in parts:
    offs.append(t); t += b - a
TOTAL = t
def fin(src):
    for (a, b), o in zip(parts, offs):
        if a - 0.01 <= src <= b + 0.01: return round(src - a + o, 2)
    raise ValueError(f"src {src} not in a kept part")
base = f"{S}/base2.mp4"
fc = []
for i, (a, b) in enumerate(parts):
    fc.append(f"[0:v]trim={a}:{b},setpts=PTS-STARTPTS,scale={W}:{H},fps=30[v{i}]")
    fc.append(f"[0:a]atrim={a}:{b},asetpts=PTS-STARTPTS[a{i}]")
fc.append("".join(f"[v{i}][a{i}]" for i in range(len(parts))) + f"concat=n={len(parts)}:v=1:a=1[v][a];[a]loudnorm=I=-16:TP=-1.5:LRA=11[an]")
run(["ffmpeg","-v","error","-y","-i",FACE,"-filter_complex",";".join(fc),
     "-map","[v]","-map","[an]","-c:v","libx264","-preset","fast","-crf","16","-c:a","aac","-b:a","192k",base])

# ---- 2. cutaways: (final_start, final_end, file, source offset)
cuts = [
    (fin(6.70),  fin(15.30), f"{C1}/06-map-belgium.mp4", 0.0),           # "almost 700 places ... 100 fully vegan"
    (fin(15.30), fin(25.10), f"{C1}/07-map-vegan-toggle.mp4", 0.0),      # "Brussels most ... Ghent surprised me" (Ghent, 100% Vegan filter)
    (fin(36.00), fin(44.80), f"{C1}/03-place-pepas-scroll.mp4", 0.0),    # "Belgium has a fully vegan frituur. Pepas ..."
    (fin(44.80), fin(56.60), f"{C2}/10-place-frituur-franky.mp4", 0.0),  # "normal frituurs ... Ostend and Wetteren"
    (fin(88.40), fin(96.00), f"{C2}/11-map-wallonia-to-liege.mp4", 0.0), # "And Wallonia ... about 100 places"
    (fin(96.00), fin(101.70), f"{C2}/12-place-ventre-content.mp4", 0.0), # "four fully vegan ... fix the most"
]
stills = [  # (final_start, final_end, png)
    (fin(25.10), fin(36.00), f"{SLIDES}/03-be.png"),                    # "22 of them ... veggie day ... Antwerp and Leuven" (cities chart)
]
# ---- 3. captions (PIL -> transparent PNG), (start, end, text, position)
font = ImageFont.truetype("/System/Library/Fonts/Avenir Next.ttc", 64, index=0)
try: font = ImageFont.truetype("/System/Library/Fonts/Avenir Next.ttc", 64, index=2)
except Exception: pass
caps = [
    (fin(0.80), fin(5.80), "Belgium: country #1", "low"),
    (fin(6.80), fin(14.60), "688 places. 106 fully vegan.", "top"),
    (fin(17.00), fin(24.40), "Ghent: 22 fully vegan", "top"),
    (fin(26.50), fin(31.70), "Veggie Thursday since 2009", "low"),
    (fin(37.30), fin(44.10), "Pepas, Leuven: fully vegan frituur", "top"),
    (fin(49.00), fin(52.60), "Added this week:\nOstend + Wetteren", "top"),
    (fin(74.90), fin(86.40), "Some data comes from open maps.\nWe fix what you report.", "low"),
    (fin(88.50), fin(95.00), "Wallonia: ~100 places", "top"),
    (fin(110.70), fin(116.00), "Which country next?\nMost liked comment wins.", "low"),
]
cap_files = []
for i, (s, e, text, pos) in enumerate(caps):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    lines = text.split("\n"); lh = 84
    tw = max(d.textlength(l, font=font) for l in lines); th = lh * len(lines)
    y0 = int(H * (0.12 if pos == "top" else 0.80)) - th // 2
    pad = 28
    d.rounded_rectangle([(W - tw) / 2 - pad, y0 - pad + 8, (W + tw) / 2 + pad, y0 + th + pad - 8], radius=28, fill=(0, 0, 0, 170))
    for j, l in enumerate(lines):
        d.text(((W - d.textlength(l, font=font)) / 2, y0 + j * lh), l, font=font, fill=(255, 255, 255, 255))
    p = f"{S}/cap2_{i}.png"; img.save(p); cap_files.append((s, e, p))

# ---- 4. one ffmpeg: base + overlays, 0.35 s dissolves (same logic as video 1)
XFD = 0.35
layers = [("vid", s0, e0, f, off) for (s0, e0, f, off) in cuts] + [("img", s0, e0, f, None) for (s0, e0, f) in stills]
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
MAIN = f"{S}/main2.mp4"
run(["ffmpeg","-v","error","-y",*inputs,"-filter_complex",";".join(fc),"-map","[vout]","-map","0:a",
     "-c:v","libx264","-preset","slow","-crf","18","-r","30","-c:a","aac","-b:a","192k","-shortest",MAIN])
# ---- 5. outro, 0.4 s crossfade
OUTRO = f"{S}/outro.mp4"
dur = float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",MAIN]).decode().strip())
odur = float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",OUTRO]).decode().strip())
XF = 0.4
run(["ffmpeg","-v","error","-y","-i",MAIN,"-i",OUTRO,"-f","lavfi","-t",str(odur),"-i","anullsrc=r=48000:cl=stereo","-filter_complex",
     f"[0:v][1:v]xfade=transition=fade:duration={XF}:offset={dur-XF:.3f}[v];[0:a][2:a]acrossfade=d={XF}[a]",
     "-map","[v]","-map","[a]","-c:v","libx264","-preset","slow","-crf","18","-r","30","-c:a","aac","-b:a","192k","-movflags","+faststart",OUT])
print("final", OUT, "face parts total", round(TOTAL, 1), "s + outro", odur)
