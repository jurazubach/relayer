// C-05. Глава без последствий: кнопки главы ничего не меняют, её решения не читает будущее,
// она не вспоминает прошлого.
import { plural } from '../text.mjs';

export default {
  id: 'C-05',
  title: 'Глава без последствий',
  plan: true,
  partial: false,
  run(ctx, find) {
    const { st, T } = ctx;
    const N = st.lastChapter;
    if (N < 2) return;
    const vars = [...st.vars.index.values()];
    for (let k = 1; k <= N; k++) {
      const buttons = st.buttons.list.filter((b) => b.chapter === k);
      const M = buttons.filter((b) => b.cls === 'node' || b.cls === 'vars').length;
      const W = vars.filter((v) => v.writes.some((w) => w.chapter === k) && v.reads.some((r) => (r.chapter != null && r.chapter > k) || st.finals.has(r.node))).length;
      const R = vars.filter((v) => v.writes.some((w) => w.chapter != null && w.chapter < k) && v.reads.some((r) => r.chapter === k)).length;
      const node = st.chapterStart.get(k) ?? null;
      if (buttons.length && M === T.value('C-05.meaningful')) {
        find('C-05.meaningful', { node, chapter: k, message: `глава ${k}: ни одна из ${plural(buttons.length, 'кнопки', 'кнопок', 'кнопок')} ничего не меняет — ни узла, ни переменной` });
      }
      if (k < N && W === T.value('C-05.writes')) {
        find('C-05.writes', { node, chapter: k, message: `глава ${k} не меняет состояние истории: после неё всё как было` });
      }
      if (k > 1 && R === T.value('C-05.recalls')) {
        find('C-05.recalls', { node, chapter: k, message: `глава ${k} не вспоминает ни одного прошлого выбора` });
      }
    }
  },
};
