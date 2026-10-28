// C-37. Давление и ложная срочность: «срочно» чаще двух раз за главу, срок, от которого ничего не зависит
// (у движка нет таймеров), узел из криков. Напоминания при молчании (R-120) не считаются: их проверяет C-32.
import { walk } from '../../lib/ink.mjs';
import { pct, short } from '../text.mjs';

export default {
  id: 'C-37',
  title: 'Давление и ложная срочность',
  plan: false,
  partial: true,
  run(ctx, find) {
    const { st, T } = ctx;
    const { lines, perChapter, nodes } = pressureLines(ctx);
    for (const x of lines.filter((l) => l.ultimatum)) {
      find('C-37.false_deadline', { node: x.knot, chapter: x.chapter, message: `срок «${short(x.text)}» в ${x.knot} не исполняется: ни одна ветка не зависит от времени ответа — ложная срочность` });
    }
    for (const n of nodes) {
      if (n.lines && n.loud / n.lines > T.value('C-37.shout_share')) find('C-37.shout_share', { node: n.knot, chapter: st.chapterOf(n.knot), message: `${n.knot}: ${pct(n.loud / n.lines)} реплик — «!!», капс или «помоги»` });
    }
    for (const [ch, list] of perChapter) {
      if (list.length > T.value('C-37.per_chapter')) find('C-37.per_chapter', { node: list[0].knot, chapter: ch, message: `глава ${ch}: ${list.length} реплик с давлением (${list.slice(0, 3).map((x) => `«${short(x.text, 25)}»`).join(', ')})` });
    }
  },
};

/**
 * Реплики с давлением по ink (dict.pressure, dict.ultimatum, dict.shout). Реплика напоминания — тело скрытого
 * варианта #remind — помечена reminder и в счёт главы не входит (R-114: напоминания R-120 не считаются;
 * их предел, повтор и упрёк меряет C-32). Общие для C-37 и guilt-scan скилла story-time.
 * @returns {{ lines, perChapter: Map<глава, строки>, nodes: { knot, lines, loud }[] }}
 */
export function pressureLines(ctx) {
  const { st, T, tree } = ctx;
  const pressure = T.re('dict.pressure');
  const ultimatum = T.re('dict.ultimatum');
  const shout = new RegExp(T.value('dict.shout'), 'u');
  const lines = [];
  const perChapter = new Map();
  const nodes = [];
  for (const k of tree.knots) {
    const ch = st.chapterOf(k.id);
    const node = { knot: k.id, lines: 0, loud: 0 };
    walk(k.items, (it, path) => {
      if (it.type !== 'msg' || ctx.service.has(it.who)) return;
      const reminder = path.some((p) => p.type === 'choice' && p.role === 'remind');
      node.lines++;
      const t = it.text.toLowerCase();
      const x = { knot: k.id, chapter: ch, text: it.text, line: it.line, reminder, pressure: pressure.test(t), ultimatum: ultimatum.test(t) };
      if (x.pressure || x.ultimatum) lines.push(x);
      if (x.pressure && !reminder) { if (!perChapter.has(ch)) perChapter.set(ch, []); perChapter.get(ch).push(x); }
      if (shout.test(it.text)) node.loud++;
    });
    nodes.push(node);
  }
  return { lines, perChapter, nodes };
}
