// C-03. Невидимая переменная: пишется до последней главы, а читается только в финалах, распределителях
// или в последней главе — игрок не узнает, что выбор что-то значил.
import { plural } from '../text.mjs';

export default {
  id: 'C-03',
  title: 'Невидимая переменная',
  plan: true,
  partial: false,
  run({ st }, find) {
    const late = (r) => !r.fn && (st.finals.has(r.node) || st.distributors.has(r.node) || r.chapter === st.lastChapter);
    for (const v of st.vars.index.values()) {
      if (!v.reads.length || !v.writes.some((w) => w.chapter != null && w.chapter < st.lastChapter)) continue;
      if (!v.reads.every(late)) continue;
      const buttons = new Set(v.writes.filter((w) => w.choice).map((w) => w.choice)).size;
      const where = [...new Set(v.reads.map((r) => r.node))];
      const first = v.writes.find((w) => w.chapter != null);
      find('C-03.invisible', {
        node: first.node,
        chapter: first.chapter,
        message: `«${v.name}» ${buttons > 1 || (!buttons && v.writes.length > 1) ? 'меняют' : 'меняет'} ${buttons ? plural(buttons, 'кнопка', 'кнопки', 'кнопок') : plural(v.writes.length, 'запись', 'записи', 'записей')}, но читается только в ${where.slice(0, 5).join(', ')} — игрок не узнает, что выбор что-то значил; дай реплику-отклик раньше`,
        data: { var: v.name, writes: v.writes.length, buttons, reads: where },
      });
    }
  },
};
