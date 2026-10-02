// Проверка историй: компиляция сценария + бот-плейтестер (случайные прохождения).
// Запуск: npm run check:story [-- путь/к/истории.json]
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Compiler, CompilerOptions, Story } from 'inkjs/full';

const RUNS = 400;

// Список допустимых тегов берём из реестра возможностей — чтобы он был один на всё приложение.
const caps = JSON.parse(readFileSync('docs/capabilities.json', 'utf8'));
const TAGS = caps.features.filter((f) => f.tag && f.status !== 'planned').map((f) => f.tag);
const parseDelay = (v) => {
  const m = String(v).trim().match(/^(\d+(?:\.\d+)?)\s*(s|m|h)?$/);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  return n * (m[2] === 'h' ? 3600 : m[2] === 'm' ? 60 : 1);
};
const fmt = (sec) => `${Math.floor(sec / 3600)} ч ${Math.round((sec % 3600) / 60)} мин`;
const files = process.argv[2]
  ? [process.argv[2]]
  : readdirSync('src/stories')
      .filter((f) => f.endsWith('.json'))
      .map((f) => join('src/stories', f));

/** История — один .json со сценарием внутри; отдельный .ink тоже принимаем. */
function readInk(file) {
  const raw = readFileSync(file, 'utf8');
  if (!file.endsWith('.json')) return raw;
  const story = JSON.parse(raw);
  if (!story.ink) throw new Error(`в ${file} нет поля "ink"`);
  return story.ink;
}

let failed = false;

for (const file of files) {
  const source = readInk(file);
  const compiler = new Compiler(source, new CompilerOptions(null, [], true));
  let json;
  try {
    json = compiler.Compile().ToJson();
  } catch {
    console.error(`✗ ${file}: ошибка компиляции`);
    for (const e of compiler.errors) console.error('   ' + e);
    failed = true;
    continue;
  }
  for (const w of compiler.warnings ?? []) console.warn('   предупреждение: ' + w);

  const knots = new Set();
  const choiceSeen = new Map(); // текст кнопки -> сколько раз показана
  const choiceTaken = new Map();
  const problems = new Set();
  let maxSteps = 0;
  let endings = 0;
  const durations = [];
  const messagesPerRun = [];
  const finals = new Map(); // последняя сюжетная строка -> сколько раз

  for (let run = 0; run < RUNS; run++) {
    const story = new Story(json);
    let steps = 0;
    let delay = 0;
    let lastLine = '';
    while (steps < 2000) {
      while (story.canContinue) {
        const text = story.Continue().trim();
        const tags = story.currentTags ?? [];
        const path = story.state.currentPathString;
        if (path) knots.add(path.split('.')[0]);
        for (const t of tags) {
          const [k, ...rest] = t.split(':');
          if (!TAGS.includes(k.trim())) problems.add(`неизвестный тег «${t}»`);
          if (k.trim() === 'delay') delay += parseDelay(rest.join(':'));
        }
        if (text && !text.startsWith('Конец')) lastLine = text;
        if (text.length > 140) problems.add(`слишком длинное сообщение: «${text.slice(0, 40)}…»`);
        steps++;
      }
      const choices = story.currentChoices;
      if (choices.length === 0) { endings++; finals.set(lastLine, (finals.get(lastLine) ?? 0) + 1); break; }
      for (const c of choices) {
        choiceSeen.set(c.text, (choiceSeen.get(c.text) ?? 0) + 1);
        for (const t of c.tags ?? []) if (!TAGS.includes(t.split(':')[0].trim())) problems.add(`неизвестный тег на кнопке «${t}»`);
      }
      const pick = choices[Math.floor(Math.random() * choices.length)];
      choiceTaken.set(pick.text, (choiceTaken.get(pick.text) ?? 0) + 1);
      story.ChooseChoiceIndex(pick.index);
    }
    // посещённые узлы по счётчикам ink: надёжнее, чем по текущему пути
    for (const k of story.mainContentContainer.namedContent.keys()) {
      if (k !== 'global decl' && story.state.VisitCountAtPathString(k) > 0) knots.add(k);
    }
    maxSteps = Math.max(maxSteps, steps);
    durations.push(delay);
    messagesPerRun.push(steps);
    if (steps >= 2000) problems.add('прохождение не закончилось за 2000 шагов: возможен бесконечный цикл');
  }

  console.log(`✓ ${file}`);
  console.log(`   прохождений: ${RUNS}, дошли до конца: ${endings}, самое длинное: ${maxSteps} строк`);
  const all = [...new Story(json).mainContentContainer.namedContent.keys()].filter((k) => k !== 'global decl');
  const unvisited = all.filter((k) => !knots.has(k));
  durations.sort((a, b) => a - b);
  messagesPerRun.sort((a, b) => a - b);
  const mid = (arr) => arr[Math.floor(arr.length / 2)];
  console.log(`   узлов посещено: ${knots.size} из ${all.length}${unvisited.length ? ` · не посещены: ${unvisited.join(', ')}` : ''}`);
  console.log(`   строк за прохождение: от ${messagesPerRun[0]} до ${messagesPerRun.at(-1)}, медиана ${mid(messagesPerRun)}`);
  console.log(`   реальное время пауз: от ${fmt(durations[0])} до ${fmt(durations.at(-1))}, медиана ${fmt(mid(durations))}`);
  console.log('   финалы (последняя строка):');
  for (const [line, n] of [...finals].sort((a, b) => b[1] - a[1])) console.log(`     ${String(n).padStart(4)}  ${line}`);
  if (unvisited.length) problems.add(`недостижимые узлы: ${unvisited.join(', ')}`);
  console.log('   кнопки (показана / выбрана):');
  for (const [text, seen] of [...choiceSeen].sort((a, b) => a[1] - b[1])) {
    console.log(`     ${String(seen).padStart(4)} / ${String(choiceTaken.get(text) ?? 0).padStart(4)}  ${text}`);
  }
  for (const p of problems) console.log('   ⚠ ' + p);
  if (endings < RUNS || unvisited.length) failed = true;
}

process.exit(failed ? 1 : 0);
