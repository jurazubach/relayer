// Знакомство перед выбором между людьми: в точках выбора, где кнопки уходят разным контактам, — сколько
// входящих от каждого кандидата было в этой главе до выбора (медиана по прогонам бота). Те же прогоны и тот
// же отбор, что у C-17 (seed 1, lint.runs.full; спицы хаба и служебные чаты не кандидаты), поэтому
// отмеченные точки совпадают с находками `npm run story:lint -- --only C-17`. Плюс счёт за всю историю —
// для контекста, а не для порога: за десять глав главный союзник всегда знакомее новичка.
import { loadStory, storyRefs } from '../../../../scripts/lib/story.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';
import { walk } from '../../../../scripts/lib/ink.mjs';
import { analyze } from '../../../../scripts/lint/core.mjs';
import { isIncoming, median } from '../../../../scripts/lint/journal.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/people-balance.mjs [--story <id|путь>,…] [--all] [--runs N] [--json]

Перекос знакомства перед выбором между людьми (скилл story-choices, R-49, проверка C-17, people-choice.md):
  точка       узел развилки и глава
  кандидаты   адресаты кнопок (#to); спица хаба и служебные чаты (dict.service_contacts) не считаются
  в главе     медиана входящих от кандидата в этой главе до выбора — по ней C-17
  за историю  медиана входящих с начала истории до выбора — только контекст
  ! — у большего не меньше C-17.min_msgs и отношение выше C-17.ratio: дилемма предрешена

  --story     история по id, файл .json / .ink или папка; через запятую; по умолчанию все из src/stories
  --all       все точки выбора между людьми, а не только с перекосом
  --runs N    прогонов бота (по умолчанию lint.runs.full — как у story:lint)
  --json      всё данными
  --help      эта справка`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const T = thresholds();
const refs = storyRefs((opt('--story') ?? '').split(',').filter(Boolean));
const runs = opt('--runs') ? Number(opt('--runs')) : T.value('lint.runs.full');
const minMsgs = T.value('C-17.min_msgs');
const ratio = T.value('C-17.ratio');

const report = [];
for (const ref of refs) {
  const story = loadStory(ref);
  const ctx = analyze(story, T, { runs, seed: 1 });
  if (!ctx.built.ok) { report.push({ id: story.id, path: story.path, error: 'нет данных: история не компилируется' }); continue; }
  const { st } = ctx;
  const spoke = (knot, text) => {
    const b = st.button(knot, text);
    let back = false;
    if (b) walk(b.choice.items, (it) => { if (it.type === 'divert' && (it.target === knot || st.labels.get(knot)?.has(it.target))) back = true; });
    return back;
  };
  const points = new Map();
  for (const run of ctx.runs) {
    for (const c of run.choices) {
      const who = [...new Set(c.tos.filter((t, i) => t && !c.silent[i] && !ctx.service.has(t) && !spoke(c.knot, c.texts[i])))];
      if (who.length < 2) continue;
      const before = run.lines.slice(0, c.at).filter(isIncoming);
      if (!points.has(c.key)) points.set(c.key, { knot: c.knot, chapter: c.chapter, who, chapterCounts: Object.fromEntries(who.map((w) => [w, []])), storyCounts: Object.fromEntries(who.map((w) => [w, []])), seen: 0 });
      const p = points.get(c.key);
      p.seen++;
      for (const w of who) {
        p.chapterCounts[w]?.push(before.filter((l) => l.who === w && l.chapter === c.chapter).length);
        p.storyCounts[w]?.push(before.filter((l) => l.who === w).length);
      }
    }
  }
  const rows = [...points.values()].map((p) => {
    const chapter = Object.fromEntries(Object.entries(p.chapterCounts).map(([w, xs]) => [w, median(xs) ?? 0]));
    const whole = Object.fromEntries(Object.entries(p.storyCounts).map(([w, xs]) => [w, median(xs) ?? 0]));
    const sorted = Object.entries(chapter).sort((a, b) => b[1] - a[1]);
    const [a, b] = [sorted[0], sorted.at(-1)];
    const skew = a[1] >= minMsgs && a[1] / Math.max(b[1], 1) > ratio;
    return { knot: p.knot, chapter: p.chapter, runs: p.seen, candidates: p.who, in_chapter: chapter, in_story: whole, skew, more: a[0], less: b[0] };
  });
  report.push({ id: story.id, path: story.path, points: rows });
}

if (args.includes('--json')) {
  console.log(JSON.stringify({ stories: report, keys: { min_msgs: minMsgs, ratio } }, null, 1));
  process.exit(0);
}
for (const r of report) {
  if (r.error) { console.log(`${r.path}: ${r.error}\n`); continue; }
  const shown = args.includes('--all') ? r.points : r.points.filter((p) => p.skew);
  console.log(`${r.path} · точек выбора между людьми ${r.points.length}, с перекосом ${r.points.filter((p) => p.skew).length}`);
  for (const p of shown) {
    const fmt = (o) => Object.entries(o).map(([w, n]) => `${w} ${n}`).join(' / ');
    console.log(`   ${p.skew ? '!' : ' '} ${p.knot} (гл. ${p.chapter}, прогонов ${p.runs}): в главе ${fmt(p.in_chapter)} · за историю ${fmt(p.in_story)}`);
  }
  console.log(`   ! — у большего не меньше C-17.min_msgs (${minMsgs}) и больше чем в C-17.ratio (${ratio}) раза — правка: сцена слабой стороне (people-choice.md, PAT-07)\n`);
}
