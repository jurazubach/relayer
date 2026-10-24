// C-20. Первая кнопка: сколько игрок читает до первого выбора — в начале истории и в начале каждой главы.
import { isIncoming, median } from '../journal.mjs';
import { fmtDur, plural } from '../text.mjs';

export default {
  id: 'C-20',
  title: 'Первая кнопка',
  plan: false,
  partial: true,
  run(ctx, find) {
    const { T } = ctx;
    const startMsgs = [];
    const startTime = [];
    const chapters = new Map(); // глава -> { knot, msgs[], empty[] }
    for (const run of ctx.runs) {
      const first = run.choices[0];
      if (!first) continue;
      const before = run.lines.slice(0, first.at);
      startMsgs.push(before.filter(isIncoming).length);
      startTime.push(before.reduce((s, l) => s + l.delay + l.gap + l.typing, 0));
      for (const l of run.lines) {
        // глава, которая открывается до первой кнопки истории, — это начало, его меряет первая часть
        if (!l.isChapter || l.i < first.at) continue;
        const next = run.choices.find((c) => c.at > l.i);
        if (!next) continue;
        const seg = run.lines.slice(l.i, next.at);
        const ch = chapters.get(l.chapter) ?? { knot: l.knot, msgs: [], empty: [] };
        ch.msgs.push(seg.filter(isIncoming).length);
        ch.empty.push(seg.slice(1).reduce((s, x) => s + x.delay, 0));
        chapters.set(l.chapter, ch);
      }
    }
    if (startMsgs.length) {
      const n = median(startMsgs);
      const t = median(startTime);
      const target = `цель ≤ ${T.value('C-20.start_msgs_target')} и ≤ ${T.value('C-20.start_time_target_s')} с`;
      const key = n > T.value('C-20.start_msgs') ? 'C-20.start_msgs' : t > T.value('C-20.start_time_s') ? 'C-20.start_time_s' : null;
      if (key) {
        const first = ctx.runs.find((r) => r.choices[0])?.choices[0];
        find(key, { node: first?.knot, chapter: 1, message: `первая кнопка через ${plural(n, 'сообщение', 'сообщения', 'сообщений')} и ${fmtDur(t)} — игрок ещё зритель (${target})`, data: { msgs: n, seconds: t } });
      }
    }
    for (const [k, ch] of [...chapters].sort((a, b) => a[0] - b[0])) {
      const n = median(ch.msgs);
      const e = median(ch.empty);
      if (n > T.value('C-20.chapter_msgs')) {
        find('C-20.chapter_msgs', { node: ch.knot, chapter: k, message: `глава ${k}: первая кнопка только на ${n + 1}-м сообщении` });
      }
      if (e > T.value('C-20.chapter_empty_s')) {
        find('C-20.chapter_empty_s', { node: ch.knot, chapter: k, message: `глава ${k}: до первой кнопки ${fmtDur(e)} пауз — пустой вход в главу` });
      }
    }
  },
};
