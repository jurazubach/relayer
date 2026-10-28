// Карточка истории перед выпуском (скилл story-release, R-11, C-49, TH-95): что игрок видит до первой
// реплики — серия и название, tagline, synopsis, затравки, features, число глав и героев, два времени.
// Находки — из самой проверки C-49 на тех же прогонах, что у story:lint (числа совпадают с
// `npm run story:lint -- --only C-49`), два времени — durations.mjs поверх story:sessions. Сверх линта —
// поля карточки для глаз и счёт глав и героев так, как его делает карточка в приложении.
import { fileURLToPath } from 'node:url';
import { loadStory, storyRefs } from '../../../../scripts/lib/story.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';
import { walk } from '../../../../scripts/lib/ink.mjs';
import { lintStory } from '../../../../scripts/lint/core.mjs';
import { plural } from '../../../../scripts/lint/text.mjs';
import C49 from '../../../../scripts/lint/checks/C-49.mjs';
import { durations } from './durations.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/card-check.mjs [<id>] [--story <id|путь>,…] [--no-durations] [--runs N] [--seed N] [--json]

Карточка истории (R-11, C-49): всё, что игрок видит до первой реплики, и чем оно расходится с ink.
  поля       series, title, tagline, synopsis, teasers, features — как есть, для глаз
  счёт       главы: chapters в meta.json против строк #chapter; герои: characters с id без service (так
             считает карточка) против контактов, которые пишут в чат
  C-49       находки проверки по пунктам: (а) числа, (б) спойлер героя, (в) роль игрока, (д) пересказ
             начала, (е) features в тексте, (ж) затравки, (з) обещанные финалы; таблица фактов (г) — в --json
  время      minutes и days против медиан story:sessions (durations.mjs), что карточка покажет
  глазами    вопросы, которые не считает регулярка: действие игрока в tagline, жанр и конфликт в первой
             фразе, тяжёлые темы в features, затравки без поворотов после главы 1 (references/card.md)

  --story          история по id, файл .json или папка; через запятую; по умолчанию все из src/stories
  --no-durations   без двух времён (быстрее: story:sessions не запускается)
  --runs N         прогонов бота для C-49 (по умолчанию lint.runs.full, как у story:lint)
  --seed N         seed (по умолчанию 1, как у story:lint)
  --json           всё данными
  --help           эта справка

Сверка: npm run -s story:lint -- --story <id> --only C-49 даёт те же находки.`;

const PART = [
  ['C-49.card_number', 'а'], ['C-49.spoiler_chapter', 'б'], ['C-49.no_role', 'в'], ['C-49.facts', 'г'],
  ['C-49.synopsis_overlap', 'д'], ['C-49.feature_absent', 'е'], ['C-49.feature_ch1', 'е'],
  ['C-49.teasers', 'ж'], ['C-49.teaser_chapter', 'ж'], ['C-49.teaser_ground', 'ж'], ['C-49.teaser_style', 'ж'],
  ['C-49.endings_min', 'з'],
];
const partOf = (key) => PART.find(([k]) => k === key)?.[1] ?? '?';

export async function cardCheck(ref, { runs, seed = 1, withDurations = true } = {}, T = thresholds()) {
  const story = loadStory(ref);
  let ctx = null;
  const probe = { ...C49, run(c, find) { ctx = c; C49.run(c, find); } };
  const res = await lintStory(story, T, { checks: [probe], runs: runs ?? T.value('lint.runs.full'), seed });
  if (!ctx) return { id: story.id, path: story.path, error: res.findings[0]?.message ?? 'не собралась' };
  const meta = ctx.meta;
  const chapterTags = ctx.tree.chapters.length;
  const writers = new Set();
  for (const k of ctx.tree.knots) walk(k.items, (it) => { if (it.type === 'msg' && it.who) writers.add(it.who); });
  const heroes = (meta.characters ?? []).filter((c) => c.id && !c.service);
  const counts = {
    chapters: { card: meta.chapters?.length ?? 0, ink: chapterTags },
    heroes: {
      card: heroes.length,
      silent: heroes.filter((c) => !writers.has(c.id)).map((c) => c.name ?? c.id),
      missing: [...writers].filter((w) => !ctx.service.has(w) && !(meta.characters ?? []).some((c) => c.id === w)),
    },
  };
  const problems = [];
  if (counts.chapters.card !== counts.chapters.ink) problems.push(`⚠ в chapters ${counts.chapters.card} глав, в ink строк #chapter ${counts.chapters.ink} — карточка покажет «${counts.chapters.card} глав»`);
  if (counts.heroes.silent.length) problems.push(`⚠ на карточке герои, которые не пишут в чат: ${counts.heroes.silent.join(', ')} — их считают в «героев», а игрок их не встретит`);
  if (counts.heroes.missing.length) problems.push(`ℹ пишут в чат, а в characters их нет: ${counts.heroes.missing.join(', ')} — карточка их не посчитает (service: true, если это служебный контакт)`);
  for (const f of ['tagline', 'synopsis', 'features', 'minutes', 'days']) if (meta[f] == null) problems.push(`⚠ нет поля ${f}`);
  if (!Array.isArray(meta.teasers)) problems.push('ℹ нет teasers — карточка без затравок (поле необязательное)');
  const findings = res.findings.map((f) => ({ part: partOf(f.key), key: f.key, level: f.level, node: f.node, message: f.message, ...(f.data ? { data: f.data } : {}) }));
  const time = withDurations ? durations(ref)[0] : null;
  return {
    id: story.id, path: story.path,
    card: { series: meta.series ?? null, title: meta.title ?? null, tagline: meta.tagline ?? null, synopsis: meta.synopsis ?? null, teasers: meta.teasers ?? null, features: meta.features ?? null, free_chapters: meta.free_chapters ?? null, revision: meta.revision ?? 1 },
    counts, problems, findings, durations: time,
  };
}

