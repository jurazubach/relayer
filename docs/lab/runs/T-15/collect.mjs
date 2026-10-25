// Сводка базового снимка T-15 из сырых выводов этой папки → metrics.json и таблица в stdout.
// Запуск из корня репозитория: node docs/lab/runs/T-15/collect.mjs [--help]
import fs from 'node:fs';
import path from 'node:path';

if (process.argv.includes('--help')) {
  console.log('node docs/lab/runs/T-15/collect.mjs — читает *.lint.json, *.sessions.json, *.cast.json, *.endings.json,\n'
    + '*.vars.json, *.distracted-batches.json рядом с собой и пишет metrics.json; таблицу печатает в stdout.');
  process.exit(0);
}

const dir = path.dirname(new URL(import.meta.url).pathname);
const IDS = ['the-number', 'slepoe-pyatno', 'chuzhoy-golos'];
const read = (id, kind) => JSON.parse(fs.readFileSync(path.join(dir, `${id}.${kind}.json`), 'utf8'));
const h = (s) => Math.round((s / 3600) * 10) / 10;
const m = (s) => Math.round(s / 60);
const median = (a) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : null; };
const pct = (a, q) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.min(b.length - 1, Math.floor(b.length * q))] : null; };

const out = {};
for (const id of IDS) {
  const lint = read(id, 'lint').stories[0];
  const levels = { error: 0, warning: 0, hint: 0 };
  const checks = {};
  for (const f of lint.findings) {
    levels[f.level]++;
    checks[f.check] = (checks[f.check] ?? 0) + 1;
  }

  const ses = read(id, 'sessions').stories[0];
  const personas = {};
  for (const p of ses.personas) {
    personas[p.persona] = {
      real_h: h(p.real.median), real_min_h: h(p.real.min), real_max_h: h(p.real.max),
      click_min: m(p.click.median), max_pause_h: h(p.maxPause.max), max_pause_knot: p.maxPause.knot,
      tail_min: m(p.tail.median), sessions: p.sessions.median,
      micro_share: p.sessions.microShare == null ? null : Math.round(p.sessions.microShare * 100) / 100,
    };
  }

  const cast = read(id, 'cast').stories[0];
  const levelsCast = {};
  for (const c of cast.cast) levelsCast[c.level] = (levelsCast[c.level] ?? 0) + 1;

  const vars = read(id, 'vars').stories[0];

  const end = read(id, 'endings').stories[0];
  const total = {};
  for (const p of Object.values(end.personas)) for (const [k, v] of Object.entries(p.counts)) total[k] = (total[k] ?? 0) + v;
  const sum = Object.values(total).reduce((a, b) => a + b, 0);
  const shares = Object.fromEntries(Object.entries(total).map(([k, v]) => [k, Math.round((v / sum) * 100)]));
  const random = end.personas.random?.counts ?? {};
  const rsum = Object.values(random).reduce((a, b) => a + b, 0);
  const randomShares = Object.fromEntries(Object.entries(random).map(([k, v]) => [k, Math.round((v / rsum) * 100)]));

  const bat = read(id, 'distracted-batches');
  const lines = bat.runs.flatMap((r) => r.batches.map((b) => b.lines));
  const notices = bat.runs.flatMap((r) => r.batches.map((b) => b.notices));

  out[id] = {
    card: ses.card,
    lint: { total: lint.findings.length, ...levels, suppressed: lint.suppressed?.length ?? 0, skipped: lint.skipped?.map((s) => s.key), checks },
    sessions: personas,
    cast: { contacts: cast.cast.length, levels: levelsCast },
    vars: { total: vars.vars.length, counts: vars.counts },
    endings: { count: Object.keys(total).length, finals: end.final, distributors: end.distributors, shares, random: randomShares },
    distracted: {
      runs: bat.runs.length, returns_per_run: Math.round((lines.length / bat.runs.length) * 10) / 10,
      lines_median: median(lines), lines_p90: pct(lines, 0.9), lines_max: lines.length ? Math.max(...lines) : null,
      notices_median: median(notices), notices_max: notices.length ? Math.max(...notices) : null,
    },
  };
}

fs.writeFileSync(path.join(dir, 'metrics.json'), JSON.stringify(out, null, 2) + '\n');

const row = (name, f) => `| ${name} | ${IDS.map((id) => f(out[id])).join(' | ')} |`;
const r = (x) => x.sessions.random;
console.log([
  `| метрика | ${IDS.join(' | ')} |`,
  `|---|${IDS.map(() => '---').join('|')}|`,
  row('карточка: мин / дн', (x) => `${x.card.minutes} / ${x.card.days}`),
  row('по клику, медиана (random)', (x) => `${r(x).click_min} мин`),
  row('реальное время, медиана (random)', (x) => `${r(x).real_h} ч (${r(x).real_min_h}–${r(x).real_max_h})`),
  row('самая длинная пауза', (x) => `${r(x).max_pause_h} ч · ${r(x).max_pause_knot}`),
  row('после последней кнопки', (x) => `${r(x).tail_min} мин`),
  row('сессий / доля микро', (x) => `${r(x).sessions} / ${r(x).micro_share ?? '—'}`),
  row('lint: всего (ош / пр / подск)', (x) => `${x.lint.total} (${x.lint.error} / ${x.lint.warning} / ${x.lint.hint})`),
  row('финалов · самый частый', (x) => { const [k, v] = Object.entries(x.endings.shares).sort((a, b) => b[1] - a[1])[0]; return `${x.endings.count} · ${k} ${v}%`; }),
  row('контактов (ось / сторона / ист. / фон / эпиз.)', (x) => `${x.cast.contacts} (${['ось', 'сторона', 'источник', 'фон', 'эпизодический'].map((l) => x.cast.levels[l] ?? 0).join(' / ')})`),
  row('переменных (мёртв / невид / финал / молчат)', (x) => `${x.vars.total} (${['мёртвая', 'невидимая', 'только финал', 'молчит'].map((k) => x.vars.counts?.[k] ?? '?').join(' / ')})`),
  row('отвлечённый: строк при возвращении (мед / p90 / макс)', (x) => `${x.distracted.lines_median ?? '—'} / ${x.distracted.lines_p90 ?? '—'} / ${x.distracted.lines_max ?? '—'}`),
].join('\n'));
