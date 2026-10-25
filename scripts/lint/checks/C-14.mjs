// C-14. Пол игрока: кнопки и реплики, которые задают игроку пол. В формате он не задаётся.
import { walk } from '../../lib/ink.mjs';
import { short } from '../text.mjs';

// условие на пол игрока: тогда реплика под ним законна
const GENDER_VAR = /(^|[^\p{L}])(gender|sex|пол|female|male|is_she|is_he)([^\p{L}]|$)/u;

export default {
  id: 'C-14',
  title: 'Пол игрока',
  plan: false,
  partial: true,
  run(ctx, find) {
    const { tree, st, T } = ctx;
    const self = T.re('dict.gender_self');
    const you = T.re('dict.gender_you');
    for (const k of tree.knots) {
      walk(k.items, (it, path) => {
        const underGender = path.some((p) => (p.type === 'cond' && GENDER_VAR.test(p.head)) || (p.type === 'branch' && GENDER_VAR.test(p.cond)) || (p.type === 'choice' && p.conds.some((c) => GENDER_VAR.test(c))));
        if (underGender) return;
        let text = null;
        if (it.type === 'choice' || it.type === 'me') text = self.test(it.text.toLowerCase()) ? it.text : null;
        else if (it.type === 'msg' && !ctx.service.has(it.who)) text = you.test(it.text.toLowerCase()) ? it.text : null;
        if (text) find('C-14.gender', { node: k.id, chapter: st.chapterOf(k.id), message: `«${short(text, 50)}» в ${k.id} задаёт пол игрока` });
      });
    }
  },
};
