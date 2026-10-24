// C-33. Объём сессии: заход между паузами ≥ 30 мин — сколько читать, сколько кнопок, чем кончается.
// Коридор — наша оценка по чужим жанрам, поэтому только подсказка.
import { isIncoming, median } from '../journal.mjs';
import { places, short } from '../text.mjs';

export default {
  id: 'C-33',
  title: 'Объём сессии',
  plan: false,
  partial: true,
  run(ctx, find) {
    const { st, T } = ctx;
    const gap = T.value('story.pause.session_s');
    const long = T.value('story.pause.long_s');
    const all = places();
    const chapterRead = new Map();
    for (const run of ctx.runs) {
      const lastChoice = run.choices.at(-1)?.at ?? 0;
      let cur = null;
      const close = () => {
        if (!cur || cur.start >= lastChoice) return;
        // место — узел и первая строка захода: в одном узле бывает несколько заходов
        const p = all.add(`${cur.knot}|${cur.first}`, () => ({ knot: cur.knot, active: [], msgs: [], buttons: [], last: cur.last, after: cur.after }));
        p.active.push(cur.active); p.msgs.push(cur.msgs); p.buttons.push(cur.buttons);
      };
      const reads = new Map();
      for (const item of run.seq) {
        if (item.type === 'choice') { if (cur) cur.buttons++; continue; }
        const l = item;
        if (!cur || l.delay >= gap) {
          close();
          cur = { knot: l.knot, first: l.text, start: l.i, active: 0, msgs: 0, buttons: 0, last: '', after: l.i > 0 && l.delay >= long };
        }
        const t = l.typing + l.gap + (l.delay < gap ? l.delay : 0);
        cur.active += t;
        if (isIncoming(l)) cur.msgs++;
        cur.last = l.text;
        reads.set(l.chapter, (reads.get(l.chapter) ?? 0) + l.typing + l.gap);
      }
      close();
      for (const [c, t] of reads) { if (!chapterRead.has(c)) chapterRead.set(c, []); chapterRead.get(c).push(t); }
    }
    for (const p of all.values()) {
      const a = median(p.active) / 60;
      const m = median(p.msgs);
      const b = median(p.buttons);
      const at = { node: p.knot, chapter: st.chapterOf(p.knot) };
      const msg = `заход у ${p.knot}: ${Math.round(a * 10) / 10} мин, ${m} сообщений, ${b} кнопок, кончается «${short(p.last, 30)}»`;
      if (a > T.value('C-33.active_max_min')) find('C-33.active_max_min', { ...at, message: msg });
      else if (b < T.value('C-33.min_buttons')) find('C-33.min_buttons', { ...at, message: msg });
      if (m > T.value('C-33.max_msgs')) find('C-33.max_msgs', { ...at, message: msg });
      if (p.after && (m < T.value('C-33.return_min_msgs') || b === 0)) find('C-33.return_min_msgs', { ...at, message: `возврат после долгой паузы у ${p.knot}: ${m} сообщений, ${b} кнопок — заход не окупает ожидание` });
    }
    for (const [c, ts] of chapterRead) {
      const t = median(ts) / 60;
      if (t > T.value('C-33.chapter_read_min')) find('C-33.chapter_read_min', { node: st.chapterStart.get(c) ?? null, chapter: c, message: `глава ${c}: ${Math.round(t)} мин чтения без пауз` });
    }
  },
};
