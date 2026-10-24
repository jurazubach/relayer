# scripts/lint — story:lint

Проверки сценария по ID из `docs/playbook/checks.md`. Пороги, словари и их опора — только в
`docs/playbook/thresholds.json`: код проверки берёт значение по ключу, ключа нет — исключение.
Самопроверка — `npm run test:lint`.

```bash
npm run story:lint                                   # все истории src/stories, 400 прогонов бота (lint.runs.full)
npm run story:lint -- --story the-number --only C-20,C-35
npm run story:lint -- --changed --quick              # для хука: изменённые истории, lint.runs.quick прогонов
npm run story:lint -- --partial путь/к/beta.json     # часть глав с узлом beta_stop
npm run story:lint -- --plan --story <id>            # docs/stories/<id>/skeleton.ink
npm run story:lint -- --json --strict                # код 1, если есть ошибки
```

Строка находки: `уровень · C-NN · узел · сообщение · порог (опора)`. Похожих находок в одной главе
печатается не больше `lint.examples`, остальные — в `--json`.

| модуль | что делает |
|---|---|
| `lint.mjs` | командная строка |
| `core.mjs` | контекст истории, запуск проверок, подавление `// намеренно: C-NN причина`, вывод |
| `static.mjs` | граф узлов, финальные узлы и распределители, индекс переменных, классы кнопок, метки финалов |
| `journal.mjs` | журнал бота: строки и точки выбора, время игрока по формуле движка |
| `text.mjs` | крючок перед паузой, срок возвращения, закрывающая реплика, форматы |
| `thresholds.mjs` | чтение и схема `thresholds.json`, вывод «порог (опора)» |
| `checks/C-NN.mjs` | одна проверка: `{ id, title, plan, partial, run(ctx, find) }` |

## Как добавить проверку

1. Порог — ключ `C-NN.<имя>` в `thresholds.json` со всеми полями (`value`, `unit`, `level`, `basis`,
   `sources`, `calibrated_on`, `history`). Общий для нескольких проверок — `<область>.<имя>` с полем `checks`.
2. Файл `checks/C-NN.mjs`: регистрировать не нужно. `find(ключ, { node, chapter, message })` — уровень
   находки берётся из порога.
3. `plan: true` — проверка имеет смысл на скелете; `partial: false` — ей нужна вся история.
4. Пример с дефектом и без него — в `selftest.mjs`.

## Подавление

`// намеренно: C-NN причина` над узлом гасит находки C-NN в этом узле и его stitch'ах; до первого узла —
находки C-NN по всей истории (без узла). Подавленное есть в `--json` (`suppressed`) с причиной. Метка без
ID, с неизвестным ID или без причины — находка C-53.
