// Полный режим проверки истории: по окончании главы, вручную или из скилла.
// В отличие от хука после правки — полный story:lint (lint.runs.full прогонов) и все ошибки и предупреждения, а не только новые.
import { changedSince, checkBase, checkStory, counts, EXAMPLES, findingLine, fingerprint, storyExists, storySnapshot } from './core.mjs';

const HELP = `node scripts/hooks/full.mjs [<id> …] [--new [--base <ревизия>]] [--json] [--hints] [--all]

Полный режим проверки: check:story (компиляция, тупики, недостижимые узлы) и story:lint
со всеми прогонами бота (lint.runs.full). Зовут по окончании главы — вручную или скиллом;
после каждой правки работает быстрый режим (scripts/hooks/post-edit.mjs). История с узлом beta_stop
(часть глав) проверяется с story:lint --partial.

  <id> …    истории по id из src/stories; без id — изменённые в рабочей копии git
  --json    результат одним JSON в stdout
  --hints   печатать и подсказки (по умолчанию — только их число)
  --all     все находки, а не lint.examples примеров на проверку (ошибки печатаются все всегда)
  --new     только новые ошибки: те, которых нет в той же проверке версии из git (--base, по умолчанию HEAD);
            код выхода 1 — только если новые есть. Так глава считается готовой на истории, где в других
            главах уже есть ошибки (скилл chapter-write: «full.mjs без новых ошибок»)
  --base R  ревизия git для --new (HEAD, master, хеш коммита)
  --help    эта справка

Код выхода 1, если есть ошибки (с --new — новые ошибки); 2 — неизвестная история или ревизия.`;

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) { console.log(HELP); process.exit(0); }
const baseAt = argv.indexOf('--base');
const baseRev = baseAt >= 0 ? argv[baseAt + 1] : 'HEAD';
if (baseAt >= 0 && (!baseRev || baseRev.startsWith('--'))) { console.error('full: --base без ревизии (см. --help)'); process.exit(2); }
const rest = argv.filter((_, i) => baseAt < 0 || (i !== baseAt && i !== baseAt + 1));
const flags = new Set(rest.filter((a) => a.startsWith('--')));
const unknown = [...flags].filter((f) => !['--json', '--hints', '--all', '--new'].includes(f));
if (unknown.length) { console.error(`full: неизвестный флаг ${unknown.join(', ')} (см. --help)`); process.exit(2); }
const onlyNew = flags.has('--new') || baseAt >= 0;

let ids = rest.filter((a) => !a.startsWith('--'));
const missing = ids.filter((id) => !storyExists(id));
if (missing.length) { console.error(`full: нет истории ${missing.join(', ')} в src/stories`); process.exit(2); }
if (!ids.length) ids = changedSince({}, storySnapshot() ?? {});
const results = ids.map((id) => checkStory(id, { quick: false }));
if (onlyNew) {
  for (const r of results) {
    let base;
    try { base = checkBase(r.id, { rev: baseRev }); } catch (e) { console.error(`full: ${e.message}`); process.exit(2); }
    const before = new Set(base.findings.filter((f) => f.level === 'error').map(fingerprint));
    const errs = r.findings.filter((f) => f.level === 'error');
    r.base = { rev: baseRev, missing: !!base.missing, errors: before.size };
    r.new_errors = errs.filter((f) => !before.has(fingerprint(f)));
    r.old_errors = errs.length - r.new_errors.length;
    r.fixed_errors = [...before].filter((fp) => !errs.some((f) => fingerprint(f) === fp)).length;
  }
}
const errors = results.reduce((s, r) => s + (onlyNew ? r.new_errors.length : counts(r.findings).error), 0);

if (flags.has('--json')) {
  console.log(JSON.stringify({ ok: errors === 0, ...(onlyNew ? { mode: 'new', base: baseRev } : {}), stories: results.map((r) => ({ ...r, counts: counts(r.findings) })) }, null, 2));
} else if (!ids.length) {
  console.log('full: изменённых историй нет — укажи id: node scripts/hooks/full.mjs <id>');
} else {
  console.log(results.map(format).join('\n\n'));
}
// exitCode, а не process.exit: при выводе в трубу exit обрывает длинный отчёт на 64 КБ
process.exitCode = errors ? 1 : 0;

function format(r) {
  const c = counts(r.findings);
  const head = r.compiled
    ? `${(onlyNew ? r.new_errors.length : c.error) ? '✗' : '✓'} ${r.id}: ошибок ${c.error}, предупреждений ${c.warning}, подсказок ${c.hint}`
    : `✗ ${r.id}: не компилируется, lint не запускался`;
  const lines = [head];
  if (onlyNew) {
    const n = r.new_errors.length;
    lines.push(`  ${n ? '✗' : '✓'} новых ошибок ${n} против ${r.base.rev}${r.base.missing ? ' (истории там нет)' : `: прежних ${r.old_errors}, исправлено ${r.fixed_errors}`}`);
    lines.push(...r.new_errors.map((f) => findingLine(f, true)));
  }
  if (r.partial) lines.push('  часть истории: есть beta_stop — story:lint --partial (проверки целой истории пропущены)');
  for (const level of ['error', 'warning', 'hint']) {
    if (level === 'hint' && !flags.has('--hints')) continue;
    // в --new ошибки уже напечатаны поимённо — новые; прежние остаются числом в заголовке
    if (level === 'error' && onlyNew) continue;
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
