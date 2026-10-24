// C-02. Счётчик вслепую: переменную много раз меняют, а игрок о ней не слышит.
import { plural } from '../text.mjs';

export default {
  id: 'C-02',
  title: 'Счётчик вслепую',
  plan: true,
  partial: false,
  run(ctx, find) {
    const { st, T } = ctx;
    for (const v of st.vars.index.values()) {
      if (v.name === 'bug') continue;
      const w = v.writes.length;
      const reads = v.reads.filter((r) => !r.derived);
      if (!w || !reads.length) continue;
      const ratio = w / reads.length;
      const visible = reads.filter((r) => r.visible).length;
      const at = v.writes[0];
      const where = { node: at.node, chapter: at.chapter };
      if (!visible && ratio > T.value('C-02.ratio')) {
        find('C-02.ratio', { ...where, message: `«${v.name}»: ${plural(w, 'запись', 'записи', 'записей')} на ${plural(reads.length, 'чтение', 'чтения', 'чтений')}, игроку о нём не говорят — озвучь промежуточный порог`, data: { writes: w, reads: reads.length, visible } });
      } else if (visible && ratio > T.value('C-02.ratio_visible')) {
        find('C-02.ratio_visible', { ...where, message: `«${v.name}»: ${plural(w, 'запись', 'записи', 'записей')} на ${plural(reads.length, 'чтение', 'чтения', 'чтений')} (видимых ${visible}) — игрок копит, не зная сколько`, data: { writes: w, reads: reads.length, visible } });
      }
    }
  },
};
