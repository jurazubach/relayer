// C-06. Что читает распределитель финала: одна переменная, нет ранних глав или нет последнего выбора игрока.
export default {
  id: 'C-06',
  title: 'Что читает распределитель финала',
  plan: true,
  partial: false,
  run({ st, T }, find) {
    const N = st.lastChapter;
    const early = N <= T.value('C-06.short_story_chapters') ? 1 : Math.ceil(N * T.value('C-06.early_share'));
    for (const R of st.distributors) {
      const direct = new Set();
      for (const v of st.vars.index.values()) if (v.reads.some((r) => r.node === R && !r.derived)) direct.add(v.name);
      // одна ступень производных: R читает y, y пишется под условием на x — значит, R читает и x
      const S = new Set(direct);
      for (const y of direct) for (const x of st.vars.derive.get(y) ?? []) S.add(x);
      const chaptersOf = (name) => [...new Set(st.vars.index.get(name).writes.map((w) => w.chapter).filter((c) => c != null))].sort((a, b) => a - b);
      const hasChoice = st.hasChoice.has(R);
      const reasons = [];
      let key = null;
      if (!S.size && hasChoice) { reasons.push('финал решает одна кнопка'); key = 'C-06.min_vars'; }
      else if (S.size < T.value('C-06.min_vars')) { reasons.push('решает одна переменная'); key = 'C-06.min_vars'; }
      if (S.size && ![...S].some((x) => chaptersOf(x).some((c) => c <= early))) {
        reasons.push(`нет переменных из глав 1–${early}`);
        key ??= 'C-06.early_share';
      }
      if (!hasChoice && ![...S].some((x) => chaptersOf(x).includes(st.lastChoiceChapter))) {
        reasons.push('нет последнего выбора игрока: финал выбирает скрытая проверка');
        key ??= 'C-06.no_last_choice';
      }
      if (!key) continue;
      const list = [...S].map((x) => `${x} (гл. ${chaptersOf(x).join(', ') || '—'})`);
      find(key, {
        node: R,
        chapter: st.chapterOf(R),
        message: `финал выбирает ${R}: читает ${list.slice(0, 10).join(', ') || 'ничего'}${list.length > 10 ? ` и ещё ${list.length - 10}` : ''}; ${reasons.join('; ')}`,
        data: { reads: [...S], chapters: Object.fromEntries([...S].map((x) => [x, chaptersOf(x)])), reasons },
      });
    }
  },
};
