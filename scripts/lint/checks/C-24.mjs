// C-24. Ставка и срок в стволе: в главе 1 до первой долгой паузы звучит срок мира или ставка из шапки.
// Срок здесь — время мира (R-17, R-121), не срок паузы. Отсутствие — точный сигнал, совпадение — нет.
import { isIncoming, median, visitShare } from '../journal.mjs';
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
    const at = []; // номер входящего, на котором впервые прозвучали срок или ставка (R-17: «не позже 10-го»)
    for (const run of ctx.runs) {
      let found = null;
      for (const l of run.lines) {
        if (l.chapter > 1 || (l.delay >= long && l.i > 0)) break;
        const t = l.text.toLowerCase();
        // одно общее слово со ставкой — ещё не ставка: «камера» звучит в любой ветке истории про камеру
        const shared = [...roots(t, T.value('C-24.root'))].filter((r) => stake.has(r)).length;
        if (re.test(t) || (shared && shared >= Math.min(T.value('C-24.min_roots'), stake.size))) { found = l; break; }
      }
      if (found) {
        hit++;
        firstAt.set(found.knot, (firstAt.get(found.knot) ?? 0) + 1);
        at.push(run.lines.filter((l) => l.i <= found.i && isIncoming(l)).length);
      }
    }
    const share = hit / ctx.runs.length;
    if (share < T.value('C-24.share')) {
      const [k] = [...firstAt].sort((a, b) => b[1] - a[1])[0] ?? [];
      const v = k ? visitShare(ctx.runs).get(k) ?? 0 : 0;
      find('C-24.share', { node: k ?? null, chapter: 1, message: `срок или ставка звучат только на ${pct(share)} путей главы 1${k ? ` (впервые в ${k}, его видят ${pct(v)})` : ''} — перенеси в ствол` });
    }
    // в стволе, но поздно: до этого места игрок решает без ставки
    const late = median(at);
    if (late != null && late > T.value('C-24.by_msg')) {
      const [k] = [...firstAt].sort((a, b) => b[1] - a[1])[0] ?? [];
      find('C-24.by_msg', { node: k ?? null, chapter: 1, message: `срок или ставка впервые звучат только на ${late}-м входящем${k ? ` (${k})` : ''} — первые выборы игрок делает без ставки` });
    }
  },
};
