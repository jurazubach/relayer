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
 * Финальные узлы: без кнопок, и все выходы (кроме туннелей) ведут в END или в другие финальные узлы —
 * до неподвижной точки (checks.md, «Финальный узел»). Распределитель — узел, выходы которого ведут
 * хотя бы в два разных финальных узла.
 */
export function finalNodes(tree, g = nodeGraph(tree)) {
  const final = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    for (const [id, n] of g) {
      if (final.has(id) || n.choices || !n.exits.size) continue;
      if ([...n.exits].every((t) => TERMINAL.has(t) || final.has(t))) { final.add(id); changed = true; }
    }
  }
  // узел без кнопок, который разводит по двум финалам, по неподвижной точке тоже «финальный»,
  // но это распределитель (определение — checks.md «Общие данные»): из финалов его убираем
  const distributors = new Set();
  for (const [id, n] of g) {
    const to = [...n.exits].filter((t) => final.has(t));
    if (new Set(to).size >= 2) distributors.add(id);
  }
  for (const id of distributors) final.delete(id);
  return { final, distributors, graph: g };
}
