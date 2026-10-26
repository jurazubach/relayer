#!/usr/bin/env node
// Полный вывод report.mjs из потока прогона (последний вызов главной сессии): прямо из tool_result или из файла,
// куда Claude Code сохранил длинный вывод (<persisted-output>).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const [src, dst] = process.argv.slice(2);
if (!src || src === '--help') { console.log('node docs/lab/runs/X-E2/report-of.mjs <поток.jsonl> [<куда.md>]'); process.exit(0); }
const ev = readFileSync(src, 'utf8').split('\n').filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } });
const ids = new Set();
for (const e of ev) {
  if (e.type !== 'assistant' || e.parent_tool_use_id) continue;
  for (const c of e.message?.content ?? []) if (c.type === 'tool_use' && /report\.mjs/.test(c.input?.command ?? '') && !/--help/.test(c.input.command)) ids.add(c.id);
}
let out = null;
for (const e of ev) {
  if (e.type !== 'user') continue;
  for (const c of e.message?.content ?? []) {
    if (c.type !== 'tool_result' || !ids.has(c.tool_use_id)) continue;
    const t = typeof c.content === 'string' ? c.content : (c.content ?? []).map((x) => x.text ?? '').join('\n');
    const m = t.match(/saved to: (\S+\.txt)/);
    out = m && existsSync(m[1]) ? readFileSync(m[1], 'utf8') : t;
  }
}
if (!out) { console.error('report.mjs в прогоне не вызывался'); process.exit(1); }
if (dst) writeFileSync(dst, out); else process.stdout.write(out);
