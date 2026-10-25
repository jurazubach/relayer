// Ритм по главам: серии без кнопки, монологи, затишье, цепочки без конкретики, паузы и доли глав.
// Считает на том же контексте, что story:lint (analyze: те же прогоны бота и seed), поэтому максимумы серий
// совпадают с находками C-35 и C-36, а доли глав и ровные паузы — с C-38 (медианный путь).
import { analyze } from '../../../../scripts/lint/core.mjs';
import { isCalm } from '../../../../scripts/lint/checks/C-38.mjs';
import { heaviest, monologueOf } from '../../../../scripts/lint/checks/C-35.mjs';
import { isIncoming, median } from '../../../../scripts/lint/journal.mjs';
import { firstLines, heroNames } from '../../../../scripts/lint/text.mjs';
import { loadStory, storyRefs } from '../../../../scripts/lib/story.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/pace.mjs [--story <id|путь>,…] [--chapter N] [--top N] [--runs N] [--seed N] [--json]

Ритм истории по главам (скилл story-pace, проверки C-35, C-36, C-38):
  серия     самая длинная серия входящих без кнопки по всем прогонам: длина, слова, узел, где у неё больше
            всего строк (как у C-35), и откуда она началась
  монолог   самая длинная цепочка одного #from подряд без «?» и таймера (C-35.monologue)
  затишье   самая длинная серия без события: кнопка, #photo, #unlock, новый #from, «?» (C-36.lull);
            после последней кнопки прогона не считается — развязку меряет C-42
  без конкр. самая длинная цепочка входящих без цифры, имени, цитаты и #photo (C-36.vague)
  медианный путь (C-38): строки и кнопки главы, её доля, медиана пауз от C-38.pause_min_s,
            отрезки с ровными паузами (C-38.pause_spread), передышка — без срока и угрозы в начале
  --top N   ещё N самых длинных серий истории с узлами (по умолчанию lint.examples)

  --story   история по id, файл .json / .ink или папка; через запятую; по умолчанию все из src/stories
  --chapter только глава N
  --runs    прогонов бота (по умолчанию lint.runs.full, как у story:lint)
  --seed    seed (по умолчанию 1, как у story:lint)
  --json    всё данными
  --help    эта справка

