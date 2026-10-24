// C-31. Реальное время истории: длина в реальном времени, самые длинные паузы, сверка с карточкой.
import { median } from '../journal.mjs';
import { fmtDur, places } from '../text.mjs';

export default {
  id: 'C-31',
  title: 'Реальное время истории',
  plan: false,
  partial: true,
  run(ctx, find) {
    const { st, T, meta } = ctx;
    if (!ctx.runs.length) return;
    const clickMax = T.value('C-31.click_delay_max_s');
    const real = [];
    const click = [];
    const long = places();
    for (const run of ctx.runs) {
      real.push(run.delay);
      click.push(run.lines.reduce((s, l) => s + l.typing + l.gap + (l.delay <= clickMax ? l.delay : 0), 0));
      for (const l of run.lines) {
        if (l.delay > T.value('C-31.pause_hint_h') * 3600) long.add(`${l.knot}|${l.text}`, () => ({ knot: l.knot, delay: l.delay, text: l.text }));
      }
    }
    for (const p of long.values()) {
      const key = p.delay > T.value('story.pause.max_h') * 3600 ? 'story.pause.max_h' : 'C-31.pause_hint_h';
      find(key, { node: p.knot, chapter: st.chapterOf(p.knot), message: `пауза ${fmtDur(p.delay)} в ${p.knot}${key === 'story.pause.max_h' ? ' дольше предела паузы' : ''}` });
    }
    // в части глав длина и карточка описывают всю историю — сверять не с чем
    if (ctx.partial) return;
    const h = median(real) / 3600;
    const m = median(click) / 60;
    if (h > T.value('story.length.max_h')) {
      find('story.length.max_h', { message: `история идёт ${Math.round(h)} ч реального времени — дольше потолка`, data: { hours: h } });
    } else if (h > T.value('story.length.target_h')) {
      find('story.length.target_h', { message: `история идёт ${Math.round(h)} ч реального времени — дольше цели`, data: { hours: h } });
    }
    const missing = ['minutes', 'days'].filter((f) => typeof meta[f] !== 'number');
    if (missing.length) {
      find('C-31.card_missing', { message: `на карточке нет ${missing.join(' и ')}: замер — ≈ ${Math.round(m)} мин по клику, ≈ ${Math.round(h)} ч в реальном времени`, data: { minutes: m, hours: h } });
    }
    const ratio = T.value('story.card.mismatch_ratio');
    const off = (a, b) => Math.max(a, b) / Math.max(Math.min(a, b), 1e-9) > ratio;
    if (typeof meta.minutes === 'number' && off(m, meta.minutes)) {
      find('story.card.mismatch_ratio', { message: `по клику история читается ${Math.round(m)} мин, на карточке ${meta.minutes}`, data: { minutes: m, card: meta.minutes } });
    }
    if (typeof meta.days === 'number' && off(h / 24, meta.days)) {
      find('story.card.mismatch_ratio', { message: `история идёт ${Math.round(h)} ч реального времени, на карточке ${meta.days} дн — сожми паузы или поправь карточку`, data: { hours: h, card: meta.days } });
    }
  },
};
