#!/usr/bin/env python3
"""
Build a 1200x630 collage hero from real PlantsPack place hero images.
3x2 grid (6 tiles, each 400x315). Used as the welcome-blog-post hero
to visually represent "directory of real vegan places worldwide".

Saves to /tmp/blog-collage.png. The Node uploader script then pushes it
to Supabase storage and updates posts.image_url.
"""
from PIL import Image, ImageDraw

PLACES = [
    # 6 local files pre-downloaded via curl into /tmp/collage-imgs/
    ('Plates (London)',           '/tmp/collage-imgs/plates.bin'),
    ('DreamCATchers (Ghent)',     '/tmp/collage-imgs/morris.bin'),  # repurposed slot
    ('Plant A Pizza (Ghent)',     '/tmp/collage-imgs/sereda.bin'),  # repurposed slot
    ('Forrest & Friends (Diest)', '/tmp/collage-imgs/forrest.bin'),
    ('Greenhouse Spa Retreat',    '/tmp/collage-imgs/greenhouse.bin'),
    ('Adele Forme Vegane (Ravenna)','/tmp/collage-imgs/adele.bin'),
]

CANVAS_W, CANVAS_H = 1200, 630
COLS, ROWS = 3, 2
GAP = 4  # tile separator px
TILE_W = (CANVAS_W - GAP * (COLS - 1)) // COLS
TILE_H = (CANVAS_H - GAP * (ROWS - 1)) // ROWS

def fetch(path):
    """Read local file pre-downloaded via curl. Skips Python's SSL config mess."""
    return Image.open(path).convert('RGB')

def fit(img, w, h):
    """Resize + center-crop to fill exactly (w, h) without distortion."""
    iw, ih = img.size
    iar, tar = iw / ih, w / h
    if iar > tar:
        nh = h
        nw = int(iar * h)
    else:
        nw = w
        nh = int(w / iar)
    img = img.resize((nw, nh), Image.LANCZOS)
    left = (nw - w) // 2
    top = (nh - h) // 2
    return img.crop((left, top, left + w, top + h))

def main():
    canvas = Image.new('RGB', (CANVAS_W, CANVAS_H), (245, 249, 244))
    success = 0
    fallback_color = (200, 220, 200)
    for i, (name, url) in enumerate(PLACES):
        col = i % COLS
        row = i // COLS
        x = col * (TILE_W + GAP)
        y = row * (TILE_H + GAP)
        try:
            img = fetch(url)
            tile = fit(img, TILE_W, TILE_H)
            canvas.paste(tile, (x, y))
            success += 1
            print(f'  OK  {name}')
        except Exception as e:
            # Fallback: solid colored block with the place name centered
            block = Image.new('RGB', (TILE_W, TILE_H), fallback_color)
            d = ImageDraw.Draw(block)
            try:
                d.text((10, TILE_H - 22), name, fill=(60, 80, 60))
            except Exception:
                pass
            canvas.paste(block, (x, y))
            print(f'  FAIL {name}: {e}')

    out = '/tmp/blog-collage.png'
    canvas.save(out, 'PNG', optimize=True)
    print(f'\nSaved {out}  ({success}/{len(PLACES)} tiles loaded)')

if __name__ == '__main__':
    main()
