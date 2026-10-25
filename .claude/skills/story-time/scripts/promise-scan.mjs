// Паузы и сроки возвращения (скилл story-time, C-27, R-63, A-01): каждое место паузы от story.pause.notice_min
// с окном до неё и первой строкой после — чтобы сверить находку с текстом, а не с одной строкой линта.
// Места и уровни — из самой проверки C-27 (pausePlaces и её run на тех же прогонах), поэтому числа
// совпадают с `npm run story:lint -- --only C-27`. Сверх линта — сроки возвращения во всём тексте, а не
// только перед паузой: в «по клику» любое «напишу утром» приходит через секунду.
import { loadStory, storyRefs } from '../../../../scripts/lib/story.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';
import { returnDeadline } from '../../../../scripts/lib/lexicon.mjs';
import { walk } from '../../../../scripts/lib/ink.mjs';
import { lintStory } from '../../../../scripts/lint/core.mjs';
import C27, { pausePlaces } from '../../../../scripts/lint/checks/C-27.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/promise-scan.mjs [<id>] [--story <id|путь>,…] [--node <узел>] [--all] [--runs N] [--seed N] [--partial] [--json]

Паузы без причины и сроки возвращения (скилл story-time; проверка C-27; правила R-63, R-122; решение A-01).
Для каждой паузы от story.pause.notice_min на прогонах бота — место, длина, окно C-27.window_lines строк до
паузы и первая строка после неё (кто пишет, стык главы). Метки:
  ⚠/ℹ без причины   находка C-27.long_h (от C-27.long_h) или C-27.unexplained (короче) — как в story:lint
  ⚠ срок            перед паузой персонаж называет срок возвращения (dict.return_deadline) — C-27.deadline
  ℹ обрыв           последняя строка до паузы кончается запятой или «…» (dict.midlist) — C-27.midlist
  ✓ объяснено       чем: слово причины (dict.pause_reason), «не в сети», исключение R-63 или калибровки C-27
Отдельно — сроки возвращения во всём тексте (статически, по ink): те, что не стоят прямо перед паузой, —
кандидаты. Сюжетный срок («слушание в десять») законен (R-63); обещание вернуться к сроку — нет.

  --story     история по id, файл .json / .ink или папка; через запятую; по умолчанию все из src/stories
  --node      только места в этом узле (и его stitch)
  --all       показать и объяснённые паузы (по умолчанию — только находки и счёт объяснённых)
  --runs N    прогонов бота (по умолчанию lint.runs.full, как у story:lint)
  --seed N    seed (по умолчанию 1, как у story:lint)
  --partial   история из части глав: узел beta_stop — законный конец
  --json      всё данными
  --help      эта справка

