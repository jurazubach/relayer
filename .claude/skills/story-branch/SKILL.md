---
name: story-branch
description: "Граф почти линейный, сюжет идёт по одной дорожке; куда свернуть отсюда — поворот в точке написанной истории или плана; хочу ещё ветку или финал — потянем?; что может случиться после этой сцены. Ходы с влиянием на оси, финалы и чаты, ценой и бюджетом дорогих веток; после решения — новый план."
allowed-tools: Bash(npm run story*), Bash(npm run -s story*), Bash(node ${CLAUDE_SKILL_DIR}/scripts/*)
metadata:
  version: 1
---

# story-branch — куда свернуть

В любой точке истории (план, скелет или готовая глава) скилл предлагает **3–5 ходов разного вида** —
развилка, поворот, ложный след, отказ, молчание — и у каждого показывает **влияние** (оси, финалы, состав
чатов), **цену** в тексте и видимости и место в **бюджете дорогих веток**. Числа — только из команд, пороги —
ключами `docs/playbook/thresholds.json`. Автор выбирает; после решения — новая версия плана, прогон скелета,
запись D-NN через `story-desk`. Текст истории сам не правит: набросок ink в ответе, применяет `story-fix`.

**Команды — по одной на вызов, ровно как написаны:** без `cd`, пайпов, `;`, `&&`, `>`, `$?`, `| head`.
Длинный вывод — `--chapter`, `--node`, `--expensive`. Упала команда — «нет данных: <команда>», не угадывай.

## Границы

- **Вход:** история `src/stories/<id>/` или скелет `docs/stories/<id>/plans/skeleton.ink`; фраза автора
  «куда свернуть», «граф линейный», «ещё ветку»; вызов `story-core`, `story-plan` или главной сессии.
- **Выход:** меню вариантов с картами влияния и ценой, рекомендация; после выбора — `plans/plan-vN.md`,
  текст D-NN и отвергнутое для банка идей (пишет `story-desk`).
- **Не здесь:** пустые кнопки, эхо, молчание, хабы в готовой главе — `story-choices`; порог финала,
  распределитель, число финалов — `story-endings`; каталог структур и скелет всей истории — `story-plan`;
  поворот замысла — `story-brainstorm` (TH-04); честность загадки и порядок раскрытий — `story-mystery`;
  новый контакт и состав — `story-cast`; ось и ядро — `story-core`; применить правку — `story-fix`;
  запись в состояние — `story-desk`.

## Алгоритм

1. **Состояние.** Прочитай `docs/stories/<id>/STATUS.md`: шаг, ядро, план. Не знаешь, о какой истории речь, —
   спроси. Шаг до ядра (`idea`, `directions`) — скажи, что сначала `story-core`. Нет папки — работай по
   `src/stories/<id>/` и отметь «вне цикла». Есть `plans/skeleton.ink` — меряй его, а не главы.
2. **Карта сейчас.** `node ${CLAUDE_SKILL_DIR}/scripts/branch-budget.mjs --story <id|путь к скелету>` —
   дорогие развилки против бюджета (тот же счёт печатает `plan-check` у `story-plan`; на скелете ветка дорогая от
   `story.branch.expensive.skeleton_lines` строк-сцен), развилки по главам, доля текста, веер, редкие. Затем
   `npm run -s story:endings -- --story <id>` и `npm run -s story:vars -- --story <id>`. Граф линейный — ещё
   `npm run -s story:lint -- --story <id> --only C-05,C-10,C-11,C-15,C-25` (C-25 — измерение 2).
3. **Точка.** `node ${CLAUDE_SKILL_DIR}/scripts/branch-impact.mjs --story <id> --node <узел>` — что сейчас
   меняет каждая кнопка. Точки нет — предложи 2–3 по `branch-budget.mjs` (главы из одних окрасок, веер,
   редкая дорогая) и [references/flags.md](references/flags.md).
4. **Ходы.** Вид хода — [references/decisions-branch.md](references/decisions-branch.md); провал, воронка,
   подтверждение — [references/decisions-failure.md](references/decisions-failure.md); форма — карта ниже.
   Набери 3–5 ходов разного вида: хотя бы один дешёвый (R-26) и один, что меняет финалы или чаты.
5. **Цена.** Для каждого дорогого хода оцени сообщения своей области и запусти
   `node ${CLAUDE_SKILL_DIR}/scripts/branch-budget.mjs --story <id> --add <N>`. Бюджет исчерпан — дорогой ход
   только вместо названной ветки ([references/budget.md](references/budget.md), [references/costs.md](references/costs.md)).
6. **Сверка.** Каждый ход сверь с правилом (`npm run -s story:rule R-NN`) и полем «Когда не работает» его
   записи; ход, который ведёт в ранний `END` или делает одну кнопку правильной, — убери.
7. **Меню.** Перед наброском реплик и кнопок прочитай `docs/style.md` (§1, §6, §10). Карточки по
   [references/menu.md](references/menu.md): вид, что меняет, цена, для кого, где ломается, набросок ink
   (теги только `ready`). Затем рекомендация. Автор отверг всё — Б-4 там же.
8. **После решения.** [references/plan-update.md](references/plan-update.md): `plans/plan-vN.md`, скелет —
   `story-plan`, прогон `branch-budget.mjs` и `story:endings` на скелете, D-NN и банк идей — через `story-desk`.

## Карта references

| развилка | файл |
|---|---|
| какой ход: развилка, поворот, ложный след, отказ, молчание | [decisions-branch.md](references/decisions-branch.md) |
| провал, воронка, подтверждение, откат | [decisions-failure.md](references/decisions-failure.md) |
| форма развилки: кусты, горлышко, рука и пальцы, мотив, проверка | [patterns-branch.md](references/patterns-branch.md) |
| по очкам, колея, лестница, сделка, петля | [patterns-pressure.md](references/patterns-pressure.md) |
| отказ, порог, страж, кнопка ухода | [patterns-refusal.md](references/patterns-refusal.md) |
| поворот и раскрытие как ход (владельцы — соседи) | [patterns-reveal.md](references/patterns-reveal.md) |
| цена в тексте и видимости, бюджет | [costs.md](references/costs.md), [budget.md](references/budget.md) |
| меню, Б-4; после решения | [menu.md](references/menu.md), [plan-update.md](references/plan-update.md) |
| признак → команда → ход | [flags.md](references/flags.md) |
| «объясни»: споры, уроки, внимание, системы | [contradictions.md](references/contradictions.md), [lessons.md](references/lessons.md), [attention.md](references/attention.md), [explain.md](references/explain.md), `references/systems/` |

## Главные правила

- **R-26** вариативность — состоянием, а не узлами; дорогие ветки в бюджете `story.branch.budget.min`…`story.branch.budget.max`.
- **R-37** главное — на видном пути; доля текста за прохождение в коридоре `story.branch.seen_share.*`.
- **R-32** плохой исход ведёт дальше, в изменённый мир; конец — только в последней главе.
- **R-38** петля — на `+` с выходом по условию, второй заход — новая реплика.
- Меню — ходы разного вида, у каждого влияние, цена и «когда не работает» (`INTENT.md`: ИИ предлагает и объясняет).
- Отказ и молчание — ходы с ценой и следом, иначе фальшивые (C-11 у `story-choices`).
- Числа о существующем — из команд; о ненаписанном — оценка с пометкой.

## Формат результата

Если автор просил найти, где ветвить, — сначала находки строкой (приоритет — по
`story-review/references/priority.md`):

```
P2 · скучно · ch3_dock · глава из одних окрасок, дорогих 0 из 3…5 · ход «память» или горлышко с осадком · [C-05 · замер · высокая]
```

Затем меню карточками ([references/menu.md](references/menu.md)), рекомендация и что будет после решения.
Приёмов F-NN у скилла нет: правку ink делает `story-fix` приёмом владельца.

## Состояние

Сам в состояние не пишет — отдаёт `story-desk` после одобрения (в конвейере — королевы): отчёт
`docs/stories/<id>/reviews/<дата>-story-branch.md` (меню, замеры, выбранный ход), строку для `STATUS.md`
(«развилка <узел>: выбран <вид>, план → plans/plan-vN.md, бюджет N из M»), D-NN вида «ветка» и отвергнутые
ходы в `ideas.md`.

## Готово, когда

Меню из 3–5 ходов разного вида с числами из команд; автор выбрал; есть `plans/plan-vN.md`, прогон скелета
и текст D-NN, отвергнутое передано в банк идей.

## Объясни

По запросу «объясни»: почему так (что почувствует игрок), откуда (`npm run -s story:rule R-NN`, `алиас:ID` из
[references/sources.md](references/sources.md)), как сделать самому — упражнение в [references/explain.md](references/explain.md).

Версия: 1
