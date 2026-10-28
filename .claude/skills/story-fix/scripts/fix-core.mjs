// Общее для скриптов story-fix: запуск команд story:* с --json, история на двух ревизиях, дерево ink.
// Сам ничего не считает сверх scripts/lib и scripts/story: обёртка, чтобы числа совпадали с командами.
import { spawnSync } from 'node:child_process';
import { closeSync, mkdtempSync, openSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { allMarks } from '../../../../scripts/lib/ink.mjs';
import { loadStory, parseStory } from '../../../../scripts/lib/story.mjs';
import { dialogueMap, lineDiff } from '../../../../scripts/story/core/dialogue.mjs';
import { VISIBLE, varIndex } from '../../../../scripts/story/core/vars-index.mjs';
import { WORKTREE, describeRef, isWorktree, storyAt } from '../../../../scripts/story/core/revisions.mjs';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const STORY_CMD = { diff: 'scripts/story/diff.mjs', trace: 'scripts/story/trace.mjs', sessions: 'scripts/story/sessions.mjs', cast: 'scripts/story/cast.mjs', vars: 'scripts/story/vars.mjs', endings: 'scripts/story/endings.mjs', lint: 'scripts/lint/lint.mjs' };

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/fix-core.mjs --help

Модуль для скриптов story-fix (fix-guard, text-diff, diff-report, pick, compress-plan): запуск команд
story:* с --json, история на ревизии git, дерево ink. Сам по себе ничего не делает.`;

export function parseCli(argv, bool = []) {
  const flags = new Map();
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { positional.push(a); continue; }
    const k = a.slice(2);
    if (bool.includes(k) || i + 1 >= argv.length || argv[i + 1].startsWith('--')) flags.set(k, true);
    else flags.set(k, argv[++i]);
  }
  return { flags, positional, has: (k) => flags.has(k), get: (k, d = null) => (flags.has(k) ? flags.get(k) : d) };
}

/** Команда story:* с --json → { ok, data, error, cmd }. stdout — в файл: story:lint выходит через process.exit и обрезает трубу. */
export function storyJson(cmd, args) {
  const script = STORY_CMD[cmd];
  const label = `npm run story:${cmd === 'lint' ? 'lint' : cmd} -- ${args.join(' ')}`;
  const dir = mkdtempSync(join(tmpdir(), 'story-fix-'));
  const out = join(dir, 'out.json');
  const fd = openSync(out, 'w');
  try {
    const r = spawnSync(process.execPath, [join(ROOT, script), ...args, '--json'], { cwd: ROOT, stdio: ['ignore', fd, 'pipe'], encoding: 'utf8', maxBuffer: 1 << 28 });
    closeSync(fd);
    const text = readFileSync(out, 'utf8');
    if (r.status !== 0 && !text.trim()) return { ok: false, error: (r.stderr || `код ${r.status}`).trim().split('\n').slice(-3).join(' '), cmd: label };
    try { return { ok: true, data: JSON.parse(text), cmd: label }; } catch { return { ok: false, error: 'вывод не JSON', cmd: label }; }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** История на двух ревизиях: пути (null — истории там нет) и уборка временной папки. */
export function twoVersions(id, from = 'HEAD', to = WORKTREE) {
  const a = describeRef(from);
  const b = describeRef(to);
  const tmp = mkdtempSync(join(tmpdir(), 'story-fix-rev-'));
  return { a, b, before: storyAt(a, id, tmp), after: storyAt(b, id, tmp), label: (r) => (isWorktree(r.ref) ? 'рабочая копия' : `${r.ref} (${r.short})`), done: () => rmSync(tmp, { recursive: true, force: true }) };
}

export const treeOf = (path) => (path ? parseStory(loadStory(path)) : null);

/** Нормализация строки для поиска текста варианта в файлах: без отступов, комментариев и хвостовых пробелов. */
export const normLine = (s) => s.replace(/\/\/.*$/, '').replace(/\s+/g, ' ').trim();

/**
 * Сравнение деревьев «до» и «после» для fix-guard.mjs: узлы, переменные (запись и видимое чтение, как C-01…C-03),
 * финалы, улики (// reveal:), убранные реплики со словами facts.md, новые // намеренно:.
 * @returns {{ area, level: '✓'|'⚠'|'✗'|'·', text }[]}
 */
export function compareTrees(A, B, { factsText = null } = {}) {
  const items = [];
  const add = (area, level, text) => items.push({ area, level, text });
  const marksA = allMarks(A);
  const marksB = allMarks(B);
  const finalsA = new Set(marksA.filter((m) => m.kind === 'финал').map((m) => m.value));
  const revealAt = (marks) => new Map(marks.filter((m) => m.kind === 'reveal').flatMap((m) => m.value.split(',').map((c) => [c.trim(), m.knot])).filter(([c]) => c));

  // узлы
  const idsB = new Set(B.knots.map((k) => k.id));
  const revealKnots = new Set(marksA.filter((m) => m.kind === 'reveal').map((m) => m.knot));
  const finalKnots = new Set(marksA.filter((m) => m.kind === 'финал').map((m) => m.knot));
  const gone = A.knots.filter((k) => !idsB.has(k.id));
  for (const k of gone) add('узлы', finalKnots.has(k.id) || revealKnots.has(k.id) ? '✗' : '⚠', `удалён узел ${k.id}${finalKnots.has(k.id) ? ' — это был финал' : ''}${revealKnots.has(k.id) ? ' — здесь раскрывалась улика' : ''}`);
  if (!gone.length) add('узлы', '✓', `удалённых узлов нет (было ${A.knots.length}, стало ${B.knots.length})`);

  // переменные: запись и видимое чтение — то, что ловят C-01…C-03
  const ia = varIndex(A);
  const ib = varIndex(B);
  const visible = (x) => (x?.reads ?? []).filter((r) => VISIBLE.has(r.kind)).length;
  let varIssues = 0;
  for (const a of ia.vars) {
    const b = ib.byName.get(a.name);
    if (!b) { add('переменные', '⚠', `переменная ${a.name} удалена — кнопки, которые её писали, больше ничего не помнят`); varIssues++; continue; }
    if (a.writes.length && !b.writes.length) { add('переменные', '✗', `${a.name}: исчезли все записи — выбор, который её ставил, больше ничего не значит`); varIssues++; }
    else if (b.writes.length < a.writes.length) { add('переменные', '⚠', `${a.name}: записей ${a.writes.length} → ${b.writes.length} — убрана кнопка или ветка, которая её ставила`); varIssues++; }
    if (visible(a) && !visible(b)) { add('переменные', '✗', `${a.name}: пропало последнее видимое чтение — игрок больше не увидит след выбора (C-03)`); varIssues++; }
    if (ia.final.has(a.name) && !ib.final.has(a.name)) { add('переменные', '⚠', `${a.name}: финал её больше не читает — распределитель изменился`); varIssues++; }
  }
  for (const b of ib.vars) {
    if (ia.byName.has(b.name)) continue;
    add('переменные', visible(b) ? '✓' : '⚠', `новая переменная ${b.name}: записей ${b.writes.length}, видимых чтений ${visible(b)}${visible(b) ? '' : ' — без чтения это C-01/C-03, нужно эхо (F-08)'}`);
    if (!visible(b)) varIssues++;
  }
  if (!varIssues) add('переменные', '✓', `записи и видимые чтения на месте (${ia.vars.length} → ${ib.vars.length})`);

  // финалы
  const finalsB = new Set(marksB.filter((m) => m.kind === 'финал').map((m) => m.value));
  const lostFinals = [...finalsA].filter((f) => !finalsB.has(f));
  for (const f of lostFinals) add('финалы', '✗', `пропала метка // финал: ${f}`);
  if (!lostFinals.length) add('финалы', '✓', finalsA.size ? `метки финалов на месте (${finalsA.size})` : 'меток // финал: нет ни до, ни после');

  // улики: метки и реплики в узлах раскрытия
  const ra = revealAt(marksA);
  const rb = revealAt(marksB);
  let clueIssues = 0;
  for (const [clue, knot] of ra) {
    if (!rb.has(clue)) { add('улики', '✗', `пропала // reveal: ${clue} (была над ${knot})`); clueIssues++; }
    else if (rb.get(clue) !== knot) { add('улики', '⚠', `// reveal: ${clue} переехала ${knot} → ${rb.get(clue)}: улика теперь раньше или позже — сверить порядок раскрытий (story-mystery)`); clueIssues++; }
  }
  const da = dialogueMap(A);
  const db = dialogueMap(B);
  const removedIn = (knot) => lineDiff(da.get(knot)?.lines ?? [], db.get(knot)?.lines ?? []).filter((x) => x.op === '-').map((x) => x.text.trim());
  for (const knot of revealKnots) {
    if (!idsB.has(knot)) continue;
    const lost = removedIn(knot);
    if (lost.length) { add('улики', '⚠', `в узле раскрытия ${knot} убрано реплик: ${lost.length} — «${lost[0].slice(0, 70)}»: улика осталась на стволе? (RED-10)`); clueIssues++; }
  }
  if (!clueIssues) add('улики', '✓', ra.size ? `метки // reveal: на месте (${ra.size})` : 'меток // reveal: нет — если в истории есть загадка, улики не размечены (A-06)');

  // факты: убранные реплики со словами из facts.md — кандидаты «пропала улика или мотив»
  if (factsText != null) {
    const stems = new Set((factsText.toLowerCase().replace(/ё/g, 'е').match(/[\p{L}]{6,}/gu) ?? []).map((w) => w.slice(0, 6)));
    const hits = [];
    for (const knot of new Set([...da.keys()])) {
      for (const line of idsB.has(knot) ? removedIn(knot) : []) {
        const words = (line.toLowerCase().replace(/ё/g, 'е').match(/[\p{L}]{6,}/gu) ?? []).map((w) => w.slice(0, 6));
        if (words.some((w) => stems.has(w))) hits.push(`${knot}: «${line.slice(0, 60)}»`);
      }
    }
    if (hits.length) add('факты', '⚠', `убраны реплики со словами из facts.md (${hits.length}): ${hits.slice(0, 4).join('; ')}${hits.length > 4 ? '; …' : ''} — улика или мотив не пропали? (RED-10)`);
    else add('факты', '✓', 'убранных реплик со словами из facts.md нет');
  } else add('факты', '·', 'нет docs/stories/<id>/facts.md — улики и мотивы сверяются только по // reveal:');

  // метки «намеренно»: каждая гасит проверку и требует решения
  const key = (m) => `${m.knot}|${m.id}`;
  const oldMarks = new Set(marksA.filter((m) => m.kind === 'намеренно').map(key));
  const fresh = marksB.filter((m) => m.kind === 'намеренно' && !oldMarks.has(key(m)));
  for (const m of fresh) add('метки', m.reason ? '⚠' : '✗', `новая // намеренно: ${m.id} над ${m.knot}${m.reason ? ` («${m.reason}») — запиши решение D-NN через story-desk` : ' без причины — так метку не ставят'}`);
  if (!fresh.length) add('метки', '✓', 'новых // намеренно: нет');

  return items;
}

