// Общее для скриптов story-desk: папка состояния docs/stories/<id>/ (план §7), разбор записей D-NN и I-NN
// с полями, время правки по git, хэш узла ink. Сам по себе ничего не делает: его импортируют
// decision-add, idea-park, stale-check и story-status. Разбор STATUS.md и заголовков D-NN — тот же, что у
// npm run story:status (scripts/story/core/state.mjs), чтобы числа совпадали.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tokenize } from '../../../../scripts/lib/ink.mjs';
import { loadStory, parseStory, STORIES_DIR } from '../../../../scripts/lib/story.mjs';
import { STATE_DIR, STEPS, knownStep, parseDecisions, parseStatus, readStates, pickActive, currentBranch } from '../../../../scripts/story/core/state.mjs';

export { STATE_DIR, STEPS, STORIES_DIR, knownStep, parseDecisions, parseStatus, readStates, pickActive, currentBranch };
export const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  console.log('desk-core.mjs — общий модуль скриптов story-desk, отдельно не запускается.\n' +
    'Команды: decision-add.mjs, idea-park.mjs, stale-check.mjs, story-status.mjs (у каждой --help).');
}

export const today = () => new Date().toISOString().slice(0, 10);

/** Папка состояния истории; нет — ошибка с подсказкой, как завести. */
export function stateDir(id, dir = STATE_DIR) {
  if (!id) throw new Error('не указана история: --story <id> (список — npm run story:status -- --all)');
  const d = join(dir, id);
  if (!existsSync(d)) throw new Error(`нет ${d}/ — завести: node \${CLAUDE_SKILL_DIR}/scripts/story-status.mjs --init ${id}`);
  return d;
}

export const readText = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '');

// Поля записи под заголовком: «- почему: …», «- опора: …». Ключи узнаются по нескольким написаниям,
// как в state.mjs: записи пишут и люди, и скиллы.
const ENTRY_FIELDS = {
  why: ['почему', 'причина'],
  basis: ['опора', 'основа', 'basis'],
  replaces: ['заменяет', 'replaces'],
  kind: ['вид', 'тип', 'kind'],
  node: ['узел', 'node'],
  hash: ['хэш', 'хеш', 'hash'],
  finding: ['находка', 'finding'],
  rejected: ['не взято', 'отвергнуто', 'почему не взято'],
  when: ['когда вернуться', 'вернуться'],
  from: ['откуда', 'источник'],
  state: ['статус', 'status'],
  who: ['кто'],
};

