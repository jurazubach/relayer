// story:coverage — матрица покрытия знаний базы и свода скиллами (flow-review.md §C «Устройство story:coverage»).
// Строка — единица знания, кластер — тема, владелец и файл — из owners.md, уровень — из файлов скиллов.
// Ручной слой — docs/playbook/coverage.json (статусы, basis, верность) и clusters.json (правки кластеров).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { loadRows, aliasResolver, pad, KINDS, KIND_RU, BASE_KINDS } from './kb-rows.mjs';
import { parseOwners, ownerSkills, oporaIndex, ownersCheck } from './kb-owners.mjs';
import { buildClusters, assignOwners, byId } from './kb-clusters.mjs';
import { scanSkills, keyTerms, rowLevel, LEVELS, levelNum } from './kb-levels.mjs';
import { statusError, supersededIndex, engineFeatures, STATUS_HELP, REJECT_REASONS } from './kb-status.mjs';
import { loadThresholds } from '../lint/thresholds.mjs';
import { seeded } from '../lib/bot.mjs';

const HELP = `Покрытие знаний: какие единицы базы и свода держат скиллы и на каком уровне.

  npm run story:coverage -- --summary                  сводка: строки, кластеры, уровни, владельцы
  npm run story:coverage -- --skill story-choices      часть матрицы для скилла
  npm run story:coverage -- --skill story-choices --min L2
                                                       код выхода 1, если кластер скилла ниже уровня
  npm run story:coverage -- --sources story-choices [--write]
                                                       sources.md скилла (--write — в references/sources.md)
  npm run story:coverage -- --affected <ID>            кого задевает правка: строка, R/C/F, TH-NN, K-…, алиас
  npm run story:coverage -- --fidelity-sample story-choices 20 [--seed N]
                                                       случайные пары «источник ↔ reference» для ревьюера
  npm run story:coverage -- --record <ID> status=… fidelity=ok|bad note=… by=…
                                                       записать ручной слой в coverage.json
  npm run story:coverage -- --owners-check             уникальность и полнота владельцев (owners.md §8)
  npm run story:coverage -- --unowned                  строки без владельца — назначить в «опоре» owners.md
  npm run story:coverage -- --build-clusters [--check] пересобрать clusters.json (--check — только сверить)

Флаги:
  --json            вывод в JSON
  --min L0..L3      порог для --skill
  --seed N          зерно выборки --fidelity-sample
  --skills-dir DIR  где искать скиллы (по умолчанию .claude/skills)
  --fresh           пересобрать docs/books/_clean перед разбором
  --help            эта справка

Строки: алиас:P/PAT/GREEN/RED/LESSON-NN, алиас:P-NN#нюанс, алиас:SYS-N, алиас:contra-N, алиас:attention§N,
R-NN, C-NN, F-NN, #attn-… (attention-merged.md), LOCAL-NN. База берётся из docs/books/_clean (нет — соберётся).

Уровни: L0 — нигде; L1 — только sources.md или блок не прошёл проверку (это не покрытие); L2 — в reference
владельца блок с ID в заголовке, длиннее skill.coverage.block_min_chars, с skill.coverage.key_terms_min
ключевыми терминами, у P и PAT — «когда не работает», у строки с порогом — ключ thresholds.json; L3 — блок L2
и исполняемо: проверка story:lint, развилка в decisions-*.md, пример ink, который компилируется, или мутант
(docs/lab/mutants/). RED на L3 — только с мутантом. Кластер покрыт по лучшему блоку, если ID строки есть в
sources.md; нюанс и противоречие — отдельные строки.

Статусы (coverage.json):
${STATUS_HELP.map((s) => '  ' + s).join('\n')}
Отменённое из superseded.md получает superseded:A-NN само; «в силе» — used с пометкой «частично».`;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const PATHS = {
  root: ROOT,
  books: join(ROOT, 'docs/books/_clean'),
  playbook: join(ROOT, 'docs/playbook'),
  skills: join(ROOT, '.claude/skills'),
  lintChecks: join(ROOT, 'scripts/lint/checks'),
  mutants: join(ROOT, 'docs/lab/mutants'),
  clusters: join(ROOT, 'docs/playbook/clusters.json'),
  coverage: join(ROOT, 'docs/playbook/coverage.json'),
  thresholds: join(ROOT, 'docs/playbook/thresholds.json'),
  plan: join(ROOT, 'docs/playbook/build-plan.md'),
};

const readJson = (p, fallback) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : fallback);
const read = (p) => readFileSync(p, 'utf8');

