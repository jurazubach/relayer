// Загрузка истории для инструментов: по id или по пути, в любой из форм.
//   src/stories/<id>.json        один файл: описание и ink в поле "ink" (сейчас так)
//   src/stories/<id>/            папка: meta.json + story.ink, главы через INCLUDE (план §10, T-02)
//   путь/к/истории.ink           голый сценарий, как принимает «Загрузить историю»
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { parseInk } from './ink.mjs';

export const STORIES_DIR = 'src/stories';
const MAIN = 'story.ink';

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
 */

/** История по id («the-number») или пути (файл .json / .ink или папка). */
export function loadStory(ref, { dir = STORIES_DIR } = {}) {
  const path = resolvePath(ref, dir);
  const rel = relative(process.cwd(), path);
  const shown = rel && !rel.startsWith('..') ? rel : path;
  if (statSync(path).isDirectory()) return loadFolder(path, shown);
  const raw = readFileSync(path, 'utf8');
  if (path.endsWith('.json')) {
    const data = JSON.parse(raw);
    if (typeof data.ink !== 'string') throw new Error(`в ${shown} нет поля "ink"`);
    const { ink, ...meta } = data;
    const main = basename(path).replace(/\.json$/, '.ink');
    return finish({ id: meta.id ?? basename(path, '.json'), path: shown, form: 'json', meta, main, base: null, files: { [main]: ink } });
  }
  const main = basename(path);
  return finish({ id: basename(path).replace(/\.ink$/, ''), path: shown, form: 'ink', meta: {}, main, base: dirname(path), files: { [main]: raw } });
}

function loadFolder(path, shown) {
  const metaFile = join(path, 'meta.json');
  const meta = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, 'utf8')) : {};
  const main = meta.main ?? MAIN;
  if (!existsSync(join(path, main))) throw new Error(`в папке ${shown} нет ${main}`);
  return finish({ id: meta.id ?? basename(path), path: shown, form: 'folder', meta, main, base: path, files: { [main]: readFileSync(join(path, main), 'utf8') } });
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
      if (!s.base) continue;
      const file = join(s.base, inc);
      if (!existsSync(file)) continue;
      s.files[inc] = readFileSync(file, 'utf8');
      queue.push(inc);
    }
  }
  const { base, ...rest } = s;
  return { ...rest, order: order.filter((f) => f in s.files), ink: s.files[s.main] };
}

function resolvePath(ref, dir) {
  if (existsSync(ref)) return resolve(ref);
  if (!ref.includes('/') && !ref.includes(sep)) {
    for (const p of [join(dir, ref), join(dir, `${ref}.json`)]) if (existsSync(p)) return resolve(p);
  }
  throw new Error(`история «${ref}» не найдена: нет ни файла, ни ${join(dir, ref)}/, ни ${join(dir, ref)}.json`);
}

/**
 * Все истории каталога, по алфавиту имён. Если у одного id есть и папка, и .json — берётся папка:
 * .json рядом с ней — собранная копия (story:pack).
 */
export function listStories(dir = STORIES_DIR) {
  if (!existsSync(dir)) return [];
  const byId = new Map();
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (existsSync(join(full, MAIN)) || existsSync(join(full, 'meta.json'))) byId.set(name, full);
    } else if (name.endsWith('.json')) {
      const id = name.slice(0, -5);
      if (!byId.has(id)) byId.set(id, full);
    }
  }
  return [...byId.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([, p]) => p);
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