function fieldsOf(lines) {
  const out = {};
  for (const l of lines) {
    const m = l.match(/^\s*[-*]\s+\**([^:*]+?)\**:\**\s*(.*)$/) ?? l.match(/^\s*([^:|#]{2,24}?):\s+(.*)$/);
    if (!m) continue;
    const key = m[1].trim().toLowerCase();
    for (const [name, aliases] of Object.entries(ENTRY_FIELDS)) if (aliases.includes(key) && out[name] == null) out[name] = m[2].trim();
  }
  // «Хэш узла: 3f2a9c» в свободном тексте — так пишет и шаблон, и люди
  if (!out.hash) { const h = lines.join('\n').match(/хэш(?: узла)?:\s*([0-9a-f]{6,40})/i); if (h) out.hash = h[1]; }
  return out;
}

/** Решения с полями: заголовок/строка — как у story:status, поля — строки под заголовком до следующего. */
export function readDecisions(file) {
  const text = readText(file);
  const lines = text.split('\n');
  const list = parseDecisions(text);
  return list.map((d, i) => {
    const end = list[i + 1]?.line ? list[i + 1].line - 1 : lines.length;
    const body = lines.slice(d.line, end);
    const f = fieldsOf(body);
    // в таблице поля — колонки той же строки
    if (lines[d.line - 1]?.startsWith('|')) Object.assign(f, tableFields(lines, d.line - 1));
    // «отклонена находка C-35 в узле storm» — узел и находка из самого заголовка
    const head = `${d.what ?? ''}`;
    if (!f.finding) { const c = head.match(/\b(C-\d+)\b/); if (c && /отклон/i.test(head)) f.finding = c[1]; }
    if (!f.node) { const n = head.match(/в узле\s+`?([\p{L}\p{N}_.]+)`?/u); if (n) f.node = n[1]; }
    if (!f.kind) f.kind = guessKind(head, f);
    return { ...d, ...f, body: body.join('\n').trim() };
  });
}

function tableFields(lines, at) {
  let h = at - 1;
  while (h >= 0 && /^\|[\s:|-]+\|$/.test(lines[h])) h--;
  const head = lines[h]?.split('|').slice(1, -1).map((c) => c.trim().toLowerCase()) ?? [];
  const cells = lines[at].split('|').slice(1, -1).map((c) => c.trim());
  const pairs = head.map((k, i) => `- ${k}: ${cells[i] ?? ''}`);
  return fieldsOf(pairs);
}

/** Вид решения по словам, если поле «вид» не заполнено. */
export function guessKind(what, f = {}) {
  const w = what.toLowerCase();
  if (f.hash || /отклон/.test(w)) return 'отклонено';
  if (/^ядро|ядро v\d|\bядр/.test(w)) return 'ядро';
  if (/^план|план v\d|\bплан/.test(w)) return 'план';
  if (/откат|возвращ/.test(w)) return 'откат';
  if (/отлож/.test(w)) return 'отложено';
  if (/ведёт|ведет|автор глав|владел/.test(w)) return 'автор';
  return 'другое';
}

export const KINDS = ['ядро', 'план', 'ветка', 'отклонено', 'отложено', 'откат', 'автор', 'направление', 'другое'];

/** Номер следующей записи: D-NN или I-NN, без переиспользования номеров. */
export function nextId(prefix, text) {
  const nums = [...text.matchAll(new RegExp(`\\b${prefix}-(\\d+)\\b`, 'g'))].map((m) => Number(m[1]));
  const n = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}-${String(n).padStart(2, '0')}`;
}

/** Поле в шапке STATUS.md («- ядро: D-02»): заменить или дописать перед первым разделом. */
export function setStatusField(text, key, value) {
  const lines = text.split('\n');
  const firstSection = lines.findIndex((l) => /^#{2,4}\s/.test(l));
  const limit = firstSection < 0 ? lines.length : firstSection;
  const re = new RegExp(`^(\\s*[-*]\\s+\\**${key}\\**:\\**\\s*).*$`, 'i');
  for (let i = 0; i < limit; i++) if (re.test(lines[i])) { lines[i] = lines[i].replace(re, `$1${value}`); return lines.join('\n'); }
  let at = limit;
  while (at > 0 && !lines[at - 1].trim()) at--;
  lines.splice(at, 0, `- ${key}: ${value}`);
  return lines.join('\n');
}

/** Пункт в раздел STATUS.md («## Устарело»); раздела нет — дописать в конец. Пустой «- » шаблона заменяется. */
export function addToSection(text, title, item) {
  const lines = text.replace(/\s+$/, '').split('\n');
  const at = lines.findIndex((l) => new RegExp(`^#{2,4}\\s+${title}\\s*$`, 'i').test(l));
  if (at < 0) return `${lines.join('\n')}\n\n## ${title}\n\n- ${item}\n`;
  let end = lines.findIndex((l, i) => i > at && /^#{2,4}\s/.test(l));
  if (end < 0) end = lines.length;
  const blank = lines.slice(at + 1, end).findIndex((l) => /^\s*-\s*$/.test(l));
  if (blank >= 0) lines[at + 1 + blank] = `- ${item}`;
  else {
    let ins = end;
    while (ins > at + 1 && !lines[ins - 1].trim()) ins--;
    lines.splice(ins, 0, `- ${item}`);
  }
  return `${lines.join('\n')}\n`;
}

// ───────── время правки

const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

/** Изменён ли файл относительно последнего коммита (или не в git вовсе). */
function dirty(path) {
  try { return git(['status', '--porcelain', '--', relative(ROOT, resolve(path))]) !== ''; } catch { return true; }
}

/**
 * Время последней правки файла в мс: незакоммиченная правка — mtime, иначе время последнего коммита.
 * Так «глава старше ядра» видна и до коммита, и в истории git.
 */
export function fileTime(path) {
  if (!existsSync(path)) return null;
  if (!dirty(path)) {
    try { const t = git(['log', '-1', '--format=%ct', '--', relative(ROOT, resolve(path))]); if (t) return Number(t) * 1000; } catch { /* не git */ }
  }
  return statSync(path).mtimeMs;
}

/**
 * Когда принято решение: коммит, в котором «D-NN» впервые появился в decisions.md (git -S);
 * не закоммичено — mtime файла; иначе — дата записи в полночь.
 */
export function decisionTime(file, d) {
  try {
    const rel = relative(ROOT, resolve(file));
    const t = git(['log', '--format=%ct', '-S', `${d.id} `, '--', rel]).split('\n').filter(Boolean).at(-1);
    if (t) return Number(t) * 1000;
  } catch { /* не git */ }
  if (existsSync(file) && dirty(file)) return statSync(file).mtimeMs;
  if (d.date && /^\d{4}-\d{2}-\d{2}$/.test(d.date)) return Date.parse(`${d.date}T00:00:00Z`);
  return null;
}

export const fmtTime = (ms) => (ms == null ? '—' : new Date(ms).toISOString().slice(0, 16).replace('T', ' '));

// ───────── история в src/stories

/** История каталога по id (папка или .json); нет — null. */
export function tryStory(id, dir = STORIES_DIR) {
  try { return loadStory(id, { dir }); } catch { return null; }
}

/**
 * Хэш узла для отклонённых находок (план §4): текст узла без комментариев и лишних пробелов, sha1.
 * Правка комментария (`// намеренно:`) узел не «меняет», правка реплики или кнопки — меняет.
 * Длина хэша — формат записи, а не порог: шесть знаков, как в образце decisions.md.
 */
const HASH_LEN = 6;
export function nodeHash(story, nodeId) {
  const tree = parseStory(story);
  const all = [...tree.knots, ...tree.functions];
  const node = all.find((k) => k.id === nodeId);
  if (!node) return null;
  const file = node.file ?? story.main;
  const sameFile = all.filter((k) => (k.file ?? story.main) === file).map((k) => k.line).filter((l) => l > node.line);
  const end = sameFile.length ? Math.min(...sameFile) : Infinity;
  const code = tokenize(story.files[file]).filter((l) => l.n >= node.line && l.n < end)
    .map((l) => l.code.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
  return { node: nodeId, file, line: node.line, hash: createHash('sha1').update(code).digest('hex').slice(0, HASH_LEN) };
}

/** Файлы глав истории-папки с номером главы: chNN.ink. */
export function chapterFiles(story) {
  if (!story || story.form !== 'folder') return [];
  return story.order.map((name) => ({ name, m: name.match(/^ch(\d+)\.ink$/) }))
    .filter((x) => x.m).map((x) => ({ n: Number(x.m[1]), name: x.name, path: join(STORIES_DIR, story.id, x.name) }));
}

/** Все файлы папки рекурсивно (plans/, reviews/, playtests/). */
export function walkFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).sort().flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walkFiles(p) : [p];
  });
}
