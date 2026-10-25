// story:endings — финалы: какие есть, сколько прохождений в каждый у разных персон и какие переменные их решают.
import { walk, resolveTarget } from '../lib/ink.mjs';
import { runCli, intFlag, pct, table } from './core/cli.mjs';
import { PERSONAS, PERSONA_IDS, parsePersonas } from './core/personas.mjs';
import { BETA_STOP, prepare, runOnce } from './core/run.mjs';
import { threshold, thresholdEntry } from '../lib/thresholds.mjs';
import { varIndex } from './core/vars-index.mjs';

const HELP = `npm run story:endings -- [--story <id>] [--persona <имя>|all] [--runs N] [--seed N]
                         [--partial] [--json]

Финалы истории и как до них доходят.

Что считается финалом: если в истории есть хоть одна метка «// финал: <имя>» — только
размеченные места (в одном узле их может быть несколько, по веткам состояния: финал прогона —
метка, чью первую реплику он напечатал). Узлы с -> END без метки — «без метки» (C-40).
Без меток — узлы с -> END и финальные узлы (checks.md: без кнопок, все выходы ведут в END или
в другие финальные): финал прогона — первый из них, в который он вошёл. Общий эпилог, куда
попадают только из других финальных узлов, финалом не считается.

Распределение — доля прохождений каждой персоны в каждом финале (по умолчанию все персоны;
first и last детерминированы и идут один раз). Рядом — значения VAR ending, если она есть.

Какие переменные решают:
  статически — условия над переходами распределителя (узла, который ведёт в два финальных и
               больше) и над переходами в финал;
  по прогонам — насколько конечное значение переменной предсказывает финал: прирост точности
               над «всегда самый частый финал», лучшие endings.top_vars.
Подсказки C-40: один финал забирает больше C-40.dominant_share при трёх финалах и больше;
финал реже C-40.rare_share; финал, в который не пришёл никто.

  --story <id>  история или несколько через запятую; по умолчанию все из src/stories
  --persona     одна, несколько через запятую или all (по умолчанию all)
  --runs N      прохождений на персону (по умолчанию endings.runs)
  --seed N      начальный seed (по умолчанию 1)
  --partial     история из части глав: beta_stop — конец части, не финал
  --json        всё данными
  --help        эта справка`;

const TOKEN = /[\p{L}\p{N}_]+/gu;
const condVars = (exprs, vars) => {
  const out = new Set();
  for (const e of exprs) for (const m of String(e).replace(/"[^"]*"/g, '').matchAll(TOKEN)) if (vars.has(m[0])) out.add(m[0]);
  return out;
};

/** Узел-финал → переменные в условиях над переходами в него (из распределителей и любых узлов). */
function staticDeciders(tree, endingNodes, idx) {
  const ids = new Set(tree.knots.map((k) => k.id));
  const vars = new Set(idx.vars.map((v) => v.name));
  const targets = new Set([...endingNodes, ...idx.final]);
  const out = new Map();
  for (const k of tree.knots) {
    walk(k.items, (it, path) => {
      if (it.type !== 'divert' || it.kind === 'tunnel') return;
      const to = resolveTarget(it.target, k.id, ids);
      if (!to || !targets.has(to) || to === k.id) return;
      const exprs = [];
      for (const c of path) {
        if (c.type === 'choice') exprs.push(...c.conds);
        else if (c.type === 'cond' && c.head) exprs.push(c.head);
        else if (c.type === 'branch' && c.cond && c.cond !== 'else') exprs.push(c.cond);
      }
      const vs = condVars(exprs, vars);
      if (!out.has(to)) out.set(to, { vars: new Set(), via: new Set(), from: new Set() });
      for (const v of vs) out.get(to).vars.add(v);
      // производные на одну ступень: «~ ending = …» внутри условия на phished — решает и phished
      for (const v of vs) for (const d of idx.byName.get(v)?.derivedFrom ?? []) if (!vs.has(d)) out.get(to).via.add(`${d}→${v}`);
      if (vs.size) out.get(to).from.add(k.id);
    });
  }
  return out;
}

/** Переменные, конечное значение которых лучше всего предсказывает финал. */
function dynamicDeciders(runs, top) {
  if (!runs.length) return [];
  const count = (arr) => arr.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map());
  const base = Math.max(...count(runs.map((r) => r.ending)).values()) / runs.length;
  // VAR ending печатается отдельной таблицей: предсказывать финал им — тавтология
  const names = Object.keys(runs[0].vars ?? {}).filter((n) => n !== 'ending');
  const out = [];
  for (const name of names) {
    const byValue = new Map();
    for (const r of runs) {
      const v = JSON.stringify(r.vars[name]);
      if (!byValue.has(v)) byValue.set(v, []);
      byValue.get(v).push(r.ending);
    }
    if (byValue.size < 2) continue;
    let hit = 0;
    const map = [];
    for (const [v, list] of byValue) {
      const c = count(list);
      const [best, n] = [...c].sort((a, b) => b[1] - a[1])[0];
      hit += n;
      map.push({ value: JSON.parse(v), ending: best, share: n / list.length, runs: list.length });
    }
    const gain = hit / runs.length - base;
    if (gain > 0) out.push({ name, gain, accuracy: hit / runs.length, values: map.sort((a, b) => b.runs - a.runs).slice(0, 6) });
  }
  return out.sort((a, b) => b.gain - a.gain).slice(0, top);
}

