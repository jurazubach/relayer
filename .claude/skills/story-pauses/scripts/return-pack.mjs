// Пачка непрочитанного у отвлечённого игрока: он уходит на каждой паузе от story.pause.session_s и возвращается,
// когда очередь дошла до кнопки (персона distracted, scripts/story/core/personas.mjs). Прогоны и счёт — те же, что у
// `npm run story:sessions -- --persona distracted` (runOnce, seed 1, bot.runs, timeline().batches), поэтому медиана,
// перцентиль и наибольшая пачка совпадают с ним. Сверху — то, чего sessions не показывает: первая строка каждой
// пачки (её игрок видит первой) и где пачки повторяются.
import { prepare, runOnce } from '../../../../scripts/story/core/run.mjs';
import { median } from '../../../../scripts/story/core/cli.mjs';
import { fmtDuration } from '../../../../scripts/story/core/timeline.mjs';
import { isClosing } from '../../../../scripts/lib/lexicon.mjs';
import { storyRefs } from '../../../../scripts/lib/story.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/return-pack.mjs [--story <id|путь>,…] [--runs N] [--seed N] [--top N] [--json]

Пачка непрочитанного при возвращении (скилл story-pauses: R-72, C-28, #attn-return-batch; приём F-02, F-03).
Числа совпадают с npm run story:sessions -- --persona distracted.

  пачка       строк от ухода до кнопки, которые игрок прочтёт одной стеной (входящие, #sys, #me)
  уведомлений сколько пауз внутри пачки (каждая — ещё одно уведомление, пока игрока нет)
  первая      первая входящая строка пачки: «привет» — приветствие, пустая или закрывающая (dict.greeting,
              dict.closing); её видно в уведомлении и в чате первой
  где         узел, с которого начался уход, и глава

  --story     история по id, файл .json / .ink или папка; через запятую; по умолчанию все из src/stories
  --runs N    прохождений (по умолчанию bot.runs, как story:sessions)
  --seed N    начальный seed (по умолчанию 1)
  --top N     сколько самых больших мест показать (по умолчанию 8)
  --json      всё данными
  --help      эта справка`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const T = thresholds();
const refs = storyRefs((opt('--story') ?? '').split(',').filter(Boolean));
const runs = Number(opt('--runs') ?? T.value('bot.runs'));
const seed = Number(opt('--seed') ?? 1);
const top = Number(opt('--top') ?? 8);

// тот же перцентиль по ближайшему рангу, что в story:sessions
const percentile = (arr, p) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1))];
};
const isIncoming = (i) => i.kind === 'in' || i.kind === 'photo';
const empty = (text) => {
  const n = String(text).toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim();
  return !n || T.re('dict.greeting').test(n) || isClosing(text, T);
};

const report = [];
for (const ref of refs) {
  const p = prepare(ref);
  const packs = [];
  const places = new Map();
  for (let k = 0; k < runs; k++) {
    const r = runOnce(p, { persona: 'distracted', seed: seed + k });
    const items = r.timeline.items.filter((i) => i.type === 'line');
    r.timeline.batches.forEach((b, idx) => {
      const lines = items.filter((i) => i.batch === idx);
      const first = lines.find(isIncoming) ?? lines[0];
      packs.push(b.lines);
      const key = `${b.knot}|${first?.text ?? ''}`;
      const pl = places.get(key) ?? { knot: b.knot, chapter: b.chapter, first: first?.text ?? '', who: first?.whoName ?? null, sizes: [], notices: [], spans: [], empty: first ? empty(first.text) : true };
      pl.sizes.push(b.lines);
      pl.notices.push(b.notices);
      pl.spans.push(b.span ?? 0);
      places.set(key, pl);
    });
  }
  const pct = T.value('C-28.pack_percentile');
  const list = [...places.values()].map((x) => ({
    knot: x.knot, chapter: x.chapter, first: x.first, who: x.who, empty_first: x.empty, seen: x.sizes.length,
    pack: median(x.sizes), max: Math.max(...x.sizes), notices: median(x.notices), away: median(x.spans),
  })).sort((a, b) => b.pack - a.pack || b.seen - a.seen);
  const summary = packs.length ? {
    count: packs.length, median: median(packs), p: percentile(packs, pct), max: Math.max(...packs),
    over: packs.filter((n) => n > T.value('C-28.pack')).length, empty_first: list.filter((x) => x.empty_first).length,
  } : null;
  report.push({ id: p.story.id, path: p.story.path, runs, seed, percentile: pct, summary, places: list });
}

if (args.includes('--json')) {
  console.log(JSON.stringify({ stories: report, keys: { pack: T.value('C-28.pack'), percentile: T.value('C-28.pack_percentile') } }, null, 1));
  process.exit(0);
}
for (const r of report) {
  console.log(`${r.path} · отвлечённый, ${r.runs} прохождений`);
  if (!r.summary) { console.log('   отлучек нет: пауз от story.pause.session_s до кнопки нет\n'); continue; }
  const s = r.summary;
  console.log(`   отлучек ${s.count}: пачка медиана ${s.median} строк, p${Math.round(r.percentile * 100)} ${s.p}, наибольшая ${s.max}; выше C-28.pack (${T.value('C-28.pack')}) — ${s.over}; мест, где пачка начинается пустой строкой, — ${s.empty_first}`);
  console.log(`   самые большие пачки (место — узел ухода и первая строка):`);
  for (const x of r.places.slice(0, top)) {
    console.log(`     гл.${x.chapter} ${x.knot} · пачка ${x.pack} (до ${x.max}) · уведомлений ${x.notices} · отсутствие ~${fmtDuration(x.away)} · ${x.seen} раз${x.empty_first ? ' · ⚠ привет' : ''}`);
    console.log(`        первая: ${x.who ? `${x.who}: ` : ''}«${x.first.length > 80 ? x.first.slice(0, 79) + '…' : x.first}»`);
  }
  console.log('');
}
