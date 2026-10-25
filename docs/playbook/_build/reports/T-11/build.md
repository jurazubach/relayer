# T-11 · Хуки: проверка после правки историй и статус при старте — сборка

## Сделано

- `.claude/settings.json` — добавлен раздел `hooks`, остальные настройки T-00 (`enabledPlugins`, `disableClaudeAiConnectors`, `skillOverrides`) не тронуты:
  - `SessionStart`, матчер `startup|resume|clear|compact` → `node "$CLAUDE_PROJECT_DIR"/scripts/hooks/session-start.mjs` (timeout 20 с);
  - `PostToolUse`, матчер `Write|Edit|MultiEdit|Bash` → `node "$CLAUDE_PROJECT_DIR"/scripts/hooks/post-edit.mjs` (timeout 120 с).
- `scripts/hooks/core.mjs` — общее: id истории по пути (`src/stories/<id>/…`, `src/stories/<id>.json`), снимок `git status --porcelain src/stories` с подписью «размер:mtime», состояние сессии (снимок и находки, о которых уже сказали) во временной папке ОС, запуск `check:story` и `story:lint` с приведением находок к одному виду, обрезка до `skill.hook.max_output_chars`.
- `scripts/hooks/post-edit.mjs` — быстрый режим. Write/Edit/MultiEdit — по `tool_input.file_path`; Bash — по разнице снимков git status до и после. `check:story <id> --seed 1` и `story:lint <id> --changed --quick`. Ответ — `hookSpecificOutput.additionalContext`, exit 0. Ошибки компиляции — каждый раз; прочие ошибки (и предупреждения `check:story`: неизвестный тег, длинное сообщение) — поимённо только новые, не больше `skill.hook.max_findings`, о прежних — число, плюс «исправлено N». Правка мимо историй и Bash без правок — пустой вывод. `RELAYER_HOOKS=off` выключает.
- `scripts/hooks/session-start.mjs` — `story:status --all` в stdout (его модель видит), снимок `src/stories` на старте; на `compact`/`resume` снимок не перезаписывается.
- `scripts/hooks/full.mjs` — полный режим вручную или из скилла: `check:story` + `story:lint` на `lint.runs.full` прогонов; ошибки все, предупреждения — по `lint.examples` на проверку (`--all` — все, `--hints` — с подсказками, `--json`). Без id — изменённые истории. Код выхода 1 при ошибках, 2 — неизвестная история или флаг.
- `scripts/hooks/selftest.mjs` + `npm run test:hooks` в `package.json` — 14 тестов на временной пробной истории `src/stories/zz-hooktest-<pid>/` (удаляется в `finally`).
- `docs/playbook/thresholds.json` — ключ `skill.hook.max_findings` (8, наша оценка).

## Решения

- **Ответ модели — `additionalContext`, exit 0**, а не exit 2: правка уже сделана, блокировать нечего, а «blocking error» звучит как отказ инструмента. Видимость подтверждена экспериментом.
- **Bash — снимок, а не голый `git status`.** Незакоммиченные правки, лежавшие до сессии, иначе проверялись бы после каждого `ls`. `SessionStart` кладёт начальный снимок, каждый вызов хука его обновляет; история проверяется, только если подпись её файлов изменилась (в том числе откат к git). Если хуки подключили посреди сессии, первый Bash только снимает снимок.
- **Повторы не засоряют контекст.** Находки, о которых уже сказали в этой сессии, сворачиваются в число. Исключение — ошибки компиляции: пока история не собирается, прочие проверки молчат, и модель должна видеть причину каждый раз.
- **`check:story` с `--seed 1`**: иначе случайный бот мигал бы «новыми» находками между правками.
- **`--changed` с откатом.** `story:lint --changed` не видит историю, возвращённую к версии из git, и прежние ошибки выглядели бы исправленными — тогда хук повторяет lint без `--changed`.
- **`agent_type`:** таблица `MODE_BY_AGENT` в `post-edit.mjs`, `chapter-writer` → быстрый. Главной сессии тоже быстрый: полный прогон на каждую правку дорог (`chuzhoy-golos` ≈ 7 с в быстром режиме), его зовут по окончании главы через `full.mjs`.
- **Дочерние процессы пишут JSON в файл, а не в трубу**: `lint.mjs` делает `process.exit` сразу после вывода, и из трубы доходили только первые 64 КБ (на `chuzhoy-golos` JSON 118 КБ → «story:lint не запустился»). В `full.mjs` по той же причине `process.exitCode` вместо `process.exit`.
- **Вывод `full.mjs` сгруппирован** по `lint.examples`: на `chuzhoy-golos` 39 КБ → 15 КБ. Ошибки — все.

