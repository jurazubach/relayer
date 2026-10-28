#!/usr/bin/env node
// Чей вызов получил отказ в правах: главная сессия или агент (по parent_tool_use_id), и что за команда.
import { readFileSync } from 'node:fs';

const files = process.argv.slice(2);
if (!files.length || files[0] === '--help') { console.log('node docs/lab/runs/X-E2/denials.mjs <поток.jsonl>…'); process.exit(0); }
for (const f of files) {
  const ev = readFileSync(f, 'utf8').split('\n').filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } });
  const agent = new Map(); const parent = new Map();
  let res = null;
  for (const e of ev) {
    if (e.type === 'result') res = e;
    for (const c of e.message?.content ?? []) {
      if (e.type === 'assistant' && c.type === 'tool_use') {
        parent.set(c.id, e.parent_tool_use_id ?? null);
        if (c.name === 'Agent') agent.set(c.id, c.input?.subagent_type ?? 'агент');
      }
    }
  }
  const list = res?.permission_denials ?? [];
  console.log(`${f.split('/').pop()}: отказов ${list.length}`);
  for (const d of list) {
    const p = parent.get(d.tool_use_id);
    const cmd = String(d.tool_input?.command ?? d.tool_input?.file_path ?? '').replace(/\s+/g, ' ');
    console.log(`  ${p ? agent.get(p) ?? 'агент' : 'главная сессия'} · ${d.tool_name} · ${cmd.split(' ')[0]} ${cmd.slice(cmd.indexOf(' ') + 1, cmd.indexOf(' ') + 60)}…`);
  }
}
