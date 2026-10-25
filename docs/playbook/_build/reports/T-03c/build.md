# T-03c · Единые пороги, словари и время игрока для story:lint и story:* — сборка

## Сделано

**Пороги (п. 1).**
- `scripts/lib/thresholds.mjs` — единственный загрузчик (перенесён из `scripts/lint/thresholds.mjs`): `value`, `re`,
  `show`, `deferred`, плюс `seconds(key)` (перевод по единице `с` / `мин` / `ч` / `дн`; не время — исключение) и
  `entry(key)` для `--json`; общий экземпляр `thresholds()`, `threshold()`, `thresholdEntry()`, `thresholdSeconds()`.
  Области `trace`, `cast`, `endings`, `vars` добавлены в схему как настройки команд (без поля `checks`).
- `scripts/lint/thresholds.mjs` — переадресация для `scripts/kb` и `scripts/hooks` (вне зоны, `requests.md` п. 3).
- `docs/playbook/thresholds.json`: 24 ключа `thresholds.default.json` сведены так:

  | было (story:*) | стало | |
  |---|---|---|
  | `bot.runs`, `bot.max_lines` | те же ключи | уже были в главном файле |
  | `sessions.gap`, `trace.distracted_away` | `story.pause.session_s` | 1800 с |
  | `sessions.long_pause` | `story.pause.long_s` | в коде не читался |
  | `sessions.max_pause` / `story_target` / `story_ceiling` | `story.pause.max_h` / `story.length.target_h` / `max_h` | часы → секунды через `seconds()` |
  | `sessions.tail_delay` | `story.tail.max_delay_min` | минуты → секунды |
  | `sessions.card_ratio` | `story.card.mismatch_ratio` | |
  | `sessions.micro_lines` / `micro_share` | `C-30.micro_lines` / `C-30.micro_share` | |
  | `click.keep_delay` | `C-31.click_delay_max_s` | |
  | `click.jump_label` | `engine.click.time_jump_label` | одно имя, 1 ч |
  | `endings.dominant` / `endings.rare` | `C-40.dominant_share` / `C-40.rare_share` | |
  | `trace.runs`, `cast.*` (4), `endings.runs`, `endings.top_vars`, `vars.silent_chapters` | новые ключи | с `unit`, `op`, `basis`, `sources`, `history` |

  У каждого сведённого ключа — запись `history` T-03c. `scripts/story/core/thresholds.mjs` и
  `thresholds.default.json` удалены; все `scripts/story/**` читают `scripts/lib/thresholds.mjs`.
- `scripts/lab/triggers-lib.mjs` — свой загрузчик с запасными числами (`DEFAULTS`) заменён на общий;
  `triggers.test.mjs` проверяет ключи через него. `scripts/lib/bot.mjs`: `maxSteps` по умолчанию — `bot.max_lines`.

**Словари (п. 2).** `scripts/lib/lexicon.mjs`: `norm`, `dict`, `isClosing`, `isPromise`, `isReproach`,
`returnDeadline` поверх `dict.*`. `lint/text.mjs` и `lint/journal.mjs` реэкспортируют их для проверок;
`story:sessions` (закрытая сессия, обещание) и `story:trace --compare silent` (упрёк) берут их же.
`scripts/story/core/lexicon.mjs` удалён; словари персон (`REFUSE`, `TRUST`, `SUSPECT`, `ASK`, `LEAVE`) — в
`core/personas.mjs` с пометкой «характер бота, не словарь свода».

**Время игрока (п. 3).** `scripts/lib/playtime.mjs`: `typingTime`, `gapTime`, `lineKind`, `lineDelay`,
`playerClock()` по `engine.typing`. `story/core/timeline.mjs` (trace, sessions, diff, cold-read) и
`lint/journal.mjs` считают одним `playerClock`; литералы `2.6, 5, 1.1…` из `timeline.mjs` и `lineTime` из
`journal.mjs` удалены. Тест `test:story-cmd` сверяет: одно прохождение — одно и то же `delay / gap / typing /
knot` у `story:trace` и журнала `story:lint`.

