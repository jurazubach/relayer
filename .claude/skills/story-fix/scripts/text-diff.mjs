// Реплики до и после правки для автора: что игрок читал в узле и что прочтёт теперь, в виде переписки.
// Данные — story:diff --text (те же узлы и строки); здесь только подача: «было» и «стало» блоками, без −/+.
import { parseCli, storyJson } from './fix-core.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/text-diff.mjs --story <id> [--from <реф>] [--to <реф>] [--node <узел> | --nodes a,b]
       [--md] [--json]

Дифф для автора (story-fix, diff-for-author.md): по каждому изменённому узлу — «было» и «стало» как переписка,
с именами контактов, кнопками в [ ] и условиями в ‹ ›. Числа и узлы — из npm run story:diff -- <от> <до> --text.

  --story <id>    история (папка src/stories/<id>)
  --from <реф>    ревизия «до» (по умолчанию HEAD: последний коммит перед правкой)
  --to <реф>      ревизия «после» (по умолчанию «.» — рабочая копия)
  --node <узел>   только этот узел и его stitch'и, целиком (как story:diff --node)
  --nodes a,b     только эти узлы (одобренные находки); остальные изменённые — счётом в конце
  --md            markdown для отчёта docs/stories/<id>/reviews/<дата>-story-fix.md
  --json          данными: { story, nodes: [{ id, chapter, status, removed, added, before[], after[] }] }
  --help          эта справка

Код выхода: 0 — есть что показать или изменений нет; 2 — команда story:diff не сработала.`;

const args = parseCli(process.argv.slice(2), ['md', 'json']);
if (args.has('help') || args.has('h')) { console.log(HELP); process.exit(0); }
const id = args.get('story');
if (!id) { console.error('нужен --story <id>\n'); console.log(HELP); process.exit(2); }
const from = String(args.get('from', 'HEAD'));
const to = String(args.get('to', '.'));
const cmd = [from, to, '--story', id, '--text'];
if (args.get('node')) cmd.push('--node', String(args.get('node')));
const res = storyJson('diff', cmd);
if (!res.ok) { console.log(`нет данных: ${res.cmd}: ${res.error}`); process.exit(2); }

const entry = res.data.stories?.[0];
const wanted = args.get('nodes') ? new Set(String(args.get('nodes')).split(',').map((x) => x.trim())) : null;
const inWanted = (n) => !wanted || wanted.has(n.id) || [...wanted].some((w) => n.id.startsWith(`${w}.`));

/** Hunk-и story:diff → два столбца переписки: «было» (контекст и −) и «стало» (контекст и +). */
function sides(hunks) {
  const before = [];
  const after = [];
  for (const h of hunks) {
    if (h.op === '…') { before.push(`… ${h.skipped} без изменений …`); after.push(`… ${h.skipped} без изменений …`); continue; }
    if (h.op !== '+') before.push(`${h.op === '-' ? '−' : ' '} ${h.text}`);
    if (h.op !== '-') after.push(`${h.op === '+' ? '+' : ' '} ${h.text}`);
  }
  return { before, after };
}

const all = (entry?.nodes ?? []).map((n) => ({ id: n.id, chapter: n.chapter, status: n.status, removed: n.removed, added: n.added, ...sides(n.hunks) }));
const shown = all.filter(inWanted);
const rest = all.filter((n) => !inWanted(n));
const sum = (xs, k) => xs.reduce((s, n) => s + n[k], 0);

if (args.has('json')) {
  console.log(JSON.stringify({ story: id, from: res.data.a?.ref ?? from, to: res.data.b?.ref ?? to, nodes: shown, other: rest.map((n) => ({ id: n.id, removed: n.removed, added: n.added })) }, null, 1));
  process.exit(0);
}

const md = args.has('md');
const out = [md ? `## Реплики до и после · ${id}` : `text-diff · ${id} · ${from} → ${to}`, ''];
if (!all.length) out.push('реплики не изменились (правка только в коде, переменных или метках — смотри fix-guard.mjs)');
for (const n of shown) {
  const head = `${n.id}${n.chapter ? ` (гл. ${n.chapter})` : ''} · ${n.status} · убрано ${n.removed}, добавлено ${n.added}`;
  if (md) out.push(`### ${head}`, '', 'Было:', '', '```text', ...(n.before.length ? n.before : ['(узла не было)']), '```', '', 'Стало:', '', '```text', ...(n.after.length ? n.after : ['(узел удалён)']), '```', '');
  else out.push(`@@ ${head}`, '  было:', ...n.before.map((l) => `    ${l}`), '  стало:', ...n.after.map((l) => `    ${l}`), '');
}
if (rest.length) out.push(`${md ? '' : '⚠ '}изменены и другие узлы, не из --nodes: ${rest.map((n) => `${n.id} (−${n.removed} +${n.added})`).join(', ')} — правка вышла за одобренное?`, '');
out.push(`итого: узлов ${shown.length}${rest.length ? ` (+${rest.length} вне списка)` : ''} · реплик убрано ${sum(shown, 'removed')}, добавлено ${sum(shown, 'added')}`);
console.log(out.join('\n'));
