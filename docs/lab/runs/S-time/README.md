# S-time · прогоны сборки скилла story-time

| файл | что |
|---|---|
| `<история>.scripts.txt` | четыре скрипта скилла на трёх историях каталога рядом с командами `story:*`, чьи числа они повторяют: `promise-scan` ↔ `story:lint --only C-27`, `guilt-scan` и `clock-scan` (строка «как в story:lint») ↔ C-32, C-37, C-47, `click-transcript` ↔ `story:trace --mode click` |
| `triggers-1.json`, `triggers-1.txt` | `npm run lab:triggers -- --skill story-time --runs 3 --min build` |
| `mutants-1.json`, `mutants-1.txt` | `npm run skills:test -- --skill story-time` — скилл через `claude -p` на мутантах зоны |

Сверка чисел — в `docs/playbook/_build/reports/S-time/build.md`, раздел «Проверки».
