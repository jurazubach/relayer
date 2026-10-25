// Полный перебор маршрутов главы 1 (narrative-testing:/first-minutes): у каждого маршрута — первая кнопка,
// инцидент, где впервые звучат срок или ставка, первая пауза от story.pause.session_s и реплика перед ней.
// Бот story:lint видит маршруты с их вероятностью; редкий маршрут без ставки он может пропустить, перебор — нет.
import { loadStory, storyRefs } from '../../../../scripts/lib/story.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';
import { play, strategies } from '../../../../scripts/lib/bot.mjs';
import { analyze } from '../../../../scripts/lint/core.mjs';
import { toJournal } from '../../../../scripts/lint/journal.mjs';
import { fmtDur, pct, short } from '../../../../scripts/lint/text.mjs';
import { mark, routeMetrics, stakeLine, summarize } from './opening.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/first-minutes.mjs [--story <id|путь>,…] [--all] [--json]

Каждый маршрут начала по отдельности (скилл story-opening; R-13, R-16, R-17, R-21; C-20, C-24):
  маршрут   кнопки по порядку до окна C-24: пока не прозвучала ставка, но не дальше первой паузы от
            story.pause.long_s и конца главы 1; дальше бот жмёт первую кнопку
  кнопка    входящих и время до первой кнопки (C-20.start_msgs, C-20.start_time_s)
  инцидент  номер входящего с событием, как в C-23 (attn.opening.incident.msg)
  ставка    номер входящего, где впервые звучат срок мира или ставка из шапки, как в C-24 (C-24.by_msg);
            «нет» — до первой паузы от story.pause.long_s в главе 1 ставки нет вовсе
  пауза     первая пауза от story.pause.session_s: выборов до неё (C-32.first_pause_choices_hint) и реплика перед ней