function ensureClean(paths, fresh) {
  if (!fresh && existsSync(paths.books)) return;
  const r = spawnSync(process.execPath, [join(ROOT, 'scripts/kb/clean.mjs'), '--quiet'], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`kb:clean не собрал docs/books/_clean:\n${r.stderr || r.stdout}`);
}

/** База, свод и раскладка владельцев — без скиллов. */
export function loadKnowledge(paths = PATHS) {
  const { rows, agree, aliases } = loadRows({ booksDir: paths.books, playbookDir: paths.playbook, root: paths.root });
  const resolveAlias = aliasResolver(aliases);
  const ownersText = read(join(paths.playbook, 'owners.md'));
  const { units } = parseOwners(ownersText);
  const opora = oporaIndex(units, resolveAlias, aliases);
  const clustersFile = readJson(paths.clusters, { manual: {} });
  const manual = clustersFile.manual ?? {};
  const clusters = buildClusters(rows, agree, manual);
  const owners = assignOwners({ rows, clusters, opora, units, manual });
  const superseded = supersededIndex(read(join(paths.playbook, 'superseded.md')), resolveAlias, aliases);
  const skills = ownerSkills(ownersText);
  return { rows, agree, aliases, resolveAlias, units, opora, clusters, clustersFile, owners, superseded, skills, ownersText };
}

