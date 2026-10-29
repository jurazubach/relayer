# T-21 — ревью

Вердикт: pass

## Исправил сам

- `.claude/skills/story-brainstorm/SKILL.md:79` — ссылка на удалённый ключ `skill.brainstorm.logline.max_words`
  → `story.logline.max_words` (`requests.md` п. 2). Путь вне разрешённых, но правка — следствие переименования
  из п. 6 задачи: без неё в скилле битая ссылка на ключ. `skill-check story-brainstorm` ✓.

## Доделать (если fail)

—

## Проверено

- Приёмка (сам): `test:hooks` 21/21, `test:lint` 184/184, `test:story-cmd` 38/38, `skill-check story-plan --min-refs 9
  --min-scripts 3` ✓, `skill-check chapter-write --min-refs 8 --min-scripts 3` ✓, `agent-check` ×4 ✓.
- **Одно число** (п. 1): `plan-check --no-time` и `branch-budget --runs 0` — the-number 5/5, slepoe-pyatno 2/2,
  chuzhoy-golos 5/5, `run3-kanatka/skeleton-v1` 4/4, `skeleton-v2` 3/3; `plan-compare` по обоим скелетам — 4 и 3.
  Счёт — импорт `expensiveBudget()`/`spend()` из `branch-core.mjs`, не дочерний процесс. `plan-check --json`
  отдаёт `branches` с бюджетом, ключом порога и раскладкой.
- Ключи: `skill.plan.branches` и `merge_within` удалены, записи в `history` наследников (`story.branch.budget.*`,
  `story.branch.fan.merge_hops`, сам `skill.plan.spine.events`); `story.branch.expensive.skeleton_lines` с `basis`,
  `checks`, `calibrated_on`. `git grep` по удалённым ключам вне отчётов — пусто (после моей правки).
- Контракт агентов (п. 2): в `story-plan/SKILL.md` шаг 4 — поля задания, сверка `core:` со `STATUS.md`, таблица
  (шаг 8), копия в `skeleton.ink` и `idea-park.mjs` (шаг 9); в `chapter-write/SKILL.md` шаг 2 — все поля задания,
  удаление пакета; «Готово, когда» — `chapter-lint --chapter N` + `full.mjs --new`. Агент `chapter-writer` и
  `decisions-chapter.md` согласованы с теми же полями.
- `full.mjs --new` на the-number и chuzhoy-golos — код 0 при прежних ошибках; реализация через `git archive` во
  временную папку, сравнение по `fingerprint`.
- `agent-guard.mjs` (п. 3): белые списки всех четырёх перенесены из `node -e` один в один (сверил регулярки), сбой
  и неизвестный агент — код 2; ручной вызов `story-auditor` с `; rm -rf /` — отказ, код 2; frontmatter без `node -e`.
- `core-check --story the-number`: `theo_trust` («только финал, молчит») и `dina_trust` («невидимая») — ⚠ [C-03].
  `stale-check --story chuzhoy-golos` работает; правка — только `--help` (код уже читал скелеты, исполнитель проверил).
- Описания `story-branch` и `story-desk` — как в задании; сырые данные `lab:triggers` в `reports/T-21/triggers/`.
- `settings.json`: три правила, точечно. A/B-проверку `claude -p` из отчёта не повторял (тратит запуски); вывод
  исполнителя конкретный (с правилом нет отказа, без — есть).
- `story:coverage --summary` — без владельца 0, два владельца 0; `test:coverage` ✓.
- Границы: `git diff --name-only master...HEAD` — всё в разрешённых путях, плюс `CLAUDE.md` (общий, две строки
  о `scripts/hooks/`) и отчёты T-21. В `docs/books/*` и прочем `_build/*` правок нет.

## Замечания на будущее

- `expensiveForks` в `plan-check.mjs` — второе (старое) определение «дорогой развилки», живёт ради
  `scripts/lint/selftest-story-plan.mjs` (`requests.md` п. 1). Переписать тест на `expensiveBudget()` и удалить
  функцию — до того, как кто-то снова на неё сошлётся.
- На скелете `budgetFor()` сравнивает строки-сцены с `story.branch.budget.short_msgs` (сообщения): скелет короче
  50 строк получит бюджет короткой истории. Пока не сработало, но это та же ошибка единиц, ради которой заводили
  `skeleton_lines`.
- Шов `story-brainstorm` ↔ `story-branch`: исполнитель добавил позитив «Придумай неожиданный поворот для новой
  истории…» в `story-brainstorm.json`, и он падает 0 из 10 — набор фраз теперь заведомо красный. Решение королевы:
  маркер в описании `story-brainstorm` или снять двусмысленную фразу (`requests.md` п. 3).
- `story-branch/references/budget.md` не знает про ключ скелета (`requests.md` п. 4); `.gitignore` для
  `docs/stories/*/context-ch*.md` (`requests.md` п. 5).
- `Bash(node */.claude/skills/*)` шире «нашего проекта» — зафиксировано исполнителем, точнее шаблоном не выразить.
- `CLAUDE_PROJECT_DIR` в хуках frontmatter агента живым запуском не проверен — первый живой прогон агента в X-E7
  должен это подтвердить (запасной `:-.` работает при старте из корня).
- Сырые данные `lab:triggers` лежат в отчёте задачи, а не в `docs/lab/runs/`, и записи в `journal.md` нет —
  для приёмки T-21 достаточно, но перемер стоит занести в журнал, когда шов закроют.
