// C-11. Молчание и отказ без следа: «Промолчать» никто не заметил, отказ не запомнен, молчание наказано.
import { parseDelay, resolveTarget, walk } from '../../lib/ink.mjs';
import { short } from '../text.mjs';

export default {
  id: 'C-11',
  title: 'Молчание и отказ без следа',
  plan: true,
  partial: true,
  run(ctx, find) {
    const { st, T } = ctx;
    const buttons = st.buttons.list;

    const landing = (b) => {
      let to = null;
      walk(b.choice.items, (it) => {
        if (to || it.type !== 'divert' || it.kind !== 'divert') return;
        to = it.target === 'END' || it.target === 'DONE' ? 'END' : resolveTarget(it.target, b.knot, st.ids) ?? it.target;
      });
      return to ?? `сборка ${b.knot}:${b.group.line}`;
    };

    // (а) #silent без следа: нет ~, нет реплики, нет паузы от порога до сборки — и либо сразу сборка,
    // либо переход туда же, куда ведёт соседняя кнопка (молчание ничем не отличается от ответа)
    const silent = buttons.filter((b) => b.silent);
    const noticedDelay = T.value('C-11.silent_noticed_delay_s');
    const says = (b) => { let yes = false; walk(b.choice.items, (it) => { if (['msg', 'me', 'sys'].includes(it.type)) yes = true; }); return yes; };
    const sameAsNeighbour = (b) => b.cls === 'node' && !b.writes.length && !says(b) && b.group.buttons.some((o) => o !== b && landing(o) === landing(b));
    const unnoticed = silent.filter((b) => {
      if (b.cls !== 'none' && !sameAsNeighbour(b)) return false;
      let delay = 0;
      walk(b.choice.items, (it) => { if (it.tags?.delay) delay += parseDelay(it.tags.delay); });
      return delay < noticedDelay;
    });
    if (unnoticed.length) {
      const share = unnoticed.length / silent.length;
      const where = [...new Set(unnoticed.map((b) => b.knot))];
      const key = share > T.value('C-11.silent_unnoticed_share') ? 'C-11.silent_unnoticed_share' : 'C-11.silent_unnoticed';
      find(key, {
        node: key === 'C-11.silent_unnoticed' ? where[0] : null,
        message: `«Промолчать» никто не заметил: ${unnoticed.length} из ${silent.length} #silent без реакции и следа (${where.slice(0, 6).join(', ')}${where.length > 6 ? ' …' : ''})`,
        data: { unnoticed: unnoticed.length, silent: silent.length, nodes: where },
      });
    }

    // (б) отказ без ~, который за ≤ N переходов сходится туда же, куда согласие
    const refusal = T.re('dict.refusal');
    const hops = T.value('C-11.refusal_hops');
    const reach = (start) => {
      const seen = new Set([start]);
      let front = [start];
      for (let h = 1; h < hops; h++) {
        const next = [];
        for (const id of front) for (const e of st.edges.get(id) ?? []) if (e.kind === 'divert' && !seen.has(e.to)) { seen.add(e.to); next.push(e.to); }
        front = next;
      }
      return seen;
    };
    for (const b of buttons) {
      if (b.writes.length || !refusal.test(b.text.toLowerCase().trim())) continue;
      const mine = reach(landing(b));
      const same = b.group.buttons.find((o) => o !== b && !refusal.test(o.text.toLowerCase().trim()) && [...reach(landing(o))].some((x) => mine.has(x)));
      if (same) {
        find('C-11.refusal_hops', { node: b.knot, chapter: b.chapter, message: `отказ «${short(b.text)}» в ${b.knot} нигде не запомнен и сходится с «${short(same.text, 30)}»` });
      }
    }

    // (в) молчание наказано: после #silent бот ни разу не получил следующей кнопки, после соседнего варианта — получал
    if (ctx.plan) return;
    const finalVars = new Set();
    for (const R of st.distributors) for (const v of st.vars.index.values()) if (v.reads.some((r) => r.node === R)) finalVars.add(v.name);
    const points = new Map();
    for (const run of ctx.runs) {
      for (const c of run.choices) {
        if (!points.has(c.key)) points.set(c.key, { c, picks: new Map() });
        const p = points.get(c.key).picks;
        const s = p.get(c.picked) ?? { n: 0, next: 0 };
        s.n++;
        if (c.i < run.choices.length - 1) s.next++;
        p.set(c.picked, s);
      }
    }
    for (const { c, picks } of points.values()) {
      c.silent.forEach((isSilent, idx) => {
        if (!isSilent) return;
        const s = picks.get(idx);
        if (!s || s.next) return;
        if (![...picks].some(([j, o]) => j !== idx && o.next)) return;
        // финальная дилемма: #silent пишет переменную распределителя — осознанный финальный ход (meaningful-choice:P-11)
        const b = buttons.find((x) => x.knot === c.knot && x.text === c.texts[idx]);
        if (b && b.writes.some((w) => finalVars.has(w))) return;
        find('C-11.silent_punished', { node: c.knot, chapter: c.chapter, message: `${c.knot}: молчание сразу ведёт к финалу, остальные варианты — дальше` });
      });
    }
  },
};