function print(r) {
  if (r.error) { console.log(`${r.path ?? r.id}: ${r.error}`); return; }
  const c = r.card;
  console.log(`${r.path} · карточка`);
  console.log(`   ${c.series ? `${c.series} · ` : ''}${c.title ?? '(без названия)'} · ревизия ${c.revision}${c.free_chapters ? ` · бесплатно глав: ${c.free_chapters}` : ''}`);
  console.log(`   tagline:  ${c.tagline ?? '—'}`);
  console.log(`   synopsis: ${c.synopsis ?? '—'}`);
  for (const [i, t] of (c.teasers ?? []).entries()) console.log(`   затравка ${i + 1}: ${t}`);
  for (const f of c.features ?? []) console.log(`   · ${f}`);
  console.log(`   счёт: глав ${r.counts.chapters.card} (в ink ${r.counts.chapters.ink}), героев ${r.counts.heroes.card}`);
  for (const p of r.problems) console.log(`   ${p}`);
  const shown = r.findings.filter((f) => f.part !== 'г');
  console.log(`\n   C-49: ${shown.length ? plural(shown.length, 'находка', 'находки', 'находок') : 'находок нет'}${r.findings.some((f) => f.part === 'г') ? ' (таблица фактов (г) — в --json)' : ''}`);
  for (const f of shown) console.log(`   ℹ (${f.part}) ${f.message}`);
  if (r.durations) {
    const d = r.durations;
    if (d.error) console.log(`\n   время: ${d.error}`);
    else {
      console.log(`\n   время: по клику ${Math.round(d.personas[0].click_min)} мин, реальное ${Math.round(d.personas[0].real_h)} ч → "minutes": ${d.propose.minutes}, "days": ${d.propose.days} («${d.shows.realtime}»)${d.matches ? ' — как на карточке' : ''}`);
      for (const p of d.problems) console.log(`   ${p}`);
    }
  }
  console.log('\n   глазами (references/card.md): в tagline — действие игрока или ядро; в первой фразе synopsis — жанр и конфликт;');
  console.log('   тяжёлые темы названы в features; затравки — завязка и глава 1, без поворотов, виновников и финалов.\n');
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) { console.log(HELP); return; }
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const VALUED = new Set(['--story', '--runs', '--seed']);
  const positional = args.filter((a, i) => !a.startsWith('--') && !VALUED.has(args[i - 1]));
  const refs = storyRefs([...(opt('--story') ?? '').split(','), ...positional].filter(Boolean));
  const out = [];
  for (const ref of refs) out.push(await cardCheck(ref, { runs: opt('--runs') ? Number(opt('--runs')) : undefined, seed: Number(opt('--seed') ?? 1), withDurations: !args.includes('--no-durations') }));
  if (args.includes('--json')) console.log(JSON.stringify(out, null, 2));
  else out.forEach(print);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
