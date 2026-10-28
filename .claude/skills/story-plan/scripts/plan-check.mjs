// Проверка скелета до текста (шаг 5а цикла, build-plan.md §2): формат скелета, check:story, story:lint --plan,
// story:endings и расписание пауз — одним отчётом, числа берутся у команд как есть. Своё здесь — то, что
// команды не считают: хребет и «река» (доля узлов, которые видят все и почти никто), дорогие развилки против
// бюджета, копятся ли переменные финала до последней главы (yorke-into-the-woods:P-10).
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from '../../../../scripts/lib/compile.mjs';
import { play, seeded } from '../../../../scripts/lib/bot.mjs';
import { nodeIds, resolveTarget } from '../../../../scripts/lib/ink.mjs';
import { compileInput, loadStory, parseStory } from '../../../../scripts/lib/story.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';
import { lintStory } from '../../../../scripts/lint/core.mjs';
import { checkSkeleton } from './skeleton.mjs';
import { resolveRef, schedule } from './schedule.mjs';

const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/plan-check.mjs (--story <id> | --file <путь>) [--runs N] [--json]

Скелет до текста (скилл story-plan): готов ли он к story-review --plan.
  формат        skeleton.mjs --check: ядро «// core: D-NN», проза вместо сцен, главы без записи и чтения,
                финалы без «// финал:»
  бот           npm run check:story: тупики, недостижимые узлы, длина прохождения
  структура     npm run story:lint -- --plan: C-01…C-07, C-09…C-13, C-19, C-21, C-25, C-40, C-43, C-45, C-52, C-53
  финалы        npm run story:endings: доли, кто решает (C-40.dominant_share, C-40.rare_share)
  хребет        доля узлов, которые проходят все прогоны: ниже skill.plan.spine.min_share — клубок
                (bateman-game-writing:P-01), выше skill.plan.spine.max_share — коридор (ashwell-standard-patterns:RED-01)
  река          доля узлов кроме финалов, куда попадает меньше skill.plan.river.rare_visits прогонов
                (skill.plan.river.max_rare_share, failbetter-qbn:P-06)
  развилки      дорогие (кнопки ведут в разные узлы, не в финалы) против skill.plan.branches: на историю и на главу
  финал первым  переменные, которые решают финал, меняются до последней главы хотя бы в
                skill.plan.final_vars.min_share прогонов (yorke-into-the-woods:P-10)
  время         schedule.mjs: реальное время и по клику, стыки глав, тёмная ночь (R-33), C-31/C-32/C-38/C-42
