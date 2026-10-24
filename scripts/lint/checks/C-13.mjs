// C-13. Текст кнопки: длина, #label, кнопка-действие, кнопка-чувство, почти одинаковые варианты.
import { pct, short } from '../text.mjs';

const plain = (t) => String(t).replace(/\{[^{}]*\}/g, '').replace(/\s+/g, ' ').trim();
const words = (t) => plain(t).split(' ').filter(Boolean).length;

function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return d[a.length][b.length];
}

export default {
  id: 'C-13',
  title: 'Текст кнопки',
  plan: true,
  partial: true,
  run(ctx, find) {
    const { st, T } = ctx;
    const short_ = ctx.meta.minutes != null && ctx.meta.minutes <= T.value('story.short_min');
    const charsKey = short_ ? 'C-13.chars_short' : 'C-13.chars';
    const list = st.buttons.list.filter((b) => plain(b.text));
    let long6 = 0;
    for (const b of list) {
      const text = plain(b.text);
      const label = b.choice.tags.label;
      const at = { node: b.knot, chapter: b.chapter };
      const w = words(text);
      if (w > T.value('C-13.words')) long6++;
      // длинное сообщение с #label законно: на экране — намерение, текст уходит в чат (R-46)
      if (label == null && w > T.value('C-13.words_error')) find('C-13.words_error', { ...at, message: `${b.knot}: кнопка «${short(text)}» — ${w} слов` });
      else if (label == null && w > T.value('C-13.words_warning')) find('C-13.words_warning', { ...at, message: `${b.knot}: кнопка «${short(text)}» — ${w} слов` });
      if (label == null && text.length > T.value(charsKey)) find(charsKey, { ...at, message: `кнопка «${short(text)}» длиннее порога — сократи или добавь #label` });
      if (label != null && words(label) > T.value('C-13.label_words')) find('C-13.label_words', { ...at, message: `${b.knot}: #label «${short(label)}» — ${words(label)} слов` });
      const low = text.toLowerCase();
      if (!b.silent && label == null && T.re('dict.button_action').test(low)) find('C-13.action', { ...at, message: `кнопка «${short(text)}» звучит как действие, а уходит сообщением` });
      if (T.re('dict.button_inner').test(low)) find('C-13.inner', { ...at, message: `кнопка «${short(text)}» — чувство или решение героя, а не реплика игрока` });
    }
    if (list.length && long6 / list.length > T.value('C-13.words_share')) {
      find('C-13.words_share', { message: `${pct(long6 / list.length)} кнопок длиннее нормы в словах (${long6} из ${list.length})` });
    }
    for (const g of st.buttons.groups) {
      const bs = g.buttons.filter((b) => plain(b.text) && !b.silent);
      for (let i = 0; i < bs.length; i++) {
        for (let j = i + 1; j < bs.length; j++) {
          const a = plain(bs[i].text).toLowerCase();
          const b = plain(bs[j].text).toLowerCase();
          if (a === b) continue;
          if (lev(a, b) < T.value('C-13.similar') * Math.max(a.length, b.length)) {
            find('C-13.similar', { node: g.knot, chapter: g.chapter, message: `${g.knot}: «${short(bs[i].text, 30)}» и «${short(bs[j].text, 30)}» почти одинаковы — игрок не увидит разницы` });
          }
        }
      }
    }
  },
};
