// C-35. Серия без выбора: где игрок становится зрителем. Отрезок после последней кнопки меряет C-42.
// Серия часто тянется через несколько узлов: короткий вход и длинный рассказ дальше. Находку ставим на узел,
// где у серии больше всего строк (просьба T-15): там её и резать, а начало серии — в сообщении. Так же одна
// и та же длинная сцена, в которую входят с разных развилок, даёт одну находку, а не по одной на каждый вход.
import { isIncoming } from '../journal.mjs';
import { places, plural } from '../text.mjs';

const words = (t) => t.split(/\s+/).filter(Boolean).length;

/** Узел, где у отрезка больше всего строк; при равенстве — первый по ходу. */
export function heaviest(seg) {
  const n = new Map();
  for (const l of seg) n.set(l.knot, (n.get(l.knot) ?? 0) + 1);
  let best = seg[0];
  for (const l of seg) if (n.get(l.knot) > n.get(best.knot)) best = l;
  return { knot: best.knot, chapter: best.chapter, lines: n.get(best.knot), knots: n.size };
}

/**
 * Монолог отрезка: самая длинная цепочка одного #from подряд или null, если она законна. «?» гасит монолог, только
 * если на вопрос и правда отвечает кнопка: он последний перед ней. Риторический вопрос посреди рассказа игроку
 * слова не даёт (мутант m04: «?», а за ним рассказ идёт дальше без кнопки). Таймер («5 мин») гасит всегда.
 */
export function monologueOf(seg, T, raw = seg) {
  let best = [];
  let cur = [];
  // пауза сессии рвёт монолог: по обе стороны «не в сети» на ночь — два разных захода игрока (мутант m04, ch1_end).
  // Паузу часто несёт строка #sys главы, а не реплика, поэтому складываем паузы всех строк между входящими.
  const session = T.seconds('story.pause.session_s');
  const gap = new Map();
  let acc = 0;
  for (const l of raw) {
    acc += l.delay ?? 0;
    if (isIncoming(l)) { gap.set(l, acc); acc = 0; }
  }
  for (const l of seg) {
    if (cur.length && cur[0].who === l.who && (gap.get(l) ?? 0) < session) cur.push(l);
    else cur = [l];
    if (cur.length > best.length) best = [...cur];
  }
  const answered = best.at(-1) === seg.at(-1) && best.at(-1).text.includes('?');
  return answered || best.some((l) => T.re('dict.timer').test(l.text)) ? null : best;
}

const from = (p) => (p.start !== p.knot ? `, начало в ${p.start}, узлов ${p.knots}` : '');

export default {
  id: 'C-35',
  title: 'Серия без выбора',
  plan: false,
  partial: true,
  run(ctx, find) {
    const { T } = ctx;
    const series = places();
    const mono = places();
    for (const run of ctx.runs) {
      let at = 0;
      for (const c of run.choices) {
        const raw = run.lines.slice(at, c.at);
        const seg = raw.filter(isIncoming);
        at = c.at;
        if (!seg.length) continue;
        const h = heaviest(seg);
        const p = series.add(h.knot, () => ({ knot: h.knot, chapter: h.chapter, n: 0, max: 0, words: 0, start: seg[0].knot, knots: 1 }));
        const w = seg.reduce((s, l) => s + words(l.text), 0);
        if (seg.length > p.max) Object.assign(p, { max: seg.length, start: seg[0].knot, knots: h.knots });
        if (w > p.words) p.words = w;
        const best = monologueOf(seg, T, raw);
        if (best && best.length > T.value('C-35.monologue')) {
          const b = heaviest(best);
          const m = mono.add(b.knot, () => ({ knot: b.knot, chapter: b.chapter, who: best[0].who, max: 0, start: best[0].knot, knots: 1 }));
          if (best.length > m.max) Object.assign(m, { max: best.length, start: best[0].knot, knots: b.knots });
        }
      }
    }
    for (const p of series.values()) {
      const errorKey = p.max > T.value('C-35.series_error') ? 'C-35.series_error' : p.words > T.value('C-35.words_error') ? 'C-35.words_error' : null;
      if (errorKey) {
        find(errorKey, { node: p.knot, chapter: p.chapter, message: `${p.knot}: ${plural(p.max, 'сообщение', 'сообщения', 'сообщений')} (${plural(p.words, 'слово', 'слова', 'слов')}) подряд без кнопки${from(p)}` });
        continue;
      }
      const limitKey = p.chapter === 1 ? 'C-35.series_ch1' : 'C-35.series';
      const key = p.max > T.value(limitKey) ? limitKey : p.chapter !== 1 && p.words > T.value('C-35.words') ? 'C-35.words' : null;
      if (key) {
        find(key, { node: p.knot, chapter: p.chapter, message: `${p.knot} (гл. ${p.chapter}): ${plural(p.max, 'сообщение', 'сообщения', 'сообщений')} (${plural(p.words, 'слово', 'слова', 'слов')}) без кнопки${from(p)} — вставь выбор после ${T.value(limitKey)}-го` });
      }
    }
    for (const m of mono.values()) {
      find('C-35.monologue', { node: m.knot, chapter: m.chapter, message: `${m.knot}: ${m.who ?? 'собеседник'} пишет ${plural(m.max, 'реплику', 'реплики', 'реплик')} без ответа игрока${from(m)}` });
    }
  },
};
