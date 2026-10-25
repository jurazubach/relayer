// Словари проверок и команд: регулярки — ключи dict.* в docs/playbook/thresholds.json, здесь только то,
// как их применять (нормализация, пары «глагол + срок»). Один источник для story:lint и story:*:
// иначе команды и линт по-разному находят упрёк, обещание и закрывающую реплику.
import { thresholds } from './thresholds.mjs';

/** Нормализованная строка для словарей: нижний регистр, без пунктуации и эмодзи. */
export const norm = (text) => String(text).toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim();

/** Словарь как регулярка (флаги iu, без \b — он не видит кириллицу). */
export const dict = (key, T = thresholds()) => T.re(key);

/** Срок возвращения (A-01): глагол возвращения и срок в одной строке или окно «до утра» у «я / буду». */
export function returnDeadline(text, T = thresholds()) {
  const t = String(text).toLowerCase();
  if (T.re('dict.return_deadline', 'verb').test(t) && T.re('dict.return_deadline', 'term').test(t)) return true;
  return T.re('dict.return_deadline', 'window').test(t) && T.re('dict.return_deadline', 'window_subject').test(t);
}

/** Закрывающая реплика: начинается словом dict.closing и коротка (C-26.closing_max_words). */
export function isClosing(text, T = thresholds()) {
  const n = norm(text);
  return T.re('dict.closing').test(n) && n.split(' ').length <= T.value('C-26.closing_max_words');
}

/** Обещание содержания («расскажу», «узнаешь») — признак крючка перед паузой. */
export const isPromise = (text, T = thresholds()) => T.re('dict.content_promise').test(String(text).toLowerCase());

/** Упрёк за отсутствие (A-03): «ты пропал», «где ты был». */
export const isReproach = (text, T = thresholds()) => T.re('dict.absence_reproach').test(String(text).toLowerCase());
