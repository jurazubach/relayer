// Пакет главы для писателя (главная сессия или агент chapter-writer): facts.md первым, шапка, план главы,
// сцены скелета, карточки, концы прошлой главы по путям и состояние VAR на стыке, короткая версия стиля.
// facts.md идёт первым не случайно: модель, которой дали только последние главы, импровизирует имена и
// время (procedural-storytelling:LESSON-08, references/facts-anchor.md). Концы глав считает бот по разным
// персонам — «последние сообщения» у игрока, который молчал, и у того, кто спорил, разные.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseInk } from '../../../../scripts/lib/ink.mjs';
import { chapterFile } from '../../../../scripts/lib/story.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';
import { BETA_STOP, prepare, runOnce } from '../../../../scripts/story/core/run.mjs';
import { PERSONA_IDS } from '../../../../scripts/story/core/personas.mjs';
import { parseStatus } from '../../../../scripts/story/core/state.mjs';
import { visibleText } from '../../../../scripts/story/core/visible.mjs';

const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/chapter-context.mjs --story <id> --chapter N [--plan <файл>] [--runs N] [--json] [--out <файл>]

Пакет главы N для писателя (скилл chapter-write, references/facts-anchor.md, R-27):
  факты        docs/stories/<id>/facts.md целиком и первым; нет файла — «нет данных» и что делать
  шапка        # title, четыре строки разметки (логлайн, вопрос, ставка, оси), контакты
  план         строка главы N из plan-vN.md (STATUS «план:» или последний plans/plan-v*.md) и шапка плана;
               сцены главы N из plans/skeleton.ink
  карточки     characters из meta.json: голос и дуга — служебные поля, на экран не идут
  стык         концы главы N−1 по путям: бот проходит историю персонами (first, last, silent, unresponsive,
               curious, suspicious, trusting, refuse, distracted) и случайными до skill.chapter.context_runs прогонов;
               у каждого пути — последние skill.chapter.tail_msgs видимых сообщений и VAR, которые изменились;
               одинаковые концы склеены, целиком печатается до skill.chapter.tail_paths_max
  стиль        docs/style.md §1 «Короткая версия» как есть; образцы — style-sample.mjs
