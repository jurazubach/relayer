// C-12. Ширина развилки: больше четырёх кнопок на экране телефона, кнопки-одиночки подряд.
import { pct, plural } from '../text.mjs';

export default {
  id: 'C-12',
  title: 'Ширина развилки',
  plan: true,
  partial: true,
  run(ctx, find) {
    const { st, T } = ctx;
    const points = new Map();
    for (const run of ctx.runs) for (const c of run.choices) if (!points.has(c.key)) points.set(c.key, c);
    if (!points.size) return;
    const wide = T.value('C-12.wide');
    const hubMax = T.value('C-12.hub_max');
    for (const c of points.values()) {
      if (c.n < wide) continue;
      // #silent уходит тому же адресату, что и ответ: при подсчёте адресатов его не учитываем
      const tos = c.tos.filter((_, i) => !c.silent[i]).map((t) => t ?? '(текущий чат)');
      const distinct = new Set(tos).size === tos.length;
      if (!distinct || c.n > hubMax) {
        find('C-12.wide', { node: c.knot, chapter: c.chapter, message: `${c.knot}: ${plural(c.n, 'кнопка', 'кнопки', 'кнопок')}${distinct ? '' : ', адресаты повторяются'}`, data: { n: c.n, tos: c.tos } });
      } else {
        find('C-12.hub_max', { node: c.knot, chapter: c.chapter, message: `${c.knot}: ${plural(c.n, 'кнопка', 'кнопки', 'кнопок')} — на телефоне это прокрутка (хаб адресатов)`, data: { n: c.n, tos: c.tos } });
      }
    }
    const four = [...points.values()].filter((c) => c.n === T.value('C-12.four')).length / points.size;
    if (four > T.value('C-12.four_share')) {
      find('C-12.four_share', { message: `${pct(four)} развилок на ${T.value('C-12.four')} кнопки — норма 2–3`, data: { share: four } });
    }

    // одиночки: кнопка без условия — подсказка по узлу; несколько подряд на пути — предупреждение
    const single = T.value('C-12.single');
    const conditional = (c) => st.buttons.list.some((b) => b.knot === c.knot && b.text === c.texts[0] && b.conds.length);
    const singles = new Set();
    const streaks = new Map();
    for (const run of ctx.runs) {
      let streak = 0;
      for (const c of run.choices) {
        if (c.n !== single) { streak = 0; continue; }
        streak++;
        if (!conditional(c)) singles.add(c.knot);
        if (streak >= T.value('C-12.single_streak')) streaks.set(c.knot, Math.max(streaks.get(c.knot) ?? 0, streak));
      }
    }
    for (const knot of singles) {
      find('C-12.single', { node: knot, chapter: st.chapterOf(knot), message: `${knot}: одна кнопка без условия — выбора нет` });
    }
    for (const [knot, n] of streaks) {
      find('C-12.single_streak', { node: knot, chapter: st.chapterOf(knot), message: `${knot}: ${n} кнопки-одиночки подряд — это #me` });
    }
  },
};
