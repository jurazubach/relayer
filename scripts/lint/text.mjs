// Общее для проверок: словари из thresholds.json, крючок перед паузой, форматы чисел.
import { norm } from './journal.mjs';

/** «2 ч 30 мин», «40 мин», «12 с». */
export function fmtDur(sec) {
  if (sec < 60) return `${Math.round(sec)} с`;
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  if (!h) return `${m} мин`;
  return m ? `${h} ч ${m} мин` : `${h} ч`;
}

export const pct = (x) => `${Math.round(x * 100)} %`;

export const short = (text, n = 40) => (text.length > n ? `${text.slice(0, n)}…` : text);

/** Срок возвращения (A-01): глагол возвращения и срок в одной строке или окно «до утра» у «я / буду». */
export function returnDeadline(text, T) {
  const t = String(text).toLowerCase();
  if (T.re('dict.return_deadline', 'verb').test(t) && T.re('dict.return_deadline', 'term').test(t)) return true;
  return T.re('dict.return_deadline', 'window').test(t) && T.re('dict.return_deadline', 'window_subject').test(t);
}

/** Закрывающая реплика: начинается словом словаря и коротка (C-26.closing_max_words). */
export function isClosing(text, T) {
  const n = norm(text);
  return T.re('dict.closing').test(n) && n.split(' ').length <= T.value('C-26.closing_max_words');
}

/**
 * Признаки крючка (checks.md «Общие данные»): «?», #photo, #unlock, первое сообщение нового контакта,
 * обещание содержания, срок события в мире без срока возвращения в той же строке (R-63, R-64).
 * @param lines строки до паузы; firstOf — индекс первой строки каждого отправителя в прогоне
 */
export function hookIn(lines, firstOf, T) {
  for (const l of lines) {
    if (l.text.includes('?')) return '?';
    if (l.kind === 'photo') return '#photo';
    if (l.unlock.length) return '#unlock';
    if (l.who && (l.kind === 'in' || l.kind === 'photo') && firstOf.get(l.who) === l.i) return 'новый контакт';
    const t = l.text.toLowerCase();
    if (T.re('dict.content_promise').test(t)) return 'обещание';
    if (T.re('dict.world_deadline').test(t) && !returnDeadline(t, T)) return 'срок в мире';
  }
  return null;
}

/** Индекс первой входящей строки каждого отправителя в прогоне. */
export function firstLines(run) {
  const out = new Map();
  for (const l of run.lines) if (l.who && (l.kind === 'in' || l.kind === 'photo') && !out.has(l.who)) out.set(l.who, l.i);
  return out;
}

/** Места: одно место на всех прогонах — одно срабатывание (checks.md «Уровни»). */
export function places() {
  const map = new Map();
  return {
    add(key, init) {
      if (!map.has(key)) map.set(key, { key, n: 0, ...init() });
      const p = map.get(key);
      p.n++;
      return p;
    },
    values: () => [...map.values()],
    get size() { return map.size; },
  };
}

/** «1 кнопка», «3 кнопки», «5 кнопок». */
export function plural(n, one, few, many) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  const w = a > 10 && a < 20 ? many : b === 1 ? one : b >= 2 && b <= 4 ? few : many;
  return `${n} ${w}`;
}
