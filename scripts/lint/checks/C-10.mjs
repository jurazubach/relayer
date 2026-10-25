// C-10. Профиль кнопок: пустые и косметические кнопки, декоративные группы, серии развилок без последствий,
// «ответил не тот» — кнопка одному контакту, а отвечает другой.
import { resolveTarget } from '../../lib/ink.mjs';
import { pct, short } from '../text.mjs';

const MAX_HOPS = 3;

/**
 * Кто может заговорить первым после этих элементов: множество отправителей реплик, «#sys» для системной
 * строки. open — элементы кончились, никто не заговорил и перехода не было: дальше идёт продолжение после
 * группы кнопок. Переходы прослеживаются на MAX_HOPS узлов.
 */
function firsts(items, knot, ctx, hops = 0) {
  const set = new Set();
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.type === 'msg') { set.add(it.who); return { set, open: false }; }
    if (it.type === 'sys') { set.add('#sys'); return { set, open: false }; }
    if (it.type === 'choice') return { set, open: false };
    if (it.type === 'divert') {
      const to = it.kind === 'return' ? null : resolveTarget(it.target, knot, ctx.ids);
      if (to && hops < MAX_HOPS) for (const w of firsts(ctx.byId.get(to).items, to, ctx, hops + 1).set) set.add(w);
      return { set, open: false };
    }
    if (it.type === 'cond') {
      let open = !it.branches.some((b) => b.cond === 'else');
      for (const b of it.branches) {
        const r = firsts(b.items, knot, ctx, hops);
        r.set.forEach((w) => set.add(w));
        if (r.open) open = true;
      }
      if (!open) return { set, open: false };
      const rest = firsts(items.slice(i + 1), knot, ctx, hops);
      rest.set.forEach((w) => set.add(w));
      return { set, open: rest.open };
    }
  }
  return { set, open: true };
}

/** Все, кто говорит до следующей развилки (по всем веткам условий). Возвращает true, если элементы кончились. */
function speakers(items, knot, ctx, acc, hops = 0) {
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.type === 'msg') acc.add(it.who);
    else if (it.type === 'choice') return false;
    else if (it.type === 'divert') {
      const to = it.kind === 'return' ? null : resolveTarget(it.target, knot, ctx.ids);
      if (to && hops < MAX_HOPS) speakers(ctx.byId.get(to).items, to, ctx, acc, hops + 1);
      return false;
    } else if (it.type === 'cond') {
      let open = !it.branches.some((b) => b.cond === 'else');
      for (const b of it.branches) if (speakers(b.items, knot, ctx, acc, hops)) open = true;
      if (!open) return false;
    }
  }
  return true;
}

/**
 * Кнопка ждёт ответа адресата: вопрос или обращение по имени («Рита, …»). Прощание, благодарность,
 * запись в «Заметки» и `#silent` ответа не ждут — после них законно пишет другой.
 */
function expectsReply(c, contacts) {
  const text = String(c.text ?? '').replace(/\s+/g, ' ').trim();
  if (/\?\s*$/.test(text)) return true;
  const name = contacts[c.tags.to]?.name;
  const word = text.match(/^([\p{L}-]+),/u)?.[1];
  if (!name || !word) return false;
  const stem = (w) => w.toLowerCase().slice(0, Math.max(3, w.length - 2));
  return name.split(/\s+/).some((n) => stem(n) === stem(word));
}

