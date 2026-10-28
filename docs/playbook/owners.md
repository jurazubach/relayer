# Владельцы тем, правил, проверок и приёмов

У каждой единицы свода ровно один скилл-владелец (`build-plan.md` §1: «одна тема — один владелец»). Владелец
держит знание в своём reference на уровне L2/L3 (`flow-review.md` §C «Устройство story:coverage»), чинит его
своими приёмами и отвечает за него в ревью. Остальные скиллы не пересказывают чужое, а **ссылаются** на
`<владелец>/<файл>` по ID (`npm run story:rule R-NN`), не глубже одного уровня (`build-plan.md` §4).

Скиллов 21 (`build-plan.md` §5). Кроме них владельцем бывает только инфраструктура `story:lint` (T-03): за ней
служебные проверки, валидатор разметки и пороги нагрузки, которые читают все.

**Кто читает этот файл:**
- **сборщик скилла** (T-16) получает свои строки из всех таблиц ниже: что он держит сам и на что ссылается;
- **покрытие** (T-09, `story:coverage`) берёт отсюда колонки `owner_skill` и `target`: строка матрицы базы
  наследует владельца своего кластера (§5);
- **ревьюер скилла** проверяет, что владелец держит свои ID на L2, а ссылающийся не пересказывает их заново;
- **`story-kb`** генерирует из §5 `index.md` (алиас → темы → скилл-владелец).

**Как читать колонки.** «Файл» — reference владельца в `.claude/skills/<владелец>/references/`, либо скрипт
в `scripts/` скилла, либо приём `fixes/F-NN-*.md`. Имена файлов — из `flow-review.md` §C с поправками
`build-plan.md` §5 и решениями ниже (§7). «Ссылаются» — кто использует тему, но не держит её.

**Отменённое.** ID, которые решения автора изменили (`superseded.md`, A-01…A-06), владелец держит в новой
редакции; старую не переносит. Правила R-63, R-67, R-74, R-114, R-120…R-122 — у `story-time`.

**Не заменяет** `attention-merged.md` §10 «Нарезка по скиллам»: та таблица говорит, кто какие разделы
берёт; владельца раздела закрепляет §6 этого файла. Просьба отметить это в `attention-merged.md` — в
`_build/reports/T-10/requests.md`.

## 1. Сводка по скиллам

| скилл | вход | R | C | F | кластеры | разделы attention |
|---|---|---|---|---|---|---|
| `story-desk` | да | — | — | — | TH-100…TH-104 | — |
| `story-brainstorm` | да | R-04, R-05, R-117 | — | — | TH-01…TH-07 | — |
| `story-core` | | R-01…R-03, R-06…R-08, R-39, R-41, R-84 | — | — | TH-08…TH-14 | — |
| `story-branch` | да | R-26, R-32, R-37, R-38 | — | — | TH-15…TH-18 | — |
| `story-plan` | | R-09, R-10, R-25, R-28, R-31, R-33, R-42 | — | F-15 | TH-19…TH-23 | min-core, min-process |
| `chapter-write` | | R-27, R-118 | — | — | TH-24…TH-27 | — |
| `story-review` | да | — | — | — | TH-28…TH-32 | — |
| `story-opening` | | R-12…R-24 | C-20, C-22…C-25 | F-04 | TH-33…TH-36 | min-opening, check-30s, check-3m, check-ch1, check-ch2 |
| `story-pace` | | R-29, R-30, R-60, R-61, R-80 | C-35, C-36, C-38 | F-05, F-06 | TH-37…TH-40 | — |
| `story-pauses` | | R-62, R-64…R-66, R-68…R-73, R-100 | C-26, C-28…C-30, C-33, C-39 | F-01…F-03 | TH-41…TH-44 | min-pause, return-hook, return-first, return-recap, return-batch, return-dose |
| `story-time` | | R-63, R-67, R-74, R-114, R-120…R-122 | C-27, C-31, C-32, C-37 | — | TH-45…TH-52 | player, return-reason, return-silence, return-click, return-rhythm |
| `story-choices` | | R-34, R-36, R-40, R-43…R-54, R-56…R-58, R-116 | C-01…C-05, C-08…C-13, C-15…C-19 | F-07, F-08, F-11, F-14 | TH-53…TH-59 | min-choice, min-state |
| `story-endings` | | R-102…R-113 | C-06, C-07, C-40…C-43 | F-09, F-10, F-12 | TH-60…TH-63 | min-ending |
| `story-cast` | | R-76…R-79, R-83, R-88, R-90 | C-21, C-45, C-50 | — | TH-64…TH-67 | min-cast |
| `story-voice` | | R-59, R-75, R-81, R-82, R-86, R-87, R-89, R-119 | C-14, C-34, C-44, C-46…C-48 | — | TH-68…TH-73 | min-message |
| `story-continuity` | | R-35, R-55, R-85, R-91 | C-51 | F-13 | TH-74…TH-78 | — |
| `story-mystery` | | R-92…R-99, R-101 | C-54 | — | TH-79…TH-83 | min-mystery |
| `story-fix` | да | — | — | — | TH-84…TH-87 | cut |
| `story-playtest` | да | — | — | — | TH-88…TH-94 | check-cold |
| `story-release` | да | R-11, R-115 | C-49 | — | TH-95…TH-99 | ethics |
| `story-kb` | да | — | — | — | TH-105…TH-108 | contra, superseded |
| `story:lint` (инфраструктура, T-03) | — | — | C-52, C-53 | — | — | load |

Итого: R — 122 (R-01…R-119 и R-120…R-122 из T-05), C — 54, F — 15, кластеров — 108, разделов attention — 30.

У `story-desk`, `story-review`, `story-fix`, `story-playtest` и `story-kb` нет своих R и C: это входы-оркестраторы.
Их знание — процесс (состояние, ревью, правка, тест, база), оно в кластерах §5. Правило или проверку они
применяют по таблице владельцев, а не держат копию.

## 2. Правила `R-NN` (`rules.md`)

