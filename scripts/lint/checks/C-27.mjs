// C-27. Пауза без причины и срок возвращения (A-01): персонаж называет причину ухода, но не срок.
// Срок перед паузой — будильник в реальном времени и ложь в «по клику»: «утром» приходит через секунду.
import { fmtDur, isClosing, places, returnDeadline, short } from '../text.mjs';

export default {
  id: 'C-27',
  title: 'Пауза без причины',
  plan: false,
  partial: true,
  run(ctx, find) {
    const { st, T } = ctx;
    const long = T.value('C-27.long_h') * 3600;
    for (const p of pausePlaces(ctx)) {
      const at = { node: p.knot, chapter: st.chapterOf(p.knot) };
      if (p.bare * 2 > p.n) {
        const key = p.delay >= long ? 'C-27.long_h' : 'C-27.unexplained';
        find(key, { ...at, message: `пауза ${fmtDur(p.delay)} в ${p.knot} не объяснена: игрок решит, что история сломалась` });
      }
      if (p.deadline) find('C-27.deadline', { ...at, message: `${p.knot}: перед паузой ${fmtDur(p.delay)} персонаж называет срок «${short(p.deadline)}» — оставь причину, убери срок` });
      if (p.mid * 2 > p.n) find('C-27.midlist', { ...at, message: `${p.knot}: пауза ${fmtDur(p.delay)} посреди перечисления — «${short(p.last)}»` });
    }
  },
};

/**
 * Места пауз от story.pause.notice_min по прогонам бота — одно место на все прогоны. Общие для C-27 и
 * promise-scan скилла story-time: скрипт показывает те же места с окном до паузы и первой строкой после.
 * bare — в скольких прогонах пауза без причины; why — чем объяснена (слово причины, «не в сети», исключение).
 */
export function pausePlaces(ctx) {
  const { T } = ctx;
  const notice = T.value('story.pause.notice_min') * 60;
  const long = T.value('C-27.long_h') * 3600;
  const win = T.value('C-27.window_lines');
  const reason = T.re('dict.pause_reason');
  const midlist = T.re('dict.midlist');
  const all = places();
  for (const run of ctx.runs) {
    for (const l of run.lines) {
      if (l.delay < notice || l.i === 0) continue;
      const before = run.lines.slice(Math.max(0, l.i - win), l.i);
      const last = before.at(-1);
      const p = all.add(`${l.knot}|${l.text}`, () => ({
        knot: last.knot, delay: l.delay, last: last.text, bare: 0, deadline: null, mid: 0, why: null, before: null, after: null,
      }));
      const said = before.find((x) => reason.test(x.text.toLowerCase()) || (x.kind === 'sys' && /не в сети/i.test(x.text)));
      const exc = said ? null : explained(l, last, before, long, T);
      if (!said && !exc) p.bare++;
      else p.why ??= said ? `причина: «${short(said.text, 30)}»` : exc;
      // образец окна — из прогона без причины, если такой был: его и сверяют с текстом
      if (!p.before || (!said && !exc && !p.bareSample)) {
        p.before = before.map((x) => ({ who: x.who, kind: x.kind, text: x.text }));
        p.after = { who: l.who, kind: l.kind, text: l.text, knot: l.knot, isChapter: l.isChapter };
        p.bareSample = !said && !exc;
      }
      const d = before.find((x) => returnDeadline(x.text, T));
      if (d) p.deadline = d.text;
      if (midlist.test(last.text.trim())) p.mid++;
    }
  }
  return all.values();
}

/**
 * Пауза, которой причина не нужна, хотя слова причины нет (калибровка T-03d, checks.md C-27):
 * - исключение R-63: последняя строка — прощание, а после паузы пишет другой контакт;
 * - короткая пауза (до C-27.long_h) между разговорами: после неё пишет другой контакт — прежний разговор
 *   не оборвался, история идёт дальше в другом чате;
 * - короткая пауза на стыке глав: стык меряют C-39 и C-32 п. 4.
 * - тишина и есть событие: последняя строка — «Прочитано» без ответа (`attention-today:P-09#нюанс`,
 *   `messenger-genre:P-01#нюанс`: тревожную паузу не объясняют, перед ней стоит опасность);
 * - стык глав после срока события в мире («слушание в 10», «завтра придёт код»): игрок знает, до чего
 *   пауза, а срок возвращения персонаж не называл (R-63 разрешает время события, R-64 — это крючок).
 * Иначе долгая пауза без прощания требует причины: часы тишины посреди разговора игрок примет за поломку.
 * Возвращает, каким исключением объяснена пауза, или null.
 */
function explained(l, last, before, long, T) {
  const other = l.who !== last.who;
  const joint = l.isChapter || before.some((x) => x.isChapter);
  if (other && isClosing(last.text, T)) return 'прощание, потом другой контакт (R-63)';
  if (last.kind === 'sys' && /^прочитано/i.test(last.text.trim())) return 'тишина — событие («Прочитано»)';
  if (joint && before.some((x) => x.kind !== 'sys' && T.re('dict.world_deadline').test(x.text.toLowerCase()) && !returnDeadline(x.text, T))) return 'стык глав после срока события в мире';
  if (l.delay >= long) return null;
  if (other) return 'короткая, потом другой контакт';
  return joint ? 'короткая, стык глав' : null;
}
