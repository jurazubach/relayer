# T-17 · Отказы в правах в lab:triggers и skills:test — сборка

## Сделано

- `scripts/lab/triggers-lib.mjs`
  - разбор потока собирает отказы: `system/permission_denied` по ходу и `result.permission_denials` в конце, без
    дублей по `tool_use_id`; у каждого — инструмент, команда (Bash — `command`, Skill — имя, Read — путь), причина;
  - `skillSettled`: вызов `Skill` считается состоявшимся только после его `tool_result` или отказа;
  - `matchesRule`, `blockingDenials`, `invalidReason`, `denialText`, `denialGate` — общий вердикт для обоих скриптов;
  - `summarize`: недействительный прогон (`invalid`) — не попадание, не промах и не ложное срабатывание; у скилла
    колонка `denied`, в сводке `denied` и `failed_runs` (= ошибки + недействительные).
- `scripts/lab/triggers.mjs` — прогон гасится после ответа на `Skill` (раньше — на `tool_use`, и отказ на Skill был
  невидим); у каждого прогона `denials` и `invalid`; колонка «отказы»; итог печатает число отказов и недействительных;
  `--json` — плоский список `denials` (фраза, прогон, инструмент, команда, `blocking`); доля недействительных выше
  порога — `fails` и код 1 даже без `--min`; справка.
- `scripts/lab/skills-test.mjs` — отказы из того же разбора вместо `tool_name` из `result`; отказ на Bash/Skill —
  недействительный прогон **даже с находками** (раньше — только если находок не было); `failed_runs`, `denied_runs`,
  колонка «отказы»; строка мутанта «hits/действительных (+N не в счёт)»; `--control` хранит основу целиком
  (`control.counts` и `control.runs`: находки, ответ, отказы); `--json` — список `denials`; справка.
- `scripts/lab/mutants-lib.mjs` — `SKILL_DENY` / `SKILL_ALLOW` переехали сюда из скрипта (чтобы тест видел те же
  правила); `skillRunSummary` — итог прогона скилла; `zoneSummary` не считает измеренным мутанта, у которого все
  прогоны не в счёт (полнота «—», а не 0 %).
- `docs/playbook/thresholds.json` — `lab.denials.blocking_tools` (`["Bash","Skill"]`) и `lab.denials.max_invalid_share`
  (0.2).
- Тесты: `triggers.test.mjs` +7, `mutants.test.mjs` +3 — синтетический поток в формате, снятом с настоящего
  `claude -p`: отказ на Bash → недействительный; отказ на Write при чтении → нет; отказ только в `result`; отказ на
  Skill; наш собственный запрет (`Bash(node scripts/lab/*)`, чтение ключа) → не сбой; подсчёт долей, `failed_runs`,
  основа целиком, порог.

## Решения

- **Формат проверен вживую**, а не по памяти: `claude -p` (2.1.310, haiku, `--permission-prompts none`) на
  `touch` и `npm run story:lint` дал `system/permission_denied` по ходу и `permission_denials` с `tool_input` в
  `result`. Тестовые события повторяют этот формат.
- **Отказ по нашему же запрету — не сбой.** В `skills:test` `Bash(node scripts/lab/*)` и `Read(./docs/lab/mutants/**)`
  запрещены намеренно (ключ). Модель, которая полезла за ключом, получает отказ на Bash, но прогон честный; такие
  отказы сверяются с `--disallowedTools` (`intended`) и не делают прогон недействительным.
- **Отказ на Bash/Skill — недействителен даже при находках.** Находки без замера — это «модель», а не скилл (LOCAL-03);
  прежнее правило «отказ без находок» пропускало как раз такие прогоны.
- **Порог доли, а не «любой отказ роняет».** `lab.denials.max_invalid_share` = 0.2 (как `lab.triggers.max_false`):
  один случайный отказ из многих не ломает замер, массовый (как LOCAL-03, 100 %) — код 1 даже без `--min`. Список
  инструментов — тоже ключом, а не константой в коде.
- **`--control`**: `control.findings` (было: числа) стало `control.counts` + `control.runs` с находками целиком —
  поле `findings` с другим смыслом сбило бы читателя старых файлов. Потребителей поля в коде нет.

## Проверки

- `npm run test:lab:triggers` — 20/20; `npm run test:lab:mutants` — 16/16.
- `npm run lab:triggers -- --help` — 0; `npm run skills:test -- --lint-only` — 0 (полнота линта 100 %, 22 из 22).
- Сверх набора: `test:lib`, `test:lint`, `test:coverage` — 0; `validateThresholds` — без ошибок.
- Живые дымовые прогоны (haiku, `--no-save`/scratchpad):
  - `lab:triggers --file … --runs 1`: попадание на `story-desk`; фраза «выполни touch …» — отказ на Bash, прогон
    недействительный, `fails` с долей 50 % > 20 %, код 1; файл не создан;
  - `skills:test --skill story-choices --mutant m14-same-reply-buttons --runs 1 --control`: мутант — отказ на
    составную команду `S=…; node … | head …` → «⊘ 0/0 (+1 не в счёт)», колонка «отказы» 1, полнота «—»; основа —
    6 находок целиком в `control.runs`.

## Открыто

- `lab:triggers` не передаёт `--allowedTools Skill` и полагается на `permissions.allow` проекта (после `c5e7077`). Если
  его уберут, все прогоны станут недействительными — теперь это видно сразу (код 1), но не чинится само. Добавлять
  не стал: тест срабатывания мерит выбор модели в окружении проекта.
- Живой прогон показал, что составные команды (`;`, `|`) в шагах `story-choices` всё ещё получают отказ (стык W1,
  правка шаблона п. 3). Теперь такие прогоны `skills:test` не засчитывает — полнота `story-choices` на Opus может
  упасть до «—» / ниже порога, пока скилл не перейдёт на «одна команда на вызов». Автору / королеве: ожидаемо, не
  регресс инструмента.
- Просьбы за пределами файлов — `requests.md` (формат события в `claude-code-format.md` §4.2, README фраз, LOCAL-03).
