// C-52. Служебные проверки бота: петли, вход в середину чужой главы, тестовые входы, утверждения VAR bug.
// Транскрипты (правило 5) — флаг story:lint --transcript N.

export default {
  id: 'C-52',
  title: 'Служебные проверки бота',
  plan: true,
  partial: true,
  run(ctx, find) {
    const { st, T, tree } = ctx;
    // 2. переход в узел чужой главы, а не в её начало и не в финал; общие узлы до первой главы — не чужие
    const starts = new Set(st.chapterStart.values());
    for (const [from, edges] of st.edges) {
      const a = st.chapterOf(from);
      for (const e of edges) {
        if (e.kind === 'tunnel' || e.to === 'END' || e.to === '->->' || e.to === from) continue;
        const k = st.byId.get(e.to);
        if (!k || k.chapter === 0) continue;
        const b = st.chapterOf(e.to);
        if (b === a || starts.has(e.to) || st.finals.has(e.to) || e.to.startsWith('test_') || e.to === 'beta_stop') continue;
        find('C-52.mid_chapter', { node: from, chapter: a, message: `${from} ведёт в середину главы ${b} (${e.to})` });
      }
    }
    // 3. в test_* ведут только test_*
    for (const [from, edges] of st.edges) {
      if (from.startsWith('test_')) continue;
      for (const e of edges) if (e.to.startsWith('test_')) find('C-52.test_entry', { node: from, chapter: st.chapterOf(from), message: `${from} ведёт в тестовый узел ${e.to} — игрок попадёт в отладку` });
    }
    if (ctx.plan) return;
    // 1. петли: узел больше N раз за прогон
    const loops = new Map();
    for (const run of ctx.runs) {
      for (const [k, c] of run.visits ?? []) if (c > T.value('C-52.loop')) loops.set(k, Math.max(loops.get(k) ?? 0, c));
    }
    for (const [k, c] of loops) find('C-52.loop', { node: k, chapter: st.chapterOf(k), message: `${k} посещён ${c} раз за прогон — доли финалов искажены петлёй` });
    // 4. утверждения: VAR bug непустая — ошибка с текстом
    if (tree.vars.some((v) => v.name === 'bug')) {
      const seen = new Set();
      for (const run of ctx.runs) {
        for (const e of run.vars) {
          if (e.name !== 'bug' || !e.value || e.value === 0 || seen.has(`${e.knot}|${e.value}`)) continue;
          seen.add(`${e.knot}|${e.value}`);
          find('C-52.assert', { node: e.knot, chapter: e.knot ? st.chapterOf(e.knot) : null, message: `утверждение сработало в ${e.knot ?? '?'}: ${e.value}` });
        }
      }
    }
  },
};
