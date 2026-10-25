// story:lint — проверки сценария по ID из docs/playbook/checks.md, пороги из docs/playbook/thresholds.json.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { loadStory, storyRefs } from '../lib/story.mjs';
import { analyze, countLevels, formatStory, formatSummary, lintStory, loadChecks } from './core.mjs';
import { transcript } from './transcript.mjs';
import { loadThresholds, validateThresholds } from './thresholds.mjs';

const HELP = `npm run story:lint [-- <id | путь> …] [флаги]

Проверки сценария C-01…C-54 из docs/playbook/checks.md, C-53 — валидатор разметки. Пороги и их
опора — docs/playbook/thresholds.json. Статические проверки читают ink, остальные — журнал случайного
бота (seed 1: одинаковый вход — одинаковые находки). Порог с deferred:E-NN ждёт фичи движка и
пропускается (виден в --json, skipped).

Строка находки: уровень · C-NN · узел · сообщение · порог (опора) · чинит <скилл из owners.md §3>
Уровни: ошибка / предупреждение / подсказка. [модель] — метрика-кандидат: решает модель или ревьюер
(голоса, смысл), а не регулярка. Подавить находку в месте:
  // намеренно: C-NN причина     над узлом — гасит C-NN в узле; до первого узла — находки всей истории

  <id | путь>        история по id, файл .json / .ink или папка; по умолчанию все в src/stories
  --story <id>       то же, можно через запятую и несколько раз
  --only C-NN,…      только эти проверки
  --json             результат одним JSON в stdout
  --strict           код выхода 1, если есть ошибки (без флага ошибки печатаются, выход 0)
  --partial          история из части глав с узлом beta_stop (набор для теста): без проверок,
                     которым нужна вся история (partial: false в модуле: C-01, C-03, C-06, C-40…)
  --plan [путь]      скелет skeleton.ink: только проверки структуры (plan: true в модуле: C-01…C-07, C-09…C-13,
                     C-19, C-21, C-25, C-40, C-43, C-45, C-52, C-53); без пути — docs/stories/<id>/skeleton.ink
                     или plans/skeleton.ink
  --changed          только истории, изменённые в рабочей копии git (src/stories)
  --quick            меньше прогонов бота (lint.runs.quick) — для хука после правки
  --summary          кратко: счётчики по проверкам и lint.summary.top находок на историю,
                     не длиннее skill.hook.max_output_chars — для хука
  --transcript N     выгрузить N прохождений бота в .md для чтения человеком (C-52 п. 5)
  --out <папка>      куда класть транскрипты (по умолчанию временная папка)
  --seed N           другой seed бота
  --runs N           число прогонов бота вместо lint.runs.full
  --help             эта справка`;

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) { console.log(HELP); process.exit(0); }

const fail = (msg) => { console.error(`story:lint: ${msg}`); process.exit(2); };
const takes = new Set(['--story', '--only', '--seed', '--runs', '--transcript', '--out']);
const opts = { stories: [], only: null, json: false, strict: false, partial: false, plan: null, changed: false, quick: false, summary: false, transcript: 0, out: null, seed: 1, runs: null };
const refs = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (takes.has(a)) {
    const v = argv[++i];
    if (v == null || v.startsWith('--')) fail(`после ${a} нужно значение`);
    if (a === '--story') opts.stories.push(...v.split(',').filter(Boolean));
    else if (a === '--only') opts.only = [...(opts.only ?? []), ...v.split(',').map((x) => x.trim().toUpperCase()).filter(Boolean)];
    else if (a === '--seed') opts.seed = Number(v);
    else if (a === '--runs') opts.runs = Number(v);
    else if (a === '--transcript') opts.transcript = Number(v);
    else if (a === '--out') opts.out = v;
  } else if (a === '--plan') {
    opts.plan = true;
    if (argv[i + 1] && !argv[i + 1].startsWith('--') && /\.ink$/.test(argv[i + 1])) opts.plan = argv[++i];
  } else if (a === '--json') opts.json = true;
  else if (a === '--strict') opts.strict = true;
  else if (a === '--partial') opts.partial = true;
  else if (a === '--changed') opts.changed = true;
  else if (a === '--quick') opts.quick = true;
  else if (a === '--summary') opts.summary = true;
  else if (a.startsWith('--')) fail(`неизвестный флаг ${a} (см. --help)`);
  else refs.push(a);
}

