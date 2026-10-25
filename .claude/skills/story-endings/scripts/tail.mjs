// Хвост и развязка по финалам: сколько сообщений и ожидания после последней кнопки, от скольких людей,
// не короче ли финал соседей и не раньше ли он медианы (R-110, R-112; C-41, C-42, C-43; приём F-12).
// Прогоны — тот же бот и seed, что у story:lint (lint.runs.full), поэтому числа совпадают с C-41 и C-42.
import { loadStory, storyRefs } from '../../../../scripts/lib/story.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';
import { analyze, lintStory } from '../../../../scripts/lint/core.mjs';
import { endingCandidates, endingOf } from '../../../../scripts/lint/endings.mjs';
import { isIncoming, median } from '../../../../scripts/lint/journal.mjs';
import { fmtDur } from '../../../../scripts/lint/text.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/tail.mjs [--story <id|путь>,…] [--runs N] [--json]

Хвост после последней кнопки по каждому финалу (скилл story-endings; R-110, R-112; C-41, C-42, C-43):
  прогонов   сколько прогонов бота кончились в этом финале
  хвост      медиана входящих после последней кнопки — подсказка выше C-42.msgs (в истории не длиннее
             story.short_min минут — C-42.msgs_short); тоньше C-42.thin или один отправитель — у остальных
             людей нет последствий
  ждать      медиана Σ #delay после последней кнопки — предупреждение выше story.tail.max_delay_min (A-05)
  от людей   медиана числа разных отправителей в хвосте
  длина      самый короткий прогон в финал / медиана всех прогонов — ниже C-41.short_hint ранний финал
             (C-41.short_warning — предупреждение); хвост / самый длинный хвост — ниже C-41.ending_ratio
             плохой финал читается как наказание (R-112)
