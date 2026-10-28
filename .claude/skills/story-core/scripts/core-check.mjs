// Проверка ядра до плана: все ли поля решены, держатся ли формальные признаки правил (R-02, R-03, R-06,
// R-07, R-08, R-39, R-84) и совпадает ли шапка ink с ядром D-NN. Смысл ядра судит модель, здесь — только то,
// что можно посчитать. Пороги — ключи thresholds.json; ключа нет — «нет ключа», без запасного числа.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadStory, parseStory } from '../../../../scripts/lib/story.mjs';
import { runCli } from '../../../../scripts/story/core/cli.mjs';
import { CORE_FIELDS, STATE_DIR, axisNames, calendar, castEntries, maybe, norm, npmJson, readCore, thresholds } from './core-lib.mjs';

const WORLD_DAY = /(^|\s)(к|до)\s+(утр|вечер|ноч|полуноч|рассвет|понедельник|вторник|сред|четверг|пятниц|суббот|воскресень|конц|начал)/iu;

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/core-check.mjs --story <id> [--draft <файл>] [--ink <путь>] [--json]

Проверяет ядро истории до плана (story-core, шаг 5 алгоритма):
  1. поля ядра: логлайн, вопрос, ставка, оси, роль, герой, противник, тема, время мира, состав
     (+ скрытая правда, финалы — если есть);
  2. формальные признаки: в логлайне «ты» и противопоставление (R-02), один вопрос со знаком «?» (R-03),
     срок мира в ставке по словарю dict.world_deadline и лицо ставки из состава (R-08, R-17), число осей
     в пределах attn.state.axes (R-39), у противника «хочет» и контрплан (R-84, truby-anatomy-of-story:P-17),
     у героя вера (R-07), тема — пара полюсов (mckee-story:P-02), календарь мира по главам (A-02);
  3. если история уже есть в src/stories (или дан --ink): шапка ink против ядра — 4 строки на месте и
     совпадают с D-NN (C-53, A-06); оси — VAR существуют, пишутся и читаются (числа npm run story:vars).

Откуда ядро: --draft <файл> (черновик «- поле: значение»), иначе «ядро: D-NN» из STATUS.md, иначе последняя
запись «вид: ядро» в docs/stories/<id>/decisions.md.

  --story <id>   история (папка состояния docs/stories/<id>/ и, если есть, src/stories/<id>/)
  --draft <файл> черновик ядра в формате записи D-NN — проверить до записи
  --ink <путь>   ink для сверки шапки: скелет plans/skeleton.ink или файл истории
  --dir <папка>  где лежит состояние (по умолчанию ${STATE_DIR})
  --json         результат данными
