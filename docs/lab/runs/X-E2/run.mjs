#!/usr/bin/env node
// Один прогон claude -p фразой автора в слепой копии: поток stream-json в файл, итог — рядом (.result.json).
// Права — как у живого автора в -p, плюс то, что нужно оркестратору ревью: Agent и запись в .story-review/.
import { spawn } from 'node:child_process';
import { createWriteStream, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const HELP = `node docs/lab/runs/X-E2/run.mjs --dir <слепая копия> --out <файл.jsonl> --phrase "<фраза автора>"
  [--model claude-opus-5-5] [--max-turns 250] [--timeout-min 120]

Запускает claude -p в <слепая копия> с правами прогона Э2 (ниже), пишет поток в <файл.jsonl>,
итог (скилл, отказы, стоимость, ходы, ответ) — в <файл>.result.json.
  allow: Read, Grep, Glob, Skill, Agent, Write/Edit(.story-review/**), Bash(npm run story*), Bash(npm run -s story*),
         Bash(node scripts/*), Bash(node .claude/skills/*), Bash(node <копия>/.claude/skills/*), Bash(grep *)
  deny:  WebFetch, WebSearch, Write/Edit(docs/**, src/**), Read(//Users/**/dev/**) — исходный репозиторий
  --help  эта справка`;

const argv = process.argv.slice(2);
if (argv.includes('--help')) { console.log(HELP); process.exit(0); }
const get = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const dir = get('--dir'); const out = get('--out'); const phrase = get('--phrase');
if (!dir || !out || !phrase) { console.error(HELP); process.exit(2); }
const model = get('--model', 'claude-opus-5-5');
const maxTurns = get('--max-turns', '250');
const timeoutMin = Number(get('--timeout-min', '120'));
const abs = resolve(dir);
const home = process.env.HOME;

const allow = ['Read', 'Grep', 'Glob', 'Skill', 'Agent', 'Write(.story-review/**)', 'Edit(.story-review/**)',
  'Bash(npm run story*)', 'Bash(npm run -s story*)', 'Bash(node scripts/*)', 'Bash(node .claude/skills/*)',
  `Bash(node ${abs}/.claude/skills/*)`, 'Bash(grep *)'];
const deny = ['WebFetch', 'WebSearch', 'Write(docs/**)', 'Edit(docs/**)', 'Write(src/**)', 'Edit(src/**)',
  `Read(/${home}/dev/**)`, 'Workflow', 'CronCreate', 'RemoteTrigger', 'ScheduleWakeup', 'PushNotification'];

const file = createWriteStream(resolve(out));
const started = Date.now();
const child = spawn('claude', ['-p', phrase, '--model', model, '--output-format', 'stream-json', '--verbose',
  '--strict-mcp-config', '--max-turns', maxTurns, '--permission-prompts', 'none',
  '--allowedTools', allow.join(','), '--disallowedTools', deny.join(',')], { cwd: abs, stdio: ['ignore', 'pipe', 'pipe'] });
let stderr = '';
let result = null;
let buf = '';
child.stdout.setEncoding('utf8');
child.stdout.on('data', (c) => {
  file.write(c);
  buf += c;
  const lines = buf.split('\n'); buf = lines.pop();
  for (const l of lines) { try { const ev = JSON.parse(l); if (ev.type === 'result') result = ev; } catch { /* не JSON */ } }
});
child.stderr.on('data', (d) => (stderr += d));
const timer = setTimeout(() => child.kill('SIGTERM'), timeoutMin * 60_000);
child.on('close', (code) => {
  clearTimeout(timer);
  file.end();
  const r = {
    phrase, dir: abs, model, code, wall_s: Math.round((Date.now() - started) / 1000),
    turns: result?.num_turns ?? null, cost_usd: result?.total_cost_usd ?? null,
    permission_denials: result?.permission_denials ?? null, is_error: result?.is_error ?? null,
    subtype: result?.subtype ?? null, stderr: stderr.trim().split('\n').slice(-5).join('\n'), answer: result?.result ?? null,
  };
  writeFileSync(`${resolve(out)}.result.json`, `${JSON.stringify(r, null, 2)}\n`);
  writeFileSync(`${resolve(out)}.done`, `${code}\n`);
});
