// Защита слияний (R-35, F-13): узлы, куда ведут два и больше путей, — что игрок на разных входах уже знает и
// с кем уже говорил, на что из этого узел опирается без условия, сколько веток в каскаде на входе. Плюс
// повторы на пути из C-46 (владелец story-voice): второй вход в общий узел показывает текст ещё раз.
import { walk } from '../../../../scripts/lib/ink.mjs';
import { lintStory } from '../../../../scripts/lint/core.mjs';
import { isIncoming } from '../../../../scripts/lint/journal.mjs';
import { args, emit, factsIn, load, pct, short } from './common.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/merges.mjs [--story <id|путь>,…] [--node <узел>] [--all] [--runs N] [--json]

Слияния (скилл story-continuity, R-35, приём F-13, merge-guard.md):
  узел        узел с двумя и более входами (разные узлы-предшественники в графе ink)
  входы       предшественники и доля входов бота через каждый
  разное      контакты, которые уже писали игроку, и факты (имя, ЧЧ:ММ, слово реестра facts.md), известные
              на части входов: доля входов, где они есть
  ! опора     узел без условия даёт реплику этого контакта или называет этот факт — то, что на части входов
              не так (C-51: сверь находку линта)
  каскад      ветки условного блока на входе; ! — больше C-51.cascade_branches веток до else (R-35)
  повторы     предупреждения C-46.path_repeat тех же прогонов: строка дважды за прохождение

  --story     история по id, файл .json / .ink или папка; через запятую; по умолчанию все из src/stories
  --node      только этот узел, со всеми различиями
  --all       все слияния, а не только с опорой на разное
  --runs N    прогонов бота (по умолчанию lint.runs.full — как у story:lint)
  --json      всё данными
  --help      эта справка`;

const A = args(HELP);
const onlyNode = A.opt('--node');
const showAll = A.has('--all') || !!onlyNode;
const maxBranches = A.T.value('C-51.cascade_branches');
const report = [];

/** Условные блоки в начале узла (до первой реплики и кнопки): сколько веток до else и есть ли else. */
function entryCascades(items) {
  const out = [];
  for (const it of items) {
    if (it.type === 'cond' && it.branches.length > 1) out.push({ branches: it.branches.filter((b) => b.cond !== 'else').length, else: it.branches.some((b) => b.cond === 'else'), line: it.line });
    if (['msg', 'me', 'choice'].includes(it.type)) break;
  }
  return out;
}

for (const ref of A.refs) {
  const { story, ctx, names, registry } = load(ref, A.T, A.runs);
  if (!ctx.built.ok) { report.push({ id: story.id, path: story.path, error: 'нет данных: история не компилируется' }); continue; }
  const { st, tree } = ctx;
  const preds = new Map();
  for (const [from, edges] of st.edges) for (const e of edges) {
    if (e.to === from) continue;
    if (!preds.has(e.to)) preds.set(e.to, new Set());
    preds.get(e.to).add(from);
  }
  const merges = new Map([...preds].filter(([, p]) => p.size >= 2).map(([id, p]) => [id, { id, preds: [...p], entries: 0, via: new Map(), have: new Map() }]));
  // на что узел опирается без условия: говорящие и факты его безусловных строк
  const relies = new Map();
  for (const k of tree.knots) {
    if (!merges.has(k.id)) continue;
    const r = { speakers: new Set(), guardedSpeakers: new Set(), facts: new Set(), guardedFacts: new Set() };
    walk(k.items, (it, path) => {
      if (!['msg', 'me', 'sys'].includes(it.type)) return;
      const guarded = /\{[^{}]*[:|][^{}]*\}/.test(it.text) || path.some((p) => p.type === 'cond' || (p.type === 'choice' && p.conds.length));
      const fs = factsIn(it.text, { names, registry, who: it.who, times: it.type === 'me' });
      if (guarded) { fs.forEach((f) => r.guardedFacts.add(f.fact)); if (it.type === 'msg' && it.who) r.guardedSpeakers.add(it.who); return; }
      if (it.type === 'msg' && it.who && !ctx.service.has(it.who)) r.speakers.add(it.who);
      fs.forEach((f) => r.facts.add(f.fact));
    });
    // одна защищённая реплика контакта — уже вход по состоянию, как в C-51 (б)
    for (const w of r.guardedSpeakers) r.speakers.delete(w);
    relies.set(k.id, { ...r, cascades: entryCascades(k.items), chapter: st.chapterOf(k.id) });
  }

  for (const run of ctx.runs) {
    const writers = new Set();
    const known = new Set();
    const entered = new Set();
    let prev = null;
    for (const item of run.seq) {
      const knot = item.knot;
      if (knot !== prev && merges.has(knot) && !entered.has(knot)) {
        entered.add(knot);
        const m = merges.get(knot);
        m.entries++;
        m.via.set(prev ?? '(начало)', (m.via.get(prev ?? '(начало)') ?? 0) + 1);
        for (const w of writers) m.have.set(`контакт ${w}`, (m.have.get(`контакт ${w}`) ?? 0) + 1);
        for (const f of known) m.have.set(`факт ${f}`, (m.have.get(`факт ${f}`) ?? 0) + 1);
      }
      prev = knot;
      if (item.type === 'choice') continue;
      for (const f of factsIn(item.text, { names, registry })) known.add(f.fact);
      if (isIncoming(item) && item.who && !ctx.service.has(item.who)) {
        writers.add(item.who);
        const n = names.find((x) => x.id === item.who);
        if (n) known.add(n.key);
      }
    }
  }

  const lint = await lintStory(story, A.T, { only: ['C-46'], runs: A.runs, seed: 1 });
  const repeats = lint.findings.filter((f) => f.key === 'C-46.path_repeat').map((f) => ({ node: f.node, chapter: f.chapter, message: f.message }));

  const rows = [];
  for (const m of merges.values()) {
    if (onlyNode && m.id !== onlyNode) continue;
    const r = relies.get(m.id);
    if (!r || !m.entries) continue;
    const differs = [...m.have].filter(([, n]) => n < m.entries).map(([what, n]) => ({ what, share: n / m.entries }));
    const risky = differs.filter((d) => {
      const [kind, x] = d.what.split(' ');
      return kind === 'контакт' ? r.speakers.has(x) : r.facts.has(x);
    });
    const wide = r.cascades.filter((c) => c.branches > maxBranches);
    if (!showAll && !risky.length && !wide.length) continue;
    rows.push({
      node: m.id, chapter: r.chapter, entries: m.entries,
      via: [...m.via].sort((a, b) => b[1] - a[1]).map(([from, n]) => ({ from, share: n / m.entries })),
      differs: differs.sort((a, b) => a.share - b.share), risky, cascades: r.cascades, wide: wide.length > 0,
      guarded: [...r.guardedFacts],
    });
  }
  rows.sort((a, b) => b.risky.length - a.risky.length || (a.chapter ?? 0) - (b.chapter ?? 0));
  report.push({ id: story.id, path: story.path, runs: ctx.runs.length, merges: merges.size, rows, repeats });
}

emit(A.json, report, () => report.map((r) => {
  if (r.error) return `${r.id}: ${r.error}`;
  const out = [`${r.id} · прогонов ${r.runs} · узлов с двумя и более входами: ${r.merges} · показано: ${r.rows.length}${showAll ? '' : ' (с опорой на разное или широким каскадом; все — --all)'}`];
  for (const x of r.rows) {
    out.push(`  ${x.node} (гл. ${x.chapter}) · входов бота ${x.entries} · через ${x.via.slice(0, 4).map((v) => `${v.from} ${pct(v.share)}`).join(', ')}`);
    for (const d of x.risky) out.push(`    ! опора: ${d.what} — есть лишь на ${pct(d.share)} входов, а узел опирается на это без условия`);
    const rest = x.differs.filter((d) => !x.risky.includes(d));
    if (rest.length) out.push(`    разное на входах: ${rest.slice(0, 6).map((d) => `${d.what} ${pct(d.share)}`).join(' · ')}${rest.length > 6 ? ` · … ещё ${rest.length - 6}` : ''}`);
    for (const c of x.cascades) out.push(`    каскад на входе: веток ${c.branches}${c.else ? ' + else' : ', без else (C-15)'}${c.branches > maxBranches ? ` · ! больше C-51.cascade_branches = ${maxBranches} (R-35)` : ''}`);
  }
  out.push(`  повторы на пути (C-46.path_repeat, владелец story-voice): ${r.repeats.length || 'нет'}`);
  for (const p of r.repeats.slice(0, 8)) out.push(`    ${p.node} (гл. ${p.chapter}) · ${short(p.message, 110)}`);
  if (r.repeats.length > 8) out.push(`    … ещё ${r.repeats.length - 8} (все — в --json)`);
  return out.join('\n');
}).join('\n\n') || 'историй нет');
