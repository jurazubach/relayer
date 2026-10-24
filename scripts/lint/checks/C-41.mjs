// C-41. Ранний и короткий финал: прохождение намного короче медианы, конец до последней главы,
// финал вдвое тоньше самого длинного — плохой финал читается как наказание.
import { endingCandidates, endingOf } from '../endings.mjs';
import { isIncoming, median } from '../journal.mjs';
import { pct } from '../text.mjs';

export default {
  id: 'C-41',
  title: 'Ранний и короткий финал',
  plan: false,
  partial: false,
  run(ctx, find) {
    const { st, T } = ctx;
    const runs = ctx.runs.filter((r) => r.ended);
    if (!runs.length) return;
    const cand = endingCandidates(st);
    const med = median(runs.map((r) => r.lines.length));
    const by = new Map();
    let early = 0;
    for (const r of runs) {
      const e = endingOf(r, st, cand) ?? r.lines.at(-1)?.knot ?? '?';
      const p = by.get(e) ?? { len: [], tail: [], min: Infinity };
      p.len.push(r.lines.length);
      p.min = Math.min(p.min, r.lines.length);
      const last = r.choices.at(-1)?.at ?? 0;
      p.tail.push(r.lines.slice(last).filter(isIncoming).length);
      by.set(e, p);
      if ((r.lines.at(-1)?.chapter ?? st.lastChapter) < st.lastChapter) early++;
    }
    for (const [e, p] of by) {
      const ratio = p.min / med;
      const key = ratio < T.value('C-41.short_warning') ? 'C-41.short_warning' : ratio < T.value('C-41.short_hint') ? 'C-41.short_hint' : null;
      if (key) find(key, { node: st.ids.has(e) ? e : null, message: `финал «${e}» достижим уже на строке ${p.min} (медиана ${med})` });
    }
    if (early / runs.length > T.value('C-41.early_share')) find('C-41.early_share', { message: `${pct(early / runs.length)} прогонов кончаются до последней главы` });
    const tails = [...by].map(([e, p]) => [e, median(p.tail)]);
    const longest = Math.max(...tails.map(([, t]) => t));
    if (tails.length > 1 && longest > 0) {
      for (const [e, t] of tails) {
        if (t / longest < T.value('C-41.ending_ratio')) find('C-41.ending_ratio', { node: st.ids.has(e) ? e : null, message: `финал «${e}» в ${String(Math.round((longest / Math.max(t, 1)) * 10) / 10).replace(".", ",")} раза короче самого длинного (${t} против ${longest} сообщений после последней кнопки)` });
      }
    }
  },
};
