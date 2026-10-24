// Подготовка истории и прохождения для команд story:*: загрузка, компиляция, персона, хронология, финал.
import { readFileSync } from 'node:fs';
import { compile, formatMessages } from '../../lib/compile.mjs';
import { findEndings, nodeIds, walk } from '../../lib/ink.mjs';
import { finalNodes } from './graph.mjs';
import { play, seeded, strategies } from '../../lib/bot.mjs';
import { compileInput, loadStory, parseStory } from '../../lib/story.mjs';
import { PERSONAS, noAnswer } from './personas.mjs';
import { timeline } from './timeline.mjs';
import { threshold } from './thresholds.mjs';

export const BETA_STOP = 'beta_stop';

/** Загруженная и собранная история; ошибка компиляции — исключение с понятным текстом. */
export function prepare(ref) {
  const story = loadStory(ref);
  const built = compile(compileInput(story));
  if (!built.ok) throw new Error(`${story.path}: ошибка компиляции\n${formatMessages(built.errors)}`);
  const tree = parseStory(story);
  const nodes = nodeIds(tree);
  return { story, built, tree, nodes, endings: endingIndex(tree) };
}

/**
 * Финалы и как узнать, в какой попал прогон. Если в одном узле несколько меток `// финал:` (финалы
 * различаются состоянием), метку определяет первая реплика после неё: прогон её напечатал — это его финал.
 */
export function endingIndex(tree) {
  const found = findEndings(tree);
  if (found.source === 'end') {
    // без меток одного «-> END» мало: в «Слепом пятне» все исходы сходятся в общий эпилог с END.
    // Финал прогона — первый финальный узел (checks.md), в который он вошёл; общий хвост, куда
    // попадают только из других финальных узлов, финалом не считается.
    const { final, graph } = finalNodes(tree);
    const preds = new Map();
    for (const [id, n] of graph) for (const t of n.exits) { if (!preds.has(t)) preds.set(t, new Set()); preds.get(t).add(id); }
    const entry = [...final].filter((id) => [...(preds.get(id) ?? [])].some((p) => !final.has(p)));
    const known = new Set(found.endings.map((e) => e.id));
    for (const id of entry) {
      if (known.has(id)) continue;
      const k = tree.knots.find((x) => x.id === id);
      found.endings.push({ id, name: id, line: k.line, ...(k.file ? { file: k.file } : {}) });
    }
    const tails = found.endings.filter((e) => final.has(e.id) && !entry.includes(e.id)).map((e) => e.id);
    found.endings = found.endings.filter((e) => !tails.includes(e.id));
    found.tails = tails;
  }
  const byNode = new Map();
  for (const k of tree.knots) {
    const marks = found.endings.filter((e) => e.id === k.id);
    if (!marks.length) continue;
    const sigs = [];
    if (marks.length > 1) {
      let open = null;
      walk(k.items, (it) => {
        if (it.type === 'comment' && it.mark?.kind === 'финал') open = it.mark.value || k.id;
        else if (open && ['msg', 'me', 'sys'].includes(it.type)) {
          const text = it.text.split('{')[0].trim();
          if (text) sigs.push({ name: open, text });
          open = null;
        }
      });
    }
    byNode.set(k.id, { marks, sigs });
  }
  return { ...found, byNode };
}

