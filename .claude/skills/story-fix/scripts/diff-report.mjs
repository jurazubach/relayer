// До и после правки по всей истории: полный story:lint и метрики trace / sessions / endings одной линейкой
// (story:diff), с разделением «ушло — правка сработала», «появилось у правленых узлов» и «появилось в чужом
// месте» — регрессия, которую правка могла задеть в другой ветке (flow-review.md, шаг 7).
import { parseCli, storyJson } from './fix-core.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/diff-report.mjs --story <id> [--from <реф>] [--to <реф>] [--nodes a,b]
       [--only lint,trace,sessions,endings] [--quick] [--partial] [--md] [--json]

Отчёт «до и после» для story-fix (diff-for-author.md). Числа — npm run story:diff -- <от> <до> --story <id> --json:

  ушли          «C-NN · узел», которых больше нет: правка сработала (или узел удалён — смотри fix-guard)
  появились     новые «C-NN · узел»: у правленых узлов — довести правку; в других узлах — регрессия
  метрики       изменившиеся уровни находок, финалы по персонам, доли финалов, время по клику и в реальном
                времени, хвост после последней кнопки — то, что правка задела, хотя не должна была
  STATUS        строка для docs/stories/<id>/STATUS.md (пишет story-desk после одобрения)

  --story <id>   история
  --from <реф>   «до» (по умолчанию HEAD)
  --to <реф>     «после» (по умолчанию «.» — рабочая копия)
  --nodes a,b    правленые узлы; без флага — узлы, где изменились реплики (story:diff --text)
  --only <гр.>   группы story:diff (по умолчанию lint,trace,sessions,endings)
  --quick        lint --quick и меньше прогонов — для черновой правки; итог — без --quick
  --partial      набор с beta_stop
  --md           markdown для отчёта docs/stories/<id>/reviews/<дата>-story-fix.md
  --json         данными
  --help         эта справка

