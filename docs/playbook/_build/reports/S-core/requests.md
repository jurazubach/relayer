# S-core · просьбы за пределы путей задачи

## 1. `docs/playbook/thresholds.json` — ключ длины логлайна

- **Что:** добавить ключ `core.logline.max_words` рядом с прочими ключами ядра (или в начало группы `story.*`):
  ```json
  "core.logline.max_words": {
    "value": 35, "unit": "слов", "op": ">", "level": "warning", "basis": "source",
    "sources": ["rules.md R-02: логлайн одной фразой до 35 слов", "snyder-save-the-cat:P-01"],
    "calibrated_on": null,
    "history": [{ "date": "2026-10-28", "who": "S-core", "what": "ключ для core-check.mjs (story-core)" }]
  }
  ```
- **Зачем:** `core-check.mjs` считает слова логлайна, но порога в реестре нет, а число в скрипте — запрещено.
  Сейчас скрипт пишет «нет ключа core.logline.max_words» и показывает только счёт. Ключ есть — проверка включится
  сама, правка скрипта не нужна.

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
