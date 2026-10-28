// Проверка одной главы после письма: check:story и story:lint по всей истории, находки — только главы N
// (остальное числом), плюс молчание у кнопок в реальном времени: где «неотвечающий» застрял без #remind и
// #noanswer (кнопка ждёт вечно — старое поведение движка, решение автора A-03 — 1–2 напоминания и дальше).
// Числа не пересчитываем: находки — из story:lint, молчание — из бота story:trace (runOnce).
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';
import { BETA_STOP, prepare, runOnce } from '../../../../scripts/story/core/run.mjs';

const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/chapter-lint.mjs --story <id> --chapter N [--quick] [--partial] [--runs N] [--json]

Проверка главы N после письма (скилл chapter-write). Обёртка, чисел не пересчитывает:
  сборка       check:story по истории: компиляция, тупики, недостижимые узлы (seed 1, как у хука)
  lint главы   story:lint по всей истории, находки с главой N — целиком; прочие главы — числом по проверкам
  молчание     «неотвечающий» в реальном времени (skill.chapter.context_runs прогонов, не больше 20): развилки главы N,
               где кнопка ждёт вечно (нет ни #remind, ни #noanswer), сколько напоминаний было у остальных
               (не больше story.reminders.max) — решение автора A-03, R-120, ST-66
Режим части (--partial) включается сам, если в истории есть узел beta_stop: тогда проверки, которым нужна
вся история (C-01, C-03, C-06, C-40…), пропускаются.

  --story <id>  история из src/stories
  --chapter N   глава
  --quick       story:lint --quick (lint.runs.quick прогонов) — как быстрый хук
  --partial     режим части явно (иначе — по узлу beta_stop)
  --runs N      прогонов «неотвечающего» вместо умолчания
  --json        всё данными
  --help        эта справка

Код выхода 1 — ошибки в главе N или история не собирается.`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const T = thresholds();

function runJson(script, argv) {
  try {
    return JSON.parse(execFileSync(process.execPath, [join(ROOT, script), ...argv, '--json'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }));
  } catch (e) {
    if (e.stdout) { try { return JSON.parse(e.stdout); } catch { /* ниже */ } }
    return { error: String(e.stderr || e.message).split('\n').filter(Boolean).slice(0, 6).join(' / ') };
  }
}

export function chapterLint(id, chapter, { quick = false, partial = null, runs = null } = {}) {
  const out = { story: id, chapter, partial: false, compiled: false, build: [], findings: [], other: {}, silence: null };
  const cs = runJson('scripts/check-story.mjs', [id, '--seed', '1']);
  const s = cs.stories?.[0];
  if (!s) { out.build.push({ level: 'error', message: cs.error ?? 'check:story не запустился' }); return out; }
  if (s.errors) { out.build.push(...s.errors.map((e) => ({ level: 'error', message: `${e.file ?? ''}:${e.line ?? '?'} ${e.message}` }))); return out; }
  out.compiled = true;
  if (s.endings < s.runs) out.build.push({ level: 'error', message: `тупик: до конца дошли ${s.endings} прохождений из ${s.runs}` });
  if (s.nodes.unvisited.length) out.build.push({ level: 'error', message: `узлы недостижимы: ${s.nodes.unvisited.join(', ')}` });
  for (const pr of s.problems ?? []) out.build.push({ level: 'warning', message: pr });

  const p = prepare(id);
  out.partial = partial ?? p.nodes.includes(BETA_STOP);
  const chapterOf = new Map(p.tree.knots.map((k) => [k.id, k.chapter]));
  const lint = runJson('scripts/lint/lint.mjs', [id, ...(quick ? ['--quick'] : []), ...(out.partial ? ['--partial'] : [])]);
  if (lint.error) out.build.push({ level: 'error', message: `story:lint: ${lint.error}` });
  for (const f of lint.stories?.[0]?.findings ?? []) {
    const ch = f.chapter ?? (f.node ? chapterOf.get(f.node.split('.')[0]) : null);
    if (ch === chapter) out.findings.push({ level: f.level, check: f.check, node: f.node, message: f.message, threshold: f.threshold ?? null });
    else {
      const k = ch == null ? 'история' : `гл. ${ch}`;
      out.other[k] = (out.other[k] ?? 0) + 1;
    }
  }
  out.silence = silence(p, chapter, out.partial, runs ?? Math.min(T.value('skill.chapter.context_runs'), 20));
  return out;
}

/** Развилки главы у «неотвечающего»: напоминания и застревания (кнопка ждёт вечно). p — prepare(<id или путь>). */
export function silence(p, chapter, partial, runs) {
  const max = T.value('story.reminders.max');
  const at = new Map();
  for (let seed = 1; seed <= runs; seed++) {
    const r = runOnce(p, { persona: 'unresponsive', seed, partial, mode: 'realtime' });
    let reminders = 0;
    for (const i of r.timeline.items) {
      if (i.chapter !== chapter) { if (i.type === 'choice') reminders = 0; continue; }
      if (i.type === 'remind') { reminders++; continue; }
      if (i.type === 'stall') {
        const e = at.get(i.knot) ?? { knot: i.knot, stall: 0, answered: 0, reminders: new Set(), reasons: new Set() };
        e.stall++; e.reasons.add(i.reason ?? 'кнопка ждёт'); e.reminders.add(i.reminders ?? 0);
        at.set(i.knot, e);
        reminders = 0;
        continue;
      }
      if (i.type === 'choice') {
        const e = at.get(i.knot) ?? { knot: i.knot, stall: 0, answered: 0, reminders: new Set(), reasons: new Set() };
        if (i.noAnswer) { e.answered++; e.reminders.add(reminders); }
        at.set(i.knot, e);
        reminders = 0;
      }
    }
  }
  const list = [...at.values()].map((e) => ({ knot: e.knot, stalls: e.stall, no_answer: e.answered, reminders: [...e.reminders].sort(), reasons: [...e.reasons] }));
  return {
    runs, max,
    waits_forever: list.filter((e) => e.stalls > 0),
    over: list.filter((e) => e.reminders.some((n) => n > max)),
    ok: list.filter((e) => !e.stalls && e.no_answer > 0),
  };
}

function format(r) {
  const L = [];
  const errs = r.findings.filter((f) => f.level === 'error').length + r.build.filter((b) => b.level === 'error').length;
  L.push(`${errs ? '✗' : '✓'} ${r.story} · глава ${r.chapter}${r.partial ? ` · часть (${BETA_STOP})` : ''}`);
  L.push('', 'сборка (check:story):');
  if (!r.build.length) L.push('  ✓ компилируется, тупиков и недостижимых узлов нет');
  for (const b of r.build) L.push(`  ${b.level === 'error' ? '✗' : '⚠'} ${b.message}`);
  if (!r.compiled) return L.join('\n');
  const mark = { error: '✗', warning: '⚠', hint: '·' };
  L.push('', `story:lint, глава ${r.chapter}: ${r.findings.length ? '' : 'находок нет'}`);
  for (const lvl of ['error', 'warning', 'hint']) {
    for (const f of r.findings.filter((x) => x.level === lvl)) L.push(`  ${mark[lvl]} ${f.check} · ${f.node ?? '—'} · ${f.message}${f.threshold ? ` · ${f.threshold}` : ''}`);
  }
  const other = Object.entries(r.other);
  if (other.length) L.push(`  вне главы: ${other.map(([k, v]) => `${k} — ${v}`).join(', ')} (полный список — node scripts/hooks/full.mjs ${r.story})`);
  const s = r.silence;
  L.push('', `молчание у кнопок, реальное время («неотвечающий», ${s.runs} прогонов):`);
  if (!s.waits_forever.length && !s.over.length && !s.ok.length) L.push('  развилок главы на пути «неотвечающего» нет');
  for (const e of s.waits_forever) L.push(`  ⚠ ${e.knot}: кнопка ждёт вечно (${e.stalls}×) — нет #remind и #noanswer; если собеседник ждёт ответа — 1–${s.max} #remind и #noanswer или #silent (pause-lines.md)`);
  for (const e of s.over) L.push(`  ✗ ${e.knot}: напоминаний ${e.reminders.join('|')} — больше story.reminders.max (${s.max})`);
  for (const e of s.ok) L.push(`  ✓ ${e.knot}: напоминаний ${e.reminders.join('|')}, дальше — ветка «не ответил»`);
  return L.join('\n');
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  try {
    const id = opt('--story');
    const chapter = Number(opt('--chapter'));
    if (!id || !Number.isInteger(chapter) || chapter < 1) throw new Error('нужны --story <id> и --chapter N (см. --help)');
    const r = chapterLint(id, chapter, { quick: args.includes('--quick'), partial: args.includes('--partial') ? true : null, runs: opt('--runs') ? Number(opt('--runs')) : null });
    console.log(args.includes('--json') ? JSON.stringify(r, null, 2) : format(r));
    const errs = r.findings.filter((f) => f.level === 'error').length + r.build.filter((b) => b.level === 'error').length;
    process.exitCode = errs || !r.compiled ? 1 : 0;
  } catch (e) {
    console.error(`chapter-lint: ${e.message}`);
    process.exit(1);
  }
}
