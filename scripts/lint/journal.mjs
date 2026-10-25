// Журнал бота для проверок (checks.md «Журнал бота»): строки и точки выбора по порядку, как их видит игрок.
// Правила повторяют engine.ts: строка без текста отдаёт #delay и #unlock следующей; время игрока — общая
// формула scripts/lib/playtime.mjs (та же, что у story:trace и story:sessions).
import { play, seeded, strategies } from '../lib/bot.mjs';
import { parseTag } from '../lib/ink.mjs';
import { playerClock } from '../lib/playtime.mjs';

export { norm } from '../lib/lexicon.mjs';

const tagMap = (raw) => {
  const out = {};
  for (const t of raw) { const { key, value } = parseTag(t); out[key] = value; }
  return out;
};

/**
 * Одно прохождение → { seq, lines, choices, ended, delay, knots }.
 * Строка: { type:'line', i, knot, chapter, text, kind: in|me|sys|photo, who, delay, unlock[], isChapter, typing, gap, tags }.
 * Выбор:  { type:'choice', knot, chapter, n, texts, tos, silent[], picked, key }.
 * vars — изменения переменных { name, value, at } (at — число строк к этому моменту), если бот их писал.
 */
export function toJournal(events, st, T) {
  const seq = [];
  const lines = [];
  const choices = [];
  const knots = [];
  const clock = playerClock(T);
  let carryUnlock = [];
  let lastKnot = null;
  const vars = [];
  for (const e of events) {
    if (e.type === 'knot') { knots.push(e.id); lastKnot = e.id; continue; }
    if (e.type === 'var') { vars.push({ name: e.name, value: e.value, at: lines.length, knot: lastKnot }); continue; }
    if (e.type === 'line') {
      const tags = tagMap(e.tags);
      const unlock = [...carryUnlock, ...('unlock' in tags ? [tags.unlock] : [])];
      const tm = clock.line(e);
      if (!tm) { carryUnlock = unlock; continue; }
      carryUnlock = [];
      const { kind, delay, typing, gap } = tm;
      const knot = e.knot ?? lastKnot;
      const line = {
        type: 'line', i: lines.length, knot, chapter: st.chapterOf(knot) ?? 1, text: e.text, kind,
        who: e.who ?? null, delay, unlock, isChapter: 'chapter' in tags, typing, gap, tags,
      };
      lines.push(line);
      seq.push(line);
    } else if (e.type === 'choice') {
      const opts = e.options.map((o) => ({ text: o.text, tags: tagMap(o.tags) }));
      const knot = e.knot ?? lastKnot;
      const ch = {
        type: 'choice', i: choices.length, at: lines.length, knot, chapter: st.chapterOf(knot) ?? 1, n: opts.length,
        texts: opts.map((o) => o.text), tos: opts.map((o) => o.tags.to ?? null), silent: opts.map((o) => 'silent' in o.tags),
        labels: opts.map((o) => o.tags.label ?? null),
        picked: e.picked, key: `${knot}|${opts.map((o) => o.text).join('|')}`,
      };
      choices.push(ch);
      seq.push(ch);
      clock.choice(ch.silent[e.picked]);
    }
  }
  const ended = events.some((e) => e.type === 'end');
  const delay = lines.reduce((s, l) => s + l.delay, 0);
  return { seq, lines, choices, ended, delay, knots, vars };
}

/**
 * N прогонов бота с seed: одинаковый seed — одинаковые находки (нужно story:diff).
 * trackVars — писать изменения переменных (C-15, C-52, C-54); strategy — персона вместо случайной.
 */
export function runBot(json, st, T, { runs, seed = 1, trackVars = false, strategy } = {}) {
  const rng = seeded(seed);
  const nodes = [...st.ids];
  const out = [];
  for (let r = 0; r < runs; r++) {
    const res = play(json, { rng, nodes, maxSteps: T.value('lint.max_steps'), trackVars, log: true, strategy });
    // узлы без реплик (распределители, развилки из одних условий) журнал по строкам не видит — берём счётчик inkjs
    // счётчик посещений inkjs: возврат из туннеля — не новое посещение (петли C-52)
    const visits = new Map((res.visited ?? []).map((id) => [id, res.story.state.VisitCountAtPathString(id)]));
    out.push({ ...toJournal(res.events, st, T), visited: res.visited, visits });
  }
  return out;
}

/**
 * Персона «тянется к позиции» (C-16): с вероятностью bias жмёт первую или последнюю кнопку, иначе случайную.
 * В узлах random (финальная дилемма) — всегда случайную.
 */
export function positionPersona(side, bias, random = new Set()) {
  const pick = side === 'first' ? strategies.first() : strategies.last();
  const rand = strategies.random();
  return (choices, ctx) => (!random.has(ctx.knot) && ctx.rng() < bias ? pick(choices, ctx) : rand(choices, ctx));
}

/** Медиана массива чисел — как в check:story (элемент посередине отсортированного списка). */
export const median = (arr) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

export const isIncoming = (l) => l.kind === 'in' || l.kind === 'photo';

/** Доля прогонов, прошедших через каждый узел. */
export function visitShare(runs) {
  const n = new Map();
  for (const r of runs) for (const k of new Set([...r.knots, ...(r.visited ?? [])])) n.set(k, (n.get(k) ?? 0) + 1);
  return new Map([...n].map(([k, v]) => [k, v / (runs.length || 1)]));
}

/**
 * Узел, в который прогон ушёл после точки выбора: первая строка другого узла до следующей точки выбора.
 * Текст самой кнопки и реплики под ней ещё идут в узле развилки.
 */
export function knotAfter(run, c) {
  const end = run.choices[c.i + 1]?.at ?? run.lines.length;
  for (let i = c.at; i < end; i++) if (run.lines[i].knot !== c.knot) return run.lines[i].knot;
  return run.choices[c.i + 1]?.knot ?? c.knot;
}
