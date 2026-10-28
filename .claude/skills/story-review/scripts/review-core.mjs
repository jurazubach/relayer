// Общее для скриптов story-review: прогон story:lint с кэшем по хэшу ink, папка прогона ревью, линзы,
// разбор строк находок из ответов аудиторов, холодного читателя, QA и тестеров. Отдельно не запускается:
// его импортируют review-cache, select-lenses, qa-six, merge-findings и report.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadStory, parseStory } from '../../../../scripts/lib/story.mjs';
import { walk } from '../../../../scripts/lib/ink.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';

export const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
export const STATE_DIR = join(ROOT, 'docs/stories');
// Папка прогона — не состояние истории: в git ей не место (.gitignore). Не node_modules/.cache: туда Claude Code
// не даёт писать (safetyCheck), а ответы аудиторов главная сессия кладёт сюда инструментом Write.
export const CACHE_DIR = join(ROOT, '.story-review');

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  console.log('review-core.mjs — общий модуль скриптов story-review, отдельно не запускается.\n' +
    'Команды: review-cache.mjs, select-lenses.mjs, qa-six.mjs, merge-findings.mjs, report.mjs (у каждой --help).');
}

export const T = () => thresholds();
export const today = () => new Date().toISOString().slice(0, 10);
export const rel = (p) => { const r = relative(process.cwd(), p); return !r ? '.' : r.startsWith('..') ? p : r; };

/**
 * Линзы — диагностические скиллы, которые умеет агент story-auditor. type — тип находки замера по умолчанию,
 * когда аудитор её не разбирал: что почувствует игрок, если проверка права (routing.md, «Тип по линзе»).
 * plan — есть ли у линзы проверки скелета (`story:lint --plan`): у реплик, пауз и голоса в скелете нет текста.
 */
export const LENSES = [
  { id: 'story-opening', type: 'непонятно', plan: true, what: 'начало: 30 с, 3 мин, глава 1' },
  { id: 'story-choices', type: 'не верю', plan: true, what: 'кнопки, молчание, эхо, хабы' },
  { id: 'story-endings', type: 'не верю', plan: true, what: 'финалы, порог, развязка' },
  { id: 'story-mystery', type: 'непонятно', plan: true, what: 'честность загадки, улики' },
  { id: 'story-continuity', type: 'нестыковка', plan: true, what: 'кто что знает, слияния, хронология' },
  { id: 'story-cast', type: 'непонятно', plan: true, what: 'состав, уровни контактов, дуги' },
  { id: 'story-pace', type: 'скучно', plan: false, what: 'ритм, серии без кнопки, середина' },
  { id: 'story-pauses', type: 'скучно', plan: false, what: 'крючки перед паузой, возвращение' },
  { id: 'story-time', type: 'нестыковка', plan: false, what: 'два режима, напоминания, часы мира, длина' },
  { id: 'story-voice', type: 'не верю', plan: false, what: 'голоса, реплики, стиль' },
];
export const LENS_IDS = LENSES.map((l) => l.id);
export const lensOf = (id) => LENSES.find((l) => l.id === id) ?? null;

/** Типы по порядку приоритета внутри одного P: сломанное, потом непонятное, и только потом скучное (priority.md). */
export const TYPES = ['баг', 'непонятно', 'нестыковка', 'не верю', 'скучно'];
export const typeRank = (t) => { const i = TYPES.indexOf(t); return i < 0 ? TYPES.length : i; };
export const BASES = ['человек', 'замер', 'модель'];
// Служебные проверки бота (тупики, незакрытые узлы, неизвестные теги) — поломки, а не впечатление.
export const BUG_CHECKS = new Set(['C-15', 'C-52', 'C-53']);

// ───────── история и прогон story:lint

/** Режим ревью из флагов: полный, часть глав с beta_stop или скелет плана. */
export function modeOf(args) {
  if (args.has('plan')) return { mode: 'plan', planPath: typeof args.get('plan') === 'string' ? args.get('plan') : null };
  if (args.has('partial')) return { mode: 'partial', planPath: null };
  return { mode: 'full', planPath: null };
}