**Узел строки в `bot.play()` (п. 4).** Узел строки — где inkjs вывел первый кусок её текста за `Continue()`
(обёртка `PushToOutputStream`, без текста тегов между BeginTag/EndTag и без текста кнопок); узел точки
выбора — по `sourcePath` первой кнопки. Обходы убраны: `textKnots` в `lint/static.mjs` и поправка узла по тексту
в `lint/journal.mjs`; в `story:endings` (`endingOf`) счётчики посещений остались только для финала, через
который прогон прошёл без единой строки. Сверка на трёх историях (100 прогонов): строк не в своём узле — 0
(было 86 в `slepoe-pyatno` без поправки по тексту).

**Однострочное условие с переходом (п. 5).** `scripts/lib/ink.mjs`: `{x == 1: -> a}`, `{x: -> a | -> b}` и то же
под кнопкой — `cond` с ветками; условный текст без перехода — по-прежнему реплика. `isInlineDivert()` и его
использование в `vars-index.mjs`, `cast.mjs`, `endings.mjs` удалены.

**«Неотвечающий» (п. 6).** `noAnswer(choices)` и `strategies.unresponsive(fallback)` — в `scripts/lib/bot.mjs`;
`core/personas.mjs` их реэкспортирует, персона `unresponsive` — `strategies.unresponsive(random())`.

**Тесты (п. 4, 5).** `test:lib` +3: разбор однострочного условия; узел строки перед `-> END`, последней строки
узла перед переходом, хаба без реплик, распределителя без текста + финала, stitch; «неотвечающий». Все три падают
на прежнем коде. `test:lint` +1: `{a > 0: -> end_one}` — скрытое чтение распределителя без «реплики».

**`--json` в трубе (п. 8).** `lint.mjs`: ветка `--changed` без изменений больше не делает `process.exit(0)` (пустой
прогон вместо «все истории»), выход — `process.exitCode`. `skills-test.mjs`: `lintMode`/`skillMode` — `exitCode`
вместо `exit`. Прогнал `--json | JSON.parse` по всем скриптам с `--json`: `check:story`, `graph`, `story:lint`,
`story:coverage`, `hooks/full`, все `story:*`, `skills:test`, самопроверки. Обрезается только
`scripts/check-story.mjs` (вне зоны, `requests.md` п. 1).

**Мутанты (п. 9, 11).**
- `C-26`: прощание — последняя входящая реплика, `#sys` «… не в сети» пропускается; `m19` — `lint: ['C-26']`.
- `C-11`: `#silent` без `~` и реплики с переходом туда же, куда соседняя кнопка, — «без следа».
- `C-53`: в истории с метками — и цели распределителя финалов без `// финал:` (кроме ступеней к размеченным
  финалам); `m12` — `lint: ['C-40', 'C-53']`.
- `C-24`: ставка из шапки засчитывается по `story.stake.min_roots` (2) её корням в одной реплике (см. «Решения»).
- Ключ мутанта: `lint_auto` (+ `lint_why`, если `false`), `catches` — RED полными ID плюс свои C-NN.
  `lintVerdict` при `lint_auto: false` ждёт только поле `lint`, без него — статус `skill` (не входит в полноту
  линта); `zoneSummary` и отчёт `skills:test` показывают колонку «только скилл». `mutants.test.mjs` проверяет,
  что каждый RED из `catches` есть в `docs/books/<алиас>/flags.md`.
- Основа `docs/lab/mutants/_base/story.ink`: финалы `end_deal`, `end_stop` цитируют решения игрока (C-07);
  реплики не задают пол игрока (C-14); Мира в эпилоге говорит по-разному тем, кто ей писал, и тем, кто нет (C-51);
  улика «пропуск на общем крючке» звучит в стволе обеих веток главы 2, а не за кнопкой (C-54 — это и есть
  `mystery-fair-play:RED-01`). Мутанты пересобраны (`--build`), все правки легли.

