# X-E2mini · сырые результаты

Мини-Э2 2026-10-25: `story-choices` на отложенной истории `slepoe-pyatno` и мутантах, `story-desk` на ней же.
Запись в журнале — `docs/lab/journal.md`, сверка — [scoring.md](scoring.md).

| файл | что |
|---|---|
| `natural-1.md`, `natural-2.md` | два прогона `claude -p` фразой «В «Слепом пятне» кнопки ничего не меняют, посмотри»: сжатый транскрипт и ответ |
| `desk-1.md`, `desk-2.md` | два прогона `claude -p`: «Мы только что посмотрели кнопки… Запиши, где мы с этой историей, и что дальше» |
| `desk-state-1/`, `desk-state-2/` | что `story-desk` записал в `docs/stories/slepoe-pyatno/` слепой копии (в репозиторий не переносилось) |
| `skills-test.txt`, `mutants-story-choices.json` | `npm run skills:test -- --skill story-choices --control --jobs 3` |
| `lint-choices.txt` | `story:lint` по проверкам шага 2 скилла, для сверки ложных срабатываний |
| `scoring.md` | ключ, полнота, точность («оценка королевы»), устойчивость |
| `permissions.md` | почему каждый прогон получает отказы в правах: `Bash(npm run story:*)` не совпадает с `npm run story:lint` |

## Как прогоняли

- **Слепая копия.** Репозиторий скопирован в scratchpad без `.git`, `docs/lab/`, `docs/books/` (вместо них
  `docs/books/_clean/` от `kb:clean`), `docs/playbook/_build/`, `story-findings.md`, `REVIEW.md`,
  `build-plan-critique.md`, а из `checks.md` вырезан раздел «Прогон первой волны по трём историям». В копии
  `node_modules` — ссылка, свой `git init`. Чтение исходного репозитория запрещено правилом
  `Read(//Users/y.zubach/dev/**)`. Остались только строки калибровки в `thresholds.json` (`history`), где
  упоминаются узлы истории. Это выводы команд, а не находки.
- **Права:** `Read, Grep, Glob, Skill`, `Bash(npm run story:*)`, `Bash(node scripts/*)`, `Bash(node .claude/skills/*)`,
  `Write/Edit(docs/stories/**)`. `WebFetch`/`WebSearch` и запись вне `docs/stories/` запрещены. `--max-turns 120`,
  `--no-session-persistence`, `--strict-mcp-config`, `--permission-prompts none`, модель `claude-opus-5-5`.
- Прогоны 1 и 2 шли параллельно, каждый в своей копии. `story-desk` запускался в тех же копиях после `story-choices`,
  в новой сессии.
- Полный поток `stream-json` в репозиторий не положен (по 200 КБ); в `natural-*.md` и `desk-*.md` — все вызовы
  инструментов, начало каждого результата и ответ целиком.
