// C-29. Износ формул и отменённый крючок: одинаковые возвраты и обрывы, анонс без содержания,
// возврат, который отменяет крючок («показалось»).
import { norm } from '../journal.mjs';
import { fmtDur, places, short } from '../text.mjs';

export default {
  id: 'C-29',
  title: 'Износ формул и отменённый крючок',
  plan: false,
  partial: true,
  run(ctx, find) {
    const { st, T } = ctx;
    const gap = T.value('story.pause.session_s');
    const nWords = T.value('C-29.opening_words');
    const after = T.value('C-29.after_lines');
    const opens = new Map(); // начало возврата → места
    const closes = new Map();
    const tease = places();
    const retract = places();
    const add = (m, key, place) => { if (!key) return; if (!m.has(key)) m.set(key, new Set()); m.get(key).add(place); };
    for (const run of ctx.runs) {
      run.lines.forEach((l, i) => {
        const chapterStart = l.isChapter;
        if ((l.delay < gap || i === 0) && !chapterStart) return;
        const prev = run.lines[i - 1];
        const place = `${l.knot}|${l.text}`;
        if (l.delay >= gap && i > 0) {
          add(opens, norm(l.text).split(' ').slice(0, nWords).join(' '), place);
          const last = norm(prev.text);
          add(closes, last, place);
          add(closes, `^${last.split(' ')[0]}`, place);
          if (T.re('dict.empty_tease').test(prev.text.toLowerCase())) tease.add(place, () => ({ knot: prev.knot, text: prev.text, delay: l.delay }));
        }
        const back = run.lines.slice(i, i + after).find((x) => T.re('dict.false_alarm').test(x.text.toLowerCase()));
        if (back) retract.add(place, () => ({ knot: back.knot, text: back.text }));
      });
    }
    for (const [key, ps] of opens) {
      if (key && ps.size > T.value('C-29.opening_repeat')) find('C-29.opening_repeat', { message: `возврат после паузы начинается одинаково ${ps.size} раз: «${key}…»` });
    }
    for (const [key, ps] of closes) {
      if (key && key !== '^' && ps.size > T.value('C-29.closing_repeat')) find('C-29.closing_repeat', { message: `перед паузой ${ps.size} раз одна и та же ${key.startsWith('^') ? `первая фраза «${key.slice(1)}…»` : `строка «${short(key)}»`} — формула обрыва износилась` });
    }
    for (const p of tease.values()) find('C-29.tease', { node: p.knot, chapter: st.chapterOf(p.knot), message: `пауза ${fmtDur(p.delay)} в ${p.knot}: анонс вместо события — «${short(p.text)}»` });
    for (const p of retract.values()) find('C-29.retract', { node: p.knot, chapter: st.chapterOf(p.knot), message: `возврат в ${p.knot} отменяет крючок — «${short(p.text)}»: обманная развязка` });
  },
};
