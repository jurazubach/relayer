// Перекос выбора к финалу: угадывается ли финал по позиции кнопки и есть ли кнопка, которая почти всегда
// ведёт в один финал. Обёртка над двумя командами — числа берутся у них как есть:
//   story:endings — доли финалов у персон first / last (детерминированные) и random;
//   story:lint C-16 — кнопки-перекосы и персоны, которые тянутся к позиции с вероятностью C-16.persona_bias.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { loadStory, storyRefs } from '../../../../scripts/lib/story.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';
import { lintStory } from '../../../../scripts/lint/core.mjs';

const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/position-bias.mjs [--story <id|путь>,…] [--runs N] [--json]

Перекос выбора к финалу (скилл story-choices, проверка C-16, narrative-testing:PAT-04 / RED-28):
  персоны     доли финалов у «всегда первая», «всегда последняя» (story:endings, по одному прогону — это
              основной путь автора и его зеркало) и у случайной; ! — один финал не реже C-16.persona_share
              у персоны с несколькими прогонами
  C-16        находки story:lint: кнопка ведёт в один финал не реже C-16.button_share, соседняя — не чаще
              C-16.other_share; персоны с тягой к позиции (C-16.persona_bias). Финальная дилемма не считается.
Финалы не делятся на хорошие и плохие (R-111): перекос ищется к любому. Один финал — перекоса нет.

  --story     история по id, файл .json / .ink или папка; через запятую; по умолчанию все из src/stories
  --runs N    прогонов бота для C-16 (по умолчанию lint.runs.full — как у story:lint)
  --json      всё данными
  --help      эта справка`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const T = thresholds();
const refs = storyRefs((opt('--story') ?? '').split(',').filter(Boolean));
const runs = opt('--runs') ? Number(opt('--runs')) : T.value('lint.runs.full');
const share = T.value('C-16.persona_share');
const pct = (x) => `${Math.round(x * 100)}%`;

const report = [];
for (const ref of refs) {
  const story = loadStory(ref);
  let endings = null;
  try {
    const out = execFileSync(process.execPath, [join(ROOT, 'scripts/story/endings.mjs'), '--story', ref, '--persona', 'first,last,random', '--json'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    endings = JSON.parse(out).stories[0];
  } catch (e) {
    report.push({ id: story.id, path: story.path, error: `нет данных: story:endings (${String(e.message).split('\n')[0]})` });
    continue;
  }
  const personas = {};
  for (const [name, p] of Object.entries(endings.personas ?? {})) {
    const total = Object.values(p.counts).reduce((a, b) => a + b, 0);
    const [top, n] = Object.entries(p.counts).sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
    personas[name] = { runs: p.runs, counts: p.counts, top, top_share: total ? n / total : 0, biased: p.runs > 1 && total > 0 && n / total >= share };
  }
  const lint = await lintStory(story, T, { only: ['C-16'], runs, seed: 1 });
  report.push({
    id: story.id, path: story.path, endings: (endings.endings ?? []).map((e) => e.name ?? e.id), personas,
    c16: lint.findings.map((f) => ({ key: f.key, node: f.node, chapter: f.chapter, message: f.message, level: f.level })),
    suppressed: lint.suppressed.length,
  });
}

if (args.includes('--json')) {
  console.log(JSON.stringify({ stories: report, keys: { persona_share: share, button_share: T.value('C-16.button_share'), other_share: T.value('C-16.other_share') } }, null, 1));
  process.exit(0);
}
for (const r of report) {
  if (r.error) { console.log(`${r.path}: ${r.error}\n`); continue; }
  console.log(`${r.path} · финалов ${r.endings.length}${r.endings.length < 2 ? ' — один финал, перекоса быть не может' : ''}`);
  for (const [name, p] of Object.entries(r.personas)) {
    const dist = Object.entries(p.counts).sort((a, b) => b[1] - a[1]).map(([e, n]) => `${e} ${n}`).join(' · ');
    console.log(`   ${name.padEnd(7)} прогонов ${String(p.runs).padEnd(4)} ${dist}${p.biased && r.endings.length > 1 ? `  ! «${p.top}» ${pct(p.top_share)} ≥ C-16.persona_share` : ''}`);
  }
  if (r.c16.length) for (const f of r.c16) console.log(`   C-16 · ${f.node ?? 'история'} · ${f.message}`);
  else console.log(`   C-16: находок нет${r.suppressed ? ` (подавлено ${r.suppressed})` : ''}`);
  console.log('');
}
