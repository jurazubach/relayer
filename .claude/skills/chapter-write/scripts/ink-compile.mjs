// Компиляция ink до того, как глава ляжет в историю: вся история, отдельный фрагмент или примеры ```ink в .md.
// Фрагмент ещё и проходит бот (доходит ли до конца, все ли узлы видны) и сверку тегов с реестром: тег,
// которого движок не знает, игрок увидит строкой с решёткой (R-118, docs/capabilities.json).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compile, formatMessages } from '../../../../scripts/lib/compile.mjs';
import { play, seeded } from '../../../../scripts/lib/bot.mjs';
import { nodeIds, parseInk, parseTag, splitTags } from '../../../../scripts/lib/ink.mjs';
import { compileInput, loadStory } from '../../../../scripts/lib/story.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/ink-compile.mjs (--story <id> | --file <фрагмент.ink> | --md <файл.md>) [--runs N] [--json]

Компиляция ink для писателя главы (скилл chapter-write, R-118, ink-idioms.md):
  --story <id>   вся история из src/stories (главный файл и главы через INCLUDE): ошибки с файлом и строкой
  --file <путь>  отдельный фрагмент .ink (черновик сцены): ошибки, затем бот bot.runs прогонов —
                 дошёл ли до конца, какие узлы не посещены; теги, которых нет в docs/capabilities.json
                 (или со статусом planned), — предупреждение
  --md <путь>    каждый блок \`\`\`ink в markdown (примеры в references, образцы в плане): номер блока, строка, ошибка
  --runs N       прогонов бота для --file (по умолчанию bot.runs)
  --json         всё данными
  --help         эта справка

Код выхода 1 — есть ошибки компиляции.`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const T = thresholds();

/** Теги реестра: ready и partial — можно; planned и неизвестные — нельзя (R-118). */
function knownTags() {
  const reg = JSON.parse(readFileSync(new URL('../../../../docs/capabilities.json', import.meta.url), 'utf8'));
  const list = Array.isArray(reg) ? reg : reg.features ?? Object.values(reg).flat();
  const ok = new Set(), planned = new Set();
  for (const f of list) {
    if (!f?.tag) continue;
    (f.status === 'planned' ? planned : ok).add(f.tag);
  }
  // теги шапки и ink-разметки не из реестра сообщений
  for (const t of ['title', 'contact']) ok.add(t);
  return { ok, planned };
}

function tagProblems(src) {
  const { ok, planned } = knownTags();
  const out = [];
  src.split('\n').forEach((line, i) => {
    if (/^\s*\/\//.test(line)) return;
    for (const raw of Object.keys(splitTags(line).tags)) {
      // «* [Промолчать #silent]» — скобка кнопки прилипает к последнему тегу
      const key = parseTag(raw).key.replace(/\].*$/, '').trim();
      if (!key || ok.has(key)) continue;
      out.push({ line: i + 1, tag: raw, message: planned.has(key) ? `#${key} — в реестре «planned»: движок его не умеет` : `#${key} — нет в docs/capabilities.json` });
    }
  });
  return out;
}

export function compileStory(id) {
  const story = loadStory(id);
  const r = compile(compileInput(story));
  return { kind: 'story', path: story.path, ok: r.ok, errors: r.errors, warnings: r.warnings };
}

export function compileFragment(path, runs = T.value('bot.runs')) {
  const src = readFileSync(path, 'utf8');
  const r = compile(src);
  const out = { kind: 'file', path, ok: r.ok, errors: r.errors, warnings: r.warnings, tags: tagProblems(src), bot: null };
  if (!r.ok) return out;
  const nodes = nodeIds(parseInk(src));
  const rng = seeded(1);
  let ended = 0;
  const visited = new Set();
  for (let i = 0; i < runs; i++) {
    const res = play(r.json, { rng, nodes, trackVars: false });
    if (res.ended) ended++;
    for (const v of res.visited ?? []) visited.add(v);
  }
  out.bot = { runs, ended, unvisited: nodes.filter((n) => !visited.has(n)) };
  return out;
}

export function compileMarkdown(path) {
  const text = readFileSync(path, 'utf8');
  const blocks = [];
  const re = /^```ink\n([\s\S]*?)^```/gm;
  let m;
  let n = 0;
  while ((m = re.exec(text))) {
    n++;
    const line = text.slice(0, m.index).split('\n').length;
    const r = compile(m[1]);
    blocks.push({ n, line, ok: r.ok, errors: r.errors.map((e) => ({ ...e, line: e.line != null ? line + e.line : null })) });
  }
  return { kind: 'md', path, ok: blocks.every((b) => b.ok), blocks };
}

function format(r) {
  const L = [];
  if (r.kind === 'md') {
    L.push(`${r.ok ? '✓' : '✗'} ${r.path}: блоков ink ${r.blocks.length}, не компилируется ${r.blocks.filter((b) => !b.ok).length}`);
    for (const b of r.blocks.filter((x) => !x.ok)) L.push(`  блок ${b.n} (строка ${b.line}): ${b.errors[0]?.message ?? '?'}${b.errors[0]?.line ? ` — строка ${b.errors[0].line}` : ''}`);
    return L.join('\n');
  }
  L.push(`${r.ok ? '✓' : '✗'} ${r.path}: ${r.ok ? 'компилируется' : `ошибок ${r.errors.length}`}${r.warnings.length ? `, предупреждений ${r.warnings.length}` : ''}`);
  if (r.errors.length) L.push(formatMessages(r.errors));
  if (r.warnings.length) L.push(formatMessages(r.warnings));
  for (const t of r.tags ?? []) L.push(`  ⚠ строка ${t.line}: ${t.message}`);
  if (r.bot) L.push(`  бот: дошли до конца ${r.bot.ended} из ${r.bot.runs}${r.bot.unvisited.length ? `; не посещены: ${r.bot.unvisited.join(', ')}` : ''}`);
  return L.join('\n');
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  try {
    let r;
    if (opt('--story')) r = compileStory(opt('--story'));
    else if (opt('--file')) r = compileFragment(opt('--file'), opt('--runs') ? Number(opt('--runs')) : undefined);
    else if (opt('--md')) r = compileMarkdown(opt('--md'));
    else throw new Error('нужен --story, --file или --md (см. --help)');
    console.log(args.includes('--json') ? JSON.stringify(r, null, 2) : format(r));
    process.exitCode = r.ok ? 0 : 1;
  } catch (e) {
    console.error(`ink-compile: ${e.message}`);
    process.exit(1);
  }
}
