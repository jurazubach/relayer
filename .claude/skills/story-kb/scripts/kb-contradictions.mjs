// Индекс противоречий базы: разделы «Согласия и противоречия» for-relayer.md (строки алиас:contra-N матрицы
// story:coverage) и сводные споры attention-merged.md §8 (#attn-contra). Владелец строки — тот же, что у
// story:coverage: он держит решение в своём contradictions.md, а здесь — указатель «спор → решение → у кого».
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMatrix } from '../../../../scripts/kb/coverage.mjs';
import { plain } from '../../../../scripts/kb/kb-rows.mjs';
import { splitRow } from '../../../../scripts/kb/clean.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/kb-contradictions.mjs [<слова>] [--skill <скилл>] [--alias <алиас>] [--attn]
                                                             [--write] [--check] [--json]

Противоречия базы (скилл story-kb, TH-106): спор → решение → кто держит решение.
  <слова>    только споры, где есть все слова (по основе): «пауза срок», «кнопок хаб»
  --skill    только споры, решение которых держит скилл (владелец из owners.md через story:coverage)
  --alias    только споры из одного разбора
  --attn     только сводные споры по вниманию: attention-merged.md §8 (#attn-contra) с ключами thresholds.json
  --write    пересобрать references/contradictions-index.md
  --check    код 1, если contradictions-index.md устарел
  --json     всё данными
  --help     эта справка

Решение в разборе старше решений автора: если спор задевает срок паузы, ночь игрока, ожидание кнопки, быстрый
режим или разметку ink — сверь с docs/playbook/superseded.md (A-01…A-07); статус строки показан в выводе.`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
const VALUE_FLAGS = ['--skill', '--alias'];
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const words = args.filter((a, i) => !a.startsWith('--') && !VALUE_FLAGS.includes(args[i - 1]));
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../references/contradictions-index.md');
const ROOT = join(HERE, '../../../..');

let res;
try {
  res = buildMatrix({});
} catch (e) {
  console.error(`нет данных: матрица story:coverage не собралась (${e.message})`);
  process.exit(2);
}
const { matrix, kb } = res;
const textOf = new Map(kb.rows.map((r) => [r.id, r.text]));
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

// Решение: после метки «Решение» / «У нас» / «Вывод», иначе последняя ячейка таблицы, иначе весь пункт без заголовка.
function decisionOf(text) {
  const m = text.match(/(?:\*\*|\*|_)?(?:Наше решение|Решение|У нас|Вывод)(?:\*\*|\*|_)?\s*[:.]\s*(?:\*\*|\*|_)?([\s\S]+)/i);
  if (m) return plain(m[1]);
  if (text.startsWith('|')) {
    const cells = splitRow(text).filter((c) => c.trim());
    return plain(cells.at(-1) ?? '');
  }
  return plain(text.replace(/^([-*+]|\d+[.)])\s+/, '').replace(/^\s*(\*\*|\*|_)[^*_]+(\*\*|\*|_)\s*/, ''));
}

// Решения разборов старше решений автора: признаки того, что решение спора опирается на отменённое.
const AUTHOR = [
  ['A-01', /(?:названн\p{L}*|называ\p{L}*|назов\p{L}*|со)\s+срок|срок\p{L}*\s+(?:паузы|возвращ)|когда (?:вернётся|напишет)/iu],
  ['A-02', /ноч\p{L}*\s+игрок|тихи\p{L}+ час|часы игрока|часов игрока/iu],
  ['A-03', /ждёт вечно|ждать вечно|не торопит/iu],
  ['A-04', /быстр\p{L}+ режим|ускорени/iu],
];
const authorHint = (s) => AUTHOR.filter(([, re]) => re.test(s)).map(([a]) => a);

const stem = (w) => w.toLowerCase().replace(/ё/g, 'е').slice(0, Math.max(4, Math.min(6, w.length - 2)));
const want = words.map(stem);
const match = (s) => want.every((w) => s.toLowerCase().replace(/ё/g, 'е').includes(w));

let contra = matrix.filter((r) => r.kind === 'contra').map((r) => ({
  id: r.id, alias: r.alias, title: r.title, decision: decisionOf(textOf.get(r.id) ?? ''),
  owner: r.owner_skill, target: r.target, level: r.level, status: r.status, partial: r.partial ?? null,
  source: r.source, check: authorHint(textOf.get(r.id) ?? ''),
}));
if (opt('--skill')) contra = contra.filter((c) => c.owner === opt('--skill'));
if (opt('--alias')) {
  const a = kb.resolveAlias(opt('--alias')) ?? opt('--alias');
  contra = contra.filter((c) => c.alias === a);
}
if (want.length) contra = contra.filter((c) => match(`${c.title} ${textOf.get(c.id) ?? ''}`));

// Сводные споры attention-merged.md §8: «N. **Спор.** … Решение: …».
function attnContra() {
  const text = readFileSync(join(ROOT, 'docs/playbook/attention-merged.md'), 'utf8');
  const a = text.indexOf('{#attn-contra}');
  const b = text.indexOf('\n## ', a + 1);
  const body = text.slice(a, b < 0 ? undefined : b);
  const out = [];
  for (const m of body.matchAll(/^(\d+)\.\s+\*\*([^*]+)\*\*\s*([\s\S]*?)(?=^\d+\.\s+\*\*|(?![\s\S]))/gm)) {
    const rest = m[3].replace(/\n+$/, '');
    const dec = rest.match(/Решени[ея][^:]*:\s*([\s\S]*?)(?:\s\(`[a-z-]+:attention§|$)/);
    out.push({ n: Number(m[1]), title: plain(m[2]).replace(/\.$/, ''), decision: plain(dec?.[1] ?? rest), keys: [...new Set(rest.match(/`([a-zA-Z0-9]+(?:[.-][a-zA-Z0-9_]+)+)`/g)?.map((k) => k.slice(1, -1)).filter((k) => /\./.test(k) && !/:/.test(k)) ?? [])] });
  }
  return out.filter((x) => !want.length || match(`${x.title} ${x.decision}`));
}
const attn = attnContra();

