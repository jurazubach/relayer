"""Готова ли локальная генерация FLUX — без загрузки модели. Код 1, если чего-то нужного нет.

    fluxpy check_setup.py [--generate]       --generate ещё и делает одну картинку 512² под очередью GPU (~1 мин с загрузкой)

Печатает: интерпретатор и версию flux3-mlx, mflux (не обязателен), веса в кэше и их размер, свободный диск,
память, занята ли очередь GPU, библиотеки Python для скриптов.
"""
import argparse
import importlib.metadata as md
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

ap = argparse.ArgumentParser(); ap.add_argument('--generate', action='store_true'); a = ap.parse_args()
hub = Path(os.environ.get('HF_HUB_CACHE') or Path(os.environ.get('HF_HOME', Path.home() / '.cache/huggingface')) / 'hub')
q = Path(os.environ.get('FLUX_GPU_QUEUE', Path.home() / '.cache/flux-gpu'))
# blobs may themselves be links into another cache: count each resolved file once
size = lambda p: sum(f.stat().st_size for f in {x.resolve() for x in (p / 'snapshots').rglob('*')} if f.is_file()) / 1e9
r = {'python': sys.executable}
for n in ('flux3-mlx', 'mlx', 'numpy', 'scipy', 'pillow'):
    try:
        r[n] = md.version(n)
    except md.PackageNotFoundError:
        r[n] = None
r['mflux_cli'] = shutil.which('mflux-generate-flux3')
r['weights'] = {d.name.removeprefix('models--'): round(size(d), 1) for d in hub.glob('models--*') if 'flux' in d.name.lower() or 'klein' in d.name.lower()} if hub.exists() else {}
r['disk_free_gb'] = round(shutil.disk_usage(Path.home()).free / 1e9, 1)
try:
    r['memory_gb'] = round(int(subprocess.check_output(['sysctl', '-n', 'hw.memsize'])) / 1e9, 1)
except Exception:
    r['memory_gb'] = None
r['gpu_queue'] = {'dir': str(q), 'locked': (q / 'lock').exists(), 'waiting': len(list((q / 'tickets').glob('*'))) if (q / 'tickets').exists() else 0}
missing = [n for n in ('flux3-mlx', 'mlx', 'numpy', 'scipy', 'pillow') if not r[n]]
if not any('klein' in k.lower() for k in r['weights']):
    missing.append('weights (first run downloads ~10–20 GB)')
r['missing'] = missing
if a.generate and not missing:
    out = Path.home() / '.cache/flux-gpu/check.png'; out.parent.mkdir(parents=True, exist_ok=True)
    gpu = Path(__file__).parent / 'gpu-run'
    p = subprocess.run([str(gpu), 'flux3-mlx', 'a red apple on a wooden table, studio light', '--width', '512', '--height', '512', '--seed', '1', '--out', str(out)], capture_output=True, text=True)
    r['generate'] = {'ok': p.returncode == 0 and out.exists(), 'out': str(out), 'tail': p.stderr.strip().splitlines()[-3:]}
print(json.dumps(r, indent=1))
sys.exit(1 if missing or (a.generate and not r.get('generate', {}).get('ok')) else 0)
