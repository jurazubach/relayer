// C-23. Первое сообщение: оно же превью уведомления. Пять грубых признаков и номер входящего с инцидентом
// (замена метки // событие, C-53). Регулярки грубые — решает ревьюер.
import { isIncoming, norm } from '../journal.mjs';
import { heroNames, short } from '../text.mjs';

/** Самое частое начало истории по прогонам: первые N входящих. */
function opening(runs, n) {
  const count = new Map();
  for (const r of runs) {
    const lines = r.lines.filter(isIncoming).slice(0, n);
    const key = lines.map((l) => l.text).join('\n');
    const p = count.get(key) ?? { lines, n: 0, run: r };
    p.n++;
    count.set(key, p);
  }
  return [...count.values()].sort((a, b) => b.n - a.n)[0] ?? { lines: [] };
}

export default {
  id: 'C-23',
  title: 'Первое сообщение',
  plan: false,
  partial: true,
  model: true,
  run(ctx, find) {
    const { T } = ctx;
    const { lines, run } = opening(ctx.runs, T.value('C-23.lines'));
    if (!lines.length) return;
    const first = lines[0];
    const at = { node: first.knot, chapter: 1 };
    if (T.re('dict.greeting').test(norm(first.text)) && first.text.length < T.value('C-23.greeting_chars') && !lines.slice(1, 3).some((l) => l.text.includes('?'))) {
      find('C-23.greeting_chars', { ...at, message: `первое сообщение «${short(first.text)}» — приветствие, а оно же превью уведомления` });
    }
    const names = heroNames(ctx);
    const two = lines.slice(0, 2);
    const anchored = two.some((l) => {
      const t = l.text.toLowerCase();
      const own = [...names].filter(([, id]) => id === l.who).map(([name]) => name.slice(0, 4));
      return T.re('dict.link').test(t) || (l.who && t.includes(l.who.toLowerCase())) || own.some((x) => t.includes(x));
    });
    if (!anchored) find('C-23.anchor', { ...at, message: 'начало без опоры: в первых двух входящих не сказано, кто пишет и почему тебе' });
    const past = lines.find((l) => T.re('dict.past').test(l.text.toLowerCase()));
    if (past) find('C-23.past', { node: past.knot, chapter: 1, message: `начало открывается прошлым: «${short(past.text)}»` });
    if (first.text.length > T.value('C-23.first_chars')) find('C-23.first_chars', { ...at, message: `первое сообщение — ${first.text.length} знаков: превью обрежет суть` });
    const retract = lines.slice(1).find((l) => T.re('dict.retract').test(l.text.toLowerCase()));
    if (retract) find('C-23.retract', { node: retract.knot, chapter: 1, message: `тревога в начале тут же отменяется: «${short(retract.text)}»` });

    // инцидент: первая входящая со сроком мира, угрозой, #unlock, #photo или прямым вопросом игроку.
    // Вопрос — это «проблема адресована игроку» (R-14): ошибочный адресат «рэй?» или «это у вас?» —
    // уже событие, хотя срока в нём нет. Приветствие с вопросом («ты тут?») инцидентом не считается.
    const inc = run.lines.filter(isIncoming);
    const isIncident = (l) => {
      const t = l.text.toLowerCase();
      return l.kind === 'photo' || l.unlock.length || T.re('dict.world_deadline').test(t) || T.re('dict.threat').test(t) || (t.includes('?') && !T.re('dict.greeting').test(norm(t)));
    };
    const idx = inc.findIndex(isIncident);
    const max = T.value('attn.opening.incident.msg').max;
    if (idx < 0 || idx + 1 > max) {
      const where = idx < 0 ? 'нет ни срока, ни угрозы, ни вопроса игроку, ни #unlock, ни #photo' : `только на ${idx + 1}-м входящем («${short(inc[idx].text, 30)}»)`;
      find('attn.opening.incident.msg', { ...at, message: `инцидент ${where} — первые сообщения без события` });
    }
  },
};
