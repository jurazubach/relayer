// Проверка сценариев: компиляция + бот-плейтестер (случайные прохождения).
// Запуск: npm run check:story [-- путь/к/файлу.ink]
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Compiler, Story } from 'inkjs/full';

const RUNS = 400;
const files = process.argv[2]
  ? [process.argv[2]]
  : readdirSync('src/stories').filter((f) => f.endsWith('.ink')).map((f) => join('src/stories', f));

let failed = false;

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const compiler = new Compiler(source);
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

  for (let run = 0; run < RUNS; run++) {
    const story = new Story(json);
    let steps = 0;
    while (steps < 2000) {
      while (story.canContinue) {
        const text = story.Continue().trim();
        const tags = story.currentTags ?? [];
        const path = story.state.currentPathString;
        if (path) knots.add(path.split('.')[0]);
        for (const t of tags) {
          const [k] = t.split(':');
          if (!['from', 'me', 'sys', 'photo', 'delay', 'unlock', 'title', 'contact'].includes(k.trim())) problems.add(`неизвестный тег «${t}»`);
        }
        if (text.length > 140) problems.add(`слишком длинное сообщение: «${text.slice(0, 40)}…»`);
        steps++;
      }
      const choices = story.currentChoices;
      if (choices.length === 0) { endings++; break; }
      for (const c of choices) choiceSeen.set(c.text, (choiceSeen.get(c.text) ?? 0) + 1);
      const pick = choices[Math.floor(Math.random() * choices.length)];
      choiceTaken.set(pick.text, (choiceTaken.get(pick.text) ?? 0) + 1);
      story.ChooseChoiceIndex(pick.index);
    }
    maxSteps = Math.max(maxSteps, steps);
    if (steps >= 2000) problems.add('прохождение не закончилось за 2000 шагов: возможен бесконечный цикл');
  }

  console.log(`✓ ${file}`);
  console.log(`   прохождений: ${RUNS}, дошли до конца: ${endings}, самое длинное: ${maxSteps} строк`);
  console.log(`   узлов посещено: ${knots.size} (${[...knots].sort().join(', ')})`);
  console.log('   кнопки (показана / выбрана):');
  for (const [text, seen] of [...choiceSeen].sort((a, b) => a[1] - b[1])) {
    console.log(`     ${String(seen).padStart(4)} / ${String(choiceTaken.get(text) ?? 0).padStart(4)}  ${text}`);
  }
  for (const p of problems) console.log('   ⚠ ' + p);
  if (endings < RUNS) failed = true;
}

process.exit(failed ? 1 : 0);
