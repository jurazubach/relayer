// Сжимает sources.md, который пишет `npm run story:coverage -- --sources <скилл> --write`, до одной строки ID
// на кластер TH: полный список (строка с названием и путём на каждый ID) у большого скилла длиннее предела
// skill-check. Порядок и состав ID не меняются — меняется только вёрстка. Просьба о флаге --compact в
// coverage.mjs — reports/S-choices/requests.md.
//   node docs/playbook/_build/reports/S-choices/sources-compact.mjs .claude/skills/<скилл>/references/sources.md
import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2];
if (!file || file === '--help') {
  console.log('node sources-compact.mjs <путь к sources.md> — переверстать список ID по кластерам TH (на месте)');
  process.exit(file ? 0 : 1);
}
const lines = readFileSync(file, 'utf8').split('\n');
const out = [];
let group = null;
const flush = () => {
  if (!group) return;
  out.push(`**${group.title}:**`);
  // строка со словом «нюанс» целиком читается как нюансы (kb-levels.mjs, headingIds): нюансы — отдельными строками
  for (const part of [group.ids.filter((id) => !/нюанс/.test(id)), group.ids.filter((id) => /нюанс/.test(id))]) {
    let cur = '';
    for (const id of part) {
      const piece = cur ? ` · ${id}` : id;
      if ((cur + piece).length > 130) { out.push(cur); cur = id; } else cur += piece;
    }
    if (cur) out.push(cur);
  }
  out.push('');
  group = null;
};
let head = true;
for (const l of lines) {
  if (head) {
    if (l.startsWith('## ')) head = false;
    else {
      out.push(l.replace('руками не править.', 'руками не править; переверстано по кластерам `docs/playbook/_build/reports/S-choices/sources-compact.mjs`.'));
      continue;
    }
  }
  if (l.startsWith('## ')) { flush(); out.push(l, ''); continue; }
  if (l.startsWith('### ')) {
    const title = l.slice(4);
    if (group && group.title === title) continue;
    flush();
    group = { title, ids: [] };
    continue;
  }
  const m = l.match(/^- `([^`]+)`.*?(?: — (merged-into:\S+|rejected:\S+|superseded:\S+|deferred:\S+|частично отменено \S+))?$/);
  if (m) {
    if (!group) group = { title: 'без кластера TH', ids: [] };
    const st = m[2] ? ` (${m[2].replace(/^merged-into:/, 'влит в ')})` : '';
    group.ids.push(`\`${m[1]}\`${st}`);
  }
}
flush();
writeFileSync(file, out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n');
console.log(`✓ ${file}: ${out.length} строк`);
