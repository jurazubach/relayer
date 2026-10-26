// review-cache — шаг 2 ревью: story:lint истории один раз на ревизию ink и папка прогона, куда складываются
// ответы аудиторов, холодного читателя, QA и тестеров. Ключ — хэш текста истории, порогов и кода проверок:
// пока он тот же, повторное ревью не гоняет бота заново и видит, какие линзы уже разобраны.
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { runCli, table } from '../../../../scripts/story/core/cli.mjs';
import { CACHE_DIR, LENS_IDS, inputs, prepare, rel } from './review-core.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/review-cache.mjs --story <id> [--partial | --plan [путь]] [--fresh] [--json]
node \${CLAUDE_SKILL_DIR}/scripts/review-cache.mjs --story <id> --list
node \${CLAUDE_SKILL_DIR}/scripts/review-cache.mjs --story <id> --prune

Прогоняет npm run story:lint -- --story <id> --json (с --partial или --plan, как просили) и кладёт вывод в
папку прогона .story-review/<id>/<режим>-<ключ>/ (вне git). Ключ — хэш ink (или скелета),
meta.json, thresholds.json и кода scripts/lint: та же ревизия — тот же вывод, бот не гоняется второй раз.

Печатает: папку прогона, счёт находок по уровням, линзам (owner из owners.md §3) и главам, и какие ответы
уже лежат в папке (lens-<скилл>.md, cold-*.md, qa-six.md, human-*.md). Ответы туда пишет главная сессия:
merge-findings.mjs читает их оттуда.

  --story <id>   история по id, папка или .json
  --partial      набор с beta_stop: без проверок, которым нужна вся история
  --plan [путь]  скелет: docs/stories/<id>/skeleton.ink, plans/skeleton.ink или путь
  --fresh        прогнать story:lint заново, даже если ключ тот же
  --list         прогоны этой истории в кэше: ключ, дата, сколько ответов
  --prune        удалить прогоны этой истории, кроме текущего ключа
  --json         то же данными`;

function counts(findings, key) {
  const m = new Map();
  for (const f of findings) {
    const k = f[key] ?? '—';
    if (!m.has(k)) m.set(k, { error: 0, warning: 0, hint: 0 });
    m.get(k)[f.level] += 1;
  }
  return m;
}

await runCli(HELP, async (args) => {
  if (args.has('list') || args.has('prune')) {
    const ctx = prepare(args, { needLint: false });
    const base = join(CACHE_DIR, ctx.id);
    const runs = existsSync(base) ? readdirSync(base) : [];
    if (args.has('prune')) {
      const gone = runs.filter((r) => r !== ctx.key);
      for (const r of gone) rmSync(join(base, r), { recursive: true, force: true });
      console.log(`удалено прогонов: ${gone.length}; оставлен ${ctx.key}`);
      return 0;
    }
    const rows = runs.map((r) => [r === ctx.key ? `▶ ${r}` : `  ${r}`, inputs(join(base, r)).length, existsSync(join(base, r, 'merged.json')) ? 'да' : '—']);
    if (args.has('json')) console.log(JSON.stringify({ story: ctx.id, current: ctx.key, runs }, null, 1));
    else console.log(table(rows, ['прогон (▶ — текущая ревизия)', 'ответов', 'сведено']));
    return 0;
  }

  const ctx = prepare(args, { fresh: args.has('fresh') });
  const f = ctx.lint.findings;
  const lv = { error: 0, warning: 0, hint: 0 };
  for (const x of f) lv[x.level] += 1;
  const owners = counts(f, 'owner');
  const chapters = counts(f, 'chapter');
  const have = inputs(ctx.dir);
  const data = {
    story: ctx.id, mode: ctx.mode, key: ctx.key, dir: rel(ctx.dir), cached: ctx.cached, runs: ctx.lint.runs,
    total: f.length, levels: lv, suppressed: (ctx.lint.suppressed ?? []).length,
    owners: Object.fromEntries(owners), chapters: Object.fromEntries(chapters),
    inputs: have.map((i) => ({ name: i.name, kind: i.kind, lens: i.lens })),
  };
  if (args.has('json')) { console.log(JSON.stringify(data, null, 1)); return 0; }
  console.log(`story-review · ${ctx.id} · режим ${ctx.mode} · ключ ${ctx.key}${ctx.cached ? ' (из кэша)' : ' (story:lint прогнан)'}`);
  console.log(`папка прогона: ${data.dir}`);
  console.log(`story:lint: ${f.length} находок — ошибок ${lv.error}, предупреждений ${lv.warning}, подсказок ${lv.hint}; погашено // намеренно: ${data.suppressed}`);
  const row = ([k, c]) => [k, c.error, c.warning, c.hint];
  console.log('\nпо линзам (owner):');
  console.log(table([...owners].sort((a, b) => LENS_IDS.indexOf(a[0]) - LENS_IDS.indexOf(b[0])).map(row), ['линза', 'ошибки', 'предупр.', 'подсказки']));
  console.log('\nпо главам (— — вся история):');
  console.log(table([...chapters].sort((a, b) => (a[0] === '—') - (b[0] === '—') || Number(a[0]) - Number(b[0])).map(row), ['глава', 'ошибки', 'предупр.', 'подсказки']));
  console.log(`\nответы в папке: ${have.length ? have.map((i) => i.name).join(', ') : 'нет'}`);
  return 0;
});
