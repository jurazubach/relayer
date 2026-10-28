# S-plan · просьбы за пределами путей задачи

1. **`docs/playbook/thresholds.json` — бюджет дорогих развилок.** Заведён `skill.plan.branches` (`min`, `max`,
   `per_chapter`) для `plan-check.mjs` / `plan-compare.mjs`. Бюджет веток — тема `story-branch` (TH-18, `budget.md`,
   `branch-budget.mjs`), задача идёт параллельно. Когда `story-branch` заведёт свой ключ бюджета — свести в один
   (итог волны w4-creation), в скриптах `story-plan` сменить ключ.
2. **Мутанты для RED уровня L3** (`docs/lab/mutants/`, не мои пути). Мои RED держатся на L2: L3 по правилам покрытия —
   только с мутантом. Кандидаты, которые ловят команды скилла: коридор с сортировкой в конце
   (`ashwell-standard-patterns:RED-01` — `plan-check.mjs`: хребет и дорогие развилки), петля `+` без выхода
   (`ashwell-standard-patterns:RED-10`, C-19), глава вдвое тоньше медианы (`narrative-postmortems:RED-09`, C-38),
   одна линия в главе (`nicklin-writing-for-games:RED-11`, C-45), первые главы одинаковы (`emshort-structures:RED-16`,
   C-25). Нужна основа-скелет мутантов (сейчас `_base` — история начисто) или мутанты на `_base`.
3. **`story-pace` / C-38 на скелете.** `schedule.mjs` запускает C-31, C-32, C-38, C-42 на скелете (в `--plan` их нет).
   C-38 считает паузу стыка перед последней главой (тёмная ночь, R-33) паузой последней главы, поэтому подсказка
   «паузы в финальной главе не короче середины» на скелете с одной паузой в последней главе ожидаема. Сейчас это
   оговорено в `schedule.md` и в шаге сверки `SKILL.md`; можно учесть в C-38 (стык главы отдельно от пауз внутри).
4. **`story-desk/references/state-format.md`.** Там указан один `plans/skeleton.ink`. `story-plan` пишет версии
   `plans/skeleton-vN.ink` (по версии на план) и копирует выбранную в `plans/skeleton.ink`, которую находит
   `story:lint --plan --story <id>`. Просьба дописать версии скелета в состав папки и в `stale-check.mjs` (ядро
   скелета — строка `// core: D-NN`).
5. **`story-review/references/lenses.md`** (`snyder-save-the-cat:LESSON-12`): «лимит — число узлов-карточек на главу у
   `story-plan`». Такого ключа нет; размер плана держат `skill.plan.scenes` (сцен в плане) и
   `skill.plan.chapter.buttons` (кнопок за главу). Просьба сослаться на них.
6. **C-39 в JSON.** `plan-check.mjs` ищет крючок на платной границе по находке `C-39.end_hook` с полем `chapter`.
   Если формат находки C-39 поменяется — сообщить `story-plan` (самопроверка `selftest-story-plan.mjs` этот путь не
   покрывает: нужен бот и C-39).
