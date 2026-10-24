// C-47. Маркеры в тексте: семейство регулярок, каждая — своя строка отчёта. Регулярки ловят кандидатов,
// решает ревьюер. Три маркера — по решениям автора: упрёк за отсутствие, прожитое ожидание, время игрока.
import { walk } from '../../lib/ink.mjs';
import { isIncoming, norm } from '../journal.mjs';
import { pct, places, short, wordCount } from '../text.mjs';

export default {
  id: 'C-47',
  title: 'Маркеры в тексте',
  plan: false,
  partial: true,
  model: true,
  run(ctx, find) {
    const { st, T, tree } = ctx;
    const re = (k) => T.re(k);
    const feelings = new Map();
    for (const k of tree.knots) {
      const at = { node: k.id, chapter: st.chapterOf(k.id) };
      walk(k.items, (it, path) => {
        const t = it.text?.toLowerCase() ?? '';
        const inCond = path.some((p) => p.type === 'cond');
        const inChoice = path.some((p) => p.type === 'choice');
        const silentChoice = path.some((p) => p.type === 'choice' && 'silent' in p.tags);
        if (it.type === 'msg' && !ctx.service.has(it.who)) {
          if (re('dict.exposition').test(t)) find('C-47.exposition', { ...at, message: `${k.id}: «${short(it.text)}» — экспозиция справкой` });
          if (re('dict.feeling').test(t)) {
            const key = `${it.who}|${at.chapter}`;
            const list = feelings.get(key) ?? [];
            list.push({ ...at, text: it.text });
            feelings.set(key, list);
          }
          if (re('dict.blame').test(t) && !inCond && !inChoice) find('C-47.blame', { ...at, message: `${k.id}: «${short(it.text)}» — упрёк без основания` });
          if (re('dict.absence_reproach').test(t) && !silentChoice && !inCond) find('C-47.absence', { ...at, message: `${k.id}: «${short(it.text)}» — упрёк за отсутствие: игрок мог просто отложить телефон (A-03)` });
          if (re('dict.player_time').test(t)) find('C-47.player_time', { ...at, message: `${k.id}: «${short(it.text)}» — угадывает время игрока; время суток — время мира (A-02)` });
          // упрёк в ветке else порога по доверию
          const elseOfTrust = path.some((p, i) => p.type === 'branch' && p.cond === 'else' && /_trust|_bond|proof/.test(path[i - 1]?.head ?? '') ) ||
            path.some((p, i) => p.type === 'branch' && p.cond === 'else' && path[i - 1]?.branches?.some((b) => /_trust|_bond|proof/.test(b.cond)));
          if (elseOfTrust && (re('dict.blame').test(t) || re('dict.absence_reproach').test(t))) find('C-47.blame_else', { ...at, message: `${k.id}: «${short(it.text)}» — упрёк в ветке else порога` });
        }
        if ((it.type === 'sys' || (it.type === 'msg' && 'photo' in it.tags)) && re('dict.subtext').test(t)) find('C-47.subtext', { ...at, message: `${k.id}: «${short(it.text)}» — ремарка объясняет подтекст` });
        if (it.type === 'sys' && wordCount(it.text) > T.value('style.sys_words')) find('style.sys_words', { ...at, message: `${k.id}: #sys «${short(it.text)}» — ${wordCount(it.text)} слов` });
      });
    }
    for (const list of feelings.values()) {
      if (list.length > T.value('C-47.feeling')) find('C-47.feeling', { node: list[0].node, chapter: list[0].chapter, message: `${list[0].node}: прямое чувство ${list.length} раз за главу у одного контакта («${short(list[0].text, 30)}»)` });
    }

    // по журналу: похвала за выбор, прожитое ожидание после паузы, предыстория блоком, «что делать»
    const praise = new Set();
    const waited = places();
    const backstory = places();
    const asks = new Map(); // глава → { points, asks }
    const notice = T.value('story.pause.notice_min') * 60;
    for (const run of ctx.runs) {
      for (const c of run.choices) {
        const next = run.lines.slice(c.at).find(isIncoming);
        if (next && re('dict.praise').test(norm(next.text))) praise.add(`${next.knot}|${next.text}`);
        const before = run.lines.slice(0, c.at).filter(isIncoming).at(-1);
        const a = asks.get(c.chapter) ?? new Map();
        a.set(c.key, before ? re('dict.ask_advice').test(before.text.toLowerCase()) : false);
        asks.set(c.chapter, a);
      }
      run.lines.forEach((l, i) => {
        if (l.delay < notice || i === 0) return;
        const hit = run.lines.slice(i, i + T.value('C-47.lived_wait_lines')).find((x) => isIncoming(x) && re('dict.lived_wait').test(x.text.toLowerCase()));
        if (hit) waited.add(`${hit.knot}|${hit.text}`, () => ({ knot: hit.knot, text: hit.text }));
      });
      let streak = [];
      for (const l of run.lines.filter(isIncoming)) {
        if (re('dict.past').test(l.text.toLowerCase()) && !l.text.includes('?')) streak.push(l); else streak = [];
        if (streak.length === T.value('C-47.backstory')) backstory.add(streak[0].knot, () => ({ knot: streak[0].knot, text: streak[0].text }));
      }
    }
    if (praise.size > T.value('C-47.praise')) find('C-47.praise', { message: `${praise.size} раз первая реплика после кнопки хвалит выбор («${short([...praise][0].split('|')[1], 30)}») — игрока ведут к «правильному» ответу` });
    for (const p of waited.values()) find('C-47.lived_wait', { node: p.knot, chapter: st.chapterOf(p.knot), message: `${p.knot}: «${short(p.text)}» после паузы — в «по клику» ожидания не было (R-122)` });
    for (const p of backstory.values()) find('C-47.backstory', { node: p.knot, chapter: st.chapterOf(p.knot), message: `${p.knot}: предыстория блоком с «${short(p.text, 30)}»` });
    for (const [ch, m] of asks) {
      const share = [...m.values()].filter(Boolean).length / m.size;
      if (share > T.value('C-47.ask_share')) find('C-47.ask_share', { chapter: ch, message: `глава ${ch}: перед ${pct(share)} развилок собеседник спрашивает «что делать» — выбор за игрока формулирует NPC` });
    }
  },
};
