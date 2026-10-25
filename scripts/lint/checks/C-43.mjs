// C-43. Развязка: открытая петля в финале, первый собеседник не возвращается, мораль вслух, голое «Конец».
// Крючок сезона — «// намеренно: C-43 крючок сезона» над узлом финала (R-113).
import { walk } from '../../lib/ink.mjs';
import { endingNodes } from '../endings.mjs';
import { short } from '../text.mjs';

export default {
  id: 'C-43',
  title: 'Развязка',
  plan: true,
  partial: false,
  run(ctx, find) {
    const { st, T, tree } = ctx;
    const finals = endingNodes(st);
    for (const id of finals) {
      const k = st.byId.get(id);
      if (!k) continue;
      const lines = [];
      let unlock = false;
      walk(k.items, (it) => {
        if (it.type === 'msg' || it.type === 'sys' || it.type === 'me') lines.push(it);
        if ((it.tags && 'unlock' in it.tags)) unlock = true;
      });
      const at = { node: id, chapter: st.chapterOf(id) };
      const lastIn = lines.filter((l) => l.type === 'msg').at(-1);
      if (unlock || lastIn?.text.includes('?')) find('C-43.open_loop', { ...at, message: `финал ${id} оставляет открытую петлю${unlock ? ' (#unlock)' : `: «${short(lastIn.text)}»`}` });
      const moral = lines.find((l) => T.re('dict.moral').test(l.text.toLowerCase()));
      if (moral) find('C-43.moral', { ...at, model: true, message: `финал ${id}: мораль сказана вслух — «${short(moral.text)}»` });
      const last = lines.at(-1);
      if (lines.length <= T.value('C-43.bare_end') && last?.type === 'sys' && /конец/i.test(last.text)) find('C-43.bare_end', { ...at, message: `финал ${id}: ${lines.length} строки и «${last.text}» — развязки нет` });
    }
    // первый собеседник истории возвращается после последней #chapter
    let first = null;
    for (const k of tree.knots) { walk(k.items, (it) => { if (!first && it.type === 'msg' && it.who && !ctx.service.has(it.who)) first = it.who; }); if (first) break; }
    if (first && st.lastChapter > 1) {
      let back = false;
      for (const k of tree.knots.filter((x) => st.chapterOf(x.id) === st.lastChapter)) walk(k.items, (it) => { if (it.type === 'msg' && it.who === first) back = true; });
      if (!back) find('C-43.first_absent', { chapter: st.lastChapter, message: `первый собеседник (${first}) не возвращается в последней главе` });
    }
  },
};
