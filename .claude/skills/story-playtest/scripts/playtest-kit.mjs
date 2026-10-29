// Набор для живого теста (TH-91): .json из первых глав с заглушкой beta_stop, записки тестерам двух режимов и
// анкета. Набор проверяется тем же, чем всё остальное: компиляция scripts/lib и прохождения ботом с --partial.
// Глав тестер не видит (A-08): записки говорят «начало», а точку анкеты называют событием в переписке —
// последней входящей репликой перед паузой первого стыка, её берём из тех же прохождений бота.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compile, formatMessages } from '../../../../scripts/lib/compile.mjs';
import { loadStory, packStory, unpackStory } from '../../../../scripts/lib/story.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';
import { pathToFileURL } from 'node:url';
import { runCli, intFlag, median } from '../../../../scripts/story/core/cli.mjs';
import { BETA_STOP, prepare, runOnce } from '../../../../scripts/story/core/run.mjs';
import { fmtDuration } from '../../../../scripts/story/core/timeline.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/playtest-kit.mjs --story <id> --chapters N [--wave N] [--ask "вопрос"]…
       [--known "известная проблема"]… [--testers N] [--out <папка>] [--dry-run | --rebuild] [--json]

Набор для живой волны теста (скилл story-playtest, TH-91, narrative-testing:P-03, PAT-02, PAT-03):
  <id>-w<N>.story.json   главы 1…N; переходы в следующие главы ведут в узел beta_stop («конец тестовой части»);
                         id другой, чтобы набор не путался с историей каталога (встроенная вытесняет загруженную)
  brief-realtime.md      записка тестеру «обычный игрок»: реальное время, без отладки, уведомления включены
  brief-click.md         записка тестеру по клику: «ломатель» — молчит, отказывает, после первого прохода — отладка
  survey.md              анкета: lab.playtest.survey.open_questions открытых вопроса и пересказ; шкалы — только если
                         тестеров не меньше lab.playtest.survey.scales_min (--testers)
  kit.json               что сделано: главы, перенаправленные переходы, перенесённые VAR, входы test_*, прогоны,
                         точка анкеты
Глав тестер не видит (A-08): в записках «готово начало» или «целиком, до финала», а первая точка анкеты — событие
в переписке: «когда <контакт> напишет «…» и уйдёт из сети» — последняя входящая реплика перед паузой стыка глав 1
и 2 на всех путях бота (цитата — хвост до lab.playtest.brief.quote_words слов). В наборе одна глава — анкета в конце.

