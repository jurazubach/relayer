// C-42. Хвост после последней кнопки: долго ждать эпилог, слишком длинный или слишком тонкий финал.
// Предел ожидания — решение автора (A-05: после последней кнопки — минуты).
import { endingCandidates, endingOf } from '../endings.mjs';
import { isIncoming, median } from '../journal.mjs';
import { fmtDur } from '../text.mjs';

export default {
  id: 'C-42',
  title: 'Хвост после последней кнопки',
  plan: false,
  partial: false,
  run(ctx, find) {
    const { st, T } = ctx;
    const runs = ctx.runs.filter((r) => r.ended && r.choices.length);
    if (!runs.length) return;
    const cand = endingCandidates(st);
    const by = new Map();
    for (const r of runs) {
      const at = r.choices.at(-1).at;
      const tail = r.lines.slice(at);
      const inc = tail.filter(isIncoming);
      const e = endingOf(r, st, cand) ?? tail.at(-1)?.knot ?? r.choices.at(-1).knot;
      const p = by.get(e) ?? { delay: [], msgs: [], froms: [], knot: tail.find(isIncoming)?.knot ?? r.choices.at(-1).knot, wait: new Map() };
      p.delay.push(tail.reduce((s, l) => s + l.delay, 0));
      for (const l of tail) if (l.delay) p.wait.set(l.knot, (p.wait.get(l.knot) ?? 0) + l.delay);
      p.msgs.push(inc.length);
      p.froms.push(new Set(inc.map((l) => l.who)).size);
      by.set(e, p);
    }
    const short = ctx.meta.minutes != null && ctx.meta.minutes <= T.value('story.short_min');
    for (const [e, p] of by) {
      const at = { node: p.knot, chapter: st.chapterOf(p.knot) };
      const d = median(p.delay);
      const m = median(p.msgs);
      // ожидание копится не там, где хвост начался, а в эпилоге: узел, где больше всего пауз, — его и сжимать (F-12)
      const [slow] = [...p.wait].sort((a, b) => b[1] - a[1])[0] ?? [];
      const waitAt = slow && slow !== p.knot ? { node: slow, chapter: st.chapterOf(slow) } : at;
      if (d > T.value('story.tail.max_delay_min') * 60) find('story.tail.max_delay_min', { ...waitAt, message: `финал «${e}»: после последней кнопки ждать ${fmtDur(d)} — эпилог стоит сжать${waitAt !== at ? ` (больше всего пауз в ${slow})` : ''}` });
      const key = short ? 'C-42.msgs_short' : 'C-42.msgs';
      if (m > T.value(key)) find(key, { ...at, message: `финал «${e}»: ${m} сообщений после последней кнопки` });
      if (m < T.value('C-42.thin') || median(p.froms) === 1) find('C-42.thin', { ...at, message: `финал «${e}»: ${m} входящих от ${median(p.froms)} отправителя — у остальных нет последствий` });
    }
  },
};
