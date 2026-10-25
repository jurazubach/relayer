// Карта состава: уровень контакта из `npm run story:cast` (те же числа), карточка из meta.json (role, about, служебные
// voice / arc), находки C-21, C-45, C-50 из `npm run story:lint` и инициатива по главам (R-79): в какой доле прогонов
// контакт хоть раз пишет первым — не в ответ на кнопку к нему. Команды запускаются как есть и разбираются из --json,
// поэтому уровни и находки совпадают с ними до знака.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadStory, storyRefs } from '../../../../scripts/lib/story.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';
import { analyze } from '../../../../scripts/lint/core.mjs';
import { isIncoming } from '../../../../scripts/lint/journal.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/cast-map.mjs [--story <id|путь>,…] [--runs N] [--json]

Карта состава для скилла story-cast (tiers.md, character-card.md):
  уровень     ось / сторона / источник / фон / эпизодический — из npm run story:cast (правило там: --help)
  role        функция из characters[].role; «—» — нет карточки или поля (R-76)
  about       есть ли about; voice, arc — служебные поля карточки (игрок их не видит)
  первым      по главам присутствия: доля прогонов, где контакт хоть раз начинает разговор сам — первая
              его реплика после кнопки другому, без кнопки или после паузы от story.pause.session_s (R-79)
  находки     C-21, C-45, C-50 из npm run story:lint, где упомянут контакт

