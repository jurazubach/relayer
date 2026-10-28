// story:sessions — расписание прохождения в обоих режимах: паузы, сессии, микросессии, длина против карточки.
import { runCli, intFlag, median, pct, table } from './core/cli.mjs';
import { PERSONAS, parsePersonas } from './core/personas.mjs';
import { prepare, runOnce } from './core/run.mjs';
import { sessions } from './core/sessions.mjs';
import { fmtDuration, fmtMoment } from './core/timeline.mjs';
import { threshold, thresholdEntry, thresholdSeconds } from '../lib/thresholds.mjs';

const HELP = `npm run story:sessions -- [--story <id>] [--persona <имя>|all] [--runs N] [--seed N]
                          [--partial] [--schedule] [--json]

Расписание истории в обоих режимах без часов игрока: время идёт от старта прохождения
(«день 2, +3 ч»), ночь и утро — только время мира.

Реальное время: паузы #delay как есть, набор и зазоры — по формулам engine.ts.
По клику: паузы пропадают, остаются только короткие (до C-31.click_delay_max_s); скачок от
engine.click.time_jump_label получает метку «спустя …» (план §3, E-01).

Сессия — кусок между паузами от story.pause.session_s. Метки сессии:
  микро     не первая, до последней кнопки, строк ≤ C-30.micro_lines и ни одной кнопки (C-30)
  крючок    в 3 строках до паузы есть вопрос, фото, новый контакт или обещание (checks.md)
  закрытая  последняя строка — закрывающая реплика (dict.closing, как в story:lint C-26)

Сводка по прохождениям: медиана и разброс реального времени против days карточки и времени
по клику против minutes; самая длинная пауза; доля микросессий; пауза после последней кнопки.
У персоны distracted (уходит на каждой паузе от story.pause.session_s) — пачка непрочитанного при
возвращении: сколько строк ждёт до кнопки (медиана, p90 по C-28.pack_percentile, наибольшая и где),
против C-28.pack (story-pauses, R-72).
Пороги — ключи story.* (длина, пауза, хвост, карточка), C-30, C-31 и engine.click.* из
docs/playbook/thresholds.json — те же, что у story:lint.

  --story <id>  история или несколько через запятую; по умолчанию все из src/stories
  --persona     кто проходит (по умолчанию random); all — каждая персона отдельно
  --runs N      прохождений на персону (по умолчанию bot.runs)
  --seed N      начальный seed (по умолчанию 1)
  --partial     история из части глав: узел beta_stop — законный конец
  --schedule    расписание срединного прохождения: каждая сессия строкой (по умолчанию — в тексте да)
  --json        всё данными: сводка, расписание срединного прохождения в обоих режимах
  --help        эта справка`;

const TIME_UNITS = ['с', 'мин', 'ч'];
/** Перцентиль по ближайшему рангу: p90 из десяти пачек — девятая по величине. */
const percentile = (arr, p) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1))];
};

const by = (key) => {
  const e = thresholdEntry(key);
  const v = TIME_UNITS.includes(e.unit) ? fmtDuration(thresholdSeconds(key)) : e.value;
  return `${key} = ${v}${e.basis === 'our_estimate' ? ', наша оценка' : ''}`;
};

