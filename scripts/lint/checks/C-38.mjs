// C-38. Темп и пропорции глав на медианном пути: паузы финальной главы, доли глав, тонкая глава, ровные
// паузы, передышки подряд (правка T-05 вместо метки; задуманную гасит «// намеренно: C-38» над первым узлом главы).
import { isIncoming, median } from '../journal.mjs';
import { pct } from '../text.mjs';

export default {
  id: 'C-38',
  title: 'Темп и пропорции глав',
  plan: false,
  partial: false,
  run(ctx, find) {
    const { st, T } = ctx;
    const runs = ctx.runs.filter((r) => r.ended);
    if (!runs.length || st.lastChapter < 2) return;
    const counts = runs.map((r) => r.lines.filter(isIncoming).length);
    const m = median(counts);
    const run = runs[counts.indexOf(m)];
    const N = st.lastChapter;
    const by = Array.from({ length: N }, () => ({ lines: 0, delays: [] }));
    for (const l of run.lines) {
      const c = by[(l.chapter ?? 1) - 1];
      if (!c) continue;
      c.lines++;
      if (l.delay >= T.value('C-38.pause_min_s')) c.delays.push(l.delay);
    }
    const total = by.reduce((s, c) => s + c.lines, 0);
    const meds = by.map((c) => median(c.delays) ?? 0);
    const middle = meds.slice(1, -1);
    const mid = median(middle);
    if (middle.length && mid > 0 && meds.at(-1) / mid >= T.value('C-38.last_tempo')) {
      find('C-38.last_tempo', { chapter: N, message: 'в финальной главе паузы не короче, чем в середине: темп не растёт' });
    }
    if (by[0].lines / total > T.value('C-38.ch1_share')) find('C-38.ch1_share', { chapter: 1, message: `глава 1 занимает ${pct(by[0].lines / total)} строк пути` });
    if (by.at(-1).lines / total < T.value('C-38.last_share')) find('C-38.last_share', { chapter: N, message: `последняя глава — ${pct(by.at(-1).lines / total)} строк пути: финал скомкан` });
    const mc = median(by.map((c) => c.lines));
    by.forEach((c, i) => { if (c.lines && c.lines < T.value('C-38.thin') * mc) find('C-38.thin', { chapter: i + 1, message: `глава ${i + 1} тоньше половины медианы глав: ${c.lines} строк при медиане ${mc}` }); });
    // ровные паузы: отрезок между кнопками с ≥ N пауз, max / min < порога
    let seg = [];
    const flush = (knot) => {
      if (seg.length >= T.value('C-38.spread_min_pauses') && Math.max(...seg) / Math.min(...seg) < T.value('C-38.pause_spread')) {
        find('C-38.pause_spread', { node: knot, chapter: st.chapterOf(knot), message: `${knot}: ${seg.length} пауз одной длины подряд — ритм не дышит` });
      }
      seg = [];
    };
    let knot = null;
    for (const item of run.seq) {
      if (item.type === 'choice') { flush(knot ?? item.knot); knot = null; continue; }
      if (item.delay >= T.value('C-38.pause_min_s')) { seg.push(item.delay); knot ??= item.knot; }
    }
    // передышки: в первых входящих главы нет срока мира и угрозы
    const intended = new Set(ctx.tree.knots.flatMap((k) => k.marks.filter((x) => x.kind === 'намеренно' && x.id === 'C-38').map(() => k.id)));
    const breathers = [];
    for (let c = 1; c <= N; c++) {
      const first = run.lines.filter((l) => l.chapter === c && isIncoming(l)).slice(0, T.value('C-38.breather_lines'));
      const calm = first.length && !first.some((l) => T.re('dict.world_deadline').test(l.text.toLowerCase()) || T.re('dict.threat').test(l.text.toLowerCase()));
      breathers.push(calm && !intended.has(st.chapterStart.get(c)));
    }
    // серия передышек: находка на каждой главе, где серия не короче порога
    let streak = 0;
    for (let c = 1; c <= N; c++) {
      streak = breathers[c - 1] ? streak + 1 : 0;
      if (streak >= T.value('C-38.breathers')) find('C-38.breathers', { node: st.chapterStart.get(c) ?? null, chapter: c, message: `главы ${c - streak + 1}…${c} — передышки подряд: в начале ни срока, ни угрозы` });
    }
  },
};
