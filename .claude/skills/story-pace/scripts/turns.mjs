// Повороты сцен: узлы без перемены (C-36 б), биты без разрыва (кнопка-решение получает «ок»), и таблица
// «первая и последняя входящая» каждой сцены медианного пути — заготовка для суждения модели о знаке
// ценности (R-29). Знак ценности команда не ставит: разметка `// ценность:` отменена решением A-06.
import { analyze } from '../../../../scripts/lint/core.mjs';
import { isIncoming, median, visitShare } from '../../../../scripts/lint/journal.mjs';
import { walk } from '../../../../scripts/lib/ink.mjs';
import { loadStory, storyRefs } from '../../../../scripts/lib/story.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/turns.mjs [--story <id|путь>,…] [--chapter N] [--scenes] [--runs N] [--seed N] [--json]

Повороты сцен (скилл story-pace, R-29, C-36 б):
  без перемены  узлы от C-36.static_min_lines реплик без ~, кнопки, #unlock/#rename/#photo и «?» —
                как у C-36; служебные (только условия и ->) и финальные узлы не считаются; рядом — доля
                прогонов через узел: узел редкой ветки дешевле, его сливают, а не режут
  доля          узлов без перемены от всех сцен — сравни с C-36.static_share
  бит без разрыва  кнопка-решение (ставит ~ или ведёт в свой узел), после которой первая входящая —
                короткое согласие из dict.closing («ок», «ладно», «понял»): выбор не ощущается
  --scenes      сцены медианного пути главы: узел, строк, первая и последняя входящая — по ним модель
                судит, сменился ли знак ценности (R-29); без --chapter — все главы

  --story   история по id, файл .json / .ink или папка; через запятую; по умолчанию все из src/stories
  --chapter только глава N
  --runs    прогонов бота (по умолчанию lint.runs.full, как у story:lint)
  --seed    seed (по умолчанию 1)
  --json    всё данными
  --help    эта справка

Находки и уровни — npm run story:lint -- --only C-36. Поворот ценности команда не оценивает: это суждение модели.`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const T = thresholds();
const refs = storyRefs((opt('--story') ?? '').split(',').filter(Boolean));
const onlyChapter = opt('--chapter') ? Number(opt('--chapter')) : null;
const runsN = Number(opt('--runs') ?? T.value('lint.runs.full'));
const seed = Number(opt('--seed') ?? 1);
const closing = T.re('dict.closing');
const short = (t, n = 60) => (t.length > n ? `${t.slice(0, n)}…` : t);

function profile(ref) {
  const story = loadStory(ref);
  const ctx = analyze(story, T, { runs: runsN, seed });
  if (!ctx.built.ok) return { id: story.id, path: story.path, error: 'ошибка компиляции — npm run story:lint' };
  const { st, tree } = ctx;
  const share = visitShare(ctx.runs);

  // узлы без перемены — то же правило, что C-36 (б)
  const scenes = [];
  for (const k of tree.knots) {
    let lines = 0;
    let change = false;
    let onlyRouting = true;
    walk(k.items, (it) => {
      if (it.type === 'msg') { lines++; onlyRouting = false; if (it.text.includes('?') || 'photo' in it.tags || 'unlock' in it.tags || 'rename' in it.tags) change = true; }
      if (it.type === 'code' || it.type === 'choice') change = true;
      if (it.type === 'tags' && ('unlock' in it.tags || 'rename' in it.tags)) change = true;
    });
    if (onlyRouting || st.finals.has(k.id)) continue;
    scenes.push({ node: k.id, chapter: st.chapterOf(k.id), lines, static: !change && lines >= T.value('C-36.static_min_lines'), visits: share.get(k.id) ?? 0 });
  }

  // бит без разрыва: решение → короткое согласие
  const beats = new Map();
  for (const run of ctx.runs) {
    for (const c of run.choices) {
      const b = st.button(c.knot, c.texts[c.picked]);
      if (!b || !['node', 'vars'].includes(b.cls) || c.silent[c.picked]) continue;
      const end = run.choices[c.i + 1]?.at ?? run.lines.length;
      const reply = run.lines.slice(c.at, end).find(isIncoming);
      if (!reply) continue;
      const t = reply.text.trim();
      if (t.split(/\s+/).length > 2 || !closing.test(t.toLowerCase())) continue;
      const key = `${c.knot}|${b.text}`;
      if (!beats.has(key)) beats.set(key, { node: c.knot, chapter: c.chapter, button: b.text, reply: t, cls: b.cls });
    }
  }

  // сцены медианного пути: первая и последняя входящая узла
  const ended = ctx.runs.filter((r) => r.ended);
  const counts = ended.map((r) => r.lines.filter(isIncoming).length);
  const run = ended[counts.indexOf(median(counts))];
  const path = [];
  if (run) {
    for (const l of run.lines.filter(isIncoming)) {
      const last = path.at(-1);
      if (last && last.node === l.knot) { last.lines++; last.last = l.text; continue; }
      path.push({ node: l.knot, chapter: l.chapter, lines: 1, first: l.text, last: l.text });
    }
  }
  const keep = (x) => onlyChapter == null || x.chapter === onlyChapter;
  const sc = scenes.filter(keep);
  return {
    id: story.id, path: story.path,
    scenes: sc.length, static: sc.filter((s) => s.static), static_share: sc.length ? sc.filter((s) => s.static).length / sc.length : 0,
    flat_beats: [...beats.values()].filter(keep),
    median_scenes: path.filter(keep),
  };
}

const report = refs.map(profile);
if (args.includes('--json')) {
  console.log(JSON.stringify({ stories: report, keys: ['C-36.static_min_lines', 'C-36.static_share', 'dict.closing'].map((k) => T.entry(k)) }, null, 1));
  process.exit(0);
}
const pct = (x) => `${Math.round(x * 100)}%`;
for (const r of report) {
  if (r.error) { console.log(`${r.path}: ${r.error}\n`); continue; }
  const over = r.static_share > T.value('C-36.static_share') ? ' — выше C-36.static_share' : '';
  console.log(`${r.path}${onlyChapter ? ` · глава ${onlyChapter}` : ''} · сцен ${r.scenes}, без перемены ${r.static.length} (${pct(r.static_share)}${over})`);
  for (const s of r.static) console.log(`   без перемены: ${s.node} (гл. ${s.chapter}), реплик ${s.lines}, через узел ${pct(s.visits)} прогонов`);
  console.log(r.flat_beats.length ? `   биты без разрыва: ${r.flat_beats.length}` : '   битов без разрыва нет');
  for (const b of r.flat_beats) console.log(`     ${b.node} (гл. ${b.chapter}): [${short(b.button, 40)}] → «${b.reply}»`);
  if (args.includes('--scenes')) {
    console.log('   сцены медианного пути (узел · строк · первая → последняя входящая):');
    for (const s of r.median_scenes) console.log(`     гл. ${s.chapter} ${s.node} · ${s.lines} · «${short(s.first)}» → «${short(s.last)}»`);
  }
  console.log('');
}
if (!report.length) console.log('историй нет');
