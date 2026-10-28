// C-46. Повторы: строка дважды за прохождение, длинная строка скопирована в разные узлы, одинаковые кнопки.
// Служебный канал (банк, пульт, ворота) пишет шаблоном — это его голос (ST-23, ST-73), а не повтор. Одна и та же
// реплика в разные чаты (игрок рассылает одно сообщение) — тоже не повтор: повтор — тот же чат дважды.
import { walk } from '../../lib/ink.mjs';
import { places, short } from '../text.mjs';

export default {
  id: 'C-46',
  title: 'Повторы',
  plan: false,
  partial: true,
  run(ctx, find) {
    const { st, T, tree } = ctx;
    const min = T.value('C-46.min_chars');
    const path = places();
    for (const run of ctx.runs) {
      const seen = new Map();
      for (const l of run.lines) {
        if (l.kind === 'sys' || l.text.length < min || ctx.service.has(l.who)) continue;
        const chat = `${l.who ?? ''}|${l.text}`;
        const k = seen.get(chat);
        if (k) {
          const p = path.add(l.text, () => ({ text: l.text, knots: new Set(), chapter: l.chapter, times: 0 }));
          p.knots.add(k).add(l.knot);
        }
        seen.set(chat, l.knot);
      }
    }
    for (const p of path.values()) {
      const knots = [...p.knots];
      find('C-46.path_repeat', { node: knots[0], chapter: st.chapterOf(knots[0]), message: `строка «${short(p.text)}» показана дважды за прохождение (${knots.join(', ')})` });
    }
    const where = new Map();
    const buttons = new Map();
    for (const k of tree.knots) {
      walk(k.items, (it) => {
        if (it.type === 'msg' && it.text.length >= min && !it.text.includes('{') && !ctx.service.has(it.who)) {
          if (!where.has(it.text)) where.set(it.text, new Set());
          where.get(it.text).add(k.id);
        }
        if (it.type === 'choice' && !('silent' in it.tags) && it.text.trim()) {
          const t = it.text.trim();
          if (!buttons.has(t)) buttons.set(t, new Set());
          buttons.get(t).add(k.id);
        }
      });
    }
    for (const [text, knots] of where) {
      const ks = [...knots];
      const key = ks.length >= T.value('C-46.copy_nodes') ? 'C-46.copy_nodes' : text.length > T.value('C-46.copy_long') && ks.length >= 2 ? 'C-46.copy_long' : null;
      if (key) find(key, { node: ks[0], chapter: st.chapterOf(ks[0]), message: `строка «${short(text)}» скопирована в ${ks.slice(0, 5).join(', ')} — вынеси в туннель или поток` });
    }
    for (const [text, knots] of buttons) {
      const ks = [...knots];
      if (ks.length >= T.value('C-46.button_nodes')) find('C-46.button_nodes', { node: ks[0], chapter: st.chapterOf(ks[0]), message: `кнопка «${short(text)}» повторяется в ${ks.slice(0, 5).join(', ')}` });
    }
  },
};
