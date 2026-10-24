// C-40. Распределение финалов: один финал забирает большинство прогонов, редкий финал почти недостижим.
// Финал — последняя метка «// финал:», через которую прошёл прогон; без меток — последний узел с -> END.
import { pct } from '../text.mjs';

/**
 * Кандидаты в финалы без меток: финальные узлы, в которые ведёт распределитель (end_* перед общим эпилогом),
 * и узлы с -> END, кроме эпилога после них. Иначе общий debrief съест все финалы в один.
 */
export function endingCandidates(st) {
  if (st.endingMarks.length) return { picked: null, names: [...new Set(st.endingMarks.map((m) => m.name))] };
  const picked = new Set();
  for (const R of st.distributors) {
    for (const e of st.edges.get(R)) if (e.kind !== 'tunnel' && st.finals.has(e.to) && !st.distributors.has(e.to)) picked.add(e.to);
  }
  const after = new Set();
  const queue = [...picked];
  while (queue.length) {
    for (const e of st.edges.get(queue.shift()) ?? []) if (e.to !== 'END' && !after.has(e.to)) { after.add(e.to); queue.push(e.to); }
  }
  const ends = st.endings.endings.map((e) => e.id).filter((id) => !after.has(id) && !picked.has(id));
  return { picked, ends, names: [...picked, ...ends] };
}

/** Финал прогона: последняя пройденная метка (с подписью ветки) или, без меток, кандидат из endingCandidates. */
export function endingOf(run, st, cand = endingCandidates(st)) {
  const marks = st.endingMarks;
  if (marks.length) {
    let cur = null;
    const byNode = new Map();
    for (const m of marks) {
      if (!byNode.has(m.node)) byNode.set(m.node, []);
      byNode.get(m.node).push(m);
    }
    let lastKnot = null;
    for (const l of run.lines) {
      const list = byNode.get(l.knot);
      if (list) {
        if (l.knot !== lastKnot) {
          const plain = list.find((m) => !m.signature);
          if (plain) cur = plain.name;
        }
        const sig = list.find((m) => m.signature && l.text.startsWith(m.signature));
        if (sig) cur = sig.name;
      }
      lastKnot = l.knot;
    }
    return cur;
  }
  const first = run.knots.find((k) => cand.picked.has(k));
  if (first) return first;
  const ends = new Set(cand.ends);
  return [...run.knots].reverse().find((k) => ends.has(k)) ?? null;
}

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
    if (st.endingMarks.length && unmarked) {
      find('C-40.unmarked_run', { message: `${unmarked} из ${runs.length} прогонов дошли до END, не пройдя ни одной // финал: — финал без метки` });
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
        find('C-40.dominant_share', { node: key?.split('|')[0] ?? null, message: `финал «${name}» забирает ${pct(share)} прохождений${where}` });
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
