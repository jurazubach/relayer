// C-08. Цена не видна: кнопка снижает переменную, решает финал или меняет то, что читает распределитель,
// а над ней ни слова о риске. Плюс «невидимая обида»: отношение упало, а контакт ведёт себя как прежде.
import { places, short } from '../text.mjs';

export default {
  id: 'C-08',
  title: 'Цена не видна',
  plan: false,
  partial: true,
  run(ctx, find) {
    const { st, T, meta, tree } = ctx;
    const S = new Set([...st.distributors].flatMap((R) => [...st.readsOf(R)]));
    const costly = (b) => {
      if (b.writes.some((x) => S.has(x))) return 'меняет то, что решает финал';
      if (b.choice.items.some((it) => it.type === 'code' && /-=|--/.test(it.text))) return 'снижает переменную';
      const to = b.choice.items.filter((it) => it.type === 'divert').map((it) => it.target);
      if (to.some((t) => st.finals.has(t) || st.finals.has(`${b.knot.split('.')[0]}.${t}`))) return 'ведёт в финал';
      return null;
    };
    const names = [...(meta.characters ?? []).map((c) => c.name), ...Object.values(tree.contacts).map((c) => c.name)]
      .filter((n) => n && n.length > 2).map((n) => n.toLowerCase().slice(0, 4));
    const risk = T.re('dict.risk');
    const deadline = T.re('dict.world_deadline');
    const win = T.value('C-08.window_lines');
    const all = places();
    for (const run of ctx.runs) {
      for (const c of run.choices) {
        c.texts.forEach((text, i) => {
          const b = st.button(c.knot, text);
          const why = b && costly(b);
          if (!why) return;
          const p = all.add(`${c.knot}|${text}`, () => ({ knot: c.knot, chapter: c.chapter, text, why, bare: 0 }));
          if (c.labels[i]?.includes('—')) return;
          const above = run.lines.slice(Math.max(0, c.at - win), c.at).map((l) => l.text.toLowerCase());
          const signal = above.some((t) => risk.test(t) || deadline.test(t) || names.some((n) => t.includes(n)));
          if (!signal) p.bare++;
        });
      }
    }
    for (const p of all.values()) {
      if (p.bare * 2 > p.n) find('C-08.no_signal', { node: p.knot, chapter: p.chapter, message: `${p.knot}: кнопка «${short(p.text)}» ${p.why} без намёка на цену` });
    }

    // невидимая обида: *_trust / *_bond уменьшился, а потом не читается ни в одном узле
    for (const v of st.vars.index.values()) {
      if (!/_(trust|bond)$/.test(v.name)) continue;
      for (const w of v.writes.filter((x) => x.op === '-=' || x.op === '--')) {
        const later = v.reads.some((r) => r.node !== w.node && r.chapter != null && w.chapter != null && r.chapter >= w.chapter);
        if (!later) {
          const who = v.name.replace(/_(trust|bond)$/, '');
          find('C-08.grudge', { node: w.node, chapter: w.chapter, message: `«${v.name}» падает в ${w.node}, но ${who} ведёт себя как прежде — дальше его никто не читает` });
          break;
        }
      }
    }
  },
};