// ───────── отчёт линзы: находки и варианты А/Б/В (pick.mjs)

const FINDING = /^\s*(?:[-*]\s*)?(?:\*\*)?(P[123])(?:\*\*)?\s*·\s*(.+)$/;
const VARIANT = /^\s*(?:#+\s*)?(?:[-*]\s*)?(?:\*\*)?Вариант\s+([А-Еа-еA-Ea-e])(?![\p{L}])[\s.:·—*-]*(.*)$/u;
const FENCE = /^\s*```(\w*)\s*$/;

/** Отчёт линзы → находки с вариантами; ink-блоки вне варианта (до первого «Вариант») относятся к находке. */
export function parseReport(text) {
  const findings = [];
  let cur = null;
  let variant = null;
  let fence = null;
  let label = '';
  for (const line of text.split('\n')) {
    if (fence) {
      if (FENCE.test(line) && !FENCE.exec(line)[1]) {
        if (fence.lang === 'ink' && variant) {
          const slot = /после/i.test(fence.label) ? 'after' : /до\b|было/i.test(fence.label) ? 'before' : variant.before == null ? 'before' : 'after';
          variant[slot] = fence.body.join('\n');
        }
        fence = null;
        label = '';
      } else fence.body.push(line);
      continue;
    }
    const f = line.match(FENCE);
    if (f) { fence = { lang: f[1], body: [], label }; continue; }
    const fm = line.match(FINDING);
    if (fm) {
      const parts = fm[2].split('·').map((x) => x.trim());
      cur = { n: findings.length + 1, line: line.trim().replace(/^[-*]\s*/, ''), priority: fm[1], node: parts[1] ?? '', fix: (parts.find((p) => /F-\d\d|→/.test(p)) ?? '').trim(), variants: [] };
      findings.push(cur);
      variant = null;
      continue;
    }
    const vm = line.match(VARIANT);
    if (vm && cur) {
      variant = { key: vm[1].toUpperCase().replace('A', 'А').replace('B', 'Б').replace('C', 'В'), title: vm[2].trim(), before: null, after: null, text: [] };
      cur.variants.push(variant);
      label = '';
      continue;
    }
    if (line.trim()) label = line;
    if (variant && line.trim() && !/^\s*\**(до|после|было|стало)\**\s*:?\s*\**\s*$/i.test(line)) variant.text.push(line.trim());
  }
  return findings;
}

/** Где в файлах истории ({ имя: текст }) стоит ink «до»: все непустые строки подряд, без отступов и комментариев. */
export function locateBefore(files, before) {
  const want = before.split('\n').map(normLine).filter(Boolean);
  if (!want.length) return { found: false, why: 'пустой блок «до»' };
  for (const f of Object.keys(files).sort()) {
    const lines = files[f].split('\n').map(normLine);
    const flat = lines.map((l, i) => ({ l, i })).filter((x) => x.l);
    for (let k = 0; k + want.length <= flat.length; k++) {
      if (want.every((w, j) => flat[k + j].l === w)) return { found: true, where: `${f}:${flat[k].i + 1}` };
    }
  }
  return { found: false, why: 'ink «до» не найден в файлах — узел правили после отчёта, отчёт устарел' };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  console.log(HELP);
  process.exit(0);
}
