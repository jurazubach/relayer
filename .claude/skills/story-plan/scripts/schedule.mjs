// Расписание пауз по главам в обоих режимах (references/schedule.md). Обёртка: время, сессии и метки
// «спустя …» — из story:sessions --json; пределы длины, первая пауза, темп к развязке и хвост — проверки
// story:lint C-31, C-32, C-38, C-42 (на скелете их запускаем сами: --plan их пропускает, а расписание пауз
// и есть план). Своё здесь только то, чего команды не считают: стык глав, тёмная ночь перед последней главой
// (R-33) и кнопки по главам (R-42).
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from '../../../../scripts/lib/compile.mjs';
import { play, seeded } from '../../../../scripts/lib/bot.mjs';
import { nodeIds } from '../../../../scripts/lib/ink.mjs';
import { compileInput, loadStory, parseStory } from '../../../../scripts/lib/story.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';
import { lintStory } from '../../../../scripts/lint/core.mjs';

const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/schedule.mjs (--story <id> | --file <путь>) [--runs N] [--json]

Расписание пауз по главам в обоих режимах (скилл story-plan; R-33, R-42; время и режимы — story-time):
  по главам     стык (пауза перед первой строкой главы), паузы внутри главы, самая длинная, реальное время
                и время по клику на срединном прохождении story:sessions, метки «спустя …» по клику,
                медиана нажатых кнопок за главу против skill.plan.chapter.buttons (R-42)
  тёмная ночь   пауза перед последней главой не короче skill.plan.dark_night_h (R-33), если глав три и больше
  проверки      C-31 (длина: story.length.target_h, story.length.max_h, story.pause.max_h), C-32 (первая
                длинная пауза и напоминания), C-38 (паузы последней главы против середины: C-38.last_tempo;
                пропорции глав), C-42 (хвост после последней кнопки: story.tail.max_delay_min) — как в story:lint
