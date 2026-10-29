// stale-check — что устарело (Б-1, Б-5): планы и факты на старом ядре, главы старше ядра или плана,
// ревью и волны теста старше правок, приёмы поздних глав, которых нет в ранних (narrative-postmortems:P-07),
// отклонённые находки, чей узел изменился. Только показывает; пометку в STATUS.md пишет --mark после согласия.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { walk } from '../../../../scripts/lib/ink.mjs';
import { parseStory } from '../../../../scripts/lib/story.mjs';
import { threshold, thresholdEntry } from '../../../../scripts/lib/thresholds.mjs';
import { runCli } from '../../../../scripts/story/core/cli.mjs';
import {
  STATE_DIR, addToSection, chapterFiles, decisionTime, fileTime, fmtTime, nodeHash, parseStatus, readDecisions, readText,
  stateDir, today, tryStory, walkFiles,
} from './desk-core.mjs';

const EARLY = 'story.rewrite.early_chapters';
/** Путь для вывода: от корня проекта, а вне его — как есть. */
const shown = (p) => { const r = relative('.', p); return r.startsWith('..') ? p : r; };
const LATE = 'story.rewrite.late_chapters';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/stale-check.mjs --story <id> [--if core|plan] [--tags-only]
       [--mark] [--dir <папка>] [--json]

