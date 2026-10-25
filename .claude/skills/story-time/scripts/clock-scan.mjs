// Время мира против часов игрока (скилл story-time; R-121, R-122, R-67; C-32 п. 1 и 5, C-47; решение A-02).
// Часы игрока история не знает: здесь нет «приход в 23:00», есть только время мира в тексте и сутки от старта
// прохождения. Нагрузка по суткам (возвращения, минуты чтения) — это реальные сутки игры, а не привязка к
// часам: её не путать с «временем игрока». «Сплю → утро» и нагрузка — из C-32 (sleepMorning, dayLoad),
// поэтому числа совпадают со story:lint.
import { loadStory, storyRefs } from '../../../../scripts/lib/story.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';
import { norm } from '../../../../scripts/lib/lexicon.mjs';
import { walk } from '../../../../scripts/lib/ink.mjs';
import { lintStory, loadChecks } from '../../../../scripts/lint/core.mjs';
import { dayLoad, sleepMorning } from '../../../../scripts/lint/checks/C-32.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/clock-scan.mjs [<id>] [--story <id|путь>,…] [--node <узел>] [--runs N] [--seed N] [--json]

Время мира против часов игрока (скилл story-time; R-121, R-122, R-67; C-32 п. 1, 5; C-47; решение A-02):
  время игрока      реплики, которые угадывают часы игрока (dict.player_time: «ты, наверное, спишь») — ✗
  метки мира        «доброе утро», «сплю», «в 9:14» в тексте (dict.morning, dict.sleep, ЧЧ:ММ) — это время мира;
                    сверь с хронологией facts.md (R-91) и с паузами
  сплю → утро       Σ #delay от «сплю» до «доброе утро» того же контакта (C-32 п. 5): меньше
                    story.sleep_morning.min_h — ⚠; по клику скачок от engine.click.time_jump_label получит метку
                    «спустя …», короче — утро придёт через секунды
  прожитое ожидание «наконец-то», «ты долго» в C-47.lived_wait_lines строках после паузы (dict.lived_wait):
                    в «по клику» ожидания не было (R-122, ST-63)
  свой #sys о времени  «Прошло 3 часа», «спустя …» у паузы от engine.click.time_jump_label — дублирует метку
                    движка (R-122, ST-65); заголовок главы не в счёт
  сутки от старта   по прохождениям: возвращений (пауза от story.pause.long_s) и минут чтения за сутки 1, 2…
                    от старта — против C-32.returns_per_day и story.reading.per_day_min. Это нагрузка, а не часы.

  --story     история по id, файл .json / .ink или папка; через запятую; по умолчанию все из src/stories
  --node      только этот узел (и его stitch) в списках строк
  --runs N    прогонов бота (по умолчанию lint.runs.full, как у story:lint)
  --seed N    seed (по умолчанию 1)
  --json      всё данными
  --help      эта справка

