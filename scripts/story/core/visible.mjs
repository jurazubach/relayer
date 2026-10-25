// Видимая переписка: то, что на экране у игрока. Общая для story:trace --visible и story:cold-read.
import { fmtDuration } from './timeline.mjs';
import { thresholdSeconds } from '../../lib/thresholds.mjs';

/** Хронология до первого входа в узел (узел не включается); узла на пути нет — вся хронология. */
export function cutAt(items, until) {
  if (!until) return items;
  const i = items.findIndex((x) => x.knot === until);
  return i < 0 ? items : items.slice(0, i);
}

/**
 * Видимая переписка строками.
 * @param {object[]} items хронология timeline()
 * @param {'realtime' | 'click'} mode
 * @param {object} [o]
 * @param {(item: object, shown: string) => string} [o.who] имя автора реплики (голоса вслепую подменяют его)
 * @param {(item: object, shown: string) => string} [o.chat] имя чата
 */
export function visibleText(items, mode, { who = (_, s) => s, chat = (_, s) => s } = {}) {
  const out = [];
  let thread = null;
  for (const it of items) {
    if (it.type === 'line') {
      if (mode === 'realtime' && it.delay >= thresholdSeconds('story.pause.session_s')) out.push(`        … тишина ${fmtDuration(it.delay)} …`);
      if (mode === 'click' && it.jump) out.push(`        · спустя ${fmtDuration(it.delay)} ·`);
      if (it.thread !== thread) { out.push(`— чат: ${chat(it, it.name)}`); thread = it.thread; }
      if (it.kind === 'sys') out.push(`   · ${it.text}`);
      else if (it.kind === 'me') out.push(`   Вы: ${it.text}`);
      else out.push(`   ${who(it, it.whoName ?? it.name)}: ${it.kind === 'photo' ? '[фото] ' : ''}${it.text}`);
    } else if (it.type === 'choice') {
      out.push(`   [ ${it.options.map((o) => o.text).join(' | ')} ]`);
      if (it.thread !== thread) { out.push(`— чат: ${chat(it, it.name)}`); thread = it.thread; }
      out.push(it.silent ? '   (вы промолчали)' : `   Вы: ${it.text}`);
    } else if (it.type === 'end') out.push('— конец —');
    else if (it.type === 'stuck') out.push('— прохождение оборвалось: предел строк —');
  }
  return out.join('\n');
}