export function storyRef(args) {
  const ref = args.get('story');
  if (!ref || ref === true) throw new Error('не указана история: --story <id> (список — npm run story:status -- --all)');
  return String(ref);
}

/** Скелет для --plan: явный путь или docs/stories/<id>/skeleton.ink, plans/skeleton.ink — как у story:lint. */
export function skeletonPath(id, planPath) {
  const cands = planPath ? [resolve(planPath)] : [join(STATE_DIR, id, 'skeleton.ink'), join(STATE_DIR, id, 'plans/skeleton.ink')];
  const found = cands.find((p) => existsSync(p));
  if (!found) throw new Error(`нет скелета: ${cands.map(rel).join(' или ')} — сначала story-plan`);
  return found;
}

const hash = (parts) => createHash('sha1').update(parts.join('\0')).digest('hex').slice(0, 12);

function lintCodeHash() {
  const dir = join(ROOT, 'scripts/lint');
  const files = [];
  const walkDir = (d) => { for (const f of readdirSync(d).sort()) { const p = join(d, f); if (statSync(p).isDirectory()) walkDir(p); else if (f.endsWith('.mjs')) files.push(p); } };
  walkDir(dir);
  return hash(files.map((f) => readFileSync(f, 'utf8')));
}

/**
 * Ключ прогона: текст истории (или скелета), пороги и код проверок. Пока ключ тот же, вывод story:lint и
 * ответы аудиторов про эту ревизию ink остаются в силе — их не пересчитывают (review-cache.mjs).
 */
export function runKey(story, mode, skeleton) {
  const files = mode === 'plan' ? [readFileSync(skeleton, 'utf8')] : story.order.map((f) => story.files[f]);
  return `${mode}-${hash([...files, JSON.stringify(story.meta ?? {}), readFileSync(join(ROOT, 'docs/playbook/thresholds.json'), 'utf8'), lintCodeHash()])}`;
}

/** Ровно тот же story:lint, что запускает автор: числа совпадают с `npm run story:lint -- --json`. */
export function runLint(ref, mode, skeleton) {
  const argv = [join(ROOT, 'scripts/lint/lint.mjs'), '--story', ref, '--json'];
  if (mode === 'partial') argv.push('--partial');
  if (mode === 'plan') argv.push('--plan', skeleton);
  const out = execFileSync(process.execPath, argv, { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  const json = JSON.parse(out);
  const st = json.stories?.[0];
  if (!st) throw new Error(`story:lint не вернул историю ${ref}`);
  return { runs: json.runs, seed: json.seed, ...st };
}

/**
 * История, папка прогона и вывод story:lint — из кэша, если ключ тот же, иначе свежий прогон.
 * @returns {{ story, tree, id, mode, key, dir, lint, cached, skeleton }}
 */
export function prepare(args, { fresh = false, needLint = true } = {}) {
  const ref = storyRef(args);
  const { mode, planPath } = modeOf(args);
  const story = loadStory(ref);
  const skeleton = mode === 'plan' ? skeletonPath(story.id, planPath) : null;
  const tree = mode === 'plan' ? parseStory(loadStory(skeleton)) : parseStory(story);
  const key = runKey(story, mode, skeleton);
  const dir = join(CACHE_DIR, story.id, key);
  mkdirSync(dir, { recursive: true });
  const lintFile = join(dir, 'lint.json');
  let lint = null;
  let cached = false;
  if (needLint) {
    if (!fresh && existsSync(lintFile)) { lint = JSON.parse(readFileSync(lintFile, 'utf8')); cached = true; }
    else { lint = runLint(ref, mode, skeleton); writeFileSync(lintFile, JSON.stringify(lint, null, 1)); }
  }
  const run = join(dir, 'run.json');
  if (!existsSync(run)) writeFileSync(run, JSON.stringify({ story: story.id, ref, mode, skeleton: skeleton && rel(skeleton), key, created: new Date().toISOString() }, null, 1));
  return { story, tree, id: story.id, ref, mode, key, dir, lint, cached, skeleton };
}

/** Файлы ответов в папке прогона: lens-<скилл>.md, cold-*.md, qa-six.md, human-*.md. */
export function inputs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => /\.(md|txt)$/.test(f)).sort().map((f) => {
    const kind = f.startsWith('lens-') ? 'lens' : f.startsWith('cold-') ? 'cold' : f.startsWith('qa-') ? 'qa' : f.startsWith('human-') ? 'human' : 'other';
    const lens = kind === 'lens' ? f.replace(/^lens-|\.(md|txt)$/g, '') : null;
    return { file: join(dir, f), name: f, kind, lens };
  });
}

