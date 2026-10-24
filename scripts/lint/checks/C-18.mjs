// C-18. Скрытая отмена выбора: под кнопкой условие уводит туда же, куда ведёт соседняя кнопка.
import { resolveTarget, walk } from '../../lib/ink.mjs';
import { cleanText } from '../static.mjs';
import { knotAfter } from '../journal.mjs';
import { pct, short } from '../text.mjs';

export default {
  id: 'C-18',
  title: 'Скрытая отмена выбора',
  plan: false,
  partial: true,
  run(ctx, find) {
    const { st, T } = ctx;
    const to = (t, from) => (t === 'END' || t === 'DONE' ? 'END' : resolveTarget(t, from, st.ids));
    for (const g of st.buttons.groups) {
      const direct = g.buttons.map((b) => new Set(b.choice.items.filter((it) => it.type === 'divert').map((it) => to(it.target, g.knot)).filter(Boolean)));
      g.buttons.forEach((b, i) => {
        const hidden = new Set();
        walk(b.choice.items, (it, path) => { if (it.type === 'divert' && path.some((p) => p.type === 'cond')) { const x = to(it.target, g.knot); if (x) hidden.add(x); } });
        const others = new Set(direct.filter((_, j) => j !== i).flatMap((s) => [...s]));
        const overlap = [...hidden].filter((x) => others.has(x) && x !== 'END');
        if (!overlap.length) return;
        let pressed = 0;
        let away = 0;
        for (const r of ctx.runs) {
          for (const c of r.choices) {
            if (c.knot !== g.knot || cleanText(c.texts[c.picked]) !== cleanText(b.text)) continue;
            pressed++;
            if (overlap.includes(knotAfter(r, c))) away++;
          }
        }
        const sib = g.buttons.find((x, j) => j !== i && overlap.some((o) => direct[j].has(o)));
        if (pressed && away / pressed > T.value('C-18.share')) {
          find('C-18.share', { node: g.knot, chapter: g.chapter, message: `кнопка «${short(b.text)}» в ${g.knot} в ${pct(away / pressed)} случаев ведёт туда же, куда «${short(sib?.text ?? overlap[0])}»: выбор отменяется скрыто` });
        }
      });
    }
  },
};
