// Карта сюжета: разбирает ink каждой истории и собирает один HTML с графом узлов,
// репликами и выборами — куда ведёт каждая кнопка. Для автора, не для игрока: спойлеры целиком.
// Запуск: npm run graph [-- <id | путь> …] [--open] [--json] → graph/index.html
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { compile, formatMessages } from './lib/compile.mjs';
import { findEndings, nodeIds, resolveTarget, stripComments } from './lib/ink.mjs';
import { play, seeded } from './lib/bot.mjs';
import { compileInput, loadStory, parseStory, storyRefs } from './lib/story.mjs';

const HELP = `npm run graph [-- <id | путь> …] [--open] [--json] [--seed N]

Карта сюжета: граф узлов, реплики и выборы, куда ведёт каждая кнопка, сколько прохождений бота
заходит в узел. Пишет graph/index.html.

  <id | путь>  история по id, файл .json / .ink или папка; по умолчанию все в src/stories
  --open       открыть карту в браузере
  --json       сводка по историям (узлы, переходы, главы, финалы) в stdout
  --seed N     повторяемые прохождения бота (иначе Math.random)
  --help       эта справка`;

const RUNS = 400;
const OUT = 'graph/index.html';

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
const asJson = args.includes('--json');
const seedAt = args.indexOf('--seed');
const rng = seedAt >= 0 ? seeded(Number(args[seedAt + 1])) : Math.random;
const refs = storyRefs(args.filter((a, i) => !a.startsWith('--') && !(seedAt >= 0 && i === seedAt + 1)));
const log = asJson ? () => {} : console.log;

const condText = (head, cond) => (cond === 'else' ? 'иначе' : head ? `${head} == ${cond}` : cond);

/** Рёбра графа: каждый переход с цепочкой выборов и условий, через которую до него доходят. */
function collectEdges(knot, knotIds) {
  const edges = [];
  const resolve = (t) => resolveTarget(t, knot.id, knotIds);
  const walk = (items, path) => {
    for (const it of items) {
      if (it.type === 'divert') {
        if (it.kind === 'return') continue;
        if (it.target === 'END' || it.target === 'DONE') { edges.push({ to: it.target, path, kind: 'end' }); continue; }
        const to = resolve(it.target);
        it.resolved = to;
        if (to && to !== knot.id) edges.push({ to, path, kind: it.kind });
      } else if (it.type === 'choice') {
        walk(it.items, [...path, { choice: it.text || it.tags.label || '…', conds: it.conds, label: it.tags.label }]);
      } else if (it.type === 'cond') {
        for (const b of it.branches) walk(b.items, [...path, { cond: condText(it.head, b.cond) }]);
      }
    }
  };
  walk(knot.items, []);
  return edges;
}

/** Сколько случайных прохождений заходят в каждый узел. */
function playtest(json, ids) {
  const visits = Object.fromEntries(ids.map((id) => [id, 0]));
  for (let run = 0; run < RUNS; run++) {
    const { visited } = play(json, { rng, nodes: ids, maxSteps: 3000, log: false });
    for (const id of visited) visits[id]++;
  }
  return Object.fromEntries(Object.entries(visits).map(([k, v]) => [k, Math.round((v / RUNS) * 1000) / 10]));
}

const stories = [];
const summary = [];
for (const ref of refs) {
  const story = loadStory(ref);
  const file = story.path;
  const built = compile(compileInput(story));
  if (!built.ok) {
    console.error(`✗ ${file}: ошибка компиляции, карту не строю`);
    console.error(formatMessages(built.errors));
    process.exitCode = 1;
    continue;
  }
  const parsed = parseStory(story);
  const ids = nodeIds(parsed);
  const knotIds = new Set(ids);
  const visits = playtest(built.json, ids);
  // в карту — то, что видит игрок; разметка из комментариев отдельным полем узла
  const knots = parsed.knots.map((k) => {
    const node = { id: k.id, kind: k.kind, chapter: k.chapter, items: stripComments(k.items), line: k.line };
    node.edges = collectEdges(node, knotIds);
    node.visits = visits[k.id];
    if (k.marks.length) node.marks = k.marks;
    if (k.ending != null) node.ending = k.ending;
    return node;
  });
  const endings = findEndings(parsed);
  const meta = story.meta;
  stories.push({
    id: meta.id ?? story.id,
    title: meta.title,
    series: meta.series ?? '',
    characters: meta.characters ?? [],
    contacts: parsed.contacts,
    start: parsed.start,
    chapters: parsed.chapters,
    chapterMeta: meta.chapters ?? [],
    knots,
    endings: endings.endings.map((e) => e.id),
  });
  const edgeCount = knots.reduce((s, k) => s + k.edges.length, 0);
  log(`✓ ${file}: узлов ${ids.length}, переходов ${edgeCount}, глав ${parsed.chapters.length}`);
  summary.push({
    file, id: story.id, nodes: ids.length, edges: edgeCount, chapters: parsed.chapters.length,
    endings: endings.endings, endingsSource: endings.source, unmarkedEndings: endings.unmarked,
  });
}

const template = readFileSync(new URL('./story-graph.html', import.meta.url), 'utf8');
const data = JSON.stringify(stories).replace(/</g, '\\u003c');
mkdirSync('graph', { recursive: true });
writeFileSync(OUT, template.replace('/*__DATA__*/null', data));
log(`→ ${OUT}`);
if (asJson) console.log(JSON.stringify({ out: OUT, stories: summary }, null, 2));
if (args.includes('--open')) execFile(process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open', [OUT]);
