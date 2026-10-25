// Середина истории на медианном пути: окно C-38.middle_window, события в нём, инициатива игрока до и после
// (кнопки к тому, кто последним не писал), отказы собеседников по главам и темп глав до и после середины.
// Решить, меняет ли факт середины цель (R-30), команда не может — она даёт окно, где искать, и числа рядом.
import { analyze } from '../../../../scripts/lint/core.mjs';
import { isIncoming, median } from '../../../../scripts/lint/journal.mjs';
import { loadStory, storyRefs } from '../../../../scripts/lib/story.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/middle.mjs [--story <id|путь>,…] [--runs N] [--seed N] [--json]

Середина и вторая половина (скилл story-pace, R-30, C-38):
  окно        входящие медианного пути в доле C-38.middle_window (как у C-38: медиана по числу входящих
              среди дошедших до конца прогонов); узлы окна и строки на границах
  события     в окне: новый #from, #photo, #unlock, #rename, запись переменной, кнопка к адресату, которому
              игрок раньше не писал, срок мира (dict.world_deadline) — кандидаты на «факт середины»
  инициатива  доля кнопок, где #to — не тот, кто писал последним, до и после середины
  отказы      по главам: #sys с отказом молчанием (C-38.cold_sys) и реплики-отказы (dict.refusal) на сотню
              входящих — после середины их обычно больше
  темп        строки и сумма пауз по главам до и после середины

  --story   история по id, файл .json / .ink или папка; через запятую; по умолчанию все из src/stories
  --runs    прогонов бота (по умолчанию lint.runs.full, как у story:lint)
  --seed    seed (по умолчанию 1)
  --json    всё данными
  --help    эта справка

Порогов «плохо / хорошо» у этой команды нет: ровная вторая половина — кандидат для модели, а не находка.`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const T = thresholds();
const refs = storyRefs((opt('--story') ?? '').split(',').filter(Boolean));
const runsN = Number(opt('--runs') ?? T.value('lint.runs.full'));
const seed = Number(opt('--seed') ?? 1);
const win = T.value('C-38.middle_window');
const cold = T.re('C-38.cold_sys');
const refusal = T.re('dict.refusal');
const deadline = T.re('dict.world_deadline');
const short = (t, n = 60) => (t.length > n ? `${t.slice(0, n)}…` : t);

function profile(ref) {
  const story = loadStory(ref);
  const ctx = analyze(story, T, { runs: runsN, seed });
  if (!ctx.built.ok) return { id: story.id, path: story.path, error: 'ошибка компиляции — npm run story:lint' };
  const { st } = ctx;
  const ended = ctx.runs.filter((r) => r.ended);
  const counts = ended.map((r) => r.lines.filter(isIncoming).length);
  const run = ended[counts.indexOf(median(counts))];
  if (!run) return { id: story.id, path: story.path, error: 'ни один прогон не дошёл до конца — npm run check:story' };

  const inc = run.lines.filter(isIncoming);
  const from = Math.floor(inc.length * win.from);
  const to = Math.ceil(inc.length * win.to);
  const lo = inc[from]?.i ?? 0;
  const hi = inc[Math.min(to, inc.length - 1)]?.i ?? run.lines.length;
  const midLine = inc[Math.floor(inc.length / 2)]?.i ?? 0;

  // события окна
  const seen = new Set();
  const wrote = new Set();
  const events = [];
  for (const l of run.lines) {
    const inWin = l.i >= lo && l.i <= hi;
    if (isIncoming(l) && l.who && !ctx.service.has(l.who) && !seen.has(l.who)) { seen.add(l.who); if (inWin) events.push({ at: l.i, kind: 'новый #from', node: l.knot, text: l.text }); }
    if (!inWin) continue;
    if (l.kind === 'photo') events.push({ at: l.i, kind: '#photo', node: l.knot, text: l.text });
    for (const u of l.unlock) events.push({ at: l.i, kind: '#unlock', node: l.knot, text: u });
    if ('rename' in l.tags) events.push({ at: l.i, kind: '#rename', node: l.knot, text: l.tags.rename });
    if (isIncoming(l) && deadline.test(l.text.toLowerCase())) events.push({ at: l.i, kind: 'срок мира', node: l.knot, text: l.text });
  }
  for (const v of run.vars) if (v.at >= lo && v.at <= hi) events.push({ at: v.at, kind: 'переменная', node: v.knot, text: `${v.name} = ${v.value}` });
  const initiative = { before: [0, 0], after: [0, 0] };
  for (const c of run.choices) {
    const to = c.tos[c.picked];
    if (to && !ctx.service.has(to) && c.at >= lo && c.at <= hi && !wrote.has(to)) events.push({ at: c.at, kind: 'новый адресат', node: c.knot, text: `#to:${to}` });
    if (to) wrote.add(to);
    const last = [...run.lines.slice(0, c.at)].reverse().find((l) => isIncoming(l) && l.who)?.who;
    if (!to || c.silent[c.picked]) continue;
    const side = c.at < midLine ? initiative.before : initiative.after;
    side[1]++;
    if (to !== last) side[0]++;
  }

  // по главам: отказы и темп
  const N = st.lastChapter;
  const midChapter = inc[Math.floor(inc.length / 2)]?.chapter ?? 1;
  const chapters = Array.from({ length: N }, (_, i) => ({ chapter: i + 1, lines: 0, incoming: 0, delay_s: 0, refusals: 0 }));
  for (const l of run.lines) {
    const c = chapters[(l.chapter ?? 1) - 1];
    if (!c) continue;
    c.lines++;
    c.delay_s += l.delay;
    if (isIncoming(l)) c.incoming++;
    if ((l.kind === 'sys' && cold.test(l.text)) || (isIncoming(l) && refusal.test(l.text.toLowerCase()))) c.refusals++;
  }
  for (const c of chapters) c.refusals_per_100 = c.incoming ? (c.refusals * 100) / c.incoming : 0;
  const half = (side) => chapters.filter((c) => (side === 'before' ? c.chapter < midChapter : c.chapter > midChapter));
  const med = (xs) => median(xs) ?? 0;
  const tempo = {
    before: { lines: med(half('before').map((c) => c.lines)), delay_s: med(half('before').map((c) => c.delay_s)), refusals_per_100: med(half('before').map((c) => c.refusals_per_100)) },
    after: { lines: med(half('after').map((c) => c.lines)), delay_s: med(half('after').map((c) => c.delay_s)), refusals_per_100: med(half('after').map((c) => c.refusals_per_100)) },
  };
  events.sort((a, b) => a.at - b.at);
  const windowKnots = [...new Set(run.lines.filter((l) => l.i >= lo && l.i <= hi).map((l) => l.knot))];
  return {
    id: story.id, path: story.path, incoming: inc.length, window: { ...win, from_line: inc[from]?.text ?? null, to_line: inc[Math.min(to, inc.length - 1)]?.text ?? null, knots: windowKnots, mid_chapter: midChapter },
    events, initiative: { before: initiative.before[1] ? initiative.before[0] / initiative.before[1] : null, after: initiative.after[1] ? initiative.after[0] / initiative.after[1] : null, counts: initiative },
    chapters, tempo,
  };
}

