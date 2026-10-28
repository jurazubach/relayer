// directions — раунды направлений story-brainstorm (план §2, шаг 1): шаблон и проверка.
// Модель склонна выдавать перефразировки одной идеи (flow-review.md §A, шаг 1), поэтому различие считается
// по меткам семи осей, а не на глаз; трейлер компилируется и считается движком, а не читается моделью.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { compile } from '../../../../scripts/lib/compile.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';
import { returnDeadline } from '../../../../scripts/lib/lexicon.mjs';
import { runCli, table } from '../../../../scripts/story/core/cli.mjs';

export const STATE_DIR = 'docs/stories';
export const FILE = 'directions.md';

/** Семь осей различия (build-plan.md §2, flow-review.md §A шаг 1) и как их называет автор. */
export const AXES = [
  { key: 'role', name: 'роль игрока', alias: ['роль игрока', 'роль', 'кто игрок', 'игрок'] },
  { key: 'hero', name: 'герой', alias: ['герой', 'кто герой'] },
  { key: 'rule', name: 'ядро-правило', alias: ['ядро-правило', 'ядро', 'правило', 'правило мира'] },
  { key: 'stake', name: 'ставка', alias: ['ставка', 'тип ставки'] },
  { key: 'opponent', name: 'противник', alias: ['противник', 'антагонист'] },
  { key: 'structure', name: 'структура', alias: ['структура', 'форма'] },
  { key: 'genre', name: 'жанр', alias: ['жанр', 'жанровое обещание', 'обещание'] },
];
const FIELDS = { логлайн: 'logline', 'что трудно': 'hard', статус: 'status', 'не то': 'notThis', режим: 'mode', контакты: 'contacts' };

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/directions.mjs --story <id> [--round N] [--axes] [--json]
node \${CLAUDE_SKILL_DIR}/scripts/directions.mjs --file <путь.md> [--round N] [--json]
node \${CLAUDE_SKILL_DIR}/scripts/directions.mjs --exclude --story <id> [--json]
node \${CLAUDE_SKILL_DIR}/scripts/directions.mjs --template [--idea "<сырая идея>"] [--round N]

Раунды направлений лежат в ${STATE_DIR}/<id>/${FILE} (формат — references/directions-format.md):

  ## Раунд N · дата · идея: …          (- режим: первый | ещё | далеко; - не то: оси, которые автор отверг)
  ### A · название
  - роль игрока: <метка> — пояснение   (семь осей: ${AXES.map((a) => a.name).join(', ')})
  - логлайн: …  - что трудно: …  - статус: показано | выбрано | отвергнуто: причина
  \`\`\`ink   трейлер: сообщения до первой кнопки и сама кнопка   \`\`\`

Проверка последнего раунда (или --round N):
  · направлений skill.brainstorm.directions.count; у каждого семь осей, логлайн, «что трудно», трейлер;
  · любые два расходятся не меньше чем по skill.brainstorm.directions.axes_min_diff осям: метка оси —
    текст до « — »; метки с долей общих основ skill.brainstorm.axes.same_overlap — одно значение;
  · направление прошлых раундов (показанное или отвергнутое) не повторяется в новом раунде так же близко;
  · режим «далеко» (Б-4): каждое новое отличается от всех прошлых по каждой оси из «не то»;
  · трейлер компилируется, до первой кнопки skill.brainstorm.trailer.messages сообщений, кнопок ≥ 2,
    теги только ready из docs/capabilities.json, имена собственные — среди контактов (R-117),
    без срока паузы (A-01, dict.return_deadline).

  --axes       первый проход: только число, оси и различие (без логлайна, «что трудно» и трейлера)
  --exclude    что уже показано и отвергнуто по осям: список для режима «ещё» и Б-4
  --template   пустой раунд по формату (печатает, ничего не пишет)
  --json       то же в JSON

Код выхода 1 — есть ошибки (перефразировка, нет оси, трейлер не компилируется), 2 — нет файла или раунда.`;