const T = loadThresholds();
const schema = validateThresholds(T.all);
if (schema.length) fail(`thresholds.json не по схеме:\n  ${schema.join('\n  ')}`);
const checks = await loadChecks();
if (opts.only) {
  const ids = new Set(checks.map((c) => c.id));
  const unknown = opts.only.filter((x) => !ids.has(x));
  if (unknown.length) fail(`нет таких проверок: ${unknown.join(', ')}; есть ${[...ids].join(', ')}`);
}
const runs = opts.runs ?? T.value(opts.quick ? 'lint.runs.quick' : 'lint.runs.full');
if (!(runs > 0)) fail('--runs: нужно положительное число');
if (Number.isNaN(opts.transcript) || opts.transcript < 0) fail('--transcript: нужно число прохождений');

let targets = [...refs, ...opts.stories];
if (opts.changed) {
  const changed = changedStories();
  targets = targets.length ? targets.filter((t) => changed.includes(t)) : changed;
  if (!targets.length) {
    if (opts.json) console.log(JSON.stringify({ ok: true, strict: opts.strict, runs, stories: [] }));
    else console.log('story:lint: изменённых историй нет');
    process.exit(0);
  }
}

const list = [];
if (typeof opts.plan === 'string') list.push({ ref: opts.plan });
else if (opts.plan) {
  if (!targets.length) fail('--plan без пути: укажи историю (--story <id>) или путь к skeleton.ink');
  for (const id of targets) {
    const found = ['skeleton.ink', 'plans/skeleton.ink'].map((f) => join('docs/stories', id, f)).find((p) => existsSync(p));
    if (!found) fail(`у истории «${id}» нет скелета: ни docs/stories/${id}/skeleton.ink, ни docs/stories/${id}/plans/skeleton.ink`);
    list.push({ ref: found, id });
  }
} else for (const ref of storyRefs(targets)) list.push({ ref });

const results = [];
for (const { ref, id } of list) {
  let story;
  try { story = loadStory(ref); } catch (e) { fail(e.message); }
  if (id) story.id = id;
  const res = await lintStory(story, T, { checks, only: opts.only, partial: opts.partial, plan: !!opts.plan, runs, seed: opts.seed });
  res.counts = countLevels(res.findings);
  results.push(res);
  if (opts.transcript > 0) {
    const dir = resolve(opts.out ?? join(tmpdir(), 'relayer-transcripts'), story.id);
    mkdirSync(dir, { recursive: true });
    const ctx = analyze(story, T, { runs: opts.transcript, seed: opts.seed });
    ctx.runs.forEach((run, i) => writeFileSync(join(dir, `${String(i + 1).padStart(2, '0')}.md`), transcript(run, story, i + 1)));
    res.transcripts = dir;
    if (!opts.json) console.error(`story:lint: ${ctx.runs.length} транскриптов ${story.id} — ${dir}`);
  }
  if (!opts.json && !opts.summary) console.log(formatStory(res, T));
}

const errors = results.reduce((s, r) => s + r.counts.error, 0);
if (opts.json) {
  console.log(JSON.stringify({ ok: errors === 0, strict: opts.strict, runs, seed: opts.seed, stories: results }, null, 2));
} else if (opts.summary) {
  console.log(formatSummary(results, T));
} else {
  const total = results.reduce((s, r) => ({ e: s.e + r.counts.error, w: s.w + r.counts.warning, h: s.h + r.counts.hint }), { e: 0, w: 0, h: 0 });
  console.log(`\nитого: ошибок ${total.e}, предупреждений ${total.w}, подсказок ${total.h} · прогонов бота на историю: ${runs}${opts.strict ? '' : ' · без --strict код выхода 0'}`);
}
// exitCode, а не exit(): большой --json в трубу иначе обрезается до того, как stdout допишется
process.exitCode = opts.strict && errors ? 1 : 0;

/** id историй, изменённых в рабочей копии: src/stories/<id>.json и src/stories/<id>/… */
function changedStories() {
  let out = '';
  try {
    out = execFileSync('git', ['status', '--porcelain', '--untracked-files=all', '--', 'src/stories'], { encoding: 'utf8' });
  } catch (e) {
    fail(`--changed: git недоступен (${e.message.split('\n')[0]})`);
  }
  const ids = new Set();
  for (const line of out.split('\n').filter(Boolean)) {
    const path = line.slice(3).split(' -> ').at(-1).replace(/^"|"$/g, '');
    const m = path.match(/^src\/stories\/([^/]+?)(?:\.json$|\/)/);
    if (m) ids.add(m[1]);
  }
  return [...ids].filter((id) => existsSync(join('src/stories', `${id}.json`)) || existsSync(join('src/stories', id)));
}
