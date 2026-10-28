// Ревизия перед выпуском (скилл story-release, TH-99, E-04): ломает ли правка сохранения игроков и поднята
// ли revision. Сохранение помнит ревизию; другая ревизия — прогресс сбрасывается с предупреждением
// (capabilities.json revision). Поднимать её — только когда старое состояние ink не подходит к новому:
// убраны или переименованы узлы, переменные, изменились выборы узла. Опечатку правят без неё.
// Сравнение — с тегом прошлого выпуска <id>-rN (план §7) или с ревизией --from; история на ревизии берётся
// так же, как у story:diff (scripts/story/core/revisions.mjs).
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadStory, parseStory, storyRefs } from '../../../../scripts/lib/story.mjs';
import { walk } from '../../../../scripts/lib/ink.mjs';
import { describeRef, storyAt } from '../../../../scripts/story/core/revisions.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/revision-check.mjs [<id>] [--story <id>,…] [--from <тег|коммит>] [--json]

Ломает ли правка сохранения и что делать с revision (meta.json). Сравнивает историю с прошлым выпуском:
по умолчанию — последний тег <id>-rN (git tag), иначе --from <ревизия>. Без тега и --from — первый выпуск:
тег поставить после выпуска.
  ломает   убран или переименован узел или stitch; убрана переменная VAR или сменился её тип; у узла
           изменилось число выборов — старое состояние ink к новому тексту не подходит
  не ломает  новые узлы и переменные, правка текста реплик и кнопок
