// Финалы для проверок: какой финал прошёл прогон. Финал — последняя метка «// финал:» на пути (решение
// королевы, T-03b); без меток — ориентировочно по узлам, чтобы доли были видны и до разметки.

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


/** Узлы финалов: размеченные, а без меток — кандидаты (C-07, C-41, C-43). */
export function endingNodes(st) {
  if (st.endingMarks.length) return [...new Set(st.endingMarks.map((m) => m.node))];
  const c = endingCandidates(st);
  return [...new Set([...c.picked, ...c.ends])];
}
