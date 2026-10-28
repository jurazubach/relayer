// Сравнение 2–3 вариантов плана числами (шаг 3 цикла, build-plan.md §2; flow-review.md §A, шаг 3): таблица
// «сильное / слабое» из мнения модели заменяется замерами одних и тех же команд на каждом скелете.
// Замеры — measure() из plan-check.mjs: формат, story:lint --plan, story:endings, бот, schedule.mjs.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';
import { measure, verdict } from './plan-check.mjs';

const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/plan-compare.mjs (--story <id> | --files a.ink,b.ink[,c.ink]) [--free N] [--runs N] [--json]

Варианты плана рядом, одними и теми же командами (скилл story-plan; skill.plan.variants — сколько вариантов):
  ядро          «// core: D-NN» скелета против активного ядра в STATUS.md (✗ — вариант построен на старом ядре)
  готовность    plan-check: формат, check:story, ошибки story:lint --plan
  финалы        число по меткам, доли, перекос (C-40.dominant_share), редкие (C-40.rare_share)
  финал первым  переменные финала копятся до последней главы (skill.plan.final_vars.min_share)
  хребет, река  skill.plan.spine.min_share и max_share, skill.plan.river
  развилки      дорогие против skill.plan.branches (на историю и на главу)
  говорящие     сколько контактов пишут в главе 1 и в самой людной главе
  время         реальное (story.length.target_h, story.length.max_h) и по клику; тёмная ночь (skill.plan.dark_night_h)
  граница       --free N: крючок в конце главы N по C-39 (где ставить — free-boundary.md, проверяет story-release)
