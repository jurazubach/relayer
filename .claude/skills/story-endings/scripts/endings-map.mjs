// Карта финалов: какие финалы есть, как размечены, сколько прогонов в каждый, кто их распределяет и что
// он читает. Обёртка над двумя командами — числа берутся у них как есть:
//   story:endings --json — финалы, доли по персонам, что решает (статически и по прогонам), карточка, VAR ending;
//   story:lint C-06, C-40 — что читает распределитель и распределение финалов по меткам.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { loadStory, storyRefs } from '../../../../scripts/lib/story.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';
import { lintStory } from '../../../../scripts/lint/core.mjs';

const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/endings-map.mjs [--story <id|путь>,…] [--runs N] [--partial] [--json]

Карта финалов (скилл story-endings; R-102, R-103, R-104; проверки C-06, C-40):
  финалы       по меткам «// финал:» или, без меток, по -> END и финальным узлам — как story:endings;
               «меток нет» — сначала разметка (R-103, declaring-endings.md), доли без меток ориентировочны
  доли         доля прогонов в каждом финале у всех персон (story:endings) и у бота линта (C-40);
               ! — выше C-40.dominant_share при C-40.min_endings финалах и больше, ? — ниже C-40.rare_share
  распределитель  узел, который ведёт в два финала и больше, и что он читает (C-06: одна переменная, нет
               ранних глав, нет последнего выбора); есть ли в нём кнопка — финал выбирает игрок (R-102)
  что решает   переменные в условиях над переходами в финал и лучшие предсказатели по прогонам
  карточка     обещает ли tagline / synopsis / features несколько финалов (C-49 — у story-release)
  VAR ending   финал ли это или исход главы (пишется не в последней главе — не финал)
Числа — из команд, не пересчитываются.

  --story     история по id, файл .json / .ink или папка; через запятую; по умолчанию все из src/stories
  --runs N    прогонов на персону для story:endings (по умолчанию endings.runs) и бота для C-40
              (по умолчанию lint.runs.full)
  --partial   часть истории: beta_stop — конец части, не финал
  --json      всё данными
  --help      эта справка`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const T = thresholds();
const refs = storyRefs((opt('--story') ?? '').split(',').filter(Boolean));
const runs = opt('--runs') ? Number(opt('--runs')) : null;
const partial = args.includes('--partial');
const pct = (x) => `${Math.round(x * 100)}%`;

const report = [];
for (const ref of refs) {
  const story = loadStory(ref);
  let e;
  try {
    const cmd = [join(ROOT, 'scripts/story/endings.mjs'), '--story', ref, '--json', ...(runs ? ['--runs', String(runs)] : []), ...(partial ? ['--partial'] : [])];
    e = JSON.parse(execFileSync(process.execPath, cmd, { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })).stories[0];
  } catch (err) {
    report.push({ id: story.id, path: story.path, error: `нет данных: npm run story:endings -- --story ${ref} --json (${String(err.message).split('\n')[0]})` });
    continue;
  }
  const lint = await lintStory(story, T, { only: ['C-06', 'C-40'], runs: runs ?? T.value('lint.runs.full'), seed: 1, partial });
  const declared = e.endings.filter((x) => x.declared);
  const many = declared.length >= T.value('C-40.min_endings');
  const endings = e.endings.map((x) => ({
    name: x.name, node: x.node, declared: x.declared, runs: x.runs, share: x.share, chapters: x.chapters,
    deciders: x.staticVars, decided_in: x.decidedIn,
    dominant: many && x.declared && x.share > T.value('C-40.dominant_share'),
    rare: declared.length > 1 && x.declared && x.share < T.value('C-40.rare_share'),
  }));
  const c06 = lint.findings.filter((f) => f.check === 'C-06');
  const distributors = e.distributors.map((id) => ({ node: id, c06: c06.filter((f) => f.node === id).map((f) => ({ key: f.key, message: f.message, reads: f.data?.reads ?? [], reasons: f.data?.reasons ?? [] })) }));
  report.push({
    id: story.id, path: story.path, source: e.source, endings, runs: e.runs, distributors,
    final_nodes: e.final, unmarked: e.unmarked, dynamic: e.deciders, card: e.card, ending_var: e.endingVar, hints: e.hints,
    c40: lint.findings.filter((f) => f.check === 'C-40').map((f) => ({ key: f.key, node: f.node, message: f.message })),
    lint_runs: runs ?? T.value('lint.runs.full'),
  });
}

if (args.includes('--json')) {
  console.log(JSON.stringify({ stories: report, keys: Object.fromEntries(['C-40.dominant_share', 'C-40.rare_share', 'C-40.min_endings', 'lint.runs.full', 'endings.runs'].map((k) => [k, T.value(k)])) }, null, 1));
  process.exit(0);
}
for (const r of report) {
  if (r.error) { console.log(`${r.path}: ${r.error}\n`); continue; }
  const marked = r.source === 'mark';
  const n = r.endings.filter((x) => x.declared).length;
  console.log(`${r.path} · финалов ${n} · ${marked ? 'по меткам «// финал:»' : 'меток нет — по -> END и финальным узлам, доли ориентировочны (R-103)'} · прогонов story:endings ${r.runs}`);
  for (const x of r.endings) {
    const mark = x.dominant ? ' !' : x.rare ? ' ?' : '';
    console.log(`   ${x.declared ? ' ' : '·'} ${String(x.name).padEnd(18)} ${pct(x.share).padStart(4)}${mark.padEnd(2)} гл. ${x.chapters.join(',') || '—'}  решает: ${x.deciders.join(', ') || '— (без условий)'}${x.decided_in.length ? ` в ${x.decided_in.join(', ')}` : ''}`);
  }
  if (!r.distributors.length) console.log('   распределитель: нет — финал один или его выбирает переход без условий');
  for (const d of r.distributors) {
    console.log(`   распределитель ${d.node}: ${d.c06.length ? d.c06.map((f) => f.message).join('; ') : 'C-06 чист (две переменные и больше, есть ранние главы и последний выбор)'}`);
  }
  if (r.dynamic.length) console.log(`   по прогонам решают: ${r.dynamic.map((d) => `${d.name} +${Math.round(d.gain * 100)} п. п.`).join(' · ')}`);
  for (const f of r.c40) console.log(`   C-40 · ${f.node ?? 'история'} · ${f.message}`);
  if (r.card) console.log(`   карточка: «${r.card.text}»${r.card.count ? ` — обещано ${r.card.count}` : r.card.several ? ' — обещано несколько' : ''}`);
  if (r.ending_var) console.log(`   VAR ending: пишется в гл. ${r.ending_var.chapters.join(', ') || '—'} — ${r.ending_var.isFinal ? 'итог финала' : 'исход главы, не финал'}`);
  for (const h of r.hints) console.log(`   ${h}`);
  console.log('');
}
