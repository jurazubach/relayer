// Бот-игрок: прохождение скомпилированной истории с журналом событий.
// Выбор кнопки — стратегия: случайная, первая, последняя, по сценарию; персоны story:trace подключаются так же.
import { Story } from 'inkjs/full';
import { parseDelay, parseTag } from './ink.mjs';

/** Детерминированный генератор (mulberry32): одинаковый seed — одинаковые прохождения. */
export function seeded(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Стратегия выбора: (choices, ctx) → индекс в choices (не choice.index из ink).
 * ctx: { rng, story, step, events, vars, knot, picks } — всё, что нужно персоне, чтобы решать по состоянию.
 */
export const strategies = {
  random: () => (choices, ctx) => Math.floor(ctx.rng() * choices.length),
  first: () => () => 0,
  last: () => (choices) => choices.length - 1,
  /**
   * По сценарию: номера (с нуля) или подстроки текста кнопок по порядку развилок.
   * Когда сценарий кончился или кнопки не нашлось — fallback (по умолчанию случайная).
   */
  scripted: (plan, fallback = strategies.random()) => (choices, ctx) => {
    const want = plan[ctx.picks];
    if (want === undefined) return fallback(choices, ctx);
    if (typeof want === 'number') return want < choices.length ? want : fallback(choices, ctx);
    const i = choices.findIndex((c) => c.text.includes(want));
    return i >= 0 ? i : fallback(choices, ctx);
  },
};

/**
 * Одно прохождение.
 * @param {string | object} json скомпилированная история (compile().json)
 * @param {object} [o]
 * @param {(choices, ctx) => number} [o.strategy] по умолчанию случайная
 * @param {() => number} [o.rng] по умолчанию Math.random
 * @param {number} [o.maxSteps] предел строк: проверяется на развилках, как в check:story
 * @param {string[]} [o.nodes] id узлов (nodeIds): по ним считаются посещения и события «узел»
 * @param {boolean} [o.log] писать журнал событий (по умолчанию да)
 * @param {boolean} [o.trackVars] писать изменения переменных (по умолчанию как log)
 * @param {(story: Story) => void} [o.setup] до первой строки: переменные, переход в узел
 * @returns журнал и итоги. События: line / delay / choice / var / knot / end / stuck.
 */
export function play(json, o = {}) {
  const story = new Story(json);
  const rng = o.rng ?? Math.random;
  const strategy = o.strategy ?? strategies.random();
  const maxSteps = o.maxSteps ?? 2000;
  const log = o.log ?? true;
  const trackVars = o.trackVars ?? log;
  const nodes = o.nodes ?? null;
  const nodeSet = nodes ? new Set(nodes) : null;
  const events = [];
  const emit = (e) => { if (log) events.push(e); };
  const vars = {};

  if (o.setup) o.setup(story);
  if (trackVars) {
    for (const name of story.variablesState._globalVariables.keys()) {
      vars[name] = story.variablesState.$(name);
      story.ObserveVariable(name, (n, value) => {
        emit({ type: 'var', name: n, value, prev: vars[n], step: steps });
        vars[n] = value;
      });
    }
  }

  let steps = 0;
  let delay = 0;
  let speaker = null;
  let knot = null;
  let picks = 0;
  const choices = [];
  const knotOf = (path) => {
    if (!path) return null;
    const parts = path.split('.');
    if (!nodeSet) return parts[0];
    const two = parts.slice(0, 2).join('.');
    return nodeSet.has(two) ? two : nodeSet.has(parts[0]) ? parts[0] : null;
  };
  const ctx = { rng, story, events, vars, get step() { return steps; }, get knot() { return knot; }, get picks() { return picks; } };

  let ended = false;
  while (steps < maxSteps) {
    while (story.canContinue) {
      const text = story.Continue().trim();
      const raw = story.currentTags ?? [];
      const tags = raw.map(parseTag);
      // после Continue currentPathString часто пуст (ждём выбора) — где была строка, помнит previousPointer
      const prev = story.state.previousPointer;
      const k = knotOf(prev && !prev.isNull ? prev.path?.toString() : null) ?? knotOf(story.state.currentPathString);
      if (k && k !== knot) { knot = k; emit({ type: 'knot', id: k, step: steps }); }
      let lineDelay = 0;
      let who = speaker;
      let kind = 'msg';
      for (const t of tags) {
        if (t.key === 'delay') lineDelay += parseDelay(t.value);
        else if (t.key === 'from') speaker = who = t.value || null;
        else if (t.key === 'me') { kind = 'me'; who = t.value || null; }
        else if (t.key === 'sys') { kind = 'sys'; who = t.value || speaker; }
      }
      if (lineDelay) { delay += lineDelay; emit({ type: 'delay', seconds: lineDelay, step: steps }); }
      emit({ type: 'line', text, kind, who, tags: raw, knot, step: steps });
      steps++;
    }
    const options = story.currentChoices;
    if (options.length === 0) { ended = true; emit({ type: 'end', step: steps, knot }); break; }
    const i = strategy(options, ctx);
    const pick = options[i] ?? options[0];
    emit({ type: 'choice', options: options.map((c) => ({ text: c.text, tags: c.tags ?? [] })), picked: options.indexOf(pick), text: pick.text, knot, step: steps });
    choices.push(pick.text);
    picks++;
    story.ChooseChoiceIndex(pick.index);
  }
  if (!ended) emit({ type: 'stuck', step: steps, knot });

  const visited = nodes ? nodes.filter((id) => story.state.VisitCountAtPathString(id) > 0) : null;
  return { story, events, steps, delay, ended, choices, visited, vars: trackVars ? { ...vars } : null };
}
