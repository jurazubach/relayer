// Загрузка истории для инструментов: по id или по пути, в любой из форм.
//   src/stories/<id>/            папка-исходник: meta.json + story.ink, главы через INCLUDE
//   <id>.story.json              один файл (story:pack): описание, "ink" — главный файл, "includes" — главы;
//                                старые файлы без "includes" держат весь сценарий в "ink"
//   путь/к/истории.ink           голый сценарий, как принимает «Загрузить историю»
// Здесь же раскладка и сборка (story:pack / story:unpack): splitInk, glueStory, packStory, unpackStory.
// Картинки фото-сообщений (#photo:имя) лежат в папке истории файлами images/<имя>.webp, а в .json —
// полем "images": { "<имя>": "data:image/webp;base64,…" }: файл истории остаётся одним файлом.
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { parseInk } from './ink.mjs';

export const STORIES_DIR = 'src/stories';
const MAIN = 'story.ink';

const MIME = { webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', avif: 'image/avif' };
const EXT = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/avif': 'avif' };
export const IMAGE_RE = /\.(webp|png|jpe?g|gif|avif)$/i;
/** Тип картинки по имени файла: image/webp, image/png… */
export const imageMime = (file) => MIME[file.split('.').pop().toLowerCase()];
/** Имя картинки без расширения: так её зовёт тег #photo:имя и так её ищет игра. */
export const imageStem = (name) => name.replace(IMAGE_RE, '');

/**
 * @typedef {object} LoadedStory
 * @property {string} id
 * @property {string} path      как показывать в выводе: путь относительно текущего каталога
 * @property {'json' | 'folder' | 'ink'} form
 * @property {object} meta      описание истории без ink (title, series, characters, chapters…)
 * @property {string} main      имя главного файла ink
 * @property {Record<string, string>} files  все файлы ink: главный и подключённые INCLUDE
 * @property {string[]} order   порядок файлов: главный, затем INCLUDE по ходу текста
 * @property {string} ink       текст главного файла
 * @property {Record<string, {file?: string, data?: string}>} images  картинки по имени без расширения:
 *           у папки — путь к файлу images/…, у .json — data:-адрес
 */

/** История по id («the-number») или пути (файл .json / .ink или папка). */
export function loadStory(ref, { dir = STORIES_DIR } = {}) {
  const path = resolvePath(ref, dir);
  const rel = relative(process.cwd(), path);
  const shown = rel && !rel.startsWith('..') ? rel : path;
  if (statSync(path).isDirectory()) return loadFolder(path, shown);
  const raw = readFileSync(path, 'utf8');
  if (path.endsWith('.json')) return storyFromJson(JSON.parse(raw), { path: shown, name: basename(path) });
  const main = basename(path);
  return finish({ id: basename(path).replace(/\.ink$/, ''), path: shown, form: 'ink', meta: {}, main, base: dirname(path), files: { [main]: raw } });
}

/** История из объекта .json (файл или результат packStory): name — имя файла, из него id по умолчанию. */
export function storyFromJson(data, { path = '(json)', name = 'story.json' } = {}) {
  if (typeof data.ink !== 'string') throw new Error(`в ${path} нет поля "ink"`);
  const { ink, includes, images, ...meta } = data;
  // собранная из папки — те же имена файлов, что в папке: ошибки указывают на story.ink и ch01.ink
  const main = includes ? MAIN : name.replace(/(\.story)?\.json$/, '.ink');
  const id = meta.id ?? name.replace(/(\.story)?\.json$/, '');
  const pics = Object.fromEntries(Object.entries(images ?? {}).map(([name, url]) => [name, { data: url }]));
  return finish({ id, path, form: 'json', meta, main, base: null, files: { [main]: ink, ...includes }, images: pics });
}

function loadFolder(path, shown) {
  const metaFile = join(path, 'meta.json');
  const meta = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, 'utf8')) : {};
  const main = meta.main ?? MAIN;
  if (!existsSync(join(path, main))) throw new Error(`в папке ${shown} нет ${main}`);
  const picDir = join(path, 'images');
  const images = existsSync(picDir)
    ? Object.fromEntries(readdirSync(picDir).filter((n) => IMAGE_RE.test(n)).sort().map((n) => [imageStem(n), { file: join(picDir, n) }]))
    : {};
  return finish({ id: meta.id ?? basename(path), path: shown, form: 'folder', meta, main, base: path, files: { [main]: readFileSync(join(path, main), 'utf8') }, images });
}

