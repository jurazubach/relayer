// C-49. Факты, хронология, карточка: числа карточки есть в тексте, synopsis не спойлерит поздних героев и
// называет роль игрока, пункты features звучат в истории. Хронология — по docs/stories/<id>/facts.md,
// если он есть; ложь героя помечается «// намеренно: C-49 ложь». Таблица фактов — для глаз, без вердикта.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { walk } from '../../lib/ink.mjs';
import { isIncoming } from '../journal.mjs';
import { roots, short } from '../text.mjs';

export default {
  id: 'C-49',
  title: 'Факты, хронология, карточка',
  plan: false,
  partial: false,
  model: true,
  run(ctx, find) {
    const { st, T, tree, meta, story } = ctx;
    const texts = [];
    for (const k of tree.knots) walk(k.items, (it) => { if ((it.type === 'msg' || it.type === 'me' || it.type === 'sys' || it.type === 'choice') && !('chapter' in (it.tags ?? {}))) texts.push({ text: it.text, knot: k.id, who: it.who }); });
    const all = texts.map((x) => x.text.toLowerCase()).join('\n');
    // (а) числа карточки
    const card = `${meta.tagline ?? ''} ${meta.synopsis ?? ''}`;
    const nums = new Set([...(card.match(/\d+/g) ?? []), ...(card.toLowerCase().match(T.re('dict.numerals').source.includes('|') ? new RegExp(`(?<!\\p{L})(${T.value('dict.numerals')})(?!\\p{L})`, 'gu') : /$^/g) ?? [])]);
    for (const n of nums) if (!all.includes(n)) find('C-49.card_number', { message: `в описании «${n}», в сценарии такого числа нет` });
    // (б) герой из synopsis впервые пишет после главы 2
    const firstCh = new Map();
    for (const k of tree.knots) walk(k.items, (it) => { if (it.type === 'msg' && it.who) { const c = st.chapterOf(k.id); if (!firstCh.has(it.who) || firstCh.get(it.who) > c) firstCh.set(it.who, c); } });
    for (const c of meta.characters ?? []) {
      if (!c.id || !c.name) continue;
      const first = c.name.split(/\s+/)[0].toLowerCase().slice(0, 4);
      if ((meta.synopsis ?? '').toLowerCase().includes(first) && (firstCh.get(c.id) ?? 0) > T.value('C-49.spoiler_chapter')) {
        find('C-49.spoiler_chapter', { message: `synopsis называет «${c.name}», а он пишет впервые в главе ${firstCh.get(c.id)} — спойлер карточки` });
      }
    }
    // (в) роль игрока в synopsis
    if (meta.synopsis && !T.re('dict.player_role').test(meta.synopsis.toLowerCase())) find('C-49.no_role', { message: 'в питче нет роли игрока: ни «ты», ни «вы»' });
    // (г) хронология facts.md: время ЧЧ:ММ, которого в ней нет
    const facts = join('docs/stories', story.id ?? '', 'facts.md');
    if (existsSync(facts)) {
      const known = new Set(readFileSync(facts, 'utf8').match(/\d{1,2}:\d\d/g) ?? []);
      for (const x of texts) for (const t of x.text.match(/\d{1,2}:\d\d/g) ?? []) if (!known.has(t)) find('C-49.facts', { node: x.knot, chapter: st.chapterOf(x.knot), message: `${x.knot}: время ${t} в «${short(x.text, 30)}» — нет в хронологии facts.md` });
    }
    // таблица фактов для глаз: слово-якорь рядом с разными числами
    const win = T.value('C-49.anchor_window');
    const anchors = new Map();
    for (const x of texts) {
      const w = x.text.toLowerCase().match(/[\p{L}\d:]+/gu) ?? [];
      w.forEach((tok, i) => {
        if (!/^\d+$/.test(tok)) return;
        for (const a of w.slice(Math.max(0, i - win), i + win + 1)) {
          if (a.length < T.value('C-49.root') || /\d/.test(a)) continue;
          const r = a.slice(0, T.value('C-49.root'));
          if (!anchors.has(r)) anchors.set(r, new Map());
          anchors.get(r).set(tok, x.knot);
        }
      });
    }
    const table = [...anchors].filter(([, m]) => m.size >= 2).map(([anchor, m]) => ({ anchor, numbers: [...m.keys()], knots: [...new Set(m.values())] }));
    if (table.length) find('C-49.facts', { message: `таблица фактов: ${table.length} слов-якорей стоят рядом с разными числами (${table.slice(0, 4).map((x) => `${x.anchor}…: ${x.numbers.slice(0, 3).join(', ')}`).join('; ')}) — для сверки с хронологией, полная таблица в --json`, data: { table } });
    // (д) synopsis пересказывает первые входящие
    const first = ctx.runs[0]?.lines.filter(isIncoming).slice(0, T.value('C-49.overlap_lines')) ?? [];
    const head = new Set();
    for (const l of first) for (const m of l.text.match(/\p{Lu}\p{Ll}{2,}|\d+/gu) ?? []) head.add(m.toLowerCase().slice(0, 4));
    const syn = new Set((meta.synopsis ?? '').match(/\p{Lu}\p{Ll}{2,}|\d+/gu)?.map((m) => m.toLowerCase().slice(0, 4)) ?? []);
    const overlap = [...syn].filter((x) => head.has(x));
    if (overlap.length > T.value('C-49.synopsis_overlap')) find('C-49.synopsis_overlap', { message: `synopsis и первые входящие совпадают на ${overlap.length} конкретных (${overlap.join(', ')}) — карточка пересказывает начало` });
    // (е) пункты features звучат в тексте, хотя бы один — в главе 1
    const n = T.value('C-49.root');
    const textRoots = new Set(texts.flatMap((x) => [...roots(x.text, n)]));
    const ch1Roots = new Set(texts.filter((x) => st.chapterOf(x.knot) === 1).flatMap((x) => [...roots(x.text, n)]));
    let inCh1 = 0;
    for (const f of meta.features ?? []) {
      const rs = [...roots(f, n)];
      if (!rs.some((r) => textRoots.has(r))) find('C-49.feature_absent', { message: `пункт карточки «${short(f)}» не звучит ни в одной реплике и кнопке` });
      if (rs.some((r) => ch1Roots.has(r))) inCh1++;
    }
    if ((meta.features ?? []).length && inCh1 === T.value('C-49.feature_ch1')) find('C-49.feature_ch1', { chapter: 1, message: 'ни один пункт карточки не звучит в главе 1 — обещание сбывается слишком поздно' });
  },
};
