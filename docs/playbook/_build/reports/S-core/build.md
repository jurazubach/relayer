# S-core · Скилл story-core — сборка

## Сделано

- `.claude/skills/story-core/SKILL.md` — модуль (`user-invocable: false`), описание симптомами (282 знака),
  `allowed-tools` по LOCAL-03, `metadata.version: 1`. Алгоритм из 8 шагов: STATUS → `core-check.mjs` → развилки по
  порядку с вопросами-вариантами → скрытая правда в `story-mystery` → проверка черновика (`core-check`, `world-clock`)
  → `docs/style.md` перед примерами → запись через `core-snapshot.mjs` → передача `story-plan`. Границы поимённо,
  карта references, 8 главных правил, формат результата, «Состояние», «Готово», «Объясни».
- `references/` (18 файлов + 8 систем):
  - развилки и приёмы: `decisions-stakes.md` (ставка, лицо, срок, вопрос, подъём), `patterns-stakes.md`,
    `axes.md`, `patterns-axes.md`, `antagonist.md`, `theme.md`, `player-role.md`, `logline.md`;
  - решения ядра: `questions.md` (вопросы автору с вариантами, отказ от всех вариантов), `time-model.md` (календарь
    мира в двух режимах, TH-13), `cast-core.md` (состав на этапе ядра, ссылкой на `story-cast`), `header.md` (шапка
    из 4 строк, R-01, формат черновика и D-NN);
  - `flags.md`, `lessons.md` (классы A/B/C), `contradictions.md`, `attention.md` (нарезка `#attn-min-core`,
    `#attn-min-state`, строки `#attn-min-cast` и `#attn-player` о ядре), `explain.md` (7 объяснений с упражнениями),
    `sources.md` (сгенерирован `story:coverage --sources --write`);
  - `systems/`: `core-pass.md` (наша система: порядок ядра), `stats.md` (CoG SYS-2, Failbetter SYS-2),
    `production.md`, `suspense.md`, `stability.md`, `stakes-ladder.md`, `value-scale.md`, `logline.md`.
- `scripts/` (4, у каждого `--help` и `--json`):
  - `core-check.mjs` — поля ядра (D-NN или `--draft`), формальные признаки R-02/R-03/R-06/R-07/R-08/R-17/R-39/R-84,
    шапка ink против D-NN (C-53), оси против `VAR` (числа `npm run story:vars`);
  - `core-snapshot.mjs` — запись одобренного ядра через `story-desk/scripts/decision-add.mjs` (`--kind ядро
    --set-core`), поля под записью, шапка ink; по умолчанию показ, запись — `--write`;
  - `world-clock.mjs` — календарь мира против `story.length.*`, `story.pause.max_h`, `engine.click.time_jump_label`;
    у написанной истории — срединное прохождение `npm run story:sessions` рядом со скачками мира;
  - `core-lib.mjs` — общий разбор (ядро, оси, состав, календарь, вызов `story:*`).
- `docs/lab/triggers/story-core.json` — 13 позитивных фраз, 7 негативных с `expect`, 7 соседей.
- `CLAUDE.md` — строка в таблице «симптом → скилл».
- `docs/lab/runs/S-core/` — сырые прогоны `lab:triggers` по частям, сводка, живой прогон `claude -p`.

## Решения

- **Ядро живёт в D-NN, а не в отдельном файле.** `state-format.md` у `story-desk`: решение пишется один раз; ядро —
  запись «вид: ядро» с полями под заголовком (как у D-01 трёх историй). Черновик — временный
  `docs/stories/<id>/core-draft.md`, `core-snapshot.mjs` удаляет его после записи.
- **Запись через `decision-add.mjs` `story-desk`, а не своя.** Номер, дата, опоры и «ядро: D-NN» в `STATUS.md` —
  одна реализация; `core-snapshot.mjs` только дописывает поля и печатает шапку.
- **Скрипты переименованы относительно `flow-review.md` §C** (`header.mjs`, `header-check.mjs`, `core-snapshot.mjs`):
  проверка шапки и проверка ядра слиты в `core-check.mjs` (это одна сверка «ядро ↔ шапка»), добавлен
  `world-clock.mjs`, без которого `time-model.md` нечем проверить. Просьба поправить `owners.md` — `requests.md` п. 2.
