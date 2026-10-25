# S-desk · Скилл story-desk — сборка

## Сделано

- `.claude/skills/story-desk/SKILL.md` — пользовательский вход (без `user-invocable: false`), описание из фраз
  автора (≤ `skill.description.max_chars`), `allowed-tools` для `story:*` и своих скриптов,
  `metadata.version: 1`. Первый шаг: `npm run story:status` → `STATUS.md`. Алгоритм из 8 шагов: где мы → что
  дальше → решение → идея на потом → Б-5 → Б-1 → Б-6 → ответ. Границы с 11 соседями поимённо, правила по ID,
  формат находки, «готово», режим «объясни».
- `references/` (13 файлов):
  - `state-format.md` (TH-100) — состав `docs/stories/<id>/`, кто какой файл пишет, шаги, несколько историй,
    ревизии; блоки `dille-ultimate-guide:SYS-1`, `procedural-storytelling:LESSON-07`;
  - `decisions-log.md` (TH-101) — формат D-NN, развилки записи: отклонённая находка с хэшем узла, автор
    передумал, замер против человека, подпись;
  - `ideas-bank.md` (TH-102) — формат I-NN, что парковать (в том числе рецепты тестеров), как доставать;
  - `staleness.md` (TH-103) — что устаревает от чего, порядок Б-5 и Б-1; блоки `narrative-postmortems:P-07`
    (с компилируемым примером ink), `P-07#нюанс`, `RED-12`, `LESSON-14`, `dille-ultimate-guide:LESSON-05`,
    `truby-anatomy-of-story:LESSON-05`;
  - `multi-author.md` (TH-104) — правила Б-6, передача главы; блоки `bateman-game-writing:P-08`, `P-08#нюанс`,
    `LESSON-03`, `GREEN-06` (способ — по A-06: `story:vars`, а не комментарии над `VAR`);
  - `decisions-desk.md` — развилки: просьба не к шагу, нет папки, ядро или деталь, ранние главы после
    поздних, перепись сцены, второй автор, две истории;
  - `systems/cycle.md` (наш цикл: шаг → владелец → выход → без шага) и `systems/document-pipeline.md`
    (система Dille по шагам);
  - `flags.md`, `lessons.md` (8 карточек A/B/C), `attention.md` (ссылки на `#attn-min-process`,
    `#attn-superseded` — своих якорей нет), `contradictions.md` (6 споров), `explain.md` (с упражнением),
    `sources.md` (генератор).
- `scripts/` (4 команды + общий модуль, у всех `--help` и `--json`):
  - `story-status.mjs` — вывод `story:status` как есть, плюс `--init`, `--check`, `--next`, `--step`,
    `--activate`, `--owners`;
  - `decision-add.mjs` — D-NN с номером, датой, проверкой опор (R/C/A/D/LOCAL/алиас), хэшем узла для
    отклонённой находки, `--set-core`, `--set-plan`, `--hash`;
  - `idea-park.mjs` — парковка с обязательными «не взято» и «когда вернуться», `--list` по всем историям,
    `--take`;
  - `stale-check.mjs` — 6 пунктов устаревшего, `--if core|plan` (до смены), `--tags-only`, `--mark`;
  - `desk-core.mjs` — общий разбор (поверх `scripts/story/core/state.mjs`, `scripts/lib`), хэш узла, время
    правки по git.
- `docs/lab/triggers/story-desk.json` — 12 позитивных фраз, 9 негативных (6 с `expect`, 3 «не этот скилл»).
- `docs/playbook/thresholds.json` — точечно два ключа: `story.rewrite.early_chapters`,
  `story.rewrite.late_chapters` (с `history`).

## Решения

- **Скрипт `story-status.mjs` из §C оставлен** сверх трёх обязательных: без него «заведи папку», «переключи
  историю», «кто ведёт главу» и «что дальше» пришлось бы делать руками по шаблону. Вывод без флагов —
  дословно `story:status` (тот же модуль `state.mjs`), числа совпадают — проверено на фикстурах
  `scripts/story/fixtures/stories` и временной папке.
- **Хэш узла** — sha1 кода узла без комментариев и лишних пробелов, первые шесть знаков (как в образце
  `decisions.md` фикстуры). Правка `// намеренно:` узел не «меняет», правка реплики — меняет. Длина — формат
  записи, не порог, поэтому константа в коде с комментарием.
- **Время решения** — коммит, где `D-NN` впервые появился (`git log -S`); не закоммичено — mtime файла.
  Так «глава старше ядра» видна и до коммита.
- **Отметка версии ядра у плана** — `core: D-NN` в первых строках `plans/*.md` или `// core: D-NN` в
  скелете, как пишет `story-architect` (план §6).
- **`decisions-log.md`** назван по `owners.md`, но его имя начинается с `decisions-`, поэтому он оформлен и как
  файл развилок (поля «Когда не работает», «Масштаб», `basis`).
- **Пороги п. 5** (`RED-12`) — новые ключи в области `story.*`, опора — числа из самого `P-07` («главы 1–2»,
  «в трёх поздних»). На трёх историях: у двух коротких находок нет, у десятиглавой — `#rename` только в
  главах 4–8 (сверено grep).
- **`attention.md`** — только ссылки на якоря владельцев: у `story-desk` своих разделов нет (`owners.md` §6).
- **Три текущие истории не трогал:** папки `docs/stories/` нет и она вне путей задачи; скрипты проверены на
  временной папке состояния в scratchpad с настоящими главами из `src/stories`.

## Проверки

- `node docs/playbook/_build/checks/skill-check.mjs story-desk --min-refs 6 --min-scripts 3` — ✓ ок, 0
  предупреждений (пример ink компилируется).
- `npm run story:coverage -- --skill story-desk --min L2` — ✓ все 9 кластеров не ниже L2; 12 строк: L3 — 8
  (развилки `decisions-desk.md`, по кластеру), L2 — 4 (`SYS-1`, `procedural:LESSON-07`, два нюанса).
- `npm run lab:triggers -- --skill story-desk --runs 3 --min build` (с `--out` в scratchpad) — ✓ 100 %
  попаданий (42/42), 0 % ложных (0/12). Негативы с `expect` на ещё не собранных соседей прогон пропустил.
  Предупреждение «git status изменился» — от моей правки отчёта во время прогона, прогон ничего не писал.
- `npm run test:lint` ✓, `npm run test:coverage` ✓ (80/80), `npm run story:coverage -- --summary` ✓,
  `npm run test:story-cmd` ✓ (36/36), `npm run test:hooks` ✓ (14/14).
- `npm run skills:test -- --skill story-desk` — у зоны мутантов нет.

## Открыто

- **`sources.md` поправлен руками после генератора:** убраны две метки `· K-narrative-postmortems:P-07` —
  приёмка читает их как алиас `-narrative-postmortems`. Причина и починка — `requests.md` п. 1. После починки
  перегенерировать.
- `narrative-postmortems:RED-12` на L3 только по кластеру `P-07`; мутанта нет (`requests.md` п. 3).
- Негативы к соседям (`story-brainstorm`, `story-core`, `story-plan`, `story-review`, `story-kb`) проверятся,
  когда эти скиллы появятся; перепрогнать `lab:triggers -- --skill story-desk`.
- Автору (королеве): заводить ли `docs/stories/<id>/` для трёх историй каталога сейчас (шаг по факту —
  `review`) или в Э7. Вне путей этой задачи.
