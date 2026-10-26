#!/usr/bin/env node
// Сжатый транскрипт прогона claude -p из stream-json: вызовы инструментов (и чьи — главная сессия или агент),
// начало каждого результата, отказы в правах и ответ целиком. Поток целиком в репозиторий не кладём — он большой.
import { readFileSync, writeFileSync } from 'node:fs';

const argv = process.argv.slice(2);
if (argv.includes('--help') || !argv.length) {
  console.log('node docs/lab/runs/X-E2/digest.mjs <поток.jsonl> [--out файл.md] [--chars 300]\n\nСжатый транскрипт: шаги, агенты, отказы, ответ.');
  process.exit(0);
}
const get = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const src = argv[0];
const chars = Number(get('--chars', '300'));
const events = readFileSync(src, 'utf8').split('\n').filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } });
const agentOf = new Map();
const lines = [];
let result = null;
let n = 0;
const short = (s) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, chars);
const text = (c) => (typeof c === 'string' ? c : Array.isArray(c) ? c.map((x) => x.text ?? '').join(' ') : '');
for (const ev of events) {
  if (ev.type === 'result') result = ev;
  const who = ev.parent_tool_use_id ? `  [${agentOf.get(ev.parent_tool_use_id) ?? 'агент'}]` : '';
  const content = ev.message?.content;
  if (!Array.isArray(content)) continue;
  for (const c of content) {
    if (ev.type === 'assistant' && c.type === 'tool_use') {
      n++;
      const inp = c.input ?? {};
      if (c.name === 'Agent' || c.name === 'Task') agentOf.set(c.id, `${inp.subagent_type ?? 'агент'}: ${short(inp.description).slice(0, 40)}`);
      const arg = inp.command ?? inp.skill ?? inp.file_path ?? inp.pattern ?? inp.subagent_type ?? '';
      lines.push(`${who}${n}. **${c.name}** \`${short(arg).replace(/`/g, "'")}\`${c.name === 'Agent' ? ` — ${short(inp.description)}` : ''}`);
    } else if (ev.type === 'user' && c.type === 'tool_result') {
      const t = short(text(c.content));
      lines.push(`${who}   → ${c.is_error ? '**ошибка/отказ:** ' : ''}${t}`);
    }
  }
}
const out = [
  `# Транскрипт ${src.split('/').pop()}`,
  '',
  result ? `ходов ${result.num_turns}, $${result.total_cost_usd?.toFixed?.(2)}, ${Math.round((result.duration_ms ?? 0) / 1000)} с, отказов в правах ${result.permission_denials?.length ?? 0}` : 'итога нет (прогон оборван)',
  '',
  '## Шаги',
  '',
  ...lines,
  '',
  '## Отказы в правах (permission_denials)',
  '',
  ...(result?.permission_denials?.length ? result.permission_denials.map((d) => `- ${d.tool_name}: \`${short(d.tool_input?.command ?? d.tool_input?.file_path ?? JSON.stringify(d.tool_input))}\``) : ['—']),
  '',
  '## Ответ',
  '',
  result?.result ?? '—',
  '',
].join('\n');
const dst = get('--out');
if (dst) writeFileSync(dst, out); else process.stdout.write(out);
