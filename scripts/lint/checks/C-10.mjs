// C-10. Профиль кнопок: пустые и косметические кнопки, декоративные группы, серии развилок без последствий.
import { pct, short } from '../text.mjs';

export default {
  id: 'C-10',
  title: 'Профиль кнопок',
  plan: true,
  partial: true,
  run({ st, T }, find) {
    const all = st.buttons.list;
    if (!all.length) return;
    const bodyless = (b) => b.cls === 'none' && !b.silent;
    const share = all.filter(bodyless).length / all.length;
    if (share > T.value('C-10.bodyless_story')) {
      find('C-10.bodyless_story', { message: `${pct(share)} кнопок истории без своего ответа и последствий (без #silent)`, data: { share, total: all.length } });
    }
    const chapters = [...new Set(all.map((b) => b.chapter))].sort((a, b) => a - b);
    for (const k of chapters) {
      const list = all.filter((b) => b.chapter === k);
      const reply = list.filter((b) => b.cls === 'reply');
      const none = list.filter(bodyless);
      const cosmetic = list.filter((b) => b.cls === 'reply' || b.cls === 'none');
      const ex = (none[0] ?? reply[0]);
      const example = ex ? ` (пример: «${short(ex.text)}» в ${ex.knot})` : '';
      const data = { total: list.length, reply: reply.length, none: none.length };
      if (none.length / list.length > T.value('C-10.bodyless_chapter')) {
        find('C-10.bodyless_chapter', { chapter: k, message: `глава ${k}: ${pct(none.length / list.length)} кнопок без своего ответа${example}`, data });
      }
      if (cosmetic.length / list.length > T.value('C-10.cosmetic_chapter')) {
        find('C-10.cosmetic_chapter', {
          chapter: k,
          message: `глава ${k}: ${pct(reply.length / list.length)} кнопок меняют только реплику, ${pct(none.length / list.length)} — без своего ответа${example}`,
          data,
        });
      }
    }
    // группа из одной кнопки — это C-12 (одиночка), здесь только настоящие развилки
    for (const g of st.buttons.groups) {
      if (g.buttons.length > 1 && g.bodyless) {
        find('C-10.group_bodyless', {
          node: g.knot, chapter: g.chapter,
          message: `${g.knot}: у всех ${g.buttons.length} кнопок нет своего ответа и последствий — выбор декоративный («${short(g.buttons[0].text, 30)}» …)`,
        });
      }
    }
    const streaks = new Map();
    for (const g of st.buttons.groups) {
      if (g.streak >= T.value('C-10.cosmetic_streak')) streaks.set(g.knot, Math.max(streaks.get(g.knot) ?? 0, g.streak));
    }
    for (const [knot, n] of streaks) {
      find('C-10.cosmetic_streak', { node: knot, chapter: st.chapterOf(knot), message: `${knot}: ${n} развилки подряд ничего не меняют` });
    }
  },
};
