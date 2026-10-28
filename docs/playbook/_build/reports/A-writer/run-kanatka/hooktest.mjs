import { readFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
const t = readFileSync('.claude/agents/chapter-writer.md', 'utf8');
const cmds = [...t.matchAll(/command: \|-\n\s+node -e '([\s\S]*?)'\n/g)].map(m => m[1]);
const [write, bash] = cmds;
const run = (code, input) => { try { execFileSync('node', ['-e', code], { input: JSON.stringify(input), stdio: ['pipe','pipe','pipe'] }); return 'allow'; } catch (e) { return 'deny: ' + e.stderr.toString().trim().slice(0, 70); } };
const cwd = process.cwd();
const id = 'test-' + Date.now();
const W = (p, tool = 'Write', agent = id) => run(write, { cwd, tool_name: tool, tool_input: { file_path: p }, agent_id: agent });
const cases = [
  ['ch02 новой главы', W('src/stories/the-number/ch02.ink'), 'allow'],
  ['повтор ch02 абсолютным', W(cwd + '/src/stories/the-number/ch02.ink', 'Edit'), 'allow'],
  ['story.ink Edit', W('src/stories/the-number/story.ink', 'Edit'), 'allow'],
  ['story.ink Write', W('src/stories/the-number/story.ink'), 'deny'],
  ['другая глава ch03', W('src/stories/the-number/ch03.ink', 'Edit'), 'deny'],
  ['другая история', W('src/stories/slepoe-pyatno/ch02.ink', 'Edit'), 'deny'],
  ['meta.json', W('src/stories/the-number/meta.json', 'Edit'), 'deny'],
  ['facts.md', W('docs/stories/the-number/facts.md'), 'deny'],
  ['нет истории', W('src/stories/nope/ch01.ink', 'Write', id + 'b'), 'deny'],
  ['..', W('src/stories/the-number/../the-number/ch02.ink', 'Edit', id + 'c'), 'deny'],
];
const B = c => run(bash, { tool_input: { command: c } });
for (const c of ['npm run -s story:lint -- --story k --partial', 'npm run check:story -- k', 'node .claude/skills/chapter-write/scripts/chapter-lint.mjs --story k --chapter 2',
  'node .claude/skills/chapter-write/scripts/style-sample.mjs --topic format', 'node scripts/hooks/full.mjs k', 'npm run -s story:trace -- --story k --persona unresponsive', 'npm run -s story:rule C-35', 'grep -n "beta_stop" src/stories/k/ch01.ink', 'ls src/stories/k', 'wc -l src/stories/k/ch02.ink'])
  cases.push(['bash ' + c, B(c), 'allow']);
for (const c of ['node .claude/skills/chapter-write/scripts/chapter-context.mjs --story k --chapter 2 --out x.md', 'npm run story:cold-read -- --ask', 'echo x > src/stories/k/ch02.ink', 'grep x thresholds.json | head', 'npm run story:unpack -- a.json', 'node -e 1', 'node .claude/skills/story-fix/scripts/apply.mjs', 'npm run -s story:lint; rm -rf x', 'cat $(ls)'])
  cases.push(['bash ' + c, B(c), 'deny']);
let bad = 0;
for (const [n, got, want] of cases) { const ok = got.startsWith(want); if (!ok) bad++; console.log((ok ? '✓ ' : '✗ ') + n + ' → ' + got); }
for (const a of [id, id+'b', id+'c']) rmSync(os.tmpdir() + '/chapter-writer-' + a + '.json', { force: true });
console.log(bad ? `✗ ${bad}` : `✓ все ${cases.length}`);
