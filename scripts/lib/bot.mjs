// Бот-игрок: прохождение скомпилированной истории с журналом событий.
// Выбор кнопки — стратегия: случайная, первая, последняя, по сценарию; персоны story:trace подключаются так же.
// Правила молчания у кнопки — как в engine.ts (E-02): #remind — напоминание, #noanswer или #silent — ветка «не ответил».
import { Story } from 'inkjs/full';
import { parseDelay, parseTag } from './ink.mjs';
import { threshold } from './thresholds.mjs';

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

/** Стратегия вернула это вместо индекса: игрок молчит у кнопок, история идёт напоминаниями и веткой «не ответил». */
export const NO_ANSWER = -1;

/**
 * Стратегия выбора: (choices, ctx) → индекс в choices (не choice.index из ink) или NO_ANSWER.
 * choices — только кнопки: напоминания и скрытая ветка «не ответил» игроку не видны.
 * ctx: { rng, story, step, events, vars, knot, picks } — всё, что нужно персоне, чтобы решать по состоянию.
 */
export const strategies = {
  random: () => (choices, ctx) => Math.floor(ctx.rng() * choices.length),
  /**
   * Неотвечающий: не жмёт ничего. Персонаж напоминает (#remind), потом история идёт веткой «не ответил»
   * (#noanswer, иначе #silent той же развилки). Где вести некуда или режим «по клику», история стоит —
   * событие stall, дальше fallback (по умолчанию случайная).
   */
  unresponsive: (fallback = strategies.random()) => {
    const pick = () => NO_ANSWER;
    pick.fallback = fallback;
    return pick;
  },
  first: () => () => 0,
  last: () => (choices) => choices.length - 1,
  /**
   * По сценарию: номера (с нуля), NO_ANSWER («не ответил») или подстроки текста кнопок по порядку развилок.
   * Когда сценарий кончился или кнопки не нашлось — fallback (по умолчанию случайная).
   */
  scripted: (plan, fallback = strategies.random()) => {
    const pick = (choices, ctx) => {
      const want = plan[ctx.picks];
      if (want === undefined) return fallback(choices, ctx);
      if (typeof want === 'number') return want === NO_ANSWER || want < choices.length ? want : fallback(choices, ctx);
      const i = choices.findIndex((c) => c.text.includes(want));
      return i >= 0 ? i : fallback(choices, ctx);
    };
    // за маршрутом идёт персона: её запасной ход, когда молчать некуда, остаётся её
    pick.fallback = fallback.fallback;
    return pick;
  },
};

// Где inkjs вывел текст строки: контейнеры кусков текста за текущий Continue() до первого перевода строки.
// previousPointer после Continue() часто уже в следующем узле (inkjs заглядывает вперёд, нет ли склейки <>),
// а после последнего Continue() перед -> END пусты и он, и currentPathString. Счётчики посещений
// (VisitCountAtPathString) не говорят, какой из вошедших узлов вывел строку: распределитель без текста
// и финал входят за один Continue(). Поэтому смотрим на сам вывод.
let pieces = null;
// текст кнопок считается в режиме строки (inStringEvaluation, сюда не доходит), текст тегов — между
// BeginTag и EndTag: ни то, ни другое не реплика в чате
function notePiece(obj, pointer) {
  const cmd = obj?.constructor?.CommandType;
  if (cmd && obj.commandType === cmd.BeginTag) pieces.tag = true;
  else if (cmd && obj.commandType === cmd.EndTag) pieces.tag = false;
  else if (!pieces.tag && typeof obj?.value === 'string') {
    if (obj.value.includes('\n') && pieces.length) pieces.done = true;
    else if (obj.value.trim() && !pointer.isNull) pieces.push(pointer.container.path.toString());
  }
}
function trackOutput(story) {
  const proto = Object.getPrototypeOf(story.state);
  const orig = proto.PushToOutputStream;
  if (typeof orig !== 'function' || orig.tracked) return;
  const wrapped = function (obj) {
    if (pieces && !pieces.done && !this.inStringEvaluation) notePiece(obj, this.currentPointer);
    return orig.call(this, obj);
  };
  wrapped.tracked = true;
  proto.PushToOutputStream = wrapped;
}

const keysOf = (c) => new Set((c.tags ?? []).map((t) => parseTag(t).key));
const isSilentChoice = (c) => c.silent === true || keysOf(c).has('silent');

