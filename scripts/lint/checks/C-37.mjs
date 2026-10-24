// C-37. Давление и ложная срочность: «срочно» чаще двух раз за главу, срок, от которого ничего не зависит
// (у движка нет таймеров), узел из криков. Напоминания при молчании (R-120) не считаются: их проверяет C-32.
import { walk } from '../../lib/ink.mjs';
import { pct, short } from '../text.mjs';

export default {
  id: 'C-37',
  title: 'Давление и ложная срочность',
  plan: false,
  partial: true,
  run(ctx, find) {
    const { st, T, tree } = ctx;
    const pressure = T.re('dict.pressure');
    const ultimatum = T.re('dict.ultimatum');
    const shout = new RegExp(T.value('dict.shout'), 'u');
    const perChapter = new Map();
    for (const k of tree.knots) {
      const ch = st.chapterOf(k.id);
      let lines = 0;
      let loud = 0;
      walk(k.items, (it) => {
        if (it.type !== 'msg' || ctx.service.has(it.who)) return;
        lines++;
        const t = it.text.toLowerCase();
        if (pressure.test(t)) { if (!perChapter.has(ch)) perChapter.set(ch, []); perChapter.get(ch).push({ knot: k.id, text: it.text }); }
        if (ultimatum.test(t)) find('C-37.false_deadline', { node: k.id, chapter: ch, message: `срок «${short(it.text)}» в ${k.id} не исполняется: ни одна ветка не зависит от времени ответа — ложная срочность` });
        if (shout.test(it.text)) loud++;
      });
      if (lines && loud / lines > T.value('C-37.shout_share')) find('C-37.shout_share', { node: k.id, chapter: ch, message: `${k.id}: ${pct(loud / lines)} реплик — «!!», капс или «помоги»` });
    }
    for (const [ch, list] of perChapter) {
      if (list.length > T.value('C-37.per_chapter')) find('C-37.per_chapter', { node: list[0].knot, chapter: ch, message: `глава ${ch}: ${list.length} реплик с давлением (${list.slice(0, 3).map((x) => `«${short(x.text, 25)}»`).join(', ')})` });
    }
  },
};
