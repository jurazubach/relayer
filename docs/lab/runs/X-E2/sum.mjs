#!/usr/bin/env node
// Таблицы полноты и устойчивости Э2 из judgments.json: по прогонам, по находкам, по группам (действительные,
// недействительные, с правкой cold-reader), против базового снимка Э1.
import { readFileSync } from 'node:fs';

if (process.argv.includes('--help')) { console.log('node docs/lab/runs/X-E2/sum.mjs\n\nСводка полноты и устойчивости из judgments.json и key-findings.json.'); process.exit(0); }
const J = JSON.parse(readFileSync(new URL('./judgments.json', import.meta.url), 'utf8'));
const K = JSON.parse(readFileSync(new URL('./key-findings.json', import.meta.url), 'utf8'));
const pct = (x) => `${Math.round(x * 100)}%`;
const runs = Object.entries(J.runs);
const ids = (story) => K.findings.filter((f) => f.story === story).map((f) => f.id);
const p1 = (story) => K.findings.filter((f) => f.story === story && f.p === 1).map((f) => f.id);
const score = (rec, list) => list.reduce((s, id) => s + (rec[id] ?? 0), 0);

console.log('прогон      история        группа       cold-reader  действ.  полнота        P1');
for (const [id, r] of runs) {
  const all = ids(r.story); const one = p1(r.story);
  console.log(`${id.padEnd(11)} ${r.story.padEnd(14)} ${r.group.padEnd(12)} ${r.cold_reader.padEnd(12)} ${(r.valid ? 'да' : 'нет').padEnd(8)} ${`${score(r.recall, all)}/${all.length} ${pct(score(r.recall, all) / all.length)}`.padEnd(14)} ${score(r.recall, one)}/${one.length}`);
}
const group = (name, pick) => {
  const list = runs.filter(([, r]) => pick(r));
  if (!list.length) return;
  const s = list.reduce((a, [, r]) => a + score(r.recall, ids(r.story)), 0);
  const n = list.reduce((a, [, r]) => a + ids(r.story).length, 0);
  console.log(`  ${name.padEnd(46)} ${String(list.length).padStart(2)} прогонов  ${pct(s / n)}`);
};
console.log('\nгруппы:');
group('«Чужой голос», все', (r) => r.story === 'chuzhoy-golos');
group('«Чужой голос», действительные (T-17)', (r) => r.story === 'chuzhoy-golos' && r.valid);
group('«Чужой голос», недействительные', (r) => r.story === 'chuzhoy-golos' && !r.valid);
group('«Чужой голос», cold-reader без --json', (r) => r.story === 'chuzhoy-golos' && r.cold_reader === 'без --json');
group('THE NUMBER (калибровка)', (r) => r.story === 'the-number');
group('«Слепое пятно» (калибровка)', (r) => r.story === 'slepoe-pyatno');
const base = J.baseline_e1.recall;
for (const story of ['chuzhoy-golos', 'the-number', 'slepoe-pyatno']) {
  const all = ids(story);
  console.log(`  Э1, только команды, ${story.padEnd(26)}    ${pct(score(base, all) / all.length)}`);
}
console.log('\nпо находкам «Чужого голоса» (доля прогонов; Э1):');
const cg = runs.filter(([, r]) => r.story === 'chuzhoy-golos');
for (const id of ids('chuzhoy-golos')) {
  const s = cg.reduce((a, [, r]) => a + (r.recall[id] ?? 0), 0);
  const f = K.findings.find((x) => x.id === id);
  console.log(`  ${id} P${f.p}  ${String(s).padStart(4)}/${cg.length}  ${'█'.repeat(Math.round((s / cg.length) * 10)).padEnd(10)}  Э1 ${base[id]}  ${f.what.slice(0, 70)}`);
}
const core = ids('chuzhoy-golos').filter((id) => cg.every(([, r]) => r.recall[id] === 1));
const major = ids('chuzhoy-golos').filter((id) => cg.reduce((a, [, r]) => a + (r.recall[id] ?? 0), 0) >= (2 / 3) * cg.length);
console.log(`\nустойчивость: во всех ${cg.length} прогонах — ${core.length} находок (${core.join(', ')}); в двух третях и чаще — ${major.length}`);
const pairs = [];
for (let i = 0; i < cg.length; i++) for (let j = i + 1; j < cg.length; j++) {
  const a = cg[i][1].recall; const b = cg[j][1].recall;
  const hitA = new Set(Object.keys(a).filter((k) => a[k] >= 0.5)); const hitB = new Set(Object.keys(b).filter((k) => b[k] >= 0.5));
  const inter = [...hitA].filter((k) => hitB.has(k)).length; const uni = new Set([...hitA, ...hitB]).size;
  pairs.push(inter / uni);
}
console.log(`пересечение найденного попарно (Жаккар): медиана ${pct(pairs.sort((x, y) => x - y)[Math.floor(pairs.length / 2)])}, минимум ${pct(pairs[0])}`);
const all28 = [...ids('chuzhoy-golos'), ...ids('the-number'), ...ids('slepoe-pyatno')];
const mean = (story) => { const rs = runs.filter(([, r]) => r.story === story); return Object.fromEntries(ids(story).map((id) => [id, rs.reduce((a, [, r]) => a + (r.recall[id] ?? 0), 0) / rs.length])); };
const m = { ...mean('chuzhoy-golos'), ...mean('the-number'), ...mean('slepoe-pyatno') };
console.log(`\n28 находок (среднее по прогонам каждой истории): ${pct(all28.reduce((a, id) => a + m[id], 0) / 28)}; Э1 — ${pct(score(base, all28) / 28)}`);
