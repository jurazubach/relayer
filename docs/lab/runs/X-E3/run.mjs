#!/usr/bin/env node
// Один прогон claude -p в слепой копии для Э3 (основа — docs/lab/runs/X-E2/run.mjs) с двумя отличиями:
// --write разрешает правку истории (story-fix пишет в src/stories/<id>/), --resume продолжает сессию
// (одобрение королевы приходит вторым сообщением после показа вариантов, как в жизни от автора).
import { spawn } from 'node:child_process';
import { createWriteStream, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const HELP = `node docs/lab/runs/X-E3/run.mjs --dir <слепая копия> --out <файл.jsonl> --phrase "<фраза>"
  [--write <id>] [--resume <session_id>] [--model claude-opus-5-5] [--max-turns 300] [--timeout-min 150]

Права как в X-E2 (run.mjs --help там же). --write <id> добавляет Write/Edit(src/stories/<id>/**) и
Write/Edit(docs/stories/<id>/**); без него запись в docs/ и src/ запрещена. Итог — <файл>.result.json
(с session_id для --resume), готовность — <файл>.done.
  --help  эта справка`;

const argv = process.argv.slice(2);
if (argv.includes('--help')) { console.log(HELP); process.exit(0); }
const get = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const dir = get('--dir'); const out = get('--out'); const phrase = get('--phrase');
if (!dir || !out || !phrase) { console.error(HELP); process.exit(2); }
const model = get('--model', 'claude-opus-5-5');
const maxTurns = get('--max-turns', '300');
const timeoutMin = Number(get('--timeout-min', '150'));
const write = get('--write'); const resume = get('--resume');
const abs = resolve(dir);
const home = process.env.HOME;

const allow = ['Read', 'Grep', 'Glob', 'Skill', 'Agent', 'Write(.story-review/**)', 'Edit(.story-review/**)',
  'Bash(npm run story*)', 'Bash(npm run -s story*)', 'Bash(node scripts/*)', 'Bash(node .claude/skills/*)',
  `Bash(node ${abs}/.claude/skills/*)`, 'Bash(grep *)'];
const deny = ['WebFetch', 'WebSearch', `Read(/${home}/dev/**)`, 'Workflow', 'CronCreate', 'RemoteTrigger',
  'ScheduleWakeup', 'PushNotification'];
if (write) {
  for (const t of ['Write', 'Edit']) allow.push(`${t}(src/stories/${write}/**)`, `${t}(docs/stories/${write}/**)`);
} else {
  deny.push('Write(docs/**)', 'Edit(docs/**)', 'Write(src/**)', 'Edit(src/**)');
}

const args = ['-p', phrase, '--model', model, '--output-format', 'stream-json', '--verbose', '--strict-mcp-config',
  '--max-turns', maxTurns, '--permission-prompts', 'none',
  '--allowedTools', allow.join(','), '--disallowedTools', deny.join(',')];
if (resume) args.push('--resume', resume);
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
    phrase, dir: abs, model, code, write: write ?? null, resume: resume ?? null, session_id: result?.session_id ?? session,
    wall_s: Math.round((Date.now() - started) / 1000), turns: result?.num_turns ?? null, cost_usd: result?.total_cost_usd ?? null,
    permission_denials: result?.permission_denials ?? null, is_error: result?.is_error ?? null,
    subtype: result?.subtype ?? null, stderr: stderr.trim().split('\n').slice(-5).join('\n'), answer: result?.result ?? null,
  };
  writeFileSync(`${resolve(out)}.result.json`, `${JSON.stringify(r, null, 2)}\n`);
  writeFileSync(`${resolve(out)}.done`, `${code}\n`);
});