const report = refs.map(profile);
if (args.includes('--json')) {
  console.log(JSON.stringify({ stories: report, keys: ['C-38.middle_window', 'C-38.cold_sys', 'dict.refusal', 'dict.world_deadline'].map((k) => T.entry(k)) }, null, 1));
  process.exit(0);
}
const pct = (x) => (x == null ? '—' : `${Math.round(x * 100)}%`);
const fmt = (s) => (s >= 3600 ? `${Math.round(s / 360) / 10} ч` : `${Math.round(s / 60)} мин`);
const pad = (s, n) => String(s).padEnd(n);
for (const r of report) {
  if (r.error) { console.log(`${r.path}: ${r.error}\n`); continue; }
  console.log(`${r.path} · медианный путь ${r.incoming} входящих · окно середины C-38.middle_window, глава середины ${r.window.mid_chapter}`);
  console.log(`   узлы окна: ${r.window.knots.join(', ')}`);
  console.log(`   начало окна: «${short(r.window.from_line ?? '')}»; конец: «${short(r.window.to_line ?? '')}»`);
  console.log(r.events.length ? `   события в окне (${r.events.length}):` : '   событий в окне нет — середина без факта (R-30)?');
  for (const e of r.events.slice(0, T.value('lint.examples') * 3)) console.log(`     ${pad(e.kind, 16)}${pad(e.node, 22)}${short(e.text)}`);
  console.log(`   инициатива (кнопка не тому, кто писал последним): до ${pct(r.initiative.before)}, после ${pct(r.initiative.after)}`);
  console.log(`   ${pad('гл.', 5)}${pad('строк', 7)}${pad('паузы', 10)}отказов на 100 входящих`);
  for (const c of r.chapters) console.log(`   ${pad(c.chapter + (c.chapter === r.window.mid_chapter ? '*' : ''), 5)}${pad(c.lines, 7)}${pad(fmt(c.delay_s), 10)}${Math.round(c.refusals_per_100)}`);
  console.log(`   медиана глав до / после середины: строк ${r.tempo.before.lines} / ${r.tempo.after.lines}, пауз ${fmt(r.tempo.before.delay_s)} / ${fmt(r.tempo.after.delay_s)}, отказов ${Math.round(r.tempo.before.refusals_per_100)} / ${Math.round(r.tempo.after.refusals_per_100)}`);
  console.log('');
}
if (!report.length) console.log('историй нет');
