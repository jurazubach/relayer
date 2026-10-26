#!/usr/bin/env node
// Находки скиллов на чистой основе (skills:test --control) против ключа основы BASE_KEY из mutants-spec.mjs:
// какая доля — известные дефекты основы (верно), спорное, подсказки линта, а какая — вне ключа (кандидаты в ложные).
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { BASE_KEY } from '../../../../scripts/lab/mutants-spec.mjs';

const argv = process.argv.slice(2);
if (argv.includes('--help')) {
  console.log('node docs/lab/runs/X-E2/control.mjs [папка с mutants-*.json] [--list]\n\n--list — каждая находка с меткой ключа; без него — сводка по скиллам.');
  process.exit(0);
}
const dir = argv.find((a) => !a.startsWith('--')) ?? new URL('.', import.meta.url).pathname;
const files = readdirSync(dir).filter((f) => /^mutants-.*\.json$/.test(f));
const classify = (f) => {
  const text = `${f.check ?? ''} ${f.summary}`;
  for (const b of BASE_KEY) {
    const inNode = !b.nodes.length || b.nodes.includes(String(f.node)) || b.nodes.includes(String(f.node).split('.')[0]);
    if (inNode && new RegExp(b.match, 'i').test(text)) return b;
  }
  return null;
};
const rows = [];
const total = { n: 0, дефект: 0, спорно: 0, подсказка: 0, вне: 0, runs: 0 };
for (const file of files.sort()) {
  const j = JSON.parse(readFileSync(join(dir, file), 'utf8'));
  if (!j.control) continue;
  const s = { skill: j.skill, runs: 0, n: 0, дефект: 0, спорно: 0, подсказка: 0, вне: 0, ids: new Set() };
  j.control.runs.forEach((r, k) => {
    if (r.error || r.invalid) return;
    s.runs++;
    for (const f of r.findings) {
      const b = classify(f);
      s.n++;
      if (b) { s[b.kind]++; s.ids.add(b.id); } else s.вне++;
      if (argv.includes('--list')) console.log(`${j.skill.replace('story-', '')} #${k + 1} ${b ? `${b.id} ${b.kind}` : 'ВНЕ КЛЮЧА'} · ${f.node} · ${f.check ?? '—'} · ${f.summary.slice(0, 150)}`);
    }
  });
  rows.push(s);
  for (const k of ['n', 'дефект', 'спорно', 'подсказка', 'вне', 'runs']) total[k] += s[k];
}
if (!argv.includes('--list')) {
  const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '—');
  console.log('скилл              прогонов  находок  дефект  спорно  подсказка  вне ключа  на прогон  ключ основы');
  for (const s of [...rows, { skill: 'всего', ...total, ids: new Set() }]) {
    console.log(`${s.skill.padEnd(18)} ${String(s.runs).padStart(8)}  ${String(s.n).padStart(7)}  ${String(s.дефект).padStart(6)}  ${String(s.спорно).padStart(6)}  ${String(s.подсказка).padStart(9)}  ${String(s.вне).padStart(9)}  ${(s.n / (s.runs || 1)).toFixed(1).padStart(9)}  ${[...s.ids].sort().join(',')}`);
  }
  console.log(`\nверно (дефект + подсказка): ${pct(total.дефект + total.подсказка, total.n)}, со спорным: ${pct(total.дефект + total.подсказка + total.спорно, total.n)}, вне ключа: ${pct(total.вне, total.n)}`);
}
