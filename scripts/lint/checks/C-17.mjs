// C-17. Перекос знакомства: в выборе между людьми от одного пришло вдвое больше сообщений, чем от другого.
import { isIncoming, median } from '../journal.mjs';
import { places } from '../text.mjs';

export default {
  id: 'C-17',
  title: 'Перекос знакомства',
  plan: false,
  partial: true,
  run(ctx, find) {
    const { T } = ctx;
    const all = places();
    for (const run of ctx.runs) {
      for (const c of run.choices) {
        const who = [...new Set(c.tos.filter((t, i) => t && !c.silent[i] && !ctx.service.has(t)))];
        if (who.length < 2) continue;
        const before = run.lines.slice(0, c.at).filter(isIncoming);
        const n = Object.fromEntries(who.map((w) => [w, before.filter((l) => l.who === w).length]));
        const p = all.add(c.key, () => ({ knot: c.knot, chapter: c.chapter, counts: Object.fromEntries(who.map((w) => [w, []])) }));
        for (const w of who) p.counts[w]?.push(n[w]);
      }
    }
    for (const p of all.values()) {
      const med = Object.entries(p.counts).map(([w, xs]) => [w, median(xs) ?? 0]).sort((a, b) => b[1] - a[1]);
      const [a, b] = [med[0], med.at(-1)];
      if (a[1] / Math.max(b[1], 1) > T.value('C-17.ratio')) {
        find('C-17.ratio', { node: p.knot, chapter: p.chapter, message: `${p.knot}: до выбора от ${a[0]} ${a[1]} сообщений, от ${b[0]} ${b[1]} — дилемма предрешена` });
      }
    }
  },
};
