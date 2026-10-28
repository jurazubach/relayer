#!/usr/bin/env node
// Вариант «без --json» для агента cold-reader в слепой копии (X-E2, проверка просьбы LOCAL-13): на длинной
// истории вывод --ask --json больше лимита, агент дочитывает его node -e / python3 и получает отказ в правах.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
if (!dir || dir === '--help') { console.log('node docs/lab/runs/X-E2/patch-cold-reader.mjs <слепая копия>\n\nПравит .claude/agents/cold-reader.md копии: --ask без --json.'); process.exit(dir ? 0 : 2); }
const p = join(dir, '.claude/agents/cold-reader.md');
let s = readFileSync(p, 'utf8');
const swap = (a, b) => {
  if (s.split(a).length !== 2) throw new Error(`cold-reader.md: «${a.slice(0, 40)}…» не найдено ровно один раз`);
  s = s.replace(a, b);
};
swap('2. **Один читатель — одна команда**, всегда с `--ask --json`:\n   `npm run -s story:cold-read -- --story <id> --until <узел> --mode <режим> [--profile <профиль>] --ask --json`.',
  '2. **Один читатель — одна команда**, с `--ask` и без `--json` (JSON несёт всю переписку и на длинной истории не помещается в вывод):\n   `npm run -s story:cold-read -- --story <id> --until <узел> --mode <режим> [--profile <профиль>] --ask`.');
swap('4. **Верни результат** в формате ниже. Поле `answer` из JSON — дословно, целиком, в блоке цитаты.',
  '4. **Верни результат** в формате ниже. Ответ читателя (между шапкой и строкой «ключ:») — дословно, целиком, в блоке цитаты; маршрут — из stderr.');
writeFileSync(p, s);
console.log(`cold-reader без --json → ${p}`);
