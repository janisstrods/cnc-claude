#!/bin/sh
# Usage: scripts/history-shot.sh <id> <out-dir> [port]
# Screenshots the dev gallery page of a battle history (#/gallery/history/<id>) from a running dev server and cuts it
# into full-resolution tiles <out-dir>/<id>-1.png, <id>-2.png, ... (game board + slide I, each map phase, flipped map,
# slide III) for reading one at a time.
ID="$1"; OUT="$2"; PORT="${3:-5176}"
mkdir -p "$OUT"
"$(dirname "$0")/shot.sh" "http://localhost:$PORT/#/gallery/history/$ID" "$OUT/$ID-full.png" 1000 6400 >/dev/null
python3 - "$OUT" "$ID" <<'PY'
import sys
from PIL import Image
out, id = sys.argv[1], sys.argv[2]
im = Image.open(f"{out}/{id}-full.png").convert("RGB")
w, h = im.size
# trim the empty page background at the bottom
px = im.load()
bottom = h
while bottom > 0 and all(abs(px[x, bottom - 1][0] - 0x2a) < 6 for x in range(0, w, 50)):
    bottom -= 1
tile = 1150
n = 0
for y in range(0, bottom, tile):
    n += 1
    im.crop((0, y, w, min(bottom, y + tile))).save(f"{out}/{id}-{n}.png")
print("\n".join(f"{out}/{id}-{i}.png" for i in range(1, n + 1)))
PY