Проверка набора: компиляция и lab.playtest.kit.runs прохождений случайной, первой и последней кнопкой с --partial:
каждый прогон доходит до beta_stop или до финала. Не дошёл — код 1 и узел, где застрял.

  --story <id>      история по id, папка или .json (одна)
  --chapters N      сколько глав отдать (обычно 1–2); если в главах уже есть узел beta_stop — он и конец
  --wave N          номер волны (по умолчанию 1): папка wave-N и суффикс id
  --ask "…"         вопрос автора тестерам, до lab.playtest.brief.questions_max; можно несколько раз
  --known "…"       известная проблема словами игрока: тестер не тратит на неё время; можно несколько раз
  --testers N       сколько людей в волне (для шкал анкеты); по умолчанию lab.playtest.wave1.max
  --out <папка>     куда писать (по умолчанию docs/stories/<id>/playtests/wave-N/)
  --dry-run         собрать и проверить, ничего не записывая; записки — в вывод
  --rebuild         пересобрать только .story.json и kit.json (после правки ink): записки и анкету, которые
                    story-playtest уже довёл руками, не трогать; --ask/--known — из прежнего kit.json
  --json            итог данными
  --help            эта справка`;

const KNOT_RE = /^[ \t]*={2,}[ \t]*(?:function[ \t]+)?([A-Za-z_][\w]*)/gm;
const PREAMBLE_VAR_RE = /^[ \t]*(?:VAR|CONST|LIST)[ \t].*$/;
const CHAPTER_FILE = /^ch(\d+)\.ink$/;

/** Главы 1…N из папки истории; дальше — beta_stop. */
export function cutStory(story, n, { id, title }) {
  const { meta, files } = unpackStory(story);
  const names = Object.keys(files);
  const chapters = names.filter((f) => CHAPTER_FILE.test(f)).sort();
  if (!chapters.length) throw new Error('в истории нет глав ch01.ink…: нечего резать');
  if (n < 1) throw new Error('--chapters: хотя бы одна глава');
  const drop = chapters.filter((f) => Number(f.match(CHAPTER_FILE)[1]) > n);
  const keep = names.filter((f) => !drop.includes(f));
  const knotsOf = (text) => [...text.matchAll(KNOT_RE)].map((m) => m[1]);
  const keptKnots = new Set(keep.flatMap((f) => knotsOf(files[f])));
  const out = Object.fromEntries(keep.map((f) => [f, files[f]]));
  const report = { kept: keep.filter((f) => CHAPTER_FILE.test(f)), dropped: drop, rerouted: [], movedVars: [], stub: 'добавлен' };
  if (keptKnots.has(BETA_STOP)) report.stub = 'свой (уже был в главах)';
  else if (!drop.length) report.stub = 'не нужен: отдана вся история';
  else {
    const dropKnots = new Set(drop.flatMap((f) => knotsOf(files[f])));
    // VAR из выброшенных глав читаются и в оставленных: без них набор не скомпилируется
    const preamble = (text) => { const at = text.search(/^[ \t]*={2,}/m); return at < 0 ? text : text.slice(0, at); };
    const vars = drop.flatMap((f) => preamble(files[f]).split('\n').filter((l) => PREAMBLE_VAR_RE.test(l)));
    report.movedVars = vars.map((l) => l.trim().split(/\s+/).slice(0, 2).join(' '));
    for (const f of keep) {
      out[f] = out[f].replace(/->[ \t]*([A-Za-z_]\w*)(\.[A-Za-z_]\w*)?/g, (all, knot, _stitch, at, text) => {
        if (!dropKnots.has(knot)) return all;
        const line = text.slice(0, at).split('\n').length;
        report.rerouted.push({ file: f, line, from: knot });
        return `-> ${BETA_STOP}`;
      });
    }
    out[story.main] = out[story.main]
      .split('\n').filter((l) => !drop.includes(l.match(/^[ \t]*INCLUDE[ \t]+(.+?)[ \t]*$/)?.[1])).join('\n')
      .replace(/\s*$/, `\nINCLUDE ${BETA_STOP}.ink\n`);
    out[`${BETA_STOP}.ink`] = [
      `// Набор для теста: глава ${n} — последняя готовая. Узел ${BETA_STOP} — законный конец (story:lint --partial).`,
      ...vars,
      '',
      `=== ${BETA_STOP} ===`,
      // ST-70: системная строка — поведение интерфейса, без «ты», «!» и оценок
      'Конец тестовой части · вопросы в записке #sys',
      '-> END',
      '',
    ].join('\n');
  }
  const order = [story.main, ...Object.keys(out).filter((f) => f !== story.main)];
  const chaptersMeta = Array.isArray(meta.chapters) ? meta.chapters.slice(0, n) : meta.chapters;
  // длительности на карточке — о всей истории, а «закрытые главы» в наборе только мешают
  const { free_chapters: _fc, minutes: _m, days: _d, ...rest } = meta;
  const packed = packStory({ id, main: story.main, order, files: out, meta: { ...rest, id, title, chapters: chaptersMeta } });
  return { packed, report };
}

/**
 * Первая точка анкеты: последняя входящая реплика перед паузой стыка глав 1 и 2 в каждом прохождении.
 * Варианты по контакту, частые первыми; цитата — хвост реплики. null — стыка в наборе нет.
 */
