# T-21 · просьбы за пределами разрешённых путей

1. **`scripts/lint/selftest-story-plan.mjs`** — тест «дорогие развилки» импортирует `expensiveForks` из
   `story-plan/scripts/plan-check.mjs` и проверяет старое определение (кнопки в разные узлы, распределитель в финалы
   не считается). Бюджет теперь считает `expensiveBudget()` из `story-branch/scripts/branch-core.mjs`; `expensiveForks`
   оставлен только ради этого теста. Что сделать: заменить тест на `expensiveBudget(<путь к скелету>)` — скелет с
   `// core:` и веткой в `story.branch.expensive.skeleton_lines` строк-сцен считается дорогим, ветка в одну строку — нет,
   распределитель в свои финалы — дорогой (свой финал). После этого удалить `expensiveForks` из `plan-check.mjs`.
   Зачем: в коде не должно остаться второго определения дорогой развилки.

2. **`.claude/skills/story-brainstorm/SKILL.md`, строка 79** — ссылается на удалённый ключ
   `skill.brainstorm.logline.max_words`. Заменить на `story.logline.max_words` (скрипты уже читают новый).
   Зачем: ссылка на несуществующий ключ; `story-kb` и автор пойдут искать его в `thresholds.json`.

3. **`.claude/skills/story-brainstorm/SKILL.md`, description** — фраза «Придумай неожиданный поворот: кто-то из друзей
   героя окажется не тем, кем кажется» (ждёт `story-brainstorm`) после сужения `story-branch` всё равно уходит в
   `story-branch` 5 из 5 (`reports/T-21/triggers/story-branch.json`, `story-mystery.json`). Пробовал и более жёсткую
   формулировку `story-branch` («поворот в названной точке уже написанной истории или плана (не идея новой истории)») —
   тоже 5 из 5 в `story-branch`, откатил. Со стороны `story-branch` шов не закрыть: нужен маркер в описании
   `story-brainstorm`, например «придумай поворот или твист для идеи». Альтернатива — решить, что фраза без названной
   истории двусмысленна, и снять её из негативов `story-branch.json` / `story-mystery.json` (решает королева).

4. **`.claude/skills/story-branch/references/budget.md`, строки 11 и 88** — определение дорогой кнопки называет только
   `story.branch.expensive.msgs`. Дописать: «на скелете (`// core: D-NN`) — `story.branch.expensive.skeleton_lines`
   строк-сцен; тот же счёт печатают `plan-check.mjs` и `plan-compare.mjs`». В `SKILL.md` скилла это уже сказано.

5. **`.gitignore`** (общий файл) — пакет агента `chapter-writer` теперь кладётся в
   `docs/stories/<id>/context-chNN.md` и удаляется скиллом после ответа агента. Если сессия оборвётся, файл может
   попасть в коммит. Предлагаю строку `docs/stories/*/context-ch*.md`.
