// Симулированная панель (TH-89, решение автора 25.10.2026): профили холодных читателей поверх персон бота, в обоих
// режимах. Каждый читатель — отдельный npm run story:cold-read --ask (claude -p из пустого каталога, Opus — A-07);
// здесь только план точек, запуск по очереди и сводка. Ответы → заготовки отзывов для digest.mjs с пометкой «симуляция».
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';
import { runCli, intFlag } from '../../../../scripts/story/core/cli.mjs';
import { prepare, runOnce } from '../../../../scripts/story/core/run.mjs';
import { seeded } from '../../../../scripts/lib/bot.mjs';

const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const COLD = join(ROOT, 'scripts/story/cold-read.mjs');

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/panel.mjs --story <id> [--at opening|ch1|<узел>] [--profiles all|hurried,…]
       [--modes realtime,click] [--slices [N]] [--seed N] [--run] [--jobs N] [--out <папка>] [--json]

Симулированная панель холодных читателей (скилл story-playtest). Без --run — только план: какие читатели, на какой
точке, в каком режиме и какой персоной бота; с --run — запускает их (каждый — claude -p, Opus) и пишет в --out:
  <профиль>-<режим>-<точка>.json   ответ, ключ и проверка изоляции (как story:cold-read --json)
  <профиль>-<режим>-<точка>.md     заготовка отзыва для digest.mjs: «источник: симуляция», строка «Итог»
                                   читателя уже переведена в «скучно · «…» · отложил бы»; остальное размечает модель
  panel.md                         сводка: кто дочитал, кто где отложил, изоляция, стоимость

Профили (протокол references/cold-reader.md): hurried — торопливый, attentive — внимательный, skeptic — скептик,
distracted — отвлечённый (персона distracted, в реальном времени — режим return), unresponsive — неотвечающий
(персона unresponsive; только реальное время: по клику напоминаний нет).

Точки:
  opening   первый новый узел после lab.playtest.panel.opening_incoming входящих (холодный тест после 3 минут)
  ch1       начало главы 2: пересказ после главы 1
  <узел>    свой узел (должен встретиться на маршруте)
--slices [N] — вместо профилей N случайных срезов середины в режиме guess (maass-fire-in-fiction:P-16;
по умолчанию lab.playtest.slice.count); срез без открытого вопроса — кандидат в «скучно».

  --story <id>      история или набор playtest-kit (.json)
  --at              точка (по умолчанию ch1)
  --profiles        all (по умолчанию) или список через запятую
  --modes           realtime,click (по умолчанию оба)
  --seed N          маршрут бота (по умолчанию 1): у hurried, attentive и skeptic он один — читают одно и то же
  --run             запустить читателей; без него — план
  --jobs N          сколько читателей одновременно (по умолчанию lab.triggers.jobs — тот же предел claude -p)
  --out <папка>     куда писать (по умолчанию docs/stories/<id>/playtests/sim-<дата>/)
  --json            план или итог данными
  --help            эта справка`;

export const PROFILES = {
  hurried: { name: 'торопливый', persona: 'random' },
  attentive: { name: 'внимательный', persona: 'random' },
  skeptic: { name: 'скептик', persona: 'suspicious' },
  distracted: { name: 'отвлечённый', persona: 'distracted', realtimeMode: 'return' },
  unresponsive: { name: 'неотвечающий', persona: 'unresponsive', clickless: true },
};

/** Узел точки на маршруте персоны: opening — первый новый узел после N входящих, ch1 — начало главы 2. */
export function pointKnot(p, at, { persona, seed, mode, T }) {
  const r = runOnce(p, { persona, seed, mode: mode === 'click' ? 'click' : 'realtime' });
  const items = r.timeline.items;
  if (at === 'ch1') return items.find((i) => i.type === 'line' && i.isChapter && i.chapter === 2)?.knot ?? null;
  if (at === 'opening') {
    const need = T.value('lab.playtest.panel.opening_incoming');
    let seen = 0;
    let knot = null;
    for (const i of items) {
      if (i.type !== 'line') continue;
      if (seen >= need && i.knot !== knot) return i.knot;
      if (i.kind === 'in' || i.kind === 'photo') seen++;
      knot = i.knot;
    }
    return null;
  }
  return items.some((i) => i.knot === at) ? at : null;
}

/**
 * Профиль, который на этой точке ничего не проверит: отвлечённому не к чему возвращаться без долгой паузы,
 * неотвечающий без #remind в истории ведёт себя как случайная персона (история стоит, потом жмёт кнопку).
 */
export function pointless(p, id, mode, until, o, T) {
  if (id === 'distracted' && mode === 'return') {
    const r = runOnce(p, { persona: 'distracted', seed: o.seed });
    const at = r.timeline.items.findIndex((i) => i.knot === until);
    const gap = T.value('story.pause.session_s');
    if (!r.timeline.items.slice(0, at).some((i) => i.type === 'line' && i.delay >= gap)) return `до ${until} нет паузы от story.pause.session_s — отвлечённому не к чему возвращаться; возьми --at узел после первой долгой паузы`;
  }
  if (id === 'unresponsive') {
    const r = runOnce(p, { persona: 'unresponsive', seed: o.seed });
    const at = r.timeline.items.findIndex((i) => i.knot === until);
    if (!r.timeline.items.slice(0, at).some((i) => i.type === 'remind' || (i.type === 'choice' && i.noAnswer))) return `до ${until} нет #remind и ветки «не ответил» — неотвечающий не отличается от случайной персоны (C-32, story-time)`;
  }
  return null;
}

