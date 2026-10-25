// Профиль кнопок истории по главам: классы кнопок (те же, что у C-10), развилки, условные кнопки, адресаты,
// молчание и отказы, хабы. Статический разбор scripts/lint/static.mjs — поэтому доли совпадают с находками
// C-10, а не считаются заново по-своему. Находки с ботом (C-11 в, C-12, C-16) — у story:lint.
import { fileURLToPath } from 'node:url';
import { loadStory, storyRefs, parseStory } from '../../../../scripts/lib/story.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';
import { walk } from '../../../../scripts/lib/ink.mjs';
import { buildStatic } from '../../../../scripts/lint/static.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/choices.mjs [--story <id|путь>,…] [--chapter N] [--hubs] [--json]

Профиль кнопок по главам (скилл story-choices, проверки C-10, C-11, C-12, C-13, C-19):
  кнопок      все кнопки главы (условные тоже)
  узел / пер. / репл. / пусто   классы checks.md: свой переход, только ~, только своя реплика, сразу сборка
  молч.       кнопки #silent;  отказ — кнопки, похожие на отказ (dict.refusal)
  без тела    доля «пусто» без #silent — сравни с C-10.bodyless_chapter
  космет.     доля «реплика + пусто» — сравни с C-10.cosmetic_chapter
  развилок    групп кнопок; пустых — групп, где у всех кнопок нет тела (C-10.group_bodyless)
  усл.        кнопок с условием * {x} — их нет у части игроков (R-54)
  адресаты    групп, где кнопки уходят разным #to (выбор между людьми, C-17)
  ширина      самая широкая группа: всего / безусловных (C-12.wide считает видимые у бота)

  --story     история по id, файл .json / .ink или папка; через запятую; по умолчанию все из src/stories
  --chapter N только глава N
  --hubs      хабы (узел возвращается сам в себя): спицы, выходы, анкета, тонкие спицы — правила 1–3, 5 C-19
  --json      всё данными
  --help      эта справка

