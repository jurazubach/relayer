# T-03c · Просьбы за пределами разрешённых файлов

1. **`scripts/check-story.mjs` — `--json` обрезается в трубе.** Последняя строка — `process.exit(failed ? 1 : 0)`
   сразу после `console.log(JSON.stringify(…))`. Проверено: `node scripts/check-story.mjs --json | node -e
   'JSON.parse(require("fs").readFileSync(0))'` падает на «Unterminated string» (около 54 КБ из ~70 КБ на трёх
   историях). Как в `scripts/lint/lint.mjs` и `scripts/story/core/cli.mjs`: `process.exitCode = failed ? 1 : 0`
   вместо `process.exit(…)`. Там же число `maxSteps: 2000` → `threshold('bot.max_lines')` из `scripts/lib/thresholds.mjs`.
2. **`scripts/hooks/full.mjs`** — тот же приём (`console.log` JSON, затем `process.exit(0)` в ветке «изменённых
   историй нет»). Сейчас там JSON короткий и не обрезается, но при росте вывода сломается так же; заменить на
   `process.exitCode`.
3. **`scripts/kb/coverage.mjs`, `scripts/hooks/core.mjs`** импортируют `../lint/thresholds.mjs`. Загрузчик переехал
   в `scripts/lib/thresholds.mjs`; старый путь оставлен переадресацией (`export * from '../lib/thresholds.mjs'`).
   Просьба перевести импорты на `../lib/thresholds.mjs`, после этого `scripts/lint/thresholds.mjs` удалить.
4. **`docs/playbook/checks.md`** — описания трёх проверок под правки T-03c (просьбы T-13):
   - C-24, строка «Ключи»: добавить `story.stake.min_roots` (≥ корней шапки `// ставка:` в одной реплике).
     В «Как считать»: «реплика со значимым словом из строки шапки» → «реплика с `story.stake.min_roots` значимыми
     словами шапки (одно общее слово — «камера» в истории про камеру — ставкой не считается)».
   - C-26, «Как считать»: прощание — последняя **входящая** реплика перед паузой, строка `#sys` «… не в сети»
     (стиль ST-60) пропускается.
   - C-11, п. (а): «`#silent` без `~` и без реплики, чей переход совпадает с переходом соседней кнопки, — тоже
     без следа».
   - C-53, финалы: «в истории с метками — и цели распределителя финалов без `// финал:` (финал перед общим
     эпилогом своего `-> END` не имеет)».
   После правки — `npm run story:coverage -- --build-clusters`.
5. **`docs/playbook/checks.md`, «Общие данные»: словари.** Строку «словари — в одном месте скрипта» стоит
   заменить на «`thresholds.json`, ключи `dict.*`; применение — `scripts/lib/lexicon.mjs`» (просьба T-03a п. 4
   частично). `story:sessions` теперь считает «закрытую» сессию по `dict.closing` так же, как C-26.
6. **`docs/playbook/rules.md` R-122** — «ключ, его заводит T-03» → `engine.click.time_jump_label` (повтор
   просьбы T-03a п. 5): у команд `story:*` больше нет своего `click.jump_label`, обе стороны читают этот ключ.
