// C-34. Длина сообщения: стена текста в пузыре. #photo меряется числом имён (C-22), а не длиной.
import { isIncoming, median } from '../journal.mjs';
import { pct, short } from '../text.mjs';

export default {
  id: 'C-34',
  title: 'Длина сообщения',
  plan: false,
  partial: true,
  run(ctx, find) {
    const { T } = ctx;
    const unique = new Map();
    const opening = new Map();
    const o = T.value('C-34.opening');
    for (const run of ctx.runs) {
      const incoming = run.lines.filter(isIncoming);
      for (const l of incoming) unique.set(`${l.knot}|${l.text}`, l);
      for (const l of incoming.slice(0, o.lines)) opening.set(`${l.knot}|${l.text}`, l);
    }
    const lines = [...unique.values()].filter((l) => l.kind !== 'photo');
    if (!lines.length) return;
    for (const l of lines) {
      const n = l.text.length;
      const key = n > T.value('C-34.line_error') ? 'C-34.line_error' : n > T.value('C-34.line_warning') ? 'C-34.line_warning' : null;
      if (key) find(key, { node: l.knot, chapter: l.chapter, message: `сообщение ${n} знаков — разбей на два пузыря («${short(l.text)}»)` });
    }
    const longChars = T.value('C-34.long_chars');
    for (const k of [...new Set(lines.map((l) => l.chapter))].sort((a, b) => a - b)) {
      const list = lines.filter((l) => l.chapter === k);
      const share = list.filter((l) => l.text.length > longChars).length / list.length;
      if (share > T.value('C-34.long_share')) {
        find('C-34.long_share', { chapter: k, message: `глава ${k}: ${pct(share)} реплик длиннее ${longChars} знаков — набор упирается в потолок` });
      }
    }
    const med = median(lines.map((l) => l.text.length));
    if (med > T.value('C-34.median')) find('C-34.median', { message: `медиана длины реплики ${med} знаков` });
    for (const l of opening.values()) {
      if (l.kind !== 'photo' && l.text.length > o.chars) {
        find('C-34.opening', { node: l.knot, chapter: l.chapter, message: `в первых ${o.lines} входящих реплика на ${l.text.length} знаков («${short(l.text)}»)` });
      }
    }
  },
};
