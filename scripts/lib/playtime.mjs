// Время игрока — одна формула для story:lint и команд story:* (trace, sessions, diff): пауза #delay, зазор
// «прочитал, подумал» и набор, как typingTime и gapTime в engine.ts. Константы — engine.typing в thresholds.json,
// test:lint сверяет их с движком.
import { parseDelay, parseTag } from './ink.mjs';
import { thresholds } from './thresholds.mjs';

/** Набор строки в секундах: свои строки и системные приходят сразу. */
export function typingTime(kind, text, T = thresholds()) {
  const c = T.value('engine.typing');
  if (kind === 'photo') return c.photo_s;
  if (kind !== 'in') return 0;
  return Math.min(c.max_s, Math.max(c.min_s, c.base_s + String(text).length * c.per_char_s));
}

/** Зазор перед строкой в секундах: детерминированная «случайность» от текста, после ответа игрока — дольше. */
export function gapTime(kind, text, afterPlayer, T = thresholds()) {
  const c = T.value('engine.typing');
  if (kind === 'sys') return c.gap_sys_s;
  if (kind === 'me') return c.gap_me_s;
  const s = String(text);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const jitter = c.gap_min_s + (h % Math.round(c.gap_spread_s * 1000)) / 1000;
  return afterPlayer ? jitter + c.after_player_s : jitter;
}

/** Вид строки журнала бота: in | me | sys | photo. */
export function lineKind(e) {
  if (e.kind === 'me' || e.kind === 'sys') return e.kind;
  return (e.tags ?? []).some((t) => parseTag(t).key === 'photo') ? 'photo' : 'in';
}

/** Сумма #delay строки в секундах: тегов может быть несколько, движок их складывает. */
export const lineDelay = (tags) => (tags ?? []).map(parseTag).filter((t) => t.key === 'delay').reduce((s, t) => s + parseDelay(t.value), 0);

/**
 * Часы прохождения по журналу bot.play, по правилам engine.ts: строка из одних тегов отдаёт паузу
 * следующей строке с текстом; после ответа игрока зазор длиннее, после #silent — нет.
 * line(e) → { kind, delay, gap, typing } или null для строки без текста; choice(silent) — после выбора.
 */
export function playerClock(T = thresholds()) {
  let carry = 0;
  let afterPlayer = false;
  return {
    line(e) {
      const delay = carry + lineDelay(e.tags);
      if (!e.text) { carry = delay; return null; }
      carry = 0;
      const kind = lineKind(e);
      const out = { kind, delay, gap: gapTime(kind, e.text, afterPlayer, T), typing: typingTime(kind, e.text, T) };
      afterPlayer = false;
      return out;
    },
    choice(silent) { afterPlayer = !silent; },
  };
}
