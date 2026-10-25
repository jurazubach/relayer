# T-03b · Просьбы за пределами разрешённых файлов

1. **`scripts/lib/bot.mjs`, `scripts/check-story.mjs`, `scripts/story-graph.mjs` — числа ботов из `thresholds.json`.**
   Ключи заведены: `bot.runs` (400), `bot.max_runs` (2000), `bot.max_lines` (2000), `bot.graph_runs` (400),
   `bot.graph_max_lines` (3000). Сейчас это константы `RUNS`, `MAX_RUNS`, `maxSteps ?? 2000`, `maxSteps: 3000` в
   коде. Как: читать через `scripts/lint/thresholds.mjs` (`loadThresholds().value('bot.runs')`) или общий загрузчик
   в `scripts/lib`. Зачем: правило «числа только в `thresholds.json`» (итоги T-01); сейчас у ботов два источника правды.
2. **`scripts/story/core/thresholds.default.json` (T-04a).** Его ключи `bot.runs` и `bot.max_lines` теперь есть в
   `thresholds.json` с теми же именами, `thresholds.mjs` команд `story:*` берёт их оттуда. Остальные (`sessions.*`,
   `click.*`, `endings.*`, `cast.*`, `trace.*`, `vars.*`) дублируют ключи `story.*` / `C-NN.*`: например
   `sessions.max_pause` = `story.pause.max_h`, `sessions.tail_delay` = `story.tail.max_delay_min`,
   `click.jump_label` = `engine.click.time_jump_label`, `endings.dominant` = `C-40.dominant_share`. Перевести
   команды на эти ключи и удалить файл-запаску.
3. **`src/engine/story.ts`, README, `docs/capabilities.json` (`storyfile`): поле героя `service?: boolean`.** Линт уже
   понимает `service: true` в `meta.json.characters` (служебный контакт: заметки, пульт, банк) и не считает такого
   героя персонажем (C-17, C-21, C-44, C-45, C-48, C-50, C-51). Тип и описание поля — у владельца формата истории
   (T-02). Экран истории служебных героев, вероятно, тоже не должен показывать.
4. **`scripts/lib/ink.mjs`: однострочные условия `{a: -> x}` и `{a: x | y}` разбирать на ветки.** Сейчас это текст
   реплики с переходом на верхнем уровне. C-25 обходит это (два разных перехода в узле без туннелей считаются
   развилкой), C-09 читает заголовки условий из текста. Проверкам C-07, C-14, C-47, C-51 («реплика под условием»)
   однострочное условие не видно: строка внутри `{x: …}` считается безусловной.
5. **E-02 (движок): напоминания.** Когда синтаксис станет `ready` в `docs/capabilities.json`, снять `deferred` у
   `story.reminders.max` и `C-32.no_answer` и дописать C-32 п. 6–7: напоминания у точки выбора, дословный повтор,
   продолжение после последнего; персона «неотвечающий» (`story:trace`, T-04) против `#silent`.
6. **E-01 (движок): метка «спустя N»** — брать порог из `engine.click.time_jump_label`, а не константой.
7. **T-11 (хук):** вызывать `npm run story:lint -- --changed --quick --summary`. Вывод уже не длиннее
   `skill.hook.max_output_chars` и обрезается сам.
8. **`_build/checks/skill-check.mjs`, `_build/prompts/type-skill.md`, `build-plan.md` §3, §10, §12** (риск из сверки
   T-03a): числа порогов скиллов (40–160 / 60–120 строк, 300 знаков, 3–5 прогонов) — ключи `skill.*` и `lab.*` уже
   есть. Эти файлы — конвейер, им нужна правка королевы.
9. **`docs/playbook/REVIEW.md`** — таблица согласования порогов дублирует числа; ключи для них теперь есть
   (`story.*`, `C-NN.*`, таблица соответствия — `build.md`).
10. **T-13: основа мутантов `docs/lab/mutants/_base` (через `scripts/lab/mutants-spec.mjs`) перестала быть чистой** — со второй
   волной `npm run skills:test` падает «основа не чистая». Пять находок — по букве `checks.md`, не ложные (найдено на ревью):
   C-07 `end_deal`, `end_stop` — финал без условной реплики на выбор игрока; C-14 `ch2_end` — «ты тогда промолчала»
   (пол игрока); C-51 `epilogue` — Мира пишет «спасибо, что была с ней» и тем, с кем ни разу не говорила; C-54
   `ch4_truth` — 49 % прогонов приходят к раскрытию меньше чем с 2 уликами. Поправить основу (или поставить
   `// намеренно: C-NN` там, где это замысел) и пересобрать мутантов. Без этого полнота линта по мутантам не меряется.
