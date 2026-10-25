// Таблица фактов (R-91, narrative-testing:GREEN-05, RED-10): одно событие — одно время во всех местах. Без
// facts.md — кандидаты расхождения: слово-якорь рядом с разными ЧЧ:ММ в разных узлах (окно и корень — ключи
// C-49, как у её таблицы фактов). С facts.md — сверка с реестром и хронологией. --draft — черновик facts.md.
import { walk } from '../../../../scripts/lib/ink.mjs';
import { lintStory } from '../../../../scripts/lint/core.mjs';
import { args, emit, factsIn, load, pct, short, TIME } from './common.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/facts.mjs [--story <id|путь>,…] [--draft] [--runs N] [--json]

Факты и их согласие (скилл story-continuity, R-91, timeline.md, facts-format.md, приём — правка по F-13 / timeline.md):
  расхождения   слово-якорь (корень C-49.root букв, не дальше C-49.anchor_window слов от времени) стоит рядом
                с разными ЧЧ:ММ в разных узлах. Сильнее, если якорей несколько и одно из времён звучит лишь
                на части путей (ветка), а другое — у всех: «меньшинство» — кандидат на опечатку в ветке.
                Это кандидаты: один предмет в разное время (камера закрыта в 02:00, открыта в 03:00) — норма
  реестр        с docs/stories/<id>/facts.md: строка со словом факта и другим значением, чем в реестре;
                факт реестра, который нигде не звучит; переменная реестра, которой нет в VAR
  хронология    ЧЧ:ММ вне хронологии facts.md — те же находки, что C-49.facts у story:lint (пункт г)
  --draft       черновик facts.md из текста: времена с первой репликой, имена героев, строковые VAR.
                Печатается, а не пишется: файл заводит автор или story-desk после одобрения

  --story     история по id, файл .json / .ink или папка; через запятую; по умолчанию все из src/stories
  --runs N    прогонов бота (по умолчанию lint.runs.full — как у story:lint)
  --json      всё данными
  --help      эта справка`;

const A = args(HELP);
const win = A.T.value('C-49.anchor_window');
const rootLen = A.T.value('C-49.root');
const draft = A.has('--draft');
const report = [];

/** Строки исходника с текстом: узел, глава, говорящий, текст; ложь помечена `// намеренно: C-49`. */
function sourceLines(tree, st) {
  const out = [];
  for (const k of tree.knots) {
    const lie = k.marks.some((m) => m.kind === 'намеренно' && m.id === 'C-49');
    walk(k.items, (it) => {
      const text = it.type === 'choice' ? it.text : ['msg', 'me', 'sys'].includes(it.type) ? it.text : null;
      if (text) out.push({ knot: k.id, chapter: st.chapterOf(k.id) ?? 1, who: it.type === 'choice' ? 'игрок' : it.who, text, lie });
    });
  }
  return out;
}

/** Якоря времени в строке: корни слов в окне вокруг каждого ЧЧ:ММ. */
function anchors(text) {
  const words = text.toLowerCase().match(/[\p{L}\d:]+/gu) ?? [];
  const out = [];
  words.forEach((w, i) => {
    if (!/^\d{1,2}:\d\d$/.test(w)) return;
    const near = new Set();
    for (const a of words.slice(Math.max(0, i - win), i + win + 1)) if (a.length >= rootLen && !/\d/.test(a)) near.add(a.slice(0, rootLen));
    out.push({ time: w, roots: near });
  });
  return out;
}