Числа — из команд; что лучше для этой истории, решает автор: скрипт отмечает только нарушенные пороги.

  --story <id>  все docs/stories/<id>/plans/skeleton-v*.ink (нет — plans/skeleton.ink)
  --files a,b   пути через запятую (.ink / .json / папка)
  --free N      бесплатных глав: проверить крючок на границе (по умолчанию free_chapters из src/stories/<id>/meta.json)
  --runs N      прогонов бота на вариант (по умолчанию bot.runs)
  --json        всё данными
  --help        эта справка`;

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
if (args.includes('--help') || args.includes('-h') || (!opt('--story') && !opt('--files'))) { console.log(HELP); process.exit(0); }
const T = thresholds();
const id = opt('--story');
let files = (opt('--files') ?? '').split(',').filter(Boolean);
if (!files.length && id) {
  const dir = join(ROOT, 'docs/stories', id, 'plans');
  const vs = existsSync(dir) ? readdirSync(dir).filter((f) => /^skeleton-v\d+\.ink$/.test(f)).sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0])) : [];
  files = vs.length ? vs.map((f) => join('docs/stories', id, 'plans', f)) : existsSync(join(dir, 'skeleton.ink')) ? [join('docs/stories', id, 'plans', 'skeleton.ink')] : [];
}
if (!files.length) { console.log(`нет скелетов: ни docs/stories/${id}/plans/skeleton-v*.ink, ни plans/skeleton.ink — заготовка: skeleton.mjs --new --story ${id}`); process.exit(1); }
const want = T.value('skill.plan.variants');
const statusCore = id && existsSync(join(ROOT, 'docs/stories', id, 'STATUS.md')) ? readFileSync(join(ROOT, 'docs/stories', id, 'STATUS.md'), 'utf8').match(/ядро:\s*(D-\d+)/)?.[1] ?? null : null;
let free = opt('--free') ? Number(opt('--free')) : null;
if (free == null && id && existsSync(join(ROOT, 'src/stories', id, 'meta.json'))) free = JSON.parse(readFileSync(join(ROOT, 'src/stories', id, 'meta.json'), 'utf8')).free_chapters ?? null;
const runs = opt('--runs') ? Number(opt('--runs')) : undefined;

const rows = [];
for (const f of files) {
  const m = await measure(f, { runs, free });
  rows.push({ file: f, m, v: verdict(m) });
}

const pct = (x) => `${Math.round(x * 100)}%`;
const h = (s) => `${+(s / 3600).toFixed(1)} ч`;
const lim = { target: T.value('story.length.target_h') * 3600, max: T.value('story.length.max_h') * 3600 };
const metric = (r) => {
  const m = r.m;
  const s = m.skeleton?.info ?? {};
  const lint = m.lint ?? [];
  const dec = (m.final_vars ?? []).filter((x) => !x.last_only);
  const busiest = Object.values(m.contacts ?? {}).reduce((a, x) => Math.max(a, x.length), 0);
  const bd = T.value('skill.plan.branches');
  return {
    'ядро': `${s.core ?? '—'}${statusCore && s.core && s.core !== statusCore ? ` ✗ (активное ${statusCore})` : ''}`,
    'глав · строк-сцен': `${s.chapters ?? '—'} · ${s.scenes ?? '—'}`,
    'готов к --plan': r.v.ready ? '✓' : `✗ ${r.v.bad.length}`,
    'lint: ошибок · предупр.': `${lint.filter((x) => x.level === 'error').length} · ${lint.filter((x) => x.level === 'warning').length}`,
    'финалы': m.endings ? `${m.endings.list.filter((x) => x.declared).length}: ${m.endings.list.map((x) => `${pct(x.share)}${x.dominant ? '!' : x.rare ? '?' : ''}`).join('/')}` : '—',
    'финал первым': dec.length ? `${dec.filter((x) => !x.low).length} из ${dec.length} копятся${dec.some((x) => x.low) ? ' ⚠' : ''}` : (m.final_vars?.length ? 'только кнопка' : '—'),
    'хребет': m.spine ? `${pct(m.spine.share)}${m.spine.low ? ' ⚠' : m.spine.high ? ' коридор?' : ''}` : '—',
    'редкие узлы': m.river ? `${pct(m.river.share)}${m.river.high ? ' ⚠' : ''}` : '—',
    'дорогие развилки': m.branches ? `${m.branches.total} (${bd.min}–${bd.max})${m.branches.over ? ' ⚠' : ''}${m.branches.over_chapters.length ? ` гл.${m.branches.over_chapters.join(',')}⚠` : ''}` : '—',
    'говорят: гл.1 · максимум': m.contacts ? `${(m.contacts[1] ?? []).length} · ${busiest}` : '—',
    'реальное время': m.time?.real ? `${h(m.time.real.median)}${m.time.real.median > lim.max ? ' ✗' : m.time.real.median > lim.target ? ' ⚠' : ''}` : '—',
    'по клику (скелет)': m.time?.click ? `${Math.round(m.time.click.median / 60)} мин` : '—',
    'тёмная ночь': m.time?.dark_night ? (m.time.dark_night.ok ? `✓ ${h(m.time.dark_night.seconds)}` : `⚠ ${m.time.dark_night.seconds ? h(m.time.dark_night.seconds) : 'нет'}`) : '—',
    ...(free ? { [`граница после гл.${free}`]: m.free ? (m.free.hook ? '✓ крючок' : '⚠ без крючка') : '—' } : {}),
  };
};

if (args.includes('--json')) {
  console.log(JSON.stringify({ story: id, status_core: statusCore, free, variants: rows.map((r) => ({ file: r.file, verdict: r.v, metrics: metric(r), measure: r.m })) }, null, 1));
  process.exit(0);
}
const table = rows.map(metric);
const names = rows.map((r) => r.file.split('/').pop().replace(/\.ink$/, ''));
const keys = Object.keys(table[0]);
const w0 = Math.max(...keys.map((k) => k.length));
const ws = names.map((n, i) => Math.max(n.length, ...keys.map((k) => String(table[i][k]).length)));
if (rows.length < want.min || rows.length > want.max) console.log(`ℹ вариантов ${rows.length}, обычно ${want.min}–${want.max} (skill.plan.variants)`);
console.log(`${''.padEnd(w0)}  ${names.map((n, i) => n.padEnd(ws[i])).join('  ')}`);
for (const k of keys) console.log(`${k.padEnd(w0)}  ${table.map((t, i) => String(t[k]).padEnd(ws[i])).join('  ')}`);
console.log('\n⚠/✗ — порог из thresholds.json нарушен; ! — финал забирает больше C-40.dominant_share, ? — реже C-40.rare_share.');
console.log('«по клику» на скелете — порядок и число строк, а не время чтения: текста ещё нет.');
for (const r of rows) for (const b of r.v.bad.slice(0, 3)) console.log(`  ${r.file.split('/').pop()}: ${b}`);
