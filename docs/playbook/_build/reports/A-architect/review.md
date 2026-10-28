# A-architect — ревью

Вердикт: pass

## Исправил сам

— (правок не понадобилось)

## Доделать (если fail)

—

## Проверено

- `node docs/playbook/_build/checks/agent-check.mjs story-architect` → `✓ агент story-architect: ок`.
- Дифф `build/main...HEAD`: из рабочих файлов только `.claude/agents/story-architect.md`, остальное — отчёты
  в `_build/reports/A-architect/`. `docs/books/*` не тронуты, общие файлы не правлены.
- Соответствие плану §6: роль узкая (варианты плана в фоне), вызывают `story-plan` / `story-core` / `story-branch`,
  `tools: Read, Write, Edit, Bash` без `Agent`/`Skill`, `permissionMode: acceptEdits`, первая строка плана
  `core: D-NN` и `// core: D-NN` в скелете, сравнение `plan-compare`, вопросов автору нет (запрет и формат
  «один ответ»), отвергнутое — готовыми строками `idea-park.mjs` (проверка `--dry-run`); саму запись в `ideas.md`
  делает `story-desk` после выбора автора. Это совпадает с §6 («выход: … отвергнутые варианты для ideas.md») и
  с записью только в `plans/`. `Edit` сверх плана обоснован в build.md (точечные правки скелета по ✗).
- Таблица «ситуация → скилл → references»: все 24 пути `.claude/skills/…` и `docs/style.md`, `superseded.md`,
  `thresholds.json`, `capabilities.json` существуют; разделы `docs/style.md` §6 (кнопки) и §8 (время) — те самые.
  Флаги всех вызовов (`skeleton.mjs --template/--check --file`, `plan-check --file`, `plan-compare --files --free`,
  `branch-budget --story <путь>`, `core-check`, `core-snapshot --header`, `world-clock`, `idea-park --list/--dry-run`)
  сверены с `--help` скриптов. Ключ `skill.plan.variants` есть в `thresholds.json`.
- Хуки прогнал сам (13 случаев): Bash пропускает `story:lint --plan`, `ls`, `idea-park … --dry-run` с `;` в кавычках;
  отклоняет `idea-park` без `--dry-run` и с `--dry-run` только внутри `--text`, `grep | head`, `--out`,
  `core-snapshot --write`, `skeleton --new`. Запись пропускает новый `plans/plan-vN.md`, отклоняет `skeleton.ink`,
  `ideas.md`, путь с `..`. Пишущие пути у разрешённых команд: `story:lint` пишет транскрипты только в tmp
  (`--out` закрыт), `skeleton.mjs --new` и `core-snapshot --write` закрыты.
- Вымышленная история «Канатка» (run3): ядро D-01 без реальных брендов; оба скелета `skeleton.mjs --check` → ✓.
  Ответ агента в `runs.md` в заявленном формате: таблица `plan-compare`, находки со сверкой, ложные с причиной,
  рекомендация числами, строка для `ideas.md`, допущения, «нет данных» — честные.

## Замечания на будущее

- Ни один скилл пока не зовёт агента (просьба 2): контракт задания живёт только в файле агента. Нужен шаг в
  `story-plan` (шаг 4), `story-core` (шаг 8), `story-branch/references/plan-update.md`.
- Сторожа inline `node -e` по ~900 знаков — вынести в `scripts/hooks/` с самопроверкой в `test:hooks` (просьба 1,
  общий модуль для A-auditor / A-cold).
- `plan-compare` на скелете почти не различает структуры (горлышко и ступица дали одинаковые хребет и финалы) —
  метрика формы к `story-plan`.
- Два определения «дорогой развилки» (`plan-check` 3, `branch-budget` 1) и ложный C-53 на шапке `core-snapshot`
  (просьбы 5–6) — к владельцам `story-plan` / `story-branch` / `story:lint`.
- Смена ядра посреди работы (шаг 10) в живом прогоне не проверена.
- Агент не может прочитать порог иначе как `Read` всего `thresholds.json` (~10 тыс. строк) — дорого; стоит дать
  `npm run story:rule`-подобный вывод ключа порога.
