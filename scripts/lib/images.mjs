// Картинки фото-сообщений: где в сценарии стоит #photo, какие брифы и файлы к ним есть.
//   сценарий   строка «описание #photo:имя» — текст строки остаётся описанием (alt и заглушка, пока файла нет)
//   файл       src/stories/<id>/images/<имя>.webp — то, что видит игрок
//   бриф       docs/stories/<id>/images.json — что на картинке, зачем она сюжету и как её сделать:
//              kind "photo" — генерация FLUX (промпт, рамки), kind "screen" — скрин, собранный шаблоном
// Числа и статусы считает этот модуль, команда — npm run story:images, скилл — .claude/skills/story-images.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const STATE_DIR = 'docs/stories';
export const WORK_DIR = 'images-work';
export const KINDS = ['photo', 'screen'];
export const TEMPLATES = ['chat', 'note', 'list', 'post'];
export const STATUSES = ['brief', 'draft', 'approved'];

/** Пропорции → размер генерации FLUX (кратно 16, длинная сторона 1024) и подпись. */
export const ASPECTS = {
  '3:4': [768, 1024],
  '4:3': [1024, 768],
  '1:1': [1024, 1024],
  '9:16': [576, 1024],
  '16:9': [1024, 576],
};

const PHOTO_RE = /#\s*photo(?:\s*:\s*([^\s#]+))?/;
const KNOT_RE = /^\s*={2,}\s*(?:function\s+)?(\w+)/;
const FROM_RE = /#\s*from\s*:\s*([\w-]+)/;

export const manifestPath = (id, dir = STATE_DIR) => join(dir, id, 'images.json');

/** Бриф истории: { look, images }. Нет файла — пустой. */
export function readManifest(id, { dir = STATE_DIR } = {}) {
  const path = manifestPath(id, dir);
  if (!existsSync(path)) return { path, exists: false, look: {}, images: {} };
  const doc = JSON.parse(readFileSync(path, 'utf8'));
  return { path, exists: true, look: doc.look ?? {}, images: doc.images ?? {} };
}

