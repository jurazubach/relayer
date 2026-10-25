// Карта улик (скилл story-mystery, проверка C-54): для каждого узла раскрытия «// reveal: clue_a, clue_b» —
// сколько прогонов до него доходят, с какими уликами, от скольких голосов, есть ли выбор перед ним и какие
// кнопки стоят в воротах. Данные — тот же журнал бота и тот же код, что у `npm run story:lint -- --only C-54`
// (scripts/lint/checks/C-54.mjs, revealStats), поэтому числа и находки совпадают. Без разметки — кандидаты.
import { readFileSync } from 'node:fs';
import { analyze, lintStory, loadChecks } from '../../../../scripts/lint/core.mjs';
import { revealStats, clueSources, factsOf } from '../../../../scripts/lint/checks/C-54.mjs';
import { loadStory, storyRefs } from '../../../../scripts/lib/story.mjs';
import { loadThresholds } from '../../../../scripts/lib/thresholds.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/clues.mjs --story <id|путь> [--runs N] [--seed N] [--json]

Карта улик для честной загадки (R-92, R-93, R-95, C-54). На каждый узел с меткой «// reveal:»:
  дошли         прогонов, которые входят в узел раскрытия (из всех)
  улик          при входе: мин / медиана / макс; доля с ≥ C-54.min_clues
  по уликам     доля прогонов, где улика выставлена; где её ставят и чья строка перед «~ clue_x = true»
  голоса        разных отправителей улик при входе; доля с ≥ C-54.channels (mystery-fair-play:P-07)
  без выбора    доля прогонов, где после последней улики до раскрытия нет кнопки (C-54.gap_choice)
  ворота        узел последнего выбора перед раскрытием и длины кнопок против C-54.long_answer
Виновник — строка «виновник: <id>» в docs/stories/<id>/facts.md (или в facts.md рядом с историей).
В конце — находки C-54 тем же прогоном (как у story:lint). Без меток — кандидаты в улики: булевы флаги,
которые пишет выбор или ствол и видимо читает реплика или кнопка позже, — с предложением разметки.

  --story <id|путь>  история по id, папка, .json или .ink (одна)
  --runs N           прогонов бота (по умолчанию lint.runs.full, как у story:lint)
  --seed N           seed (по умолчанию 1, как у story:lint)
  --json             всё данными
  --help             эта справка`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const T = loadThresholds();
const ref = storyRefs([opt('--story')].filter(Boolean))[0];
if (!opt('--story') || !ref) { console.error('нужно --story <id|путь> (см. --help)'); process.exit(2); }
const runs = Number(opt('--runs') ?? T.value('lint.runs.full'));
const seed = Number(opt('--seed') ?? 1);

let story;
try { story = loadStory(ref); } catch (e) { console.error(`нет данных: ${e.message}`); process.exit(2); }
const ctx = analyze(story, T, { runs, seed });
if (!ctx.built.ok) { console.error(`нет данных: история не компилируется — npm run story:lint -- --story ${story.id}`); process.exit(2); }

const pct = (x) => `${Math.round(x * 100)} %`;
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const truthy = (v) => !(v === 0 || v === false || v === '' || v === '0' || v === 'false' || v == null);

const reveals = ctx.tree.knots.flatMap((k) => k.marks.filter((m) => m.kind === 'reveal').map((m) => ({ at: k.id, clues: m.value.split(/[,\s]+/).filter(Boolean) })));
const factsPath = factsOf(story);
const culprit = factsPath ? readFileSync(factsPath, 'utf8').match(/виновник\s*[:—-]\s*`?([\p{L}\p{N}_]+)/u)?.[1] ?? null : null;

const report = reveals.map(({ at, clues }) => {
  const s = revealStats(ctx, at, clues);
  const src = clueSources(ctx.tree, clues);
  const groups = ctx.st.buttons.groups;
  const gates = [...s.gates].sort((a, b) => b[1] - a[1]).map(([knot, n]) => ({
    knot, share: s.reached ? n / s.reached : 0,
    buttons: (groups.find((g) => g.knot === knot)?.buttons ?? []).map((b) => ({ text: b.text, chars: b.text.length, writes: b.writes })),
  }));
  return {
    at, chapter: ctx.st.chapterOf(at), clues, runs: s.runs, reached: s.reached,
    clues_at_entry: { min: s.counts.length ? Math.min(...s.counts) : null, median: median(s.counts), max: s.counts.length ? Math.max(...s.counts) : null },
    enough_share: s.reached ? s.enough / s.reached : null,
    per_clue: clues.map((c) => ({ clue: c, declared: ctx.st.vars.index.has(c), share: s.reached ? s.seen.get(c) / s.reached : 0, set_in: src.get(c) })),
    voices: { median: median(s.voices), share_ok: s.reached ? s.voices.filter((n) => n >= T.value('C-54.channels')).length / s.reached : null },
    gapless_share: s.reached ? s.gapless / s.reached : null,
    gates,
  };
});

