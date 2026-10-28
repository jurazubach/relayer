// Платная граница (скилл story-release, TH-97, INTENT «Платная граница»): free_chapters ставит её на стык
// глав; проверяем, что перед ней сильный крючок, а после — обещание сбывается сразу. Движок встаёт до паузы
// строки #chapter следующей главы (capabilities.json paywall), поэтому «сразу» — пауза этой строки и строк до
// выплаты. Крючок и стык меряют C-26 и C-39 (владелец — story-pauses): их находки на стыке берутся из
// story:lint на тех же прогонах, сверх них — выплата, пауза после открытия и кто вообще доходит до границы.
import { fileURLToPath } from 'node:url';
import { loadStory, storyRefs } from '../../../../scripts/lib/story.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';
import { isClosing } from '../../../../scripts/lib/lexicon.mjs';
import { lintStory, loadChecks } from '../../../../scripts/lint/core.mjs';
import { hookIn, firstLines, roots, short, fmtDur } from '../../../../scripts/lint/text.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/boundary-check.mjs [<id>] [--story <id|путь>,…] [--free N] [--runs N] [--seed N] [--json]

Платная граница free_chapters (INTENT: после первой главы, на сильном крючке, который сбывается сразу после
неё; платных выборов нет, «по клику» не продаётся, бесплатный путь не наказывается). На прогонах бота:
  место        стык глав N → N+1 (N = free_chapters); узел последней бесплатной строки — где чинить
  крючок       признак крючка (как у C-26 и C-39: «?», фото, новый контакт, обещание, срок в мире) в последних
               skill.release.boundary.hook_lines входящих бесплатной главы; последняя строка — не «ок / спокойной
               ночи» (dict.closing)
  выплата      в первых skill.release.boundary.payoff_lines входящих платной главы есть слово крючка (основы по
               C-49.root) — обещание сбывается сразу, а не через главу
  пауза        от открытия до выплаты (пауза строки #chapter и строк до неё) — не больше
               skill.release.boundary.pause_max_min
  доходят      доля прохождений, дошедших до границы, — не меньше skill.release.boundary.reach_share
  линт         находки C-26 и C-39 на этом стыке (npm run story:lint -- --only C-26,C-39)
Нет free_chapters или он не меньше числа глав — границы нет, проверять нечего (как freeChapters в paywall.ts).

  --story   история по id, файл .json или папка; через запятую; по умолчанию все из src/stories
  --free N  проверить границу после главы N, не меняя meta.json (план: куда её поставить)
  --runs N  прогонов бота (по умолчанию lint.runs.full, как у story:lint)
  --seed N  seed (по умолчанию 1, как у story:lint)
  --json    всё данными
  --help    эта справка`;

const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const isIn = (l) => l.kind === 'in' || l.kind === 'photo';

/** Граница, как её видит движок: целое от 1 и меньше числа глав, иначе её нет. */
export function freeOf(meta, override) {
  const n = override ?? meta.free_chapters;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 1) return null;
  const total = meta.chapters?.length;
  return total && n >= total ? null : n;
}

export async function boundaryCheck(ref, { free: override, runs, seed = 1 } = {}, T = thresholds()) {
  const story = loadStory(ref);
  const free = freeOf(story.meta ?? {}, override);
  if (free == null) return { id: story.id, path: story.path, free: null, note: story.meta?.free_chapters == null ? 'free_chapters нет — бесплатно всё' : `free_chapters ${story.meta.free_chapters} — границы нет (не меньше числа глав или негодное значение)` };
  const all = await loadChecks();
  let ctx = null;
  const probe = { id: 'probe', plan: false, partial: true, run(c) { ctx = c; } };
  const checks = [probe, ...all.filter((c) => c.id === 'C-26' || c.id === 'C-39')];
  const res = await lintStory(story, T, { checks, runs: runs ?? T.value('lint.runs.full'), seed });
  if (!ctx?.built.ok) return { id: story.id, path: story.path, free, error: res.findings[0]?.message ?? 'не собралась' };

  const H = T.value('skill.release.boundary.hook_lines');
  const P = T.value('skill.release.boundary.payoff_lines');
  const n = T.value('C-49.root');
  const places = new Map();
  let reached = 0;
  for (const run of ctx.runs) {
    const at = run.lines.findIndex((l) => l.isChapter && l.chapter === free + 1);
    if (at < 0) continue;
    reached++;
    const before = run.lines.slice(0, at).filter((l) => l.chapter <= free && isIn(l)).slice(-H);
    const after = run.lines.slice(at);
    const payoff = after.slice(1).filter(isIn).slice(0, P);
    const last = before.at(-1);
    const node = last?.knot ?? run.lines[at].knot;
    const hook = hookIn(before, firstLines(run), T);
    const hookRoots = new Set(before.flatMap((l) => [...roots(l.text, n)]));
    const hit = payoff.findIndex((l) => [...roots(l.text, n)].some((r) => hookRoots.has(r)));
    // от открытия до выплаты: пауза строки #chapter и всех строк до выплаты (или до конца окна)
    const upto = hit >= 0 ? after.indexOf(payoff[hit]) : after.indexOf(payoff.at(-1) ?? after[0]);
    const wait = after.slice(0, upto + 1).reduce((s, l) => s + l.delay, 0);
    if (!places.has(node)) places.set(node, { node, n: 0, hook: 0, closing: 0, paid: 0, waits: [], lastText: last?.text ?? null, firstText: payoff[0]?.text ?? null, hooks: new Map() });
    const p = places.get(node);
    p.n++;
    if (hook) { p.hook++; p.hooks.set(hook, (p.hooks.get(hook) ?? 0) + 1); }
    if (last && isClosing(last.text.toLowerCase(), T)) p.closing++;
    if (hit >= 0) p.paid++;
    p.waits.push(wait);
  }
  const total = ctx.runs.length;
  const problems = [];
  const pauseMax = T.value('skill.release.boundary.pause_max_min') * 60;
  const rows = [...places.values()].sort((a, b) => b.n - a.n).map((p) => {
    const wait = median(p.waits);
    const row = { node: p.node, runs: p.n, hook_share: p.hook / p.n, closing_share: p.closing / p.n, payoff_share: p.paid / p.n, wait_s: wait, hooks: Object.fromEntries(p.hooks), last: p.lastText, first: p.firstText };
    const where = `${p.node} (гл. ${free} → ${free + 1}, ${p.n} из ${reached} прохождений)`;
    if (p.hook * 2 < p.n) problems.push({ level: 'warning', node: p.node, check: 'C-39', message: `${where}: перед платной границей нет крючка — последняя строка «${short(p.lastText ?? '', 40)}»; игроку нечего хотеть за границей` });
    if (p.closing * 2 > p.n) problems.push({ level: 'warning', node: p.node, check: 'C-26', message: `${where}: бесплатная глава кончается закрывающей репликой («${short(p.lastText ?? '', 30)}») — граница стоит на «ок», а не на вопросе` });
    if (p.paid * 2 < p.n) problems.push({ level: 'warning', node: p.node, check: null, message: `${where}: в первых ${P} входящих платной главы нет слов крючка («${short(p.firstText ?? '', 30)}») — обещание не сбывается сразу после границы` });
    if (wait != null && wait > pauseMax) problems.push({ level: 'warning', node: p.node, check: null, message: `${where}: после открытия до выплаты ${fmtDur(wait)} — дольше skill.release.boundary.pause_max_min; заплатил и ждёт` });
    return row;
  });
  const reach = total ? reached / total : 0;
  if (reach < T.value('skill.release.boundary.reach_share')) problems.push({ level: 'warning', node: null, check: null, message: `до границы доходят ${Math.round(reach * 100)} % прохождений — меньше skill.release.boundary.reach_share: часть бесплатных путей кончается раньше, граница не одна для всех` });
  const lint = res.findings.filter((f) => (f.check === 'C-26' && f.chapter === free) || (f.check === 'C-39' && (f.chapter === free || f.chapter === free + 1)))
    .map((f) => ({ check: f.check, level: f.level, node: f.node, message: f.message }));
  return { id: story.id, path: story.path, free, chapters: story.meta?.chapters?.length ?? null, runs: total, reached, places: rows, problems, lint };
}

function print(r) {
  if (r.error) { console.log(`${r.path}: ${r.error}`); return; }
  if (r.free == null) { console.log(`${r.path} · ${r.note}\n`); return; }
  console.log(`${r.path} · граница после главы ${r.free} из ${r.chapters} · до неё дошли ${r.reached} из ${r.runs} прохождений`);
  for (const p of r.places) {
    console.log(`   ${p.node}: ${p.runs} прох. · крючок ${Math.round(p.hook_share * 100)} %${Object.keys(p.hooks).length ? ` (${Object.entries(p.hooks).map(([k, v]) => `${k} ${v}`).join(', ')})` : ''} · выплата ${Math.round(p.payoff_share * 100)} % · после открытия до выплаты ${p.wait_s == null ? '—' : fmtDur(p.wait_s)}`);
    console.log(`      до:    «${short(p.last ?? '', 70)}»`);
    console.log(`      после: «${short(p.first ?? '', 70)}»`);
  }
  for (const p of r.problems) console.log(`   ${p.level === 'warning' ? '⚠' : 'ℹ'}${p.check ? ` ${p.check}` : ''} · ${p.message}`);
  for (const f of r.lint) console.log(`   линт ${f.check} · ${f.node ?? 'история'} · ${f.message}`);
  if (!r.problems.length && !r.lint.length) console.log('   ✓ крючок перед границей, выплата сразу после неё');
  console.log('   глазами (references/free-boundary-gate.md): крючок — самый сильный до середины; платных выборов нет; бесплатный финал не наказан\n');
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) { console.log(HELP); return; }
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const VALUED = new Set(['--story', '--runs', '--seed', '--free']);
  const positional = args.filter((a, i) => !a.startsWith('--') && !VALUED.has(args[i - 1]));
  const refs = storyRefs([...(opt('--story') ?? '').split(','), ...positional].filter(Boolean));
  const out = [];
  for (const ref of refs) out.push(await boundaryCheck(ref, { free: opt('--free') ? Number(opt('--free')) : undefined, runs: opt('--runs') ? Number(opt('--runs')) : undefined, seed: Number(opt('--seed') ?? 1) }));
  if (args.includes('--json')) console.log(JSON.stringify(out, null, 2));
  else out.forEach(print);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
