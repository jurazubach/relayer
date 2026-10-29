# T-21 — сверка с замыслом

Вердикт: drift-minor

## Исправил сам

- **Второе определение дорогой развилки удалено** (п. 1 задачи — «одна функция»). `expensiveForks()` в
  `story-plan/scripts/plan-check.mjs` оставался ради `scripts/lint/selftest-story-plan.mjs`, и тест закреплял
  старый смысл («распределитель в финалы не дорогой»), противоположный новому счёту `branch-core` (свой финал —
  дорогой). Тест переписан на `expensiveBudget()` из `story-branch/scripts/branch-core.mjs`: отклик в одну строку —
  0, ветка в `story.branch.expensive.skeleton_lines` строк-сцен — 1, распределитель в свои финалы — 1; функция
  и лишний импорт `resolveTarget` удалены. Закрывает `requests.md` п. 1. `test:lint` 184/184, `test:story-cmd`
  38/38, `skill-check story-plan` ✓, `plan-check` на `chuzhoy-golos` — то же число 5.

## Дрейф (если есть)

Крупного нет. Замысел: задача отвечает боли «граф почти линейный / выбор не ощущается» (один бюджет дорогих
развилок для `story-plan` и `story-branch`) и готовит X-E7 (агенты, права, критерий готовности главы). Решений
против автора нет: пауз, упрёков, часов игрока, платных выборов, замков, смены модели (все четыре агента — `opus`)
и пуша в `master` задача не касается. Числа — только ключами (`skeleton_lines`, `story.logline.max_words` с
`history`), строк про наши истории в скиллах нет (the-number — только в самопроверке `scripts/hooks/selftest.mjs`).

Мелочи, оставленные как есть:
- Вне `writes`: `story-brainstorm/SKILL.md` (одна ссылка на переименованный ключ, правка ревьюера — следствие п. 6)
  и две строки `CLAUDE.md` про `scripts/hooks/`. Оба — по делу, записаны в отчётах.
- Сверх задания: `full.mjs --new` и право `Bash(rm docs/stories/*/context-ch*.md)`. Это не расползание, а способ
  выполнить п. 2 командой, а не «на глаз» (INTENT, «Чего нельзя»); решение записано в `build.md`.

## Риски для следующих задач

- **Набор фраз `story-brainstorm` заведомо красный:** позитив «Придумай неожиданный поворот для новой истории…»
  уходит в `story-branch` 0 из 10. Любая будущая приёмка `lab:triggers --skill story-brainstorm --min build`
  (F-final, повторный прогон) упадёт не по своей вине.
- **Тест `full --new` в `test:hooks` опирается на прежние ошибки THE NUMBER в HEAD.** X-E7 THE NUMBER не трогает,
  но если её когда-нибудь вычистят, тест упадёт (`old_errors > 0`). Лучше — синтетическая история во временной
  папке с git.
- `CLAUDE_PROJECT_DIR` в хуках frontmatter агентов живым запуском не проверен — первый вызов `story-architect` /
  `chapter-writer` в X-E7 должен это подтвердить (запасной `:-.` работает при старте из корня).
- На скелете бюджет по `story.branch.budget.short_msgs` сравнивается со строками-сценами: скелет короче порога
  получит бюджет короткой истории (1). На X-E7, если план «Чужого голоса» будет коротким скелетом, `plan-check`
  покажет «сверх бюджета» ложно.
- Пакет `context-chNN.md` может остаться в `docs/stories/<id>/` после оборванной сессии и уехать в коммит X-E7.

## Предложения королеве

1. Шов `story-brainstorm` ↔ `story-branch` (`requests.md` п. 3): маркер «поворот или твист для идеи / новой
   истории» в описании `story-brainstorm` — в задачу, которой разрешён этот файл (X-E7 или F-docs); иначе снять
   двусмысленную фразу из негативов `story-branch.json` / `story-mystery.json` и позитив из `story-brainstorm.json`.
2. `story-branch/references/budget.md` — строка про `skeleton_lines` на скелете (`requests.md` п. 4).
3. `.gitignore`: `docs/stories/*/context-ch*.md` (`requests.md` п. 5) — до X-E7.
4. Отдельный ключ бюджета короткого скелета (`story.branch.budget.short_skeleton_lines`) — если X-E7 упрётся.
5. Перемер `lab:triggers` из `reports/T-21/triggers/` занести в `docs/lab/journal.md`, когда шов закроют.