/** Имя финала прогона по его хронологии. */
export function endingOf(items, idx, { partial = false, visited = null } = {}) {
  const lines = items.filter((i) => i.type === 'line');
  const last = items.at(-1);
  const seenKnots = new Set(items.map((i) => i.knot));
  // bot.mjs не видит узел последней строки перед END (previousPointer уже пуст) — такой узел
  // знают только счётчики посещений; он последний на пути, потому что после него конец
  const late = (visited ?? []).filter((id) => !seenKnots.has(id) && (idx.byNode.has(id) || id === BETA_STOP));
  if (partial && (seenKnots.has(BETA_STOP) || late.includes(BETA_STOP))) return { name: `(${BETA_STOP})`, node: BETA_STOP, kind: 'partial' };
  if (last?.type === 'stuck') return { name: '(не дошёл)', node: last.knot, kind: 'stuck' };
  let node = null;
  for (const i of items) {
    if (!i.knot || !idx.byNode.has(i.knot)) continue;
    node = i.knot;
    if (idx.source === 'end') break; // первый вход в финальную часть, а не общий хвост
  }
  if (late.length && last?.type === 'end' && !(idx.source === 'end' && node)) node = late.at(-1);
  if (!node) return { name: `(без метки: ${last?.knot ?? '—'})`, node: last?.knot ?? null, kind: 'unmarked' };
  const { marks, sigs } = idx.byNode.get(node);
  if (marks.length === 1 || !sigs.length) return { name: marks[0].name, node, kind: idx.source };
  const printed = lines.filter((l) => l.knot === node || late.includes(node)).map((l) => l.text);
  let name = marks[0].name;
  for (const s of sigs) if (printed.some((t) => t.startsWith(s.text))) name = s.name;
  return { name, node, kind: idx.source };
}

/** Значение для --set: число, true/false, строка в кавычках или без. */
export function parseValue(raw) {
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  if (raw === 'true' || raw === 'false') return raw === 'true';
  return raw.replace(/^["']|["']$/g, '');
}

/** Состояние из файла: сохранение движка (relay:<id>), выгрузка localStorage целиком или --json story:trace (маршрут). */
export function readSave(file, storyId) {
  let data = JSON.parse(readFileSync(file, 'utf8'));
  const key = `relay:${storyId}`;
  if (data && typeof data === 'object' && key in data) data = data[key];
  if (typeof data === 'string') data = JSON.parse(data);
  if (data?.storyState) return { state: data.storyState, storyId: data.storyId ?? null };
  const run = data?.runs?.[0] ?? data?.stories?.[0]?.runs?.[0] ?? data;
  if (Array.isArray(run?.route)) return { route: run.route, start: run.start ?? null, set: run.set ?? null };
  throw new Error(`${file}: не похоже ни на сохранение (нет storyState), ни на вывод story:trace (нет route)`);
}

/**
 * Одно прохождение персоной.
 * @param {ReturnType<typeof prepare>} p
 * @param {object} o persona, seed, mode, start, set, save, route, partial
 */
export function runOnce(p, o = {}) {
  const persona = PERSONAS[o.persona ?? 'random'];
  const rng = seeded(o.seed ?? 1);
  let strategy = persona.make(rng);
  const route = o.route ?? o.save?.route ?? null;
  if (route) strategy = strategies.scripted(route, strategy);
  const start = o.start ?? o.save?.start ?? null;
  const set = { ...(o.save?.set ?? {}), ...(o.set ?? {}) };
  const setup = (story) => {
    if (o.save?.state) story.state.LoadJson(o.save.state);
    if (start) {
      if (!p.nodes.includes(start)) throw new Error(`нет узла «${start}» (--start)`);
      story.ChoosePathString(start);
    }
    for (const [name, value] of Object.entries(set)) {
      if (!story.variablesState._globalVariables.has(name)) throw new Error(`нет переменной «${name}» (--set)`);
      story.variablesState[name] = value;
    }
  };
  const r = play(p.built.json, { strategy, rng, nodes: p.nodes, maxSteps: threshold('bot.max_lines'), setup });
  const t = timeline(r.events, { tree: p.tree, away: !!persona.away });
  const ending = endingOf(t.items, p.endings, { partial: o.partial, visited: r.visited });
  const route_ = r.events.filter((e) => e.type === 'choice').map((e) => e.picked);
  const initial = { ...r.vars };
  for (const e of [...r.events].reverse()) if (e.type === 'var') initial[e.name] = e.prev;
  const stalls = persona.noAnswer
    ? t.items.filter((i) => i.type === 'choice' && noAnswer(i.options) < 0).map((i) => ({ knot: i.knot, chapter: i.chapter, options: i.options.length }))
    : [];
  return {
    persona: o.persona ?? 'random', seed: o.seed ?? 1, mode: o.mode ?? 'realtime',
    start, set: Object.keys(set).length ? set : null, route: route_,
    ended: r.ended, steps: r.steps, ending, initial, vars: r.vars, visited: r.visited,
    timeline: t, stalls,
  };
}
