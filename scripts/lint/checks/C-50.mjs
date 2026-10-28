// C-50. Адресат и шум: ответ ушёл в чат, где долго тихо; вопрос перебивает контакт, которому нельзя ответить;
// шума (контакты без единой кнопки к ним) в главе больше дозы R-88.
// Кнопку-вопрос и обращение по имени, на которые ответил другой, держит C-10 «ответил не тот» (решение королевы
// S-choices-v2): здесь эти места молчат, чтобы одна ошибка не считалась дважды.
import { walk } from '../../lib/ink.mjs';
import { isClosing } from '../../lib/lexicon.mjs';
import { isIncoming, median } from '../journal.mjs';
import { places } from '../text.mjs';
import C10 from './C-10.mjs';

/** Текст кнопки из дерева → проверка текста кнопки в прогоне: вставки {…} ink вычисляет по-разному. */
const textMatcher = (raw) => {
  const parts = String(raw ?? '').replace(/\s+/g, ' ').trim().split(/\{[^}]*\}/);
  const re = new RegExp(`^${parts.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`, 'u');
  return (text) => re.test(String(text ?? '').replace(/\s+/g, ' ').trim());
};

/** Места C-10.wrong_responder: узел → [{ to, match }]. Одно определение «ответил не тот» — в C-10. */
function wrongResponderPlaces(ctx) {
  const found = [];
  // ключ чужой проверки собирается из её id: тест порогов требует, чтобы литералы ключей были своими
  const wrong = `${C10.id}.wrong_responder`;
  C10.run(ctx, (key, f) => { if (key === wrong) found.push(f); });
  const byKnot = new Map();
  for (const f of found) {
    const k = ctx.tree.knots.find((x) => x.id === f.node);
    let choice = null;
    if (k) walk(k.items, (it) => { if (!choice && it.type === 'choice' && it.line === f.data?.line) choice = it; });
    if (!choice) continue;
    if (!byKnot.has(f.node)) byKnot.set(f.node, []);
    byKnot.get(f.node).push({ to: f.data.to, match: textMatcher(choice.text) });
  }
  return byKnot;
}

export default {
  id: 'C-50',
  title: 'Адресат и шум',
  plan: false,
  partial: true,
  run(ctx, find) {
    const { st, T } = ctx;
    // кнопка без #to отвечает в открытый чат — его говорящему
    const answerable = new Set(st.buttons.list.map((b) => b.to ?? b.choice?.speaker).filter(Boolean));
    const heldByC10 = wrongResponderPlaces(ctx);
    const gap = places();
    const noise = places();
    const dose = new Map(); // глава → [доля строк шума в прогоне]
    for (const run of ctx.runs) {
      const per = new Map();
      for (const l of run.lines) {
        if (!isIncoming(l)) continue;
        const c = per.get(l.chapter) ?? { all: 0, noise: 0, who: new Set() };
        c.all++;
        if (l.who && !answerable.has(l.who) && !ctx.service.has(l.who)) { c.noise++; c.who.add(l.who); }
        per.set(l.chapter, c);
      }
      for (const [ch, c] of per) {
        const d = dose.get(ch) ?? { shares: [], who: new Set() };
        d.shares.push(c.noise / c.all);
        c.who.forEach((w) => d.who.add(w));
        dose.set(ch, d);
      }
      for (const c of run.choices) {
        const to = c.tos[c.picked];
        const text = c.texts[c.picked];
        if (!to || c.silent[c.picked] || ctx.service.has(to)) continue;
        // «спокойной ночи», «спасибо» ответа не ждут — после них законно пишет другой
        if (isClosing(text, T)) continue;
        if ((heldByC10.get(c.knot) ?? []).some((p) => p.to === to && p.match(text))) continue;
        const next = run.choices[c.i + 1]?.at ?? run.lines.length;
        const span = run.lines.slice(c.at, next);
        const firstOther = span.findIndex((l) => isIncoming(l) && l.who && l.who !== to);
        if (firstOther < 0) continue;
        // «Доставлено», «Прочитано», «не в сети» в чате адресата до чужой реплики — молчание показано, ответ не потерян
        if (span.slice(0, firstOther).some((l) => l.who === to)) continue;
        const after = span.filter(isIncoming);
        const reply = after.findIndex((l) => l.who === to);
        const n = reply < 0 ? after.length : reply;
        if (n > T.value('C-50.gap')) gap.add(`${c.key}|${c.picked}`, () => ({ knot: c.knot, chapter: c.chapter, to, other: span[firstOther].who, n }));
      }
      // вопрос, который ждёт этой развилки, и кнопка ответа; между ними — контакт, которому нет ни одной кнопки
      for (const c of run.choices) {
        const from = c.i > 0 ? run.choices[c.i - 1].at : 0;
        const before = run.lines.slice(from, c.at);
        const q = before.map((l, i) => [l, i]).reverse().find(([l]) => isIncoming(l) && l.text.includes('?'));
        if (!q) continue;
        // развилка отвечает спросившему: кнопка в его чат или без #to (ответ в открытом чате)
        if (!c.tos.some((t) => t === q[0].who || t == null)) continue;
        const mid = before.slice(q[1] + 1).filter((l) => isIncoming(l) && l.who && l.who !== q[0].who && !answerable.has(l.who) && !ctx.service.has(l.who));
        if (mid.length) noise.add(`${c.key}`, () => ({ knot: c.knot, chapter: c.chapter, who: mid[0].who }));
      }
    }
    for (const p of gap.values()) find('C-50.gap', { node: p.knot, chapter: p.chapter, message: `ответ в ${p.to} ушёл в пустоту: следующая реплика — в ${p.other}, ${p.to} молчит ещё ${p.n} сообщений` });
    for (const [ch, d] of [...dose].sort((a, b) => a[0] - b[0])) {
      const share = median(d.shares);
      if (share > T.value('C-50.noise_share')) {
        find('C-50.noise_share', { chapter: ch, data: { share, contacts: [...d.who] }, message: `глава ${ch}: ${Math.round(share * 100)} % входящих — от контактов, которым нельзя ответить (${[...d.who].join(', ')}): шум или канал-источник?` });
      }
    }
    for (const p of noise.values()) find('C-50.interrupt', { node: p.knot, chapter: p.chapter, message: `сообщение ${p.who} перебивает вопрос в ${p.knot}, а ответить ${p.who} нельзя` });
  },
};
