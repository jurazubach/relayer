# S-brainstorm · просьбы за пределами разрешённых путей

1. **`.claude/skills/story-desk/references/state-format.md` — файл раундов `directions.md`** (владелец
   `story-desk`). Раунды направлений живут в `docs/stories/<id>/directions.md`: по нему `directions.mjs` ищет
   повторы прошлых раундов («ещё») и проверяет режим «далеко» (Б-4), а `ideas-bank.mjs` ищет по всем историям.
   Без постоянного файла «ещё» в новой сессии не знает, что уже показано. Просьба: дописать строку в «Состав
   папки» (`directions.md   раунды направлений — пишет story-brainstorm`) и в таблицу «Кто какой файл пишет»
   (пишет `story-brainstorm`, читают `story-brainstorm`, `story-core`, `story-desk`; новый раунд — в конец файла,
   старые не правятся, кроме статуса). Формат — `.claude/skills/story-brainstorm/references/directions-format.md`.
   Свести с форматом направлений из `build-plan.md` §7 — итог волны.

2. **`docs/playbook/thresholds.json` — новые ключи вне путей задачи.** Числа скилла по правилу «только в
   thresholds.json» заведены точечно, одним блоком после `skill.reference.max_lines`: `skill.brainstorm.directions.count`,
   `…axes_min_diff`, `…far_count`, `skill.brainstorm.axes.same_overlap`, `skill.brainstorm.trailer.messages`,
   `skill.brainstorm.logline.max_words`, `skill.brainstorm.rule.max_words`, `…rule.max_rules`,
   `skill.brainstorm.bank.similar_min`; и два словаря рядом — `dict.logline_irony`, `dict.rule_event`. Область
   `brainstorm.*` валидатор не пускает (`scripts/lib/thresholds.mjs`, `AREAS`), поэтому ключи — в области `skill`.
   Если королева хочет отдельные области для скиллов создания (`brainstorm`, `core`, `plan`), — правка `AREAS`
   в `scripts/lib` и переименование ключей одной заменой.

3. **`story-core` (параллельная задача) — логлайн R-02.** `premise-check.mjs --story <id>` уже читает логлайн из
   шапки ink или из решения-ядра и проверяет форму (роль игрока, противопоставление, длина). Если `story-core`
   держит `logline.md`, ему не нужен свой скрипт формы: можно звать
   `node .claude/skills/story-brainstorm/scripts/premise-check.mjs --story <id>` или вынести `checkLogline` в
   `scripts/lib` (тогда — просьба к владельцу `scripts/lib`). На трёх историях каталога форма R-02 не выполнена:
   логлайны D-01 в третьем лице, у одного нет роли игрока — это материал для `story-core`, не для этой задачи.

4. **`.claude/skills/story-desk/scripts/idea-park.mjs` — экспорт разбора.** `ideas-bank.mjs` берёт банк через
   `idea-park.mjs --list --json` (дочерний процесс), чтобы не дублировать формат `ideas.md`. Если `parseIdeas`
   вынести в `desk-core.mjs` с экспортом, обёртка станет импортом. Не срочно: сейчас работает.

5. **Для сведения владельцу `story-desk` (тест срабатывания).** В прогоне `lab:triggers --skill story-brainstorm`
   фраза story-desk «Где у нас список отложенных идей по всем историям?» в 3 прогонах из 3 не вызвала `Skill`:
   в двух модель прочитала `story-desk/SKILL.md` напрямую (обход), в одном из них — ещё и
   `story-brainstorm/SKILL.md`; ложным срабатыванием `story-brainstorm` это не засчитано. Описание
   `story-brainstorm` про банк говорит «банк отвергнутых идей»; если обход повторится в итоге волны, — убрать эти
   слова из описания `story-brainstorm` или усилить «список отложенных идей» в описании `story-desk`.
