// C-07. Финал цитирует путь: в финальном узле есть реплики под условием на выбор игрока, из разных глав.
import { walk } from '../../lib/ink.mjs';
import { endingNodes } from '../endings.mjs';

const IDENT = /[\p{L}_][\p{L}\p{N}_]*/gu;
const names = (s) => String(s).replace(/"[^"]*"/g, ' ').match(IDENT) ?? [];
const outputs = (items) => { let f = false; walk(items, (it) => { if (it.type === 'msg' || it.type === 'sys') f = true; }); return f; };

export default {
  id: 'C-07',
  title: 'Финал цитирует путь',
  plan: true,
  partial: false,
  run(ctx, find) {
    const { st, T } = ctx;
    const byButtons = new Set([...st.vars.index.values()].filter((v) => v.writes.some((w) => w.choice)).map((v) => v.name));
    const finals = new Set(endingNodes(st));
    for (const id of finals) {
      // финал, туннели, которые он вызывает, и общий эпилог после него: финальные узлы без кнопок, куда он
      // ведёт (разбор после всех исходов цитирует путь за все финалы сразу — это тоже цитата)
      const nodes = [id];
      for (let i = 0; i < nodes.length; i++) {
        for (const e of st.edges.get(nodes[i]) ?? []) {
          if (nodes.includes(e.to) || finals.has(e.to)) continue;
          if (e.kind === 'tunnel' || st.finals.has(e.to)) nodes.push(e.to);
        }
      }
      const used = new Set();
      let n = 0;
      for (const nid of nodes) {
        const k = st.byId.get(nid);
        if (!k) continue;
        walk(k.items, (it) => {
          if (it.type === 'cond') {
            for (const b of it.branches) {
              const vs = [...names(it.head), ...(b.cond === 'else' ? [] : names(b.cond))].filter((x) => byButtons.has(x));
              if (vs.length && outputs(b.items)) { n++; vs.forEach((x) => used.add(x)); }
            }
          }
          if (it.type === 'msg') {
            for (const m of it.text.matchAll(/\{([^{}:]+):/g)) {
              const vs = names(m[1]).filter((x) => byButtons.has(x));
              if (vs.length) { n++; vs.forEach((x) => used.add(x)); }
            }
          }
        });
      }
      const chapters = new Set([...used].flatMap((x) => st.vars.index.get(x).writes.filter((w) => w.choice && w.chapter != null).map((w) => w.chapter)));
      if (n === T.value('C-07.callbacks')) {
        find('C-07.callbacks', { node: id, chapter: st.chapterOf(id), message: `финал ${id} не ссылается ни на одно решение игрока` });
      } else if (chapters.size <= T.value('C-07.chapters')) {
        find('C-07.chapters', { node: id, chapter: st.chapterOf(id), message: `финал ${id} помнит только главу ${[...chapters][0] ?? '?'} (${[...used].join(', ')})` });
      }
    }
  },
};
