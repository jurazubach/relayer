# S-branch · Скилл story-branch — сборка

## Сделано

- `.claude/skills/story-branch/SKILL.md` — пользовательский вход (без `user-invocable: false`), 106 строк
  тела (`skill-check`). Роль: в любой точке истории меню из 3–5 ходов разного вида (развилка, поворот, ложный след, отказ,
  молчание) с влиянием на оси, финалы и чаты, ценой и местом в бюджете дорогих веток; после решения — новая
  версия плана, прогон скелета, D-NN и банк идей через `story-desk` (Б-4 — в `menu.md`). Алгоритм 8 шагов,
  первый — `STATUS.md`, `docs/style.md` — в шаге, где пишется набросок ink. `allowed-tools` по LOCAL-03.
- `scripts/` (3, у всех `--help`, `--json`):
  - `branch-core.mjs` — общий разбор: точки выбора (группы кнопок одного уровня, без `#remind`/`#noanswer`),
    область кнопки (узлы, достижимые только через неё), слияние и шаги до него, финалы (как `story:endings`),
    переменные (индекс `story:vars`, ⚑ ось из шапки, ◆ читает финал), контакты и `#unlock`, доли игроков по
    прогонам бота (`runOnce`, персона random);
  - `branch-impact.mjs` — влияние каждой кнопки развилки (`--node`, `--chapter`, `--expensive`, `--runs`);
  - `branch-budget.mjs` — дорогие развилки против бюджета, развилки по главам (с переходом / память /
    окраска), доля текста за прохождение (R-37), редкие дорогие, веер в середине, `--add N` — «что будет,
    если добавить ветку на N сообщений». Работают на `src/stories/<id>`, `.json` и голом `.ink` (скелет).
- `references/` (15 + 7 систем + `sources.md` = 23): `decisions-branch.md` (TH-15, какой ход когда),
  `decisions-failure.md` (провал, воронка, подтверждение, необратимость, R-32), `patterns-branch.md` и
  `patterns-pressure.md` (TH-16, R-38, 12 примеров ink), `patterns-refusal.md` (отказ, порог, страж, кнопка
  ухода), `patterns-reveal.md` (поворот и раскрытие как ход — без владения, ссылки на TH-04/TH-81), `costs.md`
  (TH-17, R-37), `budget.md` (TH-18, R-26), `menu.md` (карточка варианта, состав меню, Б-4), `plan-update.md`
  (пять шагов после решения, текст D-NN), `contradictions.md` (22 спора), `lessons.md`, `flags.md`,
  `attention.md`, `explain.md`, `systems/` (Эшвелл, ChoiceScript, Short, Макки, Воглер, Шелл, реальное время),
  `sources.md` (сгенерирован `story:coverage --sources --write`).
- `docs/playbook/thresholds.json` — 8 ключей `story.branch.*` (с `history` S-branch) рядом с `story.*`:
  `expensive.msgs`, `budget.min`, `budget.max`, `budget.short`, `budget.short_msgs`, `seen_share.min`,
  `seen_share.max`, `fan.merge_hops`.
- `docs/lab/triggers/story-branch.json` — 12 позитивов, 6 негативов к соседям.
- `CLAUDE.md` — строка в «Скиллы: симптом → скилл».
- `docs/lab/runs/S-branch/` — прогоны срабатывания (по файлам группы и маршрутам) и сводка живого прогона.

## Решения

- **Что такое «дорогая» ветка** — у кнопки своя область не меньше `story.branch.expensive.msgs` сообщений, или
  свой финал, или свой контакт (`#unlock`). Объём — наша оценка (сцена, а не реплика); финал и контакт
  дорогие при любом объёме: они меняют карточку и состав чатов. Бюджет считается в развилках, а не в
  кнопках: развилка с двумя дорогими пальцами — одна трата.
- **Короткая история** определяется числом сообщений (`story.branch.budget.short_msgs`, по нюансу
  `meaningful-choice:P-15` «5: одна развилка; 50: 3–5»), а не минутами `story.short_min`: история на 25 минут и
  600 сообщений — не «пять сообщений».
- **Доля текста за прохождение** — уникальные выведенные строки прогона / все сообщения ink. Это оценка
  (условный текст считается одной строкой), но одна и та же формула до и после правки — для `--add` и для
  сравнения версий плана этого достаточно.
- **Ключи `story.branch.*`, а не `branch.*`:** валидатор `thresholds.json` (`test:lint`) пускает только
  известные области; ключи в области `story`.
