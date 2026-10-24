// C-53. Разметка комментариями: шапка из 4 строк, метки reveal / намеренно / финал (build-plan.md §9).
// Неизвестную метку ищем только в виде «// слово:» со строчной буквы: «Главы:» и «Кто есть кто:» —
// обычные авторские заметки, а не разметка.
import { walk } from '../../lib/ink.mjs';
import { plural } from '../text.mjs';

const MARK_LIKE = /^([a-zа-яё][\p{L}\p{N}_-]*(?:\s[\p{L}_-]+)?)\s*:/u;
const BARE_REPLACED = /^(сезон|key-fact|событие|середина|кризис)$/u;

export default {
  id: 'C-53',
  title: 'Разметка комментариями',
  plan: true,
  partial: true,
  run(ctx, find) {
    const { tree, st, T } = ctx;
    const known = T.value('C-53.marks');
    const head = tree.head;
    const present = known.head.filter((k) => k in head);
    if (present.length !== T.value('C-53.header_lines')) {
      const missing = known.head.filter((k) => !(k in head));
      find('C-53.header_lines', { message: `шапка: нет ${missing.map((k) => `// ${k}:`).join(', ')}`, data: { missing } });
    }

    const contacts = new Set([...Object.keys(tree.contacts), ...(ctx.meta.characters ?? []).map((c) => c.id).filter(Boolean)]);
    const firstLine = Math.min(...tree.knots.map((k) => (k.file ? Infinity : k.line)), Infinity);
    for (const c of tree.comments) {
      if (c.mark || c.kind !== 'line') continue;
      const text = c.text.trim();
      const m = text.match(MARK_LIKE);
      const word = m ? m[1].replace(/^role\s.*/, 'role') : BARE_REPLACED.test(text) ? text : null;
      if (!word) continue;
      const flow = /^flow\s/.test(word) ? 'flow' : null;
      const replaced = known.replaced[flow ?? word] ?? (contacts.has(word) ? known.replaced.contact_voice : null);
      // до первого узла обычная проза описания тоже бывает со строчной: там ловим только прежние метки
      if (!replaced && !c.file && c.line < firstLine) continue;
      const node = knotAt(tree, c);
      find('C-53.unknown_mark', {
        node, chapter: node ? st.chapterOf(node) : null,
        message: `строка ${c.line}: метка «${word}» никто не читает — ${replaced ?? 'это не разметка §9; если это заметка, убери двоеточие после первого слова'}`,
      });
    }

    // оси: переменные существуют, пишутся кнопками и читаются распределителем
    if (head.оси) {
      for (const raw of head.оси.split(/[,;/]/)) {
        const name = raw.trim().match(/^[\p{L}_][\p{L}\p{N}_]*/u)?.[0];
        if (!name) continue;
        const v = st.vars.index.get(name);
        if (!v) { find('C-53.axis_var', { message: `шапка // оси: «${name}» — нет такой VAR` }); continue; }
        const byButton = v.writes.some((w) => w.choice);
        const byFinal = [...st.distributors].some((R) => v.reads.some((r) => r.node === R));
        if (!byButton || (st.distributors.size && !byFinal)) {
          find('C-53.axis_use', { message: `ось «${name}»: ${!byButton ? 'её не меняет ни одна кнопка' : 'её не читает ни один распределитель финала'}` });
        }
      }
    }

    for (const k of tree.knots) {
      for (const m of k.marks) {
        if (m.kind === 'reveal') {
          for (const name of m.value.split(/[,\s]+/).filter(Boolean)) {
            if (!st.vars.index.has(name)) find('C-53.reveal_var', { node: k.id, chapter: st.chapterOf(k.id), message: `${k.id}: // reveal: «${name}» — нет такой VAR` });
          }
        }
      }
    }
    for (const c of tree.comments) {
      if (c.mark?.kind !== 'намеренно') continue;
      const node = knotAt(tree, c);
      const id = c.mark.id;
      const bad = !/^C-\d\d$/.test(id) ? 'без номера проверки' : !ctx.knownChecks.has(id) ? `неизвестная проверка ${id} (нет в checks.md)` : !c.mark.reason ? 'без причины' : null;
      if (bad) find('C-53.intent', { node, chapter: node ? st.chapterOf(node) : null, message: `${node ?? `строка ${c.line}`}: «намеренно» ${bad}` });
    }

    // финалы: END без // финал: выше на пути (бета-заглушка — не финал)
    const endNodes = tree.knots.filter((k) => {
      let end = false;
      walk(k.items, (it) => { if (it.type === 'divert' && it.target === 'END') end = true; });
      return end && k.id !== 'beta_stop';
    });
    if (st.endings.source === 'mark') {
      for (const id of st.endings.unmarked.filter((x) => x !== 'beta_stop' && !hasMarkedAncestor(x, st))) {
        find('C-53.unmarked_end', { node: id, chapter: st.chapterOf(id), message: `${id}: -> END без // финал: выше на пути` });
      }
    } else if (endNodes.length) {
      find('C-53.unmarked_end', { message: `финалы не размечены: ${plural(endNodes.length, 'узел', 'узла', 'узлов')} с -> END (${endNodes.slice(0, 5).map((k) => k.id).join(', ')}) без // финал:` });
    }
  },
};

/** Узел, к которому относится комментарий: тот, в чьём диапазоне строк он стоит, или следующий за ним. */
function knotAt(tree, c) {
  const same = tree.knots.filter((k) => (k.file ?? null) === (c.file ?? null));
  let best = null;
  for (const k of same) {
    if (k.line <= c.line) best = k.id;
    if (k.lead.some((x) => x.line === c.line)) return k.id;
  }
  return best;
}

/** Есть ли размеченный финал среди узлов, которые ведут в этот (общий эпилог после финалов). */
function hasMarkedAncestor(id, st) {
  const marked = new Set(st.endings.endings.map((e) => e.id));
  for (const [from, edges] of st.edges) if (marked.has(from) && edges.some((e) => e.to === id)) return true;
  return false;
}