/** Роль варианта: кнопка, напоминание (#remind) или скрытая ветка «не ответил» (#noanswer без #silent). */
export function choiceRole(c) {
  const keys = keysOf(c);
  if (keys.has('remind')) return 'remind';
  if (keys.has('noanswer') && !keys.has('silent')) return 'noanswer';
  return 'button';
}

/**
 * Варианты развилки → кнопки, напоминания по порядку и ветка «не ответил».
 * target.seconds — сколько ждать после последнего напоминания (#noanswer:1h); null — столько же, сколько
 * перед последним напоминанием. via — откуда ветка: noanswer (скрытая) или silent (кнопка #silent).
 */
export function splitChoices(options) {
  const buttons = [];
  const reminders = [];
  let target = null;
  let silent = null;
  for (const c of options) {
    const tags = (c.tags ?? []).map(parseTag);
    const role = choiceRole(c);
    const na = tags.find((t) => t.key === 'noanswer');
    if (na && !target) target = { choice: c, seconds: na.value ? parseDelay(na.value) : null, via: 'noanswer' };
    if (role === 'remind') {
      const seconds = parseDelay(tags.find((t) => t.key === 'remind').value);
      if (seconds > 0) reminders.push({ choice: c, seconds });
    } else if (role === 'button') {
      buttons.push(c);
      if (!silent && isSilentChoice(c)) silent = c;
    }
  }
  if (!target && silent) target = { choice: silent, seconds: null, via: 'silent' };
  return { buttons, reminders, target };
}

/** Куда идёт история, если игрок не ответил: индекс ветки #noanswer или кнопки #silent в choices, −1 — «история стоит». */
export function noAnswer(choices) {
  const i = choices.findIndex((c) => keysOf(c).has('noanswer'));
  return i >= 0 ? i : choices.findIndex(isSilentChoice);
}

/**
 * Одно прохождение.
 * @param {string | object} json скомпилированная история (compile().json)
 * @param {object} [o]
 * @param {(choices, ctx) => number} [o.strategy] по умолчанию случайная; NO_ANSWER — игрок молчит
 * @param {'realtime' | 'click'} [o.mode] по клику напоминаний нет: молчание у кнопки — stall
 * @param {() => number} [o.rng] по умолчанию Math.random
 * @param {number} [o.maxSteps] предел строк (по умолчанию bot.max_lines): проверяется на развилках, как в check:story
 * @param {string[]} [o.nodes] id узлов (nodeIds): по ним считаются посещения и события «узел»
 * @param {boolean} [o.log] писать журнал событий (по умолчанию да)
 * @param {boolean} [o.trackVars] писать изменения переменных (по умолчанию как log)
 * @param {(story: Story) => void} [o.setup] до первой строки: переменные, переход в узел
 * @returns журнал и итоги. События: line / delay / choice / remind / stall / var / knot / end / stuck.
 *   remind — напоминание: { n, seconds (тишина перед ним), text, knot }; дальше его строки как line.
 *   choice с noAnswer: { via, seconds, reminders } и picked = NO_ANSWER — история пошла веткой «не ответил».
 *   stall — игрок молчит, а история стоит: { reminders, reason }; дальше fallback стратегии. reason: click — по клику
 *   кнопка ждёт; waits — у развилки нет ни напоминаний, ни срока #noanswer, кнопка ждёт по замыслу;
 *   no-target — напоминания были, а вести некуда (C-32 п. 6, ошибка).
 */
