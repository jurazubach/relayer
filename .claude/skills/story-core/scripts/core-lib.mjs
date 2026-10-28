// Общее для скриптов story-core: ядро истории — запись D-NN «вид: ядро» в docs/stories/<id>/decisions.md
// (или черновик в том же формате), его поля, шапка ink из 4 строк и запуск команд story:*.
// Разбор заголовков D-NN и STATUS.md — тот же, что у npm run story:status, чтобы номера совпадали.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadStory, parseStory, STORIES_DIR } from '../../../../scripts/lib/story.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';
import { STATE_DIR, parseDecisions, parseStatus } from '../../../../scripts/story/core/state.mjs';

export { STATE_DIR, STORIES_DIR, thresholds };
export const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  console.log('core-lib.mjs — общий модуль скриптов story-core, отдельно не запускается.\n' +
    'Команды: core-check.mjs, core-snapshot.mjs, world-clock.mjs (у каждой --help).');
}

/**
 * Поля ядра. need — без поля ядро неполное; head — поле повторяется в шапке ink (A-06, R-01).
 * Ключи узнаются по нескольким написаниям: записи пишут и люди, и скиллы.
 */
export const CORE_FIELDS = [
  { key: 'логлайн', aliases: ['логлайн', 'logline'], rule: 'R-02', need: true, head: true },
  { key: 'вопрос', aliases: ['вопрос', 'главный вопрос'], rule: 'R-03', need: true, head: true },
  { key: 'ставка', aliases: ['ставка'], rule: 'R-08', need: true, head: true },
  { key: 'оси', aliases: ['оси'], rule: 'R-39', need: true, head: true },
  { key: 'роль', aliases: ['роль', 'роль игрока', 'игрок'], rule: 'R-06', need: true },
  { key: 'герой', aliases: ['герой', 'носитель перемены'], rule: 'R-07', need: true },
  { key: 'противник', aliases: ['противник', 'антагонист'], rule: 'R-84', need: true },
  { key: 'тема', aliases: ['тема', 'ценность'], rule: 'mckee-story:P-02', need: true },
  { key: 'время мира', aliases: ['время мира', 'календарь'], rule: 'A-02', need: true },
  { key: 'состав', aliases: ['состав', 'персонажи'], rule: 'R-90', need: true },
  { key: 'скрытая правда', aliases: ['скрытая правда', 'правда'], rule: 'R-92', need: false },
  { key: 'финалы', aliases: ['финалы'], rule: 'R-03', need: false },
];

const ALIAS = new Map(CORE_FIELDS.flatMap((f) => f.aliases.map((a) => [a, f.key])));

/** Поля «- ключ: значение» из куска текста. Неизвестные ключи (вид, почему, опора) — в other. */
export function coreFields(lines) {
  const fields = {};
  const other = {};
  for (const l of lines) {
    const m = l.match(/^\s*[-*]\s+\**([^:*]+?)\**:\**\s*(.*)$/);
    if (!m) continue;
    const key = m[1].trim().toLowerCase();
    const name = ALIAS.get(key);
    if (name) fields[name] = m[2].trim();
    else other[key] = m[2].trim();
  }
  return { fields, other };
}

/** Записи D-NN с полями: заголовок — как у story:status, тело — до следующего заголовка. */
export function decisionsWithFields(text) {
  const heads = parseDecisions(text);
  const lines = text.split('\n');
  return heads.map((d, i) => {
    const end = heads[i + 1] ? heads[i + 1].line - 1 : lines.length;
    const body = lines.slice(d.line, end);
    const { fields, other } = coreFields(body);
    return { ...d, fields, other, kind: other['вид'] ?? null, replaces: other['заменяет'] ?? null };
  });
}

export const readText = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '');

/**
 * Текущее ядро истории. Порядок: черновик (--draft) → «ядро: D-NN» из STATUS.md → последняя запись «вид: ядро».
 * Возвращает { source, id, fields, other, status, decisions } или source: null, если ядра нет.
 */
