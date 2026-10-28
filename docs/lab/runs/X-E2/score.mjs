#!/usr/bin/env node
// Кандидаты для сверки отчёта story-review с ключом 28 находок: по каждой находке ключа — пункты merged.json,
// у которых совпал узел, переменная или слово. Решение «засчитано / частично / нет» и точность — в judgments.json
// руками (оценка в роли автора): совпадение узла ещё не значит, что найдена та же причина.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.length < 1) {
  console.log('node docs/lab/runs/X-E2/score.mjs <папка ревью с merged.json> [--max 6] [--chars 170] [--items]\n\n--items — ещё и все пункты отчёта списком (для оценки точности).');
  process.exit(0);
}
const get = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const dir = argv[0];
const max = Number(get('--max', '6'));
const chars = Number(get('--chars', '170'));
const merged = JSON.parse(readFileSync(join(dir, 'merged.json'), 'utf8'));
const key = JSON.parse(readFileSync(new URL('./key-findings.json', import.meta.url), 'utf8'));
const items = merged.items.map((x, i) => ({ ...x, i }));
const text = (x) => `${x.summary ?? ''} ${x.fix ?? ''} ${x.place ?? ''}`;
const match = (k, x) => {
  const nodes = new Set(k.nodes ?? []);
  if ((x.nodes ?? []).some((n) => nodes.has(n) || nodes.has(String(n).split('.')[0]))) return 'узел';
  const t = text(x);
  if ((k.vars ?? []).some((v) => new RegExp(`\\b${v}\\b`).test(t))) return 'переменная';
  if ((k.terms ?? []).some((w) => new RegExp(w, 'i').test(t))) return 'слово';
  return null;
};
const line = (x, why) => `    #${x.i} P${x.p} ${x.type}${x.candidate ? ' (канд.)' : ''} · ${(x.nodes ?? []).join(',') || x.place} · ${why} · ${String(x.summary).replace(/\s+/g, ' ').slice(0, chars)}`;
const used = new Set();
console.log(`${merged.story} · ${dir} · пунктов ${items.length} (P1 ${items.filter((x) => x.p === 1).length}, P2 ${items.filter((x) => x.p === 2).length}, P3 ${items.filter((x) => x.p === 3).length}); ложных строк замера ${merged.falses?.length ?? 0}`);
for (const k of key.findings.filter((f) => f.story === merged.story)) {
  console.log(`\n${k.id} P${k.p} — ${k.what}`);
  const parts = k.rows ? k.rows.map((r) => ({ ...r, label: `  строка ${r.n}: ${r.what}` })) : [{ ...k, label: null }];
  for (const p of parts) {
    if (p.label) console.log(p.label);
    const c = items.map((x) => [x, match(p, x)]).filter(([, w]) => w);
    c.sort((a, b) => ['узел', 'переменная', 'слово'].indexOf(a[1]) - ['узел', 'переменная', 'слово'].indexOf(b[1]) || a[0].p - b[0].p);
    for (const [x] of c) used.add(x.i);
    for (const [x, w] of c.slice(0, max)) console.log(line(x, w));
    if (c.length > max) console.log(`    … ещё ${c.length - max}`);
    if (!c.length) console.log('    — кандидатов нет');
  }
}
if (argv.includes('--items')) {
  console.log('\nВсе пункты:');
  for (const x of items) console.log(line(x, x.basis + (used.has(x.i) ? '' : ' · вне ключа')));
}
