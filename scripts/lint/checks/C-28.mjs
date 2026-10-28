// C-28. Возвращение после паузы: стена непрочитанных, приветствие вместо события, нет связи с крючком.
import { isIncoming, median, norm } from '../journal.mjs';
import { fmtDur, isClosing, places, plural, short } from '../text.mjs';

export default {
  id: 'C-28',
  title: 'Возвращение после паузы',
  plan: false,
  partial: true,
  run(ctx, find) {
    const { st, T } = ctx;
    const long = T.value('story.pause.long_s');
    const w = T.value('C-28.link_window');
    const roots = (lines) => new Set(lines.flatMap((l) => norm(l.text).split(' ').filter((x) => x.length >= w.min_word).map((x) => x.slice(0, w.root))));
    const all = places();
    for (const run of ctx.runs) {
      for (const l of run.lines) {
        if (l.delay < long) continue;
        // только паузы, после которых есть кнопка: эпилог меряет C-42
        const next = run.choices.find((c) => c.at > l.i);
        if (!next) continue;
        // первая строка — первая входящая: заголовок главы #sys уведомлением не считается
        const pack = run.lines.slice(l.i, next.at).filter(isIncoming);
        if (!pack.length) continue;
        const first = pack[0];
        const p = all.add(`${l.knot}|${l.text}`, () => ({ knot: l.knot, text: first.text, delay: l.delay, packs: [], greet: 0, unlinked: 0 }));
        p.packs.push(pack.length);
        const n = norm(first.text);
        // одно слово — ещё не пустота: «посмотрела», «третий» — результат дела (schell-art-of-game-design:RED-02);
        // пусто, если в строке нет ни одной буквы. Первое сообщение нового контакта — само событие: в
        // уведомлении новое имя (serial-hooks:PAT-05), его «здравствуйте» — голос, а не пустая карточка
        const arrival = first.who && !run.lines.slice(0, first.i).some((x) => x.who === first.who && isIncoming(x));
        if (!arrival && (T.re('dict.greeting').test(n) || !n || isClosing(first.text, T))) p.greet++;
        const before = run.lines.slice(Math.max(0, l.i - w.before), l.i);
        const after = pack.slice(0, w.after);
        const rb = roots(before);
        const linked = after.some((x) => before.some((b) => b.who && b.who === x.who && isIncoming(b))) || [...roots(after)].some((r) => rb.has(r));
        if (!linked) p.unlinked++;
      }
    }
    for (const p of all.values()) {
      const chapter = st.chapterOf(p.knot);
      const pack = median(p.packs);
      const key = p.delay >= T.value('C-28.pack_long_pause_s') ? 'C-28.pack_long' : 'C-28.pack';
      if (pack > T.value(key)) {
        find(key, { node: p.knot, chapter, message: `после паузы ${fmtDur(p.delay)} в ${p.knot} игрок получает стену: ${plural(pack, 'сообщение', 'сообщения', 'сообщений')} до кнопки` });
      }
      if (p.greet * 2 > p.n) {
        find('C-28.greeting', { node: p.knot, chapter, message: `после паузы ${fmtDur(p.delay)} первым идёт «${short(p.text)}» — уведомление не зовёт вернуться` });
      }
      if (p.unlinked * 2 > p.n) {
        find('C-28.link', { node: p.knot, chapter, message: `после паузы ${fmtDur(p.delay)} в ${p.knot} нет отсылки к крючку («${short(p.text, 30)}»)` });
      }
      if (p.text.length > T.value('C-28.first_line_chars')) {
        find('C-28.first_line_chars', { node: p.knot, chapter, message: `первая строка после паузы — ${p.text.length} знаков: в превью уведомления не влезет` });
      }
    }
  },
};
