// Поиск по базе знаний: строки матрицы story:coverage (30 разборов, свод, attention-merged) с владельцем,
// уровнем покрытия и статусом. Матрица та же, что у `npm run story:coverage`, поэтому владельцы, уровни и счёт
// строк совпадают с ней; текст правила R/C/A — у `npm run story:rule`, здесь только ссылка.
import { buildMatrix } from '../../../../scripts/kb/coverage.mjs';
import { plain } from '../../../../scripts/kb/kb-rows.mjs';
import { loadThresholds } from '../../../../scripts/lib/thresholds.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/kb-search.mjs <запрос> [--kind P,PAT,…] [--alias <алиас>] [--owner <скилл>]
                                                      [--full] [--limit N] [--json]

Поиск по базе (скилл story-kb). Запрос:
  алиас:ID      строка базы: nicklin:PAT-08, meaningful-choice:P-06, serial-hooks:P-13#нюанс — текст, владелец,
                уровень, статус (отменено A-NN), нюансы, соседи по кластеру, противоречия, которые на неё ссылаются
  R-NN C-NN F-NN LOCAL-NN #attn-…   строка свода: владелец и уровень; текст — npm run story:rule <ID>
  TH-NN         тема из owners.md: владелец, файл, строки темы по разборам
  алиас         разбор целиком: строки по видам и по владельцам (короткий алиас тоже: nicklin, serial)
  слова         полнотекстовый поиск: строки, где есть все слова (по основе), сначала заголовки

Колонки ответа: ID · вид · заголовок, затем владелец → reference, уровень L0–L3, статус, источник файл:строка.
Уровень и статус — из story:coverage: L3 — исполняемо (проверка, развилка, пример, мутант), superseded:A-NN —
отменено решением автора (docs/playbook/superseded.md), partial — в силе только часть.

  --kind     только виды через запятую: P, PAT, GREEN, RED, LESSON, SYS, nuance, contra, attention, R, C, F, attn, LOCAL
  --alias    только один разбор
  --owner    только строки, которыми владеет скилл
  --full     полный текст строки (по умолчанию — суть в одну строку)
  --limit N  сколько строк показать (по умолчанию skill.kb.search.limit)
  --json     всё данными
  --help     эта справка`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h') || !args.filter((a) => !a.startsWith('--')).length) {
  console.log(HELP);
  process.exit(args.includes('--help') || args.includes('-h') ? 0 : 1);
}
const VALUE_FLAGS = ['--kind', '--alias', '--owner', '--limit'];
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const query = args.filter((a, i) => !a.startsWith('--') && !VALUE_FLAGS.includes(args[i - 1])).join(' ').trim();
const full = args.includes('--full');
const asJson = args.includes('--json');
const limit = Number(opt('--limit') ?? loadThresholds().value('skill.kb.search.limit'));

let res;
try {
  res = buildMatrix({});
} catch (e) {
  console.error(`нет данных: матрица story:coverage не собралась (${e.message})`);
  process.exit(2);
}
const { matrix, kb } = res;
const byId = new Map(matrix.map((r) => [r.id, r]));
const textOf = new Map(kb.rows.map((r) => [r.id, r]));

let rows = matrix;
const kinds = opt('--kind')?.split(',').map((s) => s.trim()).filter(Boolean);
if (kinds) rows = rows.filter((r) => kinds.includes(r.kind));
const aliasOpt = opt('--alias') ? kb.resolveAlias(opt('--alias')) ?? opt('--alias') : null;
if (aliasOpt) rows = rows.filter((r) => r.alias === aliasOpt);
if (opt('--owner')) rows = rows.filter((r) => r.owner_skill === opt('--owner'));

// Основа слова: русские окончания короткие, поэтому хватает обрезки — так же ищет story:coverage свои термины.
const stem = (w) => w.toLowerCase().replace(/ё/g, 'е').slice(0, Math.max(4, Math.min(6, w.length - 2)));
const norm = (s) => String(s ?? '').toLowerCase().replace(/ё/g, 'е');
const gist = (r) => plain(textOf.get(r.id)?.gist ?? textOf.get(r.id)?.text ?? '').replace(/\s+/g, ' ').trim();
const status = (r) => [r.status !== 'used' ? r.status : null, r.partial ? `в силе частично (${r.partial})` : null].filter(Boolean).join(', ') || 'used';

function rowView(r) {
  const src = textOf.get(r.id);
  return {
    id: r.id, kind: r.kind, title: r.title, owner: r.owner_skill, target: r.target, level: r.level,
    status: r.status, partial: r.partial ?? null, source: r.source,
    text: full ? plain(src?.text ?? '').trim() : clip(gist(r), 240),
  };
}
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function detail(r) {
  const nuances = matrix.filter((x) => x.kind === 'nuance' && x.id.startsWith(`${r.id}#`));
  const cluster = r.cluster && r.cluster !== r.id ? matrix.filter((x) => x.cluster === r.cluster && x.id !== r.id) : [];
  // Противоречие ссылается на строку полным ID или, внутри своего разбора, голым («PAT-08»).
  const short = r.alias ? r.id.slice(r.alias.length + 1) : r.id;
  const bare = new RegExp(`(?<![\\w-])${short.replace(/[#.]/g, '\\$&')}(?![\\w-])`);
  const contras = matrix.filter((x) => {
    if (x.kind !== 'contra' || x.id === r.id) return false;
    const t = textOf.get(x.id)?.text ?? '';
    return t.includes(r.id) || ((x.alias === r.alias || !r.alias) && bare.test(t));
  });
  return { row: rowView(r), nuances: nuances.map(rowView), cluster: cluster.map((x) => ({ id: x.id, title: x.title, owner: x.owner_skill })), contradictions: contras.map((x) => ({ id: x.id, title: x.title, owner: x.owner_skill, target: x.target })) };
}