export function play(json, o = {}) {
  const story = new Story(json);
  trackOutput(story);
  const rng = o.rng ?? Math.random;
  const strategy = o.strategy ?? strategies.random();
  const maxSteps = o.maxSteps ?? threshold('bot.max_lines');
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
  let waited = 0;
  // молчание у одной развилки: сколько напоминаний уже было и интервал последнего
  let silence = null;
  const remindCap = threshold('story.reminders.max') + 1; // больше — петля sticky-напоминаний; C-32 уже видит превышение
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
      pieces = [];
      const text = story.Continue().trim();
      const at = pieces;
      pieces = null;
      const raw = story.currentTags ?? [];
      const tags = raw.map(parseTag);
      // узел строки — где выведен её текст; строка из одних тегов текста не выводит — тогда previousPointer
      const prev = story.state.previousPointer;
      const k = at.map(knotOf).find(Boolean)
        ?? knotOf(prev && !prev.isNull ? prev.path?.toString() : null) ?? knotOf(story.state.currentPathString);
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
    const { buttons: options, reminders, target } = splitChoices(story.currentChoices);
    // как в движке: без кнопок история кончилась, даже если остались скрытые варианты
    if (options.length === 0) { ended = true; emit({ type: 'end', step: steps, knot }); break; }
    // развилка — там, где стоят кнопки: узел без реплик (хаб) по строкам не увидеть
    const at = knotOf(options[0].sourcePath);
    if (at && at !== knot) { knot = at; emit({ type: 'knot', id: at, step: steps }); }
    const key = options.map((c) => c.sourcePath).join('|');
    if (silence && silence.key !== key) silence = null; // напоминание не вернуло к той же развилке
    const shown = options.map((c) => ({ text: c.text, tags: c.tags ?? [] }));
    let i = silence ? NO_ANSWER : strategy(options, ctx);
    if (i === NO_ANSWER) {
      silence ??= { key, n: 0, last: null };
      const live = o.mode !== 'click';
      if (live && reminders.length && silence.n < remindCap) {
        const r = reminders[0];
        silence.n++;
        silence.last = r.seconds;
        waited += r.seconds;
        emit({ type: 'remind', n: silence.n, seconds: r.seconds, text: r.choice.text, options: shown, knot, step: steps });
        story.ChooseChoiceIndex(r.choice.index);
        continue;
      }
      const wait = live && target ? target.seconds ?? silence.last : null;
      if (wait != null) {
        waited += wait;
        emit({ type: 'choice', options: shown, picked: NO_ANSWER, text: target.choice.text, noAnswer: { via: target.via, seconds: wait, reminders: silence.n }, knot, step: steps });
        choices.push(target.choice.text);
        picks++;
        silence = null;
        story.ChooseChoiceIndex(target.choice.index);
        continue;
      }
      emit({ type: 'stall', reminders: silence.n, reason: !live ? 'click' : silence.n ? 'no-target' : 'waits', knot, step: steps });
      silence = null;
      i = (strategy.fallback ?? strategies.random())(options, ctx);
    }
    silence = null;
    const pick = options[i] ?? options[0];
    emit({ type: 'choice', options: shown, picked: options.indexOf(pick), text: pick.text, knot, step: steps });
    choices.push(pick.text);
    picks++;
    story.ChooseChoiceIndex(pick.index);
  }
  if (!ended) emit({ type: 'stuck', step: steps, knot });

  const visited = nodes ? nodes.filter((id) => story.state.VisitCountAtPathString(id) > 0) : null;
  return { story, events, steps, delay, waited, ended, choices, visited, vars: trackVars ? { ...vars } : null };
}

const INCOMING = new Set(['msg', 'in', 'photo']);
const STOPS = new Set(['choice', 'stall', 'end', 'stuck']);

/**
 * Напоминания по развилкам (C-32 п. 6): журнал play() или хронология story:trace → серии
 * { knot, n, waits (с), texts (реплики каждого напоминания), repeats, next }.
 * repeats — реплики, которые дословно повторяют предыдущее напоминание или входящие перед развилкой
 * (петля напоминания вернулась не к кнопкам, а к вопросу). next — что было после последнего: «не ответил»,
 * «кнопка» (сработал fallback персоны), «стоит» (stall: вести некуда), end или stuck.
 */
export function reminderSeries(events) {
  const out = [];
  let cur = null;
  let said = [];
  for (const e of events) {
    if (e.type === 'line') {
      if (e.text && INCOMING.has(e.kind)) (cur ? cur.parts.at(-1) : said).push(e.text);
      continue;
    }
    if (e.type === 'remind') {
      cur ??= { knot: e.knot, chapter: e.chapter ?? null, waits: [], parts: [], before: said.slice(-3) };
      cur.waits.push(e.seconds ?? e.wait);
      cur.parts.push([]);
      continue;
    }
    if (!STOPS.has(e.type)) continue;
    if (cur) {
      const seen = new Set(cur.before);
      const repeats = new Set();
      for (const part of cur.parts) for (const t of part) { if (seen.has(t)) repeats.add(t); seen.add(t); }
      const next = e.type === 'choice' ? (e.noAnswer ? 'не ответил' : 'кнопка') : e.type === 'stall' ? 'стоит' : e.type;
      out.push({ knot: cur.knot, chapter: cur.chapter, n: cur.parts.length, waits: cur.waits, texts: cur.parts.map((p) => p.join(' / ')), repeats: [...repeats], next });
      cur = null;
    }
    said = [];
  }
  return out;
}
