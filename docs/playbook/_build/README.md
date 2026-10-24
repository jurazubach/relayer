# Конвейер сборки скиллов и агентов

Строит по плану `docs/playbook/build-plan.md` (версия 3) 21 скилл, 4 агента, инструменты `story:*`, `docs/style.md`, фичи движка и эксперименты. Всего 63 задачи в 7 волнах. Живых тестов и утверждения стиля в этом проходе нет: их заменяют симуляция и стиль, изобретённый из базы (ориентир — Lifeline). Работает без автора: механику ведёт `run.mjs`, курс держит королева — сессия Claude Code с промптом `QUEEN.md`.

## Как запустить

1. Закоммить файлы конвейера в `master`, если они ещё не закоммичены. Ветка `build/main` создаётся от `master`.
2. В сессии Claude Code (основной тред) напиши:

   > Прочитай `docs/playbook/_build/QUEEN.md` и выполняй. Ты королева конвейера.

Дальше она сама запустит `run.mjs` в фоне, поставит надзор и поведёт конвейер до конца. Компьютер не должен засыпать.

Без королевы (только механика): `node docs/playbook/_build/run.mjs`. На итогах волн он встанет на паузу и будет ждать, пока кто-то прочитает отчёт и снимет паузу.

## Как устроена задача

```
worktree .worktrees/<id> (ветка build/t/<id> от build/main)
  → сборщик (prompts/builder.md + type-<тип>.md)
  → приёмка: команды из tasks.json (сборка, check:story, e2e, story:lint, проверки скилла…)
  → ревьюер (prompts/reviewer.md): правит мелкое, крупное возвращает
  → приёмка
  → сверка с замыслом (prompts/align.md): INTENT.md и план
  → приёмка
  → слияние в build/main; конфликт решает разрешитель (prompts/resolver.md)
```

- **Провал** на любом шаге — повтор с замечаниями, до 3 попыток, потом `INBOX.md`.
- **Итог волны** (`W0` … `W5`, `F-final`) — полный набор проверок на `build/main` и ревью волны (`prompts/checkpoint.md`), затем пауза для королевы.
- **Агенты** — `claude -p --model claude-opus-5-5`, у каждого свой worktree. Сторож останавливает агента, который молчит 25 минут. При исчерпании лимитов конвейер встаёт на паузу.
- **Параллельно** идут до 4 задач (`runtime/control.json` → `maxParallel`). Задачи с пересекающимися путями записи не идут одновременно. E2e и тест срабатывания идут по одному.
- **`master` не трогается.** Всё сливается в `build/main`, её рабочая копия — `.worktrees/_main`.

## Файлы

| файл | что |
|---|---|
| `INTENT.md` | замысел и решения автора — эталон для сверки |
| `QUEEN.md` | стартовый промпт королевы |
| `tasks.json` | граф задач: волна, тип, зависимости, пути записи, задание, команды приёмки |
| `prompts/*.md` | роли: сборщик (+ по типам), ревьюер, сверка, разрешитель, итог волны |
| `checks/skill-check.mjs`, `checks/agent-check.mjs` | приёмка скиллов и агентов по контракту плана |
| `run.mjs` | запускалка |
| `reports/<id>/` | отчёты задач: `build.md`, `review.md`, `align.md`, `checkpoint.md` (в `build/main`) |
| `runtime/` | не в git: `state.json`, `control.json`, `events.log`, `STATUS.md`, `INBOX.md`, `QUEEN-LOG.md`, `logs/` |

## Команды

```bash
node docs/playbook/_build/run.mjs --status                    # таблица состояния (и runtime/STATUS.md)
node docs/playbook/_build/run.mjs --dry                       # что готово к запуску
node docs/playbook/_build/run.mjs --pause                     # пауза
node docs/playbook/_build/run.mjs --resume                    # продолжить
node docs/playbook/_build/run.mjs --note T-01 "замечание"     # подсказка исполнителю на следующую попытку
node docs/playbook/_build/run.mjs --reset T-01                # вернуть задачу в очередь
node docs/playbook/_build/run.mjs --finish T-01               # без сборки: приёмка → ревью → сверка → слияние
node docs/playbook/_build/run.mjs --merge T-01                # приёмка и слияние после ручной доработки
node docs/playbook/_build/run.mjs --skip T-01 | --done T-01   # пометить вручную
node docs/playbook/_build/run.mjs --print-prompt T-01 builder # готовый промпт (запасной путь)
```

В `runtime/control.json` можно на лету поменять `maxParallel` и `until`, то есть до какой волны идти. `tasks.json` и промпты перечитываются перед каждым запуском задачи.

## После конвейера

- Итог — `docs/playbook/_build/FINAL.md` в `build/main`.
- Посмотреть: `git log build/main`, `git diff master...build/main`, папка `.worktrees/_main`.
- Слить в `master` — решение автора: пуш в `master` выкладывает Pages.
- Что ждёт человека — `runtime/INBOX.md` и живые тесты, когда автор захочет (`story-playtest`).
