// Одобрение по одному пункту (approval.md): находки и варианты А/Б/В берутся из отчёта линзы как есть,
// без пересочинения. Скрипт нумерует находки, достаёт выбранные варианты с ink «до» и «после» и проверяет,
// что «до» всё ещё стоит в файлах истории: если нет — узел изменился после ревью, отчёт устарел.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, locateBefore, parseCli, parseReport } from './fix-core.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/pick.mjs --report <файл> [--take 1:А,3:Б,4] [--story <id>] [--json]

Находки и варианты из отчёта линзы или ревью (docs/stories/<id>/reviews/<дата>-<скилл>.md):

  без --take   список: номер · строка находки · какие варианты есть (А, Б, В) и есть ли у них ink
  --take       выбранное автором (в конвейере — королевой): «номер:буква» или просто «номер» (вариант А,
               если он один); печатает строку находки, текст варианта и его ink «до» / «после» дословно
  --story <id> сверить ink «до» каждого выбранного варианта с src/stories/<id>/*.ink: найдено (файл:строка)
               или «устарело» — узел правили после отчёта, вариант надо строить заново у владельца

Находка — строка «P1 · тип · узел · симптом · правка (F-NN) · [C-NN · …]» (finding-format.md).
Вариант — строка, начинающаяся словом «Вариант А» (Б, В…), под находкой; его ink — блоки \`\`\`ink, первый
(или с подписью «до») — «до», второй (или «после») — «после».

  --json       данными: { findings: [{ n, line, node, fix, variants: [{ key, title, before, after }] }] }
  --help       эта справка

Код выхода: 0 — всё найдено; 1 — выбранного нет в отчёте или «до» устарело; 2 — нет файла.`;

const args = parseCli(process.argv.slice(2), ['json']);
if (args.has('help') || args.has('h')) { console.log(HELP); process.exit(0); }
const file = args.get('report');
if (!file || !existsSync(String(file))) { console.log(`нет данных: нет отчёта ${file ?? '(--report не задан)'}`); process.exit(2); }

/** Файлы .ink истории для поиска «до». */
function storyFiles(id) {
  const dir = join(ROOT, 'src/stories', id);
  if (!existsSync(dir)) return null;
  return Object.fromEntries(readdirSync(dir).filter((x) => x.endsWith('.ink')).map((f) => [f, readFileSync(join(dir, f), 'utf8')]));
}
const locate = (id, before) => { const files = storyFiles(id); return files ? locateBefore(files, before) : { found: false, why: `нет папки src/stories/${id}` }; };

const findings = parseReport(readFileSync(String(file), 'utf8'));
const takeArg = args.get('take');
let exit = 0;

if (!takeArg) {
  if (args.has('json')) console.log(JSON.stringify({ report: file, findings }, null, 1));
  else {
    console.log(`pick · ${file} · находок ${findings.length}`);
    for (const x of findings) {
      const vs = x.variants.map((v) => `${v.key}${v.before != null || v.after != null ? ' (ink)' : ''}`).join(', ');
      console.log(`${String(x.n).padStart(2)}. ${x.line}\n    варианты: ${vs || '— (нет: строить у владельца по F-NN, см. fixes-index.md)'}`);
    }
  }
  process.exit(findings.length ? 0 : 1);
}

const picks = String(takeArg).split(',').map((s) => s.trim()).filter(Boolean).map((s) => { const [n, k] = s.split(':'); return { n: Number(n), key: (k ?? '').toUpperCase() }; });
const chosen = [];
for (const p of picks) {
  const x = findings.find((f) => f.n === p.n);
  if (!x) { chosen.push({ n: p.n, error: 'нет такой находки в отчёте' }); exit = 1; continue; }
  const v = p.key ? x.variants.find((y) => y.key === p.key) : x.variants.length === 1 ? x.variants[0] : null;
  if (!v) { chosen.push({ n: p.n, line: x.line, fix: x.fix, error: x.variants.length ? `вариант ${p.key || '?'} не найден (есть ${x.variants.map((y) => y.key).join(', ')})` : 'в отчёте нет вариантов — построить у владельца приёма' }); exit = 1; continue; }
  const item = { n: p.n, line: x.line, node: x.node, fix: x.fix, key: v.key, title: v.title, text: v.text, before: v.before, after: v.after };
  if (args.get('story') && v.before != null) {
    item.located = locate(String(args.get('story')), v.before);
    if (!item.located.found) exit = 1;
  }
  chosen.push(item);
}

if (args.has('json')) console.log(JSON.stringify({ report: file, chosen }, null, 1));
else {
  for (const c of chosen) {
    console.log(`── ${c.n}${c.key ? `:${c.key}` : ''} · ${c.line ?? ''}`);
    if (c.error) { console.log(`   ✗ ${c.error}`); continue; }
    if (c.title) console.log(`   вариант ${c.key}: ${c.title}`);
    for (const t of c.text.slice(0, 6)) console.log(`   ${t}`);
    if (c.located) console.log(c.located.found ? `   ✓ «до» найдено: ${c.located.where}` : `   ✗ ${c.located.why}`);
    if (c.before != null) console.log(`   до:\n${c.before.replace(/^/gm, '     ')}`);
    if (c.after != null) console.log(`   после:\n${c.after.replace(/^/gm, '     ')}`);
    if (c.before == null && c.after == null) console.log('   ink в варианте нет — правку пишет story-fix по описанию варианта и приёму владельца');
  }
}
process.exit(exit);