| ID | тема | владелец | файл | ссылаются |
|---|---|---|---|---|
| R-01 | шапка ink из 4 строк | `story-core` | `scripts/header-check.mjs`, `SKILL.md` | `story-plan/skeleton-format.md`, `chapter-write` |
| R-02 | логлайн «ты — X, пишет Y, но Z» | `story-core` | `logline.md` | `story-brainstorm/patterns-premise.md` (`premise-check.mjs`) |
| R-03 | один главный вопрос | `story-core` | `decisions-stakes.md` | `story-endings/decisions-endings.md`, `story-cast` (R-90) |
| R-04 | ядро-правило мира, «обычно…, а здесь…» | `story-brainstorm` | `patterns-premise.md` | `story-core` |
| R-05 | одно допущение на историю | `story-brainstorm` | `patterns-premise.md` | `story-plan`, `story-continuity` |
| R-06 | герой — собеседник, у игрока малое желание | `story-core` | `player-role.md` | `story-brainstorm/decisions-direction.md` |
| R-07 | вера героя, которая мешает | `story-core` | `theme.md` | `story-cast/arcs.md` |
| R-08 | ставка привязана к лицу | `story-core` | `decisions-stakes.md` | `story-cast` |
| R-09 | порядок работы: шапка → план → финал → главы | `story-plan` | `process.md` | `story-desk/state-format.md` |
| R-10 | объём опор по длине истории | `story-plan` | `chapter-formula.md` | `story-review/lenses.md` |
| R-11 | карточка привязана к тексту | `story-release` | `card.md` (`card-check.mjs`) | `story-opening` |
| R-12 | первое сообщение — событие или просьба | `story-opening` | `patterns-first-message.md` | `chapter-write`, `story-pauses/return.md` |
| R-13 | первая кнопка не позже порога | `story-opening` | `decisions-opening.md` | — |
| R-14 | прямой вопрос во 2–4-й реплике | `story-opening` | `patterns-first-message.md` | `story-choices/buttons.md` |
| R-15 | первая кнопка меняет следующую реплику | `story-opening` | `decisions-opening.md` | `story-choices/echo.md` |
| R-16 | до первой кнопки: кто, откуда знает, чего хочет | `story-opening` | `decisions-opening.md` | `story-core/player-role.md` |
| R-17 | ставка, цель и срок в стволе | `story-opening` | `decisions-opening.md` | `story-core/decisions-stakes.md` |
| R-18 | входная нагрузка: собеседники и имена | `story-opening` | `load.md` | `story-cast/unlock-schedule.md` |
| R-19 | без предыстории до первой кнопки | `story-opening` | `backstory.md` | `story-pace` |
| R-20 | отметка 3 минуты | `story-opening` | `decisions-opening.md` | — |
| R-21 | паузы в начале; первая длинная — с причиной | `story-opening` | `decisions-opening.md` | `story-time/clock.md`, `story-pauses` |
| R-22 | что есть к концу главы 1 | `story-opening` | `decisions-opening.md` | `story-plan/chapter-formula.md` |
| R-23 | глава 1 лёгкая, сильный крючок в конце | `story-opening` | `decisions-opening.md` | `story-release/free-boundary-gate.md`, `story-plan` |
| R-24 | холодный тест первых входящих | `story-opening` | `decisions-opening.md` | `story-playtest/cold-reader.md` |
| R-25 | хребет из событий, развилки сходятся | `story-plan` | `structures.md` | `story-branch` |
| R-26 | вариативность состоянием, а не узлами | `story-branch` | `budget.md` | `story-plan/structures.md` |
| R-27 | вход в главу через `#chapter`, прошлое через `VAR` | `chapter-write` | `ink-idioms.md` | `story-plan`, `story-choices/echo.md` |
| R-28 | формула главы | `story-plan` | `chapter-formula.md` | `chapter-write/chapter-checklist.md`, `story-pace` |
| R-29 | поворот ценности в каждом узле | `story-pace` | `scene-turn.md` | `chapter-write/scene.md` |
| R-30 | середина меняет цель | `story-pace` | `middle.md` | `story-plan/chapter-formula.md` |
| R-31 | каждая глава отнимает опору | `story-plan` | `chapter-formula.md` | `story-pace/middle.md` |
| R-32 | провал ведёт дальше, в изменённый мир | `story-branch` | `decisions-branch.md` | `story-endings` |
| R-33 | потеря в конце предпоследней главы | `story-plan` | `chapter-formula.md` | `story-pauses/hooks.md`, `story-endings` |
| R-34 | хаб «кому написать»: когда и сколько | `story-choices` | `choice-types.md` | `story-cast/tiers.md` |
| R-35 | сцены в любом порядке, каскад условий на входе | `story-continuity` | `merge-guard.md` | `story-choices` |
| R-36 | необязательное награждается ходом | `story-choices` | `choice-types.md` | `story-branch/costs.md` |
| R-37 | главное на видном пути | `story-branch` | `costs.md` | `story-plan` |
| R-38 | петля на `+` с выходом по условию | `story-branch` | `patterns-branch.md` | `story-choices` |
| R-39 | мало переменных | `story-core` | `axes.md` | `story-choices`, `story-plan` |
| R-40 | каждая переменная читается видимо | `story-choices` | `echo.md` | `story-endings` |
| R-41 | раздельные растущие счётчики | `story-core` | `axes.md` | `story-choices` (F-14) |
| R-42 | короткие главы | `story-plan` | `chapter-formula.md` | `story-pace` (C-38) |
| R-43 | у каждой кнопки свой ответ | `story-choices` | `buttons.md` | `story-voice` |
| R-44 | кнопка-окраска — только с реакцией | `story-choices` | `choice-types.md` | — |
| R-45 | число кнопок: темп против развилки | `story-choices` | `buttons.md` | — |
| R-46 | длина кнопки | `story-choices` | `buttons.md` | `story-voice` |
| R-47 | цена названа перед развилкой | `story-choices` | `cost.md` | `story-endings` (F-09) |
| R-48 | нет очевидно лучшего варианта | `story-choices` | `cost.md` | — |
| R-49 | решающая развилка между двумя симпатичными | `story-choices` | `people-choice.md` | `story-cast` |
| R-50 | поворотный выбор готовится узлом | `story-choices` | `choice-types.md` | `story-pace` |
| R-51 | риск в два такта «настоять / отступить» | `story-choices` | `choice-types.md` | — |
| R-52 | `#silent` — полноценный ход | `story-choices` | `silence.md` | `story-time/reminders.md` |
| R-53 | в первой развилке можно отказаться | `story-choices` | `silence.md` | `story-opening` |
| R-54 | в каждой главе условная кнопка и кнопка против совета | `story-choices` | `choice-types.md` | — |
| R-55 | `#to` с фактом из другого чата | `story-continuity` | `cross-chat.md` | `story-choices/echo.md` |
| R-56 | условием прячется только бонус | `story-choices` | `cost.md` | — |
| R-57 | кнопки, за которые стыдно | `story-choices` | `choice-types.md` | `story-voice` |
| R-58 | разговор не анкета | `story-choices` | `choice-types.md` | `story-mystery` |
| R-59 | одно сообщение — одна мысль | `story-voice` | `line-edit.md` | `chapter-write/messages.md`, `story-pace` |
| R-60 | рваный ритм очередей | `story-pace` | `density.md` | `chapter-write` |
| R-61 | серия без кнопки | `story-pace` | `density.md` | `story-opening`, `story-pauses` |
| R-62 | между длинными паузами — минуты чтения | `story-pauses` | `sessions.md` | `story-plan/schedule.md` |
| R-63 | перед паузой причина без срока (A-01) | `story-time` | `clock.md` (`promise-scan.mjs`) | `story-pauses/hooks.md`, `chapter-write/pause-lines.md` |
| R-64 | крючок перед паузой от часа | `story-pauses` | `hooks.md` | `chapter-write/pause-lines.md` |
| R-65 | пауза после события, а не перед ним | `story-pauses` | `hooks.md` | — |
| R-66 | жёсткий клиффхэнгер на `#chapter` | `story-pauses` | `hooks.md` | `story-plan` |
| R-67 | длина в реальном времени (A-02, A-05) | `story-time` | `length.md` | `story-plan/schedule.md`, `story-release/two-durations.md` |
| R-68 | первая реплика после паузы — событие | `story-pauses` | `return.md` | `chapter-write/pause-lines.md`, `story-time/modes.md` |
| R-69 | обещанное приходит сразу после паузы | `story-pauses` | `return.md` | — |
| R-70 | напоминание контекста по длине паузы | `story-pauses` | `return.md` (F-02) | — |
| R-71 | условная реплика по решению до паузы | `story-pauses` | `return.md` | `story-choices/echo.md` |
| R-72 | кнопка вскоре после паузы | `story-pauses` | `return.md` | — |
| R-73 | кнопка «Напомни» в длинных историях | `story-pauses` | `return.md` | — |
| R-74 | без упрёков за отсутствие (A-03) | `story-time` | `no-guilt.md` (`guilt-scan.mjs`) | `story-voice` (C-47), `story-release/ethics.md` |
| R-75 | карточка голоса в `characters` | `story-voice` | `voice-sheet.md` | `story-cast/character-card.md` |
| R-76 | `role` — функция в сюжете | `story-cast` | `character-card.md` | — |
| R-77 | мало контактов, у каждого от трёх реплик | `story-cast` | `tiers.md` | `story-opening/load.md` |
| R-78 | новый контакт сразу показывает голос и желание | `story-cast` | `unlock-schedule.md` | `story-voice` |
| R-79 | основной персонаж пишет первым | `story-cast` | `tiers.md` | — |
| R-80 | два несовместимых чувства в очереди | `story-pace` | `micro-tension.md` | `story-voice` |
| R-81 | `#sys` и `#photo` — поведение, а не чувства | `story-voice` | `line-edit.md` | — |
| R-82 | голос меняется с отношением | `story-voice` | `voice-sheet.md` | — |
| R-83 | неожиданный поступок готовят два намёка | `story-cast` | `arcs.md` | `story-mystery` |
| R-84 | противник — соперник за ту же вещь | `story-core` | `antagonist.md` | `story-cast` |
| R-85 | персонаж знает только написанное ему | `story-continuity` | `knowledge-flow.md` | `story-voice` (C-47) |
| R-86 | одно имя на человека | `story-voice` | `names.md` | `story-mystery` (имя-улика) |
| R-87 | добро третьему, тёплая реплика, юмор | `story-voice` | `humor.md` | `story-cast/character-card.md` |
| R-88 | каждый блок реплик делает работу; фон | `story-cast` | `tiers.md` | `story-pace` |
| R-89 | реплики игрока без пола | `story-voice` | `line-edit.md` | `story-choices/buttons.md` |
| R-90 | у каждого контакта позиция по главному вопросу | `story-cast` | `character-card.md` | `story-core/theme.md` |
| R-91 | правда — хронология в `facts.md` | `story-continuity` | `timeline.md` (`facts.mjs`) | `story-mystery`, `chapter-write/facts-anchor.md` |
| R-92 | метка `// reveal:` над узлом раскрытия | `story-mystery` | `clue-map.md` | — |
| R-93 | обязательная улика после схождения | `story-mystery` | `clue-map.md` | `story-continuity` |
| R-94 | ключевая улика — действием игрока | `story-mystery` | `deduction-gates.md` | `story-choices` |
| R-95 | загадка названа рано | `story-mystery` | `fair-play.md` | `story-opening` |
| R-96 | ложный след опровергается явно | `story-mystery` | `red-herrings.md` | — |
| R-97 | придерживать вывод, а не улики | `story-mystery` | `fair-play.md` | — |
| R-98 | механизм — бытовой аналогией заранее | `story-mystery` | `fair-play.md` | — |
| R-99 | прямой вопрос перед разгадкой | `story-mystery` | `deduction-gates.md` | — |
| R-100 | внешняя память игрока: заметки | `story-pauses` | `return.md` | `story-mystery` |
| R-101 | названная деталь возвращается | `story-mystery` | `clue-map.md` | `story-continuity` |
| R-102 | финал выбирает кнопка-ценность | `story-endings` | `decisions-endings.md` | `story-choices` |
| R-103 | 2–4 финала с меткой `// финал:` | `story-endings` | `declaring-endings.md` | `story-plan/endings-plan.md` |
| R-104 | переменные финала пишутся раньше | `story-endings` | `decisions-threshold.md` | `story-choices` |
| R-105 | перечень перед финальной кнопкой | `story-endings` | `decisions-threshold.md` | — |
| R-106 | последняя глава шагами | `story-endings` | `patterns-finale.md` | `story-plan` |
| R-107 | в финале герой решает сам | `story-endings` | `patterns-finale.md` | `story-cast/arcs.md` |
| R-108 | финал называет решения игрока | `story-endings` | `patterns-endings.md` | — |
| R-109 | последняя строка зеркалит первую | `story-endings` | `patterns-endings.md` | — |
| R-110 | короткая развязка | `story-endings` | `resolution.md` | `story-time/length.md` |
| R-111 | финалы не «хорошие» и не «плохие» | `story-endings` | `resolution.md` | `story-release/card.md` |
| R-112 | плохой финал полноценный | `story-endings` | `decisions-endings.md` | — |
| R-113 | финал сезона открывает следующую линию | `story-endings` | `resolution.md` | `story-continuity/canon.md` |
| R-114 | без сроков во времени игрока (A-03) | `story-time` | `clock.md` | `story-release/ethics.md` |
| R-115 | не наказывать отсутствие, не продавать паузы | `story-release` | `ethics.md` | `story-time/no-guilt.md`, `story-pauses` |
| R-116 | отношения не числом, без статистики игроков | `story-choices` | `cost.md` | `story-endings` |
| R-117 | всё вымышлено | `story-brainstorm` | `fiction.md` | `story-voice/names.md` (C-48), `story-release` |
| R-118 | без функций, которых нет в движке | `chapter-write` | `ink-idioms.md` | `story-review` |
| R-119 | не сшивать реплики из кусков | `story-voice` | `line-edit.md` | `chapter-write/ink-idioms.md` |
| R-120 | напоминания при молчании (A-03) | `story-time` | `reminders.md` | `story-choices/silence.md` |
| R-121 | время суток — время мира (A-02) | `story-time` | `clock.md` (`clock-scan.mjs`) | `story-core/time-model.md`, `story-continuity/timeline.md` |
| R-122 | текст читается в обоих режимах (A-04) | `story-time` | `modes.md` | `chapter-write`, `story-pauses` |

## 3. Проверки `C-NN` (`checks.md`)

Раскладка — по нарезке `build-plan-critique.md` «Предлагаемая нарезка» с поправками плана v3: время,
режимы и длина ушли из `story-pauses` в `story-time`, карточка — в `story-release`. Скрипт — та обёртка
скилла над `story:lint`, которая показывает находку автору.