export function plan(p, o, T) {
  const jobs = [];
  if (o.slices) {
    const rng = seeded(o.seed);
    const r = runOnce(p, { persona: 'random', seed: o.seed });
    const chapters = [...new Set(r.timeline.items.map((i) => i.chapter).filter((c) => c != null))];
    const mid = chapters.length > 2 ? chapters.slice(1, -1) : chapters;
    const knots = [...new Set(r.timeline.items.filter((i) => i.type === 'line' && mid.includes(i.chapter)).map((i) => i.knot))];
    for (let k = 0; k < Math.min(o.slices, knots.length); k++) {
      const until = knots.splice(Math.floor(rng() * knots.length), 1)[0];
      jobs.push({ id: `slice-${k + 1}-${until}`, profile: null, mode: 'guess', persona: 'random', seed: o.seed, until, last: T.value('lab.playtest.slice.lines') });
    }
    return jobs;
  }
  for (const id of o.profiles) {
    const pr = PROFILES[id];
    for (const m of o.modes) {
      if (m === 'click' && pr.clickless) continue;
      const mode = m === 'click' ? 'click' : pr.realtimeMode ?? 'opening';
      const until = pointKnot(p, o.at, { persona: pr.persona, seed: o.seed, mode, T });
      jobs.push({ id: `${id}-${m}-${o.at}`, profile: id, mode, persona: pr.persona, seed: o.seed, until, skip: until ? pointless(p, id, mode, until, o, T) : `точка «${o.at}» не встретилась на маршруте` });
    }
  }
  return jobs;
}

const argsOf = (story, j) => ['--story', story, '--until', j.until, '--mode', j.mode, '--persona', j.persona, '--seed', String(j.seed), ...(j.last ? ['--last', String(j.last)] : []), ...(j.profile ? ['--profile', j.profile] : []), '--ask', '--json'];

function runOne(story, j) {
  return new Promise((done) => {
    const ch = spawn(process.execPath, [COLD, ...argsOf(story, j)], { cwd: process.cwd(), env: process.env });
    let out = '';
    let err = '';
    ch.stdout.on('data', (d) => { out += d; });
    ch.stderr.on('data', (d) => { err += d; });
    ch.on('close', (code) => {
      try { done({ ...j, code, data: JSON.parse(out) }); } catch { done({ ...j, code, error: (err || out).trim().split('\n')[0] }); }
    });
  });
}

async function pool(items, n, fn) {
  const res = [];
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) { const k = next++; res[k] = await fn(items[k]); }
  }));
  return res;
}

