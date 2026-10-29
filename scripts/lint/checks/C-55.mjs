// C-55. За строкой #chapter — реплика, а не кнопки. Заголовка главы игрок не видит (A-08): стык для него —
// пауза персонажа, и объясняет её первая реплика после паузы. Кнопки сразу за #chapter — возвращение без
// события, а на платной границе движок покажет кнопки закрытой главы ещё до paywall (ревью E-08).
import { isIncoming } from '../journal.mjs';
import { places, short } from '../text.mjs';

export default {
  id: 'C-55',
  title: 'Реплика после стыка глав',
  plan: false,
  partial: true,
  run(ctx, find) {
    const { st, T } = ctx;
    const all = places();
    for (const run of ctx.runs) {
      for (const l of run.lines) {
        if (!l.isChapter || l.chapter <= T.value('C-55.from_chapter')) continue;
        const next = run.choices.find((c) => c.at > l.i);
        if (!next) continue;
        if (run.lines.slice(l.i + 1, next.at).some(isIncoming)) continue;
        // один стык — одна находка, даже если за ним по разным веткам разные кнопки
        const p = all.add(l.knot, () => ({ knot: l.knot, buttons: [] }));
        if (!p.buttons.includes(next.texts[0])) p.buttons.push(next.texts[0]);
      }
    }
    for (const p of all.values()) {
      if (p.n <= T.value('C-55.buttons')) continue;
      find('C-55.buttons', { node: p.knot, chapter: st.chapterOf(p.knot), message: `${p.knot}: за строкой #chapter сразу кнопки (${p.buttons.map((t) => `«${short(t, 30)}»`).join(' / ')}) без входящей реплики — стык ничего не объясняет, а на платной границе кнопки закрытой главы покажутся до paywall` });
    }
  },
};
