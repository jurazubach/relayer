// C-09. Хрупкие условия и лишние переменные: семь правил, каждое — подсказка.
import { walk } from '../../lib/ink.mjs';
import { pct, plural } from '../text.mjs';

const IDENT = /[\p{L}_][\p{L}\p{N}_]*/gu;
const names = (s) => String(s).replace(/"[^"]*"/g, ' ').match(IDENT) ?? [];
const opsIn = (s) => (String(s).match(/&&|\|\||(^|\s)(and|or)(\s|$)/g) ?? []).length;

export default {
  id: 'C-09',
  title: 'Хрупкие условия и лишние переменные',
  plan: true,
  partial: false,
  run(ctx, find) {
    const { st, T, tree } = ctx;
    const idx = st.vars.index;
    const grows = (v) => v.writes.length && v.writes.every((w) => w.op === '++' || (w.op === '+=' && !/^-/.test(w.rhs)));
    const shrinks = (v) => v.writes.length && v.writes.every((w) => w.op === '--' || (w.op === '-=' && !/^-/.test(w.rhs)));
    const S = new Set([...st.distributors].flatMap((R) => [...st.readsOf(R)]));
    const at = (k) => ({ node: k.id, chapter: st.chapterOf(k.id) });

    for (const k of tree.knots) {
      walk(k.items, (it) => {
        // однострочные {cond: …} дерево не разбирает на ветки — их заголовки берём из текста
        const inline = it.type === 'msg' || it.type === 'me' ? [...it.text.matchAll(/\{([^{}:]+):/g)].map((m) => m[1]) : [];
        const conds = it.type === 'choice' ? it.conds : it.type === 'cond' ? [it.head, ...it.branches.map((b) => b.cond)] : inline;
        for (const c of conds) {
          if (c && opsIn(c) >= T.value('C-09.ops')) find('C-09.ops', { ...at(k), message: `${k.id}: условие «${c}» из ${opsIn(c) + 1} частей — замени стадией` });
        }
        if (it.type === 'choice') {
          for (const c of it.conds) {
            for (const m of c.matchAll(/([\p{L}_][\p{L}\p{N}_]*)\s*(<=|<)\s*(\d+)/gu)) {
              const v = idx.get(m[1]);
              if (v && grows(v) && T.value('C-09.growing_lt') === 0) find('C-09.growing_lt', { ...at(k), message: `«${m[1]}» только растёт, а вариант «${it.text}» в ${k.id} пропадает при ${m[1]} ≥ ${m[3]}` });
              if (v && m[2] === '<=' && shrinks(v)) find('C-09.shrinking_le', { ...at(k), message: `«${m[1]}» только убывает и сравнивается с <= в ${k.id} — переверни в растущую` });
            }
            // ветка кнопки с условием на x снова повышает x — сильный подход разгоняется сам
            const vs = names(c).filter((x) => idx.has(x));
            walk(it.items, (sub) => {
              if (sub.type !== 'code') return;
              const m = sub.text.match(/^([\p{L}_][\p{L}\p{N}_]*)\s*(\+\+|\+=)/u);
              if (m && vs.includes(m[1])) find('C-09.self_boost', { ...at(k), message: `${k.id}: кнопка «${it.text}» требует ${m[1]} и снова его повышает — подход разгоняется сам` });
            });
          }
        }
        // распределитель и финалы сами раскладывают итог по веткам — это механика финала, а не подарок игроку
        if (it.type === 'cond' && !st.distributors.has(k.id) && !st.finals.has(k.id)) {
          for (const b of it.branches) {
            const free = b.cond === 'else' || /==\s*0|not\s|!\s*[\p{L}_]/u.test(b.cond);
            if (!free) continue;
            walk(b.items, (sub) => {
              const m = sub.type === 'code' && sub.text.match(/^([\p{L}_][\p{L}\p{N}_]*)\s*(=|\+=|\+\+)/u);
              if (m && S.has(m[1])) find('C-09.free_final', { ...at(k), message: `${k.id}: «${m[1]}», которую читает финал, ставится в ветке «${b.cond}» — игрок получает её, ничего не сделав` });
            });
          }
        }
      });
    }

    const vars = [...idx.values()].filter((v) => v.name !== 'bug' && (v.writes.length || v.reads.length));
    const through = vars.filter((v) => {
      const wc = new Set(v.writes.map((w) => w.chapter).filter((c) => c != null));
      return v.reads.some((r) => r.chapter != null && [...wc].some((c) => c !== r.chapter));
    });
    if (through.length > T.value('C-09.through_vars')) {
      find('C-09.through_vars', { message: `${plural(through.length, 'сквозная переменная', 'сквозные переменные', 'сквозных переменных')} (запись и чтение в разных главах) — автор их не удержит: ${through.slice(0, 8).map((v) => v.name).join(', ')}…` });
    }
    const once = vars.filter((v) => v.writes.length && v.reads.filter((r) => !r.derived).length <= T.value('C-09.single_read'));
    if (vars.length && once.length / vars.length > T.value('C-09.single_read_share')) {
      find('C-09.single_read_share', { message: `${pct(once.length / vars.length)} переменных прочитаны не больше одного раза: ${once.slice(0, 6).map((v) => v.name).join(', ')}${once.length > 6 ? '…' : ''}` });
    }
  },
};
