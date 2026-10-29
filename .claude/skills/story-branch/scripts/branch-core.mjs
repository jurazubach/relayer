// Общий разбор развилок для branch-impact и branch-budget: точки выбора, область каждой кнопки (узлы, куда
// попадают только через неё), слияние, финалы, контакты, переменные и доли игроков по прогонам бота.
// Граф и финалы — те же, что у story:endings (scripts/story/core/graph.mjs, run.mjs), переменные — индекс
// story:vars, поэтому числа сходятся с этими командами.
import { fileURLToPath } from 'node:url';
import { prepare, runOnce } from '../../../../scripts/story/core/run.mjs';
import { nodeGraph } from '../../../../scripts/story/core/graph.mjs';
import { varIndex } from '../../../../scripts/story/core/vars-index.mjs';
import { walk, resolveTarget } from '../../../../scripts/lib/ink.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';

export const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/branch-core.mjs --help

Общий модуль скилла story-branch: сам ничего не печатает, его используют
  branch-impact.mjs  — влияние каждой кнопки развилки на переменные, оси, финалы, чаты и объём;
  branch-budget.mjs  — дорогие ветки против бюджета и доля текста за прохождение;
  story-plan/scripts/plan-check.mjs и plan-compare.mjs — тот же счёт дорогих развилок (expensiveBudget),
                       поэтому на одной истории или скелете все три печатают одно число.