Вердикт: ✗ сохранения ломаются, а revision не выше прошлой; ℹ revision поднята без ломки — игроки потеряют
прогресс зря; ✓ всё сходится. Для журнала изменений — главы и узлы, которые поменялись.

  --story  история по id из src/stories (через запятую; по умолчанию все)
  --from   тег, ветка или коммит прошлого выпуска вместо последнего <id>-rN
  --json   всё данными
  --help   эта справка`;

const git = (args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

/** Последний тег выпуска <id>-rN по номеру. */
export function lastReleaseTag(id) {
  try {
    const tags = git(['tag', '--list', `${id}-r*`]).split('\n').filter((t) => new RegExp(`^${id}-r\\d+$`).test(t));
    return tags.sort((a, b) => Number(b.split('-r').pop()) - Number(a.split('-r').pop()))[0] ?? null;
  } catch { return null; }
}

/** Что из структуры ink помнит сохранение: узлы, переменные с типом, число выборов в узле, глава узла. */
function shape(story) {
  const tree = parseStory(story);
  const knots = new Map();
  for (const k of tree.knots) {
    let choices = 0;
    const text = [];
    walk(k.items, (it) => { if (it.type === 'choice') choices++; if (it.text) text.push(it.text); });
    knots.set(k.id, { choices, chapter: k.chapter, text: text.join('\n') });
  }
  const typeOf = (v) => (/^(true|false)$/.test(v) ? 'bool' : /^-?\d/.test(v) ? 'number' : /^"/.test(v) ? 'string' : 'other');
  const vars = new Map(tree.vars.filter((v) => v.kind === 'VAR').map((v) => [v.name, typeOf(String(v.value).trim())]));
  return { knots, vars, revision: story.meta?.revision ?? 1 };
}

export function compareShapes(before, after) {
  const breaks = [];
  for (const id of before.knots.keys()) if (!after.knots.has(id)) breaks.push(`убран узел ${id}`);
  for (const [name, type] of before.vars) {
    if (!after.vars.has(name)) breaks.push(`убрана переменная ${name}`);
    else if (after.vars.get(name) !== type) breaks.push(`переменная ${name}: ${type} → ${after.vars.get(name)}`);
  }
  for (const [id, k] of before.knots) {
    const now = after.knots.get(id);
    if (now && now.choices !== k.choices) breaks.push(`${id}: выборов ${k.choices} → ${now.choices}`);
  }
  const added = [...after.knots.keys()].filter((id) => !before.knots.has(id));
  const changed = [...after.knots].filter(([id, k]) => before.knots.has(id) && before.knots.get(id).text !== k.text).map(([id]) => id);
  const chapters = [...new Set([...added, ...changed].map((id) => after.knots.get(id)?.chapter).filter((c) => c != null))].sort((a, b) => a - b);
  return { breaks, added, changed, chapters };
}

export function revisionCheck(ref, { from } = {}) {
  const now = loadStory(ref);
  const id = now.id;
  const tag = from ?? lastReleaseTag(id);
  const after = shape(now);
  if (!tag) return { id, path: now.path, from: null, revision: after.revision, verdict: 'first', message: `прошлого выпуска нет (тега ${id}-rN нет): после выпуска — git tag ${id}-r${after.revision}` };
  const tmp = mkdtempSync(join(tmpdir(), 'relayer-revision-'));
  try {
    let rev;
    try { rev = describeRef(tag); } catch (e) { return { id, path: now.path, from: tag, error: e.message }; }
    const old = storyAt(rev, id, tmp);
    if (!old) return { id, path: now.path, from: tag, revision: after.revision, verdict: 'first', message: `на ${tag} истории ${id} нет — это первый выпуск` };
    const before = shape(loadStory(old));
    const diff = compareShapes(before, after);
    const raised = after.revision > before.revision;
    let verdict;
    if (after.revision < before.revision) verdict = 'lower';
    else if (diff.breaks.length && !raised) verdict = 'bump';
    else if (!diff.breaks.length && raised) verdict = 'needless';
    else verdict = 'ok';
    const message = {
      lower: `revision ${after.revision} ниже, чем на ${tag} (${before.revision}) — так нельзя: сохранения сочтут чужими`,
      bump: `правка ломает сохранения, а revision та же (${after.revision}) — поднять до ${before.revision + 1}`,
      needless: `revision поднята (${before.revision} → ${after.revision}), а сохранения не ломаются — игроки потеряют прогресс зря`,
      ok: raised ? `сохранения ломаются, revision поднята (${before.revision} → ${after.revision})` : `сохранения не ломаются, revision ${after.revision} — как была`,
    }[verdict];
    return { id, path: now.path, from: tag, revision: after.revision, before: before.revision, verdict, message, ...diff, tag_next: `${id}-r${after.revision}` };
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

function print(r) {
  if (r.error) { console.log(`${r.path}: нет данных: ${r.error}`); process.exitCode = 1; return; }
  const mark = { first: 'ℹ', ok: '✓', needless: 'ℹ', bump: '✗', lower: '✗' }[r.verdict];
  console.log(`${r.path} · ревизия ${r.revision}${r.from ? ` · против ${r.from}` : ''}`);
  console.log(`   ${mark} ${r.message}`);
  for (const b of r.breaks ?? []) console.log(`     ломает: ${b}`);
  if (r.chapters?.length) console.log(`   журнал: изменены главы ${r.chapters.join(', ')}; узлов новых ${r.added.length}, с правкой текста ${r.changed.length}`);
  if (r.tag_next && r.verdict !== 'bump' && r.verdict !== 'lower') console.log(`   после выпуска: git tag ${r.tag_next}`);
  console.log('');
  if (r.verdict === 'bump' || r.verdict === 'lower') process.exitCode = 1;
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) { console.log(HELP); return; }
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const VALUED = new Set(['--story', '--from']);
  const positional = args.filter((a, i) => !a.startsWith('--') && !VALUED.has(args[i - 1]));
  const refs = storyRefs([...(opt('--story') ?? '').split(','), ...positional].filter(Boolean));
  const out = refs.map((ref) => revisionCheck(ref, { from: opt('--from') }));
  if (args.includes('--json')) { console.log(JSON.stringify(out, null, 2)); if (out.some((r) => r.error || r.verdict === 'bump' || r.verdict === 'lower')) process.exitCode = 1; }
  else out.forEach(print);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
