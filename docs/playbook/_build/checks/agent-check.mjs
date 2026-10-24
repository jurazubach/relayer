// Приёмка агента по контракту плана §6.
//   node docs/playbook/_build/checks/agent-check.mjs <имя>
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const name = process.argv[2];
if (!name || name === '--help') { console.log('использование: agent-check.mjs <имя>'); process.exit(name ? 0 : 1); }
const file = join('.claude/agents', `${name}.md`);
const errors = [], warns = [];
if (!existsSync(file)) { console.log(`✗ нет ${file}`); process.exit(1); }
const text = readFileSync(file, 'utf8');
const fm = text.match(/^---\n([\s\S]*?)\n---\n/);
if (!fm) errors.push('нет frontmatter');
else {
  const f = fm[1];
  if (!new RegExp(`^name:\\s*["']?${name}["']?\\s*$`, 'm').test(f)) errors.push(`name должен быть «${name}»`);
  if (!/^description:/m.test(f)) errors.push('нет description');
  else if (!/[Вв]ызывается/.test(f)) warns.push('description не говорит, какими скиллами вызывается');
  if (!/^model:\s*["']?(opus|claude-opus)/m.test(f)) errors.push('model должна быть opus');
  if (name !== 'cold-reader' && !/^tools:/m.test(f)) warns.push('нет tools — агент получит все инструменты');
  if (/^tools:.*\b(Agent|Task)\b/m.test(f)) errors.push('агент не должен запускать других агентов (Agent/Task в tools)');
}
const body = text.replace(/^---[\s\S]*?\n---\n/, '');
for (const m of body.matchAll(/\.claude\/skills\/([a-z0-9-]+)/g)) {
  if (!existsSync(join('.claude/skills', m[1]))) errors.push(`ссылка на несуществующий скилл ${m[1]}`);
}
if (/the-number|slepoe-pyatno|chuzhoy-golos/.test(body)) errors.push('упоминает наши истории');
if (body.split('\n').length < 15) warns.push('тело короче 15 строк');
for (const w of warns) console.log('⚠ ' + w);
for (const e of errors) console.log('✗ ' + e);
console.log(errors.length ? `✗ агент ${name}: ${errors.length} ошибок` : `✓ агент ${name}: ок`);
process.exit(errors.length ? 1 : 0);
