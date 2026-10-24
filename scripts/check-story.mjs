// Проверка историй: компиляция сценария + бот-плейтестер (случайные прохождения).
// Запуск: npm run check:story [-- <id | путь> …] [--json] [--seed N]
import { readFileSync } from 'node:fs';
import { compile, formatMessages } from './lib/compile.mjs';
import { nodeIds, parseTag } from './lib/ink.mjs';
import { play, seeded } from './lib/bot.mjs';
import { compileInput, loadStory, parseStory, storyRefs } from './lib/story.mjs';

const HELP = `npm run check:story [-- <id | путь> …] [--json] [--seed N]

Компилирует каждую историю и прогоняет бота: 400 случайных прохождений, редкие ветки
добираются до 2000. Падает, если есть ошибки компиляции, тупики или недостижимые узлы.

  <id | путь>  история по id (the-number), файл .json / .ink или папка; по умолчанию все в src/stories
  --json       итоги одним JSON в stdout вместо текста
  --seed N     повторяемые прохождения (иначе Math.random)
  --help       эта справка`;

const RUNS = 400;
// Редкие ветки (финалы, которые надо заработать) случайный бот может не встретить за 400 прогонов —
// тогда добираем прогоны, пока не найдутся все узлы. Недостижимый узел так и останется недостижимым.
const MAX_RUNS = 2000;

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) { console.log(HELP); process.exit(0); }
const asJson = argv.includes('--json');
const seedAt = argv.indexOf('--seed');
const rng = seedAt >= 0 ? seeded(Number(argv[seedAt + 1])) : Math.random;
const refs = storyRefs(argv.filter((a, i) => !a.startsWith('--') && !(seedAt >= 0 && i === seedAt + 1)));

// Список допустимых тегов берём из реестра возможностей — чтобы он был один на всё приложение.
const caps = JSON.parse(readFileSync('docs/capabilities.json', 'utf8'));
const TAGS = caps.features.filter((f) => f.tag && f.status !== 'planned').map((f) => f.tag);
const fmt = (sec) => `${Math.floor(sec / 3600)} ч ${Math.round((sec % 3600) / 60)} мин`;
const out = asJson ? () => {} : console.log;

let failed = false;
const report = [];

for (const ref of refs) {
  const story = loadStory(ref);
  const file = story.path;
  const built = compile(compileInput(story));
  if (!built.ok) {
    console.error(`✗ ${file}: ошибка компиляции`);
    console.error(formatMessages(built.errors));
    report.push({ file, id: story.id, ok: false, errors: built.errors });
    failed = true;
    continue;
  }
  if (!asJson && built.warnings.length) console.warn(formatMessages(built.warnings));

  const all = nodeIds(parseStory(story));
  const knots = new Set();
  const choiceSeen = new Map(); // текст кнопки -> сколько раз показана
  const choiceTaken = new Map();
  const problems = new Set();
  let maxSteps = 0;
  let endings = 0;
  const durations = [];
  const messagesPerRun = [];
  const finals = new Map(); // последняя сюжетная строка -> сколько раз

  let runs = 0;
  for (let run = 0; run < MAX_RUNS; run++) {
    if (run >= RUNS && all.every((k) => knots.has(k))) break;
    runs++;
    const r = play(built.json, { rng, nodes: all, maxSteps: 2000, trackVars: false });
    let lastLine = '';
    for (const e of r.events) {
      if (e.type === 'line') {
        for (const t of e.tags) {
          if (!TAGS.includes(parseTag(t).key)) problems.add(`неизвестный тег «${t}»`);
        }
        if (e.text && !e.text.startsWith('Конец')) lastLine = e.text;
        if (e.text.length > 140) problems.add(`слишком длинное сообщение: «${e.text.slice(0, 40)}…»`);
      } else if (e.type === 'choice') {
        for (const c of e.options) {
          choiceSeen.set(c.text, (choiceSeen.get(c.text) ?? 0) + 1);
          for (const t of c.tags) if (!TAGS.includes(parseTag(t).key)) problems.add(`неизвестный тег на кнопке «${t}»`);
        }
        choiceTaken.set(e.text, (choiceTaken.get(e.text) ?? 0) + 1);
      }
    }
    if (r.ended) { endings++; finals.set(lastLine, (finals.get(lastLine) ?? 0) + 1); }
    for (const k of r.visited) knots.add(k);
    maxSteps = Math.max(maxSteps, r.steps);
    durations.push(r.delay);
    messagesPerRun.push(r.steps);
    if (r.steps >= 2000) problems.add('прохождение не закончилось за 2000 шагов: возможен бесконечный цикл');
  }

  out(`✓ ${file}`);
  out(`   прохождений: ${runs}, дошли до конца: ${endings}, самое длинное: ${maxSteps} строк`);
  const unvisited = all.filter((k) => !knots.has(k));
  durations.sort((a, b) => a - b);
  messagesPerRun.sort((a, b) => a - b);
  const mid = (arr) => arr[Math.floor(arr.length / 2)];
  out(`   узлов посещено: ${knots.size} из ${all.length}${unvisited.length ? ` · не посещены: ${unvisited.join(', ')}` : ''}`);
  out(`   строк за прохождение: от ${messagesPerRun[0]} до ${messagesPerRun.at(-1)}, медиана ${mid(messagesPerRun)}`);
  out(`   реальное время пауз: от ${fmt(durations[0])} до ${fmt(durations.at(-1))}, медиана ${fmt(mid(durations))}`);
  out('   финалы (последняя строка):');
  const finalsSorted = [...finals].sort((a, b) => b[1] - a[1]);
  for (const [line, n] of finalsSorted) out(`     ${String(n).padStart(4)}  ${line}`);
  if (unvisited.length) problems.add(`недостижимые узлы: ${unvisited.join(', ')}`);
  out('   кнопки (показана / выбрана):');
  const buttons = [...choiceSeen].sort((a, b) => a[1] - b[1]);
  for (const [text, seen] of buttons) {
    out(`     ${String(seen).padStart(4)} / ${String(choiceTaken.get(text) ?? 0).padStart(4)}  ${text}`);
  }
  for (const p of problems) out('   ⚠ ' + p);
  const bad = endings < runs || unvisited.length > 0;
  if (bad) failed = true;
  report.push({
    file, id: story.id, ok: !bad, runs, endings, maxLines: maxSteps,
    nodes: { total: all.length, visited: knots.size, unvisited },
    lines: { min: messagesPerRun[0], max: messagesPerRun.at(-1), median: mid(messagesPerRun) },
    delaySec: { min: durations[0], max: durations.at(-1), median: mid(durations) },
    finals: finalsSorted.map(([line, n]) => ({ line, n })),
    buttons: buttons.map(([text, seen]) => ({ text, seen, taken: choiceTaken.get(text) ?? 0 })),
    problems: [...problems],
    warnings: built.warnings,
  });
}

if (asJson) console.log(JSON.stringify({ ok: !failed, stories: report }, null, 2));
process.exit(failed ? 1 : 0);