| ID | проверка | владелец | файл | ссылаются |
|---|---|---|---|---|
| C-01 | мёртвая переменная | `story-choices` | `echo.md` (`echo-map.mjs`) | `story-endings` |
| C-02 | счётчик вслепую | `story-choices` | `echo.md` | `story-core/axes.md` |
| C-03 | невидимая переменная | `story-choices` | `echo.md` | `story-endings` |
| C-04 | дальность отклика | `story-choices` | `echo.md` | — |
| C-05 | глава без последствий | `story-choices` | `echo.md` | `story-branch` |
| C-06 | что читает распределитель финала | `story-endings` | `decisions-endings.md` (`endings-map.mjs`) | `story-plan/endings-plan.md` |
| C-07 | финал цитирует путь | `story-endings` | `patterns-endings.md` | — |
| C-08 | цена не видна | `story-choices` | `cost.md` | `story-endings` (F-09) |
| C-09 | хрупкие условия и лишние переменные | `story-choices` | `echo.md` | `story-core/axes.md` |
| C-10 | профиль кнопок | `story-choices` | `choice-types.md` (`choices.mjs`) | `story-branch` |
| C-11 | молчание и отказ без следа | `story-choices` | `silence.md` | `story-time/reminders.md` |
| C-12 | ширина развилки | `story-choices` | `buttons.md` | — |
| C-13 | текст кнопки | `story-choices` | `buttons.md` | `story-voice` |
| C-14 | пол игрока | `story-voice` | `line-edit.md` | `story-choices/buttons.md` |
| C-15 | недостижимое | `story-choices` | `choice-types.md` | `story-endings`, `story-branch` |
| C-16 | перекос выбора к финалу | `story-choices` | `buttons.md` (`position-bias.mjs`) | `story-endings` |
| C-17 | перекос знакомства | `story-choices` | `people-choice.md` | `story-cast` |
| C-18 | скрытая отмена выбора | `story-choices` | `cost.md` | — |
| C-19 | хабы | `story-choices` | `choice-types.md` | `story-pace` (F-06) |
| C-20 | первая кнопка | `story-opening` | `decisions-opening.md` (`opening.mjs`) | — |
| C-21 | собеседники и новые контакты | `story-cast` | `tiers.md` (`cast.mjs`) | `story-opening/load.md` |
| C-22 | новые имена и термины | `story-opening` | `load.md` | `story-voice/names.md` |
| C-23 | первое сообщение | `story-opening` | `patterns-first-message.md` | `story-pauses/return.md` |
| C-24 | ставка и срок в стволе | `story-opening` | `decisions-opening.md` (`first-minutes.mjs`) | `story-core/decisions-stakes.md` |
| C-25 | ранняя развилка и ветвление по главам | `story-opening` | `decisions-opening.md` | `story-branch` (измерение 2) |
| C-26 | пауза без крючка | `story-pauses` | `hooks.md` (`hook-pairs.mjs`) | — |
| C-27 | пауза без причины; срок возвращения (A-01) | `story-time` | `clock.md` (`promise-scan.mjs`) | `story-pauses/hooks.md` |
| C-28 | возвращение после паузы | `story-pauses` | `return.md` | — |
| C-29 | износ формул и отменённый крючок | `story-pauses` | `hooks.md` | — |
| C-30 | паузы без кнопки и микросессии | `story-pauses` | `sessions.md` | — |
| C-31 | реальное время истории (A-05) | `story-time` | `length.md` (`story:sessions`) | `story-release/two-durations.md` |
| C-32 | расписание возвращений и напоминания (A-02, A-03) | `story-time` | `reminders.md` (`guilt-scan.mjs`, `clock-scan.mjs`) | `story-playtest/personas.md` (неотвечающий) |
| C-33 | объём сессии | `story-pauses` | `sessions.md` | `story-pace` |
| C-34 | длина сообщения | `story-voice` | `line-edit.md` (`voice-stats.mjs`) | `story-pace/density.md`, `chapter-write` |
| C-35 | серия без выбора | `story-pace` | `density.md` (`pace.mjs`) | `story-opening` |
| C-36 | затишье | `story-pace` | `density.md` | — |
| C-37 | давление и ложная срочность | `story-time` | `no-guilt.md` (`guilt-scan.mjs`) | `story-release/ethics.md` |
| C-38 | темп и пропорции глав | `story-pace` | `density.md` | `story-plan/chapter-formula.md` |
| C-39 | стык глав | `story-pauses` | `hooks.md` | `story-plan` |
| C-40 | распределение финалов | `story-endings` | `decisions-endings.md` | `story-plan/endings-plan.md` |
| C-41 | ранний и короткий финал | `story-endings` | `decisions-endings.md` | — |
| C-42 | хвост после последней кнопки | `story-endings` | `resolution.md` | `story-time/length.md` |
| C-43 | развязка | `story-endings` | `resolution.md` | — |
| C-44 | голоса | `story-voice` | `voice-sheet.md` (`voice-stats.mjs`) | `story-cast` |
| C-45 | молчащие контакты | `story-cast` | `tiers.md` | — |
| C-46 | повторы | `story-voice` | `line-edit.md` | `story-continuity/merge-guard.md`, `story-pace` |
| C-47 | маркеры в тексте | `story-voice` | `line-edit.md` | `story-time` (строки «упрёк за отсутствие», «прожитое ожидание», «время игрока»: `guilt-scan.mjs`, `clock-scan.mjs`), `story-opening/backstory.md` (предыстория блоком), `story-endings` (R-107) |
| C-48 | имена | `story-voice` | `names.md` | `story-brainstorm/fiction.md` (пункт б) |
| C-49 | факты, хронология, карточка | `story-release` | `card.md` (`card-check.mjs`) | `story-continuity/timeline.md` (пункт г) |
| C-50 | адресат и шум | `story-cast` | `tiers.md` | `story-continuity/cross-chat.md` |
| C-51 | знание игрока на пути | `story-continuity` | `knowledge-flow.md` (`knowledge.mjs`) | `story-mystery` |
| C-52 | служебные проверки бота | `story:lint` | `scripts/lib/`, `check:story` | `story-review/routing.md`, `story-playtest` (`--transcript`) |
| C-53 | разметка комментариями (валидатор) | `story:lint` | валидатор разметки `build-plan.md` §9 | `story-plan/skeleton-format.md`, `chapter-write`, `story-review` |
| C-54 | честная игра улик | `story-mystery` | `fair-play.md` (`clues.mjs`) | — |

## 4. Ремонтные приёмы `F-NN` (`skills.md` §6)

Приём лежит у владельца в `fixes/F-NN-*.md`. `story-fix` применяет одобренное и держит только указатель
`fixes-index.md` (F-NN → файл владельца), поэтому ссылается на все пятнадцать.

| ID | приём | владелец | файл | ссылаются |
|---|---|---|---|---|
| F-01 | крючок перед паузой | `story-pauses` | `fixes/F-01-hook.md` | `story-fix`, `chapter-write` |
| F-02 | рекап после паузы | `story-pauses` | `fixes/F-02-recap.md` | `story-fix` |
| F-03 | склейка сессий | `story-pauses` | `fixes/F-03-merge-sessions.md` | `story-fix`, `story-time` |
| F-04 | нарезать монолог | `story-opening` | `fixes/F-04-split-monologue.md` | `story-fix`, `story-pace` |
| F-05 | экспозиция в спор | `story-pace` | `fixes/F-05-exposition-to-conflict.md` | `story-fix` |
| F-06 | хаб вместо коридора | `story-pace` | `fixes/F-06-hub.md` | `story-fix`, `story-choices/choice-types.md` |
| F-07 | оживить кнопку | `story-choices` | `fixes/F-07-live-button.md` | `story-fix` |
| F-08 | эхо и колбэки | `story-choices` | `fixes/F-08-echo.md` | `story-fix`, `story-endings` |
| F-09 | показать скрытый порог | `story-endings` | `fixes/F-09-threshold.md` | `story-fix`, `story-choices` |
| F-10 | сводка перед финалом | `story-endings` | `fixes/F-10-finale-recap.md` | `story-fix` |
| F-11 | развилка в горлышке | `story-choices` | `fixes/F-11-bottleneck.md` | `story-fix`, `story-branch` |
| F-12 | сжать развязку | `story-endings` | `fixes/F-12-resolution.md` | `story-fix` |
| F-13 | защитить слияние | `story-continuity` | `fixes/F-13-merge-guard.md` | `story-fix`, `story-review` |
| F-14 | угроза вместо тихого провала | `story-choices` | `fixes/F-14-menace.md` | `story-fix`, `story-core/axes.md` |
| F-15 | дописать недостающую опору или стадию | `story-plan` | `fixes/F-15-missing-beat.md` | `story-fix`, `story-review/lenses.md` |

## 5. Кластеры тем базы

Кластер — тема, к которой сводятся ID разборов (`flow-review.md` §C «Кластеры»). Здесь — тематический
уровень: тема → владелец → файл. Колонка «опора» перечисляет ключевые ID; полный список строк кластера
собирает матрица T-09. Строка базы, которой нет в «опоре», получает владельца по теме кластера.

У каждой строки базы в работе есть владелец: строки, которые матрица не могла отнести ни по «опоре», ни по
кластеру, ни по ссылкам, дописаны в «опору» по смыслу (T-10b, `_build/reports/T-10b/build.md`). Нюанс идёт за
своим P или PAT. Новая строка без владельца или ID в «опоре» двух скиллов роняют
`npm run story:coverage -- --summary` (список — `--unowned`).

Если ID разбора попал в «опору» двух кластеров одного скилла, его держит кластер с меньшим номером, а второй
ссылается. Двух скиллов-владельцев у строки не бывает: ID остаётся в «опоре» одного, второй пишет его в «ссылаются».
Так снят дубль `ashwell-standard-patterns:PAT-01…PAT-13` (у `story-plan/structures.md`, а не у
`story-branch/patterns-branch.md`) и другие пересечения списков §C (§7).

Строки, которые матрица отдала `story-choices` по кластеру или ссылкам, а по смыслу они чужие, перенесены в «опору»
владельца (S-choices-v2, по ревью S-choices): причина паузы — TH-48, прерывание вместо «8 секунд» — TH-44, стена
текста и коридор — TH-37, скрытый порог финала — TH-60, регистры письма — TH-68. В `story-choices` на них остались
ссылки. «Лоза» и сведение веток (`sheldon:LESSON-03`, `skolnick:LESSON-07`) остались у `story-choices`: урок о том,
что сведённые ветки должны помнить, — это эхо и F-11.
S-time так же забрала в «опору» `story-time` две строки, которые лежали у `story-choices` по кластеру:
`attention:RED-07` (молчание ведёт к худшему финалу — цена «не ответил», TH-46) и `narrative-postmortems:LESSON-08`
(таймер — только во времени мира, TH-47).

Сокращения алиасов — как в `flow-review.md` §C: `video` = `video-three-things`, `attention` =
`attention-today`, `mystery` = `mystery-fair-play` и т. д.

### `story-brainstorm`

