// Две длительности карточки (скилл story-release, TH-98, R-11, A-05): минуты «по клику» и дни в реальном
// времени. Числа — из npm run story:sessions (те же формулы набора и пауз, что в engine.ts): скрипт не
// считает своё время, а округляет медиану и сверяет её с полями minutes и days. Владелец длины и пределов —
// story-time (C-31); здесь — что написать на карточке.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';

const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/durations.mjs [<id>] [--story <id|путь>] [--persona <имя>|all] [--runs N] [--json]

Два числа карточки: minutes (по клику) и days (реальное время), как их видит игрок (R-11, A-05).
Берёт медианы из npm run story:sessions -- --json (паузы #delay, набор и зазоры по engine.ts; по клику
остаются только короткие паузы до C-31.click_delay_max_s) и предлагает значения для meta.json:
  minutes  медиана по клику, округлённая до skill.release.card.minutes_step (не меньше одного шага)
  days     медиана реального времени: от суток — целые дни, меньше — часы в долях дня; так карточка
           и покажет («≈ 2 дня», «≈ 3 ч», src/engine/library.ts daysText)
Сверка с карточкой — во сколько раз медиана расходится с полем (порог story.card.mismatch_ratio, как у
C-31); пределы длины — story.length.target_h, story.length.max_h, story.pause.max_h, story.tail.max_delay_min
(владелец — story-time, references/two-durations.md). С --persona all — разброс по персонам: у
«неотвечающего» реальное время длиннее на напоминания.

  --story    история по id, файл .json или папка (по умолчанию все из src/stories)
  --persona  персона бота (по умолчанию random); all — все
  --runs N   прохождений на персону (по умолчанию bot.runs, как у story:sessions)
  --json     всё данными
  --help     эта справка

