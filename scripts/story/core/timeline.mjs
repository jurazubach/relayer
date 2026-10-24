// Журнал бота → хронология, как её проживает игрок: чат, кто пишет, когда приходит строка в каждом режиме.
// Время считается по формулам engine.ts (набор и зазор) — от старта прохождения, без часов игрока.
import { parseTag } from '../../lib/ink.mjs';
import { choiceTags } from './personas.mjs';
import { threshold } from './thresholds.mjs';

/** engine.ts typingTime, в секундах. */
export function typingTime(kind, text) {
  if (kind === 'sys' || kind === 'me') return 0;
  if (kind === 'photo') return 2.6;
  return Math.min(5, Math.max(1.1, 0.6 + text.length * 0.05));
}

/** engine.ts gapTime, в секундах: «прочитал, подумал», детерминированно от текста. */
export function gapTime(kind, text, afterPlayer) {
  if (kind === 'sys') return 0.7;
  if (kind === 'me') return 0.9;
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  const jitter = 0.35 + (h % 600) / 1000;
  return afterPlayer ? jitter + 1.2 : jitter;
}

/**
 * @param {object[]} events журнал bot.play
 * @param {object} o
 * @param {object} o.tree дерево parseStory: главы узлов, контакты
 * @param {boolean} [o.away] персона уходит на длинных паузах (отвлечённый)
 * @returns {{ items: object[], totals: object, batches: object[] }}
 *   items: line / choice / var по порядку; у строк и кнопок tReal и tClick — секунды от старта.
 */
