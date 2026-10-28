#!/usr/bin/env node
// Отложенные метрики «Чужого голоса» до и после ремонта: те же сводки, что T-15/collect.mjs, по двум папкам
// снимков (snap.sh). Это то, чего story-fix в своём diff-report не видит: персоны, хвост, возвращения, отвлечённый.
import fs from 'node:fs';
import path from 'node:path';

const HELP = `node docs/lab/runs/X-E3/compare.mjs <до> <после> [--json <файл>]

Читает в каждой папке chuzhoy-golos.{lint,sessions,cast,endings,vars}.json, .distracted-batches.json,
.guilt-missing.txt, .trace.compare-silent.txt (их пишет snap.sh) и печатает таблицу «до → после».
  --json <файл>  сводку обеих сторон данными
  --help         эта справка`;
const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.length < 2) { console.log(HELP); process.exit(argv.includes('--help') ? 0 : 2); }
const [A, B] = argv;
const jsonOut = argv.includes('--json') ? argv[argv.indexOf('--json') + 1] : null;
const id = 'chuzhoy-golos';
const h = (s) => Math.round((s / 3600) * 10) / 10;
const m = (s) => Math.round(s / 60);
const median = (a) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : null; };
const pct = (a, q) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.min(b.length - 1, Math.floor(b.length * q))] : null; };

function collect(dir) {
  const read = (kind) => JSON.parse(fs.readFileSync(path.join(dir, `${id}.${kind}.json`), 'utf8'));
  const text = (kind) => { try { return fs.readFileSync(path.join(dir, `${id}.${kind}`), 'utf8'); } catch { return ''; } };
  const lint = read('lint').stories[0];
  const levels = { error: 0, warning: 0, hint: 0 }; const checks = {};
  for (const f of lint.findings) { levels[f.level]++; checks[f.check] = (checks[f.check] ?? 0) + 1; }
  const ses = read('sessions').stories[0];
  const personas = {};
  for (const p of ses.personas) {
    personas[p.persona] = { real_h: h(p.real.median), click_min: m(p.click.median), max_pause_h: h(p.maxPause.max),
      tail_min: m(p.tail.median), sessions: p.sessions.median, micro: p.sessions.microShare == null ? null : Math.round(p.sessions.microShare * 100) / 100 };
  }
  const cast = read('cast').stories[0];
  const castLv = {}; for (const c of cast.cast) castLv[c.level] = (castLv[c.level] ?? 0) + 1;
  const ch1 = cast.cast.filter((c) => (c.first_chapter ?? c.firstChapter ?? c.chapters?.[0]) === 1).length;
  const vars = read('vars').stories[0];
  const end = read('endings').stories[0];
  const total = {}; const byPersona = {};
  for (const [pn, p] of Object.entries(end.personas)) {
    const s = Object.values(p.counts).reduce((a, b) => a + b, 0);
    byPersona[pn] = Object.fromEntries(Object.entries(p.counts).map(([k, v]) => [k, Math.round((v / s) * 100)]));
    for (const [k, v] of Object.entries(p.counts)) total[k] = (total[k] ?? 0) + v;
  }
  const sum = Object.values(total).reduce((a, b) => a + b, 0);
  const shares = Object.fromEntries(Object.entries(total).map(([k, v]) => [k, Math.round((v / sum) * 100)]));
  const bat = read('distracted-batches');
  const lines = bat.runs.flatMap((r) => r.batches.map((b) => b.lines));
  const guilt = text('guilt-missing.txt').match(/ждёт без напоминаний \(A-03, R-120 · P2\): (\d+) развилок/);
  const silent = text('trace.compare-silent.txt').match(/развилок (\d+), «не ответил» в (\d+).*?история стоит в (\d+)/);
  return {
    card: ses.card, lint: { total: lint.findings.length, ...levels, checks }, personas,
    cast: { contacts: cast.cast.length, levels: castLv, ch1 },
    vars: { total: vars.vars.length, counts: vars.counts },
    endings: { count: Object.keys(total).length, shares, byPersona },
    distracted: { returns_per_run: Math.round((lines.length / bat.runs.length) * 10) / 10, median: median(lines), p90: pct(lines, 0.9), max: Math.max(...lines) },
    reminders: { waiting_without: guilt ? Number(guilt[1]) : null, forks: silent ? Number(silent[1]) : null, noanswer: silent ? Number(silent[2]) : null, stalls: silent ? Number(silent[3]) : null },
  };
}