runCli(HELP, async (args) => {
  const json = args.has('json');
  const personas = parsePersonas(args.get('persona'), PERSONA_IDS);
  const runs = intFlag(args, 'runs', threshold('endings.runs'));
  if (!runs) throw new Error('--runs: нужно хотя бы одно прохождение');
  const seed = intFlag(args, 'seed', 1);
  const partial = args.has('partial');
  const report = [];
  for (const ref of args.refs) {
    const p = prepare(ref);
    const idx = varIndex(p.tree);
    // в части истории beta_stop — обрыв, а не финал
    const marked = p.endings.endings.filter((e) => !(partial && e.id === BETA_STOP));
    const declared = marked.map((e) => e.name);
    const endingNodes = new Set(marked.map((e) => e.id));
    const deciders = staticDeciders(p.tree, endingNodes, idx);
    const hasEndingVar = idx.byName.has('ending');
    const all = [];
    const dist = {};
    for (const persona of personas) {
      const n = PERSONAS[persona].deterministic ? 1 : runs;
      const counts = {};
      for (let k = 0; k < n; k++) {
        const r = runOnce(p, { persona, seed: seed + k, partial });
        const name = r.ending.name;
        counts[name] = (counts[name] ?? 0) + 1;
        const chapter = r.timeline.items.at(-1)?.chapter ?? null;
        all.push({ persona, ending: name, kind: r.ending.kind, vars: r.vars, chapter, lines: r.timeline.totals.lines, endingVar: hasEndingVar ? r.vars.ending : undefined });
      }
      dist[persona] = { runs: n, counts };
    }
    const names = [...new Set([...declared, ...all.map((r) => r.ending)])];
    const pooled = all.filter((r) => !PERSONAS[r.persona].deterministic);
    const total = all.length;
    const rows = names.map((name) => {
      const mine = all.filter((r) => r.ending === name);
      const decl = marked.find((e) => e.name === name);
      const st = decl ? deciders.get(decl.id) : null;
      const ev = hasEndingVar ? [...mine.reduce((m, r) => m.set(r.endingVar, (m.get(r.endingVar) ?? 0) + 1), new Map())] : [];
      return {
        name, node: decl?.id ?? mine[0]?.ending ?? null, declared: !!decl, line: decl?.line ?? null,
        runs: mine.length, share: total ? mine.length / total : 0,
        chapters: [...new Set(mine.map((r) => r.chapter))].sort((a, b) => a - b),
        byPersona: Object.fromEntries(personas.map((ps) => [ps, dist[ps].counts[name] ?? 0])),
        staticVars: st ? [...st.vars] : [], derivedVars: st ? [...st.via] : [], decidedIn: st ? [...st.from] : [],
        endingVar: ev.map(([value, n]) => ({ value, n })),
      };
    });
    const hints = [];
    const real = rows.filter((r) => r.declared);
    const top = [...real].sort((a, b) => b.runs - a.runs)[0];
    if (real.length >= 3 && top && top.share > threshold('C-40.dominant_share')) hints.push(`⚠ финал «${top.name}» забирает ${pct(top.runs, total)} прохождений (C-40.dominant_share = ${threshold('C-40.dominant_share')})`);
    for (const r of real) {
      if (!r.runs) hints.push(`ℹ финал «${r.name}» (${r.node}) не встретился ни разу — достижим ли он?`);
      else if (r.share < threshold('C-40.rare_share')) hints.push(`ℹ финал «${r.name}» выпал в ${pct(r.runs, total)} — достижим ли он целенаправленно? (C-40.rare_share = ${threshold('C-40.rare_share')})`);
    }
    for (const r of rows.filter((x) => !x.declared && x.runs && x.name !== `(${BETA_STOP})`)) hints.push(`⚠ ${r.name}: ${r.runs} прохождений закончились не в финале`);
    if (p.endings.unmarked.length) hints.push(`⚠ -> END без метки «// финал:»: ${p.endings.unmarked.join(', ')}`);
    const dyn = dynamicDeciders(pooled.length ? pooled : all, threshold('endings.top_vars'));
    report.push({
      id: p.story.id, path: p.story.path, source: p.endings.source, final: [...idx.final], distributors: [...idx.distributors],
      unmarked: p.endings.unmarked, runs: total, personas: dist, endings: rows, deciders: dyn, hints,
      thresholds: ['C-40.dominant_share', 'C-40.rare_share', 'endings.top_vars'].map(thresholdEntry),
    });
    if (json) continue;
    console.log(`${p.story.path} · финалов ${declared.length} (${p.endings.source === 'mark' ? 'по меткам «// финал:»' : 'по -> END, меток нет'}) · прохождений ${total}`);
    console.log(`   распределители: ${[...idx.distributors].join(', ') || '—'} · финальные узлы: ${[...idx.final].join(', ') || '—'}`);
    const head = ['финал', 'узел', 'всего', 'гл.', ...personas.map((ps) => ps.slice(0, 6))];
    console.log(table(rows.map((r) => [r.name, r.node, `${r.runs} · ${pct(r.runs, total)}`, r.chapters.join(',') || '—', ...personas.map((ps) => pct(r.byPersona[ps], dist[ps].runs))]), head).replace(/^/gm, '   '));
    if (hasEndingVar) {
      console.log('\n   значения VAR ending по финалам:');
      for (const r of rows.filter((x) => x.runs)) console.log(`     ${r.name}: ${r.endingVar.map((e) => `${JSON.stringify(e.value)} ${pct(e.n, r.runs)}`).join(' · ')}`);
    }
    console.log('\n   что решает (статически, условия над переходами в финал):');
    const st = rows.filter((r) => r.staticVars.length);
    if (!st.length) console.log('     — условий над переходами в финалы нет: финал один или выбирается кнопкой без условий');
    for (const r of st) {
      const via = new Map();
      for (const x of r.derivedVars) { const [d, v] = x.split('→'); if (!via.has(v)) via.set(v, []); via.get(v).push(d); }
      console.log(`     ${r.name}: ${r.staticVars.join(', ')} — в ${r.decidedIn.join(', ')}${[...via].map(([v, ds]) => `; ${v} ← ${ds.join(', ')}`).join('')}`);
    }
    console.log('\n   что решает (по прохождениям, прирост точности предсказания финала):');
    if (!dyn.length) console.log('     — ни одна переменная не предсказывает финал лучше «всегда самый частый»');
    for (const d of dyn) console.log(`     ${d.name}: +${Math.round(d.gain * 100)} п. п. (${d.values.slice(0, 3).map((v) => `${JSON.stringify(v.value)} → ${v.ending} ${pct(Math.round(v.share * 100), 100)}`).join('; ')})`);
    if (hints.length) console.log('\n' + hints.map((h) => `   ${h}`).join('\n'));
    console.log('');
  }
  if (json) console.log(JSON.stringify({ stories: report }, null, 1));
});
