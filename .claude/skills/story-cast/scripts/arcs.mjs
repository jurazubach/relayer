// Дуги (arcs.md): у каждого заметного контакта — первая и последняя реплика одного прохождения (сравнить глазами,
// snyder-save-the-cat:RED-14), видимые признаки перемены: #rename, смена «Вы» на «ты», голос по C-44.static_voice,
// переменная контакта, которую читает финал (ось дуги), и в каких главах её двигают кнопки.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadStory, storyRefs } from '../../../../scripts/lib/story.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';
import { walk } from '../../../../scripts/lib/ink.mjs';
import { analyze } from '../../../../scripts/lint/core.mjs';
import { isIncoming } from '../../../../scripts/lint/journal.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/arcs.mjs [--story <id|путь>,…] [--runs N] [--json]

Дуги персонажей для скилла story-cast (arcs.md). Контакты уровня ось / сторона / источник из
npm run story:cast (реплик не меньше cast.main_lines или ось):
  первая / последняя   первая и последняя реплика контакта в прохождении seed 1 — совпадают по смыслу,
                       значит дуги нет (snyder-save-the-cat:RED-14); судит модель
  #rename              смена имени контакта: узел и глава (procedural-storytelling:P-09)
  «Вы» → «ты»          доля реплик с «Вы» в первой и второй половине его реплик прохождения
  голос                C-44.static_voice из npm run story:lint: голос одинаков от первой главы до последней
  ось                  переменные контакта, которые читает финал (story:cast), и главы, где их пишут
  ! — ни одного видимого признака перемены: нет #rename, нет смены «Вы», голос неподвижен или не
      измерен; первая и последняя реплика — для сверки глазами

  --story     история по id, файл .json / .ink или папка; через запятую; по умолчанию все из src/stories
  --runs N    прогонов бота для story:cast и story:lint (по умолчанию bot.runs)
  --json      всё данными
  --help      эта справка`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const T = thresholds();
const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const runs = opt('--runs') ? Number(opt('--runs')) : T.value('bot.runs');
const FORMAL = /(?<![\p{L}])(Вы|Вас|Вам|Вами|Ваш\p{L}*)(?![\p{L}])/u;

function json(script, extra) {
  const r = spawnSync(process.execPath, [script, ...extra, '--json'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
  try { return r.status === 0 ? JSON.parse(r.stdout) : null; } catch { return null; }
}

const report = [];
for (const ref of storyRefs((opt('--story') ?? '').split(',').filter(Boolean))) {
  const story = loadStory(ref);
  const cast = json('scripts/story/cast.mjs', ['--story', ref, '--runs', String(runs)])?.stories?.[0];
  if (!cast) { report.push({ id: story.id, path: story.path, error: `нет данных: npm run story:cast -- --story ${ref} --json` }); continue; }
  const lint = json('scripts/lint/lint.mjs', ['--story', ref, '--only', 'C-44', '--runs', String(runs)])?.stories?.[0];
  const ctx = analyze(story, T, { runs: 1, seed: 1 });
  if (!ctx.built.ok) { report.push({ id: story.id, path: story.path, error: 'нет данных: история не компилируется (npm run story:lint)' }); continue; }
  const renames = new Map();
  for (const k of ctx.tree.knots) {
    walk(k.items, (it) => {
      const r = it.tags?.rename;
      if (!r) return;
      const id = String(r).split(',')[0].trim();
      renames.set(id, [...(renames.get(id) ?? []), { node: k.id, chapter: ctx.st.chapterOf(k.id), to: String(r).split(',').slice(1).join(',').trim() }]);
    });
  }
  const sample = ctx.runs[0]?.lines ?? [];
  const minLines = T.value('cast.main_lines');
  const rows = cast.cast.filter((c) => !ctx.service.has(c.id) && (c.level === 'ось' || (['сторона', 'источник'].includes(c.level) && c.lines >= minLines))).map((c) => {
    const said = sample.filter((l) => isIncoming(l) && l.who === c.id && l.text.trim());
    const half = Math.ceil(said.length / 2);
    const formal = (xs) => (xs.length ? xs.filter((l) => FORMAL.test(l.text)).length / xs.length : null);
    const register = { first: formal(said.slice(0, half)), second: formal(said.slice(half)) };
    const switched = register.first != null && register.second != null && register.first > 0 && register.second === 0;
    const frozen = (lint?.findings ?? []).find((f) => f.key === 'C-44.static_voice' && f.message.startsWith(`${c.id} `));
    const measured = c.lines >= T.value('C-44.min_lines') && c.chapters.length >= 2;
    const axis = c.finalVars.map((v) => ({ name: v, chapters: [...new Set((ctx.st.vars.index.get(v)?.writes ?? []).map((w) => w.chapter))].sort((a, b) => a - b) }));
    const signs = [renames.has(c.id) && '#rename', switched && '«Вы» → «ты»', measured && lint && !frozen && 'голос меняется (C-44)'].filter(Boolean);
    return {
      id: c.id, name: c.name, level: c.level, lines: c.lines, chapters: c.chapters,
      first: said[0]?.text ?? null, last: said.at(-1)?.text ?? null, renames: renames.get(c.id) ?? [], register,
      voice: !lint ? 'нет данных: npm run story:lint -- --only C-44' : !measured ? 'не измерен' : frozen ? 'неподвижен' : 'меняется', axis, signs, flat: !signs.length,
    };
  });
  report.push({ id: story.id, path: story.path, contacts: rows });
}

if (args.includes('--json')) {
  console.log(JSON.stringify({ stories: report, keys: ['cast.main_lines', 'C-44.min_lines', 'C-44.static_voice'] }, null, 1));
  process.exit(0);
}
const pc = (x) => (x == null ? '—' : `${Math.round(x * 100)}%`);
for (const r of report) {
  if (r.error) { console.log(`${r.path}: ${r.error}\n`); continue; }
  console.log(`${r.path} · заметных контактов ${r.contacts.length}`);
  for (const c of r.contacts) {
    console.log(`   ${c.flat ? '!' : ' '} ${c.id} (${c.level}, реплик ${c.lines}, главы ${c.chapters.join(',')}): ${c.signs.join(', ') || 'видимых признаков перемены нет'}`);
    console.log(`        первая: «${c.first ?? '—'}» · последняя: «${c.last ?? '—'}»`);
    console.log(`        «Вы»: ${pc(c.register.first)} → ${pc(c.register.second)} · голос: ${c.voice}${c.renames.length ? ` · #rename: ${c.renames.map((x) => `${x.node} (гл. ${x.chapter}) → ${x.to}`).join('; ')}` : ''}`);
    if (c.axis.length) console.log(`        ось: ${c.axis.map((a) => `${a.name} (пишут в гл. ${a.chapters.join(',') || '—'})`).join('; ')}`);
  }
  console.log('');
}
