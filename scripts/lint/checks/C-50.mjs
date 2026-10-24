// C-50. Адресат и шум: ответ ушёл в чат, где долго тихо; вопрос перебивает контакт, которому нельзя ответить.
import { isIncoming } from '../journal.mjs';
import { places } from '../text.mjs';

export default {
  id: 'C-50',
  title: 'Адресат и шум',
  plan: false,
  partial: true,
  run(ctx, find) {
    const { st, T } = ctx;
    const answerable = new Set(st.buttons.list.map((b) => b.to).filter(Boolean));
    const gap = places();
    const noise = places();
    for (const run of ctx.runs) {
      for (const c of run.choices) {
        const to = c.tos[c.picked];
        if (!to || c.silent[c.picked] || ctx.service.has(to)) continue;
        const next = run.choices[c.i + 1]?.at ?? run.lines.length;
        const after = run.lines.slice(c.at, next).filter(isIncoming);
        if (!after.length || after[0].who === to) continue;
        const reply = after.findIndex((l) => l.who === to);
        const n = reply < 0 ? after.length : reply;
        if (n > T.value('C-50.gap')) gap.add(`${c.key}|${c.picked}`, () => ({ knot: c.knot, chapter: c.chapter, to, other: after[0].who, n }));
      }
      // вопрос и кнопка ответа, между ними — контакт, которому нет ни одной кнопки
      for (const c of run.choices) {
        const before = run.lines.slice(0, c.at);
        const q = before.map((l, i) => [l, i]).reverse().find(([l]) => isIncoming(l) && l.text.includes('?'));
        if (!q) continue;
        const mid = before.slice(q[1] + 1).filter((l) => isIncoming(l) && l.who && l.who !== q[0].who && !answerable.has(l.who) && !ctx.service.has(l.who));
        if (mid.length) noise.add(`${c.key}`, () => ({ knot: c.knot, chapter: c.chapter, who: mid[0].who }));
      }
    }
    for (const p of gap.values()) find('C-50.gap', { node: p.knot, chapter: p.chapter, message: `ответ в ${p.to} ушёл в пустоту: следующая реплика — в ${p.other}, ${p.to} молчит ещё ${p.n} сообщений` });
    for (const p of noise.values()) find('C-50.interrupt', { node: p.knot, chapter: p.chapter, message: `сообщение ${p.who} перебивает вопрос в ${p.knot}, а ответить ${p.who} нельзя` });
  },
};