for (const ref of A.refs) {
  const { story, ctx, facts, names, registry } = load(ref, A.T, A.runs);
  if (!ctx.built.ok) { report.push({ id: story.id, path: story.path, error: 'нет данных: история не компилируется' }); continue; }
  const { st, tree } = ctx;
  const lines = sourceLines(tree, st);
  const total = ctx.runs.length;
  const visits = new Map();
  for (const run of ctx.runs) for (const k of new Set(run.seq.map((x) => x.knot))) visits.set(k, (visits.get(k) ?? 0) + 1);
  const share = (knot) => (total ? (visits.get(knot) ?? 0) / total : 0);

  // время → корень → узлы
  const at = [];
  for (const l of lines) for (const a of anchors(l.text)) at.push({ ...a, knot: l.knot, chapter: l.chapter, text: l.text, lie: l.lie });
  const conflicts = new Map();
  for (let i = 0; i < at.length; i++) {
    for (let j = i + 1; j < at.length; j++) {
      const x = at[i];
      const y = at[j];
      // копия одной строки в двух узлах не спорит сама с собой (копии — C-46)
      if (x.time === y.time || x.knot === y.knot || x.text === y.text) continue;
      const shared = [...x.roots].filter((r) => y.roots.has(r));
      if (!shared.length) continue;
      // меньшинство — время, чей узел видит меньшая доля прогонов; его и называем узлом находки
      const [minor, major] = share(x.knot) <= share(y.knot) ? [x, y] : [y, x];
      const branch = share(minor.knot) < share(major.knot);
      const key = `${minor.knot}|${minor.time}|${major.time}`;
      const c = conflicts.get(key) ?? { node: minor.knot, chapter: minor.chapter, time: minor.time, against: major.time, againstNode: major.knot, anchors: new Set(), branch, shares: [share(minor.knot), share(major.knot)], text: minor.text, other: major.text, lie: minor.lie || major.lie };
      shared.forEach((r) => c.anchors.add(r));
      conflicts.set(key, c);
    }
  }
  const cand = [...conflicts.values()].map((c) => ({ ...c, anchors: [...c.anchors], score: c.anchors.size + (c.branch ? 2 : 0) }))
    .sort((a, b) => b.score - a.score || a.chapter - b.chapter);

  // сверка с facts.md
  const reg = [];
  const silent = [];
  const noVar = [];
  if (facts) {
    for (const r of registry) {
      const said = lines.filter((l) => r.words.some((w) => l.text.toLowerCase().includes(w)));
      if (!said.length) silent.push(r.fact);
      if (r.variable && !st.vars.index.has(r.variable)) noVar.push({ fact: r.fact, variable: r.variable });
      if (!r.value) continue;
      const isTime = /^\d{1,2}:\d\d$/.test(r.value);
      for (const l of said) {
        const vals = isTime ? (l.text.match(TIME) ?? []) : (l.text.match(/\d+/g) ?? []);
        const bad = vals.filter((v) => v !== r.value);
        if (vals.length && bad.length && !vals.includes(r.value)) reg.push({ node: l.knot, chapter: l.chapter, fact: r.fact, value: r.value, found: bad, text: l.text, lie: l.lie });
      }
    }
  }
  let c49 = [];
  const outside = [];
  if (facts) {
    for (const l of lines) for (const t of l.text.match(TIME) ?? []) if (!facts.times.has(t) && !l.lie) outside.push({ node: l.knot, chapter: l.chapter, time: t, text: l.text });
    const lint = await lintStory(story, A.T, { only: ['C-49'], runs: A.runs, seed: 1 });
    c49 = lint.findings.filter((f) => f.key === 'C-49.facts' && f.node).map((f) => ({ node: f.node, message: f.message }));
  }

  let draftMd = null;
  if (draft) {
    const seen = new Map();
    for (const l of lines) for (const t of l.text.match(TIME) ?? []) if (!seen.has(t)) seen.set(t, l);
    const strVars = [...st.vars.index.keys()].filter((v) => (tree.vars?.find?.((x) => x.name === v)?.value ?? '').toString().startsWith('"'));
    draftMd = [
      `# Факты · ${story.id}`, '',
      'Черновик из текста (facts.mjs --draft): события и «кто знает» пишет автор. Формат — facts-format.md.', '',
      '## Хронология', '', '| время мира | событие | кто знает |', '|---|---|---|',
      ...[...seen].map(([t, l]) => `| ${t} | ${short(l.text, 60).replace(/\|/g, '/')} (${l.knot}) | ${l.who ?? '—'} |`), '',
      '## Реестр', '', '| факт | слова | значение | переменная | кто знает |', '|---|---|---|---|---|',
      ...names.map((n) => `| имя: ${n.name} | ${n.key} | — | — | ${n.id} |`),
      ...strVars.map((v) => `| значение ${v} (кем назвался игрок?) | — | — | ${v} | — |`), '',
      '## Ложь', '', '| узел | кто | что говорит | правда |', '|---|---|---|---|', '',
    ].join('\n');
  }

  report.push({
    id: story.id, path: story.path, runs: total, facts: facts ? facts.file : null,
    candidates: cand, registry: reg, silent, noVar, outside, c49, ...(draftMd ? { draft: draftMd } : {}),
  });
}

emit(A.json, report, () => report.map((r) => {
  if (r.error) return `${r.id}: ${r.error}`;
  if (r.draft) return r.draft;
  const out = [`${r.id} · facts.md: ${r.facts ? 'есть' : 'нет (R-91; черновик — --draft)'}`];
  out.push(`  кандидаты расхождения времени: ${r.candidates.length || 'нет'}`);
  for (const c of r.candidates.slice(0, 12)) {
    out.push(`    ${c.node} (гл. ${c.chapter}) · ${c.time} против ${c.against} в ${c.againstNode} · якоря ${c.anchors.join(', ')}${c.branch ? ` · ветка ${pct(c.shares[0])} против ${pct(c.shares[1])}` : ' · оба на равных путях'}${c.lie ? ' · помечено ложью C-49' : ''}`);
    out.push(`      «${short(c.text, 60)}» / «${short(c.other, 60)}»`);
  }
  if (r.candidates.length > 12) out.push(`    … ещё ${r.candidates.length - 12} (все — в --json)`);
  if (r.facts) {
    out.push(`  реестр: расхождений со значением ${r.registry.length}, не звучит ${r.silent.length}, переменных нет ${r.noVar.length}`);
    for (const x of r.registry) out.push(`    ${x.node} (гл. ${x.chapter}) · «${x.fact}» = ${x.value}, в тексте ${x.found.join(', ')}${x.lie ? ' · помечено ложью C-49' : ''} · «${short(x.text, 50)}»`);
    for (const f of r.silent) out.push(`    факт «${f}» в реестре, но в тексте не звучит`);
    for (const v of r.noVar) out.push(`    факт «${v.fact}»: переменной ${v.variable} нет в VAR`);
    out.push(`  хронология: ${r.outside.length ? `${r.outside.length} упоминаний времени вне facts.md` : 'всё время из facts.md'} · C-49.facts у story:lint: ${r.c49.length}${r.c49.length !== r.outside.length ? ' (расходится: линт ищет facts.md в docs/stories/<id>/ от корня и не считает строки «// намеренно: C-49»)' : ''}`);
    for (const x of r.outside.slice(0, 8)) out.push(`    ${x.node} (гл. ${x.chapter}) · ${x.time} · «${short(x.text, 50)}»`);
  }
  return out.join('\n');
}).join('\n\n') || 'историй нет');
