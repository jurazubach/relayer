// C-21. Собеседники и новые контакты: толпа до первой кнопки и в главе, #unlock пачкой и сразу после паузы.
import { walk } from '../../lib/ink.mjs';
import { isIncoming, median } from '../journal.mjs';
import { plural } from '../text.mjs';

export default {
  id: 'C-21',
  title: 'Собеседники и новые контакты',
  plan: true,
  partial: true,
  run(ctx, find) {
    const { st, T, tree } = ctx;
    // контакты без единого #from и служебные (dict.service_contacts, service: true в meta.json) не считаем
    const writers = new Set();
    for (const k of tree.knots) walk(k.items, (it) => { if (it.tags?.from && !ctx.service.has(it.tags.from)) writers.add(it.tags.from); });

    const before = [];
    const firstChapter = new Map(); // id -> [глава первого появления по прогонам]
    const unlockScene = new Map();
    const unlockPause = new Set();
    const longPause = T.value('story.pause.long_s');
    const afterPause = T.value('C-21.unlock_after_pause_lines');
    for (const run of ctx.runs) {
      const firstAt = run.choices[0]?.at ?? run.lines.length;
      before.push(new Set(run.lines.slice(0, firstAt).filter((l) => isIncoming(l) && l.who && !ctx.service.has(l.who)).map((l) => l.who)).size);
      const seen = new Map();
      const note = (id, chapter) => { if (writers.has(id) && !seen.has(id)) seen.set(id, chapter); };
      let ci = 0;
      for (const item of run.seq) {
        if (item.type === 'choice') { item.tos.forEach((t) => t && note(t, item.chapter)); ci = 0; continue; }
        if (isIncoming(item) && item.who) note(item.who, item.chapter);
        for (const u of item.unlock) note(u, item.chapter);
        ci += item.unlock.length;
        if (ci > T.value('C-21.unlock_scene') && item.unlock.length) unlockScene.set(item.knot, Math.max(unlockScene.get(item.knot) ?? 0, ci));
      }
      run.lines.forEach((l, i) => {
        if (l.delay < longPause) return;
        if (run.lines.slice(i, i + afterPause).some((x) => x.unlock.length)) unlockPause.add(l.knot);
      });
      for (const [id, ch] of seen) {
        if (!firstChapter.has(id)) firstChapter.set(id, []);
        firstChapter.get(id).push(ch);
      }
    }
    const n = median(before);
    if (n != null && n > T.value('C-21.from_before_first')) {
      find('C-21.from_before_first', { chapter: 1, message: `до первой кнопки пишут ${plural(n, 'собеседник', 'собеседника', 'собеседников')} — оставь одного, остальных через #unlock` });
    }
    const byChapter = new Map();
    for (const [id, chs] of firstChapter) {
      const ch = median(chs);
      if (!byChapter.has(ch)) byChapter.set(ch, []);
      byChapter.get(ch).push(id);
    }
    const short = ctx.meta.minutes != null && ctx.meta.minutes <= T.value('story.short_min');
    for (const [k, ids] of [...byChapter].sort((a, b) => a[0] - b[0])) {
      const key = k === 1 ? (short ? 'C-21.new_ch1_short' : 'C-21.new_ch1') : 'C-21.new_other';
      if (ids.length > T.value(key)) {
        find(key, { chapter: k, message: `в главе ${k} впервые появляются ${plural(ids.length, 'контакт', 'контакта', 'контактов')}: ${ids.join(', ')}`, data: { contacts: ids } });
      }
    }
    for (const [knot, c] of unlockScene) {
      find('C-21.unlock_scene', { node: knot, chapter: st.chapterOf(knot), message: `${knot}: ${c} #unlock между двумя кнопками — новые чаты пачкой` });
    }
    for (const knot of unlockPause) {
      find('C-21.unlock_after_pause_lines', { node: knot, chapter: st.chapterOf(knot), message: `${knot}: новый контакт сразу после долгой паузы — игрок вернулся и не понимает, кто это` });
    }
  },
};