/** data:-адрес картинки истории: из файла папки или как есть из .json. */
export function imageData(img) {
  if (img.data) return img.data;
  return `data:${imageMime(img.file)};base64,${readFileSync(img.file).toString('base64')}`;
}

/** data:-адрес → { ext, bytes }: для раскладки .json обратно в папку. */
export function imageBytes(url) {
  const m = url.match(/^data:([^;,]+);base64,(.*)$/s);
  if (!m || !EXT[m[1]]) throw new Error(`картинка не data:image/…;base64: ${url.slice(0, 40)}…`);
  return { ext: EXT[m[1]], bytes: Buffer.from(m[2], 'base64') };
}

/** Подтягивает INCLUDE рекурсивно. У .json-истории подключать неоткуда — это ошибка компиляции, не загрузки. */
function finish(s) {
  const order = [s.main];
  const queue = [s.main];
  while (queue.length) {
    const name = queue.shift();
    for (const m of s.files[name].matchAll(/^[ \t]*INCLUDE[ \t]+(.+?)[ \t]*$/gm)) {
      const inc = m[1];
      if (order.includes(inc)) continue;
      order.push(inc);
      if (inc in s.files) {
        queue.push(inc);
        continue;
      }
      if (!s.base) continue;
      const file = join(s.base, inc);
      if (!existsSync(file)) continue;
      s.files[inc] = readFileSync(file, 'utf8');
      queue.push(inc);
    }
  }
  const { base, ...rest } = s;
  return { images: {}, ...rest, order: order.filter((f) => f in s.files), ink: s.files[s.main] };
}

function resolvePath(ref, dir) {
  if (existsSync(ref)) return resolve(ref);
  if (!ref.includes('/') && !ref.includes(sep)) {
    for (const p of [join(dir, ref), join(dir, `${ref}.json`), join(dir, `${ref}.story.json`)]) if (existsSync(p)) return resolve(p);
  }
  throw new Error(`история «${ref}» не найдена: нет ни файла, ни ${join(dir, ref)}/, ни ${join(dir, ref)}.json`);
}

/**
 * Сборка сайта: npm run build зовёт story:pack из postbuild. Только там скрытые истории
 * (hidden: true в meta.json) не попадают в dist/stories/ для Pages; story:pack руками, проверки
 * и команды story:* видят все — скрытость касается только каталога игрока.
 */
export const SITE_BUILD = process.env.npm_lifecycle_event === 'postbuild';

/** Скрыта ли история из каталога игрока: поле hidden в meta.json папки или в .json. */
export function isHiddenStory(path) {
  const file = statSync(path).isDirectory() ? join(path, 'meta.json') : path;
  if (!existsSync(file)) return false;
  try {
    return JSON.parse(readFileSync(file, 'utf8')).hidden === true;
  } catch {
    return false;
  }
}

/**
 * Все истории каталога, по алфавиту имён. Если у одного id есть и папка, и .json — берётся папка:
 * .json рядом с ней — собранная копия (story:pack). hidden: false — без скрытых (по умолчанию так
 * только при сборке сайта).
 */
export function listStories(dir = STORIES_DIR, { hidden = !SITE_BUILD } = {}) {
  if (!existsSync(dir)) return [];
  const byId = new Map();
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (existsSync(join(full, MAIN)) || existsSync(join(full, 'meta.json'))) byId.set(name, full);
    } else if (name.endsWith('.json')) {
      const id = name.replace(/(\.story)?\.json$/, '');
      if (!byId.has(id)) byId.set(id, full);
    }
  }
  const all = [...byId.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([, p]) => p);
  return hidden ? all : all.filter((p) => !isHiddenStory(p));
}

/** Пути из аргументов или весь каталог. */
export const storyRefs = (args, dir = STORIES_DIR) => (args.length ? args : listStories(dir));

/** Дерево разбора истории: все файлы в порядке INCLUDE, номера строк — по своим файлам. */
export function parseStory(story) {
  const many = story.order.length > 1;
  return parseInk(story.order.map((name) => ({ name: many ? name : null, text: story.files[name] })));
}

/** Вход для compile(): главный файл и все подключённые. */
export const compileInput = (story) => ({ main: story.main, files: story.files });

// ───────── раскладка и сборка

const INCLUDE_RE = /^[ \t]*INCLUDE[ \t]+(.+?)[ \t]*$/;
// Заголовок узла или функции; stitch (одно «=») — часть узла, по нему не режем.
const HEADER_RE = /^[ \t]*={2,}/;
// Что можно писать в файле главы до первого узла: тогда склейка и INCLUDE дают одно и то же.
const PREAMBLE_RE = /^[ \t]*(?:$|\/\/|VAR\s|CONST\s|LIST\s|EXTERNAL\s)/;

