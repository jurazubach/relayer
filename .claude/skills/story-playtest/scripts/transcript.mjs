// Транскрипт прохождения для чтения и сводки (narrative-testing:P-04): «время · чат · кто · текст» с узлом каждой
// строки и нажатыми кнопками. Прохождение — то же, что у story:trace (runOnce): маршрут тестера из журнала выборов
// или персона бота, поэтому строки, кнопки и длительности совпадают с story:trace.
import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { thresholdSeconds } from '../../../../scripts/lib/thresholds.mjs';
import { pathToFileURL } from 'node:url';
import { runCli, intFlag } from '../../../../scripts/story/core/cli.mjs';
import { PERSONAS, PERSONA_IDS } from '../../../../scripts/story/core/personas.mjs';
import { prepare, readSave, runOnce } from '../../../../scripts/story/core/run.mjs';
import { fmtDuration } from '../../../../scripts/story/core/timeline.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/transcript.mjs --story <id|набор.json> [--from-save <журнал.json>]
       [--persona <имя>] [--seed N] [--route 0,2,1] [--mode realtime|click] [--partial] [--until <узел>]
       [--no-nodes] [--out <файл.md>] [--json]

Транскрипт одного прохождения (скилл story-playtest): строка — «время · чат · кто: текст ‹узел›», кнопки —
варианты и нажатая жирным, молчание и напоминания — отдельными строками, главы — заголовками. В шапке — маршрут
(--route), им прохождение воспроизводится (narrative-testing:P-16), и итог как у story:trace.

Журнал тестера (отладка → «Журнал выборов» → «Скачать журнал», файл relayer-choices) читается так же, как
story:trace --from-save: бот проходит маршрут тестера, и по транскрипту видно, в каком узле он был, когда
писал «скучно» (digest.mjs). Режим берётся из журнала, если не задан.

  --story <id>       история по id, набор playtest-kit (.json) или папка (одна)
  --from-save <файл> журнал выборов тестера, сохранение движка или --json story:trace
  --persona <имя>    без журнала — кто проходит: ${PERSONA_IDS.join(', ')} (по умолчанию random)
  --seed N           seed (по умолчанию 1)
  --route 0,2,1      номера кнопок, −1 — «не ответил»; дальше — персона
  --mode             realtime (по умолчанию) или click
  --partial          набор с beta_stop: конец тестовой части — законный конец
  --until <узел>     транскрипт до первого входа в узел
  --no-nodes         без узлов: для читателя, а не для автора
  --out <файл.md>    записать в файл вместо вывода
  --json             строки транскрипта данными (время, чат, кто, текст, узел, глава)
  --help             эта справка`;

const clock = (s) => `+${fmtDuration(s)}`;

export function transcriptRows(items, mode) {
  const rows = [];
  for (const it of items) {
    const t = mode === 'click' ? it.tClick : it.tReal;
    const base = { t, knot: it.knot ?? null, chapter: it.chapter ?? null };
    if (it.type === 'line') {
      rows.push({ ...base, kind: it.kind, chat: it.name, who: it.kind === 'me' ? 'Вы' : it.kind === 'sys' ? '·' : it.whoName ?? it.name, text: it.text, delay: mode === 'click' ? it.clickDelay : it.delay, jump: !!it.jump, isChapter: !!it.isChapter });
    } else if (it.type === 'remind') rows.push({ ...base, kind: 'remind', chat: it.name ?? null, options: it.options, wait: it.wait });
    else if (it.type === 'choice') rows.push({ ...base, kind: 'choice', chat: it.name, options: it.options.map((o) => o.text), picked: it.picked, silent: !!it.silent, noAnswer: it.noAnswer ? it.noAnswer.seconds : null });
    else if (it.type === 'stall') rows.push({ ...base, kind: 'stall', reason: it.reason });
    else if (it.type === 'end' || it.type === 'stuck') rows.push({ ...base, kind: it.type });
  }
  return rows;
}

export function toMarkdown(rows, { nodes = true } = {}) {
  const out = [];
  let chapter = null;
  for (const r of rows) {
    const where = nodes && r.knot ? ` ‹${r.knot}›` : '';
    if (r.chapter != null && r.chapter !== chapter) { out.push('', `## Глава ${r.chapter}`, ''); chapter = r.chapter; }
    if (r.kind === 'choice') {
      const opts = r.options.map((o, i) => (i === r.picked && r.noAnswer == null ? `**${o}**` : o)).join(' | ');
      out.push(`- ${clock(r.t)} · ${r.chat} · кнопки: ${opts}${r.noAnswer != null ? ` — не ответил (${fmtDuration(r.noAnswer)})` : r.silent ? ' — промолчал' : ''}${where}`);
    } else if (r.kind === 'remind') out.push(`- ${clock(r.t)} · молчит у кнопок ${fmtDuration(r.wait)}${where}`);
    else if (r.kind === 'stall') out.push(`- ${clock(r.t)} · история стоит: ${r.reason}${where}`);
    else if (r.kind === 'end') out.push(`- ${clock(r.t)} · — конец —${where}`);
    else if (r.kind === 'stuck') out.push(`- ${clock(r.t)} · — прохождение оборвалось —${where}`);
    else {
      const gap = r.delay >= thresholdSeconds('story.pause.session_s') ? ` _(тишина ${fmtDuration(r.delay)})_` : r.jump ? ` _(спустя ${fmtDuration(r.delay)})_` : '';
      const said = r.kind === 'sys' ? `_${r.text}_` : `${r.who}: ${r.kind === 'photo' ? '[фото] ' : ''}${r.text}`;
      out.push(`- ${clock(r.t)} · ${r.chat} · ${said}${gap}${where}`);
    }
  }
  return out.join('\n').trim();
}