function themeView(th) {
  const unit = kb.units.get(th);
  if (!unit) return null;
  const inTheme = rows.filter((r) => r.th === th);
  const byAlias = {};
  for (const r of inTheme) byAlias[r.alias ?? 'свод'] = (byAlias[r.alias ?? 'свод'] ?? 0) + 1;
  return { th, topic: unit.topic, owner: unit.owner, file: unit.file, refs: unit.refs ?? null, rows: inTheme.length, by_alias: byAlias, list: inTheme.slice(0, limit).map(rowView) };
}

function aliasView(alias) {
  const own = rows.filter((r) => r.alias === alias);
  const count = (key) => own.reduce((m, r) => ((m[r[key] ?? '—'] = (m[r[key] ?? '—'] ?? 0) + 1), m), {});
  return { alias, rows: own.length, by_kind: count('kind'), by_owner: count('owner_skill'), by_level: count('level'), superseded: own.filter((r) => r.status.startsWith('superseded') || r.partial).map((r) => r.id) };
}

function wordSearch(q) {
  const words = q.split(/[\s,.;:!?«»"()]+/).filter((w) => w.length >= 3).map(stem);
  if (!words.length) return [];
  const scored = [];
  for (const r of rows) {
    const title = norm(r.title);
    const body = norm(textOf.get(r.id)?.text ?? '');
    if (!words.every((w) => title.includes(w) || body.includes(w))) continue;
    scored.push({ r, score: words.filter((w) => title.includes(w)).length * 10 + (r.kind === 'P' || r.kind === 'PAT' ? 2 : 0) + (r.level === 'L3' ? 1 : 0) });
  }
  return scored.sort((a, b) => b.score - a.score).map((x) => x.r);
}

// Запрос с коротким алиасом («nicklin:PAT-08») приводим к полному.
function resolveId(q) {
  const m = q.match(/^([a-z][a-z0-9-]*):(.+)$/);
  if (!m) return q;
  const alias = kb.resolveAlias(m[1]);
  return alias ? `${alias}:${m[2]}` : q;
}

const id = resolveId(query);
let out;
if (byId.has(id)) out = { mode: 'id', query, ...detail(byId.get(id)) };
else if (/^(R|C|F|LOCAL)-\d+$/.test(query) || /^#attn-/.test(query)) out = { mode: 'id', query, row: null, hint: `нет строки ${query} в матрице` };
else if (/^A-\d+$/.test(query)) out = { mode: 'decision', query, hint: `решение автора: npm run story:rule ${query} (реестр — docs/playbook/superseded.md)`, rows: matrix.filter((r) => r.status === `superseded:${query}` || r.partial === query).map(rowView) };
else if (/^TH-\d+$/.test(query)) out = { mode: 'theme', query, theme: themeView(query) };
else if (!query.includes(' ') && kb.resolveAlias(query) && !/:/.test(query)) out = { mode: 'alias', query, ...aliasView(kb.resolveAlias(query)) };
else {
  const found = wordSearch(query);
  out = { mode: 'words', query, total: found.length, rows: found.slice(0, limit).map(rowView) };
}

if (asJson) {
  console.log(JSON.stringify(out, null, 2));
  process.exit(0);
}

const line = (v) => {
  console.log(`${v.id} · ${v.kind} · ${v.title}`);
  console.log(`   владелец: ${v.owner ?? '—'}${v.target ? ` → ${v.target}` : ''} · ${v.level} · ${status(v)}`);
  if (v.text) console.log(`   ${full ? v.text.replace(/\n/g, '\n   ') : v.text}`);
  console.log(`   ${v.source ?? ''}`);
};

if (out.mode === 'id') {
  if (!out.row) {
    console.log(out.hint);
    process.exit(1);
  }
  line(out.row);
  if (/^(R|C|F)-\d+$/.test(out.row.id)) console.log(`   текст: npm run story:rule ${out.row.id}`);
  if (out.nuances.length) { console.log('\nнюансы:'); out.nuances.forEach(line); }
  if (out.cluster.length) console.log(`\nкластер (согласны или пересказывают): ${out.cluster.map((x) => `${x.id} → ${x.owner ?? '—'}`).join('; ')}`);
  if (out.contradictions.length) console.log(`\nпротиворечия со ссылкой на строку: ${out.contradictions.map((x) => `${x.id} «${x.title}» → ${x.target ?? x.owner ?? '—'}`).join('; ')}`);
} else if (out.mode === 'decision') {
  console.log(out.hint);
  console.log(`строк базы, которые задевает ${query}: ${out.rows.length}`);
  out.rows.slice(0, limit).forEach(line);
} else if (out.mode === 'theme') {
  const t = out.theme;
  if (!t) { console.log(`нет темы ${query} в owners.md`); process.exit(1); }
  console.log(`${t.th} · ${t.topic} → ${t.owner}/${t.file}${t.refs ? ` · ссылаются: ${t.refs}` : ''}`);
  console.log(`строк: ${t.rows} · по разборам: ${Object.entries(t.by_alias).sort((a, b) => b[1] - a[1]).map(([a, n]) => `${a} ${n}`).join(', ')}`);
  t.list.forEach(line);
} else if (out.mode === 'alias') {
  const fmt = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ');
  console.log(`${out.alias}: строк ${out.rows}`);
  console.log(`  виды: ${fmt(out.by_kind)}`);
  console.log(`  владельцы: ${fmt(out.by_owner)}`);
  console.log(`  уровни: ${fmt(out.by_level)}`);
  console.log(`  отменено или в силе частично: ${out.superseded.length ? out.superseded.join(', ') : 'нет'}`);
} else {
  console.log(`«${query}»: найдено ${out.total}${out.total > out.rows.length ? `, показаны первые ${out.rows.length} (--limit)` : ''}`);
  out.rows.forEach(line);
  if (!out.total) process.exit(1);
}
