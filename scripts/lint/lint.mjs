// story:lint — проверки сценария по ID из docs/playbook/checks.md, пороги из docs/playbook/thresholds.json.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadStory, storyRefs } from '../lib/story.mjs';
import { countLevels, formatStory, lintStory, loadChecks } from './core.mjs';
import { loadThresholds, validateThresholds } from './thresholds.mjs';

const HELP = `npm run story:lint [-- <id | путь> …] [флаги]

Проверки сценария по ID из docs/playbook/checks.md (первая волна: C-01, C-03, C-06, C-10, C-11, C-12,
C-20, C-21, C-26, C-28, C-30, C-31, C-34, C-35, C-40) и валидатор разметки C-53. Пороги и их опора —
docs/playbook/thresholds.json. Статические проверки читают ink, остальные — журнал случайного бота
(seed 1: одинаковый вход — одинаковые находки).

Строка находки: уровень · C-NN · узел · сообщение · порог (опора)
Уровни: ошибка / предупреждение / подсказка. Подавить находку в месте:
  // намеренно: C-NN причина     над узлом — гасит C-NN в узле; до первого узла — находки всей истории

  <id | путь>        история по id, файл .json / .ink или папка; по умолчанию все в src/stories
  --story <id>       то же, можно через запятую и несколько раз
  --only C-NN,…      только эти проверки
  --json             результат одним JSON в stdout
  --strict           код выхода 1, если есть ошибки (без флага ошибки печатаются, выход 0)
  --partial          история из части глав с узлом beta_stop (набор для теста): без проверок,
                     которым нужна вся история (C-01, C-03, C-06, C-40, длина и карточка в C-31)
  --plan [путь]      скелет skeleton.ink: только проверки структуры (C-01, C-03, C-06, C-10, C-11,
                     C-12, C-21, C-40, C-53); без пути — docs/stories/<id>/skeleton.ink или plans/skeleton.ink
  --changed          только истории, изменённые в рабочей копии git (src/stories)
  --quick            меньше прогонов бота (lint.runs.quick) — для хука после правки
  --seed N           другой seed бота
  --runs N           число прогонов бота вместо lint.runs.full
  --help             эта справка`;

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) { console.log(HELP); process.exit(0); }

const fail = (msg) => { console.error(`story:lint: ${msg}`); process.exit(2); };
const takes = new Set(['--story', '--only', '--seed', '--runs']);
const opts = { stories: [], only: null, json: false, strict: false, partial: false, plan: null, changed: false, quick: false, seed: 1, runs: null };
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
  } else if (a === '--plan') {
    opts.plan = true;
    if (argv[i + 1] && !argv[i + 1].startsWith('--') && /\.ink$/.test(argv[i + 1])) opts.plan = argv[++i];
  } else if (a === '--json') opts.json = true;
  else if (a === '--strict') opts.strict = true;
  else if (a === '--partial') opts.partial = true;
  else if (a === '--changed') opts.changed = true;
  else if (a === '--quick') opts.quick = true;
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
  if (!opts.json) console.log(formatStory(res, T));
}

const errors = results.reduce((s, r) => s + r.counts.error, 0);
if (opts.json) {
  console.log(JSON.stringify({ ok: errors === 0, strict: opts.strict, runs, seed: opts.seed, stories: results }, null, 2));
} else {
  const total = results.reduce((s, r) => ({ e: s.e + r.counts.error, w: s.w + r.counts.warning, h: s.h + r.counts.hint }), { e: 0, w: 0, h: 0 });
  console.log(`\nитого: ошибок ${total.e}, предупреждений ${total.w}, подсказок ${total.h} · прогонов бота на историю: ${runs}${opts.strict ? '' : ' · без --strict код выхода 0'}`);
}
process.exit(opts.strict && errors ? 1 : 0);

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