const a = collect(A); const b = collect(B);
if (jsonOut) fs.writeFileSync(jsonOut, `${JSON.stringify({ before: a, after: b }, null, 2)}\n`);
const row = (name, f) => `| ${name} | ${f(a)} | ${f(b)} |`;
const r = (x) => x.personas.random;
const top = (x) => { const [k, v] = Object.entries(x.endings.shares).sort((p, q) => q[1] - p[1])[0]; return `${k} ${v}%`; };
const chk = (c) => (x) => x.lint.checks[c] ?? 0;
const out = [
  '| метрика | до | после |', '|---|---|---|',
  row('карточка: мин / дн', (x) => `${x.card.minutes} / ${x.card.days}`),
  row('по клику, медиана (random)', (x) => `${r(x).click_min} мин`),
  row('реальное время, медиана (random)', (x) => `${r(x).real_h} ч`),
  row('реальное время: silent / first / unresponsive', (x) => ['silent', 'first', 'unresponsive'].map((p) => x.personas[p]?.real_h ?? '—').join(' / ') + ' ч'),
  row('самая длинная пауза (random)', (x) => `${r(x).max_pause_h} ч`),
  row('после последней кнопки, медиана (random / silent / first)', (x) => ['random', 'silent', 'first'].map((p) => x.personas[p]?.tail_min ?? '—').join(' / ') + ' мин'),
  row('сессий / доля микро (random)', (x) => `${r(x).sessions} / ${r(x).micro ?? '—'}`),
  row('lint: всего (ош / пр / подск)', (x) => `${x.lint.total} (${x.lint.error} / ${x.lint.warning} / ${x.lint.hint})`),
  ...['C-01', 'C-02', 'C-03', 'C-08', 'C-15', 'C-21', 'C-24', 'C-30', 'C-31', 'C-32', 'C-35', 'C-40', 'C-41', 'C-42', 'C-45'].map((c) => row(`lint ${c}`, chk(c))),
  row('финалов · самый частый (все персоны)', (x) => `${x.endings.count} · ${top(x)}`),
  row('fin_revenge: random / silent / first / last / refuse', (x) => ['random', 'silent', 'first', 'last', 'refuse'].map((p) => `${x.endings.byPersona[p]?.fin_revenge ?? 0}%`).join(' / ')),
  row('fin_truth (все персоны)', (x) => `${x.endings.shares.fin_truth ?? 0}%`),
  row('контактов (ось / сторона / ист. / фон / эпиз.)', (x) => `${x.cast.contacts} (${['ось', 'сторона', 'источник', 'фон', 'эпизодический'].map((l) => x.cast.levels[l] ?? 0).join(' / ')})`),
  row('переменных (мёртв / невид / финал / молчат)', (x) => `${x.vars.total} (${['мёртвая', 'невидимая', 'только финал', 'молчит'].map((k) => x.vars.counts?.[k] ?? '?').join(' / ')})`),
  row('отвлечённый: возвращений за прогон; строк при возвращении мед / p90 / макс', (x) => `${x.distracted.returns_per_run}; ${x.distracted.median} / ${x.distracted.p90} / ${x.distracted.max}`),
  row('развилок «ждёт без напоминаний» (guilt-scan)', (x) => x.reminders.waiting_without ?? '—'),
  row('неотвечающий: развилок / «не ответил» / история стоит', (x) => `${x.reminders.forks} / ${x.reminders.noanswer} / ${x.reminders.stalls}`),
];
console.log(out.join('\n'));