// импорт (самопроверка) не запускает команду
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) runCli(HELP, async (args) => {
  const ref = args.get('story');
  if (!ref || ref === true) throw new Error('нужна --story <id>');
  const p = prepare(ref);
  const saveFile = args.get('from-save');
  let save = null;
  let logMode = null;
  if (saveFile && saveFile !== true) {
    save = readSave(saveFile, p.story.id);
    try { logMode = JSON.parse(readFileSync(saveFile, 'utf8')).mode ?? null; } catch { logMode = null; }
  }
  const mode = args.get('mode', logMode ?? 'realtime');
  if (!['realtime', 'click'].includes(mode)) throw new Error('--mode: realtime или click');
  const persona = args.get('persona', 'random');
  if (!PERSONAS[persona]) throw new Error(`нет персоны «${persona}»`);
  const route = args.get('route') ? String(args.get('route')).split(',').map(Number) : null;
  const r = runOnce(p, { persona, seed: intFlag(args, 'seed', 1), mode, route, save, partial: args.has('partial') });
  let items = r.timeline.items;
  const until = args.get('until');
  if (until && until !== true) {
    const at = items.findIndex((i) => i.knot === until);
    if (at < 0) throw new Error(`узел «${until}» не встретился на этом маршруте`);
    items = items.slice(0, at);
  }
  const rows = transcriptRows(items, mode);
  const totals = r.timeline.totals;
  const head = {
    story: p.story.id, mode, persona: save ? 'журнал' : persona, seed: intFlag(args, 'seed', 1), from: saveFile ?? null,
    route: r.route, ending: r.ending.name, lines: totals.lines, choices: totals.choices, real: totals.real, click: totals.click, stalls: r.stalls.length,
  };
  if (args.has('json')) { console.log(JSON.stringify({ ...head, rows }, null, 1)); return 0; }
  const md = [
    `# Транскрипт · ${p.story.id} · ${mode === 'click' ? 'по клику' : 'реальное время'} · ${save ? `журнал ${saveFile}` : `${PERSONAS[persona].name}, seed ${head.seed}`}`,
    '',
    `маршрут: --route ${r.route.join(',') || '—'}${save?.start ? ` (от узла ${save.start})` : ''}`,
    `финал: ${r.ending.name} · строк ${totals.lines} · кнопок ${totals.choices} · реальное время ${fmtDuration(totals.real)} · по клику ${fmtDuration(totals.click)}${r.stalls.length ? ` · история стоит: ${r.stalls.length}` : ''}`,
    '',
    toMarkdown(rows, { nodes: !args.has('no-nodes') }),
    '',
  ].join('\n');
  const out = args.get('out');
  if (out && out !== true) { writeFileSync(out, md); console.log(`транскрипт → ${out} (строк ${rows.length})`); } else console.log(md);
  return 0;
}, { bool: ['partial', 'no-nodes'] });