## Проверки

- `node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8'))"` — ок.
- `node scripts/hooks/full.mjs --help` — ок (и `--help` у `post-edit.mjs`, `session-start.mjs`, `selftest.mjs`).
- `npm run test:hooks` — 14 из 14.
- `npm run test:lib` — 29 из 29; `npm run test:lint` — 30 из 30; `npm run story:pack -- --check` — ок; `npm run prompt -- --quiet` — ок; `npm run check:story` — код 0.
- `npm run test:story-cmd` — 33 из 34: падает «vars: the-number сходится с подсчётом по исходнику» (`theo_trust 14 !== 0`). На чистом HEAD (`eb20e4f`, отдельный worktree) падает так же — не от этой задачи.
- Время: хук после Bash без правок ≈ 0,09 с; быстрый режим на `the-number` ≈ 3 с, на `chuzhoy-golos` ≈ 7 с.

### Протокол эксперимента (`claude -p`, Claude Code 2.1.310)

Запуск из корня worktree: `claude -p "$P" --model opus --permission-mode bypassPermissions --output-format stream-json --verbose --no-session-persistence --strict-mcp-config < /dev/null`. После каждого прогона — `git checkout` правленого файла.

| № | правка | что видела модель (дословно её ответ) |
|---|---|---|
| Х1 | **Edit**: в конец `the-number/ch02.ink` строка `-> nowhere_knot_xyz` | «Хук проверки историй после Edit (быстрый режим): ✗ the-number: не компилируется, остальные проверки не запускались · ✗ компиляция · ch02.ink:245 · Divert target not found: '-> nowhere_knot_xyz'». SessionStart в начале разговора она тоже процитировала: «Истории (npm run story:status -- --all): Папки docs/stories/ нет…» |
| Х2 | **Bash**: `printf "\n-> nowhere_knot_bash\n" >> src/stories/the-number/ch03.ink` | «Хук проверки историй после Bash (быстрый режим): ✗ the-number: не компилируется… · ✗ компиляция · ch03.ink:204 · Divert target not found: '-> nowhere_knot_bash'». Сам Bash вернул «(Bash completed with no output)» — ошибку принёс только хук |
| Х3 | **Edit** (итоговый код): в `ch03.ink` реплика на 212 знаков, история собирается | 7 находок поимённо: 5 прежних C-01 истории, `C-34 · ch3 (гл. 3) · сообщение 212 знаков — разбей на два пузыря` и предупреждение `check:story` о длинном сообщении; хвост «предупреждений lint 44, подсказок 42 · весь список: node scripts/hooks/full.mjs the-number». 1,6 тыс. знаков |

Итог: и через Edit, и через Bash модель видит ошибку сразу после инструмента, вывод короткий.

## Открыто

- При первой правке истории в сессии прежние ошибки истории (в `the-number` их пять, C-01) приходят вместе с новой как «не сообщалось»: хук не отличает «внесла эта правка» от «было до неё». Отличать можно, если считать базу по версии из git (ещё один прогон lint на старте или на первой правке) — оставил на потом, чтобы хук был быстрым.
- `story:lint --partial` (часть глав с `beta_stop`) хук сам не включает: соглашения, как `chapter-writer` пишет неполную историю, пока нет. Когда появится агент (T-…), стоит выбирать `--partial` по `agent_type` в `MODE_BY_AGENT`.
- Хук на `SubagentStop` для `chapter-writer` с `full.mjs` не вешал: по задаче полный режим вызывает скилл.
- `test:story-cmd` падает на HEAD (`vars: the-number`, `theo_trust`) — не моя зона, автору задачи T-04/T-04b.
