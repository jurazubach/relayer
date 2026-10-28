// C-04. Дальность отклика: между выбором и первым видимым откликом проходят главы — или история
// вообще не помнит прошлых глав.
import { resolveTarget, walk } from '../../lib/ink.mjs';
import { chapterOfKnot } from '../static.mjs';

const IDENT = /[\p{L}_][\p{L}\p{N}_]*/gu;
const idents = (expr) => (String(expr ?? '').replace(/"[^"]*"/g, ' ').match(IDENT) ?? []);
const TEXT = new Set(['msg', 'me', 'sys']);
const hasText = (items) => {
  let found = false;
  walk(items, (it) => { if (TEXT.has(it.type)) found = true; });
  return found;
};

/**
 * Условный переход в узел с текстом: `{x: -> сцена}`. Индекс переменных считает такое чтение скрытым
 * (ветка не выводит реплик), но игрок видит другую сцену — это отклик (LOCAL-04: ложная C-04 на
 * переменной, которая сразу уводит в свою сцену). Возвращает имя → главы таких чтений.
 */
function divertEchoes(tree) {
  const ids = new Set(tree.knots.map((k) => k.id));
  const textKnots = new Set(tree.knots.filter((k) => hasText(k.items)).map((k) => k.id));
  const out = new Map();
  for (const k of tree.knots) {
    const chapter = chapterOfKnot(k);
    if (chapter == null) continue;
    walk(k.items, (it) => {
      if (it.type !== 'cond') return;
      for (const b of it.branches) {
        if (hasText(b.items)) continue;
        const goes = b.items.some((x) => x.type === 'divert' && textKnots.has(resolveTarget(x.target, k.id, ids)));
        if (!goes) continue;
        for (const n of [...idents(it.head), ...(b.cond === 'else' ? [] : idents(b.cond))]) {
          if (!out.has(n)) out.set(n, []);
          out.get(n).push(chapter);
        }
      }
    });
  }
  return out;
}

export default {
  id: 'C-04',
  title: 'Дальность отклика',
  plan: true,
  partial: false,
  run(ctx, find) {
    const { st, T, tree } = ctx;
    const echoes = divertEchoes(tree);
    const gaps = [];
    for (const v of st.vars.index.values()) {
      const writes = v.writes.filter((w) => w.chapter != null);
      if (!writes.length) continue;
      const a = Math.min(...writes.map((w) => w.chapter));
      const seen = [
        ...v.reads.filter((r) => r.visible && r.chapter != null).map((r) => r.chapter),
        ...(echoes.get(v.name) ?? []),
      ].filter((c) => c >= a);
      if (!seen.length) continue;
      const b = Math.min(...seen);
      const gap = b - a;
      gaps.push(gap);
      const key = gap >= T.value('C-04.gap_warning') ? 'C-04.gap_warning' : gap >= T.value('C-04.gap_hint') ? 'C-04.gap_hint' : null;
      if (key) {
        const w = writes.find((x) => x.chapter === a);
        find(key, { node: w.node, chapter: a, message: `«${v.name}» меняется в главе ${a}, первый отклик игрок видит в главе ${b} — добавь колбэк между ними`, data: { from: a, to: b } });
      }
    }
    if (st.lastChapter > 1 && gaps.length && gaps.filter((g) => g > 0).length === T.value('C-04.no_delayed')) {
      find('C-04.no_delayed', { message: 'ни одна переменная не откликается в следующих главах — отложенных последствий нет' });
    }
  },
};
