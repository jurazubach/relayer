// C-30. Паузы без кнопки и микросессии: уведомления, на которые игроку нечем ответить.
import { fmtDur, pct, places, plural, short } from '../text.mjs';

export default {
  id: 'C-30',
  title: 'Паузы без кнопки и микросессии',
  plan: false,
  partial: true,
  run(ctx, find) {
    const { st, T } = ctx;
    const session = T.value('story.pause.session_s');
    const long = T.value('story.pause.long_s');
    const streaks = places();
    let returns = 0;
    let micro = 0;
    let example = null;
    for (const run of ctx.runs) {
      if (!run.choices.length) continue;
      // только до последней кнопки прогона: хвост меряет C-42
      let from = 0;
      for (const c of run.choices) {
        const pauses = run.lines.slice(from, c.at).filter((l) => l.delay >= session);
        if (pauses.length >= T.value('C-30.streak_warning')) {
          const p = streaks.add(pauses[0].knot, () => ({ knot: pauses[0].knot, max: 0, sec: 0 }));
          if (pauses.length > p.max) { p.max = pauses.length; p.sec = pauses.reduce((s, l) => s + l.delay, 0); }
        }
        from = c.at;
      }
      const limit = run.choices.at(-1).at;
      const starts = run.lines.filter((l) => l.i < limit && l.delay >= long).map((l) => l.i);
      starts.forEach((s, k) => {
        const e = starts[k + 1] ?? limit;
        returns++;
        const lines = e - s;
        const buttons = run.choices.filter((c) => c.at > s && c.at <= e).length;
        if (lines <= T.value('C-30.micro_lines') && !buttons) {
          micro++;
          example ??= { before: run.lines[s - 1]?.text ?? '', delay: run.lines[s].delay, after: run.lines[s].text, knot: run.lines[s].knot };
        }
      });
    }
    for (const p of streaks.values()) {
      const key = p.max >= T.value('C-30.streak_error') ? 'C-30.streak_error' : 'C-30.streak_warning';
      find(key, { node: p.knot, chapter: st.chapterOf(p.knot), message: `${p.knot}: ${plural(p.max, 'уведомление', 'уведомления', 'уведомлений')} подряд без выбора, ~${fmtDur(p.sec)}` });
    }
    if (returns && micro / returns > T.value('C-30.micro_share')) {
      find('C-30.micro_share', {
        node: null,
        message: `${pct(micro / returns)} возвращений дают ≤ ${T.value('C-30.micro_lines')} строк без кнопки (пример: «${short(example.before, 30)}» → ${fmtDur(example.delay)} → «${short(example.after, 30)}» в ${example.knot})`,
        data: { share: micro / returns, micro, returns },
      });
    }
  },
};
