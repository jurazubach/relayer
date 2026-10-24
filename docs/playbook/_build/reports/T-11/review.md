# T-11 — ревью

Вердикт: pass

## Исправил сам

Ничего: правок не потребовалось.

## Доделать (если fail)

—

## Проверено

- Приёмка: `node -e "JSON.parse(…settings.json…)"` — ок; `node scripts/hooks/full.mjs --help` — ок.
- `npm run test:hooks` — 14 из 14; `npm run test:lib` — 29 из 29; `npm run story:pack -- --check` — ок; `npm run prompt -- --quiet` — ок, рабочая копия после него чистая.
- `.claude/settings.json`: раздел `hooks` дописан, настройки T-00 (`enabledPlugins`, `disableClaudeAiConnectors`, `skillOverrides`) не тронуты. Матчеры как в уточнениях: `startup|resume|clear|compact`, `Write|Edit|MultiEdit|Bash`.
- Ручной прогон хуков на `slepoe-pyatno` (история, на которой исполнитель не проверял): SessionStart → снимок; битый divert через Bash → `additionalContext` с `ch02.ink:172 · Divert target not found`; то же через Edit → то же; откат через git + Bash → «исправлено 1»; Edit мимо `src/stories` → пустой вывод, код 0. Bash без правок ≈ 0,15 с.
- Свой эксперимент `claude -p` (sonnet): Bash `printf "\n-> rev_missing_knot\n" >> src/stories/the-number/ch04.ink` — модель дословно пересказала отчёт хука `✗ компиляция · ch04.ink:177 · Divert target not found: '-> rev_missing_knot'`. Протокол исполнителя (Edit, Bash, длинная реплика) в `build.md` сходится. Сам SessionStart в этой сессии ревью тоже пришёл в контекст.
- Код: на русском, комментарии объясняют «почему», `--help` у всех четырёх скриптов, новых зависимостей нет, лимиты — ключами `thresholds.json` (`skill.hook.max_output_chars`, `skill.hook.max_findings`, `lint.examples`). Старые команды не правились, только вызываются.
- Границы: `docs/books/*` не тронут. В `_build` только отчёт исполнителя, как положено.

## Замечания на будущее

- Вне разрешённых путей две точечные правки: строка `test:hooks` в `package.json` и ключ `skill.hook.max_findings` в `docs/playbook/thresholds.json`. Ключ нужен по правилу «числа — только ключами thresholds.json», скрипт — для самопроверки. Оставил обе; королеве стоит добавлять `package.json` и `thresholds.json` в разрешённые пути задач типа «код».
- Прежние ошибки истории при первой правке в сессии приходят как новые (в `build.md` это записано в «Открыто»). Для `the-number` это пять C-01 при каждой новой сессии. Терпимо, но шумно; если будет мешать `chapter-writer`, базу стоит считать по версии из git.
- `--partial` для неполной истории хук не выбирает: его нужно добавить в `MODE_BY_AGENT`, когда появится `chapter-writer`.
- Состояние сессии лежит в `$TMPDIR/relayer-hooks/` и ничем не чистится. Файлы маленькие, но со временем их наберётся много.
- `test:story-cmd` падает на базе (`vars: the-number`, `theo_trust`), к T-11 это отношения не имеет.