Сверка: npm run -s story:lint -- --story <id> --only C-32,C-47 (story.sleep_morning.min_h, C-32.returns_per_day,
C-47.player_time, C-47.lived_wait); npm run -s story:sessions -- --story <id> — сессии по суткам.`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const T = thresholds();
// id без ключа — тоже история: иначе вызов молча идёт по всему каталогу
const VALUED = new Set(['--story', '--node', '--runs', '--seed']);
const positional = args.filter((a, i) => !a.startsWith('--') && !VALUED.has(args[i - 1]));
const refs = storyRefs([...(opt('--story') ?? '').split(','), ...positional].filter(Boolean));
const onlyNode = opt('--node');
const runs = Number(opt('--runs') ?? T.value('lint.runs.full'));
const seed = Number(opt('--seed') ?? 1);
const inNode = (knot) => !onlyNode || knot === onlyNode || knot?.startsWith(`${onlyNode}.`);
// часы на циферблате — формат записи, а не порог; «спустя / прошло / позже» в #sys — метка скачка своими словами.
// Скачок дальше паузы («Три недели спустя» в эпилоге) свой #sys законно называет сам (R-122, R-110): дни,
// недели, месяцы, годы паузой не прожить.
const CLOCK = /(?<!\d)\d{1,2}:\d\d(?!\d)/;
const OWN_LABEL = /(?<!\p{L})(спустя|прошл[оаи]|позже)(?!\p{L})/iu;
const BEYOND = /(?<!\p{L})(сут|дн[яеий]|день|недел|месяц|год|лет)/iu;

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] : 0; };
const fmt = (sec) => {
  if (sec < 60) return `${Math.round(sec)} с`;
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return !h ? `${m} мин` : m ? `${h} ч ${m} мин` : `${h} ч`;
};

async function scan(ref) {
  const story = loadStory(ref);
  let ctx = null;
  const checks = (await loadChecks()).filter((c) => ['C-32', 'C-47'].includes(c.id));
  const probe = checks.map((c) => (c.id === 'C-32' ? { ...c, run(x, find) { ctx = x; c.run(x, find); } } : c));
  const res = await lintStory(story, T, { checks: probe, runs, seed });
  if (!ctx) return { id: story.id, path: story.path, error: res.findings[0]?.message ?? 'не собралась' };
  const { st, tree } = ctx;

  // текст: время игрока и метки времени мира
  const playerTime = [];
  const marks = [];
  for (const k of tree.knots) {
    if (!inNode(k.id)) continue;
    walk(k.items, (it) => {
      if (!['msg', 'sys'].includes(it.type) || ctx.service.has(it.who)) return;
      const t = it.text.toLowerCase();
      const at = { node: k.id, chapter: st.chapterOf(k.id), line: it.line, who: it.who, text: it.text };
      if (it.type === 'msg' && T.re('dict.player_time').test(t)) playerTime.push(at);
      const kinds = [T.re('dict.morning').test(norm(it.text)) && 'утро', T.re('dict.sleep').test(norm(it.text)) && 'сон', CLOCK.test(it.text) && 'часы'].filter(Boolean);
      if (kinds.length && !('chapter' in it.tags)) marks.push({ ...at, kinds });
    });
  }

  // по прогонам: «сплю → утро», прожитое ожидание, свой #sys у скачка
  const minSleep = T.value('story.sleep_morning.min_h') * 3600;
  const jump = T.value('engine.click.time_jump_label') * 3600;
  const sleep = sleepMorning(ctx).filter((p) => inNode(p.knot)).map((p) => {
    const s = median(p.sums);
    return { node: p.knot, text: p.text, morning: p.morning, morning_node: p.morningKnot, median_s: s, min_s: Math.min(...p.sums), short: s < minSleep, click_label: s >= jump, runs: p.sums.length };
  });
  const notice = T.value('story.pause.notice_min') * 60;
  const lw = T.value('C-47.lived_wait_lines');
  const lived = new Map();
  const ownLabel = new Map();
  for (const run of ctx.runs) {
    run.lines.forEach((l, i) => {
      if (l.delay < notice || i === 0) return;
      const hit = run.lines.slice(i, i + lw).find((x) => (x.kind === 'in' || x.kind === 'photo') && T.re('dict.lived_wait').test(x.text.toLowerCase()));
      if (hit && inNode(hit.knot)) lived.set(`${hit.knot}|${hit.text}`, { node: hit.knot, text: hit.text, pause_s: l.delay });
      if (l.delay < jump) return;
      for (const x of run.lines.slice(Math.max(0, i - 1), i + 2)) {
        if (x.kind === 'sys' && !x.isChapter && OWN_LABEL.test(x.text) && inNode(x.knot)) ownLabel.set(`${x.knot}|${x.text}`, { node: x.knot, text: x.text, pause_s: l.delay, beyond: BEYOND.test(x.text) });
      }
    });
  }

  // нагрузка по суткам от старта: медиана по прогонам для каждых суток
  const load = dayLoad(ctx, { shortDelay: T.value('C-31.click_delay_max_s') });
  const nDays = Math.max(0, ...load.map((d) => d.length));
  const days = Array.from({ length: nDays }, (_, d) => {
    const have = load.filter((x) => x[d]);
    return { day: d + 1, runs: have.length, returns: median(have.map((x) => x[d].returns)), reading_min: median(have.map((x) => x[d].active_s)) / 60 };
  });
  const peak = median(load.map((x) => Math.max(0, ...x.map((d) => d.returns))));
  const lintKeys = ['story.sleep_morning.min_h', 'C-32.returns_per_day', 'C-47.player_time', 'C-47.lived_wait'];
  const lint = Object.fromEntries(lintKeys.map((k) => [k, res.findings.filter((f) => f.key === k && (!onlyNode || inNode(f.node))).length]));
  return {
    id: story.id, path: story.path, runs: ctx.runs.length,
    player_time: playerTime, world_marks: marks, sleep, lived_wait: [...lived.values()], own_label: [...ownLabel.values()],
    load: { days, peak_returns: peak, returns_limit: T.value('C-32.returns_per_day'), reading: T.value('story.reading.per_day_min') },
    lint,
  };
}

const report = [];
for (const ref of refs) report.push(await scan(ref));
if (args.includes('--json')) {
  console.log(JSON.stringify({ stories: report }, null, 1));
  process.exit(0);
}

for (const r of report) {
  if (r.error) { console.log(`${r.path}: нет данных — ${r.error}\n`); continue; }
  console.log(`${r.path} · прогонов бота ${r.runs}`);
  console.log(`   как в story:lint: ${Object.entries(r.lint).map(([k, n]) => `${k} ${n}`).join(' · ')}`);
  console.log(`\n   время игрока в тексте (dict.player_time, R-121): ${r.player_time.length}`);
  for (const x of r.player_time) console.log(`      ✗ ${x.node} (гл. ${x.chapter}) ${x.who ?? ''}: «${x.text}» — угадывает часы игрока; время суток — время мира`);
  const by = (k) => r.world_marks.filter((m) => m.kinds.includes(k)).length;
  console.log(`\n   метки времени мира в тексте: утро ${by('утро')}, сон ${by('сон')}, часы ${by('часы')} — сверь с хронологией facts.md (R-91)`);
  for (const m of r.world_marks.slice(0, 12)) console.log(`      · ${m.node} (гл. ${m.chapter}) [${m.kinds.join(', ')}] ${m.who ?? '#sys'}: «${m.text}»`);
  if (r.world_marks.length > 12) console.log(`      … и ещё ${r.world_marks.length - 12} (все — --json)`);
  console.log(`\n   «сплю» → «утро» того же контакта (C-32 п. 5, story.sleep_morning.min_h): ${r.sleep.length}`);
  for (const s of r.sleep) console.log(`      ${s.short ? '⚠' : '✓'} ${s.node} «${s.text}» → ${s.morning_node} «${s.morning}»: медиана ${fmt(s.median_s)}${s.min_s !== s.median_s ? `, от ${fmt(s.min_s)}` : ''} · по клику ${s.click_label ? 'метка «спустя …»' : 'без метки — утро через секунды'}`);
  console.log(`\n   прожитое ожидание после паузы (C-47.lived_wait, R-122): ${r.lived_wait.length}`);
  for (const x of r.lived_wait) console.log(`      ⚠ ${x.node}: «${x.text}» после паузы ${fmt(x.pause_s)} — по клику ожидания не было`);
  const dup = r.own_label.filter((x) => !x.beyond);
  console.log(`\n   свой #sys о времени у скачка (R-122, ST-65): дублируют метку ${dup.length}, скачок дальше паузы ${r.own_label.length - dup.length}`);
  for (const x of r.own_label) console.log(x.beyond ? `      ✓ ${x.node}: «${x.text}» у паузы ${fmt(x.pause_s)} — время мира прыгает дальше паузы, свой #sys законен` : `      ⚠ ${x.node}: «${x.text}» у паузы ${fmt(x.pause_s)} — по клику рядом встанет и метка движка`);
  const L = r.load;
  console.log(`\n   сутки от старта прохождения — нагрузка, не часы игрока (A-02): пик возвращений за сутки ${L.peak_returns} (C-32.returns_per_day = ${L.returns_limit})${L.peak_returns > L.returns_limit ? ' ⚠' : ''}`);
  for (const d of L.days) console.log(`      сутки ${d.day}: возвращений ${d.returns}, чтения ${Math.round(d.reading_min)} мин (story.reading.per_day_min ${L.reading.min}–${L.reading.max})${d.runs < r.runs ? ` · дошли ${d.runs} из ${r.runs} прогонов` : ''}`);
  console.log('');
}
if (!report.length) console.log('историй нет');