Что устарело в истории. Читает ${STATE_DIR}/<id>/ (STATUS.md, decisions.md, plans/, facts.md, reviews/,
playtests/) и src/stories/<id>/. Время правки — по git (незакоммиченное — по файлу), время решения — коммит,
где D-NN появился в decisions.md.

  1. ядро     plans/plan-vN.md («core: D-NN» первой строкой), plans/skeleton-vN.ink и plans/skeleton.ink
              («// core: D-NN» первой строкой — так пишут story-plan и story-architect) не того ядра, что в
              STATUS.md; без отметки — по времени
  2. факты    facts.md старше текущего ядра
  3. главы    файлы глав старше ядра, которое заменило прежнее (перечитать целиком:
              truby-anatomy-of-story:LESSON-05), и старше текущего плана (сверка Б-1); первое ядро без
              «заменяет:» главы не старит
  4. ревью    reviews/* и playtests/wave-*, после которых менялись главы
  5. приёмы   теги и условные кнопки, которые есть в ${LATE} и больше поздних главах и нет в первых
              ${EARLY} (narrative-postmortems:P-07, RED-12): ранние главы писались до того, как автор
              освоил инструмент
  6. находки  отклонённые D-NN с хэшем узла: узел изменился — находку можно поднять снова

  --if core|plan  до смены (Б-5): что зависит от текущего ядра или плана, если его поменять
  --tags-only     только пункт 5, без папки состояния: работает на любой истории src/stories
  --mark          дописать найденное в раздел «Устарело» STATUS.md (после согласия автора)
  --dir <папка>   где лежит состояние (по умолчанию ${STATE_DIR})
  --json          всё данными

Пороги — ключи ${EARLY}, ${LATE} (docs/playbook/thresholds.json).
Код выхода 0 и при находках: это список дел, а не проверка.`;

/** «core: D-07» в первых строках плана (.md) или «// core: D-07» в скелете (.ink) — так пишет story-architect. */
function coreMark(path) {
  const head = readText(path).split('\n').slice(0, 15).join('\n');
  return head.match(/(?:^|\n)\s*(?:\/\/\s*)?(?:core|ядро)\s*:\s*(D-\d+)/i)?.[1] ?? null;
}

/** Теги и условные кнопки по главам: глава → Set имён. Узлы до первой главы (common.ink) не в счёт. */
export function tagsByChapter(story) {
  const tree = parseStory(story);
  const by = new Map();
  for (const k of tree.knots) {
    if (!k.chapter) continue;
    if (!by.has(k.chapter)) by.set(k.chapter, new Set());
    const set = by.get(k.chapter);
    walk(k.items, (it) => {
      for (const t of Object.keys(it.tags ?? {})) set.add(`#${t}`);
      if (it.type === 'choice' && it.conds?.length) set.add('условная кнопка');
    });
  }
  return { chapters: tree.chapters.length, by };
}

/** Пункт 5: приёмы поздних глав, которых нет в ранних. */
export function lateOnly(story) {
  const early = threshold(EARLY);
  const late = threshold(LATE);
  const { chapters, by } = tagsByChapter(story);
  if (chapters < early + late) return { chapters, skipped: `глав ${chapters} < ${early} + ${late}: сравнивать не с чем`, items: [] };
  const earlySet = new Set();
  for (let c = 1; c <= early; c++) for (const t of by.get(c) ?? []) earlySet.add(t);
  const count = new Map();
  for (let c = early + 1; c <= chapters; c++) for (const t of by.get(c) ?? []) {
    if (earlySet.has(t)) continue;
    if (!count.has(t)) count.set(t, []);
    count.get(t).push(c);
  }
  const items = [...count].filter(([, ch]) => ch.length >= late).map(([tag, ch]) => ({ tag, chapters: ch }))
    .sort((a, b) => b.chapters.length - a.chapters.length || a.tag.localeCompare(b.tag));
  return { chapters, items, early, late };
}

runCli(HELP, async (args) => {
  const id = args.get('story');
  const dir = args.get('dir', STATE_DIR);
  const json = args.has('json');
  const story = tryStory(id);
  const items = [];
  const add = (area, what, why, fix) => items.push({ area, what, why, fix });

  if (args.has('tags-only')) {
    if (!story) throw new Error(`нет истории ${id} в src/stories`);
    const r = lateOnly(story);
    if (json) { console.log(JSON.stringify({ story: id, thresholds: [thresholdEntry(EARLY), thresholdEntry(LATE)], ...r }, null, 1)); return 0; }
    console.log(`${id}: глав ${r.chapters}`);
    if (r.skipped) console.log(`   приёмы: ${r.skipped}`);
    else if (!r.items.length) console.log(`   приёмы: всё, что есть в поздних главах (≥ ${r.late}), есть и в главах 1–${r.early}`);
    else for (const x of r.items) console.log(`   ${x.tag}: главы ${x.chapters.join(', ')}, в главах 1–${r.early} нет`);
    return 0;
  }

  const sdir = stateDir(id, dir);
  const status = parseStatus(readText(join(sdir, 'STATUS.md')));
  const decFile = join(sdir, 'decisions.md');
  const decisions = readDecisions(decFile);
  const byId = new Map(decisions.map((d) => [d.id, d]));
  const core = status.core;
  const coreD = core ? byId.get(core) : null;
  const coreT = coreD ? decisionTime(decFile, coreD) : null;
  const planPath = status.plan ? join(sdir, status.plan) : null;
  const planD = status.plan ? decisions.filter((d) => d.kind === 'план' || (d.what ?? '').includes(basename(status.plan))).sort((a, b) => b.n - a.n)[0] : null;
  const planT = planD ? decisionTime(decFile, planD) : (planPath ? fileTime(planPath) : null);
  if (core && !coreD) add('ядро', `STATUS.md: ядро ${core}`, `${core} нет в decisions.md`, 'записать решение о ядре: decision-add.mjs --kind ядро --set-core');
  if (!core) add('ядро', 'STATUS.md: ядро не указано', 'без версии ядра не с чем сверять планы и главы', 'указать «ядро: D-NN» или пройти шаг core (story-core)');
  if (status.plan && !existsSync(planPath)) add('план', `STATUS.md: план ${status.plan}`, 'файла нет', 'поправить путь или вернуть план из git');

  const chapters = chapterFiles(story).map((c) => ({ ...c, t: fileTime(c.path) }));
  const files = walkFiles(sdir);
  const plans = files.filter((f) => /\/plans\//.test(f) && /\.(md|ink)$/.test(f));
  const facts = join(sdir, 'facts.md');

  if (args.get('if')) {
    const what = args.get('if');
    if (!['core', 'plan'].includes(what)) throw new Error('--if: core или plan');
    const dep = [];
    if (what === 'core') {
      for (const p of plans) { const m = coreMark(p); if (!m || m === core) dep.push({ file: shown(p), why: m ? `core: ${m}` : 'без отметки core — сверить' }); }
      if (existsSync(facts)) dep.push({ file: shown(facts), why: 'правда мира строится на ядре' });
      if (story) dep.push({ file: `src/stories/${id}/meta.json`, why: 'карточка и characters: ставка, состав' });
    } else if (planPath && existsSync(planPath)) dep.push({ file: shown(planPath), why: 'текущий план' });
    for (const c of chapters) dep.push({ file: c.path, why: `глава ${c.n}${what === 'core' ? ': перечитать целиком после смены ядра' : ': сверить с новым планом'}` });
    for (const f of files.filter((x) => /\/(reviews|playtests)\//.test(x))) dep.push({ file: shown(f), why: 'выводы сделаны на старой версии' });
    if (json) { console.log(JSON.stringify({ story: id, if: what, core, plan: status.plan, depends: dep }, null, 1)); return 0; }
    console.log(`${id}: если сменить ${what === 'core' ? `ядро ${core ?? '—'}` : `план ${status.plan ?? '—'}`}, устареет ${dep.length}:`);
    for (const d of dep) console.log(`   – ${d.file} — ${d.why}`);
    console.log('\nПосле согласия автора: decision-add.mjs (новое D-NN), затем stale-check.mjs --mark.');
    return 0;
  }

  // 1. планы и скелеты
  for (const p of plans) {
    const m = coreMark(p);
    const rel = relative(sdir, p);
    if (m && core && m !== core) add('ядро', rel, `построен на ядре ${m}, ядро стало ${core}`, 'перестроить план на текущем ядре или отвергнуть в ideas.md');
    else if (!m && coreT && fileTime(p) < coreT) add('ядро', rel, `без отметки core и старше ядра ${core} (${fmtTime(coreT)})`, 'сверить с ядром, дописать «core: D-NN» в начало');
  }
  // 2. факты
  if (existsSync(facts) && coreT && fileTime(facts) < coreT) add('факты', 'facts.md', `старше ядра ${core}`, 'сверить правду мира с новым ядром (story-continuity)');
  // 3. главы. Первое ядро без «заменяет:» ничего не сменило: главы, написанные до записи ядра (ядро
  // восстановлено из готового текста), не устаревают. Устаревают только после смены ядра.
  const coreChanged = !!coreD?.replaces;
  for (const c of chapters) {
    if (coreT && coreChanged && c.t < coreT) add('главы', c.name, `правлена ${fmtTime(c.t)}, ядро ${core} — ${fmtTime(coreT)}`, 'перечитать главу целиком под новое ядро, а не только новую главу');
    else if (planT && c.t < planT) add('главы', c.name, `правлена ${fmtTime(c.t)}, план ${status.plan} — ${fmtTime(planT)}`, 'сверить главу с новым планом (Б-1)');
  }
  // 4. ревью и волны теста
  const lastChapter = chapters.reduce((m, c) => Math.max(m, c.t ?? 0), 0);
  for (const f of files.filter((x) => /\/(reviews|playtests)\//.test(x))) {
    const t = fileTime(f);
    if (lastChapter && t < lastChapter) add(/reviews/.test(f) ? 'ревью' : 'тест', relative(sdir, f), `главы правились позже (${fmtTime(lastChapter)})`, /reviews/.test(f) ? 'новое ревью по изменённым главам (story-review)' : 'итоги волны — про прошлую ревизию; на начало нужен свежий человек (story-playtest)');
  }
  // 5. приёмы поздних глав
  const tags = story ? lateOnly(story) : { skipped: `нет истории ${id} в src/stories`, items: [] };
  for (const x of tags.items) add('приёмы', x.tag, `есть в главах ${x.chapters.join(', ')}, нет в главах 1–${tags.early}`, 'дать ранним главам маленькую версию приёма (narrative-postmortems:P-07)');
  // 6. отклонённые находки
  const rejected = [];
  for (const d of decisions.filter((x) => x.hash && x.node)) {
    const node = String(d.node).split(/\s*·\s*/)[0];
    const now = story ? nodeHash(story, node) : null;
    const state = !story ? 'нет истории' : !now ? 'узла нет' : now.hash === d.hash ? 'тот же' : 'изменился';
    rejected.push({ id: d.id, finding: d.finding ?? null, node, hash: d.hash, now: now?.hash ?? null, state });
    if (state === 'изменился' || state === 'узла нет') add('находки', `${d.id} ${d.finding ?? ''} ${node}`.trim(), state === 'узла нет' ? 'узла больше нет' : `хэш ${d.hash} → ${now.hash}`, 'находку можно поднять снова в ревью');
  }

  if (args.has('mark') && items.length) {
    const file = join(sdir, 'STATUS.md');
    let text = readText(file);
    if (!text) throw new Error(`нет ${file}`);
    // повторный --mark не дублирует пункт: один пункт на файл или приём, время в причине меняется
    for (const x of items.filter((i) => i.area !== 'находки')) {
      if (!text.includes(`- ${x.what} — `)) text = addToSection(text, 'Устарело', `${x.what} — ${x.why} · ${today()}`);
    }
    writeFileSync(file, text);
  }

  const out = { story: id, core, plan: status.plan, thresholds: [thresholdEntry(EARLY), thresholdEntry(LATE)], items, rejected, tagsSkipped: tags.skipped ?? null, marked: args.has('mark') };
  if (json) { console.log(JSON.stringify(out, null, 1)); return 0; }
  console.log(`${id}: ядро ${core ?? '—'} · план ${status.plan ?? '—'} · устарело ${items.length}`);
  const areas = [...new Set(items.map((i) => i.area))];
  for (const a of areas) {
    console.log(`\n${a}:`);
    for (const x of items.filter((i) => i.area === a)) console.log(`   – ${x.what}: ${x.why}\n     → ${x.fix}`);
  }
  if (tags.skipped) console.log(`\nприёмы: ${tags.skipped}`);
  const same = rejected.filter((r) => r.state === 'тот же');
  if (same.length) console.log(`\nотклонённые находки, узел не менялся (не поднимать): ${same.map((r) => `${r.id} ${r.node}`).join(', ')}`);
  if (!items.length) console.log('ничего не устарело');
  else if (!args.has('mark')) console.log('\nПометить в STATUS.md после согласия автора: --mark');
  return 0;
}, { bool: ['tags-only', 'mark'] });