Сверка: npm run story:sessions -- --story <id> даёт те же медианы.`;

const H = 3600;

/** Медиана story:sessions → предложение для карточки и сверка с полями. */
export function durations(ref, { persona, runs } = {}, T = thresholds()) {
  const args = ['scripts/story/sessions.mjs', '--json'];
  if (ref) args.push('--story', ref);
  if (persona) args.push('--persona', persona);
  if (runs) args.push('--runs', String(runs));
  const r = spawnSync('node', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
  let data;
  try { data = JSON.parse(r.stdout); } catch { return [{ ref, error: `нет данных: npm run story:sessions -- --story ${ref ?? ''} --json${r.stderr ? ` (${r.stderr.trim().split('\n')[0]})` : ''}` }]; }
  const step = T.value('skill.release.card.minutes_step');
  const ratio = T.value('story.card.mismatch_ratio');
  return data.stories.map((s) => {
    if (s.error || !s.personas) return { id: s.id, path: s.path, error: s.error ?? 'story:sessions без прохождений' };
    const personas = s.personas.map((p) => {
      const clickMin = p.click.median / 60;
      const realH = p.real.median / H;
      return {
        persona: p.persona, runs: p.runs, click_min: clickMin, real_h: realH,
        real_range_h: [p.real.min / H, p.real.max / H], max_pause_h: p.maxPause.max / H, max_pause_knot: p.maxPause.knot,
        tail_min: p.tail.max / 60,
      };
    });
    const base = personas.find((p) => p.persona === 'random') ?? personas[0];
    const minutes = Math.max(step, Math.round(base.click_min / step) * step);
    // карточка округляет так же: от суток — до дней, меньше — до часов (library.ts daysText)
    const days = base.real_h >= 24 ? Math.round(base.real_h / 24) : Math.round(Math.max(1, Math.round(base.real_h)) / 24 * 100) / 100;
    const card = s.card ?? {};
    const off = (have, want) => (have ? Math.max(have / want, want / have) : null);
    const problems = [];
    if (card.minutes == null || card.days == null) problems.push(`⚠ на карточке нет ${[card.minutes == null && 'minutes', card.days == null && 'days'].filter(Boolean).join(' и ')} (C-31.card_missing)`);
    const mOff = off(card.minutes, base.click_min);
    const dOff = off(card.days, base.real_h / 24);
    if (mOff != null && mOff > ratio) problems.push(`⚠ minutes ${card.minutes}, по клику медиана ${Math.round(base.click_min)} мин — расхождение в ${mOff.toFixed(1)} раза (story.card.mismatch_ratio)`);
    if (dOff != null && dOff > ratio) problems.push(`⚠ days ${card.days}, в реальном времени медиана ${(base.real_h / 24).toFixed(2)} дн — расхождение в ${dOff.toFixed(1)} раза (story.card.mismatch_ratio)`);
    if (base.real_h > T.value('story.length.max_h')) problems.push(`✗ история идёт ${Math.round(base.real_h)} ч — больше story.length.max_h: сначала сжать паузы (story-time), потом писать карточку`);
    else if (base.real_h > T.value('story.length.target_h')) problems.push(`⚠ история идёт ${Math.round(base.real_h)} ч — больше story.length.target_h (story-time)`);
    if (base.max_pause_h > T.value('story.pause.max_h')) problems.push(`✗ пауза ${base.max_pause_h.toFixed(1)} ч в ${base.max_pause_knot} больше story.pause.max_h (story-time)`);
    if (base.tail_min > T.value('story.tail.max_delay_min')) problems.push(`⚠ после последней кнопки ждать ${Math.round(base.tail_min)} мин — больше story.tail.max_delay_min (story-endings, C-42)`);
    return {
      id: s.id, path: s.path, card: { minutes: card.minutes ?? null, days: card.days ?? null },
      propose: { minutes, days }, shows: { realtime: daysText(days), card: card.days ? daysText(card.days) : null }, matches: card.minutes === minutes && card.days === days, personas, problems,
    };
  });
}

/** Подпись карточки, как в src/engine/library.ts daysText. */
export function daysText(days) {
  if (days >= 1) {
    const n = Math.round(days);
    const a = n % 100, b = n % 10;
    return `≈ ${n} ${a > 10 && a < 20 ? 'дней' : b === 1 ? 'день' : b >= 2 && b <= 4 ? 'дня' : 'дней'}`;
  }
  return `≈ ${Math.max(1, Math.round(days * 24))} ч`;
}

const fmtH = (h) => {
  const m = Math.round(h * 60);
  return m < 60 ? `${m} мин` : `${Math.floor(m / 60)} ч ${String(m % 60).padStart(2, '0')} мин`;
};

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) { console.log(HELP); return; }
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const VALUED = new Set(['--story', '--persona', '--runs']);
  const ref = opt('--story') ?? args.find((a, i) => !a.startsWith('--') && !VALUED.has(args[i - 1])) ?? null;
  const res = durations(ref, { persona: opt('--persona'), runs: opt('--runs') });
  if (args.includes('--json')) { console.log(JSON.stringify(res, null, 2)); return; }
  for (const s of res) {
    if (s.error) { console.log(`${s.id ?? s.ref ?? 'история'}: ${s.error}`); process.exitCode = 1; continue; }
    console.log(`${s.path} · на карточке: ${s.card.minutes ?? '—'} мин по клику · ${s.card.days ?? '—'} дн в реальном времени${s.shows.card ? ` (карточка пишет «${s.shows.card}»)` : ''}`);
    for (const p of s.personas) console.log(`   ${p.persona.padEnd(12)} по клику ${Math.round(p.click_min)} мин · реальное ${fmtH(p.real_h)} (от ${fmtH(p.real_range_h[0])} до ${fmtH(p.real_range_h[1])}) · самая длинная пауза ${fmtH(p.max_pause_h)} · хвост ${Math.round(p.tail_min)} мин`);
    console.log(`   ${s.matches ? '✓' : '→'} для карточки: "minutes": ${s.propose.minutes}, "days": ${s.propose.days} — «≈ ${s.propose.minutes} мин по клику · ${s.shows.realtime} в реальном времени»${s.matches ? ', совпадает' : ''}`);
    for (const p of s.problems) console.log(`   ${p}`);
    console.log('');
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