export function readCore(id, { draft = null, dir = STATE_DIR } = {}) {
  const sdir = id ? join(dir, id) : null;
  const status = sdir ? parseStatus(readText(join(sdir, 'STATUS.md'))) : { fields: {} };
  const decisions = sdir ? decisionsWithFields(readText(join(sdir, 'decisions.md'))) : [];
  if (draft) {
    if (!existsSync(draft)) throw new Error(`нет черновика ${draft}`);
    const { fields, other } = coreFields(readText(draft).split('\n'));
    return { source: 'draft', id: draft, fields, other, status, decisions };
  }
  const pointer = status.fields?.core ?? null;
  const cores = decisions.filter((d) => d.kind === 'ядро' || /^ядро\b/i.test(d.what ?? ''));
  const hit = (pointer && decisions.find((d) => d.id === pointer)) ?? cores.at(-1) ?? null;
  if (!hit) return { source: null, id: null, fields: {}, other: {}, status, decisions };
  return { source: 'decisions', id: hit.id, fields: hit.fields, other: hit.other, status, decisions, entry: hit };
}

/** История из src/stories, если она уже есть: шапка ink, персонажи, минуты карточки. Нет — null. */
export function readInk(id) {
  if (!id || !existsSync(join(STORIES_DIR, id))) return null;
  const story = loadStory(id);
  const tree = parseStory(story);
  return { story, tree, head: tree.head ?? {}, meta: story.meta ?? {}, characters: story.meta?.characters ?? [] };
}

/**
 * Имена осей из строки «оси: zoya_trust (доверие Зои), risk, evidence». Пояснения в скобках выбрасываются,
 * имя — латиница, как у VAR: иначе «исход ночи» из пояснения сойдёт за переменную.
 */
export function axisNames(value) {
  return String(value ?? '').replace(/\([^)]*\)/g, '').split(/[,;]/)
    .map((s) => s.trim().match(/^[A-Za-z_][A-Za-z0-9_]*(?=\s|$)/)?.[0]).filter(Boolean);
}

/** Состав: «zoya — просит найти брата — верит, что он невиновен; ostap — …» → [{ id, parts }]. */
export function castEntries(value) {
  return String(value ?? '').split(';').map((s) => s.trim()).filter(Boolean)
    .map((s) => { const parts = s.split(/\s+[—–-]\s+/).map((p) => p.trim()); return { id: parts[0], parts }; });
}

/**
 * Календарь мира из поля «время мира»: «гл.1 д1 21:00; гл.2 д2 08:00; гл.3 д2» → [{ chapter, day, minutes|null }].
 * Часы пишет автор истории (это данные истории, а не порог); без часов — только день.
 */
export function calendar(value) {
  const out = [];
  for (const m of String(value ?? '').matchAll(/гл\.?\s*(\d+)\s*[:—–-]?\s*д(?:ень)?\s*(\d+)(?:[\s,]+(\d{1,2}):(\d{2}))?/giu)) {
    out.push({ chapter: Number(m[1]), day: Number(m[2]), minutes: m[3] != null ? Number(m[3]) * 60 + Number(m[4]) : null });
  }
  return out.sort((a, b) => a.chapter - b.chapter);
}

/** Значение порога или null, если ключа нет: скрипт тогда пишет «нет ключа», а не подставляет число. */
export function maybe(key) {
  try { return thresholds().value(key); } catch { return null; }
}

/** npm run -s <скрипт> -- <аргументы> --json → объект; упала — { error }. Те же числа, что у команды. */
export function npmJson(script, args) {
  const r = spawnSync('npm', ['run', '-s', script, '--', ...args, '--json'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0 && r.status !== 1) return { error: `нет данных: npm run ${script} -- ${args.join(' ')} (код ${r.status}) ${(r.stderr || '').trim().split('\n')[0] ?? ''}`.trim() };
  try { return JSON.parse(r.stdout); } catch { return { error: `нет данных: npm run ${script} -- ${args.join(' ')} (вывод не JSON)` }; }
}

/** Нормализация для сравнения шапки ink с полем ядра: регистр, ё, пробелы, кавычки и точка в конце. */
export const norm = (s) => String(s ?? '').toLowerCase().replace(/ё/g, 'е').replace(/[«»"“”`]/g, '').replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();

/** Длительность в секундах → «1 д 4 ч», «3 ч 20 мин». */
export function dur(s) {
  if (s == null || Number.isNaN(s)) return '—';
  const m = Math.round(s / 60);
  const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
  return [d ? `${d} д` : '', h ? `${h} ч` : '', mm ? `${mm} мин` : ''].filter(Boolean).join(' ') || '0 мин';
}
