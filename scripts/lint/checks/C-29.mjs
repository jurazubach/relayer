// C-29. Износ формул и отменённый крючок: одинаковые возвраты и обрывы, анонс без содержания,
// возврат, который отменяет крючок («показалось»).
import { isIncoming, norm } from '../journal.mjs';
import { fmtDur, isClosing, places, short } from '../text.mjs';

// обрыв на полуслове: «но…», «погоди —» (R-66: формула обрыва)
const CUT = /(…|\.\.\.|[—–-])\s*$/;

export default {
  id: 'C-29',
  title: 'Износ формул и отменённый крючок',
  plan: false,
  partial: true,
  run(ctx, find) {
    const { st, T } = ctx;
    const gap = T.value('story.pause.session_s');
    const nWords = T.value('C-29.opening_words');
    const after = T.value('C-29.after_lines');
    // формулу игрок изнашивает за одно прохождение: «Три недели спустя» в пяти разных финалах он видит один раз
    const opens = new Map(); // начало возврата → наибольшее число мест на одном пути
    const closes = new Map();
    const tease = places();
    const retract = places();
    const bump = (m, local) => { for (const [k, s] of local) if (s.size > (m.get(k) ?? 0)) m.set(k, s.size); };
    for (const run of ctx.runs) {
      const o = new Map();
      const c = new Map();
      const add = (m, key, place) => { if (!key) return; if (!m.has(key)) m.set(key, new Set()); m.get(key).add(place); };
      run.lines.forEach((l, i) => {
        const chapterStart = l.isChapter;
        if ((l.delay < gap || i === 0) && !chapterStart) return;
        const place = `${l.knot}|${l.text}`;
        if (l.delay >= gap && i > 0) {
          // формула — то, что сказал персонаж: «… не в сети», «Прочитано» и заголовок главы — служебные строки (ST-60)
          const first = run.lines.slice(i).find(isIncoming);
          if (first) add(o, norm(first.text).split(' ').slice(0, nWords).join(' '), `${first.knot}|${first.text}`);
          const prev = run.lines.slice(0, i).findLast(isIncoming);
          // прощание перед паузой меряет C-26: повтор «ладно» — не формула обрыва
          if (prev && !isClosing(prev.text, T)) {
            const last = norm(prev.text);
            // место обрыва — сама строка перед паузой: одна строка на разных путях — одна формула, а не повтор
            const at = `${prev.knot}|${prev.text}`;
            add(c, last, at);
            // первым словом совпадает только обрыв на полуслове («но…», «стоп —»), а не любая фраза с «я» или «она»
            if (CUT.test(prev.text.trim()) && last.split(' ').length <= T.value('C-29.formula_words')) add(c, `^${last.split(' ')[0]}`, at);
          }
          const tail = prev ?? run.lines[i - 1];
          if (T.re('dict.empty_tease').test(tail.text.toLowerCase())) tease.add(place, () => ({ knot: tail.knot, text: tail.text, delay: l.delay }));
        }
        const back = run.lines.slice(i, i + after).find((x) => T.re('dict.false_alarm').test(x.text.toLowerCase()));
        if (back) retract.add(place, () => ({ knot: back.knot, text: back.text }));
      });
      bump(opens, o);
      bump(closes, c);
    }
    for (const [key, n] of opens) {
      if (key && n > T.value('C-29.opening_repeat')) find('C-29.opening_repeat', { message: `возврат после паузы начинается одинаково ${n} раз за прохождение: «${key}…»` });
    }
    for (const [key, n] of closes) {
      // «прочитано» дословно и «прочитано…» первым словом — одна находка
      if (key.startsWith('^') && closes.get(key.slice(1)) === n) continue;
      if (key && key !== '^' && n > T.value('C-29.closing_repeat')) find('C-29.closing_repeat', { message: `перед паузой ${n} раз за прохождение одна и та же ${key.startsWith('^') ? `первая фраза «${key.slice(1)}…»` : `строка «${short(key)}»`} — формула обрыва износилась` });
    }
    for (const p of tease.values()) find('C-29.tease', { node: p.knot, chapter: st.chapterOf(p.knot), message: `пауза ${fmtDur(p.delay)} в ${p.knot}: анонс вместо события — «${short(p.text)}»` });
    for (const p of retract.values()) find('C-29.retract', { node: p.knot, chapter: st.chapterOf(p.knot), message: `возврат в ${p.knot} отменяет крючок — «${short(p.text)}»: обманная развязка` });
  },
};
