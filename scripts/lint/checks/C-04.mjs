// C-04. Дальность отклика: между выбором и первым видимым откликом проходят главы — или история
// вообще не помнит прошлых глав.

export default {
  id: 'C-04',
  title: 'Дальность отклика',
  plan: true,
  partial: false,
  run(ctx, find) {
    const { st, T } = ctx;
    const gaps = [];
    for (const v of st.vars.index.values()) {
      const writes = v.writes.filter((w) => w.chapter != null);
      if (!writes.length) continue;
      const a = Math.min(...writes.map((w) => w.chapter));
      const seen = v.reads.filter((r) => r.visible && r.chapter != null && r.chapter >= a).map((r) => r.chapter);
      if (!seen.length) continue;
      const b = Math.min(...seen);
      const gap = b - a;
      gaps.push(gap);
      const key = gap >= T.value('C-04.gap_warning') ? 'C-04.gap_warning' : gap >= T.value('C-04.gap_hint') ? 'C-04.gap_hint' : null;
      if (key) {
        const w = writes.find((x) => x.chapter === a);
        find(key, { node: w.node, chapter: a, message: `«${v.name}» меняется в главе ${a}, первый отклик игрок видит в главе ${b} — добавь колбэк между ними`, data: { from: a, to: b } });
      }
    }
    if (st.lastChapter > 1 && gaps.length && gaps.filter((g) => g > 0).length === T.value('C-04.no_delayed')) {
      find('C-04.no_delayed', { message: 'ни одна переменная не откликается в следующих главах — отложенных последствий нет' });
    }
  },
};