Пороги — ключи docs/playbook/thresholds.json; находки и уровни — npm run story:lint -- --only C-10,C-11,C-12,C-13,C-19.`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const T = thresholds();
const refs = storyRefs((opt('--story') ?? '').split(',').filter(Boolean));
const onlyChapter = opt('--chapter') ? Number(opt('--chapter')) : null;
const pct = (x) => `${Math.round(x * 100)}%`;
const refusal = T.re('dict.refusal');

function lineCount(items) {
  let n = 0;
  walk(items, (it) => { if (['msg', 'me', 'sys'].includes(it.type)) n++; });
  return n;
}

function profile(ref) {
  const story = loadStory(ref);
  const st = buildStatic(parseStory(story));
  const list = st.buttons.list;
  const chapters = [...new Set(list.map((b) => b.chapter))].sort((a, b) => a - b).filter((k) => onlyChapter == null || k === onlyChapter);
  const rows = chapters.map((k) => {
    const bs = list.filter((b) => b.chapter === k);
    const gs = st.buttons.groups.filter((g) => g.chapter === k);
    const cls = (c) => bs.filter((b) => b.cls === c).length;
    const bodyless = bs.filter((b) => b.cls === 'none' && !b.silent).length;
    const cosmetic = bs.filter((b) => b.cls === 'reply' || b.cls === 'none').length;
    const widest = gs.reduce((m, g) => Math.max(m, g.buttons.length), 0);
    const widestFree = gs.reduce((m, g) => Math.max(m, g.buttons.filter((b) => !b.conds.length).length), 0);
    return {
      chapter: k, buttons: bs.length, node: cls('node'), vars: cls('vars'), reply: cls('reply'), none: cls('none'),
      silent: bs.filter((b) => b.silent).length,
      refusal: bs.filter((b) => refusal.test(b.text.toLowerCase().trim())).length,
      bodyless_share: bs.length ? bodyless / bs.length : 0,
      cosmetic_share: bs.length ? cosmetic / bs.length : 0,
      groups: gs.length,
      groups_bodyless: gs.filter((g) => g.buttons.length > 1 && g.bodyless).length,
      conditional: bs.filter((b) => b.conds.length).length,
      addressee_groups: gs.filter((g) => new Set(g.buttons.filter((b) => b.to && !b.silent).map((b) => b.to)).size > 1).length,
      widest, widest_free: widestFree,
    };
  });
  const hubs = [];
  for (const [id, edges] of st.edges) {
    if (!edges.some((e) => e.to === id && e.kind !== 'tunnel')) continue;
    const spokes = list.filter((b) => b.knot === id);
    if (!spokes.length) continue;
    const back = (b) => { let self = false; walk(b.choice.items, (it) => { if (it.type === 'divert' && (it.target === id || st.labels.get(id)?.has(it.target))) self = true; }); return self; };
    const exits = spokes.filter((b) => !back(b) && b.cls === 'node');
    const survey = {};
    for (const b of spokes) if (b.to && !b.writes.length && back(b)) survey[b.to] = (survey[b.to] ?? 0) + 1;
    hubs.push({
      node: id, chapter: st.chapterOf(id), spokes: spokes.length,
      exits: exits.length, exits_free: exits.filter((b) => b.choice.sticky || b.conds.length).length,
      survey: Object.entries(survey).filter(([, n]) => n >= T.value('C-19.survey')).map(([to, n]) => ({ to, n })),
      thin: spokes.filter(back).filter((b) => lineCount(b.choice.items) <= T.value('C-19.thin_spoke')).map((b) => b.text),
    });
  }
  return { id: story.id, path: story.path, total: list.length, chapters: rows, hubs };
}

const report = refs.map(profile);
if (args.includes('--json')) {
  console.log(JSON.stringify({ stories: report, keys: { bodyless: T.value('C-10.bodyless_chapter'), cosmetic: T.value('C-10.cosmetic_chapter') } }, null, 1));
  process.exit(0);
}
const pad = (s, n) => String(s).padEnd(n);
for (const r of report) {
  console.log(`${r.path} · кнопок ${r.total}`);
  console.log(`   ${pad('гл.', 4)}${pad('кнопок', 8)}${pad('узел', 6)}${pad('пер.', 6)}${pad('репл.', 7)}${pad('пусто', 7)}${pad('молч.', 7)}${pad('отказ', 7)}${pad('без тела', 10)}${pad('космет.', 9)}${pad('развилок', 10)}${pad('пустых', 8)}${pad('усл.', 6)}${pad('адресаты', 10)}ширина`);
  for (const c of r.chapters) {
    const warnB = c.bodyless_share > T.value('C-10.bodyless_chapter') ? '!' : ' ';
    const warnC = c.cosmetic_share > T.value('C-10.cosmetic_chapter') ? '!' : ' ';
    console.log(`   ${pad(c.chapter, 4)}${pad(c.buttons, 8)}${pad(c.node, 6)}${pad(c.vars, 6)}${pad(c.reply, 7)}${pad(c.none, 7)}${pad(c.silent, 7)}${pad(c.refusal, 7)}${pad(pct(c.bodyless_share) + warnB, 10)}${pad(pct(c.cosmetic_share) + warnC, 9)}${pad(c.groups, 10)}${pad(c.groups_bodyless, 8)}${pad(c.conditional, 6)}${pad(c.addressee_groups, 10)}${c.widest}/${c.widest_free}`);
  }
  console.log(`   ! — выше C-10.bodyless_chapter (${pct(T.value('C-10.bodyless_chapter'))}) или C-10.cosmetic_chapter (${pct(T.value('C-10.cosmetic_chapter'))})`);
  if (args.includes('--hubs')) {
    console.log(r.hubs.length ? '   хабы:' : '   хабов нет');
    for (const h of r.hubs) {
      const notes = [
        h.exits_free ? null : 'нет выхода по условию или + (C-19 п. 1)',
        h.spokes < T.value('C-19.spokes_min') || h.spokes > T.value('C-19.spokes_max') ? `${h.spokes} вариантов (C-19 п. 2)` : null,
        ...h.survey.map((s) => `${s.n} вопроса к ${s.to} без ~ — анкета (C-19 п. 3)`),
        h.thin.length ? `тонкие спицы: ${h.thin.map((t) => `«${t.slice(0, 30)}»`).join(', ')} (C-19 п. 5)` : null,
      ].filter(Boolean);
      console.log(`     ${h.node} (гл. ${h.chapter}): спиц ${h.spokes}, выходов ${h.exits}${notes.length ? ' — ' + notes.join('; ') : ''}`);
    }
  }
  console.log('');
}
if (fileURLToPath(import.meta.url) && !report.length) console.log('историй нет');
