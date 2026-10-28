// C-25. Ранняя развилка и ветвление по главам: первые выборы ничего не решают, глава без развилок,
// начало не реагирует на игрока.
import { resolveTarget, walk } from '../../lib/ink.mjs';
import { visitShare } from '../journal.mjs';
import { pct } from '../text.mjs';

export default {
  id: 'C-25',
  title: 'Ранняя развилка и ветвление по главам',
  plan: true,
  partial: true,
  run(ctx, find) {
    const { st, T, tree } = ctx;
    // 1. первые две развилки целиком косметические — по большинству прогонов
    if (ctx.runs.length) {
      let cosmetic = 0;
      for (const r of ctx.runs) {
        const first = r.choices.slice(0, T.value('C-25.cosmetic_start'));
        const groups = first.map((c) => st.button(c.knot, c.texts[0])?.group);
        if (first.length === T.value('C-25.cosmetic_start') && groups.every((g) => g?.cosmetic)) cosmetic++;
      }
      if (cosmetic * 2 > ctx.runs.length) find('C-25.cosmetic_start', { chapter: 1, message: 'первые выборы ничего не решают: обе первые развилки косметические' });
    }
    // 2. развилки по главам: узлы, где кнопки или условия ведут в разные узлы. Два разных перехода в одном
    // узле без туннелей возможны только под условием — в том числе однострочным {x: -> a}, которое дерево не разбирает
    const forks = new Map();
    for (const k of tree.knots) {
      const targets = new Set();
      walk(k.items, (it) => {
        if (it.type !== 'divert' || it.kind !== 'divert') return;
        const to = it.target === 'END' || it.target === 'DONE' ? 'END' : resolveTarget(it.target, k.id, st.ids);
        if (to && to !== k.id) targets.add(to);
      });
      if (targets.size >= 2) { const c = st.chapterOf(k.id); forks.set(c, (forks.get(c) ?? 0) + 1); }
    }
    const counts = Array.from({ length: st.lastChapter }, (_, i) => forks.get(i + 1) ?? 0);
    counts.forEach((n, i) => {
      if (i > 0 && n === T.value('C-25.branch_zero')) find('C-25.branch_zero', { node: st.chapterStart.get(i + 1) ?? null, chapter: i + 1, message: `глава ${i + 1}: все развилки сходятся — ни одна кнопка не ведёт в разные узлы` });
    });
    if (st.lastChapter > 1 && Math.max(...counts) - counts.at(-1) > T.value('C-25.last_not_max')) {
      find('C-25.last_not_max', { chapter: st.lastChapter, message: `в последней главе ${counts.at(-1)} развилок, а в главе ${counts.indexOf(Math.max(...counts)) + 1} — ${Math.max(...counts)}: к финалу ветвление не растёт` });
    }
    if (!ctx.runs.length) return;
    // 3. начало не реагирует: прогоны с разным первым выбором читают одни и те же строки
    const win = T.value('C-25.start_lines');
    const byPick = new Map();
    for (const r of ctx.runs) {
      const c = r.choices[0];
      if (!c || c.n < 2) continue;
      const key = c.texts[c.picked];
      if (!byPick.has(key)) byPick.set(key, new Set(r.lines.slice(c.at, c.at + win).map((l) => l.text)));
    }
    const sets = [...byPick.values()];
    if (sets.length >= 2) {
      const [a, b] = sets;
      const same = [...a].filter((x) => b.has(x)).length / Math.max(a.size, b.size, 1);
      if (same > T.value('C-25.same_start')) find('C-25.same_start', { chapter: 1, message: `начало не реагирует на игрока: после разных первых кнопок ${pct(same)} строк совпадают` });
    }
    // 4. в главах 1–2 нет редких узлов (кроме однострочных)
    const visits = visitShare(ctx.runs);
    const early = tree.knots.filter((k) => (st.chapterOf(k.id) ?? 9) <= 2);
    const lines = (k) => { let n = 0; walk(k.items, (it) => { if (it.type === 'msg') n++; }); return n; };
    if (early.length && !early.some((k) => lines(k) > 1 && (visits.get(k.id) ?? 0) < T.value('C-25.rare_early'))) {
      find('C-25.rare_early', { chapter: 1, message: 'в главах 1–2 все узлы видят почти все игроки — начало одинаково для всех' });
    }
  },
};