| ID | тема | владелец | файл | опора | ссылаются |
|---|---|---|---|---|---|
| TH-01 | оси различия направлений, двухпроходная генерация | `story-brainstorm` | `diversity.md` | `procedural:P-04`; `video:PAT-02`, PAT-07; `edgerton:PAT-05` | — |
| TH-02 | от сырой идеи к осям: роль, герой, ставка, противник, жанровое обещание | `story-brainstorm` | `decisions-direction.md` | `video:P-01`…`P-03`, `P-12`, PAT-01; `truby:P-02`; `snyder:P-02`, `P-18`; `vogler:P-03`, PAT-07; `messenger:P-05` | `story-core` |
| TH-03 | премиса: три вещи, одно допущение, первобытное желание, жанровая карточка | `story-brainstorm` | `patterns-premise.md` | R-04, R-05; `video:P-05`…`P-09`; `snyder:P-04`, PAT-10; `video:RED-06` | `story-core/logline.md` |
| TH-04 | повороты замысла: ложный союзник, смена противника, маска, драматическая ирония | `story-brainstorm` | `patterns-twists.md` | `truby:PAT-03`…`PAT-05`, PAT-08, PAT-09; `vogler:PAT-05`; `maass:P-11`, `P-12`, PAT-05; `mckee:PAT-08`, `P-16` | `story-branch/patterns-reveal.md` |
| TH-05 | трейлер из пяти сообщений | `story-brainstorm` | `trailer.md` | `chat-fiction:P-07`, PAT-04; `edgerton:P-10`; `cron:PAT-01` | `story-opening` |
| TH-06 | что держит в чат-историях и мобильных историях | `story-brainstorm` | `market.md` | `chat-fiction:P-05`, `P-08`…`P-12`, `P-14`, `P-15` (остальные — в других кластерах), LESSON-05…07; `mobile:P-01`, `P-03`…`P-05`, `P-07`, `P-08`, `P-10`…`P-12`, `P-14`, LESSON-01…04; `messenger:LESSON-01`, `LESSON-12`, `LESSON-13`; `skolnick:LESSON-12`; `yorke:LESSON-03`; `chat:LESSON-06`; `choiceofgames:LESSON-01`; `mobile:LESSON-11`; `edgerton:LESSON-02` | `story-release/card.md` |
| TH-07 | вымысел и переосмысление книг без заимствования | `story-brainstorm` | `fiction.md` | R-117; `INTENT.md` «Чего нельзя» | `story-voice/names.md`, `story-release` |

### `story-core`

| ID | тема | владелец | файл | опора | ссылаются |
|---|---|---|---|---|---|
| TH-08 | ставка: лицо, срок, подъём | `story-core` | `decisions-stakes.md` | R-03, R-08; `cron:P-08`, PAT-08; `maass:P-09`, `P-10`; `edgerton:P-02`…`P-04`, PAT-03, PAT-04; `dille:P-10`; `skolnick:P-08`; `cron:PAT-06`, RED-18; `maass:PAT-06`; `skolnick:PAT-05`; `schell:PAT-08`; `sheldon:PAT-04`; `narrative-postmortems:RED-10` | `story-opening/decisions-opening.md` |
| TH-09 | роль игрока, «почему тебе» | `story-core` | `player-role.md` | R-06; `vogler:LESSON-05`; `cron:P-07` | `story-opening` |
| TH-10 | оси-переменные, противовес, растущие счётчики | `story-core` | `axes.md` | R-39, R-41; `choiceofgames:P-08`…`P-10`; `failbetter:P-02`, `P-03`, `P-05`; `emshort:P-14`; `sheldon:P-07`, PAT-01; `narrative-postmortems:P-02`; `cron:PAT-04`; `emshort:LESSON-04`; `failbetter:PAT-05`, PAT-08, RED-12; `mobile:GREEN-03`; `narrative-postmortems:RED-04`; `nicklin:LESSON-02`; `skolnick:PAT-07` | `story-choices/echo.md`, `story-plan` |
| TH-11 | противник с целью и контрпланом | `story-core` | `antagonist.md` | R-84; `truby:P-07`, `P-08`, `P-17`; `skolnick:P-10`, PAT-06; `yorke:P-11`; `snyder:P-11` | `story-cast` |
| TH-12 | тема и ценности, вера героя | `story-core` | `theme.md` | R-07; `mckee:P-01`…`P-03`; `truby:P-01`; `meaningful:P-14`; `bateman:LESSON-08`; `truby:P-15` | `story-review/lenses.md`, `story-cast/arcs.md` |
| TH-13 | календарь мира: сюжетные дни в двух режимах | `story-core` | `time-model.md` | A-02, A-04; число сюжетных дней и смена дня мира по главам (наше); база — через TH-47 | ссылается на `story-time/clock.md` (TH-47) |
| TH-14 | логлайн | `story-core` | `logline.md` | R-02; `snyder:P-01`, PAT-01; `snyder:SYS-1` | `story-brainstorm/patterns-premise.md` |

### `story-branch`

| ID | тема | владелец | файл | опора | ссылаются |
|---|---|---|---|---|---|
| TH-15 | развилка, поворот, ложный след, отказ — что когда | `story-branch` | `decisions-branch.md` | R-32; `ashwell:P-01`…`P-05`, `P-07`; `emshort:P-01`…`P-04`; `failbetter:P-10`, `P-11`; `bateman:PAT-04`; `choiceofgames:P-19`, RED-14; `mobile:PAT-07`; `narrative-postmortems:PAT-08`, GREEN-05 | `story-choices` |
| TH-16 | локальные структуры ветвления в ink | `story-branch` | `patterns-branch.md` | R-38; `emshort:PAT-01`…`PAT-03`; `failbetter:PAT-03`, PAT-07; `choiceofgames:PAT-05`…`PAT-08`; `skolnick:PAT-04`; `vogler:PAT-02`, PAT-04; `snyder:PAT-05`; `serial:PAT-10`; `vogler:P-08`, RED-08; `emshort:P-05`; `meaningful:PAT-05`; `choiceofgames:PAT-02` | `story-choices/choice-types.md` |
| TH-17 | цена ветки в тексте и видимости | `story-branch` | `costs.md` | R-37; `ashwell:P-02`, `P-09`, `P-10`, `LESSON-10`, `LESSON-11`; `meaningful:P-15`, `LESSON-10`; `narrative-postmortems:P-06`; `choiceofgames:P-22`; `narrative-testing:P-13`; `ashwell:RED-09`; `inkle:RED-10`; `mckee:LESSON-09`; `narrative-postmortems:P-10`; `narrative-testing:RED-11`; `sheldon:LESSON-10`; `skolnick:RED-10` | `story-plan` |
| TH-18 | бюджет дорогих веток | `story-branch` | `budget.md` (`branch-budget.mjs`) | R-26; `messenger:LESSON-02`; `emshort:RED-07` | `story-plan` |

`story-branch/patterns-reveal.md` (§C) не владеет темой: повороты — TH-04, порядок раскрытий — TH-81.

### `story-plan`

| ID | тема | владелец | файл | опора | ссылаются |
|---|---|---|---|---|---|
| TH-19 | каталог глобальных структур с ценой и «когда нет» | `story-plan` | `structures.md` | R-25; `ashwell:PAT-01`…`PAT-13`; `dille:P-08`, PAT-02…`PAT-04`; `bateman:P-01`, `P-11`, `P-19`, PAT-01, PAT-02; `failbetter:P-06`, PAT-01, PAT-02; `emshort:PAT-04`…`PAT-12`; `mobile:PAT-01`; `messenger:PAT-10`; `nicklin:P-08`, `P-09`, PAT-03, PAT-04; `sheldon:P-11`, PAT-03; `ashwell:P-14`; `failbetter:PAT-09`, PAT-12, LESSON-06, LESSON-09, SYS-3; `narrative-postmortems:PAT-09`, LESSON-02, SYS-2, SYS-3; `procedural:SYS-5`; `schell:PAT-02`, LESSON-03 | `story-branch` |
| TH-20 | глава как эпизод: опоры, формула, A/B/C | `story-plan` | `chapter-formula.md` | R-10, R-28, R-31, R-33, R-42; `yorke:P-02`, `P-04`, `P-06`, PAT-01, PAT-02, PAT-09, PAT-10; `snyder:PAT-02`, PAT-03, PAT-11; `skolnick:PAT-01`; `vogler:PAT-01`, PAT-11; `truby:PAT-01`; `nicklin:P-07`; `narrative-postmortems:RED-09`; `snyder:GREEN-09`; `vogler:LESSON-10` | `story-pace`, `chapter-write/chapter-checklist.md` |
| TH-21 | процесс производства: порядок, суперкат, «финал первым» | `story-plan` | `process.md` | R-09; `inkle` SYS-5; `bateman:LESSON-13`; `choiceofgames:P-16`, `P-17`; `dille:LESSON-04`; `yorke:P-10`; `narrative-postmortems:P-14`, `LESSON-12`; `mystery:LESSON-08`; `skolnick:LESSON-14`; `bateman` SYS-3 | `story-desk/state-format.md`, `story-desk/staleness.md` (перепись ранних глав) |
| TH-22 | тест до прозы: формат скелета, заглушки | `story-plan` | `skeleton-format.md` | `narrative-testing:P-01`, PAT-09 | `story-playtest/build.md` |
| TH-23 | расписание пауз по главам в двух режимах | `story-plan` | `schedule.md` | `serial:P-06`, `P-07`; `snyder:GREEN-04`; `truby:LESSON-08` | ссылается на `story-time/length.md`, `story-pauses/hooks.md` |

`story-plan/endings-plan.md` и `free-boundary.md` (§C) не владеют темой: распределитель — TH-60, граница — TH-97.

### `chapter-write`

| ID | тема | владелец | файл | опора | ссылаются |
|---|---|---|---|---|---|
| TH-24 | ink-идиомы и наши теги | `chapter-write` | `ink-idioms.md` | R-27, R-118; `docs/capabilities.json`; `inkle:PAT-01`, PAT-02, PAT-08, SYS-1, раздел «Идиомы ink»; `bateman:P-17`, PAT-09; `emshort:P-11`; `procedural:PAT-01`; `inkle:LESSON-13` | `story-voice/line-edit.md` (сшивка) |
| TH-25 | сцена с «поэтому»: причинность при письме | `chapter-write` | `scene.md` | `cron:P-09`, PAT-09; `skolnick:P-01`; `snyder:P-16`; `maass:P-07`, `P-08`; `cron:PAT-03`, RED-21; `edgerton:P-11` | ссылается на `story-pace/scene-turn.md` |
| TH-26 | якоря фактов для модели | `chapter-write` | `facts-anchor.md` | `procedural:LESSON-08`, `P-15`; `dille:P-04` | `story-continuity/timeline.md` |
| TH-27 | сводный чек-лист «написать главу» | `chapter-write` | `chapter-checklist.md` | раздел «Как написать главу или сцену» в 30 `checklists.md` | `story-review` |

`chapter-write/messages.md` и `pause-lines.md` (§C) не владеют темой: сообщение — TH-69, реплики у паузы —
TH-41, TH-42, TH-48.

### `story-review`

| ID | тема | владелец | файл | опора | ссылаются |
|---|---|---|---|---|---|
| TH-28 | формат находки, уровни «замер / модель / человек» | `story-review` | `finding-format.md` | `build-plan.md` §4; `narrative-testing:P-02`; `mckee:LESSON-12` | все диагносты |
| TH-29 | приоритет: непонятное раньше скучного, конфликты правок | `story-review` | `priority.md` | `edgerton:LESSON-01`; `snyder:LESSON-05`; `narrative-testing:P-05`, `P-15`; `nicklin:LESSON-10` | `story-fix` |
| TH-30 | линзы теорий как «упущенные возможности» | `story-review` | `lenses.md` | `meaningful` SYS-1…SYS-4; `schell:LESSON-12`; `vogler:P-01`, `LESSON-01`, `LESSON-02`; `snyder:LESSON-01`, `LESSON-04`; `yorke:P-15`; `snyder:LESSON-12` | `story-plan` (F-15) |
| TH-31 | QA «шесть списков» | `story-review` | `qa-six.md` | `narrative-testing:P-14`, SYS-04, `checklists.md` §3 | `story-continuity/timeline.md` |
| TH-32 | какие линзы при каких метриках | `story-review` | `routing.md` (`select-lenses.mjs`) | наше | — |