**`CLAUDE.md` (п. 7, 10).** В «Команды» — `story:trace`, `story:vars`, `story:sessions`, `story:cast`,
`story:endings`, `story:diff`, `story:rule`, `story:status`, `story:cold-read`, `test:story-cmd`, `skills:test`,
`test:lab:mutants`; в «Проверку перед коммитом» — `test:story-cmd`, `skills:test`, `test:lab:mutants`; в
«Устройство» — `thresholds.mjs`, `lexicon.mjs`, `playtime.mjs` у `scripts/lib/` и строка `scripts/story/`.
README `scripts/lib`, `scripts/lint`, `scripts/story` — под новое устройство.

Попутно: тест `vars: the-number сходится с подсчётом по исходнику` падал ещё до меня (считал записи только в
`story.ink`, а после T-02 главы в `INCLUDE`) — теперь считает по `glueStory`.

## Решения

- **Ключи-дубли сведены к ключам главного файла, а не перенесены под старыми именами.** Задача: «один источник».
  Перенести `sessions.gap` рядом с `story.pause.session_s` значило бы оставить два хозяина одного числа. Новыми
  остались только ключи, которых в главном файле не было. Единицы не переводятся в файле: команды берут
  секунды через `seconds()` по полю `unit`.
- **Узел строки — по выводу текста, а не по `VisitCountAtPathString`.** Разница счётчиков не говорит, какой из
  вошедших за один `Continue()` узлов вывел строку (распределитель без текста и финал входят вместе), а «указатель
  до `Continue()`» стоит в кнопке прошлой развилки. Кроме того, при снятии поправки по тексту выяснилось, что
  ошибка шире строки перед `-> END`: `previousPointer` уводит в следующий узел и последнюю строку любого узла перед
  переходом (lookahead inkjs ищет склейку `<>`). Без общего решения убрать обход в `journal.mjs` было нельзя.
  Обёртка ставится на прототип состояния inkjs один раз и ничего не делает вне `play()`; если в будущей версии
  inkjs метода не будет, бот вернётся к `previousPointer`, а `test:lib` это покажет.
- **Ставка в C-24 — два корня шапки в одной реплике, ключ `story.stake.min_roots`.** m01 (ставка за кнопкой) не
  ловился: «камеру» из ставки «семена из камеры погибнут» основа говорит в каждой ветке главы 1. Это ложное
  «ставка прозвучала», дефект проверки, а не основы. Ключ общий (`story.*` с `checks: ["C-24"]`): это определение
  «ставка прозвучала», и новый `C-24.*` пришлось бы вписать в `checks.md` (вне зоны; `test:lint` требует строку
  «Ключи»). У трёх историй шапки `// ставка:` нет — на них правка не влияет.
- **`lint_auto: false` — у четырёх мутантов, и только с причиной.** m16 (C-44 меряет контакты от 20 реплик), m17
  (расхождение факта между ветками — нужен реестр `facts.md`) — только скилл. m10 и m11: их C-32 п. 6–7 ждут E-02,
  но дефект ловят смежные проверки (C-47 — упрёк, C-11 — молчание без продолжения), они в поле `lint`.
- **`catches` — 1–3 самых точных RED, а не все источники проверки.** Иначе `story:coverage` засчитал бы L3 строкам,
  которые мутант не воспроизводит. У m08, m10, m11, m12 RED нет: это нарушения решений автора (A-01, A-03,
  R-120) и разметки §9 — `catches` у них только из C-NN.
- **Основа правится в `_base/story.ink` напрямую** (зона `docs/lab/mutants/**`): `mutants-spec.mjs` описывает только
  правки мутантов, основу он не порождает. Все правки спецификации легли без изменений.

## Проверки

