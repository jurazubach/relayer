// C-16. Перекос выбора к финалу: одна кнопка развилки почти всегда ведёт в один финал, соседняя — почти
// никогда; или финал угадывается по позиции кнопки. Финалы не делятся на хорошие и плохие (R-111).
// Финальная дилемма — последняя кнопка, которая сама выбирает финал (C-06), — не перекос: её не считаем,
// а персоны на ней жмут случайно, иначе «всегда первая» получала бы финал первой кнопки в любой истории.
import { endingCandidates, endingOf } from '../endings.mjs';
import { pct, short } from '../text.mjs';

export default {
  id: 'C-16',
  title: 'Перекос выбора к финалу',
  plan: false,
  partial: false,
  run(ctx, find) {
    const { st, T } = ctx;
    const cand = endingCandidates(st);
    const runs = ctx.runs.filter((r) => r.ended);
    const endOf = new Map(runs.map((r) => [r, endingOf(r, st, cand)]));
    const endings = new Set([...endOf.values()].filter(Boolean));
    if (endings.size < 2) return;
    const chapters = new Set([...st.distributors].map((R) => st.chapterOf(R)));
    const min = T.value('C-16.min_samples');
    // финальная дилемма: развилка, после которой в большинстве прогонов выборов больше нет
    const last = new Map();
    for (const r of runs) {
      for (const c of r.choices) {
        const p = last.get(c.knot) ?? { n: 0, last: 0 };
        p.n++;
        if (c === r.choices.at(-1)) p.last++;
        last.set(c.knot, p);
      }
    }
    const decisive = new Set([...last].filter(([, p]) => p.last * 2 > p.n).map(([k]) => k));

    // точка выбора → кнопка → финалы
    const points = new Map();
    for (const r of runs) {
      const e = endOf.get(r);
      if (!e) continue;
      for (const c of r.choices) {
        if (!chapters.has(c.chapter) || c.n < 2 || decisive.has(c.knot)) continue;
        if (!points.has(c.key)) points.set(c.key, { c, opts: new Map() });
        const o = points.get(c.key).opts;
        const text = c.texts[c.picked];
        if (!o.has(text)) o.set(text, new Map());
        o.get(text).set(e, (o.get(text).get(e) ?? 0) + 1);
      }
    }
    for (const { c, opts } of points.values()) {
      const stats = [...opts].map(([text, m]) => ({ text, m, n: [...m.values()].reduce((a, b) => a + b, 0) })).filter((x) => x.n >= min);
      if (stats.length < 2) continue;
      for (const e of endings) {
        const hi = stats.find((x) => (x.m.get(e) ?? 0) / x.n >= T.value('C-16.button_share'));
        const lo = hi && stats.find((x) => x !== hi && (x.m.get(e) ?? 0) / x.n <= T.value('C-16.other_share'));
        if (hi && lo) {
          find('C-16.button_share', { node: c.knot, chapter: c.chapter, message: `${c.knot}: «${short(hi.text)}» почти всегда ведёт в «${e}» (${pct((hi.m.get(e) ?? 0) / hi.n)}), «${short(lo.text)}» — в ${pct((lo.m.get(e) ?? 0) / lo.n)}: ответ очевиден` });
          break;
        }
      }
    }

    for (const side of ['first', 'last']) {
      const pr = ctx.persona(side, decisive).filter((r) => r.ended);
      if (!pr.length) continue;
      const count = new Map();
      for (const r of pr) { const e = endingOf(r, st, cand); if (e) count.set(e, (count.get(e) ?? 0) + 1); }
      const [top, n] = [...count].sort((a, b) => b[1] - a[1])[0] ?? [];
      if (top && n / pr.length >= T.value('C-16.persona_share')) {
        find('C-16.persona_share', { message: `«${side === 'first' ? 'почти всегда первая' : 'почти всегда последняя'} кнопка» в ${pct(n / pr.length)} даёт «${top}» — правильный ответ угадывается по позиции` });
      }
    }
  },
};
