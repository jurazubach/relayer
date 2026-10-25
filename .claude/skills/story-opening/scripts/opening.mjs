// Начало по отметкам 30 секунд / 3 минуты / глава 1: числа с тех же прогонов бота, что у story:lint, и находки
// проверок скилла (C-20, C-22…C-25). Модель судит по этим числам, а не на глаз (INTENT: «числа считают команды»).
// Функции разбора прогона нужны и first-minutes.mjs: он считает то же по каждому маршруту главы 1.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadStory, storyRefs } from '../../../../scripts/lib/story.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';
import { analyze, lintStory } from '../../../../scripts/lint/core.mjs';
import { isIncoming, median, norm } from '../../../../scripts/lint/journal.mjs';
import { fmtDur, pct, roots, short } from '../../../../scripts/lint/text.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/opening.mjs [--story <id|путь>,…] [--runs N] [--json]

Начало истории по трём отметкам (скилл story-opening; R-13…R-23, проверки C-20, C-22…C-25):
  30 с      входящих и секунд до первой кнопки (C-20.start_*), собеседников до неё (C-21.from_before_first),
            первое сообщение (C-23.first_chars), номер входящего с инцидентом (attn.opening.incident.msg)
  3 мин     окно attn.pause.early_max.window_s: кнопок нажато, самая длинная пауза (attn.pause.early_max.max_s),
            сколько собеседников уже писали (attn.opening.names.3min), доля прогонов со сроком или ставкой
  глава 1   входящих и кнопок, доля строк до финала (C-38.ch1_share), переменных записано, срок или ставка
            в стволе (C-24.share), первая пауза от story.pause.session_s: выборов до неё
            (C-32.first_pause_choices_hint) и последняя реплика перед ней
  находки   story:lint --only C-20,C-22,C-23,C-24,C-25 с тем же числом прогонов и seed — числа совпадают