- **Календарь мира — данные истории.** Часы («гл.2 д2 08:00») пишет автор в ядре, скрипт их только складывает; в
  скрипте нет чисел времени суток (A-02 и правило «числа только в `thresholds.json`»).
- **Длина логлайна без ключа.** Ключа `core.logline.max_words` в реестре нет, `thresholds.json` не в моих путях
  (я не владею проверками): скрипт пишет «нет ключа» и счёт слов, текст ссылается на R-02. Просьба — `requests.md` п. 1.
- **Отменённое не перенесено как действующее:** метки шапки из 10+ полей, `// ценность:`, `// ПОСЫЛКА:`, шкала в
  шапке, комментарий над `VAR` (A-06); привязка срока к часам игрока (A-02); срок паузы словами (A-01). У каждого
  такого ID — пометка «частично отменено» и что взято в силе. `failbetter-qbn:GREEN-02` (superseded A-06) блоком не
  закрывается — упомянут в `flags.md`.
- **Примеры выдуманы заново:** копировальня, Зоя, Глеб, Остап, Платон, Ася, Юна — ни героев трёх историй, ни основы
  мутантов (skill-check: 0 предупреждений).
- **Своих проверок C-NN и мутантов нет** (`owners.md`: «владеет проверками: —»): `scripts/lint/selftest-story-core.mjs`
  не нужен, `skills:test` скилл не касается — он не диагностический.

## Проверки

- `node docs/playbook/_build/checks/skill-check.mjs story-core --min-refs 9 --min-scripts 2` — ✓ ок, 0 предупреждений
  (26 references, 4 скрипта, все примеры ink компилируются).
- `npm run story:coverage -- --skill story-core --min L2` — ✓ «все кластеры story-core не ниже L2» (179 строк, 107
  кластеров; L3 — 113 строк, L2 — 66; L3 дают развилки `decisions-stakes.md`, примеры ink, проверки C-01/C-02/C-04/C-06/C-07/C-09/C-10/
  C-24/C-45/C-53/C-54; RED — на L2, мутантов зоны нет). `--summary` — владельцы без дублей.
- `npm run lab:triggers -- --skill story-core --runs 3 --min build` — прогнан **по частям** (15 файлов по ≤8 фраз через
  `--file`, `--jobs 3`): целиком 306 запусков не помещаются в 10 минут одного вызова. Итог
  (`docs/lab/runs/S-core/triggers-summary.txt`): story-core 39/39 = 100 %, ложные 4/257 = 1,6 %; соседи 93–100 %;
  недействительных прогонов 4 из 296 (отказ Bash на `e2e`-фразе «none» и на чужой фразе `story-cast`). Порог сборки
  `lab.triggers.min_share_build` и `lab.triggers.max_false` пройдены с запасом.
- Живой прогон `claude -p` («используй story-core для the-number, шаги 1–2 и календарь»): вызов через `Skill`,
  `core-check.mjs` и `world-clock.mjs` отработали, `permission_denials` пуст (LOCAL-03).
- Скрипты на трёх историях: числа `core-check.mjs` по осям совпадают со `story:vars` (theo_trust: 14 записей, 1/0
  чтений), начала глав `world-clock.mjs` — со `story:sessions` (the-number гл.2: 9 ч 14 мин). На мутанте m01 —
  «ядра нет, шапка есть». `core-snapshot.mjs` проверен на копии состояния во временной папке (`--dir`).
- `npm run test:coverage` — 12/12; `npm run test:story-cmd` — 38/38.

## Открыто

- **Ключ `core.logline.max_words`** — до слияния просьбы п. 1 длина логлайна не проверяется порогом.
- **Ложные срабатывания:** 3 из 21 на фразе `story-opening` «Срок и ставка звучат, только если нажать…» и 1 на фразе
  `story-cast` про неизвестный номер. В сумме 1,6 % — ниже порога, но если описание соседей изменится, стоит
  проверить первым.
- **Ядра трёх историй неполные** (D-01 v0: нет роли, героя, противника, темы, времени мира, состава) — это находка
  для Э7, а не для этой задачи; `core-check.mjs` показывает её первым шагом.
- **Автору (через королеву):** утвердить, что ядро — одна запись D-NN с полями (а не отдельный `core.md`), и что
  шаг `core` в `STATUS.md` ставит `story-desk`, а не `core-snapshot.mjs` (`requests.md` п. 3).