/** Текст строки без маркеров выбора и тегов: то, что увидит игрок вместо картинки. */
const lineText = (line) => line.replace(/\/\/.*$/, '').replace(/#.*$/, '').replace(/^\s*[-*+]+\s*(\([\w-]+\)\s*)?/, '').trim();

/**
 * Все строки #photo сценария по порядку файлов: { file, line, chapter, knot, from, name, text, context }.
 * from — последний #from: выше по файлу (приближение: ink может прийти сюда из другого узла).
 */
export function photoRefs(story) {
  const refs = [];
  for (const file of story.order) {
    const lines = story.files[file].split('\n');
    const chapter = Number(file.match(/^ch(\d+)\.ink$/)?.[1]) || null;
    let knot = null;
    let from = null;
    lines.forEach((raw, i) => {
      const k = raw.match(KNOT_RE);
      if (k) knot = k[1];
      if (/^\s*\/\//.test(raw)) return;
      const f = raw.match(FROM_RE);
      if (f) from = f[1];
      const m = raw.match(PHOTO_RE);
      if (!m) return;
      const context = lines.slice(Math.max(0, i - 6), Math.min(lines.length, i + 4))
        .map((l, j) => `${Math.max(0, i - 6) + j + 1}${Math.max(0, i - 6) + j === i ? '>' : ':'} ${l}`);
      refs.push({ file, line: i + 1, chapter, knot, from, name: m[1] ? m[1].replace(/\.(webp|png|jpe?g|gif|avif)$/i, '') : null, text: lineText(raw), context });
    });
  }
  return refs;
}

/** Ошибки брифа одной картинки: без них её можно делать. */
export function briefProblems(name, b, images = {}) {
  const p = [];
  if (!KINDS.includes(b.kind)) p.push(`kind «${b.kind ?? ''}» — нужен ${KINDS.join(' или ')}`);
  if (!b.shows?.trim()) p.push('нет shows: что игрок видит и должен понять');
  if (b.status && !STATUSES.includes(b.status)) p.push(`status «${b.status}» — один из ${STATUSES.join(', ')}`);
  if (b.kind === 'photo') {
    if (!b.prompt?.trim()) p.push('нет prompt — полное описание кадра по-английски');
    if (b.aspect && !ASPECTS[b.aspect]) p.push(`aspect «${b.aspect}» — один из ${Object.keys(ASPECTS).join(', ')}`);
    for (const box of b.boxes ?? []) {
      const [y0, x0, y1, x1] = box.bbox ?? [];
      if (!(0 <= y0 && y0 < y1 && y1 <= 1 && 0 <= x0 && x0 < x1 && x1 <= 1)) p.push(`рамка ${box.id ?? '?'}: bbox [y0, x0, y1, x1] долями 0..1, y первым`);
      if (!box.desc?.trim()) p.push(`рамка ${box.id ?? '?'}: нет desc`);
    }
    for (const r of b.refs ?? []) if (!images[r] && r !== name) p.push(`refs: картинки «${r}» нет ни файлом, ни брифом`);
    for (const o of b.overlay ?? []) {
      const [y0, x0, y1, x1] = o.bbox ?? [];
      if (!o.text?.trim()) p.push('overlay: слой без text');
      if (!(0 <= y0 && y0 < y1 && y1 <= 1 && 0 <= x0 && x0 < x1 && x1 <= 1)) p.push(`overlay «${o.text ?? ''}»: bbox [y0, x0, y1, x1] долями 0..1`);
    }
  }
  if (b.kind === 'screen') {
    if (!TEMPLATES.includes(b.template)) p.push(`template «${b.template ?? ''}» — один из ${TEMPLATES.join(', ')}`);
    if (!b.data || typeof b.data !== 'object') p.push('нет data — содержимое скрина для шаблона');
  }
  return p;
}

/**
 * Сводка картинок истории. По каждому имени: где стоит, есть ли бриф и файл, статус.
 *   error   — #photo:имя без брифа и без файла (игрок увидит заглушку, а сделать её не по чему),
 *             бриф с ошибками, бриф kind photo без файла у approved
 *   warn    — файл или бриф, на который не ссылается ни одна строка; одна картинка в двух местах — нормально
 *   todo    — бриф есть, файла нет: игрок пока видит заглушку
 *   stub    — #photo без имени: заглушка по старому синтаксису
 */
export function imageReport(story, { dir = STATE_DIR } = {}) {
  const refs = photoRefs(story);
  const manifest = readManifest(story.id, { dir });
  const files = story.images ?? {};
  const names = [...new Set([...refs.filter((r) => r.name).map((r) => r.name), ...Object.keys(manifest.images), ...Object.keys(files)])];
  const items = names.map((name) => {
    const used = refs.filter((r) => r.name === name);
    const brief = manifest.images[name] ?? null;
    const file = files[name]?.file ?? (files[name] ? '(в .json)' : null);
    const problems = brief ? briefProblems(name, brief, { ...files, ...manifest.images }) : [];
    let state;
    if (!used.length) state = 'unused';
    else if (file) state = 'ready';
    else if (brief) state = 'todo';
    else state = 'missing';
    return { name, state, kind: brief?.kind ?? null, status: brief?.status ?? (brief ? 'brief' : null), file, used, brief, problems };
  });
  const stubs = refs.filter((r) => !r.name);
  const errors = [
    ...items.filter((i) => i.state === 'missing').map((i) => `${i.name}: #photo:${i.name} без брифа и без файла (${where(i.used[0])}) — бриф в ${manifest.path}`),
    ...items.flatMap((i) => i.problems.map((p) => `${i.name}: ${p}`)),
  ];
  const warnings = [
    ...items.filter((i) => i.state === 'unused' && i.file).map((i) => `${i.name}: файл есть, ни одна строка #photo:${i.name} на него не ссылается`),
    ...items.filter((i) => i.state === 'unused' && !i.file).map((i) => `${i.name}: бриф есть, строки #photo:${i.name} в сценарии нет`),
    ...items.filter((i) => i.status === 'approved' && !i.file).map((i) => `${i.name}: approved, а файла в images/ нет — npm run story:images -- ${story.id} --name ${i.name}`),
  ];
  return { id: story.id, manifest: manifest.path, look: manifest.look, refs, items, stubs, errors, warnings };
}

export const where = (r) => (r ? `${r.file}:${r.line}${r.knot ? ` · ${r.knot}` : ''}` : '—');