/** «Итог: отложил бы на «…»» → строка отзыва; «дочитал» → null. */
export function verdictOf(answer) {
  const lines = String(answer).split('\n');
  const line = lines.find((l) => /^\s*[-*]?\s*Итог\s*:/i.test(l));
  const weak = lines.find((l) => /^\s*[-*]?\s*Слабое место\s*:/i.test(l));
  const quoteOf = (l) => l?.match(/[«"]([^»"]+)[»"]/)?.[1] ?? null;
  const weakest = weak ? { quote: quoteOf(weak), why: weak.split(/\s[—-]\s/).slice(1).join(' — ').trim() || null } : null;
  if (!line) return { verdict: 'нет строки «Итог»', quote: null, weakest };
  if (/дочитал/i.test(line)) return { verdict: 'дочитал бы', quote: null, weakest };
  return { verdict: 'отложил бы', quote: quoteOf(line), weakest };
}

function feedbackStub(r) {
  const v = verdictOf(r.data.answer);
  return [
    `тестер: ${r.profile ?? r.id}`,
    `режим: ${r.mode === 'click' ? 'click' : 'realtime'}`,
    'источник: симуляция',
    `<!-- story:cold-read · ${r.mode} · до ${r.until} · персона ${r.persona}, seed ${r.seed} · ${r.id}.json -->`,
    '',
    v.quote ? `- скучно · «${v.quote}» · отложил бы телефон здесь (Итог читателя)` : `<!-- Итог читателя: ${v.verdict} -->`,
    // слабое место при «дочитал бы» — кандидат, а не жалоба: его называют всегда, по протоколу
    v.weakest?.quote && v.weakest.quote !== v.quote ? `<!-- слабое место: «${v.weakest.quote}»${v.weakest.why ? ` — ${v.weakest.why}` : ''}; в отзыв — только если ответы выше говорят о скуке -->` : null,
    '<!-- модель: разметь ответы ниже строками «- тип · «начало сообщения» · симптом» (references/digest.md) -->',
    '',
    ...String(r.data.answer).split('\n').map((l) => `> ${l}`),
    '',
  ].filter((x) => x != null).join('\n');
}

// импорт (самопроверка) не запускает команду
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) runCli(HELP, async (args) => {
  const T = thresholds();
  const ref = args.get('story');
  if (!ref || ref === true) throw new Error('нужна --story <id>');
  const p = prepare(ref);
  const all = Object.keys(PROFILES);
  const pv = args.get('profiles', 'all');
  const profiles = pv === 'all' ? all : String(pv).split(',').map((s) => s.trim());
  for (const x of profiles) if (!PROFILES[x]) throw new Error(`нет профиля «${x}» (есть: ${all.join(', ')})`);
  const modes = String(args.get('modes', 'realtime,click')).split(',').map((s) => s.trim());
  for (const m of modes) if (!['realtime', 'click'].includes(m)) throw new Error('--modes: realtime, click');
  const slicesFlag = args.get('slices');
  const slices = slicesFlag == null ? 0 : slicesFlag === true ? T.value('lab.playtest.slice.count') : intFlag(args, 'slices', 0);
  const o = { profiles, modes, at: args.get('at', 'ch1'), seed: intFlag(args, 'seed', 1), slices };
  const jobs = plan(p, o, T);
  const ready = jobs.filter((j) => !j.skip);

  if (!args.has('run')) {
    if (args.has('json')) { console.log(JSON.stringify({ story: p.story.id, ...o, jobs }, null, 1)); return 0; }
    console.log(`panel · ${p.story.id} · план (без --run ничего не запускается) · читателей ${ready.length}${slices ? `, срезов ${slices}` : ''}`);
    for (const j of jobs) console.log(`  ${j.skip ? '—' : '·'} ${j.id.padEnd(30)} ${j.mode.padEnd(8)} персона ${j.persona.padEnd(12)} до ${j.until ?? '—'}${j.skip ? `  (${j.skip})` : ''}`);
    console.log(`  запуск: тот же вызов с --run (каждый читатель — claude -p, Opus; по ${Math.min(T.value('lab.triggers.jobs'), ready.length)} одновременно)`);
    return 0;
  }

  const out = args.get('out') ?? join('docs/stories', p.story.id.replace(/-w\d+$/, ''), 'playtests', `sim-${new Date().toISOString().slice(0, 10)}`);
  mkdirSync(out, { recursive: true });
  const jobsN = Math.max(1, intFlag(args, 'jobs', T.value('lab.triggers.jobs')));
  const results = await pool(ready, jobsN, (j) => runOne(p.story.path, j));
  const rows = [];
  for (const r of results) {
    if (!r.data) { rows.push({ id: r.id, error: r.error ?? `код ${r.code}` }); continue; }
    writeFileSync(join(out, `${r.id}.json`), JSON.stringify(r.data, null, 1) + '\n');
    if (r.profile || r.mode === 'guess') writeFileSync(join(out, `${r.id}.md`), feedbackStub(r));
    const v = verdictOf(r.data.answer);
    rows.push({ id: r.id, profile: r.profile, mode: r.mode, until: r.until, persona: r.persona, verdict: v.verdict, quote: v.quote, weakest: v.weakest, isolation: r.data.isolation, cost: r.data.cost ?? null });
  }
  const cost = rows.reduce((s, r) => s + (r.cost ?? 0), 0);
  const md = [
    `# Симулированная панель · ${p.story.id} · ${o.slices ? 'срезы' : `точка ${o.at}`} · СИМУЛЯЦИЯ`,
    '',
    'Холодные читатели — `claude -p` (Opus) из пустого каталога, только видимая переписка. Это не люди: совпадения',
    'профилей — кандидаты, не свойство текста. Свести — `digest.mjs` по заготовкам `*.md` после разметки.',
    '',
    '| читатель | режим | до узла | персона | итог и слабое место | изоляция | стоимость |',
    '|---|---|---|---|---|---|---|',
    ...rows.map((r) => (r.error ? `| ${r.id} | — | — | — | ошибка: ${r.error} | — | — |`
      : `| ${r.id} | ${r.mode} | ${r.until} | ${r.persona} | ${r.verdict}${r.quote ? `: «${r.quote}»` : ''}${r.weakest?.quote ? `; слабое: «${r.weakest.quote}»` : ''} | ${r.isolation?.ok ? 'ок' : `нарушена: ${[...(r.isolation?.leaks ?? []), ...(r.isolation?.traces ?? [])].join(', ')}`}${r.isolation?.env?.removed ? ` (вырезано об окружении: ${r.isolation.env.removed})` : ''} | ${r.cost == null ? '—' : `$${r.cost.toFixed(3)}`} |`)),
    '',
    `Всего: читателей ${rows.length}, стоимость $${cost.toFixed(3)}.`,
    '',
  ].join('\n');
  writeFileSync(join(out, 'panel.md'), md);
  if (args.has('json')) console.log(JSON.stringify({ story: p.story.id, out, rows, cost }, null, 1));
  else console.log(`${md}\n→ ${out}/`);
  return rows.some((r) => r.error || r.isolation?.ok === false) ? 1 : 0;
}, { bool: ['run'] });
