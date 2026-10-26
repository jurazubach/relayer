#!/usr/bin/env node
// Ждёт файлов <путь>.done не дольше --max-s секунд (по умолчанию 570): прогоны идут в отсоединённом screen,
// а один вызов инструмента не длиннее 10 минут. Печатает, какие готовы.
import { existsSync, statSync } from 'node:fs';

const argv = process.argv.slice(2);
if (argv.includes('--help') || !argv.length) { console.log('node docs/lab/runs/X-E2/wait.mjs <файл.jsonl>… [--max-s 570]'); process.exit(0); }
const i = argv.indexOf('--max-s');
const max = i >= 0 ? Number(argv[i + 1]) : 570;
const files = argv.filter((a, k) => !a.startsWith('--') && k !== i + 1);
const t0 = Date.now();
const tick = () => {
  const done = files.filter((f) => existsSync(`${f}.done`));
  if (done.length === files.length || Date.now() - t0 > max * 1000) {
    for (const f of files) {
      const size = existsSync(f) ? Math.round(statSync(f).size / 1024) : 0;
      console.log(`${existsSync(`${f}.done`) ? 'готов' : 'идёт '} ${size} КБ ${f}`);
    }
    process.exit(0);
  }
  setTimeout(tick, 15_000);
};
tick();
