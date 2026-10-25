// C-36. Затишье: серия без события, узел без перемены, цепочка без конкретики. Пороги грубые, на
// узлах-развязках бывают ложные срабатывания — это кандидаты для ревьюера. Поэтому серию после последней
// кнопки прогона не считаем (развязку меряет C-42, как и у C-35), а финальные узлы без кнопок не идут в долю
// «узлов без перемены»: их перемена — сам финал (maass-fire-in-fiction:§2, mckee-story:§2).
import { walk } from '../../lib/ink.mjs';
import { firstLines } from '../text.mjs';
import { heroNames, pct, places, plural } from '../text.mjs';

export default {
  id: 'C-36',
  title: 'Затишье',
  plan: false,
  partial: true,
  model: true,
  run(ctx, find) {
    const { st, T, tree } = ctx;
    const lull = places();
    const vague = new Map(); // глава → места
    const names = [...heroNames(ctx).keys()].map((n) => n.slice(0, 4));
    const concrete = (l) => /\d/.test(l.text) || /[«»"]/.test(l.text) || l.kind === 'photo' || names.some((n) => l.text.toLowerCase().includes(n));
    for (const run of ctx.runs) {
      const firstOf = firstLines(run);
      let n = 0;
      let start = null;
      let streak = [];
      const tailFrom = run.seq.findLastIndex((x) => x.type === 'choice');
      for (const [pos, item] of run.seq.entries()) {
        const reset = item.type === 'choice' || item.kind === 'photo' || item.unlock?.length || item.text?.includes('?') || (item.who && firstOf.get(item.who) === item.i);
        if (item.type === 'line' && (item.kind === 'in' || item.kind === 'photo')) {
          if (reset) { n = 0; start = null; } else { n++; start ??= item; }
          if (n > T.value('C-36.lull') && pos < tailFrom) { const p = lull.add(start.knot, () => ({ knot: start.knot, chapter: start.chapter, max: 0 })); p.max = Math.max(p.max, n); }
          if (concrete(item)) streak = []; else streak.push(item);
          if (streak.length === T.value('C-36.vague')) {
            const s = streak[0];
            if (!vague.has(s.chapter)) vague.set(s.chapter, new Set());
            vague.get(s.chapter).add(s.knot);
          }
        } else if (reset) { n = 0; start = null; streak = []; }
      }
    }
    for (const p of lull.values()) find('C-36.lull', { node: p.knot, chapter: p.chapter, message: `${p.knot}: ${plural(p.max, 'сообщение', 'сообщения', 'сообщений')} подряд ничего не происходит — ни вопроса, ни фото, ни нового лица` });
    for (const [ch, knots] of vague) {
      find('C-36.vague', { node: [...knots][0], chapter: ch, message: `глава ${ch}: ${plural(knots.size, 'место', 'места', 'мест')}, где подряд идут реплики без цифры, имени, цитаты и фото (${[...knots].slice(0, 4).join(', ')})` });
    }
    // узел без перемены: ≥ N реплик и ни ~, ни #unlock/#rename/#photo, ни кнопки, ни «?»
    const stat = [];
    let total = 0;
    for (const k of tree.knots) {
      let lines = 0;
      let change = false;
      let onlyRouting = true;
      walk(k.items, (it) => {
        if (it.type === 'msg') { lines++; onlyRouting = false; if (it.text.includes('?') || 'photo' in it.tags || 'unlock' in it.tags || 'rename' in it.tags) change = true; }
        if (it.type === 'code' || it.type === 'choice') change = true;
        if (it.type === 'tags' && ('unlock' in it.tags || 'rename' in it.tags)) change = true;
      });
      if (onlyRouting || st.finals.has(k.id)) continue;
      total++;
      if (!change && lines >= T.value('C-36.static_min_lines')) stat.push(k.id);
    }
    if (total && stat.length / total > T.value('C-36.static_share')) {
      find('C-36.static_share', { message: `${pct(stat.length / total)} узлов без перемены (${stat.length}): ${stat.slice(0, 6).join(', ')}${stat.length > 6 ? '…' : ''}` });
    }
  },
};