export function seamPoint(timelines, { quoteWords }) {
  const seen = new Map();
  for (const items of timelines) {
    const at = items.findIndex((i) => i.type === 'line' && i.isChapter && i.chapter === 2);
    if (at < 0) continue;
    const last = items.slice(0, at).reverse().find((i) => i.type === 'line' && i.kind === 'in');
    if (!last) continue;
    const next = items.slice(at).find((i) => i.type === 'line' && i.kind === 'in');
    const gap = next ? next.tReal - last.tReal : null;
    const key = `${last.who}\0${last.text}`;
    const row = seen.get(key) ?? { who: last.who, name: last.name ?? last.who, text: last.text, quote: quoteTail(last.text, quoteWords), runs: 0, gap };
    row.runs++;
    seen.set(key, row);
  }
  if (!seen.size) return null;
  const variants = [...seen.values()].sort((a, b) => b.runs - a.runs);
  const byName = new Map();
  for (const v of variants) {
    if (!byName.has(v.name)) byName.set(v.name, []);
    if (!byName.get(v.name).includes(v.quote)) byName.get(v.name).push(v.quote);
  }
  const or = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} или ${xs.at(-1)}` : xs[0]);
  const text = or([...byName].map(([name, quotes]) => `${name} напишет ${or(quotes.map((q) => `«${q}»`))}`));
  const gaps = variants.map((v) => v.gap).filter((g) => g != null);
  return { variants, text, gap: gaps.length ? Math.min(...gaps) : null };
}

/** Хвост реплики до N слов: тестер узнаёт место по концу сообщения, на котором чат замолчал. */
export function quoteTail(text, n) {
  const words = String(text).trim().split(/\s+/);
  return words.length <= n ? words.join(' ') : `…${words.slice(-n).join(' ')}`;
}

/** Прогоны ботом с --partial: дошли ли до beta_stop или финала, сколько длится, где первая точка анкеты. */
function verify(file, runs, T) {
  const p = prepare(file);
  const res = [];
  const timelines = [];
  for (const persona of ['first', 'last', 'random']) {
    const n = persona === 'random' ? runs : 1;
    for (let k = 0; k < n; k++) {
      for (const mode of ['realtime', 'click']) {
        const r = runOnce(p, { persona, seed: 1 + k, mode, partial: true });
        if (mode === 'realtime') timelines.push(r.timeline.items);
        res.push({ persona, seed: 1 + k, mode, ending: r.ending.name, kind: r.ending.kind, stuck: r.ending.kind === 'stuck' ? r.ending.node : null, seconds: mode === 'click' ? r.timeline.totals.click : r.timeline.totals.real });
      }
    }
  }
  const tests = p.nodes.filter((n) => n.startsWith('test_'));
  const sec = (mode) => median(res.filter((r) => r.mode === mode && !r.stuck).map((r) => r.seconds));
  const point = seamPoint(timelines, { quoteWords: T.value('lab.playtest.brief.quote_words') });
  return { runs: res.length, stuck: res.filter((r) => r.stuck), reachedStop: res.filter((r) => r.kind === 'partial').length, realtime: sec('realtime'), click: sec('click'), tests, point };
}

const LIST = (xs, empty) => (xs.length ? xs.map((x) => `- ${x}`).join('\n') : `- ${empty}`);

/** Когда заполнять анкету: событием в переписке, а не номером главы (A-08). */
export function surveyWhen(point, mode, T) {
  if (!point) return 'один раз — в конце';
  const jump = point.gap != null && point.gap >= T.value('engine.click.time_jump_label') * 3600;
  const pause = mode === 'click'
    ? (jump ? ', а следующее сообщение придёт с меткой «спустя …»' : ' и разговор оборвётся')
    : ' и уйдёт из сети';
  return `первый раз — когда ${point.text}${pause}; второй — в конце`;
}

export function brief({ title, mode, whole, ask, known, v, wave, fileName, T }) {
  const realtime = mode === 'realtime';
  return `# Тест «${title}» · волна ${wave} · ${realtime ? 'реальное время' : 'по клику'}

Спасибо, что согласились. ${whole ? 'Это ранняя версия, но целиком, до финала.' : 'Это ранняя версия: готово начало, дальше стоит «Конец тестовой части».'}
Ищем не опечатки, а места, где вам стало скучно, непонятно или не верится.