export function timeline(events, { tree, away = false } = {}) {
  const keep = threshold('click.keep_delay');
  const jumpAt = threshold('click.jump_label');
  const awayAt = threshold('trace.distracted_away');
  const chapterOf = new Map(tree.knots.map((k) => [k.id, k.chapter]));
  const names = Object.fromEntries(Object.entries(tree.contacts).map(([id, c]) => [id, c.name]));
  const items = [];
  const batches = [];
  let tReal = 0;
  let tClick = 0;
  let carry = 0;
  let speaker = null;
  let lastThread = null;
  let afterPlayer = false;
  let chapter = null;
  const seen = new Set();
  let batch = null;
  let pendingUnlock = [];

  for (const e of events) {
    if (e.type === 'delay') { carry += e.seconds; continue; }
    if (e.type === 'var') { items.push({ type: 'var', name: e.name, value: e.value, prev: e.prev, tReal, tClick, chapter }); continue; }
    if (e.type === 'line') {
      // глава — по узлу (knot.chapter из parseInk), как в checks.md: не по счёту тегов #chapter на пути
      chapter = chapterOf.get(e.knot) ?? chapter ?? 0;
      const tags = e.tags.map(parseTag);
      const has = (k) => tags.find((t) => t.key === k);
      const unlock = tags.filter((t) => t.key === 'unlock').map((t) => t.value);
      for (const t of tags) {
        if (t.key === 'rename') {
          const [id, ...name] = t.value.split(',');
          names[id.trim()] = name.join(',').trim();
        }
      }
      const isChapter = !!has('chapter');
      if (e.kind === 'msg' && has('from')) speaker = has('from').value || null;
      else if (e.kind === 'msg') speaker = e.who ?? speaker;
      if (!e.text) { pendingUnlock.push(...unlock); continue; } // строка из одних тегов: пауза и открытия — следующей строке
      const kind = e.kind === 'msg' ? (has('photo') ? 'photo' : 'in') : e.kind;
      let thread;
      if (kind === 'in' || kind === 'photo') thread = speaker ?? 'unknown';
      else if (kind === 'me') thread = e.who || lastThread || speaker || 'unknown';
      else thread = (has('sys')?.value) || lastThread || speaker || 'unknown';
      const delay = carry;
      carry = 0;
      const clickDelay = delay <= keep ? delay : 0;
      const gap = gapTime(kind, e.text, afterPlayer);
      const typing = typingTime(kind, e.text);
      // пачка отвлечённого: ушёл на длинной паузе, вернётся, когда очередь дойдёт до кнопки;
      // пока он не вернулся, следующие паузы — лишь новые уведомления в той же пачке
      if (away && delay >= awayAt && !batch) {
        batch = { leftAt: tReal, pause: delay, lines: 0, notices: 0, knot: e.knot, chapter };
        batches.push(batch);
      }
      tReal += delay + gap + typing;
      tClick += clickDelay + gap + typing;
      const who = kind === 'in' || kind === 'photo' ? speaker : e.who;
      const first = (kind === 'in' || kind === 'photo') && who && !seen.has(who);
      if (who && (kind === 'in' || kind === 'photo')) seen.add(who);
      const item = {
        type: 'line', text: e.text, kind, who, thread, name: names[thread] ?? thread, whoName: who ? names[who] ?? who : null,
        knot: e.knot, chapter, isChapter, delay, clickDelay, jump: delay >= jumpAt, gap, typing, tReal, tClick,
        unlock: [...pendingUnlock, ...unlock], newContact: first, tags: e.tags,
      };
      pendingUnlock = [];
      if (batch) { batch.lines++; if (delay > 0) batch.notices++; item.batch = batches.length - 1; }
      items.push(item);
      lastThread = thread;
      afterPlayer = false;
      continue;
    }
    if (e.type === 'choice') {
      const options = e.options.map((o) => {
        const t = choiceTags(o);
        return { text: o.text, silent: 'silent' in t, to: t.to ?? null, label: t.label ?? null };
      });
      const pick = options[e.picked] ?? options[0];
      const thread = pick.to ?? lastThread ?? speaker ?? 'unknown';
      if (batch) { batch.returnAt = tReal; batch.span = tReal - batch.leftAt; batch = null; }
      items.push({ type: 'choice', options, picked: e.picked, text: pick.text, silent: pick.silent, thread, name: names[thread] ?? thread, knot: e.knot, chapter, tReal, tClick });
      lastThread = thread;
      afterPlayer = !pick.silent;
      continue;
    }
    if (e.type === 'end' || e.type === 'stuck') items.push({ type: e.type, knot: e.knot, chapter, tReal, tClick });
  }
  if (batch) { batch.returnAt = tReal; batch.span = tReal - batch.leftAt; }
  const lines = items.filter((i) => i.type === 'line');
  const choices = items.filter((i) => i.type === 'choice');
  const lastChoice = choices.at(-1);
  const tail = lastChoice ? lines.filter((l) => items.indexOf(l) > items.indexOf(lastChoice)) : lines;
  const totals = {
    real: tReal,
    click: tClick,
    lines: lines.length,
    incoming: lines.filter((l) => l.kind === 'in' || l.kind === 'photo').length,
    choices: choices.length,
    maxPause: lines.reduce((m, l) => Math.max(m, l.delay), 0),
    maxPauseKnot: lines.reduce((m, l) => (l.delay > (m?.delay ?? 0) ? l : m), null)?.knot ?? null,
    tail: {
      lines: tail.length,
      incoming: tail.filter((l) => l.kind === 'in' || l.kind === 'photo').length,
      delay: tail.reduce((s, l) => s + l.delay, 0),
      senders: [...new Set(tail.filter((l) => l.who && (l.kind === 'in' || l.kind === 'photo')).map((l) => l.who))],
    },
  };
  return { items, totals, batches };
}

/** Секунды → «2 ч 05 мин», «12 мин», «40 с». */
export function fmtDuration(sec) {
  const s = Math.round(sec);
  if (s < 60) return `${s} с`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} мин`;
  const h = Math.floor(m / 60);
  if (h < 24 || m % 60) return `${h} ч${m % 60 ? ` ${String(m % 60).padStart(2, '0')} мин` : ''}`;
  return `${h} ч`;
}

/** Момент от старта без часов игрока: «день 2, +3 ч 10 мин» — день считается сутками от старта. */
export function fmtMoment(sec) {
  const day = Math.floor(sec / 86400) + 1;
  return `день ${day}, +${fmtDuration(sec - (day - 1) * 86400)}`;
}
