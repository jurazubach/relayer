// Скелет истории skeleton.ink: шаблон и проверка формата (references/skeleton-format.md).
// Формат — обычный ink, поэтому структуру проверяют общие команды (check:story, story:lint --plan,
// story:endings, story:sessions); здесь только то, чего они не видят: ядро, на котором построен скелет,
// проза вместо строк-сцен, глава без записи и чтения состояния, финалы без меток.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from '../../../../scripts/lib/compile.mjs';
import { compileInput, loadStory, parseStory } from '../../../../scripts/lib/story.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';

const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/skeleton.mjs --template [--chapters N] [--core D-NN]
node \${CLAUDE_SKILL_DIR}/scripts/skeleton.mjs --new --story <id> [--chapters N]
node \${CLAUDE_SKILL_DIR}/scripts/skeleton.mjs --check (--story <id> | --file <путь.ink>) [--json]

Скелет всей истории до текста (скилл story-plan, references/skeleton-format.md): по строке на сцену,
настоящие выборы, переменные, финалы с «// финал:», паузы #delay длиной в дело мира.

  --template     напечатать шаблон скелета (компилируется) в stdout
  --new          записать шаблон в docs/stories/<id>/plans/skeleton-vN.ink (N — следующий свободный);
                 существующие файлы не трогает
  --chapters N   глав в шаблоне (по умолчанию 3)
  --core D-NN    решение ядра для строки «// core:» (по умолчанию из STATUS.md истории или D-01)
  --check        проверить формат скелета:
                   ✗ не компилируется; нет «// core: D-NN» в начале файла; нет ни одного #chapter;
                     -> END без «// финал:» (бот не отличит финалы, R-103 у story-endings)
                   ⚠ проза: больше skill.plan.skeleton.run_lines строк подряд без кнопки и перехода;
                     глава без записи ~ или без чтения переменной (failbetter-qbn:P-01);
                     ядро скелета не совпадает с ядром в STATUS.md
                   · сколько глав, сцен, развилок, финалов, переменных — для plan-check.mjs
  --story <id>   скелет истории: docs/stories/<id>/plans/skeleton.ink (или skeleton.ink в корне папки)
  --file <путь>  любой .ink / .json / папка истории (так прогоняется и готовая история)
  --json         результат данными
  --help         эта справка`;

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const T = thresholds();

const statusCore = (id) => {
  const p = join(ROOT, 'docs/stories', id, 'STATUS.md');
  if (!existsSync(p)) return null;
  return readFileSync(p, 'utf8').match(/ядро:\s*(D-\d+)/)?.[1] ?? null;
};

export function template({ chapters = 3, core = 'D-01' } = {}) {
  const n = Math.max(2, chapters);
  const out = [
    `// core: ${core}`,
    '// логлайн: ты — <кто игрок>, пишет <кто>, но <в чём ирония>',
    '// вопрос: <главный вопрос истории, на него отвечает каждый финал>',
    '// ставка: <что потеряет собеседник или игрок>',
    '// оси: trust, proof',
    '# title: <название>',
    '# contact: a, <Собеседник>, blue',
    'VAR trust = 0',
    'VAR proof = false',
    '-> ch1',
    '',
  ];
  for (let k = 1; k <= n; k++) {
    const last = k === n;
    out.push(`=== ch${k} ===`, `Глава ${k} · <название> #sys:a #chapter${k > 1 ? ` #delay:${k === n ? 3 : 2}h` : ''}`);
    if (k === 1) {
      out.push('[1.1] событие: <что случилось, одной строкой> #from:a');
      out.push('* [<кнопка-реплика> #to:a]', '    ~ trust += 1', '    [1.2] отклик: <чем ответил собеседник> #from:a');
      out.push('* [<другая реплика> #to:a]', '    [1.2б] отклик: <другой тон, тот же факт> #from:a');
      out.push('- [1.3] крючок: <вопрос или угроза, которые вернут игрока> #from:a', `-> ch${k + 1}`, '');
      continue;
    }
    if (!last) {
      out.push(`[${k}.1] событие: <последствие крючка главы ${k - 1}> #from:a`);
      out.push('{trust > 0:', `    [${k}.2] отклик на доверие: <реплика помнит выбор> #from:a`, '}');
      out.push('* [<кнопка: найти> #to:a]', '    ~ proof = true', '    -> found');
      out.push('* [<кнопка: не искать> #to:a]', '    -> lost');
      out.push(`= found`, `[${k}.3] раскрытие: <цель звучит иначе> #from:a`, '-> end');
      out.push(`= lost`, `[${k}.3б] потеря: <опору отняли> #from:a`, '-> end');
      out.push(`= end`, `[${k}.4] ${k === n - 1 ? 'потеря и уход' : 'крючок'}: <${k === n - 1 ? 'собеседник уходит после удара' : 'вопрос следующей главы'}> #from:a`, `-> ch${k + 1}`, '');
      continue;
    }
    out.push(`[${k}.1] событие: <последний ход противника> #from:a`);
    out.push('* {proof} [<кнопка-ценность: сказать правду> #to:a]', '    -> fin_truth');
    out.push('* [<кнопка-ценность: промолчать> #to:a]', '    -> fin_silence', '');
  }
  // след выбора в каждом финале: финал цитирует путь (C-07), а переменные главы 1 не остаются мёртвыми
  out.push('// финал: правда', '=== fin_truth ===', '[fin] <чем кончилось для того, кому ты веришь> #from:a #delay:1m', '{trust > 0: [fin+] <след доверия из главы 1> #from:a}', '-> END', '');
  out.push('// финал: тишина', '=== fin_silence ===', '[fin] <чем кончилось, если правду не сказали> #from:a #delay:1m', '{proof: [fin+] <след находки>|[fin+] <след того, что не искали>} #from:a', '-> END', '');
  return out.join('\n');
}