Определения (ключи — docs/playbook/thresholds.json):
  область кнопки   узлы, куда попадают только через эту кнопку (статический граф, как у story:endings)
  слияние          ближайший узел, достижимый из всех кнопок развилки; «шагов до слияния» — переходов до него
  дорогая кнопка   в области не меньше story.branch.expensive.msgs сообщений (на скелете — строк-сцен
                   story.branch.expensive.skeleton_lines), или свой финал, или свой контакт (#unlock)
  скелет           история с «// core: D-NN» в начале главного файла (story-plan, skeleton-format.md):
                   строка скелета — сцена, а не сообщение, поэтому порог объёма свой
  дорогая развилка хотя бы одна дорогая кнопка; бюджет — story.branch.budget.min…story.branch.budget.max на историю,
                   story.branch.budget.short — на историю короче story.branch.budget.short_msgs сообщений
  доля игроков     в скольких прогонах бота (персона random) кнопку нажали хотя бы раз`;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(HELP);
  process.exit(0);
}

const TEXT = new Set(['msg', 'me', 'sys']);
const TERMINAL = new Set(['END', 'DONE']);
const WRITE = /^(?:temp\s+)?([\p{L}\p{N}_]+)\s*(\+\+|--|[+\-*/]?=(?!=))/u;

export const T = thresholds();

/** Текст кнопки без тегов и скобок — для сверки с журналом бота. */
export const norm = (s) => String(s ?? '').replace(/#[^#]*/g, '').replace(/[[\]{}]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

function summarize(items, ids, knotId) {
  const out = { msgs: 0, writes: new Set(), targets: new Set(), contacts: new Set(), unlocks: new Set() };
  walk(items, (it) => {
    if (TEXT.has(it.type)) {
      out.msgs++;
      if (it.who) out.contacts.add(it.who);
      if (it.tags?.unlock) out.unlocks.add(it.tags.unlock);
    }
    if (it.type === 'choice' && it.tags?.to) out.contacts.add(it.tags.to);
    if (it.type === 'tags' && it.tags?.unlock) out.unlocks.add(it.tags.unlock);
    if (it.type === 'code') {
      const m = it.text.match(WRITE);
      if (m) out.writes.add(m[1]);
    }
    if (it.type === 'divert' && it.kind !== 'return') {
      const to = TERMINAL.has(it.target) ? it.target : resolveTarget(it.target, knotId, ids);
      if (to) out.targets.add(to);
    }
  });
  return out;
}

/** Группы соседних кнопок одного уровня — точки выбора. Кнопки #remind / #noanswer — служебные, не варианты. */
function choicePoints(knot) {
  const points = [];
  const visit = (list) => {
    let group = [];
    const flush = () => { if (group.length) points.push(group); group = []; };
    for (const it of list) {
      if (it.type === 'choice') {
        const service = it.tags && ('remind' in it.tags || 'noanswer' in it.tags);
        if (!service) group.push(it);
        visit(it.items);
      } else if (it.type === 'gather') {
        flush();
      } else if (it.type === 'cond') {
        for (const b of it.branches) visit(b.items);
      }
    }
    flush();
  };
  visit(knot.items);
  return points.filter((g) => g.length >= 2).sort((a, b) => a[0].line - b[0].line);
}

function reach(graph, starts) {
  const seen = new Map();
  const queue = [];
  for (const s of starts) if (!seen.has(s)) { seen.set(s, 0); queue.push(s); }
  while (queue.length) {
    const id = queue.shift();
    const n = graph.get(id);
    if (!n) continue;
    for (const t of [...n.exits, ...n.tunnels]) if (!TERMINAL.has(t) && !seen.has(t)) { seen.set(t, seen.get(id) + 1); queue.push(t); }
  }
  return seen;
}

/** Скелет плана (story-plan): «// core: D-NN» в первых строках главного файла; у готовой истории этой строки нет. */
export function isSkeleton(story) {
  const main = story.files?.[story.main] ?? Object.values(story.files ?? {})[0] ?? '';
  return /^\s*\/\/\s*core:\s*D-\d+/m.test(main.split('\n').slice(0, 12).join('\n'));
}

/** Сообщения узла (без функций) — объём области кнопки. */
function knotMsgs(knot) {
  let n = 0;
  walk(knot.items, (it) => { if (TEXT.has(it.type)) n++; });
  return n;
}

/**
 * Разбор истории: точки выбора с областью и влиянием каждой кнопки.
 * @param {string} ref история (id, папка, .json, .ink — в том числе skeleton.ink)
 * @param {{ runs?: number }} o runs — прогонов бота для долей игроков (0 — без бота)
 */
export function analyze(ref, o = {}) {
  const p = prepare(ref);
  const graph = nodeGraph(p.tree);
  const ids = new Set(p.tree.knots.map((k) => k.id));
  const byId = new Map(p.tree.knots.map((k) => [k.id, k]));
  const endingIds = new Set(p.endings.endings.map((e) => e.id));
  const idx = varIndex(p.tree);
  const finalVars = new Set(idx.vars.filter((v) => v.readByFinal).map((v) => v.name));
  const axes = String(p.tree.head?.['оси'] ?? '').split(/[,;]\s*/).map((s) => s.trim()).filter(Boolean);
  const msgs = new Map(p.tree.knots.map((k) => [k.id, knotMsgs(k)]));
  const totalMsgs = [...msgs.values()].reduce((a, b) => a + b, 0);
  const chapters = Math.max(1, ...p.tree.knots.map((k) => k.chapter ?? 1));
  const skeleton = isSkeleton(p.story);
  const minMsgs = T.value(skeleton ? 'story.branch.expensive.skeleton_lines' : 'story.branch.expensive.msgs');

  const points = [];
  for (const k of p.tree.knots) {
    for (const group of choicePoints(k)) {
      // продолжение после gather: переходы узла вне кнопок этой группы
      const inGroup = new Set();
      for (const c of group) walk(c.items, (it) => inGroup.add(it));
      const rest = new Set();
      walk(k.items, (it) => {
        if (it.type === 'divert' && it.kind !== 'return' && !inGroup.has(it)) {
          const to = TERMINAL.has(it.target) ? it.target : resolveTarget(it.target, k.id, ids);
          if (to) rest.add(to);
        }
      });
      const opts = group.map((c) => {
        const s = summarize(c.items, ids, k.id);
        if (c.tags?.to) s.contacts.add(c.tags.to);
        const starts = s.targets.size ? [...s.targets] : [...rest];
        return { choice: c, s, starts, reach: reach(graph, starts.filter((t) => !TERMINAL.has(t))), ends: starts.filter((t) => TERMINAL.has(t)) };
      });
      const merge = [...opts[0].reach.keys()].filter((id) => opts.every((o2) => o2.reach.has(id)));
      const options = opts.map((o1, i) => {
        const others = opts.filter((_, j) => j !== i);
        const own = [...o1.reach.keys()].filter((id) => !others.some((x) => x.reach.has(id)));
        const ownMsgs = own.reduce((a, id) => a + (msgs.get(id) ?? 0), 0) + o1.s.msgs;
        const writes = new Set(o1.s.writes);
        const contacts = new Set(o1.s.contacts);
        const unlocks = new Set(o1.s.unlocks);
        for (const id of own) {
          const ks = summarize(byId.get(id).items, ids, id);
          for (const w of ks.writes) writes.add(w);
          for (const c of ks.contacts) contacts.add(c);
          for (const u of ks.unlocks) unlocks.add(u);
        }
        const otherContacts = new Set(others.flatMap((x) => [...x.s.contacts, ...[...x.reach.keys()].filter((id) => !o1.reach.has(id)).flatMap((id) => [...summarize(byId.get(id).items, ids, id).contacts])]));
        const endings = [...o1.reach.keys()].filter((id) => endingIds.has(id));
        const ownEndings = own.filter((id) => endingIds.has(id));
        const hops = merge.length ? Math.min(...merge.map((m) => o1.reach.get(m))) + (o1.s.targets.size ? 1 : 0) : null;
        const ownContacts = [...contacts].filter((c) => !otherContacts.has(c));
        const expensive = ownMsgs >= minMsgs || ownEndings.length > 0 || [...unlocks].some((u) => !others.some((x) => x.s.unlocks.has(u)));
        const kind = expensive ? 'дорогая' : o1.s.targets.size ? 'ветка' : writes.size ? 'память' : 'окраска';
        return {
          text: c0(o1.choice), to: o1.choice.tags?.to ?? null, line: o1.choice.line, conds: o1.choice.conds ?? [],
          kind, expensive, own_msgs: ownMsgs, own_knots: own, hops,
          writes: [...writes], axes: [...writes].filter((w) => axes.includes(w)), final_vars: [...writes].filter((w) => finalVars.has(w)),
          endings, own_endings: ownEndings, contacts: [...contacts], own_contacts: ownContacts, unlocks: [...unlocks],
          ends_story: o1.ends.length > 0, share: null,
        };
      });
      const nearest = merge.length ? merge.reduce((a, b) => (sumDist(opts, b) < sumDist(opts, a) ? b : a)) : null;
      points.push({ knot: k.id, chapter: k.chapter ?? 1, line: group[0].line, file: k.file ?? null, merge: nearest, options, expensive: options.some((x) => x.expensive), shown: 0 });
    }
  }

  const runs = o.runs ?? 0;
  let seen = [];
  if (runs) {
    const byKnot = new Map();
    for (const pt of points) for (const op of pt.options) { if (!byKnot.has(pt.knot)) byKnot.set(pt.knot, []); byKnot.get(pt.knot).push({ pt, op, key: norm(op.text), hits: 0 }); }
    for (let seed = 1; seed <= runs; seed++) {
      const r = runOnce(p, { persona: 'random', seed });
      const lines = new Set();
      const picked = new Set();
      const shown = new Set();
      for (const e of r.timeline.items) if (e.type === 'line') lines.add(`${e.knot}|${e.text}`);
      for (const e of r.timeline.items) {
        if (e.type !== 'choice' || !byKnot.has(e.knot)) continue;
        const t = norm(e.text);
        for (const x of byKnot.get(e.knot)) {
          if (t && x.key && (t.startsWith(x.key) || x.key.startsWith(t))) { picked.add(x); shown.add(x.pt); }
        }
      }
      for (const x of picked) x.hits++;
      for (const pt of shown) pt.shown++;
      seen.push(lines.size);
    }
    for (const list of byKnot.values()) for (const x of list) x.op.share = x.hits / runs;
  }
  const seenShare = seen.length && totalMsgs ? seen.reduce((a, b) => a + b, 0) / seen.length / totalMsgs : null;
  return { p, id: p.story.id, path: p.story.path, minutes: p.story.meta?.minutes ?? null, chapters, totalMsgs, axes, finalVars: [...finalVars], endings: [...endingIds], points, runs, seenShare, skeleton, minMsgs };
}

function sumDist(opts, id) { return opts.reduce((a, o) => a + (o.reach.get(id) ?? 1e9), 0); }
function c0(choice) { return String(choice.text ?? '').trim() || `(${Object.keys(choice.tags ?? {}).map((t) => `#${t}`).join(' ') || 'без текста'})`; }

/** Бюджет дорогих развилок: история короче story.branch.budget.short_msgs сообщений — story.branch.budget.short, иначе min…max. */
export function budgetFor(totalMsgs) {
  if (totalMsgs < T.value('story.branch.budget.short_msgs')) return { min: T.value('story.branch.budget.short'), max: T.value('story.branch.budget.short'), short: true };
  return { min: T.value('story.branch.budget.min'), max: T.value('story.branch.budget.max'), short: false };
}

/**
 * Дорогие развилки против бюджета — единственный счёт для story-branch и story-plan.
 * @param {object} a результат analyze()
 */
export function spend(a) {
  const budget = budgetFor(a.totalMsgs);
  const list = a.points.filter((x) => x.expensive);
  const perChapter = {};
  for (const x of list) perChapter[x.chapter] = (perChapter[x.chapter] ?? 0) + 1;
  const used = list.length;
  return {
    used, budget, left: budget.max - used, per_chapter: perChapter, skeleton: a.skeleton,
    min_msgs: { key: a.skeleton ? 'story.branch.expensive.skeleton_lines' : 'story.branch.expensive.msgs', value: a.minMsgs },
    status: used > budget.max ? 'сверх' : used < budget.min ? 'мало' : 'в бюджете',
    list: list.map((x) => ({ knot: x.knot, chapter: x.chapter, line: x.line, merge: x.merge })),
  };
}

/** spend() по ссылке на историю или скелет, без бота: для plan-check и plan-compare. */
export const expensiveBudget = (ref) => spend(analyze(ref, { runs: 0 }));