Код выхода: 0 — пустых обязательных полей нет; 1 — есть; 2 — ошибка запуска.`;

runCli(HELP, async (args) => {
  const id = args.get('story');
  if (!id || id === true) throw new Error('нужна --story <id>');
  const draft = args.get('draft');
  const core = readCore(id, { draft: draft === true ? null : draft, dir: args.get('dir', STATE_DIR) });
  const T = thresholds();
  const items = [];
  const add = (status, rule, field, message) => items.push({ status, rule, field, message });
  const f = core.fields;

  if (!core.source) add('miss', 'R-01', 'ядро', `ядра нет: ни «ядро: D-NN» в STATUS.md, ни записи «вид: ядро» в ${STATE_DIR}/${id}/decisions.md`);
  for (const d of CORE_FIELDS) {
    if (!f[d.key] && d.need && core.source) add('miss', d.rule, d.key, `поле «${d.key}» не решено`);
  }

  // ink истории или скелета — для минут карточки, шапки и осей
  const inkRef = args.get('ink');
  const inkPath = inkRef && inkRef !== true ? inkRef : existsSync(join('src/stories', id)) ? join('src/stories', id) : null;
  let ink = null;
  if (inkPath) {
    try { ink = loadStory(inkPath); } catch (e) { add('info', 'C-53', 'шапка', `нет данных: ${inkPath} (${e.message})`); }
  }
  // логлайн
  if (f['логлайн']) {
    const l = f['логлайн'];
    if (!/(^|[\s,])(но|а|хотя|однако)([\s,]|$)|=/iu.test(l)) add('warn', 'R-02', 'логлайн', 'нет противопоставления («но», «а», «хотя», «=»): нет иронии — нет истории');
    if (!/(^|[^\p{L}])(ты|тебе|тебя|тобой|игрок)([^\p{L}]|$)/iu.test(l)) add('warn', 'R-02', 'логлайн', 'не названа роль игрока («ты — …»)');
    const words = l.split(/\s+/).filter(Boolean).length;
    const max = maybe('core.logline.max_words');
    if (max == null) add('info', 'R-02', 'логлайн', `${words} слов; порог — нет ключа core.logline.max_words (длина по R-02: npm run story:rule R-02)`);
    else if (words > max) add('warn', 'R-02', 'логлайн', `${words} слов > core.logline.max_words = ${max}`);
  }
  // вопрос
  if (f['вопрос']) {
    const q = f['вопрос'];
    const marks = (q.match(/\?/g) ?? []).length;
    if (!q.trim().endsWith('?')) add('warn', 'R-03', 'вопрос', 'главный вопрос не заканчивается «?» — это утверждение, а не вопрос, который игрок задаёт себе');
    else if (marks > 1) add('warn', 'R-03', 'вопрос', `вопросов ${marks}: главный вопрос один, остальное — вопросы глав`);
  }
  // ставка: срок мира и лицо
  const cast = castEntries(f['состав']);
  if (f['ставка']) {
    const s = f['ставка'];
    // словарь линта плюс «к утру понедельника», «до пятницы»: срок дня мира без цифр — тоже срок события
    if (!T.re('dict.world_deadline').test(s) && !WORLD_DAY.test(s)) add('warn', 'R-17', 'ставка', 'в ставке нет срока словами мира (словарь dict.world_deadline): «к утру понедельника», «через два дня»');
    const names = [...cast.flatMap((c) => (c.parts[0] ?? '').split(/[()/,]/)), ...(ink?.meta?.characters ?? []).map((c) => c.name ?? '')]
      .map((x) => x.trim()).filter((x) => x.length > 2);
    // имя в любом падеже: «Зоя», «Зою», «Зои» — по основе без последней буквы
    const faced = names.some((n) => norm(s).includes(norm(n).slice(0, Math.max(3, n.length - 1)))) || Boolean(core.other?.['лицо']);
    if (!cast.length) add('info', 'R-08', 'ставка', 'лицо ставки не проверить: состав не решён');
    else if (!faced) add('warn', 'R-08', 'ставка', 'в ставке нет лица из состава: кто именно потеряет, если игрок ошибётся');
    if (/(у тебя|ответь|успей)[^.]{0,30}\d+\s*(мин|сек|час)/iu.test(s)) add('warn', 'R-114', 'ставка', 'срок во времени игрока («у тебя N минут») — срок только событие мира (A-02, story-time)');
  }
  // оси
  const axes = axisNames(f['оси']);
  if (f['оси']) {
    const lim = T.value('attn.state.axes');
    const minutes = ink?.meta?.minutes ?? null;
    if (axes.length < lim.axes_min) add('warn', 'R-39', 'оси', `осей ${axes.length} < attn.state.axes.axes_min = ${lim.axes_min}: выбору не во что копиться`);
    if (axes.length > lim.axes_max) add('warn', 'R-39', 'оси', `осей ${axes.length} > attn.state.axes.axes_max = ${lim.axes_max}: игрок без экрана статов их не различит`);
    if (minutes != null && minutes < lim.short_min && axes.length > lim.short_vars_max) add('warn', 'R-39', 'оси', `история ${minutes} мин < attn.state.axes.short_min: осей не больше short_vars_max = ${lim.short_vars_max}`);
  }
  if (f['противник']) {
    if (!/хоч|нужн|добива/iu.test(f['противник'])) add('warn', 'R-84', 'противник', 'не сказано, чего противник хочет: соперник за ту же вещь, что нужна герою');
    if (!/контрплан|план|ход/iu.test(f['противник'])) add('warn', 'truby-anatomy-of-story:P-17', 'противник', 'нет контрплана: каким ходом он ломает план игрока');
  }
  if (f['герой'] && !/вер(ит|а|ю)|убежд|счита/iu.test(f['герой'])) add('warn', 'R-07', 'герой', 'не записана вера героя, которая ему мешает');
  if (f['роль'] && !/хоч|нуж|долг|деньг|любопыт|желан/iu.test(f['роль'])) add('warn', 'R-06', 'роль', 'у роли игрока нет своего маленького желания (деньги, долг, любопытство)');
  if (f['роль'] && !/почему|потому|из-за|ведь|поскольку/iu.test(f['роль'])) add('warn', 'vogler-writers-journey:LESSON-05', 'роль', 'не сказано, почему пишут именно игроку и зачем он герою');
  if (f['тема'] && !/\/|↔|против|или|vs/iu.test(f['тема'])) add('warn', 'mckee-story:P-02', 'тема', 'тема не названа парой полюсов («верность / правда»): её нельзя повернуть');
  const cal = calendar(f['время мира']);
  if (f['время мира'] && !cal.length) add('warn', 'A-02', 'время мира', 'нет календаря по главам («гл.1 д1 21:00; гл.2 д2 08:00»): world-clock.mjs не посчитает скачки');
  for (const c of cast) if (c.parts.length < 3) add('warn', 'R-90', 'состав', `«${c.id}»: нужно «id — функция — позиция по главному вопросу»`);
  if (f['скрытая правда'] && !/^нет\b/iu.test(f['скрытая правда'])) add('info', 'R-92', 'скрытая правда', 'есть скрытая правда: карта улик — story-mystery (clue-map.md), правда — в facts.md');

  // шапка против ядра, оси против VAR
  if (ink) {
    const head = parseStory(ink).head ?? {};
    // ядра нет, а шапка есть (история до цикла, мутант): шапка — материал для ядра v0, а не ядро
    if (!core.source && Object.keys(head).length) add('info', 'R-01', 'шапка', `шапка ink есть (${Object.keys(head).map((k) => `// ${k}:`).join(', ')}) — восстановить из неё ядро v0 и дорешать остальные поля`);
    for (const d of CORE_FIELDS.filter((x) => x.head)) {
      if (!(d.key in head)) add('warn', 'C-53', 'шапка', `в ink нет // ${d.key}: (шапка из ${T.value('C-53.header_lines')} строк, A-06)`);
      else if (f[d.key] && norm(head[d.key]) !== norm(f[d.key])) add('warn', 'R-01', 'шапка', `// ${d.key}: в ink расходится с ядром ${core.id ?? ''}: «${head[d.key].slice(0, 60)}» ≠ «${f[d.key].slice(0, 60)}»`);
    }
    if (axes.length && !inkRef) {
      const vars = npmJson('story:vars', ['--story', id]);
      if (vars.error) add('info', 'R-39', 'оси', vars.error);
      else {
        const index = new Map((vars.stories?.[0]?.vars ?? []).map((v) => [v.name, v]));
        for (const a of axes) {
          const v = index.get(a);
          if (!v) add('warn', 'C-53', 'оси', `ось «${a}»: нет такой VAR в ink`);
          else if (!v.writes.length) add('warn', 'R-39', 'оси', `ось «${a}»: не пишется ни одной записью`);
          else if (!v.reads.length) add('warn', 'C-01', 'оси', `ось «${a}»: пишется ${v.writes.length} раз, не читается нигде`);
          else add('ok', 'R-39', 'оси', `ось «${a}»: записей ${v.writes.length}, чтений видно/скрыто ${v.visibleReads ?? 0}/${v.hiddenReads ?? 0}${v.readByFinal ? ', читает финал' : ''}${v.flags?.length ? ` · ${v.flags.join(', ')}` : ''}`);
        }
      }
    }
  }

  const missing = items.filter((x) => x.status === 'miss').length;
  const res = { story: id, core: core.source ? { source: core.source, id: core.id } : null, ink: inkPath, fields: f, axes, calendar: cal, cast: cast.map((c) => c.id), items, missing, warnings: items.filter((x) => x.status === 'warn').length };
  if (args.has('json')) { console.log(JSON.stringify(res, null, 2)); return missing ? 1 : 0; }
  const mark = { miss: '✗', warn: '⚠', info: '·', ok: '✓' };
  console.log(`${id} · ядро: ${core.source ? `${core.id}${core.source === 'draft' ? ' (черновик)' : ''}` : 'нет'}${inkPath ? ` · ink: ${inkPath}` : ' · ink: ещё нет'}`);
  const filled = CORE_FIELDS.filter((d) => f[d.key]).map((d) => d.key);
  console.log(`  решено: ${filled.length ? filled.join(', ') : '—'}`);
  for (const it of items) console.log(`  ${mark[it.status]} ${it.field} · ${it.message} [${it.rule}]`);
  console.log(`итого: не решено ${missing}, предупреждений ${res.warnings}`);
  return missing ? 1 : 0;
});