const norm = (s) => String(s ?? '').toLowerCase().replace(/ё/g, 'е');
/** Основы слов метки: русская морфология без словаря — по началу слова, как в story:coverage. */
export const stems = (s) => [...new Set((norm(s).match(/[\p{L}\p{N}]+/gu) ?? []).filter((w) => w.length > 2).map((w) => (w.length > 6 ? w.slice(0, 6) : w.slice(0, Math.max(3, w.length - 1)))))];
const axisOf = (name) => AXES.find((a) => a.alias.includes(norm(name).trim()));

/** Разбор directions.md: раунды → направления с осями, полями и трейлером. */
export function parseRounds(text) {
  const rounds = [];
  let round = null;
  let dir = null;
  let fence = null;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (fence) {
      if (/^\s*```\s*$/.test(l)) { if (dir && fence.ink) dir.trailer = fence.body.join('\n'); fence = null; } else fence.body.push(l);
      continue;
    }
    const f = l.match(/^\s*```\s*([\w-]*)/);
    if (f) { fence = { ink: f[1] === 'ink', body: [] }; continue; }
    const r = l.match(/^##\s+Раунд\s+(\d+)\s*(?:·\s*(.*))?$/i);
    if (r) {
      const rest = (r[2] ?? '').split(/\s+·\s+/);
      const date = /^\d{4}-\d{2}-\d{2}$/.test(rest[0]) ? rest.shift() : null;
      round = { n: Number(r[1]), date, idea: rest.join(' · ').replace(/^идея:\s*/i, '') || null, mode: 'первый', notThis: [], directions: [], line: i + 1 };
      rounds.push(round);
      dir = null;
      continue;
    }
    const d = l.match(/^###\s+([A-ZА-Я]\d?)\s*·\s*(.+)$/);
    if (d && round) {
      dir = { id: d[1], title: d[2].trim(), axes: {}, labels: {}, logline: null, hard: null, status: 'показано', contacts: [], trailer: null, line: i + 1 };
      round.directions.push(dir);
      continue;
    }
    if (/^#{1,3}\s/.test(l)) { dir = null; continue; }
    const m = l.match(/^\s*[-*]\s+([^:]{2,30}):\s*(.*)$/);
    if (!m || !round) continue;
    const key = norm(m[1]).trim();
    const val = m[2].trim();
    const axis = axisOf(key);
    if (dir && axis) {
      dir.axes[axis.key] = val;
      dir.labels[axis.key] = val.split(/\s+—\s+/)[0].trim();
      continue;
    }
    const field = FIELDS[key];
    if (!field) continue;
    if (field === 'notThis' || field === 'mode') {
      if (field === 'mode') round.mode = norm(val).trim() || 'первый';
      else round.notThis = val.split(/[,;]\s*/).map((x) => axisOf(x)?.key).filter(Boolean);
    } else if (dir) dir[field] = field === 'contacts' ? val.split(/[,;]\s*/).map((x) => x.trim()).filter(Boolean) : val;
  }
  return rounds;
}

/** Одно ли значение у двух меток оси: доля общих основ от меньшей метки. */
export function sameLabel(a, b, overlap) {
  const x = stems(a);
  const y = stems(b);
  if (!x.length || !y.length) return norm(a).trim() === norm(b).trim();
  const common = x.filter((s) => y.includes(s)).length;
  return common / Math.min(x.length, y.length) >= overlap;
}

/** По каким осям два направления расходятся; ось без метки у кого-то из двух — не различие. */
export function axesDiff(a, b, overlap) {
  return AXES.filter((ax) => a.labels[ax.key] && b.labels[ax.key] && !sameLabel(a.labels[ax.key], b.labels[ax.key], overlap)).map((ax) => ax.key);
}

/** Трейлер: компиляция, сообщения до первой кнопки, кнопки, теги и имена. */
export function checkTrailer(src, { readyTags, partialTags }) {
  const out = { ok: false, errors: [], warnings: [], messages: 0, choices: 0, tags: [] };
  const built = compile(src);
  if (!built.ok) {
    out.errors.push(`трейлер не компилируется: ${built.errors[0]?.message ?? 'ошибка inkjs'}`);
    return out;
  }
  const story = built.newStory();
  const lines = [];
  try {
    while (story.canContinue) {
      const t = story.Continue().trim();
      if (t) lines.push(t);
    }
  } catch (e) {
    out.errors.push(`трейлер падает при прогоне: ${e.message}`);
    return out;
  }
  out.messages = lines.length;
  // A-01: персонаж не называет срок паузы — тот же словарь, что у story:lint
  for (const l of lines) if (returnDeadline(l)) out.errors.push(`срок паузы в трейлере (A-01, dict.return_deadline): «${l.slice(0, 40)}»`);
  out.choices = story.currentChoices.length;
  out.tags = [...new Set([...src.matchAll(/#\s*([a-z]+)\b/g)].map((m) => m[1]))];
  for (const t of out.tags) {
    if (partialTags.has(t)) out.warnings.push(`тег #${t} — partial: сюжет на нём не держится (R-118)`);
    else if (!readyTags.has(t)) out.errors.push(`тег #${t} не ready в docs/capabilities.json`);
  }
  // R-117: имя собственное в середине фразы — контакт или вымышленное место; остальное — на ручную проверку
  const contacts = [...src.matchAll(/^#\s*contact:\s*[^,]+,\s*([^,]+)/gm)].map((m) => stems(m[1])).flat();
  const names = new Set();
  for (const raw of src.split('\n')) {
    if (/^\s*(#|\/\/|VAR|===|->|\*|-\s*->)/.test(raw)) continue;
    const text = raw.replace(/#.*$/, '').replace(/^[^:]{1,30}:\s/, '');
    for (const m of text.matchAll(/(?<=[\p{L}\p{N},]\s+)([A-ZА-ЯЁ][\p{L}-]{2,})/gu)) if (!stems(m[1]).some((s) => contacts.includes(s))) names.add(m[1]);
  }
  if (names.size) out.warnings.push(`имена собственные не из контактов: ${[...names].join(', ')} — вымышлены ли они (R-117, fiction.md)`);
  out.ok = !out.errors.length;
  return out;
}

export function capTags(path = 'docs/capabilities.json') {
  const caps = JSON.parse(readFileSync(path, 'utf8'));
  const readyTags = new Set(caps.features.filter((f) => f.tag && f.status === 'ready').map((f) => f.tag));
  const partialTags = new Set(caps.features.filter((f) => f.tag && f.status === 'partial').map((f) => f.tag));
  return { readyTags, partialTags };
}

/** Проверка раунда: число, оси, попарное различие, повторы прошлых раундов, «далеко», трейлеры. */
export function checkRound(rounds, n, T = thresholds(), caps = capTags(), { axesOnly = false } = {}) {
  const round = n ? rounds.find((r) => r.n === n) : rounds.at(-1);
  if (!round) return null;
  const earlier = rounds.filter((r) => r.n < round.n).flatMap((r) => r.directions.map((d) => ({ ...d, round: r.n })));
  const { min, max } = T.value('skill.brainstorm.directions.count');
  const need = T.value('skill.brainstorm.directions.axes_min_diff');
  const overlap = T.value('skill.brainstorm.axes.same_overlap');
  const msgs = T.value('skill.brainstorm.trailer.messages');
  const errors = [];
  const warnings = [];
  const ds = round.directions;
  const farMode = /далек|далёк|б-4/.test(round.mode);
  if (farMode) {
    const far = T.value('skill.brainstorm.directions.far_count');
    if (ds.length !== far) warnings.push(`режим «далеко» (Б-4): направлений ${ds.length}, а нужно ${far} (skill.brainstorm.directions.far_count)`);
  } else if (ds.length < min || ds.length > max) warnings.push(`направлений ${ds.length}, нужно ${min}–${max} (skill.brainstorm.directions.count)`);
  const pairs = [];
  for (let i = 0; i < ds.length; i++) {
    for (let j = i + 1; j < ds.length; j++) {
      const diff = axesDiff(ds[i], ds[j], overlap);
      pairs.push({ a: ds[i].id, b: ds[j].id, diff: diff.length, same: AXES.filter((x) => !diff.includes(x.key)).map((x) => x.name) });
      if (diff.length < need) errors.push(`${ds[i].id} и ${ds[j].id} расходятся по ${diff.length} осям из ${AXES.length} (нужно ≥ ${need}, skill.brainstorm.directions.axes_min_diff): одно и то же — ${AXES.filter((x) => !diff.includes(x.key)).map((x) => x.name).join(', ')}`);
    }
  }
  const repeats = [];
  for (const d of ds) {
    for (const e of earlier) {
      const diff = axesDiff(d, e, overlap);
      if (diff.length < need) {
        repeats.push({ id: d.id, round: e.round, of: e.id, diff: diff.length });
        errors.push(`${d.id} повторяет ${e.id} из раунда ${e.round} (${/отверг/.test(e.status) ? 'отвергнуто' : 'показано'}): расходятся по ${diff.length} осям`);
      }
      if (farMode) {
        const missed = round.notThis.filter((k) => d.labels[k] && e.labels[k] && sameLabel(d.labels[k], e.labels[k], overlap));
        if (missed.length) errors.push(`${d.id} не далеко от ${e.id} (раунд ${e.round}): по отвергнутым осям то же — ${missed.map((k) => AXES.find((a) => a.key === k).name).join(', ')}`);
      }
    }
  }
  const items = ds.map((d) => {
    const missing = AXES.filter((a) => !d.axes[a.key]).map((a) => a.name);
    if (missing.length) errors.push(`${d.id}: нет осей — ${missing.join(', ')}`);
    if (axesOnly) return { id: d.id, title: d.title, labels: d.labels, status: d.status, missing, trailer: null };
    if (!d.logline) errors.push(`${d.id}: нет логлайна (premise-check.mjs)`);
    if (!d.hard) warnings.push(`${d.id}: нет «что трудно» — автору не видно цены направления`);
    let trailer = null;
    if (!d.trailer) errors.push(`${d.id}: нет трейлера (блок ink)`);
    else {
      trailer = checkTrailer(d.trailer, caps);
      for (const e of trailer.errors) errors.push(`${d.id}: ${e}`);
      for (const w of trailer.warnings) warnings.push(`${d.id}: ${w}`);
      if (trailer.ok && trailer.messages !== msgs) warnings.push(`${d.id}: в трейлере ${trailer.messages} сообщений до первой кнопки, нужно ${msgs} (skill.brainstorm.trailer.messages)`);
      if (trailer.ok && trailer.choices < 2) errors.push(`${d.id}: в трейлере ${trailer.choices} кнопок — нужна первая развилка`);
    }
    return { id: d.id, title: d.title, labels: d.labels, status: d.status, missing, trailer: trailer && { messages: trailer.messages, choices: trailer.choices, ok: trailer.ok } };
  });
  return { round: round.n, mode: round.mode, axes_only: axesOnly, idea: round.idea, directions: items, pairs, repeats, errors, warnings, ok: !errors.length };
}

/** Показанное и отвергнутое по осям: что исключить в режиме «ещё» и в Б-4. */
export function excluded(rounds) {
  const byAxis = Object.fromEntries(AXES.map((a) => [a.key, []]));
  for (const r of rounds) for (const d of r.directions) for (const a of AXES) {
    const label = d.labels[a.key];
    if (label) byAxis[a.key].push({ label, round: r.n, id: d.id, rejected: /отверг/.test(norm(d.status)) });
  }
  const notThis = [...new Set(rounds.flatMap((r) => r.notThis))];
  return { rounds: rounds.length, directions: rounds.reduce((s, r) => s + r.directions.length, 0), notThis, byAxis };
}

export function template(idea = '<сырая идея словами автора>', n = 1) {
  const block = (id) => [`### ${id} · <название в 2–4 слова>`, '',
    ...AXES.map((a) => `- ${a.name}: <метка 1–4 слова> — <пояснение>`),
    '- логлайн: ты — <кто>, тебе пишет <кто>, но <ирония>', '- что трудно: <что это значит для автора: сколько узлов, какие улики, какой риск>',
    '- статус: показано', '', '```ink', '# contact: x, <Имя>, teal', '<сообщение 1> #from:x', '<сообщение 2>', '<сообщение 3>', '<сообщение 4>', '<сообщение 5>',
    '* [<ответ 1> #to:x]', '    -> END', '* [<ответ 2> #to:x]', '    -> END', '```', ''].join('\n');
  return [`## Раунд ${n} · ${new Date().toISOString().slice(0, 10)} · идея: ${idea}`, '', '- режим: первый', '', block('A'), block('B'), block('C')].join('\n');
}

export function readRounds(args) {
  const file = args.get('file') ?? (args.get('story') ? join(STATE_DIR, args.get('story'), FILE) : null);
  if (!file || file === true) throw new Error('нужно --story <id> или --file <путь.md>');
  if (!existsSync(file)) return { file, rounds: null };
  return { file, rounds: parseRounds(readFileSync(file, 'utf8')) };
}

async function main(args) {
  const json = args.has('json');
  if (args.has('template')) {
    console.log(template(args.get('idea') ?? undefined, Number(args.get('round') ?? 1)));
    return 0;
  }
  const { file, rounds } = readRounds(args);
  if (!rounds) {
    console.log(json ? JSON.stringify({ file, error: 'нет файла' }) : `нет данных: ${file} не найден — раундов ещё не было (шаблон: --template)`);
    return 2;
  }
  if (args.has('exclude')) {
    const ex = excluded(rounds);
    if (json) { console.log(JSON.stringify({ file, ...ex }, null, 1)); return 0; }
    console.log(`${file}: раундов ${ex.rounds}, направлений ${ex.directions}${ex.notThis.length ? `; автор отверг оси: ${ex.notThis.map((k) => AXES.find((a) => a.key === k).name).join(', ')}` : ''}\n`);
    for (const a of AXES) {
      const xs = ex.byAxis[a.key];
      console.log(`${a.name}: ${xs.length ? xs.map((x) => `${x.label} (${x.round}${x.id}${x.rejected ? ', отвергнуто' : ''})`).join('; ') : '—'}`);
    }
    return 0;
  }
  const res = checkRound(rounds, args.get('round') ? Number(args.get('round')) : null, undefined, undefined, { axesOnly: args.has('axes') });
  if (!res) {
    console.log(json ? JSON.stringify({ file, error: 'нет раунда' }) : `нет данных: в ${file} нет раунда ${args.get('round') ?? ''}`);
    return 2;
  }
  if (json) { console.log(JSON.stringify({ file, ...res }, null, 1)); return res.ok ? 0 : 1; }
  console.log(`${file} · раунд ${res.round} (${res.mode})${res.idea ? ` · ${res.idea}` : ''}\n`);
  console.log(table(res.directions.map((d) => [d.id, d.title.slice(0, 28), ...AXES.map((a) => (d.labels[a.key] ?? '—').slice(0, 18)), d.trailer ? `${d.trailer.messages}/${d.trailer.choices}` : '—']),
    ['', 'название', ...AXES.map((a) => a.name), 'трейлер']));
  if (res.pairs.length) console.log(`\nрасхождение пар (осей из ${AXES.length}): ${res.pairs.map((p) => `${p.a}–${p.b} ${p.diff}`).join(', ')}`);
  for (const w of res.warnings) console.log(`⚠ ${w}`);
  for (const e of res.errors) console.log(`✗ ${e}`);
  console.log(res.ok ? '✓ раунд проходит' : `✗ ошибок: ${res.errors.length}`);
  return res.ok ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) runCli(HELP, main, { bool: ['template', 'exclude', 'axes'] });