function summarize(p, persona, runs, seed, partial) {
  const all = [];
  for (let k = 0; k < runs; k++) {
    const r = runOnce(p, { persona, seed: seed + k, partial });
    const s = sessions(r.timeline);
    all.push({ r, s });
  }
  const real = all.map((x) => x.r.timeline.totals.real);
  const click = all.map((x) => x.r.timeline.totals.click);
  const tails = all.map((x) => x.r.timeline.totals.tail.delay);
  const maxPauses = all.map((x) => x.r.timeline.totals.maxPause);
  const body = all.flatMap((x) => x.s.filter((s) => s.n > 1 && !s.tail));
  const micro = body.filter((s) => s.label === 'микро');
  const longest = all.reduce((m, x) => (x.r.timeline.totals.maxPause > (m?.r.timeline.totals.maxPause ?? -1) ? x : m), null);
  const sorted = [...all].sort((a, b) => a.r.timeline.totals.real - b.r.timeline.totals.real);
  const mid = sorted[Math.floor(sorted.length / 2)];
  const jumps = mid.r.timeline.items.filter((i) => i.type === 'line' && i.jump);
  // пачка отвлечённого: строки от ухода до кнопки, которые он прочтёт одной стеной (attention-merged.md #attn-return-batch)
  const packs = all.flatMap((x) => x.r.timeline.batches);
  const biggest = packs.reduce((m, b) => (b.lines > (m?.lines ?? -1) ? b : m), null);
  const batches = packs.length ? {
    count: packs.length, perRun: median(all.map((x) => x.r.timeline.batches.length)),
    median: median(packs.map((b) => b.lines)), p90: percentile(packs.map((b) => b.lines), threshold('C-28.pack_percentile')),
    max: biggest.lines, maxKnot: biggest.knot, maxChapter: biggest.chapter, notices: median(packs.map((b) => b.notices)),
  } : null;
  const byChapter = new Map();
  for (const it of mid.r.timeline.items) {
    if (it.type !== 'line') continue;
    const c = byChapter.get(it.chapter) ?? { chapter: it.chapter, pauses: 0, real: 0, click: 0, from: it };
    c.pauses += it.delay;
    c.real += it.delay + it.gap + it.typing;
    c.click += it.clickDelay + it.gap + it.typing;
    byChapter.set(it.chapter, c);
  }
  return {
    persona, runs,
    real: { median: median(real), min: Math.min(...real), max: Math.max(...real) },
    click: { median: median(click), min: Math.min(...click), max: Math.max(...click) },
    maxPause: { median: median(maxPauses), max: longest.r.timeline.totals.maxPause, knot: longest.r.timeline.totals.maxPauseKnot },
    tail: { median: median(tails), max: Math.max(...tails) },
    sessions: { median: median(all.map((x) => x.s.length)), micro: micro.length, body: body.length, microShare: body.length ? micro.length / body.length : 0, microExample: micro[0] ?? null },
    batches,
    middle: {
      seed: mid.r.seed, route: mid.r.route, ending: mid.r.ending.name,
      real: mid.r.timeline.totals.real, click: mid.r.timeline.totals.click,
      sessions: mid.s, jumps: jumps.map((j) => ({ knot: j.knot, chapter: j.chapter, delay: j.delay, label: `спустя ${fmtDuration(j.delay)}` })),
      chapters: [...byChapter.values()].map(({ from, ...c }) => c),
      tail: mid.r.timeline.totals.tail,
    },
  };
}

function problems(sum, meta) {
  const out = [];
  const real = sum.real.median;
  if (real > thresholdSeconds('story.length.max_h')) out.push(`✗ история идёт ${fmtDuration(real)} — больше потолка (${by('story.length.max_h')})`);
  else if (real > thresholdSeconds('story.length.target_h')) out.push(`⚠ история идёт ${fmtDuration(real)} — больше цели (${by('story.length.target_h')})`);
  if (sum.maxPause.max > thresholdSeconds('story.pause.max_h')) out.push(`✗ пауза ${fmtDuration(sum.maxPause.max)} в ${sum.maxPause.knot} больше суток (${by('story.pause.max_h')})`);
  if (sum.tail.median > thresholdSeconds('story.tail.max_delay_min')) out.push(`⚠ после последней кнопки ждать ${fmtDuration(sum.tail.median)} (${by('story.tail.max_delay_min')})`);
  if (sum.sessions.microShare > threshold('C-30.micro_share')) {
    const ex = sum.sessions.microExample;
    out.push(`⚠ микросессий ${pct(sum.sessions.micro, sum.sessions.body)} (${by('C-30.micro_share')})${ex ? `, например ${ex.knot}: «${ex.last.slice(0, 50)}»` : ''}`);
  }
  if (sum.batches && sum.batches.p90 > threshold('C-28.pack')) out.push(`⚠ пачка при возвращении: p${Math.round(threshold('C-28.pack_percentile') * 100)} — ${sum.batches.p90} строк до кнопки (${by('C-28.pack')}; наибольшая — ${sum.batches.max} в ${sum.batches.maxKnot})`);
  const ratio = threshold('story.card.mismatch_ratio');
  const off = (a, b) => a > b * ratio || b > a * ratio;
  if (meta.days == null) out.push('⚠ на карточке нет days (дни в реальном времени, план §3)');
  else if (off(real, meta.days * 86400)) out.push(`⚠ реальное время ${fmtDuration(real)}, на карточке ${meta.days} дн (${by('story.card.mismatch_ratio')})`);
  if (meta.minutes == null) out.push('⚠ на карточке нет minutes');
  else if (off(sum.click.median, meta.minutes * 60)) out.push(`⚠ по клику ${fmtDuration(sum.click.median)}, на карточке ${meta.minutes} мин (${by('story.card.mismatch_ratio')})`);
  return out;
}

