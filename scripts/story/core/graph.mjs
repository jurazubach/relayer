// Статический граф узлов: финальные узлы и распределители финала по определениям checks.md.
import { walk, resolveTarget } from '../../lib/ink.mjs';

const TERMINAL = new Set(['END', 'DONE']);

/** Узел → { exits: Set (узлы и END/DONE, без туннелей), tunnels: Set, choices: boolean }. */
export function nodeGraph(tree) {
  const ids = new Set(tree.knots.map((k) => k.id));
  const g = new Map();
  for (const k of tree.knots) {
    const exits = new Set();
    const tunnels = new Set();
    let choices = false;
    walk(k.items, (it) => {
      if (it.type === 'choice') choices = true;
      if (it.type !== 'divert' || it.kind === 'return') return;
      const to = TERMINAL.has(it.target) ? it.target : resolveTarget(it.target, k.id, ids);
      if (!to) return;
      (it.kind === 'tunnel' ? tunnels : exits).add(to);
    });
    g.set(k.id, { exits, tunnels, choices });
  }
  return g;
}

/**
 * Финальные узлы: без кнопок (или с кнопками-реакциями и выходами сразу в END), и все выходы (кроме туннелей) ведут в END или в другие финальные узлы —
 * до неподвижной точки (checks.md, «Финальный узел»). Распределитель — узел, выходы которого ведут
 * хотя бы в два разных финальных узла.
 */
export function finalNodes(tree, g = nodeGraph(tree)) {
  // распределитель не финал, и узлы над ним тоже: неподвижная точка считается заново без распределителей,
  // пока их набор не перестанет расти (иначе финалом становится всё, что ведёт к распределителю)
  let distributors = new Set();
  let final;
  for (let round = 0; round < 20; round++) {
    final = new Set();
    let changed = true;
    while (changed) {
      changed = false;
      for (const [id, n] of g) {
        if (final.has(id) || distributors.has(id) || !n.exits.size) continue;
        if (![...n.exits].every((t) => TERMINAL.has(t) || final.has(t))) continue;
        // кнопка-реакция в эпилоге финала не делает его развилкой: узел с кнопками финальный, если все его
        // выходы — сразу END (туннели эпилога не в счёт). Цепочку реакций выше по графу не поднимаем: два узла
        // с кнопками, которые сходятся в один хвост, — не два финала
        if (n.choices && ![...n.exits].every((t) => TERMINAL.has(t))) continue;
        final.add(id); changed = true;
      }
    }
    // узел, который разводит по двум финалам, — распределитель (определение — checks.md «Общие данные»)
    const found = new Set();
    for (const [id, n] of g) {
      if (new Set([...n.exits].filter((t) => final.has(t))).size >= 2) found.add(id);
    }
    const same = found.size === distributors.size && [...found].every((id) => distributors.has(id));
    distributors = found;
    if (same) break;
  }
  for (const id of distributors) final.delete(id);
  return { final, distributors, graph: g };
}