### `story-opening`

| ID | тема | владелец | файл | опора | ссылаются |
|---|---|---|---|---|---|
| TH-33 | контрольные точки 30 с / 3 мин / глава 1 | `story-opening` | `decisions-opening.md` | `алиас:attention§2` ×30; R-13, R-15…R-17, R-20…R-24; `failbetter:RED-13`; `mobile:GREEN-07`; `narrative-testing:GREEN-01`; `nicklin:RED-15`; `video:GREEN-02`, RED-05, RED-07 | `story-playtest` |
| TH-34 | первое сообщение и первая сцена | `story-opening` | `patterns-first-message.md` | R-12, R-14; `edgerton:P-01`, `P-13`…`P-15`, PAT-01; `cron:P-01`, `P-02`; `chat-fiction:P-06`; `skolnick:P-02`, PAT-08; `messenger:P-04`, `P-09`, PAT-04; `schell:P-02`; `mckee:P-09`; `snyder:P-05`; `video:RED-01` | `story-pauses/return.md` |
| TH-35 | нагрузка начала: имена, сущности, контакты | `story-opening` | `load.md` | R-18; `attention:P-03`, PAT-03; `video:P-04`; `edgerton:P-08`; `choiceofgames:RED-19`; `mobile:RED-10`; `narrative-testing:RED-21`; `video:PAT-05`, RED-03, RED-04; `yorke:RED-18` | `story-cast/unlock-schedule.md`, `story-voice/names.md` |
| TH-36 | предыстория по запросу | `story-opening` | `backstory.md` | R-19; `edgerton:P-06`, PAT-02; `skolnick:P-04`, PAT-03; `cron:P-13`, PAT-07; `maass:P-13`; `snyder:P-17`, PAT-08; `mckee:PAT-03`; `skolnick:PAT-02` | `story-pace` |

### `story-pace`

| ID | тема | владелец | файл | опора | ссылаются |
|---|---|---|---|---|---|
| TH-37 | плотность событий вместо «кривой интереса» | `story-pace` | `density.md` | R-60, R-61; `attention:P-12`, `LESSON-02`; `mckee:P-15`, PAT-07; `schell:P-03`, `P-15`, PAT-04 (без формулы); `yorke:LESSON-04`; `narrative-postmortems:LESSON-13`; `bateman:P-09`; `choiceofgames:LESSON-13`; `narrative-postmortems:LESSON-09`; `narrative-testing:RED-06`; `nicklin:PAT-02`; `schell:P-01`, PAT-09, RED-01, LESSON-09; `choiceofgames:RED-11` (стена текста), `narrative-postmortems:RED-01` (коридор без кнопки) | `story-review` |
| TH-38 | микронапряжение: два чувства, зазор, недомолвка | `story-pace` | `micro-tension.md` | R-80; `maass:P-01`…`P-03`, `P-14`, `P-15`, PAT-01; `mckee:P-04`, `P-05`, `P-14`; `cron:P-14`, `P-15`; `maass:PAT-07` | `story-voice` |
| TH-39 | поворот ценности в сцене | `story-pace` | `scene-turn.md` | R-29; `mckee:P-06`, PAT-01; `yorke:P-07`, PAT-03; `maass:PAT-04`; `mckee:LESSON-07` | `chapter-write/scene.md` |
| TH-40 | середина и провисание | `story-pace` | `middle.md` | R-30; `snyder:P-09`, `P-10`, `LESSON-08`; `yorke:P-03`, `P-05`, PAT-06; `skolnick:PAT-09`; `vogler:P-10`, `LESSON-03`, `LESSON-04`; `yorke:PAT-08` | `story-plan/chapter-formula.md` |

### `story-pauses`

| ID | тема | владелец | файл | опора | ссылаются |
|---|---|---|---|---|---|
| TH-41 | крючок перед паузой: лестница, типы, чередование | `story-pauses` | `hooks.md` | R-64…R-66; `serial:P-01`…`P-04`, `P-11`, `P-14`, PAT-01, PAT-02, PAT-05…`PAT-08`; `maass:P-04`, PAT-09; `dille:P-13`; `yorke:P-09`, PAT-05; `chat-fiction:P-02`, `P-03`, PAT-02, PAT-06, PAT-08; `mobile:P-02`, `P-09`, PAT-05; `schell:PAT-03`; `edgerton:PAT-07`; `video:PAT-08`; `sheldon:PAT-09`; `failbetter:GREEN-08`, RED-14; `mobile:GREEN-01`; `narrative-testing:GREEN-03`, RED-05; `serial:RED-18`; `snyder:GREEN-10`, RED-19 | `chapter-write/pause-lines.md`, `story-plan` |
| TH-42 | возвращение: первая реплика, рекап из состояния, пачка непрочитанного | `story-pauses` | `return.md` | R-68…R-73; `serial:P-08`…`P-10`, PAT-03, PAT-11, `LESSON-06`, `LESSON-09`; `attention:P-06`, PAT-01, `LESSON-04`, `LESSON-07`; `messenger:P-02`; `failbetter:P-14`, PAT-11, `LESSON-01`, `LESSON-02`; `bateman:P-07`, PAT-05, PAT-11; `mobile:P-15`; `yorke:PAT-12`, `LESSON-11`; `video:LESSON-10`; `edgerton:PAT-08`; `mystery:LESSON-07`, PAT-10; `schell:PAT-11`; `bateman:PAT-03`, PAT-10, LESSON-02; `chat:RED-03`; `choiceofgames:RED-18`; `messenger:RED-03`; `narrative-testing:GREEN-11` | `chapter-write/pause-lines.md` |
| TH-43 | внешняя память игрока: заметки | `story-pauses` | `return.md` | R-100; `attention:P-05`, PAT-02; `inkle:PAT-09`; `cron:PAT-05`; `choiceofgames:GREEN-11`; `inkle:LESSON-04` | `story-mystery` |
| TH-44 | сессии и микросессии, сводка вместо капельницы | `story-pauses` | `sessions.md` | R-62; `attention:P-08`, `P-09`, PAT-06…`PAT-08`, `LESSON-05`, `LESSON-06`; `chat-fiction:P-01`, PAT-01, PAT-07; `failbetter:LESSON-13`; `narrative-postmortems:P-19`; `serial:PAT-09`; `mobile:LESSON-04`; `attention:P-01`, RED-01, LESSON-01 (прерывание вместо «8 секунд») | `story-pace` |

### `story-time`

| ID | тема | владелец | файл | опора | ссылаются |
|---|---|---|---|---|---|
| TH-45 | два равноценных режима; кнопка «пропустить» для тестов | `story-time` | `modes.md` (`click-transcript.mjs`) | A-04; R-122; `messenger:LESSON-10` (риск); `schell:LESSON-06`; E-01; `choiceofgames:LESSON-10`; `maass:LESSON-06`; `narrative-postmortems:SYS-5` | все пишущие, `story-playtest` |
| TH-46 | напоминания при молчании, ветка «не ответил» | `story-time` | `reminders.md` (`guilt-scan.mjs`) | A-03; R-120; `inkle:PAT-07`; `messenger` Система 1, шаг 4; `attention:RED-07` (молчание ведёт к худшему финалу — цена «не ответил», S-time) | `story-choices/silence.md` |
| TH-47 | часы сюжета против часов игрока | `story-time` | `clock.md` (`clock-scan.mjs`) | A-02; R-114, R-121; `messenger:P-12` (часть «в силе»), PAT-03 (устарел); `serial-hooks` Система 3; `narrative-testing:RED-33`; `narrative-postmortems:LESSON-08` (таймер и срок — только во времени мира, S-time) | `story-core/time-model.md`, `story-continuity/timeline.md` |
| TH-48 | причина паузы без срока возвращения | `story-time` | `clock.md` (`promise-scan.mjs`) | A-01; R-63; `chat:PAT-03`; `maass:LESSON-03`; `mckee:LESSON-10`; `narrative-postmortems:PAT-10`, RED-11, LESSON-01; `serial:GREEN-08`, RED-08; `choiceofgames:GREEN-12`, LESSON-02 (причина паузы) | `story-pauses/hooks.md`, `chapter-write/pause-lines.md` |
| TH-49 | длина истории и главы в реальном времени | `story-time` | `length.md` (`story:sessions`, `clock-scan.mjs`) | A-05; R-67; `inkle:P-18`, `LESSON-01`; `video:LESSON-11`; `yorke:LESSON-10`; `serial:LESSON-13`; `chat-fiction:P-13`; `chat:PAT-05`; `narrative-postmortems:P-17`; `serial:RED-07` | `story-release/two-durations.md`, `story-plan/schedule.md` |
| TH-50 | повтор и быстрый режим | `story-time` | `replay.md` | `messenger:LESSON-04`; уроки о быстром режиме в части «в силе» (`superseded.md` A-04); `narrative-postmortems:LESSON-15`; `sheldon:LESSON-11`; `skolnick:LESSON-06` | `story-release` |
| TH-51 | упрёк только за `#silent`, никогда за отсутствие | `story-time` | `no-guilt.md` (`guilt-scan.mjs`) | R-74; `attention:P-10` (часть «в силе»), `LESSON-11`; `meaningful:attention§3`, `§5`; `messenger:attention§5` | `story-voice` (C-47), `story-release/ethics.md` |
| TH-52 | давление и ложная срочность | `story-time` | `no-guilt.md` | C-37; `attention:RED-08`; `serial:RED-17`; `maass:RED-10` | `story-release/ethics.md` |

### `story-choices`

