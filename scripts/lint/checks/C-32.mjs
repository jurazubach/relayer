// C-32. Расписание возвращений: частота возвращений, первая пауза, паузы глав 1–2, стык с главой 2,
// «сплю» → «доброе утро». Часы игрока не моделируются (A-02): отсчёт от старта прогона.
// Измерения 6–7 (напоминания и цена «не ответил») ждут E-02 — deferred в thresholds.json.
import { isIncoming, median, norm } from '../journal.mjs';
import { fmtDur, places, plural, short } from '../text.mjs';

export default {
  id: 'C-32',
  title: 'Расписание возвращений и напоминания',
  plan: false,
  partial: true,
  deferred: ['story.reminders.max', 'C-32.no_answer'],
  run(ctx, find) {
    const { st, T } = ctx;
    if (!ctx.runs.length) return;
    const long = T.value('story.pause.long_s');
    const session = T.value('story.pause.session_s');
    const perDay = [];
    const firstPause = [];
    const early = [];
    const ch2 = [];
    const interChapter = [];
    const sleep = places();
    const earlyPause = places();
    const ep = T.value('attn.pause.early_max');
    for (const run of ctx.runs) {
      // 1. возвращения за каждые 24 ч от старта прогона
      let t = 0;
      const days = new Map();
      let clock = 0;
      for (const l of run.lines) {
        t += l.delay;
        clock += l.delay + l.typing + l.gap;
        if (l.delay >= long) { const d = Math.floor(t / 86400); days.set(d, (days.get(d) ?? 0) + 1); }
        if (clock - l.delay <= ep.window_s && l.delay > ep.max_s && l.i > 0) earlyPause.add(`${l.knot}|${l.text}`, () => ({ knot: l.knot, delay: l.delay }));
      }
      perDay.push(Math.max(0, ...days.values()));
      // 2. первая пауза ≥ сессии: выборы до неё и её длина
      const fp = run.lines.find((l) => l.delay >= session && l.i > 0);
      if (fp) firstPause.push({ choices: run.choices.filter((c) => c.at <= fp.i).length, delay: fp.delay, knot: fp.knot });
      // 3. длинные паузы в главах 1–2
      early.push(run.lines.filter((l) => l.chapter <= T.value('C-32.early_chapters') && l.delay >= T.value('C-32.early_long_h') * 3600 && l.i > 0).length);
      // 4. пауза перед главой 2 и межглавные
      for (const l of run.lines.filter((x) => x.isChapter && x.i > 0)) {
        const prevIn = run.lines.slice(0, l.i).filter(isIncoming).slice(-T.value('C-32.ch2_window'));
        const sum = prevIn.filter((x) => x.delay >= session).reduce((s, x) => s + x.delay, 0) + l.delay;
        interChapter.push(sum);
        if (l.chapter === 2) ch2.push({ sum, knot: l.knot });
      }
      // 5. «сплю» → «доброе утро» того же контакта
      for (let i = 0; i < run.lines.length; i++) {
        const a = run.lines[i];
        if (!isIncoming(a) || !T.re('dict.sleep').test(norm(a.text))) continue;
        let sum = 0;
        for (let j = i + 1; j < run.lines.length; j++) {
          const b = run.lines[j];
          sum += b.delay;
          if (isIncoming(b) && b.who === a.who && T.re('dict.morning').test(norm(b.text))) {
            const p = sleep.add(`${a.knot}|${a.text}`, () => ({ knot: a.knot, text: a.text, sums: [] }));
            p.sums.push(sum);
            break;
          }
        }
      }
    }
    const mDay = median(perDay);
    if (mDay > T.value('C-32.returns_per_day')) find('C-32.returns_per_day', { message: `${mDay} возвращений за сутки от старта — игроку некогда жить` });
    if (firstPause.length) {
      const c = median(firstPause.map((x) => x.choices));
      const d = median(firstPause.map((x) => x.delay));
      const k = firstPause[0].knot;
      const at = { node: k, chapter: st.chapterOf(k) };
      if (c === T.value('C-32.first_pause_choices')) find('C-32.first_pause_choices', { ...at, message: `первая длинная пауза (${fmtDur(d)}) до первого выбора` });
      else if (c < T.value('C-32.first_pause_choices_hint')) find('C-32.first_pause_choices_hint', { ...at, message: `до первой длинной паузы всего ${plural(c, 'выбор', 'выбора', 'выборов')}` });
      if (d > T.value('C-32.first_pause_h') * 3600) find('C-32.first_pause_h', { ...at, message: `первая длинная пауза — ${fmtDur(d)}: игрок ещё не втянулся` });
    }
    const mEarly = median(early);
    if (mEarly > T.value('C-32.early_long')) find('C-32.early_long', { chapter: 1, message: `${plural(mEarly, 'длинная пауза', 'длинные паузы', 'длинных пауз')} в главах 1–2 — каждая отпускает игрока` });
    if (ch2.length) {
      const s = median(ch2.map((x) => x.sum));
      const m = median(interChapter);
      if (s > T.value('C-32.ch2_pause_h') * 3600 || (interChapter.length > ch2.length && s > m)) {
        find('C-32.ch2_pause_h', { node: ch2[0].knot, chapter: 2, message: `пауза перед главой 2 — ${fmtDur(s)} (медиана межглавных ${fmtDur(m)}): это самый опасный стык` });
      }
    }
    for (const p of sleep.values()) {
      const s = median(p.sums);
      if (s < T.value('story.sleep_morning.min_h') * 3600) find('story.sleep_morning.min_h', { node: p.knot, chapter: st.chapterOf(p.knot), message: `утро наступает через ${fmtDur(s)} после «${short(p.text)}» в ${p.knot}: в «по клику» без метки утро придёт через секунды` });
    }
    for (const p of earlyPause.values()) find('attn.pause.early_max', { node: p.knot, chapter: st.chapterOf(p.knot), message: `пауза ${fmtDur(p.delay)} в первые минуты (${p.knot}) — игрок ещё не втянулся` });
  },
};