Все команды приёмки — код 0: `npm run build`, `check:story`, `test:lib` (32/32), `test:lint` (78/78),
`test:story-cmd` (35/35), `story:lint`, `story:trace -- --help`, `skills:test -- --lint-only` (полнота 100 %, 22 из
22, основа без ошибок и предупреждений; m16, m17 — «только скилл»), `test:lab:mutants` (13/13), `test:coverage` (9/9).
Сверх них — `test:hooks` (14/14), `test:lab:triggers` (13/13), `story:pack -- --check`, `prompt -- --quiet`,
`story:coverage -- --summary` (без потерь). `clusters.json` не отстал: документы свода не правились.

**До и после** (`story:lint --json`, `story:trace --persona all --json` и `--compare silent`, `story:sessions
--persona all`, `story:cast`, `story:endings`, `story:vars` на трёх историях):
- `story:vars`, `story:trace --compare silent` — совпадают; `story:endings` — распределения те же, меняются имена
  ключей в подсказках и `thresholds` (`C-40.*`, поле `unit`, `from`); `story:cast` — только `thresholds[].from/unit`.
- `story:trace` — меняется только `knot` у строк (106 в the-number, 149 в chuzhoy-golos, 8 в slepoe-pyatno на всех
  персонах): последняя строка узла перед переходом теперь подписана своим узлом, а не следующим. Время, маршруты,
  финалы те же.
- `story:sessions` — узел сессии и скачка (то же), признак «закрытая» по `dict.closing` (начало строки и не длиннее
  `C-26.closing_max_words`), имена ключей в замечаниях. Цифры времени не меняются.
- `story:lint`: число находок 857 → 857, 159 → 157, 350 → 350. Расхождения по сути:
  - узлы находок C-27, C-46, C-28 и других стали точными («Kind regards» в `ch2_judith_who`, а не в `ch2_denny`);
  - время игрока: журнал линта складывает все `#delay` строки, как движок (раньше — последний тег; строка из одних
    тегов сливается в inkjs со следующей) и не удлиняет зазор после `#silent` (`afterPlayer = !silent`, как в
    `engine.ts`). В «Слепом пятне» глава 1 — 114 мин вместо 94, хвост 26 мин вместо 16 — теперь как у
    `story:sessions`; ушли `C-38.last_tempo` и одна `story.card.mismatch_ratio`, `attn.pause.early_max` сдвинулась;
  - C-26 показывает настоящее прощание («спасибо за всё»), а не «Элли не в сети»; C-11 в the-number — 4 из 9
    `#silent` без следа вместо 3 (переход совпадает с соседней кнопкой), ключ сменился на `_share`;
  - C-03 и C-06 до и после совпадают на всех трёх историях (у `ending` в «Слепом пятне» есть и видимые чтения).

## Открыто

- `scripts/check-story.mjs` обрезает `--json` в трубе; переводы импортов `scripts/kb`, `scripts/hooks` на
  `scripts/lib/thresholds.mjs`; строки `checks.md` для C-24, C-26, C-11, C-53 — `requests.md`.
- `vars.silent_chapters` перенесён, но `story:vars` его не читает (метки «молчит больше 2 глав» нет, как и до
  T-03c). Сделать метку — отдельной правкой `story:vars`.
- `scripts/lab/triggers.mjs` держит числа в коде (`jobs: 2`, `maxTurns: 3`, `timeout: 240`) — ключи `lab.triggers.*`
  стоит завести владельцу T-12.
- Перехват `PushToOutputStream` опирается на внутреннее устройство inkjs 2.4 (как и прежний `previousPointer`).
  При обновлении inkjs первым упадёт `test:lib` («узел строки — где выведен её текст»).
- Автору: основа мутантов теперь даёт улику «пропуск на общем крючке» всем (честная игра улик), поэтому кнопка
  «Покажи пилоту журнал и следы» видна на каждом пути. Выбор финала остаётся за последней развилкой; если нужен
  путь, где разоблачать нечем, — это отдельный мутант, а не основа.
