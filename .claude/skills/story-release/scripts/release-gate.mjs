// Гейт выпуска (скилл story-release, build-plan.md §5, flow-review.md шаг 10): можно ли выпускать историю.
// Пункты — по одному на строку: шаг цикла, все главы, story:lint без ошибок, вторая волна теста, карточка и
// два времени, платная граница, ревизия, файл выпуска. Каждый пункт — команда, а не взгляд: числа берутся из
// story:lint, story:sessions и скриптов скилла. ✗ — выпускать нельзя, ⚠ — решить до выпуска, ℹ — к сведению.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadStory, parseStory } from '../../../../scripts/lib/story.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';
import { lintStory, loadChecks } from '../../../../scripts/lint/core.mjs';
import { plural } from '../../../../scripts/lint/text.mjs';
import { parseStatus, STATE_DIR } from '../../../../scripts/story/core/state.mjs';
import { cardCheck } from './card-check.mjs';
import { boundaryCheck } from './boundary-check.mjs';
import { revisionCheck } from './revision-check.mjs';
import { packCheck } from './pack.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/release-gate.mjs <id|путь> [--skip <пункт>,…] [--runs N] [--json]

Гейт выпуска — пункт за пунктом, каждый командой:
  шаг        docs/stories/<id>/STATUS.md: шаг playtest:wave2 или release (иначе выпуск раньше цикла)
  главы      все главы на месте: chapters в meta.json = строки #chapter; узла beta_stop нет; бот доходит до
             последней главы
  линт       npm run story:lint без ошибок (skill.release.lint_errors); предупреждения — списком по проверкам;
             этика — находки C-27, C-32, C-37, C-47 отдельной строкой (references/ethics.md)
  тест       вторая волна: docs/stories/<id>/playtests/wave-2/ или симуляция (sim-<дата>/, отчёт
             reviews/<дата>-story-playtest.md о второй волне) не старше последней правки src/stories/<id>
  карточка   card-check.mjs: C-49, счёт глав и героев, два времени (durations.mjs)
  граница    boundary-check.mjs: крючок перед free_chapters и выплата сразу после
  ревизия    revision-check.mjs: правка ломает сохранения — revision поднята
  файл       pack.mjs: story:pack --check без потерь