Медианы — по прогонам случайного бота; «доля» — доля прогонов. Полный перебор маршрутов главы 1 —
first-minutes.mjs.

  --story     история по id, файл .json / .ink или папка; через запятую; по умолчанию все из src/stories
  --runs N    прогонов бота (по умолчанию lint.runs.full — как у story:lint)
  --json      всё данными
  --help      эта справка`;

export const OWN_CHECKS = ['C-20', 'C-22', 'C-23', 'C-24', 'C-25'];

/** Время игрока на строку — как в C-20: пауза + набор + зазор. */
const cost = (l) => l.delay + l.gap + l.typing;

/** Инцидент — как в C-23: срок мира, угроза, #unlock, #photo или прямой вопрос игроку (не приветствие). */
export function isIncident(l, T) {
  const t = l.text.toLowerCase();
  return l.kind === 'photo' || l.unlock.length > 0 || T.re('dict.world_deadline').test(t) || T.re('dict.threat').test(t)
    || (t.includes('?') && !T.re('dict.greeting').test(norm(t)));
}

/** Строка со сроком мира или ставкой из шапки — как в C-24: глава 1 до первой паузы от story.pause.long_s. */
export function stakeLine(run, ctx) {
  const { T, tree } = ctx;
  const re = T.re('dict.world_deadline');
  const stake = roots(tree.head.ставка ?? '', T.value('C-24.root'));
  const long = T.value('story.pause.long_s');
  for (const l of run.lines) {
    if (l.chapter > 1 || (l.delay >= long && l.i > 0)) return null;
    const t = l.text.toLowerCase();
    const shared = [...roots(t, T.value('C-24.root'))].filter((r) => stake.has(r)).length;
    if (re.test(t) || (shared && shared >= Math.min(T.value('C-24.min_roots'), stake.size))) return l;
  }
  return null;
}

/** Числа одного прогона по трём отметкам. */
export function routeMetrics(run, ctx) {
  const { T, st } = ctx;
  const first = run.choices[0] ?? null;
  const before = first ? run.lines.slice(0, first.at) : run.lines;
  const inc = run.lines.filter(isIncoming);
  // номер входящего на строке или перед ней — как в C-24.by_msg: системная строка до первого входящего — 0
  const incAt = (l) => (l ? run.lines.filter((x) => x.i <= l.i && isIncoming(x)).length : null);
  const incidentIdx = inc.findIndex((l) => isIncident(l, T));
  // отметка 3 минуты — по времени игрока от старта
  const win = T.value('attn.pause.early_max').window_s;
  let t = 0;
  let inWindow = run.lines.length;
  for (const l of run.lines) { t += cost(l); if (t > win) { inWindow = l.i; break; } }
  const winLines = run.lines.slice(0, inWindow);
  const stake = stakeLine(run, ctx);
  // первая пауза, после которой игрок уходит: от story.pause.session_s (R-21: «от 30 минут»)
  const session = T.value('story.pause.session_s');
  const pause = run.lines.find((l) => l.i > 0 && l.delay >= session) ?? null;
  const beforePause = pause ? run.lines.slice(0, pause.i).filter(isIncoming).at(-1) ?? null : null;
  const ch1 = run.lines.filter((l) => l.chapter <= 1);
  const toFinal = run.lines.length || 1;
  const ch1Vars = new Set((run.vars ?? []).filter((v) => (st.chapterOf(v.knot) ?? 1) <= 1).map((v) => v.name));
  return {
    start: {
      msgs: before.filter(isIncoming).length,
      seconds: before.reduce((s, l) => s + cost(l), 0),
      senders: new Set(before.filter(isIncoming).map((l) => l.who).filter(Boolean)).size,
      knot: first?.knot ?? null,
      first_text: inc[0]?.text ?? null,
      incident: incidentIdx >= 0 ? incidentIdx + 1 : null,
    },
    three_min: {
      pressed: run.choices.filter((c) => c.at <= inWindow).length,
      longest_pause: winLines.reduce((m, l, i) => (i > 0 ? Math.max(m, l.delay) : m), 0),
      speakers: new Set(winLines.filter(isIncoming).map((l) => l.who).filter(Boolean)).size,
      stake: stake ? stake.i < inWindow : false,
    },
    chapter1: {
      msgs: ch1.filter(isIncoming).length,
      choices: run.choices.filter((c) => c.chapter <= 1).length,
      share: ch1.length / toFinal,
      vars: ch1Vars.size,
      stake_msg: incAt(stake),
      stake_knot: stake?.knot ?? null,
      pause_choices: pause ? run.choices.filter((c) => c.at <= pause.i).length : null,
      pause_knot: pause?.knot ?? null,
      pause_before: beforePause?.text ?? null,
    },
  };
}

const mode = (xs) => {
  const c = new Map();
  for (const x of xs) if (x != null) c.set(x, (c.get(x) ?? 0) + 1);
  return [...c].sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
};

/** Сводка по прогонам: медианы, доли, самые частые узлы и реплики. */
export function summarize(metrics) {
  const m = (f) => median(metrics.map(f).filter((x) => x != null));
  const share = (f) => metrics.filter(f).length / (metrics.length || 1);
  const [pauseText, pauseN] = mode(metrics.map((x) => x.chapter1.pause_before));
  return {
    runs: metrics.length,
    start: {
      msgs: m((x) => x.start.msgs), seconds: m((x) => x.start.seconds), senders: m((x) => x.start.senders),
      knot: mode(metrics.map((x) => x.start.knot))[0], first_text: mode(metrics.map((x) => x.start.first_text))[0],
      incident: m((x) => x.start.incident), no_incident: share((x) => x.start.incident == null),
    },
    three_min: {
      pressed: m((x) => x.three_min.pressed), longest_pause: m((x) => x.three_min.longest_pause),
      speakers: m((x) => x.three_min.speakers), stake: share((x) => x.three_min.stake),
    },
    chapter1: {
      msgs: m((x) => x.chapter1.msgs), choices: m((x) => x.chapter1.choices), share: m((x) => x.chapter1.share),
      vars: m((x) => x.chapter1.vars), stake: share((x) => x.chapter1.stake_msg != null), stake_msg: m((x) => x.chapter1.stake_msg),
      stake_knot: mode(metrics.map((x) => x.chapter1.stake_knot))[0],
      pause: share((x) => x.chapter1.pause_choices != null), pause_choices: m((x) => x.chapter1.pause_choices),
      pause_before: pauseText, pause_before_share: pauseN / (metrics.length || 1),
    },
  };
}

/** Вердикт по ключу: «! » — за порогом (op ключа), пусто — в норме или нет числа. */
export function mark(T, key, v, sub) {
  if (v == null) return '';
  const e = T.get(key);
  const lim = sub ? e.value[sub] : e.value;
  const op = e.op ?? '>';
  const bad = op === '>' ? v > lim : op === '<' ? v < lim : op === '≥' ? v >= lim : op === '≤' ? v <= lim : op === '=' ? v === lim : false;
  return bad ? '! ' : '';
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) { console.log(HELP); return; }
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const T = thresholds();
  const runs = opt('--runs') ? Number(opt('--runs')) : T.value('lint.runs.full');
  const report = [];
  for (const ref of storyRefs((opt('--story') ?? '').split(',').filter(Boolean))) {
    const story = loadStory(ref);
    const ctx = analyze(story, T, { runs, seed: 1 });
    if (!ctx.built.ok) { report.push({ id: story.id, path: story.path, error: 'нет данных: история не компилируется (npm run story:lint)' }); continue; }
    const sum = summarize(ctx.runs.map((r) => routeMetrics(r, ctx)));
    const lint = await lintStory(story, T, { only: OWN_CHECKS, runs, seed: 1 });
    report.push({
      id: story.id, path: story.path, ...sum,
      findings: lint.findings.map((f) => ({ check: f.check, key: f.key, level: f.level, node: f.node, chapter: f.chapter, message: f.message })),
      suppressed: lint.suppressed.length,
    });
  }
  if (args.includes('--json')) { console.log(JSON.stringify({ stories: report, runs }, null, 1)); return; }
  for (const r of report) {
    if (r.error) { console.log(`${r.path}: ${r.error}\n`); continue; }
    const s = r.start;
    const w = r.three_min;
    const c = r.chapter1;
    console.log(`${r.path} · прогонов ${r.runs}`);
    console.log(`  30 с     ${mark(T, 'C-20.start_msgs', s.msgs)}входящих до первой кнопки ${s.msgs} (C-20.start_msgs_target, C-20.start_msgs) · ${mark(T, 'C-20.start_time_s', s.seconds)}${fmtDur(s.seconds)} (C-20.start_time_s) · узел ${s.knot ?? '—'}`);
    console.log(`           ${mark(T, 'C-21.from_before_first', s.senders)}собеседников до неё ${s.senders} (C-21.from_before_first) · ${s.incident == null ? '! ' : mark(T, 'attn.opening.incident.msg', s.incident, 'max')}инцидент на входящем ${s.incident ?? '—'} (attn.opening.incident.msg)${s.no_incident ? `, без инцидента ${pct(s.no_incident)} прогонов` : ''}`);
    if (s.first_text) console.log(`           ${mark(T, 'C-23.first_chars', s.first_text.length)}первое: «${short(s.first_text, 70)}» — ${s.first_text.length} знаков (C-23.first_chars)`);
    console.log(`  3 мин    кнопок нажато ${w.pressed} (R-20) · ${mark(T, 'attn.pause.early_max', w.longest_pause, 'max_s')}самая длинная пауза ${fmtDur(w.longest_pause)} (attn.pause.early_max) · ${mark(T, 'attn.opening.names.3min', w.speakers, 'speaking')}пишут ${w.speakers} (attn.opening.names.3min) · срок или ставка к отметке — ${pct(w.stake)} прогонов`);
    console.log(`  глава 1  входящих ${c.msgs}, кнопок ${c.choices} · ${mark(T, 'C-38.ch1_share', c.share)}доля строк до финала ${pct(c.share)} (C-38.ch1_share) · переменных записано ${c.vars} (R-22)`);
    console.log(`           ${mark(T, 'C-24.share', c.stake)}срок или ставка в стволе — ${pct(c.stake)} прогонов (C-24.share)${c.stake_knot ? `, чаще всего впервые в ${c.stake_knot}; ${mark(T, 'C-24.by_msg', c.stake_msg)}на входящем ${c.stake_msg} (C-24.by_msg)` : ''}`);
    if (c.pause) console.log(`           первая пауза от story.pause.session_s — у ${pct(c.pause)} прогонов, ${mark(T, 'C-32.first_pause_choices_hint', c.pause_choices)}выборов до неё ${c.pause_choices} (C-32.first_pause_choices_hint); перед ней чаще всего: «${short(c.pause_before ?? '', 60)}» (${pct(c.pause_before_share)})`);
    else console.log('           пауз от story.pause.session_s нет');
    if (r.findings.length) {
      console.log(`  находки ${OWN_CHECKS.join(', ')}: ${r.findings.length}${r.suppressed ? ` (подавлено ${r.suppressed})` : ''}`);
      const byKey = new Map();
      for (const f of r.findings) byKey.set(f.key, [...(byKey.get(f.key) ?? []), f]);
      for (const [key, fs] of byKey) {
        console.log(`    ${key} × ${fs.length}`);
        for (const f of fs.slice(0, T.value('lint.examples'))) console.log(`      ${f.node ?? (f.chapter ? `глава ${f.chapter}` : 'история')} · ${f.message}`);
      }
    } else console.log(`  находок ${OWN_CHECKS.join(', ')} нет${r.suppressed ? ` (подавлено ${r.suppressed})` : ''}`);
    console.log('');
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await main();
export const SCRIPT = fileURLToPath(import.meta.url);