## Как начать
1. Откройте игру, на главном экране — «Загрузить историю», выберите файл \`${fileName}\`.
2. На экране истории выберите режим **${realtime ? '«Реальное время»' : '«По клику»'}** и нажмите «Начать». Режим потом не меняйте.
${realtime
    ? `3. Играйте как обычно: сообщения приходят с настоящими паузами, всего около ${v.realtime == null ? '—' : fmtDuration(v.realtime)}.
   Уведомления в игре оставьте включёнными. Панель отладки (шестерёнка в чате) не открывайте до конца.`
    : `3. Ожиданий нет, всего около ${v.click == null ? '—' : fmtDuration(v.click)} чтения. Ваша роль — «ломатель»: молчите, отказывайте,
   выбирайте самое странное. Отладку можно открыть, только когда пройдёте один раз честно.`}

## Что прислать
- Пометки по ходу: «чат · начало сообщения → что подумал(а)». Удобнее всего скриншоты с подписью.
- Когда дойдёте до ${whole ? 'финала' : 'конца тестовой части'}: шестерёнка в чате → «Журнал выборов» → «Скачать журнал»; пришлите файл
  (по нему мы повторим ваш путь).
- Ответы на анкету \`survey.md\`: ${surveyWhen(v.point, mode, T)}.

## Что нас мучает
${LIST(ask, 'вопросов нет — просто играйте')}

## Что уже известно (не тратьте на это время)
${LIST(known, 'пока ничего')}
`;
}

export function survey({ testers, point, T }) {
  const scales = testers >= T.value('lab.playtest.survey.scales_min');
  return `# Анкета

Отвечайте коротко, своими словами. Место — имя чата и начало сообщения.
${point ? `
Заполните два раза. Первый — когда ${point.text} и уйдёт из сети (по клику — когда разговор оборвётся). Второй — в конце.
` : ''}
1. В каком месте хотелось закрыть игру? (чат, начало сообщения) → «скучно»
2. Где пришлось перечитывать или гадать, кто пишет и о чём? → «непонятно»
3. Кому вы не поверили и в какой момент? → «не верю»

Пересказ в трёх предложениях: что случилось, кто чего хочет и почему, что будет дальше.
${scales ? `
Шкалы (1 — совсем не согласен, 7 — полностью согласен; волна от ${T.value('lab.playtest.survey.scales_min')} человек):
- Я легко понимал(а), что происходит.
- Мне неясно, кто эти люди и чего они хотят.
- Мысли уходили в сторону, пока я читал(а).
- По манере письма я понимал(а), кто пишет, не глядя на имя.
- Когда приходило сообщение, хотелось сразу открыть чат.
- Мои ответы что-то меняли в истории.
` : ''}`;
}

