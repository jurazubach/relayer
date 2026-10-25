// C-15. Недостижимое: условная кнопка не показана ни разу, редкий вариант, порог выше максимума переменной,
// блок без else, узел, куда бот почти не заходит. Случайный бот недооценивает целенаправленную игру.
import { walk } from '../../lib/ink.mjs';
import { cleanText } from '../static.mjs';
import { visitShare } from '../journal.mjs';
import { pct, short } from '../text.mjs';

const num = (v) => (typeof v === 'number' ? v : v === true ? 1 : v === false ? 0 : Number(v));

export default {
  id: 'C-15',
  title: 'Недостижимое',
  plan: false,
  partial: false,
  run(ctx, find) {
    const { st, T, tree } = ctx;
    const runs = ctx.runs;
    if (!runs.length) return;
    // показы кнопок по прохождениям, а не по показам
    const shown = new Map();
    for (const r of runs) {
      const seen = new Set();
      for (const c of r.choices) for (const t of c.texts) seen.add(`${c.knot}|${cleanText(t)}`);
      for (const k of seen) shown.set(k, (shown.get(k) ?? 0) + 1);
    }
    const visits = visitShare(runs);
    for (const b of st.buttons.list) {
      if (!b.conds.length || /\{/.test(b.text) || !cleanText(b.text) || b.knot.startsWith('test_')) continue;
      if (!visits.get(b.knot)) continue; // в узел не зашли — это (д), а не условие
      const n = shown.get(`${b.knot}|${cleanText(b.text)}`) ?? 0;
      if (n === T.value('C-15.never')) find('C-15.never', { node: b.knot, chapter: b.chapter, message: `вариант «${short(b.text)}» не показан ни разу за ${runs.length} прохождений — условие {${b.conds.join('} {')}} перекрыто или недостижимо` });
      else if (n / runs.length < T.value('C-15.rare_button')) find('C-15.rare_button', { node: b.knot, chapter: b.chapter, message: `вариант «${short(b.text)}» показан в ${pct(n / runs.length)} прохождений` });
    }

    // (в) порог x >= N выше максимума x по прогонам
    const init = new Map(tree.vars.filter((v) => v.kind === 'VAR').map((v) => [v.name, num(v.value)]));
    const max = new Map(init);
    for (const r of runs) for (const e of r.vars) { const x = num(e.value); if (Number.isFinite(x) && x > (max.get(e.name) ?? -Infinity)) max.set(e.name, x); }
    const reported = new Set();
    for (const k of tree.knots) {
      walk(k.items, (it) => {
        const conds = it.type === 'choice' ? it.conds : it.type === 'cond' ? [it.head, ...it.branches.map((b) => b.cond)] : [];
        for (const c of conds) {
          for (const m of String(c).matchAll(/([\p{L}_][\p{L}\p{N}_]*)\s*(>=|>)\s*(\d+)/gu)) {
            const need = Number(m[3]) + (m[2] === '>' ? 1 : 0);
            const top = max.get(m[1]);
            if (top == null || !Number.isFinite(top) || top >= need || reported.has(`${k.id}|${m[0]}`)) continue;
            reported.add(`${k.id}|${m[0]}`);
            find('C-15.threshold_unreached', { node: k.id, chapter: st.chapterOf(k.id), message: `${m[0]} в ${k.id}: ${m[1]} не поднимался выше ${top} за ${runs.length} прохождений` });
          }
        }
        if (it.type === 'cond' && it.branches.length >= 2 && !it.branches.some((b) => b.cond === 'else')) {
          find('C-15.no_else', { node: k.id, chapter: st.chapterOf(k.id), message: `${k.id}: блок из ${it.branches.length} веток без else` });
        }
      });
    }

    // (д) редкий узел: не финал и не test_*
    for (const k of tree.knots) {
      if (st.finals.has(k.id) || k.id.startsWith('test_') || k.id === 'beta_stop') continue;
      const v = visits.get(k.id) ?? 0;
      if (v < T.value('C-15.rare_node')) find('C-15.rare_node', { node: k.id, chapter: st.chapterOf(k.id), message: `${k.id}: посещён в ${pct(v)} прогонов — достижим ли он целенаправленно?` });
    }
  },
};