- **Пользовательский вход** (план §5) — без `user-invocable: false`. Описание сдвинуто на уровень сюжета
  («граф линейный, куда свернуть, ещё ветку или финал»): фраза «кнопки ничего не меняют» по `_routing.json`
  принадлежит `story-choices`, и со своим описанием `story-branch` её не забирает (0 ложных в файле
  `story-choices`).
- **Пять видов хода** в меню — из роли задачи; поворот и ложный след держат соседи (TH-04, TH-81, C-54), у нас
  только «как поворот становится развилкой и сколько стоит».
- **attention.md** — нарезка `#attn-min-choice`, `#attn-min-state`, `#attn-min-ending`, `#attn-cut` без
  якорей в заголовках: своих якорей у скилла нет (`owners.md` §6), а якорь в заголовке `story:coverage`
  считает пересказом чужой строки.
- **Отменённое A-04** (`narrative-postmortems:LESSON-03`, `emshort-structures:LESSON-01` — «быстрый режим после
  финала») перенесено в новой редакции: в силе «провал не к началу, повтор дешёвый», отменено «после финала».
- Приёмов F-NN и проверок C-NN у скилла нет (`owners.md`); `selftest-story-branch.mjs` не нужен.

## Проверки

- `node docs/playbook/_build/checks/skill-check.mjs story-branch --min-refs 8 --min-scripts 2` — ✓, 0
  предупреждений (23 файла references с `sources.md`, 3 скрипта, примеры ink компилируются).
- `npm run story:coverage -- --skill story-branch --min L2` — ✓ все 125 кластеров не ниже L2; строк на L3 —
  121 из 205 (по кластерам), своих блоков L3 — 59. Чужих пересказов нет. `--summary` — ✓.
- `npm run lab:triggers -- --skill story-branch --runs 3 --min build` — одним вызовом не помещается в 10
  минут (303 запуска), прогнан частями по `--file` с `--jobs 3`:
  - свои фразы: попадания 100 % (36/36), ложные 0 % (0/18), `--min build` ✓ (`triggers-own.json`;
    первая версия — 92 %, фраза про ложный след ушла в `story-mystery`, заменена);
  - файлы соседей (`story-choices`, `story-endings`, `story-mystery`, `story-cast`, `story-desk`,
    `story-review`): ложные `story-branch` — 0 %, 0 %, 6 % (3/52), 5 % (3/57), 0 %, 0 % при пороге
    `lab.triggers.max_false`; маршруты `_routing.json` группы — 100 %;
  - отказов в правах на Bash/Skill у `story-branch` нет.
- Живой прогон `claude -p` (`live-slepoe.json`): скилл вызван через Skill, шаги 1–5 выполнены, 6 команд
  (`branch-budget.mjs`, `branch-impact.mjs` ×2, `story:endings`, `story:vars`, `story:lint --only`) — без
  отказов в правах.
- Скрипты на трёх историях: финалы совпадают со `story:endings` (chuzhoy-golos — 7, the-number — 1,
  slepoe-pyatno), бюджет: the-number 5 из 3…5, slepoe-pyatno 2 (мало), chuzhoy-golos 5 (в бюджете, одна
  дорогая ветка у 4 % игроков, веер в гл. 9). На голом скелете `.ink` — работают.
- `npm run test:lib` 33/33, `test:lint` 157/157 (после переименования ключей), `test:story-cmd` 38/38,
  `test:coverage` 12/12, `test:hooks` 14/14, `prompt -- --quiet` ✓.
- Мутантов зоны `story-branch` в `docs/lab/mutants/key.json` нет — `skills:test` не применим (скилл не
  диагностический).

## Открыто

- Полный `lab:triggers --skill story-branch` одним вызовом не прогнан (дольше 10 минут) — частями покрыто всё,
  что он гоняет; просьба 5 в `requests.md`.
- Две фразы соседей уходят в `story-branch`: поворот замысла (ждёт `story-brainstorm`, которого ещё нет) и дуга
  «неизвестный номер становится союзником» из `story-cast` (просьбы 3–4).
- R-37 в `rules.md` держит «30–60 %» числом — просьба 1.
- `story-plan` и `story-architect` ещё не собраны: шаг 2 из `plan-update.md` (скелет) пока — набросок ink в
  ответе; `plan-compare` стоит строить на `branch-budget.mjs --json` (просьба 2).
- В живом прогоне модель за 14 ходов не дошла до карточек меню (ход оборван `--max-turns`); полнота меню на
  живой истории проверится на ревью.
- **Автору:** порог дорогой ветки `story.branch.expensive.msgs` — наша оценка; если по ощущению «дорогими»
  выходят сцены-реакции — поднять.
