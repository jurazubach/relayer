// C-26. Пауза без крючка: перед долгой паузой нет открытого вопроса — игроку незачем возвращаться.
import { isIncoming } from '../journal.mjs';
import { firstLines, fmtDur, hookIn, isClosing, pct, places, short } from '../text.mjs';

export default {
  id: 'C-26',
  title: 'Пауза без крючка',
  plan: false,
  partial: true,
  run(ctx, find) {
    const { st, T } = ctx;
    const long = T.value('story.pause.long_s');
    const win = T.value('C-26.window_lines');
    const all = places();
    for (const run of ctx.runs) {
      const firstOf = firstLines(run);
      for (const l of run.lines) {
        if (l.delay < long || l.i === 0) continue;
        const before = run.lines.slice(Math.max(0, l.i - win), l.i);
        // прощание — последняя входящая реплика: по стилю (ST-60) за ней почти всегда «… не в сети» #sys
        const last = before.findLast(isIncoming) ?? before.at(-1);
        // место — узел и строка после паузы (checks.md C-26)
        const p = all.add(`${l.knot}|${l.text}`, () => ({ knot: last.knot, after: l.text, last: last.text, delay: l.delay, noHook: 0, closing: 0 }));
        const hook = hookIn(before, firstOf, T);
        if (!hook) p.noHook++;
        if (!hook && isClosing(last.text, T)) p.closing++;
      }
    }
    const list = all.values();
    if (!list.length) return;
    // место без крючка, если его нет на большинстве путей через эту паузу
    const bare = list.filter((p) => p.noHook * 2 > p.n);
    for (const p of list.filter((x) => x.closing * 2 > x.n)) {
      find('C-26.closing', { node: p.knot, chapter: st.chapterOf(p.knot), message: `пауза ${fmtDur(p.delay)} в ${p.knot} после «${short(p.last)}»: перед ней нет открытого вопроса` });
    }
    const share = bare.length / list.length;
    if (share > T.value('C-26.share')) {
      const ex = bare.slice(0, 3).map((p) => `${p.knot}: «${short(p.last, 30)}» → ${fmtDur(p.delay)}`).join('; ');
      find('C-26.share', { message: `${pct(share)} долгих пауз начинаются без крючка (${bare.length} из ${list.length}; ${ex})`, data: { share, bare: bare.length, total: list.length } });
    }
  },
};
