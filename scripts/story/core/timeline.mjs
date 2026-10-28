// Журнал бота → хронология, как её проживает игрок: чат, кто пишет, когда приходит строка в каждом режиме.
// Время — общая формула scripts/lib/playtime.mjs (та же, что у story:lint), от старта прохождения, без часов игрока.
import { parseTag } from '../../lib/ink.mjs';
import { playerClock } from '../../lib/playtime.mjs';
import { thresholds } from '../../lib/thresholds.mjs';
import { choiceTags } from './personas.mjs';

/**
 * @param {object[]} events журнал bot.play
 * @param {object} o
 * @param {object} o.tree дерево parseStory: главы узлов, контакты
 * @param {boolean} [o.away] персона уходит на длинных паузах (отвлечённый)
 * @returns {{ items: object[], totals: object, batches: object[] }}
 *   items: line / choice / remind / stall / var по порядку; у строк и кнопок tReal и tClick — секунды от старта.
 *   remind — напоминание неотвечающему (wait — тишина перед ним); choice.noAnswer — ветка «не ответил».
 */
export function timeline(events, { tree, away = false } = {}) {
  const T = thresholds();
  const keep = T.seconds('C-31.click_delay_max_s');
  const jumpAt = T.seconds('engine.click.time_jump_label');
  const awayAt = T.seconds('story.pause.session_s');
  const clock = playerClock(T);
  const chapterOf = new Map(tree.knots.map((k) => [k.id, k.chapter]));
  const names = Object.fromEntries(Object.entries(tree.contacts).map(([id, c]) => [id, c.name]));
  const items = [];
  const batches = [];
  let tReal = 0;
  let tClick = 0;
  let speaker = null;
  let lastThread = null;
  let chapter = null;
  const seen = new Set();
  let batch = null;
  let pendingUnlock = [];

  for (const e of events) {
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
      const tm = clock.line(e);
      if (!tm) { pendingUnlock.push(...unlock); continue; } // строка из одних тегов: пауза и открытия — следующей строке
      const { kind, delay, gap, typing } = tm;
      let thread;
      if (kind === 'in' || kind === 'photo') thread = speaker ?? 'unknown';
      else if (kind === 'me') thread = e.who || lastThread || speaker || 'unknown';
      else thread = (has('sys')?.value) || lastThread || speaker || 'unknown';
      const clickDelay = delay <= keep ? delay : 0;
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
      continue;
    }
    if (e.type === 'remind') {
      // игрок молчит у кнопок: в реальном времени это настоящее ожидание, по клику напоминаний нет
      tReal += e.seconds;
      items.push({ type: 'remind', n: e.n, wait: e.seconds, text: e.text, options: e.options.map((o) => o.text), knot: e.knot, chapter, tReal, tClick });
      continue;
    }
    if (e.type === 'stall') { items.push({ type: 'stall', reminders: e.reminders, reason: e.reason, knot: e.knot, chapter, tReal, tClick }); continue; }
    if (e.type === 'choice') {
      const options = e.options.map((o) => {
        const t = choiceTags(o);
        return { text: o.text, silent: 'silent' in t, to: t.to ?? null, label: t.label ?? null };
      });
      // «не ответил»: исходящего нет, как у #silent; ветка — кнопка #silent или скрытая #noanswer
      const na = e.noAnswer ?? null;
      if (na) tReal += na.seconds;
      const pick = na ? (options.find((o) => o.text === e.text && o.silent) ?? { text: e.text, silent: true, to: null }) : options[e.picked] ?? options[0];
      const thread = pick.to ?? lastThread ?? speaker ?? 'unknown';
      if (batch) { batch.returnAt = tReal; batch.span = tReal - batch.leftAt; batch = null; }
      items.push({ type: 'choice', options, picked: e.picked, text: pick.text, silent: na ? true : pick.silent, noAnswer: na, thread, name: names[thread] ?? thread, knot: e.knot, chapter, tReal, tClick });
      lastThread = thread;
      clock.choice(na ? true : pick.silent);
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
