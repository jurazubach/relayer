"""Лист сравнения: картинки рядом с подписями, ряд на группу — на него смотрят после каждой серии сидов.

    fluxpy sheet.py <out.png> <img|подпись=img> [...] [--row] [...] [--cell 512] [--bg checker|black|222222]

--cell — длинная сторона ячейки; ячейки берут пропорции первой картинки.

Аргумент — путь или «подпись=путь»; «--row» начинает новый ряд. Прозрачные — на фоне --bg (по умолчанию шахматка).
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

args = sys.argv[1:]
if len(args) < 2:
    sys.exit(__doc__)
out = args.pop(0)
opt = lambda k, d: (args.pop(args.index(k) + 1), args.remove(k))[0] if k in args else d
cell = int(opt('--cell', 512)); bg = opt('--bg', 'checker')
rows, cur = [], []
for x in args:
    if x == '--row':
        rows.append(cur); cur = []
    else:
        lab, _, p = x.rpartition('=') if '=' in x else (Path(x).stem, '', x)
        cur.append((lab or Path(p).stem, p))
rows.append(cur); rows = [r for r in rows if r]
L = 22; cols = max(len(r) for r in rows)
# cells follow the aspect of the first image, --cell is their long side (a 16:9 frame no longer wastes half the sheet)
w0, h0 = Image.open(rows[0][0][1]).size
CW, CH = (cell, max(1, round(cell * h0 / w0))) if w0 >= h0 else (max(1, round(cell * w0 / h0)), cell)
sheet = Image.new('RGB', (cols * CW, len(rows) * (CH + L)), (34, 34, 34)); d = ImageDraw.Draw(sheet)


def backdrop(w, h):
    if bg == 'black':
        return Image.new('RGBA', (w, h), (0, 0, 0, 255))
    if bg == 'checker':
        b = Image.new('RGBA', (w, h), (200, 200, 200, 255)); dd = ImageDraw.Draw(b)
        for y in range(0, h, 16):
            for x in range(0, w, 16):
                if (x // 16 + y // 16) % 2:
                    dd.rectangle([x, y, x + 15, y + 15], fill=(150, 150, 150, 255))
        return b
    return Image.new('RGBA', (w, h), tuple(int(bg[i:i + 2], 16) for i in (0, 2, 4)) + (255,))


for r, row in enumerate(rows):
    for c, (lab, p) in enumerate(row):
        im = Image.open(p).convert('RGBA'); im.thumbnail((CW, CH), Image.LANCZOS)
        b = backdrop(*im.size); b.alpha_composite(im)
        x, y = c * CW, r * (CH + L)
        sheet.paste(b.convert('RGB'), (x + (CW - im.width) // 2, y + L + (CH - im.height) // 2))
        d.text((x + 4, y + 4), lab, fill=(255, 255, 255))
Path(out).parent.mkdir(parents=True, exist_ok=True); sheet.save(out)
print(out, sheet.size)
