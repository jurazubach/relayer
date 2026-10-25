// C-54. Честная игра улик: к узлу раскрытия (метка «// reveal: clue_a, clue_b» над ним) игрок приходит
// с уликами, одна из них видна всегда, между последней уликой и раскрытием есть выбор, виновник появляется
// рано, верная кнопка не выдаёт себя длиной. Без разметки проверка молчит. Виновник — строка «виновник: <id>»
// в docs/stories/<id>/facts.md.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pct, short } from '../text.mjs';

const truthy = (v) => !(v === 0 || v === false || v === '' || v === '0' || v === 'false' || v == null);

export default {
  id: 'C-54',
  title: 'Честная игра улик',
  plan: false,
  partial: false,
  run(ctx, find) {
    const { st, T, tree, story } = ctx;
    const reveals = tree.knots.flatMap((k) => k.marks.filter((m) => m.kind === 'reveal').map((m) => ({ at: k.id, clues: m.value.split(/[,\s]+/).filter(Boolean) })));
    if (!reveals.length) return;
    const init = new Map(tree.vars.filter((v) => v.kind === 'VAR').map((v) => [v.name, v.value.replace(/^"|"$/g, '')]));
    for (const { at, clues } of reveals) {
      const where = { node: at, chapter: st.chapterOf(at) };
      let reached = 0;
      let enough = 0;
      let gapless = 0;
      const seen = new Map(clues.map((c) => [c, 0]));
      for (const run of ctx.runs) {
        const enter = run.lines.find((l) => l.knot === at);
        if (!enter) continue;
        reached++;
        const state = new Map(clues.map((c) => [c, init.get(c)]));
        let lastSet = -1;
        for (const e of run.vars) {
          if (e.at > enter.i) break;
          if (state.has(e.name)) { state.set(e.name, e.value); if (truthy(e.value)) lastSet = e.at; }
        }
        const have = clues.filter((c) => truthy(state.get(c)));
        have.forEach((c) => seen.set(c, seen.get(c) + 1));
        if (have.length >= T.value('C-54.min_clues')) enough++;
        if (lastSet >= 0 && !run.choices.some((c) => c.at > lastSet && c.at <= enter.i)) gapless++;
      }
      if (!reached) continue;
      if (enough / reached < T.value('C-54.clue_share')) find('C-54.min_clues', { ...where, message: `улики: «${clues.join(', ')}» — в ${pct(1 - enough / reached)} прогонов игрок дошёл до ${at} меньше чем с ${T.value('C-54.min_clues')} уликами` });
      const best = Math.max(...seen.values()) / reached;
      if (best < T.value('C-54.sure_clue')) find('C-54.sure_clue', { ...where, message: `ни одну улику к ${at} не видят все: самая частая — в ${pct(best)} прогонов` });
      if (gapless && gapless * 2 > reached) find('C-54.gap_choice', { ...where, message: `между последней уликой и ${at} нет ни одного выбора — игроку некогда подумать` });
    }
    // виновник из facts.md: когда он впервые пишет и не выдаёт ли себя кнопка
    const facts = join('docs/stories', story.id ?? '', 'facts.md');
    const culprit = existsSync(facts) ? readFileSync(facts, 'utf8').match(/виновник\s*[:—-]\s*`?([\p{L}\p{N}_]+)/u)?.[1] : null;
    if (!culprit) return;
    const shares = ctx.runs.map((r) => { const i = r.lines.findIndex((l) => l.who === culprit); return i < 0 ? null : i / r.lines.length; }).filter((x) => x != null);
    if (shares.length) {
      const late = shares.sort((a, b) => a - b)[Math.floor(shares.length / 2)];
      const key = late > T.value('C-54.culprit_error') ? 'C-54.culprit_error' : late > T.value('C-54.culprit_late') ? 'C-54.culprit_late' : null;
      if (key) find(key, { message: `виновник ${culprit} впервые пишет на ${pct(late)} пути — честной игре нужна первая треть` });
    }
    const name = (ctx.meta.characters ?? []).find((c) => c.id === culprit)?.name?.toLowerCase().slice(0, 4) ?? culprit;
    for (const { at } of reveals) {
      for (const g of st.buttons.groups.filter((x) => x.knot === at)) {
        const right = g.buttons.find((b) => b.text.toLowerCase().includes(name));
        const min = Math.min(...g.buttons.map((b) => b.text.length));
        if (right && right.text.length > T.value('C-54.long_answer') * min) find('C-54.long_answer', { node: at, chapter: st.chapterOf(at), message: `${at}: верная кнопка «${short(right.text)}» заметно длиннее остальных — ответ угадывается по длине` });
      }
    }
  },
};