История с узлом beta_stop читается как часть (beta_stop — законный конец, не финал).

  --story <id>   история из src/stories
  --chapter N    какую главу пишем (1 — концов прошлой главы нет)
  --plan <файл>  план явно (по умолчанию из STATUS.md или последний plans/plan-v*.md)
  --runs N       прогонов бота вместо skill.chapter.context_runs
  --out <файл>   записать пакет в файл (для агента), а не только печатать
  --json         всё данными
  --help         эта справка`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const T = thresholds();

export function chapterContext(id, chapter, { plan = null, runs = T.value('skill.chapter.context_runs') } = {}) {
  const p = prepare(id);
  const stateDir = join(ROOT, 'docs/stories', id);
  const out = { story: id, chapter, files: Object.keys(p.story.files), chapter_file: chapterFile(chapter), partial: p.nodes.includes(BETA_STOP) };
  out.chapter_exists = out.files.includes(out.chapter_file);
  out.chapters_written = [...new Set(p.tree.knots.map((k) => k.chapter).filter((c) => c > 0))].sort((a, b) => a - b);

  const read = (f) => (existsSync(f) ? readFileSync(f, 'utf8') : null);
  const status = read(join(stateDir, 'STATUS.md'));
  out.status = status ? (({ step, plan: pl, core }) => ({ step, plan: pl, core }))(parseStatus(status)) : null;
  out.facts = read(join(stateDir, 'facts.md'));

  out.header = { title: p.story.meta?.title ?? null, head: p.tree.head, contacts: Object.entries(p.tree.contacts).map(([cid, c]) => ({ id: cid, name: c.name ?? c })) };
  out.plan = planOf(stateDir, chapter, plan ?? out.status?.plan, read);
  out.skeleton = skeletonOf(stateDir, chapter, read);
  out.characters = (p.story.meta?.characters ?? []).map((c) => ({ id: c.id ?? null, name: c.name, role: c.role ?? null, voice: c.voice ?? null, arc: arcFor(c.arc, chapter) }));
  out.tails = chapter > 1 ? tails(p, chapter, runs, out.partial) : null;
  out.style = styleShort(read(join(ROOT, 'docs/style.md')));
  return out;
}

function arcFor(arc, chapter) {
  if (arc == null) return null;
  if (typeof arc === 'string') return arc;
  if (Array.isArray(arc)) return arc[chapter - 1] ?? null;
  return arc[chapter] ?? arc[`ch${chapter}`] ?? arc[String(chapter)] ?? null;
}

function planOf(dir, chapter, wanted, read) {
  const plans = join(dir, 'plans');
  let file = null;
  if (wanted && /\.md$/.test(wanted)) file = existsSync(join(ROOT, wanted)) ? join(ROOT, wanted) : join(plans, wanted.split('/').pop());
  else if (wanted && /^v?\d+$/.test(wanted)) file = join(plans, `plan-${wanted.startsWith('v') ? wanted : `v${wanted}`}.md`);
  if (!file && existsSync(plans)) {
    const all = readdirSync(plans).filter((f) => /^plan-v\d+[a-z]?\.md$/.test(f)).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
    if (all.length) file = join(plans, all.at(-1));
  }
  const text = file ? read(file) : null;
  if (!text) return { file: null, head: [], row: null, columns: null };
  const lines = text.split('\n');
  const head = lines.filter((l) => /^(core|длина|опоры|финалы|граница|бюджет):/.test(l.trim()) || /^#\s/.test(l));
  const header = lines.find((l) => /^\|\s*гл\.?\s*\|/.test(l));
  const columns = header ? header.split('|').slice(1, -1).map((s) => s.trim()) : null;
  const row = lines.find((l) => {
    const cell = l.match(/^\|\s*([^|]+?)\s*\|/)?.[1];
    return cell && new RegExp(`^(гл\\.?\\s*)?${chapter}\\b`).test(cell);
  });
  return { file: file.replace(ROOT, ''), head, columns, row: row ? row.split('|').slice(1, -1).map((s) => s.trim()) : null };
}

function skeletonOf(dir, chapter, read) {
  for (const f of ['plans/skeleton.ink', 'skeleton.ink']) {
    const text = read(join(dir, f));
    if (!text) continue;
    let tree;
    try { tree = parseInk(text); } catch { return { file: join('docs/stories', dirName(dir), f), knots: [], error: 'скелет не разбирается' }; }
    const lines = text.split('\n');
    const knots = tree.knots.filter((k) => k.chapter === chapter);
    const body = knots.map((k) => {
      const next = tree.knots.find((x) => x.line > k.line);
      return { id: k.id, text: lines.slice(k.line - 1, next ? next.line - 1 : lines.length).join('\n').trim() };
    });
    return { file: join('docs/stories', dirName(dir), f), knots: body };
  }
  return null;
}
const dirName = (d) => d.split('/').filter(Boolean).at(-1);

/** Концы главы N−1 по путям: видимый хвост и VAR на стыке. */
function tails(p, chapter, runs, partial) {
  const K = T.value('skill.chapter.tail_msgs');
  const named = ['first', 'last', 'silent', 'unresponsive', 'curious', 'suspicious', 'trusting', 'refuse', 'distracted'].filter((x) => PERSONA_IDS.includes(x));
  const plan = [...named.map((persona) => ({ persona, seed: 1 }))];
  for (let s = 1; plan.length < runs; s++) plan.push({ persona: 'random', seed: s });
  const groups = new Map();
  const early = new Map();
  const states = [];
  for (const { persona, seed } of plan.slice(0, Math.max(runs, named.length))) {
    const r = runOnce(p, { persona, seed, partial });
    const items = r.timeline.items;
    const cut = items.findIndex((i) => i.chapter >= chapter && i.type !== 'var');
    const before = cut < 0 ? items : items.slice(0, cut);
    const lastCh = Math.max(0, ...before.filter((i) => i.chapter).map((i) => i.chapter));
    if (lastCh < chapter - 1) {
      const why = r.ending?.name ?? '—';
      early.set(why, (early.get(why) ?? 0) + 1);
      continue;
    }
    const shown = before.filter((i) => ['line', 'choice', 'remind', 'stall'].includes(i.type) && i.chapter === chapter - 1);
    const tail = shown.slice(-K);
    const text = visibleText(tail, 'realtime');
    const vars = {};
    for (const i of before) if (i.type === 'var') vars[i.name] = i.value;
    const changed = { ...r.initial, ...vars };
    states.push(changed);
    const reached = cut >= 0 ? 'глава началась' : r.ending?.kind === 'partial' ? BETA_STOP : r.ending?.name ?? 'конец';
    const g = groups.get(text) ?? { text, runs: 0, personas: new Set(), vars: new Map(), reached: new Set(), route: r.route };
    g.runs++;
    g.personas.add(persona === 'random' ? `random#${seed}` : persona);
    g.reached.add(reached);
    for (const [k, v] of Object.entries(changed)) {
      if (!g.vars.has(k)) g.vars.set(k, new Set());
      g.vars.get(k).add(JSON.stringify(v));
    }
    groups.set(text, g);
  }
  // одинаковое на всех путях — одной строкой; у пути — только то, чем он отличается от других
  const keys = [...new Set(states.flatMap((s) => Object.keys(s)))];
  const common = Object.fromEntries(keys.filter((k) => states.every((s) => JSON.stringify(s[k]) === JSON.stringify(states[0][k]))).map((k) => [k, states[0][k]]));
  const list = [...groups.values()].sort((a, b) => b.runs - a.runs).map((g) => ({
    runs: g.runs, personas: [...g.personas], reached: [...g.reached], route: g.route, text: g.text,
    vars: Object.fromEntries([...g.vars].filter(([k]) => !(k in common)).map(([k, s]) => [k, [...s].map((x) => JSON.parse(x))])),
  }));
  return { total: plan.length, groups: list, common, early: Object.fromEntries(early) };
}