function locate(id) {
  for (const f of ['plans/skeleton.ink', 'skeleton.ink']) {
    const p = join(ROOT, 'docs/stories', id, f);
    if (existsSync(p)) return p;
  }
  return null;
}

/** Строки подряд без кнопки и перехода: самая длинная серия в каждом узле (сцена — одна строка). */
function runs(items, acc = { max: 0, at: null }, knot = null, cur = { n: 0 }) {
  for (const it of items ?? []) {
    if (it.type === 'msg') {
      cur.n++;
      if (cur.n > acc.max) { acc.max = cur.n; acc.at = { knot, line: it.line }; }
    } else if (it.type === 'choice' || it.type === 'divert' || it.type === 'gather') {
      cur.n = 0;
      if (it.items) runs(it.items, acc, knot, { n: 0 });
    } else if (it.items) runs(it.items, acc, knot, cur);
    if (it.branches) for (const b of it.branches) runs(b.items, acc, knot, { n: 0 });
  }
  return acc;
}

const walkItems = (items, fn) => { for (const it of items ?? []) { fn(it); walkItems(it.items, fn); for (const b of it.branches ?? []) walkItems(b.items, fn); } };

export function checkSkeleton(ref) {
  const story = loadStory(ref);
  const raw = Object.values(story.files).join('\n');
  const res = { path: story.path, errors: [], warnings: [], info: {} };
  const built = compile(compileInput(story));
  if (!built.ok) res.errors.push(`не компилируется: ${built.errors[0]?.message ?? ''}`);
  const core = raw.split('\n').slice(0, 12).join('\n').match(/^\s*\/\/\s*core:\s*(D-\d+)/m)?.[1] ?? null;
  if (!core) res.errors.push('нет «// core: D-NN» в первых строках — неизвестно, на каком ядре построен скелет (build-plan.md §6)');
  res.info.core = core;
  const tree = parseStory(story);
  const chapters = [...new Set(tree.knots.map((k) => k.chapter).filter((c) => c > 0))];
  if (!chapters.length) res.errors.push('нет ни одного #chapter — главы не видны ни боту, ни плану');
  const limit = T.value('skill.plan.skeleton.run_lines');
  let scenes = 0;
  let forks = 0;
  const perChapter = new Map(chapters.map((c) => [c, { writes: 0, reads: 0 }]));
  const varNames = tree.vars.map((v) => v.name);
  const readRe = varNames.length ? new RegExp(`\\{[^}]*(?<![\\p{L}\\w])(${varNames.join('|')})(?![\\p{L}\\w])`, 'u') : null;
  const prose = [];
  for (const k of tree.knots) {
    const r = runs(k.items, { max: 0, at: null }, k.id);
    if (r.max > limit) prose.push(`${k.id}: ${r.max} строк подряд`);
    walkItems(k.items, (it) => { if (it.type === 'msg' || it.type === 'sys') scenes++; });
    const buttons = [];
    walkItems(k.items, (it) => { if (it.type === 'choice' && it.role === 'button') buttons.push(it); });
    if (buttons.length > 1) forks++;
    const ch = perChapter.get(k.chapter);
    if (!ch) continue;
    const src = sourceOf(story, k);
    ch.writes += (src.match(/^\s*~\s*\w+\s*(\+=|-=|=)/gm) ?? []).length;
    if (readRe && readRe.test(src)) ch.reads++;
  }
  if (prose.length) res.warnings.push(`проза вместо строк-сцен (больше skill.plan.skeleton.run_lines = ${limit} строк подряд): ${prose.slice(0, 4).join('; ')}`);
  const lastCh = Math.max(...chapters, 0);
  for (const [c, v] of perChapter) {
    if (!v.writes && c < lastCh) res.warnings.push(`глава ${c}: ни одной записи ~ — выборы главы ничего не оставляют (failbetter-qbn:P-01)`);
    if (!v.reads && c > 1) res.warnings.push(`глава ${c}: не читает ни одной переменной — прошлые выборы не слышны`);
  }
  const marked = tree.knots.filter((k) => k.ending != null).map((k) => k.ending);
  const ends = (raw.match(/->\s*END\b/g) ?? []).length;
  if (ends && !marked.length) res.errors.push('финалы без «// финал: <имя>» — бот не отличит их друг от друга (R-103, владелец story-endings)');
  const want = ref && !String(ref).includes('/') ? statusCore(ref) : null;
  if (want && core && want !== core) res.warnings.push(`скелет построен на ядре ${core}, а в STATUS.md активное ядро ${want} — план устарел (story-desk)`);
  res.info = { ...res.info, chapters: chapters.length, scenes, forks, endings: marked, vars: varNames, status_core: want, beta_stop: /===\s*beta_stop\b/.test(raw) };
  return res;
}

