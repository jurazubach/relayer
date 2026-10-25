// C-51. Знание игрока на пути: реплика или кнопка без условия опирается на факт, который на части путей ещё
// не звучал; узел говорит как при первой встрече, хотя на другом пути контакт уже знаком. Факт — имя героя,
// ЧЧ:ММ в репликах и кнопках игрока или слово из реестра docs/stories/<id>/facts.md (R-91).
// Пункт (в) — упоминание непосещённого узла после паузы — не формализован: его закрывает реестр фактов.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { walk } from '../../lib/ink.mjs';
import { cleanText } from '../static.mjs';
import { isIncoming } from '../journal.mjs';
import { heroNames, places, short } from '../text.mjs';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const TIME = /\d{1,2}:\d\d/g;

/** Строки таблицы под заголовком «## <name>»: ячейки без шапки и разделителя. */
function table(md, name) {
  const at = md.search(new RegExp(`^##\\s+${name}`, 'mi'));
  if (at < 0) return [];
  const rows = [];
  for (const line of md.slice(at).split('\n').slice(1)) {
    if (/^##\s/.test(line)) break;
    if (!line.trim().startsWith('|')) continue;
    const cells = line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    if (cells.every((c) => /^:?-{3,}:?$/.test(c))) continue;
    rows.push(cells);
  }
  return rows.slice(1);
}

/**
 * facts.md истории (формат — story-continuity/references/facts-format.md): хронология, реестр, ложь.
 * Слова реестра — в нижнем регистре; пустая ячейка и «—» — нет значения.
 */
export function parseFacts(md) {
  const none = (c) => (!c || c === '—' || c === '-' ? '' : c.replace(/`/g, '').trim());
  return {
    chronology: table(md, 'Хронология').map(([when, event, who]) => ({ when: none(when), event: none(event), who: none(who) })),
    registry: table(md, 'Реестр').map(([fact, words, value, variable, who]) => ({
      fact: none(fact),
      words: none(words).toLowerCase().split(',').map((w) => w.trim()).filter(Boolean),
      value: none(value), variable: none(variable), who: none(who),
    })).filter((r) => r.fact && r.words.length),
    lies: table(md, 'Ложь').map(([node, who, says, truth]) => ({ node: none(node), who: none(who), says: none(says), truth: none(truth) })),
    times: new Set(md.match(TIME) ?? []),
  };
}

/** facts.md истории или null. RELAYER_FACTS_DIR — для самопроверки: синтетическая история без папки в docs/stories. */
export function loadFacts(storyId) {
  if (!storyId) return null;
  const file = join(process.env.RELAYER_FACTS_DIR ?? join(ROOT, 'docs/stories'), storyId, 'facts.md');
  return existsSync(file) ? { file, ...parseFacts(readFileSync(file, 'utf8')) } : null;
}

/** Контакты, чьи реплики в узле защищены: под условием, под кнопкой с условием или с вставкой {x: …|…}. */
function guardedSpeakers(tree) {
  const out = new Map();
  for (const k of tree.knots) {
    const set = new Set();
    walk(k.items, (it, path) => {
      if (it.type !== 'msg' || !it.who) return;
      if (/\{[^{}]*[:|][^{}]*\}/.test(it.text) || path.some((p) => p.type === 'cond' || (p.type === 'choice' && p.conds.length))) set.add(it.who);
    });
    out.set(k.id, set);
  }
  return out;
}

export default {
  id: 'C-51',
  title: 'Знание игрока на пути',
  plan: false,
  partial: true,
  run(ctx, find) {
    const { st } = ctx;
    const names = [...heroNames(ctx)].filter(([, id]) => !ctx.service.has(id)).map(([name, id]) => ({ key: name.split(/\s+/)[0].slice(0, 4), id, name }));
    const registry = loadFacts(ctx.story.id)?.registry ?? [];
    // время во входящей обычно вводит факт («ушла в 00:40»), а не опирается на него; игрок же время знать
    // не может, пока его не услышал. Поэтому ЧЧ:ММ — только в кнопках и репликах игрока
    const factsOf = (text, who, { times }) => {
      const t = text.toLowerCase();
      const out = names.filter((n) => n.id !== who && t.includes(n.key)).map((n) => n.key);
      for (const r of registry) if (r.words.some((w) => t.includes(w))) out.push(r.fact);
      if (times) for (const m of text.match(TIME) ?? []) out.push(m);
      return out;
    };
    const guarded = guardedSpeakers(ctx.tree);
    const uses = places();
    const met = new Map(); // узел|контакт → { known, unknown }
    for (const [ri, run] of ctx.runs.entries()) {
      const known = new Set();
      const writers = new Set();
      const enterKnown = new Map();
      const use = (knot, chapter, text, f) => {
        const p = uses.add(`${knot}|${text}|${f}`, () => ({ knot, chapter, text, fact: f, before: 0, fresh: 0, run: ri + 1 }));
        if (known.has(f)) p.before++; else { p.fresh++; p.run = ri + 1; }
      };
      for (const item of run.seq) {
        if (item.type === 'choice') {
          for (const txt of item.texts) {
            if (st.condTexts.has(`${item.knot}|${cleanText(txt)}`)) continue;
            for (const f of factsOf(txt, null, { times: true })) use(item.knot, item.chapter, txt, f);
          }
          continue;
        }
        const l = item;
        // знание на входе в узел — по первому входу за прогон: возврат из туннеля не новый вход
        if (!enterKnown.has(l.knot)) enterKnown.set(l.knot, new Set(writers));
        // фото — показанная улика: оно вводит факт, а не опирается на него
        if (l.kind !== 'photo' && !st.condTexts.has(`${l.knot}|${l.text}`) && !l.text.includes('{')) {
          for (const f of factsOf(l.text, l.who, { times: l.kind === 'me' })) use(l.knot, l.chapter, l.text, f);
        }
        for (const f of factsOf(l.text, null, { times: true })) known.add(f);
        if (isIncoming(l) && l.who) {
          const n = names.find((x) => x.id === l.who);
          if (n) known.add(n.key);
          if (!ctx.service.has(l.who) && !st.condTexts.has(`${l.knot}|${l.text}`) && !guarded.get(l.knot)?.has(l.who)) {
            const m = met.get(`${l.knot}|${l.who}`) ?? { knot: l.knot, chapter: l.chapter, who: l.who, known: 0, unknown: 0 };
            if (enterKnown.get(l.knot).has(l.who)) m.known++; else m.unknown++;
            met.set(`${l.knot}|${l.who}`, m);
          }
          writers.add(l.who);
        }
      }
    }
    // факт звучит на одних путях до строки, на других — впервые в ней, а строка без условия
    for (const p of uses.values()) {
      if (p.before && p.fresh) find('C-51.unknown_fact', { node: p.knot, chapter: p.chapter, message: `«${p.fact}» упомянуто в ${p.knot} («${short(p.text, 30)}») до того, как игрок о нём узнал (проход #${p.run})` });
    }
    for (const m of met.values()) {
      const preds = new Set();
      for (const [from, edges] of st.edges) if (edges.some((e) => e.to === m.knot)) preds.add(from);
      if (preds.size >= 2 && m.known && m.unknown) find('C-51.met_twice', { node: m.knot, chapter: m.chapter, message: `${m.knot}: ${m.who} на одних путях уже знаком игроку, на других — нет, а говорит одинаково` });
    }
  },
};
