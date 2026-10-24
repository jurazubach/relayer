// C-24. Ставка и срок в стволе: в главе 1 до первой долгой паузы звучит срок мира или ставка из шапки.
// Срок здесь — время мира (R-17, R-121), не срок паузы. Отсутствие — точный сигнал, совпадение — нет.
import { visitShare } from '../journal.mjs';
import { pct, roots } from '../text.mjs';

export default {
  id: 'C-24',
  title: 'Ставка и срок в стволе',
  plan: false,
  partial: true,
  run(ctx, find) {
    const { st, T, tree } = ctx;
    if (!ctx.runs.length) return;
    const re = T.re('dict.world_deadline');
    const stake = roots(tree.head.ставка ?? '', T.value('C-24.root'));
    const long = T.value('story.pause.long_s');
    let hit = 0;
    const firstAt = new Map();
    for (const run of ctx.runs) {
      let found = null;
      for (const l of run.lines) {
        if (l.chapter > 1 || (l.delay >= long && l.i > 0)) break;
        const t = l.text.toLowerCase();
        if (re.test(t) || [...roots(t, T.value('C-24.root'))].some((r) => stake.has(r))) { found = l; break; }
      }
      if (found) { hit++; firstAt.set(found.knot, (firstAt.get(found.knot) ?? 0) + 1); }
    }
    const share = hit / ctx.runs.length;
    if (share < T.value('C-24.share')) {
      const [k] = [...firstAt].sort((a, b) => b[1] - a[1])[0] ?? [];
      const v = k ? visitShare(ctx.runs).get(k) ?? 0 : 0;
      find('C-24.share', { node: k ?? null, chapter: 1, message: `срок или ставка звучат только на ${pct(share)} путей главы 1${k ? ` (впервые в ${k}, его видят ${pct(v)})` : ''} — перенеси в ствол` });
    }
  },
};