| ID | тема | владелец | файл | опора | ссылаются |
|---|---|---|---|---|---|
| TH-53 | типы выбора и когда какой | `story-choices` | `choice-types.md` | R-44, R-50, R-51, R-54, R-57, R-58; `choiceofgames:P-20`, PAT-10; `meaningful:P-06`, `P-12`, PAT-08; `mckee:PAT-02`, PAT-10, `LESSON-01`; `maass:P-05`, PAT-08; `schell:P-12`; `nicklin:P-11`, PAT-06; `bateman:P-16`, PAT-07, GREEN-05; `emshort:RED-17`; `failbetter:PAT-10`; `meaningful:RED-11`; `narrative-postmortems:LESSON-07`; `schell:PAT-06` | `story-branch` |
| TH-54 | хабы и необязательное | `story-choices` | `choice-types.md` | R-34, R-36; C-19; `failbetter:P-17`; `attention:GREEN-03`; `bateman:PAT-06`; `emshort:RED-05`, RED-09, RED-15; `failbetter:RED-08`; `inkle:PAT-06`, PAT-10, LESSON-14; `mobile:PAT-03`; `narrative-postmortems:PAT-01`, GREEN-02, RED-06; `narrative-testing:PAT-08`, RED-01, RED-17 | `story-pace` (F-06), `story-cast` |
| TH-55 | текст кнопки, число вариантов, голос кнопок | `story-choices` | `buttons.md` | R-43, R-45, R-46; `meaningful:P-01`, `P-13`; `messenger:P-07`, `P-13`; `choiceofgames:P-24`; `failbetter:P-16`; `inkle:P-08`, `P-09`; `mystery:LESSON-11`; `sheldon:LESSON-08`; `nicklin:P-12`; `narrative-postmortems:LESSON-11`; `choiceofgames:GREEN-10`; `emshort:RED-13`; `narrative-testing:RED-26`, RED-27 | `story-voice` |
| TH-56 | мёртвая переменная, отклик, дальность, эхо | `story-choices` | `echo.md` | R-40; C-01…C-05; `meaningful:P-08`, `P-09`, PAT-01, PAT-03, `LESSON-01`; `emshort:P-09`, `P-15`, `P-16`, `LESSON-11`; `choiceofgames:P-07`, PAT-09; `narrative-testing:PAT-05`, PAT-06; `inkle:P-06`; `procedural:P-10`, PAT-05; `sheldon:P-06`, PAT-05, `LESSON-07`; `narrative-postmortems:P-03`, PAT-03, `LESSON-10`; `mobile:P-06`, PAT-02; `cron:LESSON-06`; `skolnick:LESSON-04`; `ashwell:RED-05`, LESSON-01; `bateman:RED-04`, RED-18; `cron:RED-14`; `emshort:RED-03`; `inkle:RED-06`; `maass:RED-06`, RED-07, RED-08; `meaningful:GREEN-02`; `mobile:RED-09`; `narrative-postmortems:GREEN-01`, RED-03; `narrative-testing:GREEN-10`, RED-04, RED-24; `nicklin:RED-20` | `story-endings` |
| TH-57 | молчание как ход; спор с CoG | `story-choices` | `silence.md` | R-52, R-53; `meaningful:P-11`, PAT-04, `LESSON-08`; `inkle:P-12`, PAT-05; `choiceofgames:P-04`; `sheldon:LESSON-09`; `vogler:PAT-06`; `narrative-testing:GREEN-08` | `story-time/reminders.md` |
| TH-58 | цена, нет лучшего, мораль не очками | `story-choices` | `cost.md` | R-47, R-48, R-56, R-116; `meaningful:P-03`, `P-04`, PAT-02, `LESSON-02`…`LESSON-04`; `choiceofgames:P-03`; `schell:PAT-05`; `truby:LESSON-01`…`LESSON-03`; `narrative-postmortems:LESSON-05`; `skolnick:LESSON-02`; `bateman:LESSON-12`; `choiceofgames:RED-02`; `failbetter:PAT-06`; `mckee:RED-08`, RED-11; `meaningful:PAT-09`; `mobile:RED-02`; `truby:PAT-06`; `bateman:RED-12` | `story-endings` |
| TH-59 | выбор между людьми: уравнять знакомство | `story-choices` | `people-choice.md` | R-49; C-17; `ashwell:LESSON-08`; `narrative-postmortems:P-05`, PAT-07; `skolnick:LESSON-01`; `sheldon:LESSON-05`; `choiceofgames:LESSON-11` | `story-cast` |

### `story-endings`

| ID | тема | владелец | файл | опора | ссылаются |
|---|---|---|---|---|---|
| TH-60 | распределитель: хребет и заплатки, сортировщик, видимость порога, сколько финалов | `story-endings` | `decisions-endings.md` (`threshold-visibility.mjs`) | R-102, R-104, R-112; `inkle:P-17`, PAT-11, SYS-3, `LESSON-02`; `ashwell:P-11`; `choiceofgames:P-11`, `P-12`; `meaningful:PAT-06`, PAT-07, `LESSON-05`; `schell:P-18`, PAT-10; `narrative-postmortems:P-16`; `ashwell:RED-07`; `bateman:RED-11`; `choiceofgames:RED-08`, RED-12; `messenger:RED-10`; `mobile:PAT-06`, RED-06; `narrative-postmortems:PAT-06`, GREEN-07, RED-07, RED-08; `narrative-testing:GREEN-06`, RED-12, RED-13, RED-25; `truby:RED-08`; `emshort:RED-02`; `procedural:RED-10`; `mobile:RED-11` (скрытый порог финала, вина за невидимый порог) | `story-plan/endings-plan.md` |
| TH-61 | приёмы финала: зеркало, другой носитель, следы, финал из шагов | `story-endings` | `patterns-endings.md` | R-105…R-109; `snyder:P-14`, `P-15`, PAT-07, PAT-12; `yorke:PAT-04`; `video:PAT-06`; `messenger:P-14`, `P-15`; `meaningful:PAT-10`, `LESSON-07`; `cron:P-16`, `LESSON-05`; `truby:P-11`, `P-16`; `vogler:P-13`, `P-14`, PAT-08, PAT-09; `inkle:LESSON-11`; `bateman:LESSON-09`; `mckee:PAT-06`; `narrative-testing:PAT-07` | `story-cast/arcs.md` |
| TH-62 | короткая развязка | `story-endings` | `resolution.md` | R-110, R-111, R-113; `messenger:P-16`; `schell:P-04`, PAT-07; `failbetter:LESSON-12`; `mobile:P-13`; `mobile:GREEN-08` | `story-time/length.md` |
| TH-63 | как объявлять финалы | `story-endings` | `declaring-endings.md` | R-103; `build-plan.md` §9; `narrative-testing:GREEN-07` | `story-plan`, `story:lint` |

### `story-cast`

| ID | тема | владелец | файл | опора | ссылаются |
|---|---|---|---|---|---|
| TH-64 | уровни контактов, функции, шум | `story-cast` | `tiers.md` | R-77, R-79, R-88; C-21, C-45, C-50; `sheldon:P-04`; `dille:P-07`; `truby:P-13`, `LESSON-06`; `inkle:LESSON-12`; `messenger:P-11`, PAT-08; `bateman:RED-17`; `video:GREEN-03` | `story-opening` |
| TH-65 | карточка героя: функция → цель → секрет → голос | `story-cast` | `character-card.md` | R-76, R-90; `dille:P-05`, `P-06`; `nicklin:P-06`; `sheldon:P-01`…`P-03`; `procedural:P-05`, `P-06`; `narrative-postmortems:LESSON-16`; `procedural:LESSON-06` | `story-voice/voice-sheet.md` |
| TH-66 | дуги персонажей | `story-cast` | `arcs.md` | R-83; `truby:P-03`…`P-06`, `P-12`; `vogler:P-15`; `yorke:P-13`, `P-14`, `LESSON-12`; `snyder:P-20`; `sheldon:P-12`; `procedural:P-09`, PAT-04; `skolnick:P-15`; `cron:P-06`, `LESSON-08` | `story-core/theme.md`, `story-endings` |
| TH-67 | когда открывать контакты | `story-cast` | `unlock-schedule.md` | R-78; `video:P-11`, `LESSON-05`; `video:GREEN-05` | `story-opening/load.md` |

### `story-voice`

| ID | тема | владелец | файл | опора | ссылаются |
|---|---|---|---|---|---|
| TH-68 | лист голоса, проверяемые маркеры, смена голоса с отношением | `story-voice` | `voice-sheet.md` | R-75, R-82; C-44; `nicklin:P-02`, PAT-01; `sheldon:P-05`, `P-14`, PAT-02; `snyder:P-21`; `narrative-postmortems:PAT-02`, GREEN-04; `narrative-testing:RED-08`; `nicklin:SYS-5`, RED-21 (регистры письма) | `story-cast` |
| TH-69 | редактура реплики: длина, одна мысль, род, сшивка, маркеры | `story-voice` | `line-edit.md` | R-59, R-81, R-89, R-119; C-14, C-34, C-46, C-47; `attention:P-02`, `P-14` (длина); `chat-fiction:P-16`; `nicklin:P-04`, `P-05`, `P-19`; `skolnick:P-13`; `cron:P-11`; `attention:PAT-04`; `bateman:RED-15`, LESSON-06; `mobile:RED-08`; `narrative-testing:RED-32` | `chapter-write/messages.md` |
| TH-70 | одно имя, раскрытие имени, имя-улика | `story-voice` | `names.md` | R-86; C-48; `attention:P-04`, RED-06; `narrative-testing:RED-09` | `story-opening/load.md`, `story-mystery` |
| TH-71 | юмор | `story-voice` | `humor.md` | R-87; `bateman:P-13`…`P-15`, PAT-08, `LESSON-07`; `nicklin:P-15` | `story-cast` |
| TH-72 | стиль автора: как снимать и применять | `story-voice` | `author-style.md` (`style-diff.mjs`) | `build-plan.md` §8; `docs/style.md` | `chapter-write`, `story-desk/multi-author.md` |
| TH-73 | слепой тест голосов | `story-voice` | `blind-test.md` (`blind-sample.mjs`) | `nicklin:P-03`, `LESSON-04`; `narrative-testing:GREEN-04` | `story-playtest/cold-reader.md` |

### `story-continuity`

| ID | тема | владелец | файл | опора | ссылаются |
|---|---|---|---|---|---|
| TH-74 | кто что знает, защитная логика | `story-continuity` | `knowledge-flow.md` | R-85; C-51; `inkle:P-04`, `P-05`, PAT-03, PAT-04, SYS-2, SYS-4; `procedural:P-14`, PAT-07; `emshort:RED-10`; `narrative-postmortems:PAT-05` | `chapter-write/ink-idioms.md` |
| TH-75 | сведения между чатами | `story-continuity` | `cross-chat.md` | R-55; `messenger:P-10`, PAT-05; `mystery:P-07`; `ashwell:P-13`; `nicklin:PAT-05` | `story-choices` |
| TH-76 | защита слияния | `story-continuity` | `merge-guard.md` | R-35; F-13 | `story-fix`, `story-choices` |
| TH-77 | хронология, таблица фактов, дубли текста | `story-continuity` | `timeline.md` (`timeline.mjs`, `facts.mjs`) | R-91; `narrative-testing:GREEN-05`, RED-10, RED-16 | `chapter-write/facts-anchor.md`, `story-release` (C-49 г) |
| TH-78 | канон серии (на будущее, E-06) | `story-continuity` | `canon.md` | `dille:P-12`, PAT-05, PAT-07; `bateman:P-18`; `vogler:PAT-10`; `mobile:PAT-04` | `story-endings` (R-113); позже `story-world` |

### `story-mystery`