Пометки карты (суждение модели — после сверки с ink):
  ! role повторяется у двух контактов уровня ось / сторона / источник (dille-ultimate-guide:RED-06)
  ! ось или сторона без role или about (R-76)
  ! ось или сторона, которая в главе почти не пишет первой: в большинстве прогонов ни разу (R-79; то же
    большинство прогонов, что у C-45.reactive)

  --story     история по id, файл .json / .ink или папка; через запятую; по умолчанию все из src/stories
  --runs N    прогонов бота (по умолчанию bot.runs — как у story:cast и story:lint)
  --json      всё данными
  --help      эта справка`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const T = thresholds();
const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const runs = opt('--runs') ? Number(opt('--runs')) : T.value('bot.runs');
const MAIN = new Set(['ось', 'сторона', 'источник']);

/** Команда проекта с --json; упала — null, и отчёт пишет «нет данных: <команда>». */
function json(script, extra) {
  const r = spawnSync(process.execPath, [script, ...extra, '--json'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
  try { return r.status === 0 ? JSON.parse(r.stdout) : null; } catch { return null; }
}

/** Чья находка: первый упомянутый контакт; находка о нескольких сразу (C-21 по главе) — общая. */
function primary(f, ids) {
  if (f.data?.contacts) return null;
  const at = ids.map((id) => [id, f.message.search(new RegExp(`(?<![\\p{L}\\p{N}_])${id}(?![\\p{L}\\p{N}_])`, 'u'))]).filter(([, i]) => i >= 0);
  return at.sort((a, b) => a[1] - b[1])[0]?.[0] ?? null;
}
const normRole = (s) => String(s ?? '').toLowerCase().replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();

/** Инициатива по главам: глава → доля прогонов, где контакт хоть раз заговорил первым. */
function initiative(ctx, ids) {
  const session = T.value('story.pause.session_s');
  const per = new Map(ids.map((id) => [id, new Map()]));
  for (const run of ctx.runs) {
    const first = new Map();
    let lastTo = null;
    let quiet = 0;
    let prev = null;
    for (const item of run.seq) {
      if (item.type === 'choice') { lastTo = item.tos[item.picked]; quiet = 0; prev = null; continue; }
      quiet += item.delay ?? 0;
      if (!isIncoming(item) || !item.who || !per.has(item.who)) { if (isIncoming(item)) prev = item.who; continue; }
      const start = prev !== item.who;
      prev = item.who;
      if (!start) continue;
      const key = `${item.who}|${item.chapter}`;
      if (!first.has(key)) first.set(key, false);
      if (lastTo !== item.who || quiet >= session) first.set(key, true);
    }
    for (const [key, own] of first) {
      const [id, ch] = key.split('|');
      const m = per.get(id);
      const c = m.get(ch) ?? { runs: 0, own: 0 };
      c.runs++;
      if (own) c.own++;
      m.set(ch, c);
    }
  }
  return Object.fromEntries([...per].map(([id, m]) => [id, Object.fromEntries([...m].map(([ch, c]) => [ch, c.own / c.runs]))]));
}

const report = [];
for (const ref of storyRefs((opt('--story') ?? '').split(',').filter(Boolean))) {
  const story = loadStory(ref);
  const castCmd = `npm run story:cast -- --story ${ref} --runs ${runs} --json`;
  const lintCmd = `npm run story:lint -- --story ${ref} --only C-21,C-45,C-50 --json`;
  const cast = json('scripts/story/cast.mjs', ['--story', ref, '--runs', String(runs)])?.stories?.[0];
  const lint = json('scripts/lint/lint.mjs', ['--story', ref, '--only', 'C-21,C-45,C-50', '--runs', String(runs)])?.stories?.[0];
  if (!cast) { report.push({ id: story.id, path: story.path, error: `нет данных: ${castCmd}` }); continue; }
  const chars = new Map((story.meta.characters ?? []).filter((c) => c.id).map((c) => [c.id, c]));
  const ctx = analyze(story, T, { runs, seed: 1 });
  const lead = cast.cast.filter((c) => c.level === 'ось' || c.level === 'сторона').map((c) => c.id);
  const init = ctx.built.ok ? initiative(ctx, lead) : {};
  const findings = lint?.findings ?? [];
  const ids = cast.cast.map((c) => c.id);
  const rows = cast.cast.map((c) => {
    const card = chars.get(c.id);
    const own = findings.filter((f) => primary(f, ids) === c.id);
    return {
      id: c.id, name: c.name, level: c.level, why: c.why, lines: c.lines, buttons: c.buttons, chapters: c.chapters,
      role: card?.role ?? null, about: Boolean(card?.about), voice: Boolean(card?.voice), arc: Boolean(card?.arc), service: Boolean(card?.service || ctx.service.has(c.id)),
      initiative: init[c.id] ?? null, findings: own.map((f) => ({ key: f.key, node: f.node, chapter: f.chapter, message: f.message })),
    };
  });
  const flags = [];
  const byRole = new Map();
  for (const r of rows.filter((x) => MAIN.has(x.level) && x.role)) {
    const k = normRole(r.role);
    byRole.set(k, [...(byRole.get(k) ?? []), r.id]);
  }
  for (const [role, ids] of byRole) if (ids.length > 1) flags.push({ rule: 'dille-ultimate-guide:RED-06', ids, message: `одна функция «${role}» у ${ids.join(', ')}` });
  for (const r of rows.filter((x) => lead.includes(x.id))) {
    if (!r.role || !r.about) flags.push({ rule: 'R-76', ids: [r.id], message: `${r.id} (${r.level}) без ${!r.role ? 'role' : 'about'}` });
    const weak = Object.entries(r.initiative ?? {}).filter(([, s]) => s * 2 < 1).map(([ch]) => ch);
    if (weak.length) flags.push({ rule: 'R-79', ids: [r.id], message: `${r.id} почти не пишет первым в главах ${weak.join(', ')}` });
  }
  const general = findings.filter((f) => !primary(f, ids));
  report.push({ id: story.id, path: story.path, runs, levels: cast.levels, contacts: rows, flags, findings: general, lint: lint ? 'ok' : `нет данных: ${lintCmd}` });
}

if (args.includes('--json')) {
  console.log(JSON.stringify({ stories: report, keys: ['cast.episodic_lines', 'cast.main_lines', 'cast.side_buttons', 'cast.side_presence', 'story.pause.session_s'] }, null, 1));
  process.exit(0);
}
const pc = (x) => `${Math.round(x * 100)}%`;
for (const r of report) {
  if (r.error) { console.log(`${r.path}: ${r.error}\n`); continue; }
  console.log(`${r.path} · контактов ${r.contacts.length} · ${Object.entries(r.levels).map(([l, ids]) => `${l} ${ids.length}`).join(' · ')}`);
  for (const c of r.contacts) {
    const card = c.service ? 'служебный' : `role: ${c.role ?? '—'} · about ${c.about ? 'да' : 'нет'}${c.voice ? ' · voice' : ''}${c.arc ? ' · arc' : ''}`;
    const init = c.initiative ? ` · первым: ${Object.entries(c.initiative).map(([ch, s]) => `гл.${ch} ${pc(s)}`).join(', ')}` : '';
    console.log(`   ${c.id.padEnd(10)} ${c.level.padEnd(13)} реплик ${String(c.lines).padStart(4)} · кнопок ${String(c.buttons).padStart(3)} · ${card}${init}`);
    for (const f of c.findings) console.log(`      ${f.key} · ${f.node ?? (f.chapter ? `глава ${f.chapter}` : 'история')} · ${f.message}`);
  }
  for (const f of r.findings) console.log(`   ${f.key} · ${f.node ?? (f.chapter ? `глава ${f.chapter}` : 'история')} · ${f.message}`);
  if (r.lint !== 'ok') console.log(`   ${r.lint}`);
  for (const f of r.flags) console.log(`   ! ${f.message} (${f.rule})`);
  console.log('');
}
