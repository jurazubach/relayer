// Сессии прохождения: куски хронологии между паузами от story.pause.session_s (checks.md, «Общие данные»).
import { isClosing, isPromise } from '../../lib/lexicon.mjs';
import { threshold, thresholdSeconds } from '../../lib/thresholds.mjs';

/** Признаки крючка в последних строках перед паузой (checks.md, «Признаки крючка»), без срока возвращения. */
export function hookSigns(lines) {
  const signs = new Set();
  for (const l of lines) {
    if (l.text.includes('?') && l.kind !== 'me') signs.add('вопрос');
    if (l.kind === 'photo') signs.add('фото');
    if (l.unlock?.length) signs.add('новый контакт');
    if (l.newContact) signs.add('первое сообщение');
    if (isPromise(l.text) && l.kind !== 'me') signs.add('обещание');
  }
  return [...signs];
}

/**
 * @param {object} t хронология timeline()
 * @returns {object[]} сессии: { n, at, pauseBefore, chapter, knot, lines, incoming, choices, active, last, label, hook, tail }
 *   active — набор, зазоры и паузы короче story.pause.session_s; tail — сессия после последней кнопки
 */
export function sessions(t) {
  const gap = thresholdSeconds('story.pause.session_s');
  const microLines = threshold('C-30.micro_lines');
  const items = t.items.filter((i) => i.type === 'line' || i.type === 'choice');
  const lastChoice = items.map((i) => i.type).lastIndexOf('choice');
  const out = [];
  let cur = null;
  items.forEach((it, idx) => {
    if (!cur || (it.type === 'line' && it.delay >= gap)) {
      cur = { n: out.length + 1, at: it.tReal - (it.type === 'line' ? it.gap + it.typing : 0), pauseBefore: it.type === 'line' && out.length ? it.delay : 0,
        chapter: it.chapter, knot: it.knot, lines: 0, incoming: 0, choices: 0, active: 0, items: [], tail: idx > lastChoice };
      out.push(cur);
    }
    cur.items.push(it);
    if (it.type === 'line') {
      cur.lines++;
      if (it.kind === 'in' || it.kind === 'photo') cur.incoming++;
      cur.active += it.gap + it.typing + (it.delay < gap && cur.items.length > 1 ? it.delay : 0);
    } else cur.choices++;
  });
  for (const s of out) {
    const lines = s.items.filter((i) => i.type === 'line');
    const last3 = lines.slice(-3);
    s.last = lines.at(-1)?.text ?? '';
    s.hook = hookSigns(last3);
    s.closed = isClosing(s.last);
    s.label = s.n > 1 && s.lines <= microLines && s.choices === 0 && !s.tail ? 'микро' : s.hook.length ? 'крючок' : s.closed ? 'закрытая' : '';
    s.end = (s.items.at(-1)?.tReal ?? s.at);
    delete s.items;
  }
  return out;
}
