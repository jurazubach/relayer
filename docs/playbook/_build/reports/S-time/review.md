# S-time — ревью

Вердикт: fail

## Исправил сам

- `.claude/skills/story-time/references/length.md` (нюанс P-18): «пороги источника (48 ч на историю, 24 ч на главу)»
  — числа вне `thresholds.json`; заменил на ключи `story.length.target_h` и `story.pause.max_h`.
- `.claude/skills/story-time/references/clock.md` (`attention-today:P-11#нюанс`): «давление выше двух реплик» →
  «выше `C-37.per_chapter` реплик».
- `docs/playbook/coverage.json`: 22 записи `fidelity=ok by=review` (выборка верности, см. ниже).
- Сырые данные моих прогонов: `docs/lab/runs/triggers/2026-10-25-story-time*.json`,
  `docs/lab/runs/mutants/2026-10-25-story-time.json`.

## Доделать (если fail)

1. **Развилка с ждущим собеседником без напоминаний не ловится, и текст напоминаний не предлагается** — прямое
   требование задачи («После E-02… Скилл должен ловить развилку с ждущим собеседником без напоминаний и
   предлагать их текст (по `docs/style.md`, ST-66)»).
   - Сейчас: ни один скрипт скилла не перечисляет такие развилки. `guilt-scan.mjs` на всех трёх историях пишет
     только «напоминания: реплик 0, развилок с ними 0», без находки. `story:trace --compare silent` печатает
     «ℹ кнопка ждёт (нет напоминаний и срока #noanswer): delivered ×2, hub ×2, …» — вперемешку с хабами и меню,
     а SKILL.md шаг 5 и `decisions-time.md` R-120 не говорят, что с этим списком делать. По INTENT считать на глаз
     то, что может посчитать команда, нельзя.
   - Что сделать:
     - (а) `scripts/guilt-scan.mjs` (или отдельный блок в нём): перечислить развилки, где **реальное время, нет
       скрытых `#remind`, и перед кнопками стоит входящая реплика собеседника** (не `#sys`, не служебный контакт,
       не хаб или меню: у хаба кнопки ведут в разные чаты / есть выход; критерий взять у `story:trace` `waits` и
       отсечь развилки без собеседника). Метка «⚠ ждёт без напоминаний», в `--json` поле
       `reminders.missing: [{ node, contact, last_line, has_silent, has_noanswer }]`.
     - (б) SKILL.md шаг 5: прочитать этот список; для каждой развилки, где собеседник по сюжету ждёт ответа,
       предложить 1–2 напоминания текстом по ST-66 и `reminders.md` «Как написать напоминание» (второе — с новой
       деталью, без срока и упрёка), плюс `#noanswer` или опору на `#silent`, с ink до/после; хаб и меню
       оставить без напоминаний.
     - (в) `decisions-time.md` R-120: запись «симптом: собеседник ждёт, напоминаний нет» → замер этим скриптом →
       решение, когда не работает (хаб, по клику), масштаб.
     - (г) приоритет в формате находки: решить и записать, P1 или P2. История не стоит (кнопка ждёт), но A-03
       нарушено: по смыслу ближе к P2.
     - (д) тест: в `scripts/lint/selftest-story-time.mjs` или в самопроверке скрипта: развилка с собеседником без
       `#remind` попадает в список, хаб и развилка с `#remind` — нет. Мутант в зоне `story-time` (если зону
       мутантов можно трогать, иначе просьба в `requests.md`): «развилка с ждущим собеседником без напоминаний».
   - Почему: без этого скилл на текущих трёх историях (в них нет ни одного `#remind`) не предлагает главное, что
     даёт A-03: сам ход «персонаж напоминает 1–2 раза».

## Проверено

- `node docs/playbook/_build/checks/skill-check.mjs story-time --min-refs 9 --min-scripts 4`: ✓, 0 предупреждений
  (до и после моих правок; примеры ink компилируются).
- `npm run story:coverage -- --skill story-time --min L2`: ✓ (88 строк, 64 кластера). `--build-clusters` —
  `clusters.json` не изменился.
- `npm run lab:triggers -- --skill story-time --runs 3 --min build --jobs 3`: ✓. story-time 93% (39/42), ложных
  6% (6/99); story-choices и story-desk проходят. Мимо: «Как протестировать паузы…» → none ×3, две фразы
  `story-pauses` → story-time (скилла `story-pauses` пока нет).
- `npm run skills:test -- --skill story-time --jobs 3`: ✓ 5/5 мутантов, 10/10 попаданий, отказов 0.
  `--lint-only`: 23/23, основа чистая.
- `npm run test:lint`: 96/96 (вместе с `selftest-story-time.mjs`, который подключается сам).
- Скрипты `promise-scan`, `clock-scan`, `guilt-scan`, `click-transcript`: `--help` есть, `--story <id> --json`
  на the-number / slepoe-pyatno / chuzhoy-golos — код 0, вывод разбирается как JSON.
- `story:lint --only C-27,C-31,C-32,C-37 --summary` на the-number совпадает с отчётом исполнителя. Вывод
  `story:trace --compare silent` прочитан.
- Выборка верности `--fidelity-sample story-time 20` (дважды, 22 разные пары) сверена с `docs/books/_clean/*`
  и сводом, записано `fidelity=ok` по всем. bad — 0. Условия, исключения и классы уроков сохранены, отменённое
  (A-01…A-04) помечено. Мелкие потери — в note: пометки «наш вывод» и «наша оценка» у `serial-hooks:GREEN-08`
  и `meaningful-choice:attention§3` опущены, порог 70% у `narrative-postmortems:P-17` в проверку не перенесён.
  Пустых блоков ради уровня не нашёл.
- Описание — симптомы автора (284 знака). Ядро — 9 шагов со ссылками на references. Примеры выдуманные (Зоя,
  Савва, Уля, Ника из основы мутантов), имён из трёх историй нет. Реальных брендов в сюжетах нет: Lifeline,
  Florence и т. п. упоминаются только как источники.
- `owners.md`: `attention:RED-07` → опора TH-46, `narrative-postmortems:LESSON-08` → опора TH-47, абзац в §5.
  Правки точечные.

## Замечания на будущее

- **Границы.** `docs/playbook/thresholds.json` не входит в разрешённые пути, но исполнитель дописал три записи
  `history` (C-27.long_h, C-32.no_answer_reproach, C-37.per_chapter). Значения не менялись, а запись калибровки
  при правке кода проверки по смыслу обязательна. Не блокирую. Королеве: разрешать `thresholds.json` (только
  `history`) задачам, которые правят `scripts/lint/checks/*`.
- **Чужие строки по кластеру и ссылкам** (`owner_via: cluster|refs`). Перенести в «опору» TH-NN владельца в
  `owners.md`, когда у него появятся блоки:
  - `messenger-genre:PAT-02` и `messenger-genre:GREEN-02` (крючок перед ночью) → `story-pauses`;
  - `messenger-genre:RED-09` и `schell-art-of-game-design:RED-03` (хвост после последней кнопки, C-42) →
    `story-endings`;
  - `messenger-genre:PAT-07` и `snyder-save-the-cat:RED-21` (финал-сортировщик, ловушка финала) →
    `story-endings`;
  - `messenger-genre:RED-11`, `LESSON-09` (эхо) и `messenger-genre:RED-06` (C-13) → `story-choices`.
  Исполнитель сам поднял часть из них в `requests.md` п. 5.
- Скрипты `promise-scan`, `clock-scan`, `guilt-scan` без `--story` молча проходят по всем историям и
  игнорируют позиционный аргумент (`guilt-scan.mjs the-number` — это весь каталог). `click-transcript` требует
  `--story`. Лучше принимать id позиционно или ругаться на лишний аргумент.
- `requests.md` п. 1–4 (checks.md C-27 / C-32 п. 7, `trace --compare silent` на `reproachContexts`, ST-66
  `deferred:E-02` в style.md) — в силе, разнести по владельцам.
- В `length.md:23` и `contradictions.md` остаются числа источников («72 ч у Lifeline против 48 ч у inkle»). Это
  позиции спора, а не наши пороги, поэтому оставил.
