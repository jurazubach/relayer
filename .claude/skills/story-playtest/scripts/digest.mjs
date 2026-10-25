// Сводка отзывов волны (TH-93): узел · тип · сколько человек · сходится ли с замером. Отзыв — симптом с местом,
// а не рецепт (narrative-testing:P-05); повтор у нескольких людей идёт в обязательный список (P-06). Ответы
// симулированной панели сводятся так же, но с пометкой «симуляция» и в обязательный список сами не попадают.
import { readFileSync, readdirSync, statSync, realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { basename, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { walk } from '../../../../scripts/lib/ink.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';
import { runCli } from '../../../../scripts/story/core/cli.mjs';
import { prepare, readSave, runOnce } from '../../../../scripts/story/core/run.mjs';

const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/digest.mjs --story <id|набор.json> <отзыв.md|папка>… [--no-lint] [--json]

Сводка отзывов волны теста (скилл story-playtest, Б-2): каждое замечание — узел и тип, совпадения считаются по
людям, рядом — находки story:lint в том же узле или главе. Отзывы — файлы формы из references/digest.md:

  тестер: Аня                         кто (у симуляции — профиль: skeptic)
  режим: realtime | click
  источник: живой | симуляция
  журнал: путь/к/журналу.choices.json (необязательно: по нему цитата ищется на пути тестера)
  - <тип> · <место> · <симптом>
      тип: скучно | непонятно | не верю | нестыковка | баг | выбор | понравилось | предложение
      место: узел (ch2_bank), «начало сообщения» или «Чат: начало сообщения»

Обязательный список: одно место и один тип у lab.playtest.repeat_min живых людей при волне до
lab.playtest.small_wave_max человек, у доли lab.playtest.repeat_share — при большей. Один человек против замера
— «нужен третий» (Б-3). Совпадения профилей симуляции — кандидат: это одна модель, а не независимые люди.
«Предложение» — рецепт тестера: в сводку не идёт, отдельным списком для ideas.md. «Понравилось» — что не сломать.

  --story <id>   история или набор playtest-kit (.json; с узлом beta_stop замер идёт с --partial)
  --no-lint      без колонки замера (быстро)
  --json         сводка данными
  --help         эта справка`;

export const TYPES = ['скучно', 'непонятно', 'не верю', 'нестыковка', 'баг', 'выбор'];
const SIDE = ['понравилось', 'предложение'];
// Какие проверки story:lint меряют тот же симптом, что тип отзыва, и чей это скилл без находки замера.
export const TYPE_CHECKS = {
  'скучно': { checks: ['C-20', 'C-26', 'C-30', 'C-33', 'C-35', 'C-36', 'C-38', 'C-42', 'C-46'], owner: 'story-pace' },
  'непонятно': { checks: ['C-13', 'C-21', 'C-22', 'C-23', 'C-24', 'C-25', 'C-28', 'C-39', 'C-50', 'C-51'], owner: 'story-opening' },
  'не верю': { checks: ['C-14', 'C-37', 'C-44', 'C-45', 'C-47', 'C-48'], owner: 'story-voice' },
  'нестыковка': { checks: ['C-49', 'C-51', 'C-54'], owner: 'story-continuity' },
  'баг': { checks: ['C-15', 'C-52'], owner: 'story-fix' },
  'выбор': { checks: ['C-01', 'C-02', 'C-03', 'C-04', 'C-05', 'C-08', 'C-10', 'C-11', 'C-16', 'C-18', 'C-19', 'C-06', 'C-40'], owner: 'story-choices' },
};

const norm = (s) => String(s).toLowerCase().replace(/ё/g, 'е').replace(/[«»"“”„.,!?…:;()—–-]/g, ' ').replace(/\s+/g, ' ').trim();

/** Файл отзыва → { tester, mode, source, log, notes: [{ type, place, symptom }] }. */
export function parseFeedback(text, file = '') {
  const head = (k) => text.match(new RegExp(`^\\s*${k}\\s*:\\s*(.+)$`, 'mi'))?.[1]?.trim() ?? null;
  const notes = [];
  const bad = [];
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*[-*]\s+(.+)$/);
    if (!m) continue;
    const parts = m[1].split(/\s+·\s+/).map((x) => x.trim());
    const type = parts[0]?.toLowerCase().replace(/ё/g, 'е');
    const known = [...TYPES, ...SIDE].find((t) => t.replace(/ё/g, 'е') === type);
    if (!known || parts.length < 2) { bad.push(m[1]); continue; }
    // «Чат · «цитата» · симптом» — место из двух полей: имя чата и начало сообщения
    const split = parts.length >= 4 && !/[«"“]/.test(parts[1]) && /^[«"“]/.test(parts[2]);
    const place = split ? `${parts[1]}: ${parts[2]}` : parts[1];
    notes.push({ type: known, place, symptom: parts.slice(split ? 3 : 2).join(' · ') || null });
  }
  const source = /симул/i.test(head('источник') ?? '') ? 'симуляция' : 'живой';
  return { file, tester: head('тестер') ?? basename(file, '.md'), mode: head('режим'), source, log: head('журнал'), notes, bad };
}

/** Строки ink с узлами: где искать цитату тестера. */
function inkLines(tree) {
  const out = [];
  for (const k of tree.knots) walk(k.items, (it) => { if (['msg', 'me', 'sys'].includes(it.type) && it.text) out.push({ knot: k.id, text: it.text }); });
  return out;
}

/** Место отзыва → узел: имя узла, цитата на пути тестера (по журналу) или в тексте ink. */
export function locate(place, { nodes, path, lines }) {
  const bare = place.replace(/[‹›`]/g, '').trim();
  if (nodes.includes(bare)) return { knot: bare, how: 'узел' };
  const quote = place.match(/[«"“]([^»"”]+)[»"”]/)?.[1] ?? place.split(/:\s*/).slice(1).join(':') ?? '';
  const q = norm(quote || place);
  if (q.length < 4) return { knot: null, how: 'не найдено' };
  for (const [pool, how] of [[path, 'по журналу'], [lines, 'по тексту']]) {
    const hit = pool?.find((l) => norm(l.text).includes(q) || (q.length >= 12 && q.includes(norm(l.text).slice(0, 24))));
    if (hit) return { knot: hit.knot, how };
  }
  return { knot: null, how: 'не найдено' };
}