Итог: доля маршрутов со ставкой против доли прогонов бота (C-24.share) — маршрут, который бот видит редко,
перебор всё равно покажет. Маршрутов больше C-24.routes_max — перебор останавливается, итог помечен «частично».

  --story     история по id, файл .json / .ink или папка; через запятую; по умолчанию все из src/stories
  --all       печатать все маршруты, а не только с отклонением от порогов
  --json      всё данными
  --help      эта справка`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const T = thresholds();

/** Все маршруты главы 1: обход в глубину по номерам кнопок, после главы 1 — первая кнопка. */
function routes(ctx) {
  const json = ctx.built.json;
  const nodes = [...ctx.st.ids];
  const max = T.value('C-24.routes_max');
  const out = [];
  const stack = [[]];
  while (stack.length && out.length < max) {
    const plan = stack.pop();
    const res = play(json, { strategy: strategies.scripted(plan, strategies.first()), nodes, maxSteps: T.value('lint.max_steps'), trackVars: true, log: true });
    const run = { ...toJournal(res.events, ctx.st, T), visited: res.visited };
    // ветвимся только до окна C-24: пока не прозвучала ставка (дальше кнопки её уже не меняют), но не дальше
    // первой паузы от story.pause.long_s и конца главы 1
    const stake = stakeLine(run, ctx);
    const end = stake?.i ?? run.lines.find((l) => l.chapter > 1 || (l.i > 0 && l.delay >= T.value('story.pause.long_s')))?.i ?? run.lines.length;
    const lim = run.choices.findIndex((c) => c.at > end);
    const n = lim < 0 ? run.choices.length : lim;
    out.push({ run, picks: run.choices.slice(0, n).map((c) => c.picked) });
    // ветки ниже по маршруту кладём раньше, чтобы обход шёл по порядку кнопок
    for (let k = n - 1; k >= plan.length; k--) {
      const c = run.choices[k];
      for (let alt = c.n - 1; alt >= 1; alt--) stack.push([...run.choices.slice(0, k).map((x) => x.picked), alt]);
    }
  }
  return { list: out, partial: stack.length > 0 };
}

const report = [];
for (const ref of storyRefs((opt('--story') ?? '').split(',').filter(Boolean))) {
  const story = loadStory(ref);
  const ctx = analyze(story, T, { runs: T.value('lint.runs.full'), seed: 1 });
  if (!ctx.built.ok) { report.push({ id: story.id, path: story.path, error: 'нет данных: история не компилируется (npm run story:lint)' }); continue; }
  const { list, partial } = routes(ctx);
  const rows = list.map(({ run, picks }) => {
    const m = routeMetrics(run, ctx);
    const texts = run.choices.slice(0, picks.length).map((c) => c.texts[c.picked]);
    return { route: picks, buttons: texts, ...m };
  });
  const bot = ctx.runs.filter((r) => stakeLine(r, ctx)).length / (ctx.runs.length || 1);
  const all = summarize(rows);
  const noStake = rows.filter((r) => r.chapter1.stake_msg == null);
  const late = rows.filter((r) => r.chapter1.stake_msg != null && r.chapter1.stake_msg > T.value('C-24.by_msg'));
  report.push({
    id: story.id, path: story.path, routes: rows.length, partial,
    stake_routes: 1 - noStake.length / (rows.length || 1), stake_bot: bot,
    no_stake: noStake.map((r) => r.buttons), late_stake: late.map((r) => ({ buttons: r.buttons, at: r.chapter1.stake_msg })),
    summary: all, rows,
  });
}

if (args.includes('--json')) { console.log(JSON.stringify({ stories: report }, null, 1)); process.exit(0); }

const flagged = (r) => mark(T, 'C-20.start_msgs', r.start.msgs) === '! ' || mark(T, 'C-20.start_time_s', r.start.seconds) === '! '
  || r.chapter1.stake_msg == null || mark(T, 'C-24.by_msg', r.chapter1.stake_msg) === '! '
  || (r.chapter1.pause_choices != null && mark(T, 'C-32.first_pause_choices_hint', r.chapter1.pause_choices) === '! ');
for (const r of report) {
  if (r.error) { console.log(`${r.path}: ${r.error}\n`); continue; }
  const s = r.summary;
  console.log(`${r.path} · маршрутов начала: ${r.routes}${r.partial ? ' (частично: больше C-24.routes_max)' : ''}`);
  console.log(`  ставка или срок до первой паузы от story.pause.long_s: ${pct(r.stake_routes)} маршрутов, ${pct(r.stake_bot)} прогонов бота ${mark(T, 'C-24.share', r.stake_routes)}(C-24.share)`);
  const at = (n) => (n == null ? '—' : n === 0 ? 'системной строке до первого входящего' : `${n}-м входящем`);
  console.log(`  медиана по маршрутам: первая кнопка на ${s.start.msgs}-м входящем, ${fmtDur(s.start.seconds)} · ставка на ${at(s.chapter1.stake_msg)} · выборов до первой паузы ${s.chapter1.pause_choices ?? '—'}`);
  if (r.no_stake.length) console.log(`  ! без ставки: ${r.no_stake.length} — ${r.no_stake.slice(0, T.value('lint.examples')).map((b) => `[${b.map((x) => short(x, 18)).join(' → ')}]`).join(' · ')}`);
  if (r.late_stake.length) console.log(`  ! ставка позже C-24.by_msg: ${r.late_stake.length} — ${r.late_stake.slice(0, T.value('lint.examples')).map((x) => `${x.at}-е [${x.buttons.slice(0, 3).map((b) => short(b, 18)).join(' → ')}${x.buttons.length > 3 ? ' → …' : ''}]`).join(' · ')}`);
  const shown = args.includes('--all') ? r.rows : r.rows.filter(flagged);
  if (!shown.length) console.log('  все маршруты в пределах порогов (--all — показать каждый)');
  for (const x of shown.slice(0, args.includes('--all') ? undefined : T.value('lint.examples'))) {
    console.log(`  · ${x.route.join(',') || '(без кнопок)'}  кнопка ${mark(T, 'C-20.start_msgs', x.start.msgs)}${x.start.msgs}/${fmtDur(x.start.seconds)} · инцидент ${x.start.incident ?? '—'} · ставка ${x.chapter1.stake_msg ?? 'нет'} · пауза ${x.chapter1.pause_choices == null ? '—' : `после ${x.chapter1.pause_choices} выборов, перед ней «${short(x.chapter1.pause_before ?? '', 40)}»`}`);
  }
  if (!args.includes('--all') && shown.length > T.value('lint.examples')) console.log(`  … и ещё ${shown.length - T.value('lint.examples')} (--all или --json)`);
  console.log('');
}