runCli(HELP, async (args) => {
  const json = args.has('json');
  const personas = parsePersonas(args.get('persona'));
  const runs = intFlag(args, 'runs', threshold('bot.runs'));
  if (!runs) throw new Error('--runs: нужно хотя бы одно прохождение');
  const seed = intFlag(args, 'seed', 1);
  const partial = args.has('partial');
  const report = [];
  for (const ref of args.refs) {
    const p = prepare(ref);
    const meta = { minutes: p.story.meta.minutes ?? null, days: p.story.meta.days ?? null };
    const list = personas.map((persona) => summarize(p, persona, runs, seed, partial));
    const probs = Object.fromEntries(list.map((s) => [s.persona, problems(s, meta)]));
    report.push({ id: p.story.id, path: p.story.path, card: meta, personas: list, problems: probs });
    if (json) continue;
    console.log(`${p.story.path} · карточка: ${meta.minutes ?? '—'} мин по клику · ${meta.days ?? '—'} дн в реальном времени`);
    for (const s of list) {
      console.log(`\n  ${PERSONAS[s.persona].name} · ${s.runs} прохождений`);
      console.log(`   реальное время: медиана ${fmtDuration(s.real.median)} (от ${fmtDuration(s.real.min)} до ${fmtDuration(s.real.max)})`);
      console.log(`   по клику:       медиана ${fmtDuration(s.click.median)} (от ${fmtDuration(s.click.min)} до ${fmtDuration(s.click.max)})`);
      console.log(`   самая длинная пауза: ${fmtDuration(s.maxPause.max)} в ${s.maxPause.knot} (медиана самых длинных ${fmtDuration(s.maxPause.median)})`);
      console.log(`   после последней кнопки: медиана ${fmtDuration(s.tail.median)} пауз, до ${fmtDuration(s.tail.max)}`);
      console.log(`   сессий за прохождение: медиана ${s.sessions.median}; микросессий ${pct(s.sessions.micro, s.sessions.body)}`);
      if (s.batches) console.log(`   пачка при возвращении (отлучек ${s.batches.count}, медиана ${s.batches.perRun} за прохождение): медиана ${s.batches.median} строк, p${Math.round(threshold('C-28.pack_percentile') * 100)} ${s.batches.p90}, наибольшая ${s.batches.max} в ${s.batches.maxKnot} (гл. ${s.batches.maxChapter}); уведомлений в пачке — медиана ${s.batches.notices}`);
      for (const pr of probs[s.persona]) console.log(`   ${pr}`);
      const m = s.middle;
      console.log(`\n   срединное прохождение (seed ${m.seed}, финал ${m.ending}): ${fmtDuration(m.real)} в реальном времени, ${fmtDuration(m.click)} по клику`);
      console.log(table(m.chapters.map((c) => [`гл.${c.chapter}`, fmtDuration(c.pauses), fmtDuration(c.real), fmtDuration(c.click)]), ['глава', 'паузы', 'реальное', 'по клику']).replace(/^/gm, '     '));
      console.log('\n   реальное время, сессии:');
      console.log(table(m.sessions.map((x) => [
        x.n, fmtMoment(x.at), x.pauseBefore ? fmtDuration(x.pauseBefore) : '', `гл.${x.chapter}`, x.knot, x.lines, x.choices, fmtDuration(x.active),
        x.tail ? 'хвост' : x.label, x.last.length > 40 ? x.last.slice(0, 39) + '…' : x.last,
      ]), ['#', 'когда', 'пауза до', 'глава', 'узел', 'строк', 'кнопок', 'активно', 'метка', 'последняя строка']).replace(/^/gm, '     '));
      console.log(`\n   по клику: пауз нет, меток «спустя …» ${m.jumps.length}${m.jumps.length ? ': ' + m.jumps.slice(0, 6).map((j) => `${j.knot} (${j.label})`).join(', ') : ''}`);
    }
    console.log('');
  }
  if (json) console.log(JSON.stringify({ stories: report }, null, 1));
});
