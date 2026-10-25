// C-14. Пол игрока: кнопки, #me и легенда игрока, которые задают ему пол, и реплики героев к нему. В формате пол
// игрока не задаётся (R-89). Цитата в кавычках — чужие слова, а не обращение к игроку (просьба T-15).
import { walk } from '../../lib/ink.mjs';
import { short } from '../text.mjs';

// условие на пол игрока: тогда реплика под ним законна
const GENDER_VAR = /(^|[^\p{L}])(gender|sex|пол|female|male|is_she|is_he)([^\p{L}]|$)/u;
// «ты была ребёнком» — я это помню: в кавычках говорит не герой игроку
const unquote = (t) => t.replace(/«[^»]*»|„[^“”]*[“”]|"[^"]*"/g, ' ');
// ~ opener = "Я " + alias + ", студент…": строковые куски, переменные — заглушкой имени
const STRING_ASSIGN = /^([\p{L}_][\p{L}\p{N}_]*)\s*=\s*(.*"[\s\S]*)$/u;
const literal = (expr) => expr.split(/("(?:[^"\\]|\\.)*")/).map((p) => (p.startsWith('"') ? p.slice(1, -1) : /[\p{L}_]/u.test(p) ? ' Имя ' : '')).join('').replace(/\s+/g, ' ').replace(/\s+([,.!?])/g, '$1');

export default {
  id: 'C-14',
  title: 'Пол игрока',
  plan: false,
  partial: true,
  run(ctx, find) {
    const { tree, st, T } = ctx;
    const self = [T.re('dict.gender_self'), T.re('dict.gender_role', 'self')];
    const you = [T.re('dict.gender_you'), T.re('dict.gender_role', 'you')];
    const hit = (res, text) => res.some((re) => re.test(unquote(text).toLowerCase()));

    // легенда игрока: строки, которые кнопка или #me подставляет через {var}
    const legend = new Map();
    for (const k of tree.knots) {
      walk(k.items, (it) => {
        const m = it.type === 'code' && it.text.match(STRING_ASSIGN);
        if (m) legend.set(m[1], [...(legend.get(m[1]) ?? []), literal(m[2])]);
      });
    }

    for (const k of tree.knots) {
      walk(k.items, (it, path) => {
        const underGender = path.some((p) => (p.type === 'cond' && GENDER_VAR.test(p.head)) || (p.type === 'branch' && GENDER_VAR.test(p.cond)) || (p.type === 'choice' && p.conds.some((c) => GENDER_VAR.test(c))));
        // и строка с условием в фигурных скобках: {gender == 1: ты прав}
        const inlineGender = [...(it.text ?? '').matchAll(/\{([^:{}|]+):/g)].some((m) => GENDER_VAR.test(m[1]));
        if (underGender || inlineGender) return;
        let text = null;
        let via = '';
        if (it.type === 'choice' || it.type === 'me') {
          if (hit(self, it.text)) text = it.text;
          for (const [, v] of it.text.matchAll(/\{\s*([\p{L}_][\p{L}\p{N}_]*)\s*\}/gu)) {
            const said = (legend.get(v) ?? []).find((s) => hit(self, s));
            if (!text && said) { text = said; via = ` (легенда {${v}})`; }
          }
        } else if (it.type === 'msg' && !ctx.service.has(it.who)) text = hit(you, it.text) ? it.text : null;
        if (text) find('C-14.gender', { node: k.id, chapter: st.chapterOf(k.id), message: `«${short(text.trim(), 50)}» в ${k.id}${via} задаёт пол игрока` });
      });
    }
  },
};