Итог: ✓ готов к story-review --plan — формат без ✗, check:story без проблем, story:lint без ошибок.
Упала команда — «нет данных: <команда>», итог не ✓.

  --story <id>  скелет docs/stories/<id>/plans/skeleton.ink (нет — история src/stories/<id>)
  --file <путь> любой .ink / .json / папка истории
  --runs N      прогонов бота (по умолчанию bot.runs)
  --no-time     без расписания (быстрее)
  --json        всё данными
  --help        эта справка`;

const T = thresholds();
const pct = (x) => `${Math.round(x * 100)}%`;

/** Дорогие развилки: на одной развилке кнопки уходят в разные узлы (не в финалы). */
export function expensiveForks(tree) {
  const ids = new Set(nodeIds(tree));
  const byId = new Map(tree.knots.map((k) => [k.id, k]));
  const out = [];
  const firstDivert = (items) => { for (const it of items ?? []) { if (it.type === 'divert') return it.target; const d = firstDivert(it.items); if (d) return d; } return null; };
  const scan = (items, knot) => {
    const buttons = (items ?? []).filter((it) => it.type === 'choice' && it.role === 'button');
    if (buttons.length > 1) {
      const targets = new Set();
      for (const b of buttons) {
        const t = firstDivert(b.items);
        const id = t ? resolveTarget(t, knot.id, ids) : null;
        if (id && id !== 'END' && byId.get(id)?.ending == null) targets.add(id);
      }
      if (targets.size > 1) out.push({ knot: knot.id, chapter: knot.chapter, targets: [...targets] });
    }
    for (const it of items ?? []) { if (it.items) scan(it.items, knot); for (const br of it.branches ?? []) scan(br.items, knot); }
  };
  for (const k of tree.knots) scan(k.items, k);
  return out;
}

/** Посещения узлов и переменные по главам на прогонах бота (scripts/lib/bot.mjs). */
export function botStats(story, runs) {
  const built = compile(compileInput(story));
  if (!built.ok) return null;
  const tree = parseStory(story);
  const nodes = nodeIds(tree);
  const chapterOf = new Map(tree.knots.map((k) => [k.id, k.chapter]));
  const lastCh = Math.max(0, ...tree.knots.map((k) => k.chapter));
  const visits = new Map(nodes.map((n) => [n, 0]));
  const early = new Map(tree.vars.map((v) => [v.name, 0]));
  const late = new Map(tree.vars.map((v) => [v.name, 0]));
  const rng = seeded(1);
  for (let r = 0; r < runs; r++) {
    const res = play(built.json, { rng, nodes, trackVars: true });
    for (const n of res.visited ?? []) visits.set(n, visits.get(n) + 1);
    let ch = 0;
    const seen = new Set();
    const last = new Set();
    for (const e of res.events) {
      if (e.type === 'knot') ch = chapterOf.get(e.id) ?? chapterOf.get(String(e.id).split('.')[0]) ?? ch;
      if (e.type === 'var' && ch > 0 && e.value !== e.prev) (ch < lastCh ? seen : last).add(e.name);
    }
    for (const v of seen) early.set(v, early.get(v) + 1);
    for (const v of last) late.set(v, late.get(v) + 1);
  }
  return { runs, visits, early, late, nodes, tree, lastCh };
}

/** Замеры одного скелета: общие для plan-check и plan-compare. */
export async function measure(ref, { runs = T.value('bot.runs'), time = true, free = null } = {}) {
  const story = loadStory(ref);
  const m = { path: story.path, ref, errors: [], notes: [] };
  try { m.skeleton = checkSkeleton(ref); } catch (e) { m.errors.push(`нет данных: skeleton.mjs --check (${e.message.split('\n')[0]})`); }
  try {
    const cs = JSON.parse(execFileSync(process.execPath, [join(ROOT, 'scripts/check-story.mjs'), ref, '--json', '--seed', '1'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })).stories[0];
    m.check = { ok: cs.ok, unvisited: cs.nodes?.unvisited ?? [], problems: cs.problems ?? [], lines: cs.lines };
  } catch (e) {
    const out = String(e.stdout ?? '');
    try { const cs = JSON.parse(out).stories[0]; m.check = { ok: false, unvisited: cs.nodes?.unvisited ?? [], problems: cs.problems ?? cs.errors?.map((x) => x.message) ?? [] }; } catch { m.errors.push(`нет данных: npm run check:story -- ${ref} --json`); }
  }
  try {
    const lint = await lintStory(story, T, { plan: true, runs, seed: 1 });
    m.lint = lint.findings.map((f) => ({ check: f.check, level: f.level, node: f.node, message: f.message }));
  } catch (e) { m.errors.push(`нет данных: npm run story:lint -- --plan ${ref} (${e.message.split('\n')[0]})`); }
  try {
    const e = JSON.parse(execFileSync(process.execPath, [join(ROOT, 'scripts/story/endings.mjs'), '--story', ref, '--json'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })).stories[0];
    const declared = e.endings.filter((x) => x.declared);
    const many = declared.length >= T.value('C-40.min_endings');
    m.endings = {
      source: e.source,
      list: e.endings.map((x) => ({ name: x.name, share: x.share, declared: x.declared, deciders: x.staticVars,
        dominant: many && x.declared && x.share > T.value('C-40.dominant_share'),
        rare: declared.length > 1 && x.declared && x.share < T.value('C-40.rare_share') })),
      distributors: e.distributors, deciders: [...new Set(e.endings.flatMap((x) => x.staticVars ?? []))],
    };
  } catch (e) { m.errors.push(`нет данных: npm run story:endings -- --story ${ref} --json`); }
  const b = botStats(story, runs);
  if (b) {
    const endingNodes = new Set(b.tree.knots.filter((k) => k.ending != null).map((k) => k.id));
    const all = b.nodes.filter((n) => b.visits.get(n) > 0 || !endingNodes.has(n));
    const spine = all.filter((n) => b.visits.get(n) === b.runs);
    const body = all.filter((n) => !endingNodes.has(n));
    const rare = body.filter((n) => b.visits.get(n) / b.runs < T.value('skill.plan.river').rare_visits);
    m.spine = { share: all.length ? spine.length / all.length : 0, nodes: spine.length, total: all.length, low: all.length && spine.length / all.length < T.value('skill.plan.spine.min_share'), high: all.length && spine.length / all.length > T.value('skill.plan.spine.max_share') };
    m.river = { rare: rare.slice(0, 8), share: body.length ? rare.length / body.length : 0, high: body.length && rare.length / body.length > T.value('skill.plan.river').max_rare_share };
    const forks = expensiveForks(b.tree);
    const per = new Map();
    for (const f of forks) per.set(f.chapter, (per.get(f.chapter) ?? 0) + 1);
    const budget = T.value('skill.plan.branches');
    m.branches = { total: forks.length, per_chapter: Object.fromEntries(per), over_chapters: [...per].filter(([, n]) => n > budget.per_chapter).map(([c]) => c), over: forks.length > budget.max, under: forks.length < budget.min, list: forks };
    const deciders = m.endings?.deciders ?? [];
    // переменная, которую пишет только последняя глава, — кнопка финала (R-102 у story-endings), а не накопленное
    m.final_vars = deciders.map((v) => {
      const share = (b.early.get(v) ?? 0) / b.runs;
      const lastOnly = !b.early.get(v) && (b.late.get(v) ?? 0) > 0;
      return { name: v, share, last_only: lastOnly, low: !lastOnly && share < T.value('skill.plan.final_vars.min_share') };
    });
    const speakers = new Map();
    const walk = (items, ch) => { for (const it of items ?? []) { if (it.type === 'msg' && it.who) { if (!speakers.has(ch)) speakers.set(ch, new Set()); speakers.get(ch).add(it.who); } walk(it.items, ch); for (const br of it.branches ?? []) walk(br.items, ch); } };
    for (const k of b.tree.knots) if (k.chapter > 0) walk(k.items, k.chapter);
    m.contacts = Object.fromEntries([...speakers].sort((x, y) => x[0] - y[0]).map(([c, s]) => [c, [...s]]));
    m.head = b.tree.head;
  } else m.errors.push('нет данных: скелет не компилируется — бот не запускался');
  if (free) {
    try {
      const lint = await lintStory(story, T, { only: ['C-39'], runs, seed: 1 });
      // C-39 (а): глава закрыта без крючка — находка с ключом C-39.end_hook и номером закрытой главы
      const miss = lint.findings.filter((f) => f.key === 'C-39.end_hook' && f.chapter === free);
      m.free = { after: free, hook: !miss.length, message: miss[0]?.message ?? null };
    } catch { m.errors.push('нет данных: story:lint --only C-39'); }
  }
  if (time) m.time = await schedule(ref, { runs });
  return m;
}

export function verdict(m) {
  const bad = [];
  if (m.errors.length) bad.push(...m.errors);
  if (m.skeleton?.errors.length) bad.push(...m.skeleton.errors.map((x) => `формат: ${x}`));
  if (m.check && !m.check.ok) bad.push(`check:story: ${[...m.check.problems, ...m.check.unvisited.map((u) => `недостижим ${u}`)].slice(0, 3).join('; ') || 'не прошёл'}`);
  const lintErr = (m.lint ?? []).filter((f) => f.level === 'error');
  if (lintErr.length) bad.push(`story:lint --plan: ошибок ${lintErr.length} (${lintErr.slice(0, 2).map((f) => `${f.check} ${f.node ?? ''}`).join(', ')})`);
  return { ready: !bad.length, bad };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const args = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  if (args.includes('--help') || args.includes('-h') || (!opt('--story') && !opt('--file'))) { console.log(HELP); process.exit(0); }
  const ref = resolveRef(opt('--story'), opt('--file'));
  const m = await measure(ref, { runs: opt('--runs') ? Number(opt('--runs')) : undefined, time: !args.includes('--no-time') });
  const v = verdict(m);
  if (args.includes('--json')) { console.log(JSON.stringify({ ...m, verdict: v }, null, 1)); process.exit(v.ready ? 0 : 1); }
  const s = m.skeleton?.info ?? {};
  console.log(`${m.path} · ядро ${s.core ?? '—'} · глав ${s.chapters ?? '—'} · строк-сцен ${s.scenes ?? '—'} · финалов по меткам ${s.endings?.length ?? 0}`);
  for (const e of m.skeleton?.errors ?? []) console.log(`   ✗ формат: ${e}`);
  for (const w of m.skeleton?.warnings ?? []) console.log(`   ⚠ формат: ${w}`);
  if (m.check) console.log(`   ${m.check.ok ? '✓' : '✗'} check:story${m.check.ok ? '' : `: ${[...m.check.problems, ...m.check.unvisited.map((u) => `недостижим ${u}`)].slice(0, 4).join('; ')}`}`);
  if (m.lint) {
    const by = (l) => m.lint.filter((f) => f.level === l).length;
    console.log(`   story:lint --plan: ошибок ${by('error')}, предупреждений ${by('warning')}, подсказок ${by('hint')}`);
    for (const f of m.lint.filter((x) => x.level !== 'hint').slice(0, 12)) console.log(`     ${f.level === 'error' ? '✗' : '⚠'} ${f.check} · ${f.node ?? 'история'} · ${f.message}`);
  }
  if (m.endings) {
    console.log(`   финалы (${m.endings.source === 'mark' ? 'по меткам' : 'меток нет — доли ориентировочны'}): ${m.endings.list.map((x) => `${x.name} ${pct(x.share)}${x.dominant ? ' !' : x.rare ? ' ?' : ''}`).join(' · ')}`);
    console.log(`     решают: ${m.endings.deciders.join(', ') || '— (без условий)'}${m.endings.distributors.length ? ` · распределитель ${m.endings.distributors.join(', ')}` : ''}`);
  }
  if (m.final_vars?.length) console.log(`   финал первым: ${m.final_vars.map((x) => (x.last_only ? `${x.name} — кнопка последней главы` : `${x.name} копится до последней главы в ${pct(x.share)}${x.low ? ' ⚠' : ''}`)).join(' · ')} (skill.plan.final_vars.min_share)`);
  if (m.spine) console.log(`   хребет: ${m.spine.nodes} из ${m.spine.total} узлов видят все прогоны (${pct(m.spine.share)})${m.spine.low ? ' ⚠ меньше skill.plan.spine.min_share — клубок' : m.spine.high ? ` · больше skill.plan.spine.max_share — коридор, если дорогих развилок почти нет и переменные читает только финал (ashwell-standard-patterns:RED-01)` : ''}`);
  if (m.river) console.log(`   река: редких узлов ${pct(m.river.share)}${m.river.high ? ` ⚠ больше skill.plan.river.max_rare_share: ${m.river.rare.join(', ')}` : ''}`);
  if (m.branches) {
    const bd = T.value('skill.plan.branches');
    console.log(`   дорогие развилки: ${m.branches.total} (бюджет ${bd.min}–${bd.max}, на главу до ${bd.per_chapter}: skill.plan.branches)${m.branches.over ? ' ⚠ сверх бюджета' : m.branches.under ? ' · меньше бюджета — вариативность только состоянием' : ''}${m.branches.over_chapters.length ? ` · ⚠ много в гл. ${m.branches.over_chapters.join(', ')}` : ''}`);
  }
  if (m.contacts) console.log(`   говорят по главам: ${Object.entries(m.contacts).map(([c, s]) => `гл.${c}: ${s.length}`).join(' · ')}`);
  if (m.time && !m.time.error) {
    const t = m.time;
    const h = (x) => `${+(x / 3600).toFixed(1)} ч`;
    console.log(`   время: реальное ${h(t.real.median)} (story.length.target_h), по клику ${Math.round(t.click.median / 60)} мин; стыки: ${t.chapters.filter((c) => c.seam).map((c) => `→гл.${c.chapter} ${h(c.seam)}`).join(', ') || '—'}${t.dark_night ? ` · тёмная ночь ${t.dark_night.ok ? '✓' : '⚠'}` : ''}`);
    for (const f of t.lint.filter((x) => x.level !== 'hint')) console.log(`     ${f.level === 'error' ? '✗' : '⚠'} ${f.check} · ${f.node ?? 'история'} · ${f.message}`);
  } else if (m.time?.error) console.log(`   ${m.time.error}`);
  for (const e of m.errors) console.log(`   ${e}`);
  console.log(v.ready ? '✓ готов к story-review --plan' : `✗ не готов: ${v.bad.slice(0, 4).join(' · ')}`);
  process.exit(v.ready ? 0 : 1);
}