if (args.includes('--json')) {
  console.log(JSON.stringify({ contra, attn }, null, 2));
  process.exit(0);
}

function indexMd() {
  const all = matrix.filter((r) => r.kind === 'contra').map((r) => ({ ...r, decision: decisionOf(textOf.get(r.id) ?? ''), check: authorHint(textOf.get(r.id) ?? '') }));
  const owners = [...new Set(all.map((c) => c.owner_skill ?? '—'))].sort();
  const lines = [
    '# Индекс противоречий базы',
    '',
    'Генерируется: `node ${CLAUDE_SKILL_DIR}/scripts/kb-contradictions.mjs --write`. Руками не править.',
    `Споров из разделов «Согласия и противоречия» всех разборов: ${all.length}. Строка: ID · спор → решение (сжато) →`,
    'кто держит решение. Полный текст — `kb-search.mjs <ID> --full`. Как отвечать по спору и что выше решения',
    'разбора — [contradictions.md](contradictions.md); сводные споры по вниманию (#attn-contra) — там же.',
    '«⚠ сверить с A-NN» — решение спора опирается на то, что решение автора отменило (срок паузы, ночь игрока,',
    'вечное ожидание, быстрый режим): в силе только часть, совместимая с [superseded.md](superseded.md).',
    '',
  ];
  for (const o of owners) {
    const part = all.filter((c) => (c.owner_skill ?? '—') === o);
    lines.push(`## ${o} · ${part.length}`, '');
    for (const c of part) {
      const sup = c.status !== 'used' ? ` · ${c.status}` : c.partial ? ` · частично ${c.partial}` : '';
      const chk = c.check.length ? ` · ⚠ сверить с ${c.check.join(', ')}` : '';
      lines.push(`- \`${c.id}\` · ${clip(c.title, 70)} → ${clip(c.decision, 150)}${sup}${chk}`);
    }
    lines.push('');
  }
  lines.push('## Источники', '', '`for-relayer.md` §7 «Согласия и противоречия» каждого из 30 разборов в `docs/books/_clean/`; владельцы — `docs/playbook/owners.md` через `npm run story:coverage`.', '');
  return lines.join('\n');
}

if (args.includes('--write') || args.includes('--check')) {
  const next = indexMd();
  let cur = '';
  try { cur = readFileSync(OUT, 'utf8'); } catch {}
  if (args.includes('--check')) {
    console.log(cur === next ? '✓ contradictions-index.md свежий' : '✗ contradictions-index.md устарел: kb-contradictions.mjs --write');
    process.exit(cur === next ? 0 : 1);
  }
  writeFileSync(OUT, next);
  console.log(`✓ contradictions-index.md: ${matrix.filter((r) => r.kind === 'contra').length} споров`);
  process.exit(0);
}

if (!args.includes('--attn')) {
  console.log(`споров в разборах: ${contra.length}${want.length ? ` (по словам «${words.join(' ')}»)` : ''}`);
  for (const c of contra) {
    const sup = c.status !== 'used' ? ` · ${c.status}` : c.partial ? ` · в силе частично (${c.partial})` : '';
    console.log(`${c.id} · ${c.title}${sup}${c.check.length ? ` · ⚠ сверить с ${c.check.join(', ')}` : ''}`);
    console.log(`   решение: ${clip(c.decision, 260)}`);
    console.log(`   держит: ${c.target ?? c.owner ?? '—'} · ${c.level} · ${c.source}`);
  }
}
if (!opt('--skill') && !opt('--alias') && (attn.length || args.includes('--attn'))) {
  console.log(`\nсводных споров по вниманию (#attn-contra): ${attn.length}`);
  for (const x of attn) console.log(`${x.n}. ${x.title} → ${clip(x.decision, 200)}${x.keys.length ? ` · ключи: ${x.keys.join(', ')}` : ''}`);
}
