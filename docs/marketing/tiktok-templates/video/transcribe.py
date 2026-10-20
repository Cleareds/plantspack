"""Transcribe a face take with word timestamps and print cut-friendly output.

    ~/.venvs/whisper/bin/python docs/marketing/tiktok-templates/video/transcribe.py <take.mov> [out.json]

Prints segments (start-end text) and writes the full whisper result (with words)
to out.json (default: next to the take, <take>.transcript.json). Use the word
times to place cuts between retakes and to time captions.
"""
import json, os, subprocess, sys, tempfile
import whisper

take = sys.argv[1]
out = sys.argv[2] if len(sys.argv) > 2 else os.path.splitext(take)[0] + ".transcript.json"
wav = os.path.join(tempfile.gettempdir(), "take16k.wav")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", take, "-vn", "-ac", "1", "-ar", "16000", wav], check=True)
model = whisper.load_model("small", download_root=os.path.expanduser("~/.cache/whisper"))
r = model.transcribe(wav, language="en", word_timestamps=True, fp16=False)
json.dump(r, open(out, "w"))
for s in r["segments"]:
    print(f"{s['start']:6.1f}-{s['end']:6.1f} {s['text'].strip()}")
print("words ->", out)