Ниже — находки story:lint C-41, C-42, C-43 на тех же прогонах (открытая петля, первый собеседник,
мораль вслух, голое «Конец» — только линт). Финал без меток — ориентировочно по узлам (C-40).

  --story   история по id, файл .json / .ink или папка; через запятую; по умолчанию все из src/stories
  --runs N  прогонов бота (по умолчанию lint.runs.full — как у story:lint)
  --json    всё данными
  --help    эта справка`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const T = thresholds();
const refs = storyRefs((opt('--story') ?? '').split(',').filter(Boolean));
const runs = opt('--runs') ? Number(opt('--runs')) : T.value('lint.runs.full');
const ratio = (x) => String(Math.round(x * 100) / 100).replace('.', ',');

const report = [];
for (const ref of refs) {
  const story = loadStory(ref);
  const ctx = analyze(story, T, { runs, seed: 1 });
  if (!ctx.built.ok) { report.push({ id: story.id, path: story.path, error: 'ошибка компиляции — npm run story:lint покажет где' }); continue; }
  const { st } = ctx;
  const ended = ctx.runs.filter((r) => r.ended);
  const cand = endingCandidates(st);
  const med = median(ended.map((r) => r.lines.length));
  const short = ctx.meta.minutes != null && ctx.meta.minutes <= T.value('story.short_min');
  const msgsKey = short ? 'C-42.msgs_short' : 'C-42.msgs';
  // как C-41 и C-42: финал прогона — метка или кандидат, иначе последний узел
  const by = new Map();
  for (const r of ended) {
    const last = r.choices.at(-1);
    const tail = last ? r.lines.slice(last.at) : r.lines;
    const inc = tail.filter(isIncoming);
    const e = endingOf(r, st, cand) ?? tail.at(-1)?.knot ?? r.lines.at(-1)?.knot ?? '?';
    const p = by.get(e) ?? { runs: 0, len: [], msgs: [], delay: [], froms: [] };
    p.runs++;
    p.len.push(r.lines.length);
    if (last) {
      p.msgs.push(inc.length);
      p.delay.push(tail.reduce((s, l) => s + l.delay, 0));
      p.froms.push(new Set(inc.map((l) => l.who)).size);
    }
    by.set(e, p);
  }
  const longest = Math.max(0, ...[...by.values()].map((p) => (p.msgs.length ? median(p.msgs) : 0)));
  const endings = [...by].map(([name, p]) => {
    const msgs = p.msgs.length ? median(p.msgs) : null;
    const delay = p.delay.length ? median(p.delay) : null;
    const froms = p.froms.length ? median(p.froms) : null;
    const minRatio = med ? Math.min(...p.len) / med : null;
    const tailRatio = longest && msgs != null ? msgs / longest : null;
    const flags = [];
    if (delay != null && delay > T.value('story.tail.max_delay_min') * 60) flags.push('story.tail.max_delay_min');
    if (msgs != null && msgs > T.value(msgsKey)) flags.push(msgsKey);
    if (msgs != null && (msgs < T.value('C-42.thin') || froms === 1)) flags.push('C-42.thin');
    if (minRatio != null && minRatio < T.value('C-41.short_warning')) flags.push('C-41.short_warning');
    else if (minRatio != null && minRatio < T.value('C-41.short_hint')) flags.push('C-41.short_hint');
    if (by.size > 1 && tailRatio != null && tailRatio < T.value('C-41.ending_ratio')) flags.push('C-41.ending_ratio');
    return { name, runs: p.runs, share: p.runs / ended.length, tail_msgs: msgs, tail_delay_s: delay, senders: froms, shortest_run: Math.min(...p.len), median_run: med, min_ratio: minRatio, tail_ratio: tailRatio, flags, fix: flags.some((f) => f.startsWith('story.tail') || f === msgsKey) ? 'F-12' : null };
  }).sort((a, b) => b.runs - a.runs);
  const lint = await lintStory(story, T, { only: ['C-41', 'C-42', 'C-43'], runs, seed: 1 });
  report.push({
    id: story.id, path: story.path, runs: ended.length, short, msgs_key: msgsKey, endings,
    lint: lint.findings.map((f) => ({ check: f.check, key: f.key, node: f.node, level: f.level, message: f.message })),
    suppressed: lint.suppressed.map((f) => ({ check: f.check, node: f.node, reason: f.suppressed })),
  });
}

if (args.includes('--json')) {
  const keys = ['story.tail.max_delay_min', 'story.short_min', 'C-42.msgs', 'C-42.msgs_short', 'C-42.thin', 'C-41.short_warning', 'C-41.short_hint', 'C-41.ending_ratio', 'lint.runs.full'];
  console.log(JSON.stringify({ stories: report, keys: Object.fromEntries(keys.map((k) => [k, T.value(k)])) }, null, 1));
  process.exit(0);
}
for (const r of report) {
  if (r.error) { console.log(`${r.path}: ${r.error}\n`); continue; }
  console.log(`${r.path} · прогонов до конца ${r.runs}${r.short ? ' · короткая история — хвост по C-42.msgs_short' : ''}`);
  console.log('   финал               доля  хвост  ждать      от людей  кратчайший/медиана  хвост/длиннейший');
  for (const e of r.endings) {
    console.log(`   ${String(e.name).padEnd(18)} ${String(Math.round(e.share * 100)).padStart(4)}%  ${String(e.tail_msgs ?? '—').padStart(5)}  ${(e.tail_delay_s != null ? fmtDur(e.tail_delay_s) : '—').padEnd(10)} ${String(e.senders ?? '—').padStart(8)}  ${(e.min_ratio != null ? ratio(e.min_ratio) : '—').padStart(18)}  ${(e.tail_ratio != null ? ratio(e.tail_ratio) : '—').padStart(16)}${e.flags.length ? `  ! ${e.flags.join(', ')}` : ''}${e.fix ? ` → ${e.fix}` : ''}`);
  }
  for (const f of r.lint) console.log(`   ${f.check} · ${f.node ?? 'история'} · ${f.message}`);
  for (const s of r.suppressed) console.log(`   ${s.check} · ${s.node ?? 'история'} · подавлено: ${s.reason}`);
  console.log('');
}
