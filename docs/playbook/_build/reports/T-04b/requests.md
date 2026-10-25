# T-04b · Просьбы за пределами разрешённых файлов

1. **`scripts/lint/lint.mjs` (владелец — T-03).** `story:lint --json` завершается `process.exit(...)` сразу после
   `console.log`. В трубе это обрезает вывод на 64 КБ: `node scripts/lint/lint.mjs chuzhoy-golos --json --quick | wc -c`
   даёт 65536, а в файл уходит 118 227 байт, и JSON не разбирается. `story:diff` обходит это: пишет stdout дочерней
   команды в файл. Но тем же вызовом из хука, скилла или `| jq` пользуется любой. Починка — как в
   `scripts/story/core/cli.mjs`: `process.exitCode = …` вместо `process.exit(…)` в конце `lint.mjs` (строки 81 и 114).
2. **`CLAUDE.md`, раздел «Команды».** Добавить четыре строки рядом с `story:*` из T-04a:
   ```
   npm run story:diff -- stories-v1 .  # метрики lint/trace/sessions/cast/endings до и после; --text — реплики по узлам
   npm run story:rule -- R-61          # правило или проверка из свода с порогами thresholds.json
   npm run story:status [-- --all]     # docs/stories/<id>/STATUS.md: активная история, шаг, последние решения
   npm run story:cold-read -- --story <id> --until <узел> [--mode …] [--ask]   # холодный читатель
   ```
3. **T-11 (хук `SessionStart`).** Команда готова для хука: `npm run story:status` всегда выходит с кодом 0, в том
   числе когда `docs/stories/` нет, и печатает 3–10 строк.
4. **Агент `cold-reader` и скилл `story-playtest`.** Агент — обёртка над
   `npm run story:cold-read -- --story <id> --until <узел> --mode <режим> --ask --json`. Код выхода 1 значит
   «изоляция нарушена», 2 — ошибка запуска. Протокол `story-playtest/cold-reader.md` подключается флагом
   `--protocol <файл>`, если в нём те же разделы: `## Роль`, `## Режим: <opening|return|click|guess|voices>`,
   `## Контроль`, `## Формат ответа`. Либо он заменяет заглушку `scripts/story/cold-reader-protocol.md`.