// ───────── дерево: главы, узлы, цитаты

export const knotIds = (tree) => new Set(tree.knots.map((k) => k.id));

export function chapterOf(tree, node) {
  if (!node) return null;
  const k = tree.knots.find((x) => x.id === node) ?? tree.knots.find((x) => x.id === String(node).split('.')[0]);
  return k?.chapter ?? null;
}

/** Первый узел главы n (по `#chapter`), чтобы показать холодному читателю всё до неё. */
export function chapterStart(tree, n) {
  return tree.chapters.find((c) => c.n === n)?.knot ?? tree.knots.find((k) => k.chapter === n)?.id ?? null;
}

const normText = (s) => String(s).toLowerCase().replace(/ё/g, 'е').replace(/[«»"'“”„…]/g, '').replace(/\s+/g, ' ').trim();

/** Узел реплики по цитате «начало сообщения» — так холодный читатель и тестеры называют место. */
export function resolveQuote(tree, quote) {
  const q = normText(quote).replace(/\.\.\.$/, '');
  if (q.length < 3) return null;
  for (const k of tree.knots) {
    let hit = null;
    walk(k.items, (it) => {
      if (hit || !it.text) return;
      const t = normText(it.text);
      if (t.startsWith(q) || (q.length >= 8 && t.includes(q))) hit = k.id;
    });
    if (hit) return hit;
  }
  return null;
}

// ───────── разбор строк находок

const CONF = [['высок', 'высокая'], ['средн', 'средняя'], ['низк', 'низкая']];

/**
 * Строка находки общего формата:
 *   P1 · непонятно · <узел> · симптом · правка (F-NN) · [C-NN · замер|модель|человек · уверенность]
 * Разбор терпимый: поля аудиторов плавают («скучно (кандидат)», «узел (гл. 2)», «правка: …»),
 * узлы бывают списком, место холодного читателя — цитатой.
 */
export function parseFindingLine(raw, tree) {
  const m = raw.match(/^\s*(?:[-*]\s+)?P([1-3])\s*·\s*(.+)$/);
  if (!m) return null;
  let rest = m[2].trim();
  let bracket = '';
  const b = rest.match(/\[([^[\]]*)\]\s*\.?$/);
  if (b) { bracket = b[1]; rest = rest.slice(0, b.index).trim().replace(/·\s*$/, '').trim(); }
  const parts = rest.split(/\s+·\s+/);
  const typeRaw = (parts[0] ?? '').toLowerCase();
  const type = TYPES.find((t) => typeRaw.includes(t)) ?? (/выбор/.test(typeRaw) ? 'не верю' : typeRaw.split(/[ (]/)[0]);
  const place = parts[1] ?? '';
  const summary = parts[2] ?? '';
  const fix = parts.slice(3).join(' · ').replace(/^правка:\s*/i, '').trim();
  const ids = tree ? knotIds(tree) : new Set();
  let nodes = [...new Set((place.match(/[A-Za-z_][\w.]*/g) ?? []).filter((w) => ids.has(w) || ids.has(w.split('.')[0])))];
  let quote = null;
  const q = place.match(/«([^»]+)»/);
  if (!nodes.length && q && tree) { quote = q[1]; const n = resolveQuote(tree, quote); if (n) nodes = [n]; }
  const chap = place.match(/гл(?:ава)?\.?\s*(\d+)/i);
  const chapter = chap ? Number(chap[1]) : nodes.length && tree ? chapterOf(tree, nodes[0]) : null;
  const checks = [...new Set([...bracket.matchAll(/\bC-\d\d\b/g), ...fix.matchAll(/\bC-\d\d\b/g)].map((x) => x[0]))];
  const basis = BASES.find((x) => bracket.includes(x)) ?? null;
  const conf = CONF.find(([k]) => bracket.toLowerCase().includes(k))?.[1] ?? null;
  const fixes = [...new Set([...fix.matchAll(/\bF-\d\d\b/g)].map((x) => x[0]))];
  return {
    p: Number(m[1]), type, candidate: /кандидат/.test(typeRaw + bracket), place, nodes, quote, chapter, summary, fix, fixes,
    checks, basis, simulation: /симуляц/.test(bracket), confidence: conf, bracket, raw: raw.trim(),
  };
}

/** Строка раздела «ложные»: `C-NN · узел · причина` или `намеренно: C-NN · узел`. */
function parseFalseLine(raw, tree) {
  const m = raw.match(/^\s*(?:[-*]\s+)?(намеренно:\s*)?(C-\d\d)\s*·\s*([^·]+?)(?:\s*·\s*(.*))?$/);
  if (!m) return null;
  const ids = tree ? knotIds(tree) : new Set();
  const nodes = (m[3].match(/[A-Za-z_][\w.]*/g) ?? []).filter((w) => ids.has(w) || ids.has(w.split('.')[0]));
  return { check: m[2], nodes, intended: !!m[1], why: (m[4] ?? '').trim(), raw: raw.trim() };
}

/** Ответ аудитора, читателя, QA или сводки тестеров: находки, ложные, «вне линзы», шапка. */
export function parseAnswer(text, tree) {
  const out = { header: null, findings: [], falses: [], outside: [], nodata: [] };
  let section = 'находки';
  for (const raw of text.split('\n')) {
    const line = raw.replace(/^```\w*$/, '');
    const h = line.match(/^\s*#*\s*(находки|ложные|нет данных|вне линзы|допущения)(?!\p{L})/iu);
    if (h) { section = h[1].toLowerCase(); continue; }
    if (!out.header && /^\s*(линза|cold-reader|qa|сводка):?/i.test(line)) out.header = line.trim();
    const f = parseFindingLine(line, tree);
    if (f) { out.findings.push(f); continue; }
    if (section === 'ложные') { const x = parseFalseLine(line, tree); if (x) out.falses.push(x); continue; }
    if (section === 'вне линзы') {
      const o = line.match(/^\s*(?:[-*]\s+)?(story-[a-z]+)\s*·\s*(.+)$/);
      if (o) out.outside.push({ lens: o[1], text: o[2].trim() });
      continue;
    }
    if (section === 'нет данных' && line.trim() && line.trim() !== '—') out.nodata.push(line.trim());
  }
  return out;
}

// ───────── свод: названия проверок и «зачем»

/** C-NN → { title, why }: заголовок из checks.md и колонка «зачем» первой волны, если она есть. */
export function checkInfo() {
  const text = readFileSync(join(ROOT, 'docs/playbook/checks.md'), 'utf8');
  const out = new Map();
  for (const m of text.matchAll(/^###\s+(C-\d\d)\.\s+(.+)$/gm)) out.set(m[1], { title: m[2].trim(), why: null });
  for (const m of text.matchAll(/^\|\s*(C-\d\d)\s*\|[^|]*\|[^|]*\|[^|]*\|\s*([^|]+?)\s*\|\s*$/gm)) {
    if (out.has(m[1])) out.get(m[1]).why = m[2];
  }
  return out;
}

/** Решения о находках: отклонённые с узлом и хэшем (story-desk ведёт decisions.md, хэш — desk-core). */
export async function rejectedFindings(id, story) {
  const file = join(STATE_DIR, id, 'decisions.md');
  if (!existsSync(file)) return [];
  const desk = await import('../../story-desk/scripts/desk-core.mjs');
  return desk.readDecisions(file).filter((d) => d.kind === 'отклонено' && d.node).map((d) => {
    // «узел: storm · хэш: 3f2a9c» — так пишет decision-add, хэш в той же строке
    const node = String(d.node).split(/\s*·\s*/)[0];
    const now = desk.nodeHash(story, node);
    return { id: d.id, node, finding: d.finding ?? null, hash: d.hash ?? null, now: now?.hash ?? null, same: !!(d.hash && now && now.hash === d.hash) };
  });
}

export function readJson(file) { return JSON.parse(readFileSync(file, 'utf8')); }