/** Кнопки с #to, после которых первым и до следующей развилки отвечает не адресат (LOCAL-06). */
function wrongResponders(tree, service) {
  const ctx = { ids: new Set(tree.knots.map((k) => k.id)), byId: new Map(tree.knots.map((k) => [k.id, k])) };
  const out = [];
  const scan = (items, knot) => {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.type === 'cond') { for (const b of it.branches) scan(b.items, knot); continue; }
      if (it.type !== 'choice') continue;
      let j = i;
      const group = [];
      while (j < items.length && (items[j].type === 'choice' || items[j].type === 'comment')) {
        if (items[j].type === 'choice') group.push(items[j]);
        j++;
      }
      const after = items.slice(j);
      for (const c of group) {
        scan(c.items, knot);
        const to = c.tags.to;
        if (!to || 'silent' in c.tags || service.has(to) || !expectsReply(c, tree.contacts ?? {})) continue;
        const f = firsts(c.items, knot, ctx);
        if (f.open) firsts(after, knot, ctx).set.forEach((w) => f.set.add(w));
        if (!f.set.size || f.set.has(to) || f.set.has('#sys') || f.set.has(null)) continue;
        const said = new Set();
        if (speakers(c.items, knot, ctx, said)) speakers(after, knot, ctx, said);
        if (said.has(to)) continue;
        out.push({ knot, choice: c, to, who: [...f.set] });
      }
      i = j - 1;
    }
  };
  for (const k of tree.knots) scan(k.items, k.id);
  return out;
}

export default {
  id: 'C-10',
  title: 'Профиль кнопок',
  plan: true,
  partial: true,
  run({ st, T, tree, service }, find) {
    const all = st.buttons.list;
    if (!all.length) return;
    const bodyless = (b) => b.cls === 'none' && !b.silent;
    const share = all.filter(bodyless).length / all.length;
    if (share > T.value('C-10.bodyless_story')) {
      find('C-10.bodyless_story', { message: `${pct(share)} кнопок истории без своего ответа и последствий (без #silent)`, data: { share, total: all.length } });
    }
    const chapters = [...new Set(all.map((b) => b.chapter))].sort((a, b) => a - b);
    for (const k of chapters) {
      const list = all.filter((b) => b.chapter === k);
      const reply = list.filter((b) => b.cls === 'reply');
      const none = list.filter(bodyless);
      const cosmetic = list.filter((b) => b.cls === 'reply' || b.cls === 'none');
      const ex = (none[0] ?? reply[0]);
      const example = ex ? ` (пример: «${short(ex.text)}» в ${ex.knot})` : '';
      const data = { total: list.length, reply: reply.length, none: none.length };
      if (none.length / list.length > T.value('C-10.bodyless_chapter')) {
        find('C-10.bodyless_chapter', { chapter: k, message: `глава ${k}: ${pct(none.length / list.length)} кнопок без своего ответа${example}`, data });
      }
      if (cosmetic.length / list.length > T.value('C-10.cosmetic_chapter')) {
        find('C-10.cosmetic_chapter', {
          chapter: k,
          message: `глава ${k}: ${pct(reply.length / list.length)} кнопок меняют только реплику, ${pct(none.length / list.length)} — без своего ответа${example}`,
          data,
        });
      }
    }
    // группа из одной кнопки — это C-12 (одиночка), здесь только настоящие развилки
    for (const g of st.buttons.groups) {
      if (g.buttons.length > 1 && g.bodyless) {
        find('C-10.group_bodyless', {
          node: g.knot, chapter: g.chapter,
          message: `${g.knot}: у всех ${g.buttons.length} кнопок нет своего ответа и последствий — выбор декоративный («${short(g.buttons[0].text, 30)}» …)`,
        });
      }
    }
    const streaks = new Map();
    for (const g of st.buttons.groups) {
      if (g.streak >= T.value('C-10.cosmetic_streak')) streaks.set(g.knot, Math.max(streaks.get(g.knot) ?? 0, g.streak));
    }
    for (const [knot, n] of streaks) {
      find('C-10.cosmetic_streak', { node: knot, chapter: st.chapterOf(knot), message: `${knot}: ${n} развилки подряд ничего не меняют` });
    }
    const wrong = wrongResponders(tree, service);
    if (wrong.length > T.value('C-10.wrong_responder')) {
      for (const w of wrong) {
        find('C-10.wrong_responder', {
          node: w.knot, chapter: st.chapterOf(w.knot), data: { line: w.choice.line, to: w.to, who: w.who },
          message: `${w.knot}: кнопка «${short(w.choice.text, 40)}» адресована ${w.to}, а отвечает ${w.who.join(' / ')}, и ${w.to} молчит до следующей развилки — ответил не тот (если это ответ ${w.to}, не хватает #from:${w.to})`,
        });
      }
    }
  },
};
