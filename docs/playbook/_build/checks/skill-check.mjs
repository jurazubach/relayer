// Приёмка скилла по контракту плана §4: структура, длины, виды references, источники,
// компиляция примеров ink, скрипты с --help. Ошибки роняют приёмку, предупреждения — нет.
//   node docs/playbook/_build/checks/skill-check.mjs <имя> [--min-refs 8] [--min-scripts 2] [--fixes F-07,F-08]
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const args = process.argv.slice(2);
const name = args[0];
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
if (!name || name.startsWith('--')) { console.log('использование: skill-check.mjs <имя> [--min-refs N] [--min-scripts N] [--fixes F-01,F-02]'); process.exit(name ? 0 : 1); }
const minRefs = Number(opt('--min-refs', 8));
const minScripts = Number(opt('--min-scripts', 2));
const fixes = (opt('--fixes', '') || '').split(',').filter(Boolean);

const dir = join('.claude/skills', name);
const errors = [], warns = [];
const err = (m) => errors.push(m), warn = (m) => warns.push(m);

const walk = (d) => existsSync(d) ? readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; }) : [];

// SKILL.md
const skillMd = join(dir, 'SKILL.md');
if (!existsSync(skillMd)) { err(`нет ${skillMd}`); finish(); }
const text = readFileSync(skillMd, 'utf8');
const fm = text.match(/^---\n([\s\S]*?)\n---\n/);
if (!fm) err('SKILL.md: нет frontmatter');
else {
  const nameLine = fm[1].match(/^name:\s*(.+)$/m);
  if (!nameLine || nameLine[1].trim().replace(/['"]/g, '') !== name) err(`frontmatter: name должен быть «${name}»`);
  const desc = fm[1].match(/^description:\s*([\s\S]*?)(?=^\w[\w-]*:|$(?![\s\S]))/m);
  const d = desc ? desc[1].replace(/\s+/g, ' ').trim().replace(/^["']|["']$/g, '') : '';
  if (!d) err('frontmatter: нет description');
  else if (d.length > 300) err(`description ${d.length} знаков (> 300)`);
}
const body = text.replace(/^---[\s\S]*?\n---\n/, '');
const lines = body.split('\n').length;
if (lines < 40 || lines > 160) err(`SKILL.md: ${lines} строк (допустимо 40–160, цель 60–120)`);
else if (lines < 60 || lines > 120) warn(`SKILL.md: ${lines} строк (цель 60–120)`);
if (!/STATUS\.md/.test(body)) err('SKILL.md: первый шаг должен читать docs/stories/<id>/STATUS.md');
if (!/references\//.test(body)) err('SKILL.md: не ссылается на references/');
if (!/объясни/i.test(body)) warn('SKILL.md: нет режима «объясни»');
if (!/Версия:\s*\d/.test(body)) warn('SKILL.md: нет строки «Версия: N»');

// references
const refs = walk(join(dir, 'references')).filter((f) => f.endsWith('.md'));
if (refs.length < minRefs) err(`references: ${refs.length} файлов (нужно ≥ ${minRefs})`);
const base = refs.map((f) => f.split('/').pop());
const need = [['decisions-', 'развилки decisions-*.md'], ['patterns-', 'паттерны patterns-*.md']];
if (!need.some(([p]) => base.some((b) => b.startsWith(p)))) err('references: нет ни decisions-*.md, ни patterns-*.md');
for (const f of ['flags.md', 'lessons.md', 'attention.md', 'explain.md', 'sources.md', 'contradictions.md']) {
  if (!base.includes(f)) (f === 'contradictions.md' ? warn : err)(`references: нет ${f}`);
}
for (const fx of fixes) if (!refs.some((r) => r.includes('/fixes/') && r.split('/').pop().startsWith(fx))) err(`нет ремонтного приёма references/fixes/${fx}-*.md`);
const STORY = /the-number|slepoe-pyatno|chuzhoy-golos|Чужой голос|Слепое пятно|THE NUMBER/;
for (const f of refs) {
  const t = readFileSync(f, 'utf8');
  const n = t.split('\n').length;
  if (n > 350) err(`${f}: ${n} строк (> 300)`); else if (n > 300) warn(`${f}: ${n} строк (> 300)`);
  if (!f.endsWith('sources.md') && !/^#+\s*Источники/m.test(t)) warn(`${f}: нет раздела «Источники»`);
  if (STORY.test(t)) err(`${f}: упоминает наши истории — примеры в скиллах должны быть придуманными`);
  if (/^-\s|^\|/m.test(t) && f.includes('decisions-') && !/[Кк]огда не работает/.test(t)) warn(`${f}: в развилках нет «когда не работает»`);
  if ((f.includes('decisions-') || f.includes('patterns-')) && !/basis/.test(t)) warn(`${f}: нет пометок basis`);
}
if (STORY.test(body)) err('SKILL.md: упоминает наши истории');

// примеры ink компилируются
let Compiler = null;
try { Compiler = createRequire(join(process.cwd(), 'package.json'))('inkjs/full').Compiler; } catch { warn('inkjs не найден — примеры ink не проверены'); }
if (Compiler) {
  let blocks = 0, bad = 0;
  for (const f of [skillMd, ...refs]) {
    for (const m of readFileSync(f, 'utf8').matchAll(/```ink\n([\s\S]*?)```/g)) {
      blocks++;
      const c = new Compiler(m[1]);
      try { c.Compile(); } catch { bad++; err(`${f}: пример ink не компилируется: ${(c.errors || [])[0] ?? ''}`.slice(0, 200)); }
    }
  }
  if (!blocks) warn('нет ни одного примера ink');
}

// scripts
const scripts = walk(join(dir, 'scripts')).filter((f) => /\.m?js$/.test(f));
if (scripts.length < minScripts) err(`scripts: ${scripts.length} (нужно ≥ ${minScripts})`);
for (const s of scripts) {
  const r = spawnSync('node', [s, '--help'], { encoding: 'utf8', timeout: 30000 });
  if (r.status !== 0) err(`${s} --help: код ${r.status}`);
}

// sources.md: алиасы существуют
const src = join(dir, 'references', 'sources.md');
if (existsSync(src)) {
  const aliases = new Set(readdirSync('docs/books').filter((d) => !d.startsWith('_') && statSync(join('docs/books', d)).isDirectory()));
  const used = [...readFileSync(src, 'utf8').matchAll(/([a-z0-9-]+):(?:P|PAT|GREEN|RED|LESSON|SYS)-?\d*/g)].map((m) => m[1]);
  const unknown = [...new Set(used.filter((a) => !aliases.has(a)))];
  if (unknown.length) err(`sources.md: неизвестные алиасы ${unknown.join(', ')}`);
  if (!used.length) err('sources.md: нет ни одной ссылки алиас:ID');
}

finish();
function finish() {
  for (const w of warns) console.log('⚠ ' + w);
  for (const e of errors) console.log('✗ ' + e);
  console.log(errors.length ? `✗ скилл ${name}: ${errors.length} ошибок` : `✓ скилл ${name}: ок (${warns.length} предупреждений)`);
  process.exit(errors.length ? 1 : 0);
}