Код выхода 1, если есть хоть один ✗.

  --skip     пропустить пункты (например, тест для истории вне каталога): шаг,главы,линт,тест,карточка,граница,ревизия,файл
  --runs N   прогонов бота (по умолчанию lint.runs.full, как у story:lint)
  --json     всё данными
  --help     эта справка`;

const ETHICS = ['C-27', 'C-32', 'C-37', 'C-47'];
const DATE = /(\d{4}-\d{2}-\d{2})/;

/** Дата последней правки истории: коммит по src/stories/<id> или сегодня, если есть незакоммиченное. */
function lastChange(path) {
  try {
    if (execFileSync('git', ['status', '--porcelain', '--', path], { encoding: 'utf8' }).trim()) return new Date().toISOString().slice(0, 10);
    return execFileSync('git', ['log', '-1', '--format=%cs', '--', path], { encoding: 'utf8' }).trim() || null;
  } catch { return null; }
}

/** Свидетельства второй волны: живая волна, симуляция или отчёт о ней; с датой, если она в имени. */
function waveTwo(id) {
  const dir = join(STATE_DIR, id);
  const out = [];
  const pt = join(dir, 'playtests');
  if (existsSync(pt)) {
    for (const f of readdirSync(pt)) {
      const p = join(pt, f);
      if (!statSync(p).isDirectory() || !readdirSync(p).length) continue;
      if (/^wave-?2$/.test(f)) out.push({ kind: 'живая волна', path: p, date: null });
      else if (/^sim-/.test(f)) out.push({ kind: 'симуляция', path: p, date: f.match(DATE)?.[1] ?? null });
    }
  }
  const rv = join(dir, 'reviews');
  if (existsSync(rv)) {
    for (const f of readdirSync(rv).filter((x) => /story-playtest/.test(x))) {
      const text = readFileSync(join(rv, f), 'utf8');
      if (/wave-?2|волн[аы] 2|втор(ая|ой) волн/i.test(text)) out.push({ kind: 'отчёт о второй волне', path: join(rv, f), date: f.match(DATE)?.[1] ?? null });
    }
  }
  return out;
}

export async function releaseGate(ref, { skip = [], runs } = {}, T = thresholds()) {
  const story = loadStory(ref);
  const id = story.id;
  const items = [];
  const add = (name, mark, text, data) => items.push({ name, mark, text, ...(data ? { data } : {}) });
  const on = (name) => !skip.includes(name);
  runs ??= T.value('lint.runs.full');

  if (on('шаг')) {
    const file = join(STATE_DIR, id, 'STATUS.md');
    const st = existsSync(file) ? parseStatus(readFileSync(file, 'utf8')) : null;
    if (!st) add('шаг', '⚠', `нет ${file}: шаг цикла неизвестен (story-desk)`);
    else if (['playtest:wave2', 'release'].includes(st.step)) add('шаг', '✓', `шаг ${st.step}`);
    else add('шаг', '⚠', `шаг ${st.step ?? '—'}: выпуск раньше цикла (нужны review:full и playtest:wave2)`, { step: st.step, questions: st.questions.length });
  }

  let lint = null;
  let ctx = null;
  // тот же полный прогон, что у story:lint, плюс зонд: журнал бота нужен, чтобы видеть, доходят ли до последней главы
  const probe = { id: 'probe', plan: false, partial: true, run(c) { ctx = c; } };
  if (on('главы') || on('линт')) lint = await lintStory(story, T, { runs, checks: [...(await loadChecks()), probe] });
  if (on('главы') && lint) {
    const compiled = !lint.compile;
    const meta = story.meta ?? {};
    const tree = parseStory(story);
    const inInk = tree.chapters.length;
    const inMeta = meta.chapters?.length ?? 0;
    const beta = tree.knots.some((k) => k.id === 'beta_stop');
    const problems = [];
    if (!compiled) problems.push('не компилируется');
    if (inMeta !== inInk) problems.push(`в meta.json глав ${inMeta}, строк #chapter ${inInk}`);
    if (beta) problems.push('есть узел beta_stop — это набор для теста, а не вся история');
    const reached = ctx?.runs.filter((r) => r.lines.some((l) => l.chapter === inInk)).length ?? 0;
    if (compiled && !reached) problems.push(`ни одно прохождение не дошло до главы ${inInk}`);
    const total = ctx?.runs.length ?? 0;
    add('главы', problems.length ? '✗' : '✓', problems.length ? problems.join('; ') : `${plural(inInk, 'глава', 'главы', 'глав')}, все в meta.json, beta_stop нет; до главы ${inInk} дошли ${reached} из ${total} прохождений`, { chapters: inInk, meta: inMeta, reached, runs: total });
  }

  if (on('линт') && lint) {
    const errors = lint.findings.filter((f) => f.level === 'error');
    const warns = lint.findings.filter((f) => f.level === 'warning');
    const byCheck = (list) => Object.entries(list.reduce((m, f) => ({ ...m, [f.check]: (m[f.check] ?? 0) + 1 }), {})).map(([c, n]) => `${c}×${n}`).join(', ');
    const max = T.value('skill.release.lint_errors');
    add('линт', errors.length > max ? '✗' : warns.length ? '⚠' : '✓', `ошибок ${errors.length}${errors.length ? ` (${byCheck(errors)})` : ''}, предупреждений ${warns.length}${warns.length ? ` (${byCheck(warns)})` : ''}`, {
      errors: errors.map((f) => ({ check: f.check, node: f.node, message: f.message })),
      warnings: warns.map((f) => ({ check: f.check, node: f.node, message: f.message })),
    });
    const eth = lint.findings.filter((f) => ETHICS.includes(f.check) && f.level !== 'hint');
    add('этика', eth.length ? '⚠' : '✓', eth.length ? `давление, сроки и упрёки: ${byCheck(eth)} — сверить с references/ethics.md` : 'C-27, C-32, C-37, C-47 без ошибок и предупреждений', eth.length ? eth.map((f) => ({ check: f.check, node: f.node, message: f.message })) : null);
  }

  if (on('тест')) {
    const ev = waveTwo(id);
    const changed = lastChange(story.path);
    const fresh = ev.filter((e) => !e.date || !changed || e.date >= changed);
    if (!ev.length) add('тест', '✗', `второй волны нет: ни ${join(STATE_DIR, id, 'playtests')}/wave-2/, ни симуляции, ни отчёта (story-playtest)`);
    else if (!fresh.length) add('тест', '⚠', `вторая волна старше последней правки (${changed}): ${ev.map((e) => `${e.kind} ${e.date}`).join(', ')} — повторить на правленых главах`, ev);
    else add('тест', '✓', fresh.map((e) => `${e.kind}${e.date ? ` ${e.date}` : ''}`).join(', '), ev);
  }

  if (on('карточка')) {
    const c = await cardCheck(ref, { runs });
    if (c.error) add('карточка', '✗', `нет данных: card-check.mjs (${c.error})`);
    else {
      const hard = (c.durations?.problems ?? []).filter((p) => p.startsWith('✗')).concat(c.durations?.error ? [c.durations.error] : []);
      const soft = [...c.problems.filter((p) => p.startsWith('⚠')), ...c.findings.filter((f) => f.part !== 'г'), ...(c.durations?.problems ?? []).filter((p) => p.startsWith('⚠'))];
      const time = c.durations && !c.durations.error ? ` · для карточки "minutes": ${c.durations.propose.minutes}, "days": ${c.durations.propose.days}` : '';
      add('карточка', hard.length ? '✗' : soft.length ? '⚠' : '✓', `${hard.length ? `${hard.join('; ')}; ` : ''}C-49: ${c.findings.filter((f) => f.part !== 'г').length}, прочего: ${soft.length - c.findings.filter((f) => f.part !== 'г').length}${time}`, c);
    }
  }

  if (on('граница')) {
    const b = await boundaryCheck(ref, { runs });
    if (b.error) add('граница', '✗', `нет данных: boundary-check.mjs (${b.error})`);
    else if (b.free == null) add('граница', 'ℹ', b.note);
    else add('граница', b.problems.length ? '⚠' : '✓', b.problems.length ? `после главы ${b.free}: ${b.problems.length} — ${b.problems.map((p) => p.message).join('; ')}` : `после главы ${b.free}: крючок и выплата на месте`, b);
  }

  if (on('ревизия')) {
    const r = story.path.startsWith('src/stories') ? revisionCheck(ref) : { verdict: 'first', message: 'история вне src/stories — сравнивать не с чем' };
    if (r.error) add('ревизия', '⚠', `нет данных: revision-check.mjs (${r.error})`);
    else add('ревизия', { bump: '✗', lower: '✗', needless: '⚠', ok: '✓', first: 'ℹ' }[r.verdict], r.message, r);
  }

  if (on('файл')) {
    const p = packCheck(ref);
    add('файл', p.check.ok ? '✓' : '✗', p.check.ok ? 'story:pack --check без потерь; собрать — pack.mjs --write' : `story:pack --check: ${p.check.report?.stories?.flatMap((s) => s.problems ?? []).join('; ') ?? 'ошибка'}`, p);
  }

  const verdict = items.some((i) => i.mark === '✗') ? 'нельзя' : items.some((i) => i.mark === '⚠') ? 'после решений' : 'можно';
  return { id, path: story.path, verdict, items };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) { console.log(HELP); return; }
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const VALUED = new Set(['--skip', '--runs', '--story']);
  const ref = opt('--story') ?? args.find((a, i) => !a.startsWith('--') && !VALUED.has(args[i - 1]));
  if (!ref) { console.log(HELP); process.exitCode = 2; return; }
  const r = await releaseGate(ref, { skip: (opt('--skip') ?? '').split(',').filter(Boolean), runs: opt('--runs') ? Number(opt('--runs')) : undefined });
  if (args.includes('--json')) console.log(JSON.stringify(r, null, 2));
  else {
    console.log(`${r.path} · гейт выпуска: ${r.verdict}`);
    for (const i of r.items) console.log(`   ${i.mark} ${i.name.padEnd(9)} ${i.text}`);
  }
  if (r.verdict === 'нельзя') process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