Пороги — ключи docs/playbook/thresholds.json; уровни и находки — npm run story:lint -- --only C-35,C-36,C-38.
«!» в таблице — выше порога проверки. «Скучно» эта команда не решает: она показывает места-кандидаты.`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const T = thresholds();
const refs = storyRefs((opt('--story') ?? '').split(',').filter(Boolean));
const onlyChapter = opt('--chapter') ? Number(opt('--chapter')) : null;
const top = Number(opt('--top') ?? T.value('lint.examples'));
const runsN = Number(opt('--runs') ?? T.value('lint.runs.full'));
const seed = Number(opt('--seed') ?? 1);
const words = (t) => t.split(/\s+/).filter(Boolean).length;

function profile(ref) {
  const story = loadStory(ref);
  const ctx = analyze(story, T, { runs: runsN, seed });
  if (!ctx.built.ok) return { id: story.id, path: story.path, error: 'ошибка компиляции — npm run story:lint' };
  const { st } = ctx;
  const N = st.lastChapter;
  const by = Array.from({ length: N }, (_, i) => ({ chapter: i + 1, series: null, mono: null, lull: null, vague: null }));
  const bump = (slot, c, cand) => { const s = by[(c ?? 1) - 1]; if (s && (!s[slot] || cand.n > s[slot].n)) s[slot] = cand; };
  const allSeries = new Map();
  const names = [...heroNames(ctx).keys()].map((n) => n.slice(0, 4));
  const concrete = (l) => /\d/.test(l.text) || /[«»"]/.test(l.text) || l.kind === 'photo' || names.some((n) => l.text.toLowerCase().includes(n));

  for (const run of ctx.runs) {
    let at = 0;
    for (const c of run.choices) {
      const raw = run.lines.slice(at, c.at);
      const seg = raw.filter(isIncoming);
      at = c.at;
      if (!seg.length) continue;
      const h = heaviest(seg);
      const w = seg.reduce((s, l) => s + words(l.text), 0);
      const cand = { n: seg.length, words: w, knot: h.knot, start: seg[0].knot, knots: h.knots };
      bump('series', h.chapter, cand);
      const prev = allSeries.get(h.knot);
      if (!prev || cand.n > prev.n) allSeries.set(h.knot, { ...cand, chapter: h.chapter });
      // монолог — то же правило, что у C-35 (вопрос, на который отвечает кнопка, и таймер его гасят)
      const best = monologueOf(seg, T, raw);
      if (best) {
        const b = heaviest(best);
        bump('mono', b.chapter, { n: best.length, who: best[0].who, knot: b.knot });
      }
    }
    // затишье и конкретика — правила C-36 (а) и (в)
    const firstOf = firstLines(run);
    const tailFrom = run.seq.findLastIndex((x) => x.type === 'choice');
    let lull = [];
    let vague = [];
    run.seq.forEach((item, pos) => {
      const reset = item.type === 'choice' || item.kind === 'photo' || item.unlock?.length || item.text?.includes('?') || (item.who && firstOf.get(item.who) === item.i);
      if (item.type === 'line' && isIncoming(item)) {
        if (reset) lull = []; else lull.push(item);
        if (pos < tailFrom && lull.length) { const h = heaviest(lull); bump('lull', h.chapter, { n: lull.length, knot: h.knot }); }
        if (concrete(item)) vague = []; else vague.push(item);
        if (vague.length) bump('vague', vague[0].chapter, { n: vague.length, knot: vague[0].knot });
      } else if (reset) { lull = []; vague = []; }
    });
  }

  // медианный путь — как у C-38
  const ended = ctx.runs.filter((r) => r.ended);
  const counts = ended.map((r) => r.lines.filter(isIncoming).length);
  const m = median(counts);
  const run = ended[counts.indexOf(m)];
  const path = Array.from({ length: N }, () => ({ lines: 0, buttons: 0, delays: [] }));
  const spread = [];
  const breathers = [];
  if (run) {
    for (const l of run.lines) {
      const c = path[(l.chapter ?? 1) - 1];
      if (!c) continue;
      c.lines++; // все строки пути, как у C-38: доли глав сравнимы с его находками
      if (l.delay >= T.value('C-38.pause_min_s')) c.delays.push(l.delay);
    }
    for (const ch of run.choices) if (path[ch.chapter - 1]) path[ch.chapter - 1].buttons++;
    let seg = [];
    let knot = null;
    const flush = () => {
      if (seg.length >= T.value('C-38.spread_min_pauses') && Math.max(...seg) / Math.min(...seg) < T.value('C-38.pause_spread')) spread.push({ knot, chapter: st.chapterOf(knot), pauses: seg.length });
      seg = []; knot = null;
    };
    for (const item of run.seq) {
      if (item.type === 'choice') { flush(); continue; }
      if (item.delay >= T.value('C-38.pause_min_s')) { seg.push(item.delay); knot ??= item.knot; }
    }
    for (let c = 1; c <= N; c++) {
      const first = run.lines.filter((l) => l.chapter === c && isIncoming(l)).slice(0, T.value('C-38.breather_lines'));
      breathers.push(isCalm(first, T));
    }
  }
  const total = path.reduce((s, c) => s + c.lines, 0) || 1;
  const chapters = by.map((c, i) => ({
    ...c,
    path_lines: path[i].lines, path_buttons: path[i].buttons, share: path[i].lines / total,
    pause_median_s: median(path[i].delays) ?? 0, breather: breathers[i] ?? false,
    limit: i === 0 ? 'C-35.series_ch1' : 'C-35.series',
  })).filter((c) => onlyChapter == null || c.chapter === onlyChapter);
  const longest = [...allSeries.values()].sort((a, b) => b.n - a.n).slice(0, top);
  return { id: story.id, path: story.path, runs: ctx.runs.length, seed, median_path: run ? { lines: m } : null, chapters, longest, even_pauses: spread };
}

const report = refs.map(profile);
if (args.includes('--json')) {
  const keys = ['C-35.series_ch1', 'C-35.series', 'C-35.monologue', 'C-36.lull', 'C-36.vague', 'C-38.ch1_share', 'C-38.last_share', 'C-38.pause_spread'].map((k) => T.entry(k));
  console.log(JSON.stringify({ stories: report, keys }, null, 1));
  process.exit(0);
}
const pad = (s, n) => String(s).padEnd(n);
const pct = (x) => `${Math.round(x * 100)}%`;
const fmt = (s) => (s >= 3600 ? `${Math.round(s / 360) / 10} ч` : s >= 60 ? `${Math.round(s / 60)} мин` : `${Math.round(s)} с`);
const mark = (v, key) => (v > T.value(key) ? '!' : ' ');
for (const r of report) {
  if (r.error) { console.log(`${r.path}: ${r.error}\n`); continue; }
  console.log(`${r.path} · прогонов ${r.runs}, seed ${r.seed} (как story:lint) · медианный путь: ${r.median_path?.lines ?? '—'} входящих`);
  console.log(`   ${pad('гл.', 4)}${pad('серия', 22)}${pad('монолог', 20)}${pad('затишье', 22)}${pad('без конкр.', 12)}${pad('путь: строк', 13)}${pad('кнопок', 8)}${pad('доля', 7)}${pad('пауза', 9)}передышка`);
  for (const c of r.chapters) {
    const s = c.series ? `${c.series.n}${mark(c.series.n, c.limit)} ${c.series.knot}` : '—';
    const mo = c.mono ? `${c.mono.n}${mark(c.mono.n, 'C-35.monologue')} ${c.mono.who ?? ''}` : '—';
    const l = c.lull ? `${c.lull.n}${mark(c.lull.n, 'C-36.lull')} ${c.lull.knot}` : '—';
    const v = c.vague ? `${c.vague.n}${c.vague.n >= T.value('C-36.vague') ? '!' : ' '}` : '—';
    const share = `${pct(c.share)}${c.chapter === 1 ? mark(c.share, 'C-38.ch1_share') : ''}`;
    console.log(`   ${pad(c.chapter, 4)}${pad(s, 22)}${pad(mo, 20)}${pad(l, 22)}${pad(v, 12)}${pad(c.path_lines, 13)}${pad(c.path_buttons, 8)}${pad(share, 7)}${pad(fmt(c.pause_median_s), 9)}${c.breather ? 'да' : ''}`);
  }
  console.log(`   ! — выше порога: серия C-35.series_ch1 / C-35.series, монолог C-35.monologue, затишье C-36.lull, конкретика C-36.vague, доля главы 1 C-38.ch1_share`);
  if (r.longest.length) {
    console.log('   самые длинные серии (узел, где больше строк ← начало):');
    for (const x of r.longest) console.log(`     ${pad(x.n, 4)}${pad(`${x.words} сл.`, 9)}гл. ${pad(x.chapter, 4)}${x.knot}${x.start !== x.knot ? ` ← ${x.start} (узлов ${x.knots})` : ''}`);
  }
  if (r.even_pauses.length) console.log(`   ровные паузы (C-38.pause_spread): ${r.even_pauses.map((e) => `${e.knot} (${e.pauses})`).join(', ')}`);
  console.log('');
}
if (!report.length) console.log('историй нет');