/** Имя файла главы: ch01.ink … ch10.ink — так файлы и в списке идут по порядку. */
export const chapterFile = (n) => `ch${String(n).padStart(2, '0')}.ink`;

/**
 * Раскладывает сценарий одним текстом на главный файл и главы.
 * Главный файл — всё до первого узла (шапка, VAR, начальный переход) и строки INCLUDE: узлы в нём
 * ломают INCLUDE (ink читает строку как реплику узла) и сбивают номера глав в разборе.
 * Глава — от узла с #chapter до следующего такого же; функции и узлы до первой главы — в common.ink.
 * Комментарии прямо над заголовком уезжают вместе с узлом: это его метки (// финал:).
 * Без #chapter раскладывать нечего — сценарий остаётся одним story.ink.
 */
export function splitInk(ink, { main = MAIN } = {}) {
  const tree = parseInk(ink);
  const lines = ink.split('\n');
  const headers = lines.flatMap((l, i) => (HEADER_RE.test(l) && !inBlockComment(lines, i) ? [i] : []));
  const chapterKnots = new Set(tree.chapters.filter((c) => c.knot).map((c) => c.knot.split('.')[0]));
  const knotAt = new Map([...tree.knots, ...tree.functions].filter((k) => !k.stitch).map((k) => [k.line - 1, k.id]));
  const starts = headers.filter((i) => chapterKnots.has(knotAt.get(i))).map((i) => leadStart(lines, i));
  if (!headers.length || !starts.length) return { main, files: { [main]: ink }, order: [main] };

  const first = leadStart(lines, headers[0]);
  const common = starts[0] > first;
  const cut = common ? [first, ...starts] : starts;
  const names = [...(common ? ['common.ink'] : []), ...starts.map((_, k) => chapterFile(k + 1))];
  const text = (from, to) => lines.slice(from, to).join('\n');
  // Склейка (glueStory) заменяет строку INCLUDE файлом без последнего перевода строки — так она
  // возвращает исходный текст байт в байт, и story:pack --check это сверяет.
  const files = { [main]: `${text(0, cut[0])}\n${names.map((n) => `INCLUDE ${n}`).join('\n')}\n` };
  cut.forEach((from, k) => {
    const last = k + 1 === cut.length;
    const body = text(from, last ? lines.length : cut[k + 1]);
    files[names[k]] = last && body.endsWith('\n') ? body : body + '\n';
  });
  return { main, files, order: [main, ...names] };
}

/** Начало узла вместе с комментариями над ним; пустые строки между ними и кодом выше остаются выше. */
function leadStart(lines, i) {
  let s = i;
  while (s > 0 && /^[ \t]*(\/\/.*)?$/.test(lines[s - 1])) s--;
  while (s < i && !lines[s].trim()) s++;
  return s;
}

