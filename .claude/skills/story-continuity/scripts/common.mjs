// Общее для скриптов story-continuity: разбор флагов, история с прогонами бота (те же, что у story:lint:
// seed 1, lint.runs.full), реестр facts.md и поиск фактов в строке. Факт считается так же, как в C-51:
// имя героя, ЧЧ:ММ, слово реестра — поэтому числа скриптов сходятся с `npm run story:lint -- --only C-51`.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadStory, storyRefs } from '../../../../scripts/lib/story.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';
import { analyze } from '../../../../scripts/lint/core.mjs';
import { heroNames } from '../../../../scripts/lint/text.mjs';
import { loadFacts } from '../../../../scripts/lint/checks/C-51.mjs';

export const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
export const TIME = /\d{1,2}:\d\d/g;

const HELP = `common.mjs — общий модуль скриптов story-continuity, сам ничего не считает.

Его импортируют knowledge.mjs, merges.mjs, timeline.mjs и facts.mjs:
  args()       флаги --story, --runs, --json, --help
  load(ref)    история, прогоны бота как у story:lint (seed 1, lint.runs.full), facts.md истории
  factsIn()    факты строки: имена героев, ЧЧ:ММ, слова реестра facts.md — как в проверке C-51

Запускать нужно сами скрипты: node \${CLAUDE_SKILL_DIR}/scripts/<скрипт>.mjs --help`;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) { console.log(HELP); process.exit(0); }

/** Флаги скрипта: { has(k), opt(k), refs, runs, json }. Справку печатает сам скрипт. */
export function args(help) {
  const a = process.argv.slice(2);
  if (a.includes('--help') || a.includes('-h')) { console.log(help); process.exit(0); }
  const opt = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  const T = thresholds();
  // История позиционным аргументом — как у story:lint; иначе она молча терялась и считались все истории.
  const valued = new Set(['--story', '--runs', '--node', '--contact']);
  const positional = a.filter((x, i) => !x.startsWith('-') && !valued.has(a[i - 1]));
  const ids = [...(opt('--story') ?? '').split(','), ...positional].filter(Boolean);
  return {
    T, opt, has: (k) => a.includes(k), json: a.includes('--json'),
    refs: storyRefs(ids),
    runs: opt('--runs') ? Number(opt('--runs')) : T.value('lint.runs.full'),
  };
}

/** История, контекст линта с прогонами, facts.md и списки для поиска фактов. */
export function load(ref, T, runs) {
  const story = loadStory(ref);
  const ctx = analyze(story, T, { runs, seed: 1 });
  const facts = loadFacts(story.id);
  const names = [...heroNames(ctx)].filter(([, id]) => !ctx.service.has(id)).map(([name, id]) => ({ key: name.split(/\s+/)[0].slice(0, 4), id, name }));
  return { story, ctx, facts, names, registry: facts?.registry ?? [] };
}

/**
 * Факты строки. who — говорящий: своё имя он не «упоминает». times / names / registry — какие виды искать.
 * @returns {{ fact: string, kind: 'name'|'time'|'registry' }[]}
 */
export function factsIn(text, { names = [], registry = [], who = null, times = true, withNames = true } = {}) {
  const t = String(text).toLowerCase();
  const out = [];
  if (withNames) for (const n of names) if (n.id !== who && t.includes(n.key)) out.push({ fact: n.key, kind: 'name', label: n.name });
  for (const r of registry) if (r.words.some((w) => t.includes(w))) out.push({ fact: r.fact, kind: 'registry', label: r.fact });
  if (times) for (const m of String(text).match(TIME) ?? []) out.push({ fact: m, kind: 'time', label: m });
  return out;
}

export const short = (s, n = 40) => (String(s).length > n ? `${String(s).slice(0, n)}…` : String(s));
export const pct = (x) => `${Math.round(x * 100)} %`;

/** Печать: JSON целиком или человеческий текст. */
export function emit(json, data, human) {
  if (json) console.log(JSON.stringify(data, null, 2));
  else console.log(human());
}