function sourceOf(story, knot) {
  const file = knot.file ?? story.main;
  const lines = (story.files[file] ?? Object.values(story.files)[0]).split('\n');
  const from = (knot.line ?? 1) - 1;
  let to = lines.findIndex((l, i) => i > from && /^\s*=+\s*\w/.test(l));
  if (to < 0) to = lines.length;
  return lines.slice(from, to).join('\n');
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  if (args.includes('--help') || args.includes('-h') || !args.length) { console.log(HELP); process.exit(0); }
  const chapters = Number(opt('--chapters') ?? 3);
  const id = opt('--story');
  if (args.includes('--template')) {
    console.log(template({ chapters, core: opt('--core') ?? (id && statusCore(id)) ?? 'D-01' }));
  } else if (args.includes('--new')) {
    if (!id) { console.error('--new: нужен --story <id>'); process.exit(1); }
    const dir = join(ROOT, 'docs/stories', id, 'plans');
    mkdirSync(dir, { recursive: true });
    const used = readdirSync(dir).map((f) => f.match(/^skeleton-v(\d+)\.ink$/)?.[1]).filter(Boolean).map(Number);
    const n = used.length ? Math.max(...used) + 1 : 1;
    const p = join(dir, `skeleton-v${n}.ink`);
    writeFileSync(p, template({ chapters, core: opt('--core') ?? statusCore(id) ?? 'D-01' }) + '\n');
    console.log(`✓ ${p.replace(ROOT, '')}: шаблон на ${Math.max(2, chapters)} главы; замени <…> строками сцен и проверь: skeleton.mjs --check --file ${p.replace(ROOT, '')}`);
  } else if (args.includes('--check')) {
    const ref = opt('--file') ?? (id ? locate(id) ?? id : null);
    if (!ref) { console.error('--check: нужен --story <id> или --file <путь>'); process.exit(1); }
    let r;
    try { r = checkSkeleton(id && !opt('--file') && locate(id) ? id : ref); } catch (e) { r = { path: ref, errors: [`нет данных: ${e.message.split('\n')[0]}`], warnings: [], info: {} }; }
    if (id && !opt('--file') && locate(id)) r.path = locate(id).replace(ROOT, '');
    if (args.includes('--json')) { console.log(JSON.stringify(r, null, 1)); process.exit(r.errors.length ? 1 : 0); }
    const i = r.info;
    console.log(`${r.path} · ядро ${i.core ?? '—'}${i.status_core ? ` (STATUS: ${i.status_core})` : ''} · глав ${i.chapters ?? '—'} · строк-сцен ${i.scenes ?? '—'} · узлов с развилкой ${i.forks ?? '—'} · финалов по меткам ${i.endings?.length ?? 0}${i.endings?.length ? ` (${i.endings.join(', ')})` : ''}${i.beta_stop ? ' · есть beta_stop' : ''}`);
    for (const e of r.errors) console.log(`   ✗ ${e}`);
    for (const w of r.warnings) console.log(`   ⚠ ${w}`);
    if (!r.errors.length && !r.warnings.length) console.log('   ✓ формат скелета в порядке; структуру проверяет plan-check.mjs');
    process.exit(r.errors.length ? 1 : 0);
  } else {
    console.log(HELP);
  }
}
