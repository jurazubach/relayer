// C-27. Пауза без причины и срок возвращения (A-01): персонаж называет причину ухода, но не срок.
// Срок перед паузой — будильник в реальном времени и ложь в «по клику»: «утром» приходит через секунду.
import { fmtDur, places, returnDeadline, short } from '../text.mjs';

export default {
  id: 'C-27',
  title: 'Пауза без причины',
  plan: false,
  partial: true,
  run(ctx, find) {
    const { st, T } = ctx;
    const notice = T.value('story.pause.notice_min') * 60;
    const long = T.value('C-27.long_h') * 3600;
    const win = T.value('C-27.window_lines');
    const reason = T.re('dict.pause_reason');
    const midlist = T.re('dict.midlist');
    const all = places();
    for (const run of ctx.runs) {
      for (const l of run.lines) {
        if (l.delay < notice || l.i === 0) continue;
        const before = run.lines.slice(Math.max(0, l.i - win), l.i);
        const last = before.at(-1);
        const p = all.add(`${l.knot}|${l.text}`, () => ({ knot: last.knot, delay: l.delay, last: last.text, bare: 0, deadline: null, mid: 0 }));
        const why = before.some((x) => reason.test(x.text.toLowerCase()) || (x.kind === 'sys' && /не в сети/i.test(x.text)));
        if (!why) p.bare++;
        const d = before.find((x) => returnDeadline(x.text, T));
        if (d) p.deadline = d.text;
        if (midlist.test(last.text.trim())) p.mid++;
      }
    }
    for (const p of all.values()) {
      const at = { node: p.knot, chapter: st.chapterOf(p.knot) };
      if (p.bare * 2 > p.n) {
        const key = p.delay >= long ? 'C-27.long_h' : 'C-27.unexplained';
        find(key, { ...at, message: `пауза ${fmtDur(p.delay)} в ${p.knot} не объяснена: игрок решит, что история сломалась` });
      }
      if (p.deadline) find('C-27.deadline', { ...at, message: `${p.knot}: перед паузой ${fmtDur(p.delay)} персонаж называет срок «${short(p.deadline)}» — оставь причину, убери срок` });
      if (p.mid * 2 > p.n) find('C-27.midlist', { ...at, message: `${p.knot}: пауза ${fmtDur(p.delay)} посреди перечисления — «${short(p.last)}»` });
    }
  },
};