/** Ключи thresholds.json, в опоре которых стоит строка: блок о ней обязан назвать ключ, а не число. */
function thresholdKeysByRow(all) {
  const map = new Map();
  for (const [key, t] of Object.entries(all)) {
    if (key.startsWith('_')) continue;
    for (const s of t.sources ?? []) {
      for (const m of String(s).matchAll(/([a-z][a-z0-9-]+:(?:(?:P|PAT|GREEN|RED|LESSON)-\d+|attention§\d+)|\bR-\d+\b|#attn-[a-z0-9-]+)/g)) {
        if (!map.has(m[1])) map.set(m[1], []);
        map.get(m[1]).push(key);
      }
    }
  }
  return map;
}

/** Матрица: строки со всеми колонками, проблемы ручного слоя, сводка по скиллам. */
export function buildMatrix(opts = {}) {
  const paths = { ...PATHS, ...opts.paths };
  ensureClean(paths, opts.fresh);
  const kb = opts.kb ?? loadKnowledge(paths);
  const th = loadThresholds(paths.thresholds);
  const cfg = {
    minChars: th.value('skill.coverage.block_min_chars'),
    minTerms: th.value('skill.coverage.key_terms_min'),
    thresholdKeys: thresholdKeysByRow(th.all),
  };
  const terms = keyTerms(kb.rows, th.value('skill.coverage.key_terms'));
  const scan = scanSkills({
    skillsDir: paths.skills,
    skillNames: kb.skills.filter((s) => s !== 'story:lint'),
    resolve: kb.resolveAlias,
    pad,
    root: paths.root,
    lintChecksDir: paths.lintChecks,
    mutantsDir: paths.mutants,
  });
  const manual = readJson(paths.coverage, { rows: {} });
  const rowsById = new Map(kb.rows.map((r) => [r.id, r]));
  const clusterIds = new Set(kb.clusters.map((c) => c.id));
  const features = existsSync(paths.plan) ? engineFeatures(read(paths.plan)) : new Set();
  const problems = [];

  for (const [id, m] of Object.entries(manual.rows ?? {})) {
    if (!rowsById.has(id)) problems.push(`coverage.json: нет строки «${id}»`);
    if (m.status) {
      const e = statusError(m.status, { rows: rowsById, clusters: clusterIds, features });
      if (e) problems.push(`coverage.json ${id}: ${e}`);
    }
    if (m.basis && !['checked', 'secondary', 'model', 'our_estimate'].includes(m.basis)) problems.push(`coverage.json ${id}: basis «${m.basis}» не checked / secondary / model / our_estimate`);
  }

  const matrix = kb.rows.map((r) => {
    const o = kb.owners.get(r.id);
    const m = manual.rows?.[r.id] ?? {};
    const sup = kb.superseded.get(r.id) ?? (r.kind === 'nuance' ? kb.superseded.get(r.parent) : null);
    const status = m.status ?? (sup && !sup.partial ? `superseded:${sup.decision}` : 'used');
    const skill = o.owner_skill && o.owner_skill !== 'story:lint' ? scan.skills.get(o.owner_skill) : null;
    const lv = o.owner_skill === 'story:lint' ? lintLevel(r, scan, cfg) : rowLevel(r, terms.get(r.id) ?? [], skill, scan, cfg);
    const best = lv.blocks?.find((b) => b.level === lv.level);
    const blockBasis = best ? readBasis(paths.root, best) : null;
    return {
      id: r.id,
      kind: r.kind,
      alias: r.alias ?? null,
      title: r.title,
      source: `${r.file}:${r.line}`,
      cluster: o.cluster,
      th: o.th,
      owner_skill: o.owner_skill,
      target: o.target,
      owner_via: o.via,
      own_level: lv.level,
      level: lv.level,
      why: lv.why,
      status,
      partial: sup?.partial ? sup.decision : null,
      basis: m.basis ?? blockBasis ?? null,
      verified_by: [...new Set([...(lv.level === 'L3' ? lv.why : []), ...(m.verified_by ?? [])])],
      fidelity: m.fidelity ?? null,
      in_sources: Boolean(skill?.sources.has(r.id)),
      terms: terms.get(r.id) ?? [],
    };
  });

  // Покрытие считается по кластеру: строка в sources.md получает уровень лучшего блока своего кластера.
  const byCluster = new Map();
  for (const x of matrix) {
    const k = `${x.owner_skill}|${x.cluster}`;
    if (!byCluster.has(k)) byCluster.set(k, []);
    byCluster.get(k).push(x);
  }
  for (const group of byCluster.values()) {
    if (group.length < 2) continue;
    const top = group.reduce((a, b) => (levelNum(b.own_level) > levelNum(a.own_level) ? b : a));
    for (const x of group) {
      if (levelNum(top.own_level) > levelNum(x.level) && levelNum(top.own_level) >= 2 && x.in_sources) {
        x.level = top.own_level;
        x.why = [`по кластеру ${x.cluster}: ${top.id}`];
      }
    }
  }
  const index = new Map(matrix.map((x) => [x.id, x]));
  for (const x of matrix) {
    const to = x.status.match(/^merged-into:(.+)$/)?.[1];
    if (to && index.has(to)) {
      x.level = index.get(to).level;
      x.why = [`влито в ${to}`];
    }
  }

  const stale = clustersStale(kb);
  if (stale) problems.push(`clusters.json отстал от базы (${stale}): npm run story:coverage -- --build-clusters`);
  return { matrix, kb, scan, problems, th, paths };
}

/**
 * Владелец story:lint держит знание проверкой и порогом, а не reference: L3 — есть проверка, L2 — строка в опоре
 * ключа thresholds.json, иначе L0.
 */
function lintLevel(r, scan, cfg) {
  if (scan.lintIds.has(r.id)) return { level: 'L3', why: [`story:lint ${r.id}`], blocks: [] };
  const keys = cfg.thresholdKeys.get(r.id);
  if (keys?.length) return { level: 'L2', why: [`thresholds.json: ${keys.slice(0, 3).join(', ')}`], blocks: [] };
  return { level: 'L0', why: ['нет ни проверки story:lint, ни ключа thresholds.json'], blocks: [] };
}

function readBasis(root, block) {
  const text = existsSync(join(root, block.file)) ? read(join(root, block.file)).split('\n').slice(block.line - 1, block.line + 40).join('\n') : '';
  return text.match(/basis:?\**\s*`?(checked|secondary|model|our_estimate)/)?.[1] ?? null;
}

export function clustersFileContent(kb) {
  return {
    _about: {
      what: 'Кластеры тем матрицы покрытия (flow-review.md §C «Кластеры»). clusters собирает npm run story:coverage -- --build-clusters; руками правится только manual.',
      how: 'Строка входит в первую группу, которая её назвала: правило rules.md с «Источниками», затем пункт согласий for-relayer.md, затем принцип, на который ссылается флаг, приём или урок. К чужому кластеру пункт пристраивается только своей первой ссылкой. Одиночки в файл не пишутся: такая строка — кластер сама себе.',
      manual: 'move: { "строка": "K-…" } — перенести строку в кластер ("" — вынуть в одиночку); th: { "строка или K-…": "TH-NN" } — тема, если «опора» owners.md её не даёт; title: { "K-…": "название" }. Тему лучше дописать в «опору» owners.md, manual — когда нельзя.',
      owner: 'Владелец кластера — owners.md: TH-NN большинства «опоры» среди строк кластера; R/C/F и якоря — по своему ID.',
    },
    manual: kb.clustersFile.manual ?? { move: {}, th: {}, title: {} },
    clusters: kb.clusters.map((c) => ({ id: c.id, title: c.title, th: clusterTh(kb, c), from: c.from, members: c.members })),
  };
}

function clusterTh(kb, c) {
  const ths = c.members.map((m) => kb.owners.get(m)?.th).filter(Boolean);
  const count = new Map();
  for (const t of ths) count.set(t, (count.get(t) ?? 0) + 1);
  return [...count].sort((a, b) => b[1] - a[1] || Number(a[0].slice(3)) - Number(b[0].slice(3)))[0]?.[0] ?? null;
}

function clustersStale(kb) {
  if (!kb.clustersFile.clusters) return 'файла нет';
  const want = JSON.stringify(clustersFileContent(kb).clusters);
  const have = JSON.stringify(kb.clustersFile.clusters);
  if (want === have) return null;
  return `в файле ${kb.clustersFile.clusters.length}, по базе ${kb.clusters.length}`;
}

// ——— отчёты ———

const count = (xs, key) => {
  const m = new Map();
  for (const x of xs) m.set(key(x), (m.get(key(x)) ?? 0) + 1);
  return m;
};
const fmtCounts = (m, order) => (order ?? [...m.keys()]).filter((k) => m.get(k)).map((k) => `${k} ${m.get(k)}`).join(' · ');
const counted = (x) => x.status === 'used';

function skillTable(matrix, skills, scan, th) {
  const out = [];
  for (const s of skills) {
    const rows = matrix.filter((x) => x.owner_skill === s);
    const clusters = clusterLevels(rows);
    const lv = count(rows.filter(counted), (x) => x.level);
    const fid = rows.filter((x) => x.fidelity);
    const ok = fid.filter((x) => x.fidelity.ok).length;
    out.push({
      skill: s,
      exists: s === 'story:lint' ? true : Boolean(scan.skills.get(s)?.exists),
      rows: rows.length,
      clusters: clusters.size,
      L0: lv.get('L0') ?? 0,
      L1: lv.get('L1') ?? 0,
      L2: lv.get('L2') ?? 0,
      L3: lv.get('L3') ?? 0,
      fidelity: fid.length ? { checked: fid.length, ok, share: ok / fid.length, below: ok / fid.length < th.value('lab.fidelity.min_share') } : null,
    });
  }
  return out;
}

/** Уровень кластера скилла — лучший уровень его строк в работе (used). */
function clusterLevels(rows) {
  const m = new Map();
  for (const x of rows.filter(counted)) {
    const cur = m.get(x.cluster);
    if (!cur || levelNum(x.level) > levelNum(cur.level)) m.set(x.cluster, { level: x.level, th: x.th, rows: [...(cur?.rows ?? []), x.id] });
    else cur.rows.push(x.id);
  }
  return m;
}

export function summary(res) {
  const { matrix, kb, scan, problems, th } = res;
  const used = matrix.filter(counted);
  const unowned = matrix.filter((x) => !x.owner_skill);
  const allClusters = new Set(matrix.filter((x) => BASE_KINDS.includes(x.kind) || x.kind === 'R').map((x) => x.cluster));
  const check = runOwnersCheck(res.paths);
  return {
    rows: matrix.length,
    kinds: Object.fromEntries(KINDS.map((k) => [k, matrix.filter((x) => x.kind === k).length])),
    clusters: { base: allClusters.size, multi: kb.clusters.length, in_multi: kb.clusters.reduce((s, c) => s + c.members.length, 0) },
    levels: Object.fromEntries(LEVELS.map((l) => [l, used.filter((x) => x.level === l).length])),
    statuses: Object.fromEntries(count(matrix, (x) => x.status.replace(/:.*/, '')).entries()),
    partial: matrix.filter((x) => x.partial).length,
    owner_via: Object.fromEntries(count(matrix.filter((x) => x.owner_skill), (x) => x.owner_via).entries()),
    unowned: { total: unowned.length, kinds: Object.fromEntries(count(unowned, (x) => x.kind).entries()) },
    skills: skillTable(matrix, kb.skills, scan, th),
    skills_present: [...scan.skills.values()].filter((s) => s.exists).length,
    owners_check: check,
    problems,
  };
}

function printSummary(s) {
  const lines = [];
  lines.push(`Покрытие знаний: ${s.rows} строк · кластеров базы и свода ${s.clusters.base} (из нескольких строк — ${s.clusters.multi}, в них ${s.clusters.in_multi} строк)`);
  lines.push(`  виды: ${KINDS.filter((k) => s.kinds[k]).map((k) => `${k} ${s.kinds[k]}`).join(' · ')}`);
  lines.push(`  уровни (used): ${LEVELS.map((l) => `${l} ${s.levels[l]}`).join(' · ')}   — L1 покрытием не считается`);
  lines.push(`  статусы: ${fmtCounts(new Map(Object.entries(s.statuses)))}${s.partial ? ` · частично отменено (берётся часть «в силе») ${s.partial}` : ''}`);
  lines.push(`  владелец: ${fmtCounts(new Map(Object.entries(s.owner_via)))} · без владельца ${s.unowned.total} (${fmtCounts(new Map(Object.entries(s.unowned.kinds)))}) — --unowned`);
  lines.push(`  скиллов с файлами: ${s.skills_present} из ${s.skills.length - 1}${s.skills_present ? '' : ' — скиллов ещё нет, всё в L0: это нормально'}`);
  lines.push('');
  lines.push('| скилл | файлы | строк | кластеров | L0 | L1 | L2 | L3 | верность |');
  lines.push('|---|---|---|---|---|---|---|---|---|');
  for (const k of s.skills) {
    const f = k.fidelity ? `${k.fidelity.ok}/${k.fidelity.checked}${k.fidelity.below ? ' ✗' : ''}` : '—';
    lines.push(`| ${k.skill} | ${k.exists ? 'да' : '—'} | ${k.rows} | ${k.clusters} | ${k.L0} | ${k.L1} | ${k.L2} | ${k.L3} | ${f} |`);
  }
  const c = s.owners_check;
  lines.push('');
  lines.push(`owners.md §8: ${c.ok ? '✓' : '✗'} единиц ${c.units} · TH ${c.th} · дубли: ${c.dups.join(', ') || 'нет'} · нет владельца: ${c.miss.join(', ') || 'нет'} · чужой владелец: ${c.bad.join(', ') || 'нет'}`);
  for (const p of s.problems) lines.push(`✗ ${p}`);
  return lines.join('\n');
}

function runOwnersCheck(paths) {
  const r = (f) => read(join(paths.playbook, f));
  return ownersCheck({ owners: r('owners.md'), rules: r('rules.md'), checks: r('checks.md'), skills: r('skills.md'), attention: r('attention-merged.md') });
}

function skillPart(res, skill, min) {
  const rows = res.matrix.filter((x) => x.owner_skill === skill).sort((a, b) => byId(a.cluster, b.cluster) || byId(a.id, b.id));
  const levels = clusterLevels(rows);
  const below = min ? [...levels].filter(([, v]) => levelNum(v.level) < levelNum(min)).map(([k, v]) => ({ cluster: k, ...v })) : [];
  const missingSources = rows.filter((x) => counted(x) && !x.in_sources && levelNum(x.level) < 2).map((x) => x.id);
  // Чужой пересказ: блок о строке лежит в скилле, который ею не владеет (owners.md: «остальные ссылаются»).
  const foreign = [];
  const own = new Set(rows.map((x) => x.id));
  const sk = res.scan.skills.get(skill);
  for (const b of sk?.blocks ?? []) for (const id of b.ids) if (!own.has(id) && res.matrix.some((x) => x.id === id)) foreign.push({ id, file: b.file, line: b.line, owner: res.matrix.find((x) => x.id === id).owner_skill });
  return { skill, exists: Boolean(sk?.exists), rows, clusters: levels.size, below, min: min ?? null, missing_sources: missingSources, foreign };
}

function printSkill(p) {
  const out = [`${p.skill}: строк ${p.rows.length}, кластеров ${p.clusters}${p.exists ? '' : ' · скилла ещё нет — всё L0'}`];
  out.push('| ID | вид | кластер | TH | target | уровень | статус | почему |');
  out.push('|---|---|---|---|---|---|---|---|');
  for (const x of p.rows) {
    out.push(`| ${x.id} | ${x.kind} | ${x.cluster === x.id ? '—' : x.cluster} | ${x.th ?? '—'} | ${x.target ?? '—'} | ${x.level} | ${x.status}${x.partial ? ` (частично ${x.partial})` : ''} | ${(x.why ?? []).slice(0, 2).join('; ')} |`);
  }
  if (p.foreign.length) {
    out.push('', 'Пересказ чужих строк (владелец ссылается, остальные — нет):');
    for (const f of p.foreign) out.push(`  ${f.file}:${f.line} — ${f.id} (владелец ${f.owner ?? 'не назначен'})`);
  }
  if (p.min) {
    if (p.below.length) {
      out.push('', `✗ ниже ${p.min}: ${p.below.length} кластеров из ${p.clusters}`);
      for (const b of p.below.slice(0, 40)) out.push(`  ${b.cluster} (${b.th ?? 'без TH'}): ${b.level}`);
      if (p.below.length > 40) out.push(`  … и ещё ${p.below.length - 40}`);
    } else out.push('', `✓ все кластеры ${p.skill} не ниже ${p.min}`);
  }
  return out.join('\n');
}

export function sourcesMd(res, skill) {
  const rows = res.matrix.filter((x) => x.owner_skill === skill).sort((a, b) => byId(a.target ?? '', b.target ?? '') || byId(a.cluster, b.cluster) || byId(a.id, b.id));
  const unit = (th) => res.kb.units.get(th);
  const lines = [
    `# Источники \`${skill}\``,
    '',
    `Сгенерировано \`npm run story:coverage -- --sources ${skill} --write\`, руками не править. Список ID — это`,
    'уровень L1, а не покрытие: строка покрыта, когда в reference есть блок с её ID в заголовке (L2) или',
    'знание исполняемо (L3). Отменённое (`superseded`) не переносится; «частично» — берётся часть «в силе»',
    '(`docs/playbook/superseded.md`).',
  ];
  let file = null;
  let th = null;
  for (const x of rows) {
    const f = (x.target ?? '—').replace(/#.*$/, '');
    if (f !== file) {
      file = f;
      th = null;
      lines.push('', `## ${f}`);
    }
    if (x.th !== th) {
      th = x.th;
      lines.push('', th ? `### ${th} · ${unit(th)?.topic ?? ''}` : '### без кластера TH');
    }
    const st = x.status !== 'used' ? ` — ${x.status}` : x.partial ? ` — частично отменено ${x.partial}` : '';
    const cl = x.cluster !== x.id ? ` · ${x.cluster}` : '';
    lines.push(`- \`${x.id}\` ${x.title ? `— ${x.title}` : ''} (\`${x.source}\`${cl})${st}`);
  }
  return lines.join('\n') + '\n';
}

export function affected(res, query) {
  const { matrix, kb } = res;
  const q = query.trim();
  const qAlias = q.match(/^([a-z][a-z0-9-]+)(?::(.+))?$/);
  const full = qAlias && kb.resolveAlias(qAlias[1]) ? `${kb.resolveAlias(qAlias[1])}${qAlias[2] ? ':' + qAlias[2] : ''}` : q;
  let hit = matrix.filter((x) => x.id === full || x.cluster === full || x.th === full || x.source.startsWith(full + ':'));
  if (!hit.length && qAlias && !qAlias[2]) hit = matrix.filter((x) => x.alias === full);
  if (!hit.length && /^docs\//.test(q)) hit = matrix.filter((x) => x.source.startsWith(q.replace('docs/books/', 'docs/books/_clean/')) || x.source.startsWith(q));
  // Строки свода называют разборы в «Источниках»: правка разбора задевает и правило.
  const ids = new Set(hit.map((x) => x.id));
  for (const r of kb.rows.filter((r) => r.kind === 'R' && r.sources)) {
    if ([...ids].some((id) => r.sources.includes(id)) && !ids.has(r.id)) hit.push(matrix.find((x) => x.id === r.id));
  }
  const skills = new Map();
  const add = (s, why) => {
    if (!s) return;
    if (!skills.has(s)) skills.set(s, new Set());
    skills.get(s).add(why);
  };
  for (const x of hit) {
    add(x.owner_skill, `владелец ${x.id} → ${x.target ?? '—'}`);
    for (const unitId of [x.id, x.th].filter(Boolean)) {
      const refs = kb.units.get(unitId)?.refs ?? '';
      for (const m of refs.matchAll(/`?(story-[a-z]+|chapter-write|story:lint)\b/g)) add(m[1], `ссылается на ${unitId}`);
    }
  }
  for (const [name, s] of res.scan.skills) for (const b of s.blocks) for (const id of b.ids) if (hit.some((x) => x.id === id)) add(name, `блок ${b.file}:${b.line} (${id})`);
  return { query: q, rows: hit.map((x) => ({ id: x.id, cluster: x.cluster, th: x.th, owner_skill: x.owner_skill, target: x.target, level: x.level, status: x.status })), skills: Object.fromEntries([...skills].map(([k, v]) => [k, [...v]])) };
}

export function fidelitySample(res, skill, n, seed) {
  const rng = seeded(seed);
  const rows = res.matrix.filter((x) => x.owner_skill === skill && counted(x));
  const withBlock = rows.filter((x) => levelNum(x.own_level) >= 2);
  const pick = (xs, k) => {
    const a = [...xs];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, k);
  };
  // Верность имеет смысл только там, где есть что сравнить: строки с блоком — вперёд.
  const chosen = [...pick(withBlock, n), ...pick(rows.filter((x) => !withBlock.includes(x)), Math.max(0, n - withBlock.length))];
  const byRow = new Map(res.kb.rows.map((r) => [r.id, r]));
  const sk = res.scan.skills.get(skill);
  return {
    skill,
    seed,
    n: chosen.length,
    pairs: chosen.map((x) => {
      const block = sk?.blocks.find((b) => b.ids.includes(x.id));
      return {
        id: x.id,
        level: x.level,
        source: { at: x.source, text: clip(byRow.get(x.id)?.text ?? '', 1500) },
        reference: block ? { at: `${block.file}:${block.line}`, text: clip(block.body.trim(), 1500) } : null,
      };
    }),
  };
}

const clip = (s, n) => (s.length > n ? s.slice(0, n) + '…' : s);

function printFidelity(f) {
  const out = [
    `# Верность: ${f.skill}, ${f.n} пар (seed ${f.seed})`,
    '',
    'Сравни источник и reference: сохранены ли условия, исключения («когда не работает»), числа (ключом',
    'thresholds.json) и уровень уверенности. Итог записать:',
    '`npm run story:coverage -- --record <ID> fidelity=ok|bad note="что потеряно" by=<ревьюер>`.',
  ];
  for (const p of f.pairs) {
    out.push('', `## ${p.id} · ${p.level}`, '', `**Источник** \`${p.source.at}\``, '', quote(p.source.text), '');
    out.push(p.reference ? `**Reference** \`${p.reference.at}\`` : '**Reference** — блока нет: строка не покрыта, сверять нечего.');
    if (p.reference) out.push('', quote(p.reference.text));
    out.push('', '- [ ] условия · [ ] исключения · [ ] числа ключом · [ ] уровень уверенности');
  }
  return out.join('\n');
}

const quote = (t) => t.split('\n').map((l) => `> ${l}`).join('\n');

/** Запись ручного слоя: status, basis, verified_by, fidelity, note, by. */
export function record(res, id, pairs, paths = PATHS) {
  const row = res.matrix.find((x) => x.id === id);
  if (!row) throw new Error(`нет строки «${id}»`);
  const file = readJson(paths.coverage, { rows: {} });
  file.rows ??= {};
  const m = file.rows[id] ?? {};
  const kv = Object.fromEntries(pairs.map((p) => {
    const i = p.indexOf('=');
    if (i < 0) throw new Error(`ожидалось ключ=значение: «${p}»`);
    return [p.slice(0, i), p.slice(i + 1)];
  }));
  const today = new Date().toISOString().slice(0, 10);
  for (const [k, v] of Object.entries(kv)) {
    if (k === 'status') {
      const e = statusError(v, { rows: new Map(res.matrix.map((x) => [x.id, x])), clusters: new Set(res.kb.clusters.map((c) => c.id)), features: engineFeatures(read(paths.plan)) });
      if (e) throw new Error(e);
      m.status = v;
    } else if (k === 'basis') {
      if (!['checked', 'secondary', 'model', 'our_estimate'].includes(v)) throw new Error(`basis «${v}» не checked / secondary / model / our_estimate`);
      m.basis = v;
    } else if (k === 'verified_by') m.verified_by = v.split(',').map((s) => s.trim()).filter(Boolean);
    else if (k === 'fidelity') {
      if (!['ok', 'bad'].includes(v)) throw new Error('fidelity=ok или fidelity=bad');
      m.fidelity = { ok: v === 'ok', date: today, by: kv.by ?? null, note: kv.note ?? null };
    } else if (!['note', 'by'].includes(k)) throw new Error(`неизвестный ключ «${k}»: status, basis, verified_by, fidelity, note, by`);
  }
  if (kv.note && !kv.fidelity) m.note = kv.note;
  file.rows[id] = m;
  file.rows = Object.fromEntries(Object.entries(file.rows).sort(([a], [b]) => byId(a, b)));
  writeFileSync(paths.coverage, JSON.stringify(file, null, 2) + '\n');
  return m;
}

// ——— CLI ———

function parseArgs(argv) {
  const a = { _: [] };
  const takes = ['--skill', '--min', '--sources', '--affected', '--fidelity-sample', '--seed', '--skills-dir', '--record'];
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (takes.includes(x)) a[x] = argv[++i];
    else if (x.startsWith('--')) a[x] = true;
    else a._.push(x);
  }
  return a;
}

const KNOWN = ['--summary', '--skill', '--min', '--sources', '--write', '--affected', '--fidelity-sample', '--seed', '--owners-check', '--unowned', '--build-clusters', '--check', '--record', '--json', '--skills-dir', '--fresh', '--help', '-h'];

export function main(argv, paths = PATHS) {
  const a = parseArgs(argv);
  const say = (x, text) => console.log(a['--json'] ? JSON.stringify(x, null, 2) : text);
  if (a['--help'] || a['-h']) return console.log(HELP), 0;
  const unknown = Object.keys(a).filter((k) => k !== '_' && !KNOWN.includes(k));
  if (unknown.length) {
    console.error(`неизвестный флаг: ${unknown.join(' ')}\n\n${HELP}`);
    return 2;
  }
  if (a['--skills-dir']) paths = { ...paths, skills: resolve(a['--skills-dir']) };

  if (a['--owners-check']) {
    const c = runOwnersCheck(paths);
    say(c, `owners.md §8: строк ${c.units} · TH ${c.th} · дубли: ${c.dups.join(',') || 'нет'} · нет владельца: ${c.miss.join(',') || 'нет'} · чужой владелец: ${c.bad.join(',') || 'нет'}`);
    return c.ok ? 0 : 1;
  }

  ensureClean(paths, a['--fresh']);
  const kb = loadKnowledge(paths);

  if (a['--build-clusters']) {
    const content = clustersFileContent(kb);
    const stale = clustersStale(kb);
    if (a['--check']) {
      say({ ok: !stale, stale }, stale ? `✗ clusters.json отстал: ${stale} — npm run story:coverage -- --build-clusters` : `✓ clusters.json свежий: ${content.clusters.length} кластеров`);
      return stale ? 1 : 0;
    }
    writeFileSync(paths.clusters, JSON.stringify(content, null, 2) + '\n');
    say({ clusters: content.clusters.length }, `✓ clusters.json: ${content.clusters.length} кластеров из нескольких строк, в них ${content.clusters.reduce((s, c) => s + c.members.length, 0)} строк`);
    return 0;
  }

  const res = buildMatrix({ paths, kb });
  const known = new Set(kb.skills);
  const needSkill = (s) => {
    if (!s || !known.has(s)) throw new Error(`нет скилла «${s ?? ''}» в owners.md §1: ${kb.skills.join(', ')}`);
    return s;
  };

  if (a['--skill']) {
    const min = a['--min'];
    if (min && !LEVELS.includes(min)) throw new Error(`--min: ${LEVELS.join(' / ')}`);
    const p = skillPart(res, needSkill(a['--skill']), min);
    say(p, printSkill(p));
    return min && p.below.length ? 1 : 0;
  }
  if (a['--sources']) {
    const s = needSkill(a['--sources']);
    const text = sourcesMd(res, s);
    if (a['--write']) {
      const out = join(paths.skills, s, 'references', 'sources.md');
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, text);
      say({ file: out }, `✓ ${out}`);
    } else process.stdout.write(a['--json'] ? JSON.stringify({ skill: s, text }, null, 2) + '\n' : text);
    return 0;
  }
  if (a['--affected']) {
    const r = affected(res, a['--affected']);
    const text = [`${r.query}: строк ${r.rows.length}`, ...r.rows.slice(0, 30).map((x) => `  ${x.id} · ${x.cluster} · ${x.th ?? '—'} → ${x.owner_skill ?? 'без владельца'} (${x.target ?? '—'}) · ${x.level} · ${x.status}`), r.rows.length > 30 ? `  … и ещё ${r.rows.length - 30}` : null, 'Скиллы:', ...Object.entries(r.skills).map(([k, v]) => `  ${k}: ${v.slice(0, 4).join('; ')}${v.length > 4 ? ` … (+${v.length - 4})` : ''}`)].filter((x) => x != null).join('\n');
    say(r, text);
    return r.rows.length ? 0 : 1;
  }
  if (a['--fidelity-sample']) {
    const s = needSkill(a['--fidelity-sample']);
    const n = Number(a._[0] ?? res.th.value('lab.fidelity.sample'));
    const seed = Number(a['--seed'] ?? Date.now() % 2 ** 31);
    const f = fidelitySample(res, s, n, seed);
    say(f, printFidelity(f));
    return 0;
  }
  if (a['--record']) {
    const m = record(res, a['--record'], a._, paths);
    say({ id: a['--record'], ...m }, `✓ coverage.json ${a['--record']}: ${JSON.stringify(m)}`);
    return 0;
  }
  if (a['--unowned']) {
    const xs = res.matrix.filter((x) => !x.owner_skill);
    say(xs.map((x) => ({ id: x.id, kind: x.kind, title: x.title, source: x.source, cluster: x.cluster })), [`Без владельца: ${xs.length}. Назначить — дописать ID в «опору» нужного TH-NN в owners.md §5 (или manual.th в clusters.json).`, ...xs.map((x) => `  ${x.id} — ${(x.title ?? '').slice(0, 80)} (${x.source})`)].join('\n'));
    return 0;
  }
  const s = summary(res);
  say(s, printSummary(s));
  return s.problems.some((p) => p.startsWith('coverage.json')) || !s.owners_check.ok ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    console.error(`✗ ${e.message}`);
    process.exitCode = 2;
  }
}

export { REJECT_REASONS, KIND_RU };