| ID | тема | владелец | файл | опора | ссылаются |
|---|---|---|---|---|---|
| TH-79 | честная игра | `story-mystery` | `fair-play.md` | R-95, R-97, R-98; C-54; `mystery:P-01`…`P-16` (кроме взятых ниже); `sheldon:P-09`, `P-10`; `messenger:P-06`; `nicklin:PAT-07` | `story-opening` |
| TH-80 | карта улик: три улики, каналы, ствол | `story-mystery` | `clue-map.md` (`clues.mjs`) | R-92, R-93, R-101; `mystery:PAT-01`, PAT-07, `P-06`, `P-08`, `LESSON-01`, `LESSON-04`; `mystery:RED-08`, SYS-4, SYS-5; `narrative-postmortems:PAT-04`, GREEN-03, SYS-4 | `story-core` (если есть скрытая правда), `story-continuity` |
| TH-81 | порядок раскрытий | `story-mystery` | `reveals.md` | `truby:P-09`, PAT-02; `mystery:PAT-04`…`PAT-06`, PAT-09; `mckee:P-13`, PAT-04, PAT-09; `cron:PAT-10`; `maass:PAT-02`; `mystery:LESSON-10`; `truby:SYS-5` | `story-branch/patterns-reveal.md`, `story-brainstorm` |
| TH-82 | ложные следы | `story-mystery` | `red-herrings.md` | R-96; `mystery:P-09`, `P-15`, PAT-03, PAT-08, `LESSON-03`, `LESSON-12` | — |
| TH-83 | ступенчатый вывод | `story-mystery` | `deduction-gates.md` (`guess.mjs`) | R-94, R-99; `mystery:PAT-02`, PAT-11, `LESSON-05`, `LESSON-09`, `LESSON-13`, `LESSON-15`; `dille:PAT-06`; `meaningful:GREEN-08`; `messenger:PAT-06`; `mystery:GREEN-05`, RED-06; `video:PAT-04`, GREEN-04, RED-10 | `story-choices` |

### `story-fix`

| ID | тема | владелец | файл | опора | ссылаются |
|---|---|---|---|---|---|
| TH-84 | что нельзя сломать при правке | `story-fix` | `safety.md` (`fix-guard.mjs`) | `attention:RED-10`; `narrative-testing:P-16`; «готово, когда» всех F-NN | все, кто правит |
| TH-85 | сжать до N минут или одной сессии | `story-fix` | `compress.md` | `алиас:attention§1` ×30 (через `attention-merged.md#attn-cut`) | `story-plan`, `story-brainstorm` |
| TH-86 | одобрение и дифф для автора | `story-fix` | `approval.md`, `diff-for-author.md` (`text-diff.mjs`) | `INTENT.md` «Правка текста без одобрения» | `story-desk/decisions-log.md` |
| TH-87 | указатель приёмов | `story-fix` | `fixes-index.md` | F-01…F-15 (§4) | — |

### `story-playtest`

| ID | тема | владелец | файл | опора | ссылаются |
|---|---|---|---|---|---|
| TH-88 | протокол холодного читателя: режимы | `story-playtest` | `cold-reader.md` | `attention:RED-04`; `narrative-testing:PAT-10`, SYS-05; `maass:P-16` | агент `cold-reader`, `story-opening`, `story-review` |
| TH-89 | персоны бота и профили холодных читателей | `story-playtest` | `personas.md` | `narrative-testing:P-07`, PAT-04, `LESSON-10`; `attention:LESSON-03`; профили из `INTENT.md`; `choiceofgames:LESSON-09`; `messenger:LESSON-08`; `procedural:LESSON-10`; `schell:P-17` | `story-time` (неотвечающий) |
| TH-90 | волны теста, расход свежих глаз | `story-playtest` | `waves.md` | `narrative-testing:P-08`, SYS-01, `LESSON-11`, `LESSON-12`; `choiceofgames:LESSON-06`, LESSON-14 | `story-release` (вторая волна) |
| TH-91 | бриф и сборка: `.json`, `beta_stop`, входы `test_*` | `story-playtest` | `brief.md`, `build.md` (`playtest-kit.mjs`) | `narrative-testing:P-03`, `P-04`, PAT-02, PAT-03, `LESSON-01`; `narrative-postmortems:P-15` | `story-plan/skeleton-format.md` |
| TH-92 | анкета: 3 вопроса и пересказ | `story-playtest` | `survey.md` | `narrative-testing` `checklists.md` §4, `attention§1`; `meaningful` `checklists.md` §4; `narrative-testing:RED-18` | — |
| TH-93 | сводка: симптом, а не рецепт | `story-playtest` | `digest.md` (`digest.mjs`) | `narrative-testing:P-06`, `P-10`, RED-14, RED-15; `narrative-testing:GREEN-09`; `serial:LESSON-05` | `story-review/priority.md` |
| TH-94 | регрессия маршрутов и эталоны | `story-playtest` | `build.md` (`route-replay.mjs`) | `narrative-testing:PAT-01`, SYS-02 | `story-fix/safety.md` |

### `story-release`

| ID | тема | владелец | файл | опора | ссылаются |
|---|---|---|---|---|---|
| TH-95 | карточка: обещание, жанр, темы | `story-release` | `card.md` (`card-check.mjs`) | R-11; C-49; `choiceofgames:LESSON-05`; `edgerton:LESSON-06`, PAT-06; `video:P-10`; `schell:LESSON-10`; `messenger:RED-12`; `dille:P-02`; `video:GREEN-01`, RED-08 | `story-brainstorm/market.md` |
| TH-96 | этика и монетизация, тёмные паттерны | `story-release` | `ethics.md` | R-115; `attention` С-4; `алиас:attention§5` ×30; около 25 уроков в 15 разборах; `build-plan.md` §12; `ashwell:LESSON-13`; `dille:LESSON-10`; `failbetter:LESSON-11`; `maass:LESSON-08`; `messenger:LESSON-03`; `mobile:LESSON-09`; `narrative-postmortems:LESSON-04`; `schell:LESSON-04`; `serial:LESSON-14`; `sheldon:LESSON-04`; `skolnick:LESSON-09`; `truby:LESSON-09`; `yorke:LESSON-06` | `story-time`, `story-pauses`, `story-plan` |
| TH-97 | платная граница: место и обещание | `story-release` | `free-boundary-gate.md` (`boundary-check.mjs`) | `choiceofgames:P-23`; `serial:P-12`; `mckee:LESSON-08`; `yorke:LESSON-01`, `LESSON-02`; `edgerton:LESSON-04`, `LESSON-05`; `mobile:LESSON-06`; `INTENT.md` «Платная граница» | `story-plan/free-boundary.md` |
| TH-98 | две длительности на карточке | `story-release` | `two-durations.md` (`durations.mjs`) | A-05; фазы gap и typing в `engine.ts` | ссылается на `story-time/length.md` |
| TH-99 | ревизия, журнал изменений, сохранения | `story-release` | `versioning.md` | E-04; `procedural:LESSON-04` | `story-desk` |

### `story-desk`

| ID | тема | владелец | файл | опора | ссылаются |
|---|---|---|---|---|---|
| TH-100 | состояние истории: шаги, кто что пишет | `story-desk` | `state-format.md` (`story-status.mjs`) | `build-plan.md` §7; `dille:SYS-1`; `procedural:LESSON-07` | все скиллы (первый шаг — `STATUS.md`) |
| TH-101 | журнал решений D-NN, отклонённые находки с хэшем узла | `story-desk` | `decisions-log.md` (`decision-add.mjs`) | `build-plan.md` §4, §7 | `story-review`, `story-fix` |
| TH-102 | банк идей: парковать и доставать | `story-desk` | `ideas-bank.md` (`idea-park.mjs`) | `build-plan.md` §7 | `story-brainstorm` (`ideas-bank.mjs`) |
| TH-103 | что устаревает при смене ядра или плана; перепись ранних глав после поздних и после теста (Б-1, Б-5) | `story-desk` | `staleness.md` (`stale-check.mjs`) | `build-plan.md` §6 (`core: D-NN`); `narrative-postmortems:P-07`, RED-12, LESSON-14; `dille:LESSON-05`; `truby:LESSON-05` | `story-core`, `story-plan/process.md` |
| TH-104 | несколько авторов: владельцы глав, `INCLUDE` | `story-desk` | `multi-author.md` | `build-plan.md` §8; `bateman:P-08`, LESSON-03, GREEN-06 | `story-voice/author-style.md` |

### `story-kb`

| ID | тема | владелец | файл | опора | ссылаются |
|---|---|---|---|---|---|
| TH-105 | указатель: алиас → темы → скилл-владелец | `story-kb` | `index.md` (генерируется из §5) | 30 разборов; `cron:SYS-5` | — |
| TH-106 | противоречия: спор → решение → на чём стоит | `story-kb` | `contradictions.md` (`kb-contradictions.mjs`) | около 255 строк «Согласия и противоречия» в `for-relayer.md`; `attention-merged.md#attn-contra` | `contradictions.md` владельцев тем |
| TH-107 | наставник: разбор сцены автора, упражнения | `story-kb` | `mentor.md`, `exercises.md` | `nicklin:PAT-08`; переложение чужой сцены (`skills.md` §7) | `explain.md` владельцев |
| TH-108 | отменённое решениями автора | `story-kb` | `superseded.md` (ссылка на общий реестр) | `docs/playbook/superseded.md` | все |

### Темы без владельца из `flow-review.md` §C

| тема из §C | кластер | владелец / файл | вместо «+» в §C |
|---|---|---|---|
| процесс производства | TH-21 | `story-plan/process.md` | `story-desk` ссылается |
| тестирование до прозы, эталоны, регрессия | TH-22, TH-94 | `story-plan/skeleton-format.md`; `story-playtest/build.md` | разделено на две темы: формат скелета и регрессия маршрутов |
| QA «шесть списков» | TH-31 | `story-review/qa-six.md` | — |
| дуги персонажей | TH-66 | `story-cast/arcs.md` | — |
| противник | TH-11 | `story-core/antagonist.md` | — |
| тема и ценности | TH-12 | `story-core/theme.md` | — |
| юмор | TH-71 | `story-voice/humor.md` | — |
| выбор между людьми | TH-59 | `story-choices/people-choice.md` | — |
| повтор и быстрый режим | TH-50 | `story-time/replay.md` | `story-release` ссылается |
| монетизация и тёмные паттерны | TH-96 | `story-release/ethics.md` | — |
| якоря фактов для модели | TH-26 | `chapter-write/facts-anchor.md` | `facts.md` истории ведёт `story-continuity` (TH-77) |
| внешняя память игрока | TH-43 | `story-pauses/return.md` | — |
| канон серии | TH-78 | `story-continuity/canon.md` | — |
| часы сюжета против часов игрока | TH-47 | `story-time/clock.md` | — |

## 6. Разделы `attention-merged.md`

Владелец кладёт раздел в свой `references/attention.md` по якорю, без пересказа, и отвечает за его покрытие.
Ссылающиеся берут тот же якорь ссылкой, а не копией. Числа раздела `#attn-load` идут через `thresholds.json`,
поэтому его владелец — `story:lint`. Разделы-обёртки (`#attn`, `#attn-toc`, `#attn-min`, `#attn-check`,
`#attn-return`) владельца не имеют: у них нет своего текста. `#attn-slicing` заменён этой таблицей.

