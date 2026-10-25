// C-40. Распределение финалов: один финал забирает большинство прогонов, редкий финал почти недостижим.
// Финал — последняя метка «// финал:», через которую прошёл прогон (решение королевы, T-03b). Прогон, дошедший
// до конца истории без метки, — находка, даже если меток в истории нет совсем: END или DONE в функции и треде
// историю не кончают, и бот такой прогон концом не считает. Без меток доли считаются по узлам — ориентировочно.
import { endingCandidates, endingOf } from '../endings.mjs';
import { pct } from '../text.mjs';

export { endingCandidates, endingOf };

export default {
  id: 'C-40',
  title: 'Распределение финалов',
  plan: true,
  partial: false,
  run(ctx, find) {
    const { st, T } = ctx;
    const runs = ctx.runs.filter((r) => r.ended);
    if (!runs.length) return;
    const count = new Map();
    const lastChoice = new Map(); // финал -> Map(точка выбора -> число)
    let unmarked = 0;
    const cand = endingCandidates(st);
    const perRun = runs.map((r) => {
      const e = endingOf(r, st, cand);
      if (!e) { unmarked++; return null; }
      count.set(e, (count.get(e) ?? 0) + 1);
      const c = r.choices.at(-1);
      if (c) {
        if (!lastChoice.has(e)) lastChoice.set(e, new Map());
        lastChoice.get(e).set(c.key, (lastChoice.get(e).get(c.key) ?? 0) + 1);
      }
      return e;
    });
    const unmarkedRuns = st.endingMarks.length ? unmarked : runs.length;
    if (unmarkedRuns) {
      // узлы, где кончились такие прогоны: их и размечать
      const where = new Map();
      runs.forEach((r, i) => {
        if (st.endingMarks.length && perRun[i]) return;
        const k = r.lines.at(-1)?.knot ?? '?';
        where.set(k, (where.get(k) ?? 0) + 1);
      });
      const top = [...where].sort((a, b) => b[1] - a[1]).slice(0, T.value('lint.examples')).map(([k]) => k).join(', ');
      find('C-40.unmarked_run', { message: `${unmarkedRuns} из ${runs.length} прогонов дошли до конца истории, не пройдя ни одной // финал: — финал без метки (кончаются в ${top})`, data: { unmarked: unmarkedRuns } });
    }
    const names = cand.names;
    if (names.length >= T.value('C-40.min_endings')) {
      for (const [name, n] of count) {
        const share = n / runs.length;
        if (share <= T.value('C-40.dominant_share')) continue;
        // точка выбора перед доминирующим финалом и сколько её кнопок туда ведут
        const [key] = [...lastChoice.get(name) ?? new Map()].sort((a, b) => b[1] - a[1])[0] ?? [];
        let where = '';
        if (key) {
          const picks = new Map();
          runs.forEach((r, i) => {
            const c = r.choices.at(-1);
            if (!c || c.key !== key) return;
            const p = picks.get(c.picked) ?? { n: 0, hit: 0 };
            p.n++;
            if (perRun[i] === name) p.hit++;
            picks.set(c.picked, p);
          });
          const m = key.split('|').length - 1;
          const k = [...picks.values()].filter((p) => p.hit * 2 > p.n).length;
          where = ` — проверь ${key.split('|')[0]}: ${k} из ${m} кнопок ведут туда`;
        }
        find('C-40.dominant_share', { node: key?.split('|')[0] ?? null, message: `финал «${name}» забирает ${pct(share)} прохождений${where}${st.endingMarks.length ? '' : ' (финалы без меток — по узлам, ориентировочно)'}` });
      }
    }
    if (names.length > 1) {
      for (const name of names) {
        const share = (count.get(name) ?? 0) / runs.length;
        if (share < T.value('C-40.rare_share')) {
          find('C-40.rare_share', { message: `финал «${name}» выпал в ${pct(share)} — достижим ли он целенаправленно?`, data: { share } });
        }
      }
    }
    ctx.endingShares = Object.fromEntries([...count].map(([k, v]) => [k, v / runs.length]));
  },
};