function lintFindings(ref, partial) {
  const r = spawnSync(process.execPath, [join(ROOT, 'scripts/lint/lint.mjs'), '--story', ref, '--json', ...(partial ? ['--partial'] : [])], { encoding: 'utf8', maxBuffer: 1 << 27, cwd: process.cwd() });
  try { return JSON.parse(r.stdout).stories?.[0]?.findings ?? null; } catch { return null; }
}

/** Есть ли в замере тот же симптом: тот же узел, иначе та же глава. */
export function matchMeasure(type, knot, chapter, findings) {
  if (!findings) return { verdict: 'нет данных', checks: [] };
  const want = new Set(TYPE_CHECKS[type]?.checks ?? []);
  const same = findings.filter((f) => want.has(f.check) && knot && f.node === knot);
  if (same.length) return { verdict: 'да', checks: [...new Set(same.map((f) => f.check))], owner: same[0].owner };
  const near = findings.filter((f) => want.has(f.check) && chapter != null && f.chapter === chapter);
  if (near.length) return { verdict: 'рядом', checks: [...new Set(near.map((f) => f.check))], owner: near[0].owner };
  return { verdict: 'нет', checks: [] };
}

export function digest(feedback, p, findings, T) {
  const nodes = p.nodes;
  const lines = inkLines(p.tree);
  const chapterOf = new Map();
  for (const k of p.tree.knots) chapterOf.set(k.id, k.chapter ?? null);
  const live = new Set(feedback.filter((f) => f.source === 'живой').map((f) => f.tester));
  const groups = new Map();
  const side = { 'понравилось': [], 'предложение': [] };
  const unplaced = [];
  for (const fb of feedback) {
    let path = null;
    if (fb.log) {
      try {
        const r = runOnce(p, { save: readSave(fb.log, p.story.id), mode: fb.mode === 'click' ? 'click' : 'realtime', partial: true });
        path = r.timeline.items.filter((i) => i.type === 'line').map((i) => ({ knot: i.knot, text: i.text }));
      } catch { path = null; }
    }
    for (const n of fb.notes) {
      const at = locate(n.place, { nodes, path, lines });
      if (SIDE.includes(n.type)) { side[n.type].push({ tester: fb.tester, source: fb.source, place: n.place, knot: at.knot, text: n.symptom }); continue; }
      if (!at.knot) { unplaced.push({ tester: fb.tester, source: fb.source, type: n.type, place: n.place, symptom: n.symptom }); continue; }
      const key = `${at.knot}\u0000${n.type}`;
      if (!groups.has(key)) groups.set(key, { knot: at.knot, chapter: chapterOf.get(at.knot) ?? null, type: n.type, live: new Set(), sim: new Set(), quotes: [] });
      const g = groups.get(key);
      (fb.source === 'живой' ? g.live : g.sim).add(fb.tester);
      if (n.symptom) g.quotes.push(`${fb.tester}: ${n.symptom}`);
    }
  }
  const wave = live.size;
  const need = wave > T.value('lab.playtest.small_wave_max') ? Math.ceil(wave * T.value('lab.playtest.repeat_share')) : T.value('lab.playtest.repeat_min');
  const rows = [...groups.values()].map((g) => {
    const m = matchMeasure(g.type, g.knot, g.chapter, findings);
    const people = g.live.size;
    let status;
    if (people >= need) status = 'обязательно: чинить или объяснить письменно';
    else if (people === 1 && m.verdict === 'да') status = 'сигнал: один человек и замер';
    else if (people === 1) status = 'один человек — нужен третий (Б-3)';
    else if (g.sim.size) status = m.verdict === 'да' ? 'кандидат: симуляция и замер' : 'кандидат: только симуляция';
    else status = '—';
    return { knot: g.knot, chapter: g.chapter, type: g.type, people, sim: g.sim.size, simProfiles: [...g.sim], testers: [...g.live], measure: m.verdict, checks: m.checks, owner: m.owner ?? TYPE_CHECKS[g.type].owner, status, quotes: g.quotes };
  }).sort((a, b) => (b.people - a.people) || ((b.measure === 'да') - (a.measure === 'да')) || (b.sim - a.sim) || String(a.knot).localeCompare(String(b.knot)));
  return { story: p.story.id, wave, need, simulated: feedback.some((f) => f.source === 'симуляция'), onlySimulated: !wave, rows, side, unplaced, bad: feedback.flatMap((f) => f.bad.map((b) => `${f.tester}: ${b}`)) };
}

