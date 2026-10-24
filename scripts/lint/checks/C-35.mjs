// C-35. Серия без выбора: где игрок становится зрителем. Отрезок после последней кнопки меряет C-42.
import { isIncoming } from '../journal.mjs';
import { places, plural } from '../text.mjs';

const words = (t) => t.split(/\s+/).filter(Boolean).length;

export default {
  id: 'C-35',
  title: 'Серия без выбора',
  plan: false,
  partial: true,
  run(ctx, find) {
    const { T } = ctx;
    const timer = T.re('dict.timer');
    const series = places();
    const mono = places();
    for (const run of ctx.runs) {
      let from = 0;
      for (const c of run.choices) {
        const seg = run.lines.slice(from, c.at).filter(isIncoming);
        from = c.at;
        if (!seg.length) continue;
        const first = seg[0];
        const p = series.add(first.knot, () => ({ knot: first.knot, chapter: first.chapter, n: 0, max: 0, words: 0 }));
        const w = seg.reduce((s, l) => s + words(l.text), 0);
        if (seg.length > p.max) p.max = seg.length;
        if (w > p.words) p.words = w;
        // монолог: самая длинная цепочка одного #from подряд
        let best = [];
        let cur = [];
        for (const l of seg) {
          if (cur.length && cur[0].who === l.who) cur.push(l);
          else cur = [l];
          if (cur.length > best.length) best = [...cur];
        }
        if (best.length > T.value('C-35.monologue') && !best.some((l) => l.text.includes('?') || timer.test(l.text))) {
          const m = mono.add(best[0].knot, () => ({ knot: best[0].knot, chapter: best[0].chapter, who: best[0].who, max: 0 }));
          m.max = Math.max(m.max, best.length);
        }
      }
    }
    for (const p of series.values()) {
      const errorKey = p.max > T.value('C-35.series_error') ? 'C-35.series_error' : p.words > T.value('C-35.words_error') ? 'C-35.words_error' : null;
      if (errorKey) {
        find(errorKey, { node: p.knot, chapter: p.chapter, message: `${p.knot}: ${plural(p.max, 'сообщение', 'сообщения', 'сообщений')} (${plural(p.words, 'слово', 'слова', 'слов')}) подряд без кнопки` });
        continue;
      }
      const limitKey = p.chapter === 1 ? 'C-35.series_ch1' : 'C-35.series';
      const key = p.max > T.value(limitKey) ? limitKey : p.chapter !== 1 && p.words > T.value('C-35.words') ? 'C-35.words' : null;
      if (key) {
        find(key, { node: p.knot, chapter: p.chapter, message: `${p.knot} (гл. ${p.chapter}): ${plural(p.max, 'сообщение', 'сообщения', 'сообщений')} (${plural(p.words, 'слово', 'слова', 'слов')}) без кнопки — вставь выбор после ${T.value(limitKey)}-го` });
      }
    }
    for (const m of mono.values()) {
      find('C-35.monologue', { node: m.knot, chapter: m.chapter, message: `${m.knot}: ${m.who ?? 'собеседник'} пишет ${plural(m.max, 'реплику', 'реплики', 'реплик')} без ответа игрока` });
    }
  },
};
