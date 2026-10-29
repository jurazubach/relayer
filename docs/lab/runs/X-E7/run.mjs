#!/usr/bin/env node
// Один прогон claude -p в слепой копии для Э7 (основа — docs/lab/runs/X-E3/run.mjs). Отличия: без --resume —
// с ним allowed-tools скилла не действуют, поэтому каждая реплика автора — новая сессия с полным контекстом во
// фразе; --write даёт Edit и Write без пути (так задача: правящие скиллы пишут главу через Write), но только
// в слепой копии, а в репозиторий переносится одна папка истории и её состояние.
import { spawn } from 'node:child_process';
import { createWriteStream, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const HELP = `node docs/lab/runs/X-E7/run.mjs --dir <слепая копия> --out <файл.jsonl> (--phrase "<фраза>" | --phrase-file <файл>)
  [--write] [--model claude-opus-5-5] [--max-turns 300] [--timeout-min 150]

Права как в X-E3 (без --write запись в docs/ и src/ запрещена, кроме docs/stories/**: story-desk и
story-review пишут состояние). --write — Edit и Write без пути (живые правки chapter-write и story-fix).
Итог — <файл>.result.json (ходы, стоимость, отказы, ответ), готовность — <файл>.done.
  --help  эта справка`;

const argv = process.argv.slice(2);
if (argv.includes('--help')) { console.log(HELP); process.exit(0); }
const get = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const dir = get('--dir'); const out = get('--out');
const phrase = get('--phrase') ?? (get('--phrase-file') ? readFileSync(get('--phrase-file'), 'utf8').trim() : null);
if (!dir || !out || !phrase) { console.error(HELP); process.exit(2); }
const model = get('--model', 'claude-opus-5-5');
const maxTurns = get('--max-turns', '300');
const timeoutMin = Number(get('--timeout-min', '150'));
const write = argv.includes('--write');
const abs = resolve(dir);
const home = process.env.HOME;

const allow = ['Read', 'Grep', 'Glob', 'Skill', 'Agent', 'Write(.story-review/**)', 'Edit(.story-review/**)',
  'Bash(npm run story*)', 'Bash(npm run -s story*)', 'Bash(node scripts/*)', 'Bash(node .claude/skills/*)',
  `Bash(node ${abs}/.claude/skills/*)`, 'Bash(grep *)'];
const deny = ['WebFetch', 'WebSearch', 'Monitor', 'TaskStop', `Read(/${home}/dev/**)`, 'Workflow', 'CronCreate', 'RemoteTrigger',
  'ScheduleWakeup', 'PushNotification'];
if (write) allow.push('Edit', 'Write');
else allow.push('Write(docs/stories/**)', 'Edit(docs/stories/**)');

const args = ['-p', phrase, '--model', model, '--output-format', 'stream-json', '--verbose', '--strict-mcp-config',
  '--max-turns', maxTurns, '--permission-prompts', 'none',
  '--allowedTools', allow.join(','), '--disallowedTools', deny.join(',')];
const file = createWriteStream(resolve(out));
const started = Date.now();
const child = spawn('claude', args, { cwd: abs, stdio: ['ignore', 'pipe', 'pipe'] });
let stderr = ''; let result = null; let buf = ''; let session = null;
child.stdout.setEncoding('utf8');
child.stdout.on('data', (c) => {
  file.write(c);
  buf += c;
  const lines = buf.split('\n'); buf = lines.pop();
  for (const l of lines) {
    try { const ev = JSON.parse(l); session ??= ev.session_id ?? null; if (ev.type === 'result') result = ev; } catch { /* не JSON */ }
  }
});
child.stderr.on('data', (d) => (stderr += d));
const timer = setTimeout(() => child.kill('SIGTERM'), timeoutMin * 60_000);
child.on('close', (code) => {
  clearTimeout(timer);
  file.end();
  const r = {
    phrase, dir: abs, model, code, write, session_id: result?.session_id ?? session,
    wall_s: Math.round((Date.now() - started) / 1000), turns: result?.num_turns ?? null, cost_usd: result?.total_cost_usd ?? null,
    permission_denials: result?.permission_denials ?? null, is_error: result?.is_error ?? null,
    subtype: result?.subtype ?? null, stderr: stderr.trim().split('\n').slice(-5).join('\n'), answer: result?.result ?? null,
  };
  writeFileSync(`${resolve(out)}.result.json`, `${JSON.stringify(r, null, 2)}\n`);
  writeFileSync(`${resolve(out)}.done`, `${code}\n`);
});