Числа времени — из story:sessions, находки — из story:lint; скрипт их не пересчитывает.

  --story <id>  скелет истории (docs/stories/<id>/plans/skeleton.ink); нет скелета — история src/stories/<id>
  --file <путь> любой .ink / .json / папка истории
  --runs N      прогонов (по умолчанию bot.runs)
  --json        всё данными
  --help        эта справка`;

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const T = thresholds();
const fmt = (s) => (s == null ? '—' : s >= 3600 ? `${+(s / 3600).toFixed(1)} ч` : s >= 60 ? `${Math.round(s / 60)} мин` : `${Math.round(s)} с`);
const median = (xs) => { if (!xs.length) return 0; const a = [...xs].sort((x, y) => x - y); const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };

export function resolveRef(id, file) {
  if (file) return file;
  for (const f of ['plans/skeleton.ink', 'skeleton.ink']) if (existsSync(join(ROOT, 'docs/stories', id, f))) return join('docs/stories', id, f);
  return id;
}

/** Нажатия кнопок по главам: бот случайно, медиана по прогонам (журнал play из scripts/lib). */
function pressesByChapter(story, runs) {
  const built = compile(compileInput(story));
  if (!built.ok) return null;
  const tree = parseStory(story);
  const chapterOf = new Map(tree.knots.map((k) => [k.id, k.chapter]));
  const nodes = nodeIds(tree);
  const per = new Map();
  const rng = seeded(1);
  for (let r = 0; r < runs; r++) {
    const res = play(built.json, { rng, nodes, trackVars: false });
    const counts = new Map();
    let ch = 0;
    for (const e of res.events) {
      if (e.type === 'knot') ch = chapterOf.get(e.id) ?? chapterOf.get(String(e.id).split('.')[0]) ?? ch;
      if (e.type === 'choice' && e.picked !== -1) counts.set(ch, (counts.get(ch) ?? 0) + 1);
    }
    for (const c of new Set([...chapterOf.values()].filter((x) => x > 0))) {
      if (!per.has(c)) per.set(c, []);
      per.get(c).push(counts.get(c) ?? 0);
    }
  }
  return new Map([...per].map(([c, xs]) => [c, median(xs)]));
}

export async function schedule(ref, { runs = T.value('bot.runs') } = {}) {
  const story = loadStory(ref);
  const out = { path: story.path, chapters: [], problems: [], lint: [], dark_night: null, real: null, click: null };
  let s;
  try {
    const cmd = [join(ROOT, 'scripts/story/sessions.mjs'), '--story', ref, '--json', '--runs', String(runs)];
    s = JSON.parse(execFileSync(process.execPath, cmd, { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })).stories[0];
  } catch (e) {
    out.error = `нет данных: npm run story:sessions -- --story ${ref} --json (${String(e.message).split('\n')[0]})`;
    return out;
  }
  const p = s.personas[0];
  out.real = p.real; out.click = p.click; out.tail = p.tail; out.max_pause = p.maxPause; out.card = s.card;
  out.problems = (s.problems?.[p.persona] ?? []).map(String);
  const m = p.middle;
  const tree = parseStory(story);
  const entry = new Map();
  for (const k of tree.knots) if (k.chapter > 0 && !entry.has(k.chapter)) entry.set(k.chapter, k.id);
  const longS = T.value('story.pause.session_s');
  const presses = pressesByChapter(story, Math.min(runs, T.value('bot.runs')));
  const jumps = m.jumps ?? [];
  for (const c of m.chapters) {
    const ses = m.sessions.filter((x) => x.chapter === c.chapter && x.pauseBefore > 0);
    const seam = ses.find((x) => x.knot === entry.get(c.chapter) || String(x.knot).split('.')[0] === entry.get(c.chapter));
    const inside = ses.filter((x) => x !== seam && x.pauseBefore >= longS);
    out.chapters.push({
      chapter: c.chapter,
      seam: c.chapter > 1 && seam ? seam.pauseBefore : null,
      inside: inside.length,
      longest_inside: inside.length ? Math.max(...inside.map((x) => x.pauseBefore)) : 0,
      pauses: c.pauses, real: c.real, click: c.click,
      jumps: jumps.filter((j) => j.chapter === c.chapter).map((j) => j.label),
      presses: presses?.get(c.chapter) ?? null,
    });
  }
  const last = out.chapters.at(-1);
  if (out.chapters.length >= 3 && last) {
    const need = T.value('skill.plan.dark_night_h') * 3600;
    out.dark_night = { chapter: last.chapter, seconds: last.seam, ok: (last.seam ?? 0) >= need, need };
  }
  const { min, max } = T.value('skill.plan.chapter.buttons');
  for (const c of out.chapters) c.presses_ok = c.presses == null ? null : c.presses >= min && c.presses <= max;
  try {
    const lint = await lintStory(story, T, { only: ['C-31', 'C-32', 'C-38', 'C-42'], runs, seed: 1 });
    out.lint = lint.findings.map((f) => ({ check: f.check, level: f.level, node: f.node, message: f.message }));
  } catch (e) {
    out.lint_error = `нет данных: npm run story:lint -- --only C-31,C-32,C-38,C-42 (${e.message.split('\n')[0]})`;
  }
  out.seed = m.seed;
  return out;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  if (args.includes('--help') || args.includes('-h') || (!opt('--story') && !opt('--file'))) { console.log(HELP); process.exit(0); }
  const ref = resolveRef(opt('--story'), opt('--file'));
  const r = await schedule(ref, { runs: opt('--runs') ? Number(opt('--runs')) : undefined });
  if (args.includes('--json')) { console.log(JSON.stringify(r, null, 1)); process.exit(0); }
  if (r.error) { console.log(`${r.path}: ${r.error}`); process.exit(0); }
  const { min, max } = T.value('skill.plan.chapter.buttons');
  console.log(`${r.path} · реальное время: медиана ${fmt(r.real.median)} (от ${fmt(r.real.min)} до ${fmt(r.real.max)}) · по клику: ${fmt(r.click.median)} · самая длинная пауза ${fmt(r.max_pause.median)} в ${r.max_pause.knot ?? '—'} · после последней кнопки ${fmt(r.tail.median)}`);
  console.log(`   срединное прохождение (seed ${r.seed}); стык — пауза перед первой строкой главы; кнопки — медиана нажатий бота (${min}–${max}, skill.plan.chapter.buttons)`);
  console.log('   глава  стык     внутри  длиннейшая  паузы    реальное  по клику  «спустя» по клику     кнопки');
  for (const c of r.chapters) {
    console.log(`   гл.${String(c.chapter).padEnd(3)} ${fmt(c.seam).padEnd(8)} ${String(c.inside).padEnd(7)} ${fmt(c.longest_inside || null).padEnd(11)} ${fmt(c.pauses).padEnd(8)} ${fmt(c.real).padEnd(9)} ${fmt(c.click).padEnd(9)} ${(c.jumps.join(', ') || '—').padEnd(21)} ${c.presses ?? '—'}${c.presses_ok === false ? ' ⚠' : ''}`);
  }
  if (r.dark_night) console.log(`   тёмная ночь (R-33): пауза перед гл.${r.dark_night.chapter} — ${fmt(r.dark_night.seconds)}${r.dark_night.ok ? ' ✓' : ` ⚠ короче ${fmt(r.dark_night.need)} (skill.plan.dark_night_h)`}`);
  for (const x of r.problems) console.log(`   ${x}`);
  for (const f of r.lint) console.log(`   ${f.level === 'error' ? '✗' : f.level === 'warning' ? '⚠' : 'ℹ'} ${f.check} · ${f.node ?? 'история'} · ${f.message}`);
  if (r.lint_error) console.log(`   ${r.lint_error}`);
}