Код выхода: 0 — новых ошибок lint нет; 1 — ошибок стало больше; 2 — story:diff не сработал.`;

const args = parseCli(process.argv.slice(2), ['quick', 'partial', 'md', 'json']);
if (args.has('help') || args.has('h')) { console.log(HELP); process.exit(0); }
const id = args.get('story');
if (!id) { console.error('нужен --story <id>\n'); console.log(HELP); process.exit(2); }
const from = String(args.get('from', 'HEAD'));
const to = String(args.get('to', '.'));
const only = String(args.get('only', 'lint,trace,sessions,endings'));

const base = [from, to, '--story', id];
const metrics = storyJson('diff', [...base, '--only', only, ...(args.has('quick') ? ['--quick'] : []), ...(args.has('partial') ? ['--partial'] : [])]);
if (!metrics.ok) { console.log(`нет данных: ${metrics.cmd}: ${metrics.error}`); process.exit(2); }

let touched = args.get('nodes') ? String(args.get('nodes')).split(',').map((x) => x.trim()).filter(Boolean) : null;
if (!touched) {
  const text = storyJson('diff', [...base, '--text']);
  touched = text.ok ? (text.data.stories?.[0]?.nodes ?? []).map((n) => n.id) : [];
}
const near = (place) => touched.some((n) => place.endsWith(`· ${n}`) || place.includes(`· ${n}.`));

const entry = metrics.data.stories?.[0] ?? { groups: [] };
const lint = entry.groups.find((g) => g.group === 'lint');
const gone = lint?.gone ?? [];
const appeared = lint?.appeared ?? [];
const regressNear = appeared.filter(near);
const regressFar = appeared.filter((p) => !near(p));
const row = (g, name) => entry.groups.find((x) => x.group === g)?.rows.find((r) => r.name === name);
const errors = row('lint', 'ошибок');
const moreErrors = errors && typeof errors.after === 'number' && errors.after > (errors.before ?? 0);
// Сдвиг меньше единицы показа (секунды в часах, доли процента) автору не виден — не шум в отчёте.
const visible = (r) => r.changed && fmt(r.before, r.unit) !== fmt(r.after, r.unit);
const raw = entry.groups.filter((g) => g.group !== 'lint').flatMap((g) => g.rows.filter(visible).map((r) => ({ group: g.group, ...r })));
// Персоны trace: финал — каждой строкой (исход пути — главное), остальное — одной строкой на метрику.
const changed = [];
const byMetric = new Map();
for (const r of raw) {
  const m = r.group === 'trace' && r.name.match(/^(.+?): (.+)$/);
  if (!m || m[2] === 'финал') { changed.push(r); continue; }
  const k = m[2];
  if (!byMetric.has(k)) byMetric.set(k, []);
  byMetric.get(k).push(r);
}
for (const [k, rs] of byMetric) {
  const ds = rs.filter((r) => typeof r.before === 'number' && typeof r.after === 'number').map((r) => r.after - r.before);
  const lo = Math.min(...ds);
  const hi = Math.max(...ds);
  const sign = (d) => `${d > 0 ? '+' : d < 0 ? '−' : ''}${fmt(Math.abs(d), rs[0].unit)}`;
  changed.push({ group: 'trace', name: `${k} у ${rs.length} персон`, summary: ds.length ? (lo === hi ? sign(lo) : `от ${sign(lo)} до ${sign(hi)}`) : '≠' });
}
const lintLevels = (lint?.rows ?? []).filter((r) => ['ошибок', 'предупреждений', 'подсказок'].includes(r.name));
const noData = entry.groups.flatMap((g) => g.errors ?? []);

function fmt(v, unit) {
  if (v == null) return '—';
  if (typeof v !== 'number') return String(v);
  if (unit === 'с') return v >= 3600 ? `${(v / 3600).toFixed(1)} ч` : v >= 60 ? `${Math.round(v / 60)} мин` : `${Math.round(v)} с`;
  if (unit === 'доля') return `${Math.round(v * 100)}%`;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}
const date = new Date().toISOString().slice(0, 10);
const status = `правка ${date}: ушло находок ${gone.length}, появилось ${appeared.length} (в чужих местах ${regressFar.length}); ошибок ${fmt(errors?.before)} → ${fmt(errors?.after)}; отчёт — reviews/${date}-story-fix.md`;

if (args.has('json')) {
  console.log(JSON.stringify({ story: id, from, to, touched, gone, appeared, regressNear, regressFar, lintLevels, changed, noData, moreErrors, status }, null, 1));
  process.exit(moreErrors ? 1 : 0);
}

const md = args.has('md');
const h = (s) => (md ? `### ${s}` : `${s}:`);
const li = (s) => (md ? `- ${s}` : `   ${s}`);
const out = [md ? `## До и после · ${id}` : `diff-report · ${id} · ${from} → ${to}${args.has('quick') ? ' · --quick (черновик)' : ''}`, ''];
out.push(li(`правленые узлы: ${touched.length ? touched.join(', ') : '— (реплики не менялись)'}`));
for (const r of lintLevels) out.push(li(`story:lint, ${r.name}: ${fmt(r.before)} → ${fmt(r.after)}`));
out.push('', h(`ушли (${gone.length})`), ...(gone.length ? gone.map(li) : [li('ничего')]));
out.push('', h(`появились у правленых узлов (${regressNear.length})`), ...(regressNear.length ? regressNear.map(li) : [li('ничего')]));
out.push('', h(`появились в других местах — регрессия? (${regressFar.length})`), ...(regressFar.length ? regressFar.map(li) : [li('ничего')]));
out.push('', h(`метрики, которые сдвинулись (${changed.length})`));
for (const r of changed) out.push(li(`${r.group} · ${r.name}: ${r.summary ?? `${fmt(r.before, r.unit)} → ${fmt(r.after, r.unit)}`}`));
if (!changed.length) out.push(li('ничего: финалы, время и сессии те же'));
for (const e of noData) out.push(li(e));
out.push('', h('строка для STATUS.md'), li(status));
if (moreErrors) out.push('', `✗ ошибок story:lint стало больше — правку не сдавать`);
console.log(out.join('\n'));
process.exit(moreErrors ? 1 : 0);
