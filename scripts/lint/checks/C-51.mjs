// C-51. Знание игрока на пути: реплика без условия опирается на факт, который на части путей ещё не звучал;
// узел говорит как при первой встрече, хотя на другом пути контакт уже знаком. Факт — имя героя или ЧЧ:ММ
// (реестр facts.md — когда появится). Пункт (в) — упоминание непосещённого узла после паузы — не формализован.
import { cleanText } from '../static.mjs';
import { isIncoming } from '../journal.mjs';
import { heroNames, places, short } from '../text.mjs';

export default {
  id: 'C-51',
  title: 'Знание игрока на пути',
  plan: false,
  partial: true,
  run(ctx, find) {
    const { st, T } = ctx;
    const names = [...heroNames(ctx)].filter(([, id]) => !ctx.service.has(id)).map(([name, id]) => ({ key: name.split(/\s+/)[0].slice(0, 4), id, name }));
    const factsOf = (text, who) => {
      const t = text.toLowerCase();
      const out = names.filter((n) => n.id !== who && t.includes(n.key)).map((n) => n.key);
      for (const m of text.match(/\d{1,2}:\d\d/g) ?? []) out.push(m);
      return out;
    };
    const uses = places();
    const met = new Map(); // узел → { known: n, unknown: n, id }
    for (const [ri, run] of ctx.runs.entries()) {
      const known = new Set();
      const writers = new Set();
      let lastKnot = null;
      const enterKnown = new Map();
      for (const item of run.seq) {
        if (item.type === 'choice') {
          item.texts.forEach((txt) => {
            for (const f of factsOf(txt, null)) {
              if (st.condTexts.has(`${item.knot}|${cleanText(txt)}`)) continue;
              const p = uses.add(`${item.knot}|${txt}|${f}`, () => ({ knot: item.knot, chapter: item.chapter, text: txt, fact: f, before: 0, fresh: 0, run: ri + 1 }));
              if (known.has(f)) p.before++; else { p.fresh++; p.run = ri + 1; }
            }
          });
          continue;
        }
        const l = item;
        if (l.knot !== lastKnot) { enterKnown.set(l.knot, new Set(writers)); lastKnot = l.knot; }
        if (!st.condTexts.has(`${l.knot}|${l.text}`) && !l.text.includes('{')) {
          for (const f of factsOf(l.text, l.who)) {
            const p = uses.add(`${l.knot}|${l.text}|${f}`, () => ({ knot: l.knot, chapter: l.chapter, text: l.text, fact: f, before: 0, fresh: 0, run: ri + 1 }));
            if (known.has(f)) p.before++; else { p.fresh++; p.run = ri + 1; }
          }
        }
        for (const f of factsOf(l.text, null)) known.add(f);
        if (isIncoming(l) && l.who) {
          const n = names.find((x) => x.id === l.who);
          if (n) known.add(n.key);
          // узел, где контакт говорит: знаком ли он игроку к входу в узел
          if (!ctx.service.has(l.who) && !st.condTexts.has(`${l.knot}|${l.text}`)) {
            const m = met.get(`${l.knot}|${l.who}`) ?? { knot: l.knot, chapter: l.chapter, who: l.who, known: 0, unknown: 0 };
            if (enterKnown.get(l.knot)?.has(l.who)) m.known++; else m.unknown++;
            met.set(`${l.knot}|${l.who}`, m);
          }
          writers.add(l.who);
        }
      }
    }
    // факт звучит на одних путях до строки, на других — впервые в ней, а строка без условия
    for (const p of uses.values()) {
      if (p.before && p.fresh) find('C-51.unknown_fact', { node: p.knot, chapter: p.chapter, message: `«${p.fact}» упомянуто в ${p.knot} («${short(p.text, 30)}») до того, как игрок о нём узнал (проход #${p.run})` });
    }
    for (const m of met.values()) {
      const preds = new Set();
      for (const [from, edges] of st.edges) if (edges.some((e) => e.to === m.knot)) preds.add(from);
      if (preds.size >= 2 && m.known && m.unknown) find('C-51.met_twice', { node: m.knot, chapter: m.chapter, message: `${m.knot}: ${m.who} на одних путях уже знаком игроку, на других — нет, а говорит одинаково` });
    }
  },
};
