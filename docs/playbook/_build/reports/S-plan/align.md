# S-plan — сверка с замыслом

Вердикт: drift-minor

## Исправил сам

- `references/systems/reigns-80days.md` → `systems/deck-route.md`, ссылка в `hubs.md` поправлена. Текст файла
  названий не содержал («карточная игра о правителе», «игра-маршрут вокруг света»), а имя файла несло названия
  реальных игр. `skill-check` ✓, `story:coverage --skill story-plan --min L2` ✓.

## Дрейф (если есть)

Крупного дрейфа нет. Результат закрывает боли «с чего начинать» и «граф почти линейный» (скелет до текста, порядок
производства, хребет и «река» числами). Решения автора соблюдены:
- срок паузы запрещён (A-01 в `explain.md`, `schedule.md`); причины без срока;
- упрёков нет;
- `#delay` — время дела в мире, а не часы игрока; один скелет на оба режима (A-04);
- граница стоит после главы 1 или 2 на крючке, который сбывается сразу; платных выборов нет, «по клику» не продаётся;
- замков между историями, другой модели и пуша в `master` нет.

В скилле нет строк про три истории и реальных брендов. Числа в скриптах берутся только из `thresholds.json`.

Мелкий дрейф по правилу «один владелец темы», который не чинил сам: он на стыке с параллельной задачей и записан в
`requests.md` п. 1 и в ревью. S-branch слит в `build/main` после того, как от него ответвилась S-plan
(merge-base `f4f5b97`), поэтому сборщик не мог взять его формат. В итоге:
- `skill.plan.branches` {min, max, per_chapter} повторяет `story.branch.budget.*` (владелец бюджета — `story-branch`,
  TH-18);
- `skill.plan.spine.events.merge_within` повторяет `story.branch.fan.merge_hops`;
- «дорогая развилка» определена двумя способами: в `plan-check.mjs` это кнопки, ведущие в разные узлы, а в
  `branch-budget.mjs` ещё нужно `story.branch.expensive.msgs` сообщений в области кнопки.

Если ничего не делать, `plan-check` и `branch-budget` на одном скелете покажут разное число дорогих развилок.
Как вернуть: `plan-check.mjs` / `plan-compare.mjs` берут число дорогих развилок из `branch-budget.mjs --json`
(или из общей функции `branch-core.mjs`), ключи `skill.plan.branches` и `skill.plan.spine.events.merge_within`
удалить. В `skeleton-format.md` строку «бюджет» перевести на `story.branch.budget.max`.

## Риски для следующих задач

- **A-architect:** формат совместим. `plans/plan-vN.md` начинается с `core: D-NN`, у скелета первая строка
  `// core: D-NN`, `plan-compare.mjs --story <id>` читает `plans/skeleton-v*.ink`. Агенту нужна в правах запись
  `skeleton-vN.ink` и копия в `plans/skeleton.ink`, а не только `skeleton.ink`.
- **story-desk / stale-check:** `state-format.md` знает только `plans/skeleton.ink`, версий `skeleton-vN.ink` в нём
  нет (`requests.md` п. 4). `story-branch/plan-update.md` пишет сразу в `plans/skeleton.ink`. Это совместимо, но
  если скелет правит `story-branch`, версия теряется: нужно договориться, что скелет всегда правит `story-plan`.
- **Слияние:** конфликт возможен только в `CLAUDE.md` (merge=union) и в соседних блоках `thresholds.json`.
- **C-39 в JSON:** граница опирается на поле `chapter` находки `C-39.end_hook`, и самопроверка этот путь не покрывает.
- **Владельцы:** строки начала, пауз, финалов, состава и теста с `owner_via: cluster|refs` закрыты в story-plan
  (список в ревью). Если их не перенести в `owners.md`, покрытие у настоящих владельцев будет числиться не за ними.

## Предложения королеве

1. На итоге W4 свести бюджет и определение дорогой развилки в `story-branch` (см. выше). `story-plan` при этом
   вызывает `branch-budget.mjs` и не считает сам.
2. В задаче A-architect добавить в `writes`/права `plans/skeleton-vN.ink`. Записать правило: версию скелета
   создаёт только `story-plan` или агент, а `story-branch` после решения зовёт `story-plan` (шаг 2 его
   `plan-update.md` это уже подразумевает).
3. Дописать в `state-format.md` `story-desk` версии скелета и сверку `// core:` в `stale-check.mjs`.
4. Перенести опоры чужих строк из ревью (story-opening, story-pauses/time, story-endings, story-cast,
   story-playtest) в `owners.md`.
5. В промпт type-skill добавить пункт: имена файлов references — тоже без названий реальных игр и брендов.