// импорт (самопроверка) не запускает команду
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) runCli(HELP, async (args) => {
  const T = thresholds();
  const ref = args.get('story');
  if (!ref || ref === true) throw new Error('нужна --story <id>');
  const n = intFlag(args, 'chapters', null);
  if (n == null) throw new Error('нужно --chapters N: сколько глав отдать тестерам');
  const wave = intFlag(args, 'wave', 1);
  const dry = args.has('dry-run');
  const rebuild = args.has('rebuild');
  if (dry && rebuild) throw new Error('--dry-run и --rebuild вместе не имеют смысла');
  let ask = args.all('ask').filter((x) => x !== true).map(String);
  let known = args.all('known').filter((x) => x !== true).map(String);
  const qmax = T.value('lab.playtest.brief.questions_max');
  if (ask.length > qmax) throw new Error(`--ask: не больше ${qmax} вопросов (lab.playtest.brief.questions_max) — у тестера ограничено внимание (narrative-testing:P-03)`);
  const testers = intFlag(args, 'testers', T.value('lab.playtest.wave1.max'));

  const story = loadStory(ref);
  const id = `${story.id}-w${wave}`;
  const title = `${story.meta.title ?? story.id} · тест ${wave}`;
  const { packed, report } = cutStory(story, n, { id, title });
  const fileName = `${id}.story.json`;
  const built = compile({ main: 'story.ink', files: { 'story.ink': packed.ink, ...packed.includes } });
  if (!built.ok) throw new Error(`набор не компилируется (поставь beta_stop в главе ${n} руками):\n${formatMessages(built.errors)}`);

  const dir = dry ? mkdtempSync(join(tmpdir(), 'playtest-kit-')) : args.get('out') ?? join('docs/stories', story.id, 'playtests', `wave-${wave}`);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, fileName);
  writeFileSync(file, JSON.stringify(packed, null, 2) + '\n');
  let v;
  try { v = verify(file, T.value('lab.playtest.kit.runs'), T); } finally { if (dry) rmSync(dir, { recursive: true, force: true }); }

  const kitFile = join(dir, 'kit.json');
  const prev = rebuild && existsSync(kitFile) ? JSON.parse(readFileSync(kitFile, 'utf8')) : null;
  if (prev) { if (!ask.length) ask = prev.ask ?? []; if (!known.length) known = prev.known ?? []; }
  const whole = !report.dropped.length;
  const kit = { ...(prev ?? {}), story: story.id, id, wave, chapters: n, file: dry ? null : file, ...report, verify: v, survey_point: v.point?.text ?? null, ask, known, testers };
  const texts = {
    'brief-realtime.md': brief({ title, mode: 'realtime', whole, ask, known, v, wave, fileName, T }),
    'brief-click.md': brief({ title, mode: 'click', whole, ask, known, v, wave, fileName, T }),
    'survey.md': survey({ testers, point: v.point, T }),
  };
  if (!dry) {
    if (rebuild) kit.rebuilt = `${new Date().toISOString().slice(0, 10)}: --rebuild — .story.json (revision ${packed.revision ?? 1}) и kit.json; записки и анкета не тронуты`;
    else for (const [f, text] of Object.entries(texts)) writeFileSync(join(dir, f), text);
    writeFileSync(kitFile, JSON.stringify(kit, null, 2) + '\n');
  }
  if (args.has('json')) console.log(JSON.stringify(kit, null, 1));
  else {
    console.log(`playtest-kit · ${story.id} → ${id} · главы ${report.kept.join(', ')} · конец: ${report.stub}${dry ? ' · без записи (--dry-run)' : ` · ${dir}/`}`);
    if (report.dropped.length) console.log(`  не вошли: ${report.dropped.join(', ')}`);
    for (const r of report.rerouted) console.log(`  ${r.file}:${r.line}  -> ${r.from}  стало  -> ${BETA_STOP}`);
    if (report.movedVars.length) console.log(`  VAR из не вошедших глав перенесены в ${BETA_STOP}.ink: ${report.movedVars.join(', ')}`);
    console.log(`  прогонов ${v.runs}: до ${BETA_STOP} — ${v.reachedStop}, застряли — ${v.stuck.length}${v.stuck.length ? ` (${[...new Set(v.stuck.map((s) => s.stuck))].join(', ')})` : ''}`);
    console.log(`  длительность (медиана): реальное время ${v.realtime == null ? '—' : fmtDuration(v.realtime)}, по клику ${v.click == null ? '—' : fmtDuration(v.click)}`);
    console.log(`  входы test_*: ${v.tests.join(', ') || 'нет (narrative-testing:PAT-03 — для поздних глав)'}`);
    console.log(`  точка анкеты: ${v.point ? `когда ${v.point.text} (путей ${v.point.variants.length})` : 'стыка глав в наборе нет — анкета в конце'}`);
    if (rebuild) console.log('  записки и анкета не тронуты: сверь в них точку анкеты с этой строкой');
    if (dry) for (const [f, text] of Object.entries(texts)) console.log(`\n── ${f} ──\n${text}`);
  }
  return v.stuck.length ? 1 : 0;
}, { bool: ['dry-run', 'rebuild'] });
