// Журнал бота для проверок (checks.md «Журнал бота»): строки и точки выбора по порядку, как их видит игрок.
// Правила повторяют engine.ts: строка без текста отдаёт #delay и #unlock следующей; время игрока — пауза,
// зазор и набор по формуле движка (константы — engine.typing в thresholds.json).
import { play, seeded } from '../lib/bot.mjs';
import { parseDelay, parseTag } from '../lib/ink.mjs';

const tagMap = (raw) => {
  const out = {};
  for (const t of raw) { const { key, value } = parseTag(t); out[key] = value; }
  return out;
};

/** Набор и зазор перед строкой — как typingTime и gapTime в engine.ts, в секундах. */
export function lineTime(kind, text, afterPlayer, T) {
  const c = T.value('engine.typing');
  let typing = 0;
  if (kind === 'photo') typing = c.photo_s;
  else if (kind === 'in') typing = Math.min(c.max_s, Math.max(c.min_s, c.base_s + text.length * c.per_char_s));
  let gap;
  if (kind === 'sys') gap = c.gap_sys_s;
  else if (kind === 'me') gap = c.gap_me_s;
  else {
    let h = 0;
    for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
    const ms = Math.round(c.gap_spread_s * 1000);
    gap = c.gap_min_s + (h % ms) / 1000 + (afterPlayer ? c.after_player_s : 0);
  }
  return { typing, gap };
}

/**
 * Одно прохождение → { seq, lines, choices, ended, delay, knots }.
 * Строка: { type:'line', i, knot, chapter, text, kind: in|me|sys|photo, who, delay, unlock[], isChapter, typing, gap, tags }.
 * Выбор:  { type:'choice', knot, chapter, n, texts, tos, silent[], picked, key }.
 */
export function toJournal(events, st, T) {
  const seq = [];
  const lines = [];
  const choices = [];
  const knots = [];
  let carry = 0;
  let carryUnlock = [];
  let afterPlayer = false;
  let lastKnot = null;
  for (const e of events) {
    if (e.type === 'knot') { knots.push(e.id); lastKnot = e.id; continue; }
    if (e.type === 'line') {
      const tags = tagMap(e.tags);
      const delay = (tags.delay != null ? parseDelay(tags.delay) : 0) + carry;
      const unlock = [...carryUnlock, ...('unlock' in tags ? [tags.unlock] : [])];
      if (!e.text) { carry = delay; carryUnlock = unlock; continue; }
      carry = 0;
      carryUnlock = [];
      const kind = e.kind === 'me' ? 'me' : e.kind === 'sys' ? 'sys' : 'photo' in tags ? 'photo' : 'in';
      let knot = e.knot ?? lastKnot;
      // последняя строка перед -> END приходит от бота с узлом предыдущей строки: у inkjs после конца
      // истории нет ни previousPointer, ни пути. Узел такой строки узнаём по её тексту в исходнике.
      const cand = st.textKnots?.get(e.text);
      if (cand && !cand.has(knot)) {
        const pick = cand.size === 1 ? [...cand][0] : [...cand].find((k) => (st.edges.get(knot) ?? []).some((x) => x.to === k));
        if (pick) {
          knot = pick;
          if (knots.at(-1) !== pick) knots.push(pick);
          lastKnot = pick;
        }
      }
      const { typing, gap } = lineTime(kind, e.text, afterPlayer, T);
      afterPlayer = false;
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
        picked: e.picked, key: `${knot}|${opts.map((o) => o.text).join('|')}`,
      };
      choices.push(ch);
      seq.push(ch);
      afterPlayer = true;
    }
  }
  const ended = events.some((e) => e.type === 'end');
  const delay = lines.reduce((s, l) => s + l.delay, 0);
  return { seq, lines, choices, ended, delay, knots };
}

/** N прогонов случайного бота с seed: одинаковый seed — одинаковые находки (нужно story:diff). */
export function runBot(json, st, T, { runs, seed = 1 }) {
  const rng = seeded(seed);
  const nodes = [...st.ids];
  const out = [];
  for (let r = 0; r < runs; r++) {
    const res = play(json, { rng, nodes, maxSteps: T.value('lint.max_steps'), trackVars: false });
    out.push(toJournal(res.events, st, T));
  }
  return out;
}

/** Медиана массива чисел — как в check:story (элемент посередине отсортированного списка). */
export const median = (arr) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

/** Нормализованная строка для словарей: нижний регистр, без пунктуации и эмодзи. */
export const norm = (text) => String(text).toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim();

export const isIncoming = (l) => l.kind === 'in' || l.kind === 'photo';
