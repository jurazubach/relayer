// Кто что знает на пути: находки C-51 (те же прогоны, что у story:lint), персонаж, который называет факт из
// чужого чата, хотя ему его не писали (R-85), и переносы сведений между чатами по главам (R-55).
import { walk } from '../../../../scripts/lib/ink.mjs';
import { lintStory } from '../../../../scripts/lint/core.mjs';
import { cleanText } from '../../../../scripts/lint/static.mjs';
import { isIncoming } from '../../../../scripts/lint/journal.mjs';
import { args, emit, factsIn, load, pct, short } from './common.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/knowledge.mjs [--story <id|путь>,…] [--contact <id>] [--runs N] [--json]

Кто что знает (скилл story-continuity, R-85, R-55, проверка C-51, knowledge-flow.md, cross-chat.md):
  C-51        находки story:lint --only C-51 на тех же прогонах: факт раньше, чем игрок о нём узнал (а),
              контакт знаком на одном входе в узел и не знаком на другом (б)
  знает лишнее  входящая без условия называет факт (время или слово реестра facts.md), который игрок узнал
              в другом чате и не писал этому контакту — кандидат R-85; сверь: мог ли он знать сам
  переносы    по главам: кнопки #to, которые несут факт из другого чата (бот: время или слово реестра в
              тексте кнопки; ink: условие кнопки на переменную, которую пишут в другом чате), и доля
              прогонов, где игрок такую нажал; глава с двумя и более собеседниками без переноса — подсказка R-55

  --story     история по id, файл .json / .ink или папка; через запятую; по умолчанию все из src/stories
  --contact   что знает один контакт: факты, сказанные им и написанные ему, с долей прогонов
  --runs N    прогонов бота (по умолчанию lint.runs.full — как у story:lint)
  --json      всё данными
  --help      эта справка`;

const A = args(HELP);
const oneContact = A.opt('--contact');
const report = [];

for (const ref of A.refs) {
  const { story, ctx, names, registry } = load(ref, A.T, A.runs);
  if (!ctx.built.ok) { report.push({ id: story.id, path: story.path, error: 'нет данных: история не компилируется' }); continue; }
  const lint = await lintStory(story, A.T, { only: ['C-51'], runs: A.runs, seed: 1 });
  const c51 = lint.findings.filter((f) => f.check === 'C-51').map((f) => ({ key: f.key, node: f.node, chapter: f.chapter, message: f.message }));
  const { st } = ctx;
  // знание персонажа о событиях: время и реестр; имена — нет, люди мира знают друг друга без игрока
  const eventFacts = (text, who) => factsIn(text, { names, registry, who, withNames: false });
  const extra = new Map();
  const transfers = new Map(); // глава → { buttons: Set, runsWith: n, speakers: Set }
  const contactKnows = new Map(); // факт → прогонов, где контакт его знает
  const total = ctx.runs.length;
  // условная кнопка #to:B по переменной, которую пишут в чате A — перенос по ink, даже без факта в тексте
  const speakersOf = new Map(ctx.tree.knots.map((k) => {
    const set = new Set();
    walk(k.items, (it) => { if (it.type === 'msg' && it.who) set.add(it.who); });
    return [k.id, set];
  }));
  const chatsOfVar = (v) => {
    const out = new Set();
    for (const w of st.vars.index.get(v)?.writes ?? []) {
      if (w.fn) continue;
      if (w.choice?.tags?.to) out.add(w.choice.tags.to);
      else for (const s of speakersOf.get(w.node) ?? []) out.add(s);
    }
    return out;
  };
  const IDENT = /[\p{L}_][\p{L}\p{N}_]*/gu;
  for (const b of st.buttons.list) {
    if (!b.to || b.silent || ctx.service.has(b.to) || !b.conds.length) continue;
    const vars = b.conds.flatMap((c) => c.replace(/"[^"]*"/g, ' ').match(IDENT) ?? []).filter((v) => st.vars.index.has(v));
    if (vars.some((v) => [...chatsOfVar(v)].some((c) => c !== b.to && !ctx.service.has(c)))) {
      const ch = b.chapter ?? 1;
      if (!transfers.has(ch)) transfers.set(ch, { buttons: new Set(), runsWith: 0, speakers: new Set() });
      transfers.get(ch).buttons.add(`${b.knot}|${cleanText(b.text)}`);
    }
  }
  for (const run of ctx.runs) {
    const told = new Map(); // контакт → факты его чата
    const source = new Map(); // факт → чат, где игрок узнал его впервые
    const tell = (c, f) => { if (!told.has(c)) told.set(c, new Set()); told.get(c).add(f); };
    const chaptersWith = new Set();
    for (const item of run.seq) {
      const ch = item.chapter ?? 1;
      if (!transfers.has(ch)) transfers.set(ch, { buttons: new Set(), runsWith: 0, speakers: new Set() });
      if (item.type === 'choice') {
        item.texts.forEach((txt, i) => {
          const to = item.tos[i];
          if (!to || ctx.service.has(to) || item.silent[i]) return;
          const moved = eventFacts(txt, null).filter((f) => source.has(f.fact) && source.get(f.fact) !== to);
          const key = `${item.knot}|${cleanText(txt)}`;
          if (moved.length) transfers.get(ch).buttons.add(key);
          if (i === item.picked && transfers.get(ch).buttons.has(key)) chaptersWith.add(ch);
          if (i === item.picked) for (const f of eventFacts(txt, null)) tell(to, f.fact);
        });
        continue;
      }
      const l = item;
      const facts = eventFacts(l.text, l.who);
      if (isIncoming(l) && l.who && !ctx.service.has(l.who)) {
        transfers.get(ch).speakers.add(l.who);
        const guarded = st.condTexts.has(`${l.knot}|${l.text}`) || l.text.includes('{') || l.kind === 'photo';
        for (const f of facts) {
          const from = source.get(f.fact);
          if (!guarded && from && from !== l.who && !told.get(l.who)?.has(f.fact)) {
            const key = `${l.knot}|${l.who}|${f.fact}`;
            const e = extra.get(key) ?? { node: l.knot, chapter: l.chapter, who: l.who, fact: f.label, from, text: l.text, runs: 0 };
            e.runs++;
            extra.set(key, e);
          }
          tell(l.who, f.fact);
        }
      }
      for (const f of facts) if (!source.has(f.fact) && l.who) source.set(f.fact, ctx.service.has(l.who) ? 'notes' : l.who);
    }
    for (const ch of chaptersWith) transfers.get(ch).runsWith++;
    if (oneContact) for (const f of told.get(oneContact) ?? []) contactKnows.set(f, (contactKnows.get(f) ?? 0) + 1);
  }
  const chapters = [...transfers].sort((a, b) => a[0] - b[0]).map(([ch, t]) => ({
    chapter: ch, speakers: t.speakers.size, buttons: t.buttons.size, share: total ? t.runsWith / total : 0,
    hint: t.speakers.size >= 2 && t.buttons.size === 0,
  })).filter((c) => c.speakers > 0);
  report.push({
    id: story.id, path: story.path, runs: total, c51,
    extra: [...extra.values()].sort((a, b) => b.runs - a.runs),
    chapters,
    ...(oneContact ? { contact: { id: oneContact, knows: [...contactKnows].sort((a, b) => b[1] - a[1]).map(([fact, n]) => ({ fact, share: n / total })) } } : {}),
  });
}

emit(A.json, report, () => report.map((r) => {
  if (r.error) return `${r.id}: ${r.error}`;
  const out = [`${r.id} · прогонов ${r.runs}`];
  out.push(`  C-51 (story:lint): ${r.c51.length ? r.c51.length : 'нет находок'}`);
  for (const f of r.c51) out.push(`    ${f.key} · ${f.node} (гл. ${f.chapter}) · ${f.message}`);
  out.push(`  знает лишнее (R-85, кандидаты): ${r.extra.length || 'нет'}`);
  for (const e of r.extra.slice(0, 15)) out.push(`    ${e.node} (гл. ${e.chapter}) · ${e.who} называет «${e.fact}», игрок узнал его у ${e.from} · ${pct(e.runs / r.runs)} прогонов · «${short(e.text)}»`);
  if (r.extra.length > 15) out.push(`    … ещё ${r.extra.length - 15} (все — в --json)`);
  out.push('  переносы между чатами (R-55): глава · собеседников · кнопок-переносов · прогонов с переносом');
  for (const c of r.chapters) out.push(`    гл. ${c.chapter} · ${c.speakers} · ${c.buttons} · ${pct(c.share)}${c.hint ? ' · ! нет переноса' : ''}`);
  if (r.contact) {
    out.push(`  что знает ${r.contact.id} (сказал сам или написал игрок):`);
    for (const k of r.contact.knows) out.push(`    ${k.fact} · ${pct(k.share)} прогонов`);
  }
  return out.join('\n');
}).join('\n\n') || 'историй нет');