function files(args) {
  const out = [];
  for (const a of args) {
    if (statSync(a).isDirectory()) out.push(...readdirSync(a).filter((f) => f.endsWith('.md')).sort().map((f) => join(a, f)));
    else out.push(a);
  }
  return out;
}

// импорт (самопроверка) не запускает команду
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) runCli(HELP, async (args) => {
  const ref = args.get('story');
  if (!ref || ref === true) throw new Error('нужна --story <id|набор.json>');
  const inputs = files(args.positional);
  if (!inputs.length) throw new Error('нужны файлы отзывов (.md) или папка с ними');
  const T = thresholds();
  const p = prepare(ref);
  const feedback = inputs.map((f) => parseFeedback(readFileSync(f, 'utf8'), f)).filter((f) => f.notes.length || f.bad.length);
  const findings = args.has('no-lint') ? null : lintFindings(p.story.path, p.nodes.includes('beta_stop'));
  const d = digest(feedback, p, findings, T);
  if (args.has('json')) { console.log(JSON.stringify(d, null, 1)); return 0; }
  const mark = d.onlySimulated ? ' · СИМУЛЯЦИЯ: ответы холодных читателей, не людей' : d.simulated ? ' · живые и симуляция' : '';
  console.log(`# Сводка · ${d.story} · людей ${d.wave}${mark}\n`);
  console.log(`Обязательный список — от ${d.need} живых людей на одно место и тип (${d.wave > T.value('lab.playtest.small_wave_max') ? 'lab.playtest.repeat_share' : 'lab.playtest.repeat_min'}).\n`);
  console.log('| узел | тип | сколько человек | симуляция | сходится с замером | чей | статус | симптомы |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const r of d.rows) {
    const measure = r.measure === 'да' || r.measure === 'рядом' ? `${r.measure}: ${r.checks.join(', ')}` : r.measure;
    console.log(`| ${r.knot} | ${r.type} | ${r.people} | ${r.sim ? `${r.sim} (${r.simProfiles.join(', ')})` : '—'} | ${measure} | ${r.owner} | ${r.status} | ${r.quotes.slice(0, 3).join('; ').replace(/\|/g, '/')} |`);
  }
  if (d.unplaced.length) console.log(`\nБез места (уточнить у тестера: чат и начало сообщения, RED-14):\n${d.unplaced.map((u) => `- ${u.tester} · ${u.type} · ${u.place}${u.symptom ? ` · ${u.symptom}` : ''}`).join('\n')}`);
  if (d.side['понравилось'].length) console.log(`\nПонравилось (не сломать при правке):\n${d.side['понравилось'].map((s) => `- ${s.knot ?? s.place} · ${s.tester}${s.text ? `: ${s.text}` : ''}`).join('\n')}`);
  if (d.side['предложение'].length) console.log(`\nРецепты тестеров (в ideas.md, не в правку — P-05):\n${d.side['предложение'].map((s) => `- ${s.knot ?? s.place} · ${s.tester}${s.text ? `: ${s.text}` : ''}`).join('\n')}`);
  if (d.bad.length) console.log(`\nНе разобраны (тип не из списка или нет места):\n${d.bad.map((b) => `- ${b}`).join('\n')}`);
  return 0;
});
