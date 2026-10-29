"""Пачка генераций FLUX 3 Klein с одной загрузкой модели, каждый прогон — строкой в журнал.
Всегда под очередью GPU:

    gpu-run fluxpy run_batch.py jobs.json [--out-dir .] [--log runs.jsonl] [--model 8bit] [--dry-run]

jobs.json пишет jobs.mjs из брифа: [{"id": "ch04-sd_s1", "series": "ch04-sd", "prompt": "..." | "prompt_file": "p.txt",
             "refs": ["ref-x.png", ...], "boxes": "boxes.json" | null, "seed": 1,
             "width": 768, "height": 1024, "steps": 16, "upsample": false}]
Пути — от папки jobs.json. Задания, у которых картинка уже есть, пропускаются (повторный запуск = продолжение).

Проверки до загрузки модели (пачка долгая — падаем сразу):
- ширина и высота кратны 16; каждый референс ровно ширина×высота — иначе модель дополнит его отражением
  и края раздвоятся (jobs.mjs обрезает референсы под размер);
- upsampler грузится, только если его просит задание (+~10 ГБ, +20 с на картинку); в правках он переписывает смысл.
Строка журнала: поля задания + итоговый промпт, время, пик памяти, путь к картинке.
"""
import argparse
import json
import sys
import time
from pathlib import Path

from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('jobs'); ap.add_argument('--out-dir', default='.'); ap.add_argument('--log', default='runs.jsonl')
ap.add_argument('--model', default='8bit'); ap.add_argument('--upsampler', default='8bit'); ap.add_argument('--dry-run', action='store_true')
a = ap.parse_args()
base = Path(a.jobs).resolve().parent
rel = lambda p: Path(p) if Path(p).is_absolute() else base / p
jobs = json.loads(Path(a.jobs).read_text())
out_dir = rel(a.out_dir); out_dir.mkdir(parents=True, exist_ok=True); log = rel(a.log)

problems, todo = [], []
for j in jobs:
    W, H = j.get('width', 1024), j.get('height', 1024)
    if W % 16 or H % 16:
        problems.append(f"{j['id']}: {W}x{H} не кратно 16")
    if not (j.get('prompt') or j.get('prompt_file')):
        problems.append(f"{j['id']}: нет промпта")
    for r in j.get('refs', []):
        size = Image.open(rel(r)).size
        if size != (W, H):
            problems.append(f"{j['id']}: референс {r} — {size[0]}x{size[1]}, а задание {W}x{H} — референс обрезает jobs.mjs")
    if j.get('boxes'):
        for b in json.loads(rel(j['boxes']).read_text()):
            y0, x0, y1, x1 = b['bbox']
            if not (0 <= y0 < y1 <= 1 and 0 <= x0 < x1 <= 1):
                problems.append(f"{j['id']}: рамка {b.get('id')} вне 0..1 {b['bbox']}")
    if not (out_dir / f"{j['id']}.png").exists():
        todo.append(j)
if problems:
    sys.exit('не запускаю:\n  ' + '\n  '.join(problems))
print(f'к генерации {len(todo)}, уже готово {len(jobs) - len(todo)}', flush=True)
if a.dry_run or not todo:
    sys.exit(0)

import mlx.core as mx
from flux3_mlx import Flux3Klein

t0 = time.time()
pipe = Flux3Klein.from_pretrained(a.model, upsampler=a.upsampler if any(j.get('upsample') for j in todo) else None)
load_s = round(time.time() - t0, 1)
for j in todo:
    W, H = j.get('width', 1024), j.get('height', 1024)
    prompt = j.get('prompt') or rel(j['prompt_file']).read_text().strip()
    boxes = json.loads(rel(j['boxes']).read_text()) if j.get('boxes') else None
    refs = [Image.open(rel(r)).convert('RGB') for r in j.get('refs', [])]
    mx.reset_peak_memory(); t = time.time()
    img, rec = pipe(prompt, refs or None, boxes, W, H, j.get('steps', 16), None, j['seed'], upsample=bool(j.get('upsample')))
    gen_s = round(time.time() - t, 1)
    out = out_dir / f"{j['id']}.png"; img.save(out)
    line = {**j, 'model': a.model, 'prompt_text': prompt, 'prompt_final': rec.get('prompt'), 'load_s': load_s,
            'generate_s': gen_s, 'peak_memory_gb': round(mx.get_peak_memory() / 1e9, 2), 'file': str(out), 'at': time.strftime('%Y-%m-%d %H:%M')}
    with open(log, 'a') as f:
        f.write(json.dumps(line, ensure_ascii=False) + '\n')
    print(f"{j['id']}: {gen_s} s, {line['peak_memory_gb']} GB → {out}", flush=True)
