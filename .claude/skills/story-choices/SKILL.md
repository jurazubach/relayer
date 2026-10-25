---
name: story-choices
description: "Выбор не ощущается: кнопки ничего не меняют, на все варианты один ответ, «Промолчать» никто не замечает, игрок не помнит, что выбирал, выбор очевиден или предрешён, ветки сходятся и всё забывают, хаб утомляет. Аудит кнопок, молчания, переменных и эха, цены, выбора между людьми."
user-invocable: false
allowed-tools: Bash(npm run story:*), Bash(npm run -s story:*), Bash(node ${CLAUDE_SKILL_DIR}/scripts/*)
metadata:
  version: 1
---

# story-choices — чтобы выбор ощущался

Выбор ощущается, когда у кнопки **свой ответ**, у решения **память** (игрок потом узнаёт «это потому, что я
тогда…») и **цена**, видимая до нажатия. Скилл находит, где этого нет, числами из команд, и предлагает
правку приёмами F-07, F-08, F-11, F-14. Числа — только из команд; пороги — ключами `docs/playbook/thresholds.json`.
Правку не применяет сам: предлагает варианты, применяет `story-fix` после одобрения.

## Границы

- **Вход:** история `src/stories/<id>/` (или папка/`.json`), симптом автора или вызов `story-review`.
- **Выход:** находки в общем формате, варианты правки с приёмом, режим «объясни».
- **Не здесь:** финал, распределитель и скрытый порог — `story-endings` (F-09, F-10); куда свернуть сюжет —
  `story-branch`; «не ответил» и напоминания — `story-time` (`#silent` — здесь); состав и уровни контактов —
  `story-cast`; род игрока и голос — `story-voice` (C-14); слияния и факт из другого чата — `story-continuity`
  (F-13, R-35, R-55); хаб вместо скучного коридора — `story-pace` (F-06); оси и число переменных — `story-core`
  (R-39, R-41); применить правку — `story-fix`.

## Алгоритм

1. **Состояние.** Прочитай `docs/stories/<id>/STATUS.md`; если правишь или предлагаешь текст — `docs/style.md`.
   Не знаешь, о какой истории речь, — спроси. Если шаг истории не тот (идея, ядро без скелета), скажи об этом.
   Нет `STATUS.md` (история вне цикла, мутант) — работай без него и отметь это.
2. **Замер.** `npm run story:lint -- --story <id> --only C-01,C-02,C-03,C-04,C-05,C-08,C-09,C-10,C-11,C-12,C-13,C-15,C-16,C-17,C-18,C-19 --json`
   (для папки вне каталога — путь вместо id). Упала команда — пиши «нет данных: <команда>», не угадывай.
3. **Профиль кнопок:** `node ${CLAUDE_SKILL_DIR}/scripts/choices.mjs --story <id>` — классы кнопок по главам,
   ширина, молчание и отказы, хабы. Развилки «какой тип где» — [references/decisions-choices.md](references/decisions-choices.md),
   [references/choice-types.md](references/choice-types.md), [references/buttons.md](references/buttons.md).
4. **Память:** `node ${CLAUDE_SKILL_DIR}/scripts/echo-map.mjs --story <id>` — запись → видимое чтение, дальность,
   «только финал». Читай [references/echo.md](references/echo.md), [references/echo-checks.md](references/echo-checks.md).
5. **Цена и люди:** `node ${CLAUDE_SKILL_DIR}/scripts/position-bias.mjs --story <id>` (финал по позиции кнопки) и
   `node ${CLAUDE_SKILL_DIR}/scripts/people-balance.mjs --story <id>` (знакомство перед выбором между людьми).
   Читай [references/cost.md](references/cost.md), [references/people-choice.md](references/people-choice.md).
6. **Молчание и хабы** — [references/silence.md](references/silence.md), [references/hubs.md](references/hubs.md);
   признаки — [references/flags.md](references/flags.md), [references/flags-echo.md](references/flags-echo.md).
7. **Суждение модели** только там, где замер молчит: одинаковый тон ответов, слабая цена, ответ не совпадает с
   кнопкой. Помечай «модель» и уверенность. Ложное срабатывание — предложи `// намеренно: C-NN причина`.
8. **Правка.** Симптом → приём по таблице [references/decisions-choices.md](references/decisions-choices.md):
   пустая кнопка → [references/fixes/F-07-live-button.md](references/fixes/F-07-live-button.md); молчащая
   переменная → [references/fixes/F-08-echo.md](references/fixes/F-08-echo.md); коридор →
   [references/fixes/F-11-bottleneck.md](references/fixes/F-11-bottleneck.md); тихий провал →
   [references/fixes/F-14-menace.md](references/fixes/F-14-menace.md). Два-три варианта, пример ink с тегами `ready`.
9. **Отчёт** — находки по приоритету, затем варианты правки и «объясни» по запросу.

## Главные правила

- **R-43** у каждой кнопки свой ответ; одинаковый ответ — это `#me` (C-10, C-13).
- **R-44** окраска законна только с откликом на тон (C-10 `C-10.cosmetic_chapter`, `C-10.bodyless_chapter`).
- **R-40** каждая переменная читается видимо, не позже следующей главы (C-01…C-05).
- **R-47, R-48** цена названа до кнопки, очевидно лучшего варианта нет (C-08, C-16, C-18).
- **R-52, R-53** `#silent` и отказ — полноценные ходы с реакцией и следом (C-11); «не ответил» не дороже `#silent` (A-03).
- **R-49** решающий выбор — между двумя, кого игрок любит, с равным знакомством (C-17).
- **R-45, R-46** две-три кнопки, короткая реплика одной формы (C-12, C-13).
- **R-34, R-36, R-58** хаб с выходом и наградой ходом, разговор не анкета (C-19).
- Споры источников — [references/contradictions.md](references/contradictions.md); внимание —
  [references/attention.md](references/attention.md).

## Формат находки

```
P1 · непонятно · <узел> · симптом · правка (F-NN) · [C-NN · замер|модель|человек · уверенность]
```

P1 — ломает ощущение выбора в ключевой развилке; P2 — заметно в главе; P3 — шлифовка. Тип: непонятно /
скучно / не верю / нестыковка / баг. Находка, отклонённая автором, не всплывает, пока не изменится узел.
Если вызывающий просит JSON — те же поля: `node`, `check`, `summary`.

## Готово, когда

Все находки замера разобраны: правка с приёмом, `// намеренно:` или «отклонено» с причиной; у каждой
предложенной правки — до/после на ink и перезапуск замера.

## Объясни

По запросу «объясни» к находке: **почему** (что почувствует игрок), **откуда** (`npm run story:rule R-NN`,
`алиас:ID` из [references/sources.md](references/sources.md), класс урока из [references/lessons.md](references/lessons.md)),
**как сделать самому** — упражнение из [references/explain.md](references/explain.md). Авторские системы —
`references/systems/`, приёмы с ink — `references/patterns-*.md`.

Версия: 1