function styleShort(text) {
  if (!text) return null;
  const m = text.match(/^## 1\. Короткая версия\n([\s\S]*?)\n---/m);
  return m ? m[1].trim() : null;
}

function format(c) {
  const L = [];
  const sec = (t) => L.push('', `## ${t}`, '');
  L.push(`# Пакет главы ${c.chapter} · ${c.story}`, '');
  L.push(`файл главы: src/stories/${c.story}/${c.chapter_file} — ${c.chapter_exists ? 'есть (правка)' : 'нет (новая глава)'}; главы в ink: ${c.chapters_written.join(', ') || '—'}`);
  L.push(`шаг: ${c.status?.step ?? 'нет STATUS.md'} · ядро: ${c.status?.core ?? '—'} · план: ${c.status?.plan ?? '—'}${c.partial ? ` · часть истории: есть ${BETA_STOP}` : ''}`);

  sec('1. Факты (facts.md) — первыми');
  L.push(c.facts ? c.facts.trim() : `нет данных: docs/stories/${c.story}/facts.md нет. Черновик — story-continuity (facts.mjs --draft); заводит файл story-desk после одобрения. Пока его нет, все имена, время и числа бери только из уже написанного ink и выпиши их списком перед текстом главы.`);

  sec('2. Шапка');
  L.push(`title: ${c.header.title ?? '—'}`);
  for (const k of ['логлайн', 'вопрос', 'ставка', 'оси']) L.push(`${k}: ${c.header.head?.[k] ?? 'нет данных (нет строки // ' + k + ':)'}`);
  L.push(`контакты: ${c.header.contacts.map((x) => `${x.id} (${x.name})`).join(', ') || '—'}`);

  sec(`3. План главы ${c.chapter}`);
  if (!c.plan.file) L.push('нет данных: plans/plan-vN.md нет — глава без плана пишется только по просьбе автора; сначала story-plan.');
  else {
    L.push(`файл: ${c.plan.file}`, ...c.plan.head);
    if (c.plan.row && c.plan.columns) c.plan.columns.forEach((col, i) => L.push(`- ${col}: ${c.plan.row[i] ?? '—'}`));
    else L.push(`строки главы ${c.chapter} в таблице плана нет — прочитай план целиком.`);
  }
  if (c.skeleton) {
    L.push('', `скелет: ${c.skeleton.file}${c.skeleton.error ? ` — ${c.skeleton.error}` : ''}`);
    if (c.skeleton.knots.length) for (const k of c.skeleton.knots) L.push('```ink', k.text, '```');
    else if (!c.skeleton.error) L.push(`узлов главы ${c.chapter} в скелете нет.`);
  } else L.push('', 'скелета (plans/skeleton.ink) нет.');

  sec('4. Карточки (служебные поля: на экран не идут)');
  for (const ch of c.characters) {
    L.push(`- ${ch.id ?? '(игрок)'} · ${ch.name}${ch.role ? ` · ${ch.role}` : ''}`);
    if (ch.voice) L.push(`  голос: ${typeof ch.voice === 'string' ? ch.voice : JSON.stringify(ch.voice)}`);
    if (ch.arc) L.push(`  дуга в главе ${c.chapter}: ${typeof ch.arc === 'string' ? ch.arc : JSON.stringify(ch.arc)}`);
  }
  if (!c.characters.some((x) => x.voice)) L.push('нет данных: у контактов нет поля voice — голос бери из docs/style.md §5 и прошлых глав; карточку предложи story-voice.');

  sec(`5. Стык: концы главы ${c.chapter - 1} по путям`);
  if (!c.tails) L.push('глава 1: прошлой главы нет. Первая минута — по story-opening (эталон до текста).');
  else {
    const max = T.value('skill.chapter.tail_paths_max');
    L.push(`прогонов ${c.tails.total}, разных концов ${c.tails.groups.length}${Object.keys(c.tails.early).length ? `; кончились раньше главы ${c.chapter - 1}: ${Object.entries(c.tails.early).map(([k, v]) => `${k} ×${v}`).join(', ')}` : ''}`);
    L.push(`VAR одинаковы на всех путях: ${Object.entries(c.tails.common).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(', ') || '—'}`);
    c.tails.groups.slice(0, max).forEach((g, i) => {
      L.push('', `### путь ${i + 1} · прогонов ${g.runs} · ${g.personas.slice(0, 4).join(', ')}${g.personas.length > 4 ? '…' : ''} · дальше: ${g.reached.join(', ')}`);
      L.push(`VAR, которыми путь отличается: ${Object.entries(g.vars).map(([k, v]) => `${k}=${v.join('|')}`).join(', ') || 'без изменений'}`);
      L.push(`повторить: npm run story:trace -- --story ${c.story} --route ${g.route.join(',')} --until ch${c.chapter}`);
      L.push('```', g.text, '```');
    });
    if (c.tails.groups.length > max) L.push(`… и ещё ${c.tails.groups.length - max} концов (--json)`);
  }

  sec('6. Стиль: docs/style.md §1 (короткая версия)');
  L.push(c.style ?? 'нет данных: docs/style.md §1 не найден.');
  L.push('', 'Образцы и антиобразцы по теме: node ${CLAUDE_SKILL_DIR}/scripts/style-sample.mjs --topic <тема>');
  return L.join('\n');
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  try {
    const id = opt('--story');
    const chapter = Number(opt('--chapter'));
    if (!id || !Number.isInteger(chapter) || chapter < 1) throw new Error('нужны --story <id> и --chapter N (см. --help)');
    const runs = opt('--runs') ? Number(opt('--runs')) : undefined;
    const c = chapterContext(id, chapter, { plan: opt('--plan'), ...(runs ? { runs } : {}) });
    const text = args.includes('--json') ? JSON.stringify(c, null, 2) : format(c);
    if (opt('--out')) { writeFileSync(opt('--out'), text + '\n'); console.log(`пакет главы ${chapter} → ${opt('--out')}`); }
    else console.log(text);
  } catch (e) {
    console.error(`chapter-context: ${e.message}`);
    process.exit(1);
  }
}
