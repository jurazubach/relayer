// Общее для render.mjs и jobs.mjs: брифы, рабочая папка и картинки через chromium из Playwright —
// он уже стоит для e2e, а кодировать webp и масштабировать умеет canvas, так что Python для этого не нужен.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { readManifest, WORK_DIR } from '../../../../scripts/lib/images.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
export const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const MIME = { webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' };

export const workDir = (id, name) => join(ROOT, WORK_DIR, id, name);
export const storyImages = (id) => join(ROOT, 'src/stories', id, 'images');

/** Аргументы вида --story x --name y --flag → { story, name, flag: true }. */
export function args(argv, help) {
  if (argv.includes('--help') || argv.includes('-h')) { console.log(help); process.exit(0); }
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const k = argv[i].slice(2);
    out[k] = i + 1 < argv.length && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  }
  return out;
}

export function brief(id, name) {
  const m = readManifest(id, { dir: join(ROOT, 'docs/stories') });
  const b = m.images[name];
  if (!b) throw new Error(`в ${m.path} нет брифа «${name}» — сначала бриф (npm run story:images -- ${id} --todo)`);
  return { manifest: m, brief: b };
}

export function dataUri(path) {
  const ext = path.split('.').pop().toLowerCase();
  return `data:${MIME[ext] ?? 'image/png'};base64,${readFileSync(path).toString('base64')}`;
}

/** Готовая картинка истории по имени: файл в src/stories/<id>/images/ или итог рабочей папки. */
export function findImage(id, name) {
  for (const ext of ['webp', 'png', 'jpg', 'jpeg']) {
    const p = join(storyImages(id), `${name}.${ext}`);
    if (existsSync(p)) return p;
  }
  const final = join(workDir(id, name), 'final.png');
  return existsSync(final) ? final : null;
}

export async function withPage(fn, { width = 390, height = 800, scale = 1 } = {}) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
    return await fn(page);
  } finally {
    await browser.close();
  }
}

/**
 * Перекодирует картинку canvas'ом: fit "inside" — длинная сторона не больше max; "cover" — ровно w×h с обрезкой
 * по центру (референс FLUX должен совпадать с размером задания, иначе модель дорисует края отражением).
 */
export async function convert(page, src, out, { type = 'image/png', quality = 0.82, max = null, w = null, h = null, fit = 'inside' } = {}) {
  const url = await page.evaluate(async ({ src, type, quality, max, w, h, fit }) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    let W = img.naturalWidth, H = img.naturalHeight, sx = 0, sy = 0, sw = W, sh = H;
    if (fit === 'cover') {
      const k = Math.max(w / W, h / H);
      sw = w / k; sh = h / k; sx = (W - sw) / 2; sy = (H - sh) / 2; W = w; H = h;
    } else if (max && Math.max(W, H) > max) {
      const k = max / Math.max(W, H);
      W = Math.round(W * k); H = Math.round(H * k);
    }
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
    return { data: c.toDataURL(type, quality), W, H };
  }, { src, type, quality, max, w, h, fit });
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, Buffer.from(url.data.split(',')[1], 'base64'));
  return { width: url.W, height: url.H, bytes: Buffer.from(url.data.split(',')[1], 'base64').length };
}
