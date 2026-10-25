// C-32. Расписание возвращений: частота возвращений, первая пауза, паузы глав 1–2, стык с главой 2,
// «сплю» → «доброе утро». Часы игрока не моделируются (A-02): отсчёт от старта прогона.
// Измерения 6–7 — молчание у кнопки (E-02): «неотвечающий» в реальном времени, напоминания #remind
// и ветка «не ответил» (#noanswer, иначе #silent) против нажатого #silent.
import { isIncoming, median, norm } from '../journal.mjs';
import { NO_ANSWER, play, reminderSeries, seeded, strategies } from '../../lib/bot.mjs';
import { isReproach } from '../../lib/lexicon.mjs';
import { fmtDur, places, plural, short } from '../text.mjs';

/** Прогоны «неотвечающего»: журнал play() целиком — напоминаний и «не ответил» в журнале линта нет. */
function silentRuns(ctx) {
  const { T, st } = ctx;
  const n = Math.min(ctx.runs.length, T.value('C-32.no_answer_runs'));
  const rng = seeded(T.value('C-32.no_answer_runs'));
  const nodes = [...st.ids];
  const maxSteps = T.value('lint.max_steps');
  const runs = [];
  for (let r = 0; r < n; r++) runs.push(play(ctx.built.json, { rng, nodes, maxSteps, strategy: strategies.unresponsive(), log: true, trackVars: false }));
  return { runs, replay: (route, seed) => play(ctx.built.json, { rng: seeded(seed), nodes, maxSteps, strategy: strategies.scripted(route), trackVars: false }) };
}

const forks = (events) => events.filter((e) => e.type === 'choice');
const endKnot = (r) => r.events.findLast((e) => e.type === 'end' || e.type === 'stuck')?.knot ?? null;

export default {
  id: 'C-32',
  title: 'Расписание возвращений и напоминания',
  plan: false,
  partial: true,
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
    noAnswer(ctx, find);
  },
};

/** 6–7. Напоминания у каждой точки выбора и цена «не ответил» против #silent той же развилки. */
function noAnswer(ctx, find) {
  const { st, T } = ctx;
  const { runs, replay } = silentRuns(ctx);
  if (!runs.length) return;
  const max = T.value('story.reminders.max');
  const at = (knot) => ({ node: knot, chapter: st.chapterOf(knot) });
  // 6. сколько напоминаний, повторы, продолжение после последнего
  for (const r of runs) {
    for (const s of reminderSeries(r.events)) {
      if (s.n > max) find('story.reminders.max', { ...at(s.knot), message: `${s.knot}: ${plural(s.n, 'напоминание', 'напоминания', 'напоминаний')} подряд — больше ${max}: это уже давление` });
      if (s.repeats.length) find('story.reminders.max', { ...at(s.knot), message: `${s.knot}: напоминание дословно повторяет сказанное — «${short(s.repeats[0])}»` });
      if (s.next === 'стоит') find('story.reminders.max', { ...at(s.knot), message: `${s.knot}: после напоминаний история стоит — нет ни #noanswer, ни #silent` });
    }
  }
  // 7. «не ответил» против #silent: следующие варианты и финал; упрёк за отсутствие на пути неотвечающего
  const seen = new Set();
  const reproach = places();
  runs.forEach((r, k) => {
    const list = forks(r.events);
    const route = list.map((e) => e.picked);
    list.forEach((f, j) => {
      if (!f.noAnswer || f.noAnswer.via !== 'noanswer') return; // #silent как ветка «не ответил» — та же цена
      const silent = f.options.findIndex((o) => o.tags.some((t) => t.trim() === 'silent'));
      const key = `${f.knot}|${route.slice(0, j).join(',')}`;
      if (silent < 0 || seen.has(key)) return;
      seen.add(key);
      const seed = T.value('C-32.no_answer_runs') * 1000 + k * 100 + j;
      const A = replay([...route.slice(0, j), NO_ANSWER], seed);
      const B = replay([...route.slice(0, j), silent], seed);
      const next = (x) => forks(x.events)[j + 1]?.options.map((o) => o.text) ?? [];
      const lost = next(B).filter((t) => !next(A).includes(t));
      if (lost.length > T.value('C-32.no_answer')) find('C-32.no_answer', { ...at(f.knot), message: `${f.knot}: «не ответил» закрывает «${short(lost[0])}», а #silent — нет` });
      const [ea, eb] = [endKnot(A), endKnot(B)];
      if (ea !== eb) find('C-32.no_answer', { ...at(f.knot), message: `${f.knot}: «не ответил» ведёт к финалу в ${ea}, а #silent той же развилки — в ${eb}: отсутствие не должно стоить дороже молчания` });
    });
    // упрёк уместен только как ответ на нажатый #silent; «не ответил» и запасная кнопка — не нажатый #silent
    let pressedSilent = true;
    for (const e of r.events) {
      if (e.type === 'choice') pressedSilent = !e.noAnswer && e.options[e.picked]?.tags.some((t) => t.trim() === 'silent');
      else if (e.type === 'remind') pressedSilent = false;
      else if (e.type === 'line' && e.kind === 'msg' && e.text && !pressedSilent && isReproach(e.text, T)) {
        reproach.add(`${e.knot}|${e.text}`, () => ({ knot: e.knot, text: e.text }));
      }
    }
  });
  for (const p of reproach.values()) find('C-32.no_answer_reproach', { ...at(p.knot), message: `упрёк за отсутствие на пути «неотвечающего» (${p.knot}): «${short(p.text)}» — игрок не нажимал #silent` });
}
