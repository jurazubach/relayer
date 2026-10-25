// C-39. Стык глав: конец главы без крючка, начало без события, крючок не подхвачен, глава открывается
// кнопкой без контекста после долгой паузы.
import { isIncoming } from '../journal.mjs';
import { firstLines, hookIn, places, roots } from '../text.mjs';

export default {
  id: 'C-39',
  title: 'Стык глав',
  plan: false,
  partial: true,
  run(ctx, find) {
    const { st, T } = ctx;
    const all = places();
    const long = T.value('story.pause.long_s');
    for (const run of ctx.runs) {
      const firstOf = firstLines(run);
      for (const l of run.lines.filter((x) => x.isChapter && x.i > 0)) {
        const p = all.add(l.chapter, () => ({ chapter: l.chapter, knot: l.knot, n: 0, noHook: 0, noEvent: 0, noLink: 0, cold: 0, long: 0 }));
        const before = run.lines.slice(Math.max(0, l.i - T.value('C-39.end_window')), l.i);
        if (!hookIn(before, firstOf, T)) p.noHook++;
        const next = run.lines.slice(l.i).filter(isIncoming).slice(0, T.value('C-39.start_lines'));
        // кнопка в окне начала — игрока сразу ставят перед решением: это и есть вход с события (R-72), даже
        // если новость сказана утверждением («на двери кто-то написал»), а не вопросом
        const until = next.at(-1)?.i ?? l.i;
        const asked = run.choices.some((c) => c.at > l.i && c.at <= until + 1);
        const event = asked || next.some((x) => x.kind === 'photo' || x.unlock.length || x.text.includes('?') || (x.who && firstOf.get(x.who) === x.i));
        if (!event) p.noEvent++;
        const tail = new Set(before.slice(-2).flatMap((x) => [...roots(x.text, 5)]));
        const head = new Set(next.flatMap((x) => [...roots(x.text, 5)]));
        if (![...tail].some((r) => head.has(r))) p.noLink++;
        if (l.delay >= long) {
          p.long++;
          const c = run.choices.find((x) => x.at > l.i);
          const inBetween = c ? run.lines.slice(l.i + 1, c.at).filter(isIncoming).length : 1;
          if (c && inBetween === T.value('C-39.cold_button')) p.cold++;
        }
      }
    }
    for (const p of all.values()) {
      const at = { node: p.knot, chapter: p.chapter };
      const prev = p.chapter - 1;
      if (p.noHook * 2 > p.n) find('C-39.end_hook', { ...at, chapter: prev, message: `глава ${prev} закрыта без крючка` });
      if (p.noEvent * 2 > p.n) find('C-39.start_event', { ...at, message: `глава ${p.chapter} начинается без события: ни нового лица, ни фото, ни вопроса` });
      if (p.noLink * 2 > p.n) find('C-39.link', { ...at, model: true, message: `крючок главы ${prev} не подхвачен в начале главы ${p.chapter}` });
      if (p.long && p.cold * 2 > p.long) find('C-39.cold_button', { ...at, message: `глава ${p.chapter} после долгой паузы открывается кнопкой без контекста` });
    }
    void st;
  },
};