| якорь | раздел | владелец | файл | ссылаются |
|---|---|---|---|---|
| #attn-player | игрок и два режима | `story-time` | `attention.md` | `chapter-write`, `story-fix`, `story-opening`, `story-pauses` |
| #attn-min-core | ядро на 5 минут | `story-plan` | `attention.md` | `story-brainstorm`, `story-fix` (`--compress`) |
| #attn-min-message | сообщение | `story-voice` | `attention.md` | `chapter-write`, `story-fix` |
| #attn-min-opening | начало | `story-opening` | `attention.md` | `story-review`, `story-playtest` |
| #attn-min-choice | кнопки и выбор | `story-choices` | `attention.md` | `story-branch`, `story-endings` |
| #attn-min-state | память и переменные | `story-choices` | `attention.md` | `story-endings`, `story-core` |
| #attn-min-pause | пауза и крючок | `story-pauses` | `attention.md` | `story-time` |
| #attn-min-cast | персонажи и голос | `story-cast` | `attention.md` | `story-voice` |
| #attn-min-mystery | загадка | `story-mystery` | `attention.md` | — |
| #attn-min-ending | финал и структура | `story-endings` | `attention.md` | `story-plan`, `story-fix` |
| #attn-min-process | процесс | `story-plan` | `attention.md` | `story-desk` |
| #attn-cut | что резать | `story-fix` | `compress.md` | `story-plan`, `story-brainstorm` |
| #attn-check-30s | к 30-й секунде | `story-opening` | `attention.md` | `story-review`, агент `cold-reader` |
| #attn-check-3m | к 3-й минуте | `story-opening` | `attention.md` | `story-review` |
| #attn-check-ch1 | к концу первой главы | `story-opening` | `attention.md` | `story-review`, `story-release` (граница) |
| #attn-check-ch2 | начало главы 2 | `story-opening` | `attention.md` | `story-pauses` |
| #attn-check-cold | холодный тест | `story-playtest` | `cold-reader.md` | `story-opening`, `story-review`, агент `cold-reader` |
| #attn-return-hook | крючок перед паузой | `story-pauses` | `attention.md` | `chapter-write` |
| #attn-return-reason | причина паузы | `story-time` | `attention.md` | `story-pauses`, `chapter-write` |
| #attn-return-first | первая реплика после паузы | `story-pauses` | `attention.md` | `chapter-write` |
| #attn-return-recap | напоминание контекста | `story-pauses` | `attention.md` | — |
| #attn-return-batch | пачка непрочитанного | `story-pauses` | `attention.md` | — |
| #attn-return-dose | сколько дать за возврат | `story-pauses` | `attention.md` | — |
| #attn-return-silence | молчание игрока и напоминания | `story-time` | `attention.md` | `story-choices` |
| #attn-return-click | режим «по клику» | `story-time` | `attention.md` | `chapter-write`, `story-pauses` |
| #attn-return-rhythm | ритм и длина пауз | `story-time` | `attention.md` | `story-plan`, `story-pauses` |
| #attn-load | пороги нагрузки | `story:lint` | `thresholds.json` | `story-review`, `story-pace`, `story-opening`, `story-pauses`, `story-time`, `chapter-write` |
| #attn-ethics | тёмные паттерны и этика | `story-release` | `ethics.md` | `story-time`, `story-pauses` |
| #attn-contra | противоречия и решения | `story-kb` | `contradictions.md` | `contradictions.md` владельцев тем |
| #attn-superseded | отменённое решениями автора | `story-kb` | `superseded.md` | все |

## 7. Решения о спорных темах

Где тему могли взять двое, выбран один; второй записан в «ссылаются». Здесь — почему.

| тема | претенденты | владелец | почему |
|---|---|---|---|
| длина сообщения C-34, R-59 | `story-pace`, `story-voice`, `chapter-write` | `story-voice` | это редактура одной реплики (`build-plan-critique.md`: «редактура реплик — в `story-voice`»); `pace` меряет серии и затишье, а не пузырь |
| повторы C-46 | `story-pace`, `story-voice`, `story-continuity` | `story-voice` | правка — переписать или вынести в туннель, то есть редактура; повтор после слияния `story-continuity` ловит своим F-13 и ссылается |
| маркеры C-47 | `story-voice`, `story-time` | `story-voice` | у проверки одно семейство регулярок; три строки о времени реализуют скрипты `story-time` и ссылаются по ID |
| карточка C-49, R-11 | `story-continuity`, `story-release` | `story-release` | пять пунктов из шести (а, б, в, д, е) — про `tagline`, `synopsis`, `features`; правит их выпуск. Пункт (г) — факты — реализует `facts.mjs` у `story-continuity` |
| пауза без причины C-27, срок R-63 | `story-pauses`, `story-time`, `chapter-write` | `story-time` | после A-01 это вопрос о времени (срок возвращения), а `attention-merged.md` §10 отдаёт `#attn-return-reason` в `story-time`; крючок остаётся у `story-pauses` |
| давление C-37, сроки R-114 | `story-pace`, `story-pauses`, `story-time`, `story-release` | `story-time` | ложная срочность — срок во времени игрока (A-03); этика — у `story-release/ethics.md`, но там правило, а не замер |
| не продавать паузы R-115 | `story-time`, `story-release` | `story-release` | монетизация и тёмные паттерны — один владелец (`build-plan.md` §12) |
| часы и календарь мира | `story-core/time-model.md`, `story-time/clock.md` | разделено: TH-13 и TH-47 | календарь мира — решение ядра (сколько сюжетных дней); запрет на часы игрока — правило `story-time`. `time-model.md` ссылается на `clock.md` |
| глобальные структуры | `story-plan/structures.md`, `story-branch/patterns-branch.md` | `story-plan` | структура — решение проектирования (`build-plan-critique.md`); `patterns-branch.md` держит локальные развилки и ссылается на `structures.md` за `ashwell:PAT-01…PAT-13` |
| раскрытия и повороты | `story-brainstorm`, `story-branch`, `story-mystery` | повороты замысла — `story-brainstorm` (TH-04), порядок раскрытий — `story-mystery` (TH-81) | `story-branch/patterns-reveal.md` ничем не владеет: развилка ссылается на оба |
| распределитель финалов | `story-plan/endings-plan.md`, `story-endings` | `story-endings` | `plan` ставит распределитель по знанию `endings` (`build-plan-critique.md`: R-102…R-113 — один владелец-диагност) |
| платная граница | `story-plan/free-boundary.md`, `story-release` | `story-release` | `build-plan.md` §12: владелец монетизации — `story-release`; `plan` ставит границу по его правилу |
| хабы R-34, R-36, C-19 | `story-cast`, `story-choices`, `story-pace` | `story-choices` | `build-plan.md` §5 даёт `story-choices` «хабы»; `tiers.md` у `story-cast` ссылается; приём F-06 «хаб вместо коридора» остаётся у `story-pace` по `flow-review.md` §C, потому что лечит скуку коридора |
| каскад на входе R-35 | `story-choices`, `story-continuity` | `story-continuity` | каскад условий — та же защита слияния, что F-13 |
| `#to` с фактом из другого чата R-55 | `story-choices`, `story-continuity` | `story-continuity` | сведения между чатами — главная тема `story-continuity` (`build-plan-critique.md`) |
| собеседники и контакты C-21 при нагрузке начала R-18 | `story-opening`, `story-cast` | C-21 — `story-cast`, R-18 — `story-opening` | C-21 меряет толпу во всех главах (это состав), R-18 — только экран до первой кнопки |
| ранняя развилка C-25 | `story-opening`, `story-branch` | `story-opening` | три измерения из четырёх — про начало; измерение 2 (развилки по главам) читает `story-branch` |
| стык глав C-39 | `story-pauses`, `story-plan` | `story-pauses` | стык — это крючок и возвращение (`build-plan-critique.md`) |
| логлайн R-02 и ядро-правило R-04 | `story-brainstorm`, `story-core` | R-02 — `story-core`, R-04, R-05 — `story-brainstorm` | логлайн живёт в шапке ink, которую ведёт `story-core`; правило мира и одно допущение решаются при выборе направления |
| вход в главу R-27, функции движка R-118 | `story-plan`, `chapter-write` | `chapter-write` | это идиомы ink и реестр возможностей: знание пишущего, `plan` ссылается |
| деталь возвращается R-101 | `story-mystery`, `story-continuity` | `story-mystery` | правило стоит в разделе «Тайна и улики» и проверяется как выплата посеянного |
| опора или стадия F-15 | `story-review`, `story-plan` | `story-plan` | приём вставляет опору из `chapter-formula.md`; линза `story-review` только находит пропуск |
| C-52, C-53 | — | `story:lint` | служебные правила бота и валидатор разметки нужны всем; это инфраструктура T-03, а не тема скилла |
| пороги `#attn-load` | `story-review`, диагносты | `story:lint` | числа живут только в `thresholds.json`; диагносты читают ключи |

**Поправки к спискам §C**, которые следуют из этих решений (сборщик T-16 берёт ID по этому файлу, а не по
§C): из `story-branch/patterns-branch.md` убраны `ashwell:PAT-01…PAT-13` и `inkle:PAT-05`; из
`story-plan/chapter-formula.md` — опоры середины (`yorke:P-03`, `P-05`, PAT-06, `snyder:P-09`, `P-10`,
`skolnick:PAT-09`, они в TH-40); из `story-pauses/return.md` — `inkle:PAT-09` и `attention:P-05`, PAT-02 ушли
в отдельный кластер TH-43 того же файла; из `story-endings` — `ashwell:PAT-06` (в TH-19); из `story-plan/schedule.md`
— `serial:P-12` (в TH-97); из `story-voice/line-edit.md` — `bateman:P-17`, PAT-09 (в TH-24) и `cron:P-15` (в TH-38).
T-10b сняла три ID из «опоры» двух скиллов: `edgerton:P-03` — только TH-08 (из TH-65 убран), `snyder:P-11` —
только TH-11 (из TH-40), `serial:PAT-06` «подвешенный выбор» — только TH-41 (из TH-16: это крючок перед паузой).
Перепись ранних глав после поздних (Б-1) ушла из TH-21 `story-plan/process.md` в TH-103 `story-desk/staleness.md`
вместе с `narrative-postmortems:P-07`, `dille:LESSON-05`: это вопрос «что устарело», `process.md` ссылается.

## 8. Проверка уникальности

Каждый ID — `R-NN`, `C-NN`, `F-NN`, `TH-NN` и якорь `#attn-…` — встречается ровно один раз в колонке
«владелец», и владелец входит в 21 скилл плана или равен `story:lint`. Полнота сверяется с источниками:
все R из `rules.md`, все C из `checks.md`, все F из `skills.md` §6, все якоря с текстом из `attention-merged.md`.
Список скиллов берётся из §1.

```bash
npm run story:coverage -- --owners-check   # единицы этого файла: дубли, полнота, чужой владелец
npm run story:coverage -- --summary        # строки базы: без владельца и с двумя владельцами — код 1
```

Результат на момент сборки: `строк 329 · TH 108 · дубли: нет · нет владельца: нет · чужой владелец: нет`
(122 R + 54 C + 15 F + 108 TH + 30 якорей); строки базы — `без владельца 0 · два владельца 0`.
