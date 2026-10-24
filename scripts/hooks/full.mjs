// Полный режим проверки истории: по окончании главы, вручную или из скилла.
// В отличие от хука после правки — полный story:lint (lint.runs.full прогонов) и все ошибки и предупреждения, а не только новые.
import { changedSince, checkStory, counts, EXAMPLES, findingLine, storyExists, storySnapshot } from './core.mjs';

const HELP = `node scripts/hooks/full.mjs [<id> …] [--json] [--hints] [--all]

Полный режим проверки: check:story (компиляция, тупики, недостижимые узлы) и story:lint
со всеми прогонами бота (lint.runs.full). Зовут по окончании главы — вручную или скиллом;
после каждой правки работает быстрый режим (scripts/hooks/post-edit.mjs).

  <id> …    истории по id из src/stories; без id — изменённые в рабочей копии git
  --json    результат одним JSON в stdout
  --hints   печатать и подсказки (по умолчанию — только их число)
  --all     все находки, а не lint.examples примеров на проверку (ошибки печатаются все всегда)
  --help    эта справка

Код выхода 1, если есть ошибки; 2 — неизвестная история.`;

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) { console.log(HELP); process.exit(0); }
const flags = new Set(argv.filter((a) => a.startsWith('--')));
const unknown = [...flags].filter((f) => !['--json', '--hints', '--all'].includes(f));
if (unknown.length) { console.error(`full: неизвестный флаг ${unknown.join(', ')} (см. --help)`); process.exit(2); }

let ids = argv.filter((a) => !a.startsWith('--'));
const missing = ids.filter((id) => !storyExists(id));
if (missing.length) { console.error(`full: нет истории ${missing.join(', ')} в src/stories`); process.exit(2); }
if (!ids.length) ids = changedSince({}, storySnapshot() ?? {});
if (!ids.length) {
  if (flags.has('--json')) console.log(JSON.stringify({ ok: true, stories: [] }));
  else console.log('full: изменённых историй нет — укажи id: node scripts/hooks/full.mjs <id>');
  process.exit(0);
}

const results = ids.map((id) => checkStory(id, { quick: false }));
const errors = results.reduce((s, r) => s + counts(r.findings).error, 0);

if (flags.has('--json')) {
  console.log(JSON.stringify({ ok: errors === 0, stories: results.map((r) => ({ ...r, counts: counts(r.findings) })) }, null, 2));
} else {
  console.log(results.map(format).join('\n\n'));
}
// exitCode, а не process.exit: при выводе в трубу exit обрывает длинный отчёт на 64 КБ
process.exitCode = errors ? 1 : 0;

function format(r) {
  const c = counts(r.findings);
  const head = r.compiled
    ? `${c.error ? '✗' : '✓'} ${r.id}: ошибок ${c.error}, предупреждений ${c.warning}, подсказок ${c.hint}`
    : `✗ ${r.id}: не компилируется, lint не запускался`;
  const lines = [head];
  for (const level of ['error', 'warning', 'hint']) {
    if (level === 'hint' && !flags.has('--hints')) continue;
    const groups = Map.groupBy(r.findings.filter((f) => f.level === level), (f) => f.check);
    for (const [check, list] of groups) {
      // ошибки — все: их чинят по одной; предупреждения и подсказки — примерами, остальное в --json
      const shown = level === 'error' || flags.has('--all') ? list : list.slice(0, EXAMPLES);
      lines.push(...shown.map((f) => findingLine(f, true)));
      if (shown.length < list.length) lines.push(`  … и ещё ${list.length - shown.length} ${check} (все — --all или --json)`);
    }
  }
  return lines.join('\n');
}
