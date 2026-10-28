// C-01. Мёртвая переменная: записывается, но нигде не читается — выбор игрока не оставляет следа.
import { plural } from '../text.mjs';

export default {
  id: 'C-01',
  title: 'Мёртвая переменная',
  plan: true,
  // в части глав чтение может стоять в главах, которых ещё нет
  partial: false,
  run({ st }, find) {
    for (const v of st.vars.index.values()) {
      // VAR bug — служебные утверждения бота (C-52)
      if (v.name === 'bug' || !v.writes.length || v.reads.length) continue;
      const nodes = [...new Set(v.writes.map((w) => w.node))];
      find('C-01.dead', {
        node: nodes[0],
        chapter: v.writes[0].chapter,
        message: `переменная «${v.name}» записывается ${plural(v.writes.length, 'раз', 'раза', 'раз')} (${nodes.slice(0, 5).join(', ')}) и нигде не читается — выбор игрока не оставляет следа`,
        data: { var: v.name, writes: v.writes.length, nodes },
      });
    }
  },
};