Сверка: npm run -s story:lint -- --story <id> --only C-27 даёт те же находки.`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const T = thresholds();
// id без ключа — тоже история: иначе вызов молча идёт по всему каталогу
const VALUED = new Set(['--story', '--node', '--runs', '--seed']);
const positional = args.filter((a, i) => !a.startsWith('--') && !VALUED.has(args[i - 1]));
const refs = storyRefs([...(opt('--story') ?? '').split(','), ...positional].filter(Boolean));
const onlyNode = opt('--node');
const runs = Number(opt('--runs') ?? T.value('lint.runs.full'));
const seed = Number(opt('--seed') ?? 1);

const fmt = (sec) => {
  if (sec < 60) return `${Math.round(sec)} с`;
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return !h ? `${m} мин` : m ? `${h} ч ${m} мин` : `${h} ч`;
};
const inNode = (knot) => !onlyNode || knot === onlyNode || knot?.startsWith(`${onlyNode}.`);

async function scan(ref) {
  const story = loadStory(ref);
  let ctx = null;
  // та же проверка на тех же прогонах: ctx — тот, что видел C-27, находки — после подавления «// намеренно:»
  const probe = { ...C27, run(c, find) { ctx = c; C27.run(c, find); } };
  const res = await lintStory(story, T, { checks: [probe], runs, seed, partial: args.includes('--partial') });
  if (!ctx) return { id: story.id, path: story.path, error: res.findings[0]?.message ?? 'не собралась' };
  const places = pausePlaces(ctx).filter((p) => inNode(p.knot));
  const findings = res.findings.filter((f) => inNode(f.node));
  const byPlace = (p) => findings.filter((f) => f.node === p.knot && f.message.includes(fmt(p.delay)));
  const rows = places.map((p) => {
    const fs = byPlace(p);
    return {
      node: p.knot, chapter: ctx.st.chapterOf(p.knot), delay: p.delay, runs: p.n, bare: p.bare,
      deadline: p.deadline, midlist: p.mid * 2 > p.n, why: p.why,
      findings: fs.map((f) => ({ key: f.key, level: f.level })),
      before: p.before, after: p.after,
    };
  });
  // сроки возвращения в тексте: перед паузой (уже находка C-27.deadline) или где-то ещё — кандидат
  const nearPause = new Set(places.map((p) => p.deadline).filter(Boolean));
  const promises = [];
  for (const k of ctx.tree.knots) {
    if (!inNode(k.id)) continue;
    walk(k.items, (it, path) => {
      if (it.type !== 'msg' || !returnDeadline(it.text, T)) return;
      const silenced = path.some((x) => x.type === 'choice' && x.role !== 'button');
      promises.push({ node: k.id, chapter: ctx.st.chapterOf(k.id), line: it.line, file: k.file ?? null, who: it.who, text: it.text, before_pause: nearPause.has(it.text), hidden_branch: silenced });
    });
  }
  const suppressed = res.suppressed.filter((f) => inNode(f.node)).map((f) => ({ key: f.key, node: f.node, reason: f.suppressed }));
  return { id: story.id, path: story.path, runs: ctx.runs.length, notice_min: T.value('story.pause.notice_min'), places: rows, findings, suppressed, promises };
}

const report = [];
for (const ref of refs) report.push(await scan(ref));
if (args.includes('--json')) {
  console.log(JSON.stringify({ stories: report }, null, 1));
  process.exit(0);
}

const who = (x) => (x.kind === 'sys' ? '#sys' : x.who ?? '—');
for (const r of report) {
  if (r.error) { console.log(`${r.path}: нет данных — ${r.error}\n`); continue; }
  const lv = (l) => r.findings.filter((f) => f.level === l).length;
  console.log(`${r.path} · прогонов бота ${r.runs} · пауз от ${r.notice_min} мин: ${r.places.length} мест`);
  console.log(`   C-27 (как в story:lint): ошибок ${lv('error')}, предупреждений ${lv('warning')}, подсказок ${lv('hint')}${r.suppressed.length ? ` · подавлено «// намеренно:» ${r.suppressed.length}` : ''}`);
  const show = r.places.filter((p) => p.findings.length || args.includes('--all'));
  for (const p of show.sort((a, b) => (a.chapter ?? 0) - (b.chapter ?? 0) || b.delay - a.delay)) {
    const marks = p.findings.map((f) => `${f.level === 'warning' ? '⚠' : 'ℹ'} ${f.key}`);
    const status = marks.length ? marks.join(', ') : `✓ ${p.why ?? 'объяснено'}`;
    console.log(`\n   ${p.node} (гл. ${p.chapter}) · пауза ${fmt(p.delay)} · ${status}${p.bare && p.bare < p.runs ? ` · без причины в ${p.bare} из ${p.runs} прогонов` : ''}`);
    for (const b of p.before) console.log(`      ${who(b)}: ${b.text}`);
    console.log(`      → через ${fmt(p.delay)}, ${who(p.after)}${p.after.who !== p.before.at(-1)?.who ? ' (другой контакт)' : ''}${p.after.isChapter ? ' [стык главы]' : ''}: ${p.after.text}`);
  }
  const explained = r.places.filter((p) => !p.findings.length);
  if (!args.includes('--all') && explained.length) {
    const why = new Map();
    for (const p of explained) { const k = (p.why ?? 'объяснено').replace(/: «.*$/, ''); why.set(k, (why.get(k) ?? 0) + 1); }
    console.log(`\n   объяснено ${explained.length}: ${[...why].map(([k, n]) => `${k} — ${n}`).join(', ')} (все — --all)`);
  }
  const loose = r.promises.filter((x) => !x.before_pause);
  console.log(`\n   сроки возвращения в тексте: ${r.promises.length} (перед паузой — ${r.promises.length - loose.length}, без паузы рядом — ${loose.length})`);
  for (const x of r.promises) console.log(`      ${x.before_pause ? '⚠' : 'ℹ'} ${x.node} (гл. ${x.chapter}) ${x.who ?? ''}: «${x.text}»${x.before_pause ? ' — перед паузой (C-27.deadline)' : ' — сюжетный факт или обещание вернуться? (R-63)'}`);
  for (const s of r.suppressed) console.log(`      · подавлено: ${s.node} ${s.key} — ${s.reason}`);
  console.log('');
}
if (!report.length) console.log('историй нет');