function inBlockComment(lines, i) {
  let open = false;
  for (let k = 0; k < i; k++) {
    for (const m of lines[k].matchAll(/\/\*|\*\//g)) open = m[0] === '/*';
  }
  return open;
}

/** Один текст из главного файла и глав: каждая строка INCLUDE заменяется содержимым файла. */
export function glueStory(story) {
  const seen = new Set();
  const glue = (name) => {
    if (seen.has(name)) return '';
    seen.add(name);
    return story.files[name]
      .split('\n')
      .map((l) => {
        const m = l.match(INCLUDE_RE);
        if (!m || !(m[1] in story.files)) return l;
        return glue(m[1]).replace(/\n$/, '');
      })
      .join('\n');
  };
  return glue(story.main);
}

/**
 * Один .json для загрузки и Pages. "ink" — главный файл, "includes" — главы в порядке INCLUDE;
 * flat: true склеивает всё в "ink" — для старых версий приложения и генератора.
 */
export function packStory(story, { flat = false } = {}) {
  const { includes: _drop, main: _main, ...meta } = story.meta;
  const out = { format: 'relayer-story', version: 1, ...meta, id: meta.id ?? story.id };
  const names = Object.keys(story.images ?? {}).sort();
  const images = names.length ? { images: Object.fromEntries(names.map((n) => [n, imageData(story.images[n])])) } : {};
  const many = story.order.length > 1;
  if (flat || !many) return { ...out, ink: many ? glueStory(story) : story.files[story.main], ...images };
  const includes = Object.fromEntries(story.order.slice(1).map((n) => [n, story.files[n]]));
  return { ...out, ink: story.files[story.main], includes, ...images };
}

/** Картинки истории для записи в папку: { "ch01-note.webp": Buffer }. */
function imageFiles(story) {
  return Object.fromEntries(Object.entries(story.images ?? {}).map(([name, img]) => {
    if (img.file) return [basename(img.file), readFileSync(img.file)];
    const { ext, bytes } = imageBytes(img.data);
    return [`${name}.${ext}`, bytes];
  }));
}

/** Папка из истории любой формы: { meta, files }. Сценарий одним текстом режется по главам. */
export function unpackStory(story) {
  const { main: _main, ...meta } = story.meta;
  if (story.order.length > 1) {
    const files = Object.fromEntries(story.order.map((n) => [n === story.main ? MAIN : n, story.files[n]]));
    return { meta: { ...meta, id: meta.id ?? story.id }, files, images: imageFiles(story) };
  }
  const split = splitInk(story.files[story.main]);
  return { meta: { ...meta, id: meta.id ?? story.id }, files: split.files, images: imageFiles(story) };
}

/** Записывает папку истории. Лишние .ink из прошлой раскладки удаляются: источник — то, что пишем. */
export function writeFolder(dir, { meta, files, images = {} }) {
  mkdirSync(dir, { recursive: true });
  for (const name of readdirSync(dir)) if (name.endsWith('.ink') && !(name in files)) rmSync(join(dir, name));
  writeFileSync(join(dir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
  if (!Object.keys(images).length) return;
  mkdirSync(join(dir, 'images'), { recursive: true });
  for (const [name, bytes] of Object.entries(images)) writeFileSync(join(dir, 'images', name), bytes);
}

/**
 * Одинаково ли играются две сборки. INCLUDE оставляет в выводе перевод строки сразу после перехода
 * (`-> ch1` перед строками INCLUDE) — до него ход не доходит, поэтому такие "\n" не считаем.
 */
export function sameRuntime(jsonA, jsonB) {
  const norm = (x) => {
    if (!Array.isArray(x)) return x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, norm(v)])) : x;
    const out = [];
    let jumped = false;
    for (const it of x) {
      if (jumped && it === '\n') continue;
      jumped = !!it && typeof it === 'object' && !Array.isArray(it) && '->' in it && !('c' in it);
      out.push(norm(it));
    }
    return out;
  };
  return JSON.stringify(norm(JSON.parse(jsonA))) === JSON.stringify(norm(JSON.parse(jsonB)));
}

/** Нарушения раскладки, при которых INCLUDE и склейка разойдутся или съедут номера глав. */
export function layoutProblems(story, { dir } = {}) {
  const problems = [];
  const mainLines = story.files[story.main].split('\n');
  const firstHeader = mainLines.findIndex((l, i) => HEADER_RE.test(l) && !inBlockComment(mainLines, i));
  if (story.order.length > 1 && firstHeader >= 0) {
    problems.push(`${story.main}:${firstHeader + 1}: узел в главном файле — узлы живут в файлах глав, в главном только шапка, VAR и INCLUDE`);
  }
  for (const name of story.order.slice(1)) {
    const lines = story.files[name].split('\n');
    lines.forEach((l, i) => {
      if (INCLUDE_RE.test(l)) problems.push(`${name}:${i + 1}: INCLUDE не в главном файле — подключай главы из ${story.main}`);
    });
    const first = lines.findIndex((l, i) => HEADER_RE.test(l) && !inBlockComment(lines, i));
    const pre = first < 0 ? lines : lines.slice(0, first);
    const bad = pre.findIndex((l, i) => !PREAMBLE_RE.test(l) && !inBlockComment(pre, i) && !/^\s*\/\*/.test(l));
    if (bad >= 0) problems.push(`${name}:${bad + 1}: текст до первого узла — в главе до === допустимы только комментарии и VAR`);
  }
  const missing = [...story.files[story.main].matchAll(/^[ \t]*INCLUDE[ \t]+(.+?)[ \t]*$/gm)].map((m) => m[1]).filter((n) => !(n in story.files));
  for (const n of missing) problems.push(`${story.main}: INCLUDE ${n} — такого файла нет`);
  if (dir && existsSync(dir)) {
    for (const name of readdirSync(dir)) {
      if (name.endsWith('.ink') && !story.order.includes(name)) problems.push(`${name}: файл не подключён ни одним INCLUDE`);
    }
  }
  return problems;
}