// без разметки: флаги знания — булевы VAR (только «= true/false», счётчики не в счёт), видимо читаемые в другом узле
const marked = new Set(reveals.flatMap((r) => r.clues));
const init = new Map(ctx.tree.vars.filter((v) => v.kind === 'VAR').map((v) => [v.name, v.value]));
const setShare = (name) => ctx.runs.filter((r) => r.vars.some((e) => e.name === name && truthy(e.value))).length / (ctx.runs.length || 1);
const finalsRead = new Set([...ctx.st.distributors].flatMap((d) => [...ctx.st.readsOf(d)]));
const candidates = [...ctx.st.vars.index.values()]
  .filter((v) => !marked.has(v.name) && /^(false|0)$/.test(String(init.get(v.name))) && v.writes.length && v.writes.every((w) => w.op === '=' && /^(true|false|1|0)$/.test(w.rhs)) && v.writes.some((w) => /^(true|1)$/.test(w.rhs)))
  .map((v) => ({
    name: v.name,
    written: [...new Set(v.writes.map((w) => w.node))],
    by_choice: v.writes.some((w) => w.choice),
    read_visible: [...new Set(v.reads.filter((r) => r.visible && !v.writes.some((w) => w.node === r.node)).map((r) => r.node))],
    read_by_ending: finalsRead.has(v.name),
    set_share: setShare(v.name),
  }))
  .filter((c) => c.read_visible.length || c.read_by_ending)
  .sort((a, b) => b.read_by_ending - a.read_by_ending || b.read_visible.length - a.read_visible.length || a.name.localeCompare(b.name));

const lint = await lintStory(story, T, { checks: await loadChecks(), only: ['C-54'], runs, seed });
const out = {
  story: story.id, runs: ctx.runs.length, seed, reveals: report, culprit, facts: factsPath,
  clue_vars: [...ctx.st.vars.index.keys()].filter((n) => /^clue_/.test(n)),
  unmarked_clue_vars: [...ctx.st.vars.index.keys()].filter((n) => /^clue_/.test(n) && !marked.has(n)),
  candidates: reveals.length ? [] : candidates,
  findings: lint.findings.map((f) => ({ check: f.check, key: f.key, level: f.level, node: f.node, message: f.message })),
};

if (args.includes('--json')) { console.log(JSON.stringify(out, null, 1)); process.exit(0); }

const L = [];
L.push(`clues · ${story.id} · прогонов ${out.runs} (seed ${seed})`);
L.push(`раскрытий «// reveal:» — ${reveals.length} · переменных clue_* — ${out.clue_vars.length}${out.unmarked_clue_vars.length ? ` (вне раскрытий: ${out.unmarked_clue_vars.join(', ')})` : ''} · виновник: ${culprit ?? (factsPath ? 'в facts.md нет строки «виновник:»' : 'facts.md нет')}`);
for (const r of report) {
  L.push('', `▸ ${r.at} (гл. ${r.chapter}) — улики: ${r.clues.join(', ')}`);
  if (!r.reached) { L.push('  ни один прогон не дошёл до узла — проверь путь: npm run graph'); continue; }
  L.push(`  дошли: ${r.reached} из ${r.runs} (${pct(r.reached / r.runs)})`);
  L.push(`  улик при входе: мин ${r.clues_at_entry.min} · медиана ${r.clues_at_entry.median} · макс ${r.clues_at_entry.max}; с ≥ ${T.value('C-54.min_clues')} (C-54.min_clues) — ${pct(r.enough_share)}`);
  for (const c of r.per_clue) {
    const where = c.set_in.length ? c.set_in.map((x) => `${x.knot}${x.who ? ` (${x.who})` : ''}`).join(', ') : 'нигде не ставится';
    L.push(`    ${c.clue}${c.declared ? '' : ' (нет VAR)'} — ${pct(c.share)} · ставят: ${where}`);
  }
  L.push(`  голосов при входе: медиана ${r.voices.median}; с ≥ ${T.value('C-54.channels')} (C-54.channels) — ${pct(r.voices.share_ok)}`);
  L.push(`  без выбора между последней уликой и раскрытием: ${pct(r.gapless_share)} (C-54.gap_choice)`);
  for (const g of r.gates.slice(0, T.value('lint.examples'))) {
    L.push(`  ворота: ${g.knot} (${pct(g.share)} прогонов) — ${g.buttons.map((b) => `«${b.text}» ${b.chars} зн.${b.writes.length ? ` [${b.writes.join(', ')}]` : ''}`).join(' · ') || 'кнопок нет'}`);
  }
}
if (!reveals.length) {
  L.push('', 'разметки «// reveal:» нет — C-54 молчит. Кандидаты в улики (флаги знания: false → true, видимое чтение в другом узле):');
  if (!candidates.length) L.push('  нет: похоже, в истории нет скрытой правды или знание не хранится переменными');
  for (const c of candidates.slice(0, T.value('lint.examples') * 2)) {
    L.push(`  ${c.name} — ${pct(c.set_share)} прогонов · пишут: ${c.written.join(', ')}${c.by_choice ? ' (кнопка)' : ''} · видно: ${c.read_visible.join(', ') || '—'}${c.read_by_ending ? ' · читает распределитель финала' : ''}`);
  }
  if (candidates.length) L.push('  разметка: переименуй в clue_<имя> и поставь «// reveal: clue_a, clue_b» над узлом разгадки (R-92) — references/clue-map.md');
}
L.push('', out.findings.length ? `C-54 (как story:lint): ${out.findings.length}` : 'C-54 (как story:lint): находок нет');
for (const f of out.findings) L.push(`  ${f.level} · ${f.key} · ${f.node ?? '—'} · ${f.message}`);
console.log(L.join('\n'));
