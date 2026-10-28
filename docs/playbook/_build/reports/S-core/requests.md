# S-core · просьбы за пределы путей задачи

## 1. ~~`docs/playbook/thresholds.json` — ключ длины логлайна~~ (снято сверкой)

- Нового ключа `core.logline.max_words` не заводить: в `build/main` уже есть `skill.brainstorm.logline.max_words`
  и `dict.logline_irony` (S-brainstorm). `core-check.mjs` читает их; до слияния с `build/main` пишет «нет ключа».
- При сведении волны: ключ про R-02 — общий для двух скиллов; если королева захочет нейтральное имя
  (`story.logline.max_words`), переименовать в обоих скриптах сразу.

## 2. `docs/playbook/owners.md` — имена файлов `story-core`

- **Что:** в §2 строке R-01 колонка «файл» — `scripts/header-check.mjs` → `scripts/core-check.mjs`, `header.md`; в §5
  TH-13 — добавить скрипт `world-clock.mjs`.
- **Зачем:** `flow-review.md` §C называл скрипты `header.mjs`, `header-check.mjs`, `core-snapshot.mjs`. Собраны
  `core-check.mjs` (ядро + шапка + оси, одна проверка вместо двух), `core-snapshot.mjs` (запись D-NN и шапка ink
  вместо `header.mjs`) и `world-clock.mjs` (календарь мира — `time-model.md` §C без скрипта не проверить).
  `story:coverage` берёт target из `owners.md`: блок R-01 сейчас лежит в `header.md` и засчитан, но target ведёт в
  несуществующий файл.

## 3. `story-desk` — шаг `core` после записи ядра

- **Что:** флаг `--set-step <шаг>` у `decision-add.mjs` (или отдельный вызов `story-status.mjs`), чтобы
  `core-snapshot.mjs --write` мог одной командой поставить `шаг: core` вместе с `ядро: D-NN`.
- **Зачем:** сейчас `core-snapshot.mjs` ставит только «ядро: D-NN» (через `--set-core`), а шаг переводит
  `story-desk` отдельным действием — легко забыть. Скилл в шаге 7 говорит об этом явно.

## 4. Итог волны: формат ядра для `story-plan` и `story-architect`

- **Что:** соседям волны (`story-plan`, `story-architect`, `story-branch`) читать ядро из D-NN по полям, описанным в
  `story-core/references/header.md` («Черновик и запись»), а разбор — `story-core/scripts/core-lib.mjs`
  (`readCore`, `axisNames`, `castEntries`, `calendar`).
- **Зачем:** порядок ускорен, соседи собираются параллельно; без общего формата `core: D-NN` в плане будет
  ссылаться на ядро, которое план не умеет прочесть.
