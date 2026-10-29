---
name: story-core
description: "Непонятно, о чём история: что на кону и к какому сроку, какой главный вопрос, кто противник и чего хочет, зачем пишут игроку, о чём тема; конфликт размытый, злодей картонный, герой ничего не хочет; запиши ядро в шапку. Ядро до плана: ставка, вопрос, оси, роль игрока, противник, тема, время мира."
user-invocable: false
allowed-tools: Bash(npm run story*), Bash(npm run -s story*), Bash(node ${CLAUDE_SKILL_DIR}/scripts/*), Edit(src/stories/**), Edit(docs/stories/**)
metadata:
  version: 1
---

# story-core — ядро истории до плана

Ядро — то, на чём держится каждая сцена: **ставка с лицом и сроком мира, один главный вопрос, 2–3 оси-переменные,
роль игрока с маленьким своим желанием, противник за ту же вещь с контрпланом, тема парой полюсов, время мира
по главам, состав с позицией каждого по вопросу**. Автор сюжеты строить не умеет: скилл не спрашивает «какая
ставка?», а даёт 2–3 варианта с ценой каждого и рекомендацией. Записывает только одобренное — D-NN «ядро vN».
Числа — только из команд, пороги — ключами `docs/playbook/thresholds.json`.

**Команды — по одной на вызов, ровно как написаны:** без `cd`, пайпов, `;`, `&&`, `>`, `$?`. Упала команда —
«нет данных: <команда>», не угадывай.

## Границы

- **Вход:** выбранное направление (`directions.md`, статус «выбрано», от `story-brainstorm`; или D-NN «направление») или
  сырая идея автора; возврат к ядру посреди работы (Б-5); вызов `story-plan` / `story-branch`, когда план упёрся в ядро.
- **Выход:** черновик ядра → вопросы автору с вариантами → одобренное D-NN «ядро vN» в `decisions.md`, шапка ink
  из 4 строк, карточки `characters`, календарь мира. Дальше — `story-plan` и агент `story-architect`.
- **Не здесь:** направления из сырой идеи и банк идей — `story-brainstorm`; скелет и структура — `story-plan`;
  улики и порядок раскрытий — `story-mystery` (`clue-map.md`); голоса — `story-voice`; уровни контактов, дуги
  и поля карточки — `story-cast`; правила паузы, напоминаний и часов игрока — `story-time`; распределитель
  финалов — `story-endings`; запись шага и что устарело при смене ядра — `story-desk`.

## Алгоритм

1. **Состояние.** Прочитай `docs/stories/<id>/STATUS.md`, `directions.md` (направление со статусом «выбрано») и
   `decisions.md` (прежнее ядро). Не знаешь, о какой истории речь, — спроси. Шаг дальше `core` — это возврат к ядру: скажи, что после записи
   `story-desk` покажет устаревшее. Папки нет — её заводит `story-desk`.
2. **Что уже решено:** `node ${CLAUDE_SKILL_DIR}/scripts/core-check.mjs --story <id>` — поля ядра, пустые,
   формальные признаки, шапка ink против D-NN. Порядок развилок — [references/systems/core-pass.md](references/systems/core-pass.md).
3. **Развилки по порядку, вопросы с вариантами** ([references/questions.md](references/questions.md)):
   роль игрока → [player-role.md](references/player-role.md); ставка, лицо, срок, главный вопрос →
   [decisions-stakes.md](references/decisions-stakes.md); противник и контрплан → [antagonist.md](references/antagonist.md);
   тема и вера героя → [theme.md](references/theme.md); оси → [axes.md](references/axes.md); время мира →
   [time-model.md](references/time-model.md); состав → [cast-core.md](references/cast-core.md); логлайн →
   [logline.md](references/logline.md). На каждый вопрос — 2–3 варианта, цена, рекомендация.
4. **Скрытая правда.** Если ответ на главный вопрос кто-то прячет (виновник, обман, подмена) — вызови
   `story-mystery` за картой улик до плана; правда — в `facts.md` (`story-continuity`), не в ядро.
5. **Проверка черновика.** Запиши черновик в `docs/stories/<id>/core-draft.md` (формат —
   [references/header.md](references/header.md)) и прогони `node ${CLAUDE_SKILL_DIR}/scripts/core-check.mjs --story <id> --draft docs/stories/<id>/core-draft.md`,
   затем `node ${CLAUDE_SKILL_DIR}/scripts/world-clock.mjs --story <id> --draft docs/stories/<id>/core-draft.md`.
   Каждое предупреждение сверь с правилом (`npm run -s story:rule R-NN`): чини или объясни, почему не нужно.
6. **Примеры словами персонажей.** Прочитай `docs/style.md` прямо перед тем, как писать реплику, трейлер,
   кнопку или пример ink для автора. Примеры — выдуманные, теги — только `ready`.
7. **Запись после одобрения:** `node ${CLAUDE_SKILL_DIR}/scripts/core-snapshot.mjs --story <id> --draft docs/stories/<id>/core-draft.md --who <кто>`
   (показ), затем тот же вызов с `--write`. Он пишет D-NN через `story-desk`, ставит «ядро: D-NN» в `STATUS.md`
   и печатает шапку ink. Смена ядра — `--replaces D-NN`; шаг `core` и «что устарело» — у `story-desk`.
8. **Передача.** Одобренную шапку впиши сам (`Edit`) в `src/stories/<id>/story.ink` или `plans/skeleton.ink`:
   только четыре строки шапки, реплики и узлы не трогай; карточки — в `characters` (`story-cast`);
   дальше `story-plan`. Если ink уже есть — `core-check.mjs` ещё раз: шапка совпадает с D-NN.

## Карта references

| развилка | файл |
|---|---|
| порядок ядра, что без шага | [systems/core-pass.md](references/systems/core-pass.md) |
| вопросы автору с вариантами | [questions.md](references/questions.md) |
| ставка, лицо, срок, подъём, главный вопрос | [decisions-stakes.md](references/decisions-stakes.md), [patterns-stakes.md](references/patterns-stakes.md) |
| роль игрока, «почему тебе» | [player-role.md](references/player-role.md) |
| противник, контрплан, зеркало | [antagonist.md](references/antagonist.md) |
| тема, ценность, вера героя | [theme.md](references/theme.md) |
| оси-переменные, счётчики | [axes.md](references/axes.md), [patterns-axes.md](references/patterns-axes.md) |
| время мира, два режима | [time-model.md](references/time-model.md) |
| состав и карточки на этапе ядра | [cast-core.md](references/cast-core.md) |
| логлайн; шапка ink и формат записи | [logline.md](references/logline.md), [header.md](references/header.md) |
| признак → команда → правка | [flags.md](references/flags.md) |
| системы авторов | `references/systems/` |
| «объясни»: уроки, споры, внимание | [lessons.md](references/lessons.md), [contradictions.md](references/contradictions.md), [attention.md](references/attention.md), [explain.md](references/explain.md) |

## Главные правила

- **R-01** шапка ink — 4 строки (логлайн, вопрос, ставка, оси); остальное ядро — в D-NN, не в ink (A-06).
- **R-02** логлайн «ты — X, тебе пишет Y, но Z»; без «но» истории нет.
- **R-03** один главный вопрос; каждая глава добавляет к ответу, каждый финал отвечает.
- **R-06** герой — собеседник; у роли игрока маленькое своё желание и не больше одного личного риска.
- **R-07** у героя одна вера, которая мешает; в каждой главе кнопка давит на неё.
- **R-08** у большой ставки есть лицо в списке чатов; срок — время мира (A-02), не часы игрока.
- **R-39, R-41** мало переменных, раздельные растущие счётчики; оси — в пределах `attn.state.axes`.
- **R-84** противник хочет той же вещи, пишет сам и ломает план игрока своим контрпланом.

## Формат результата

Сначала ядро одним блоком полей (как в [header.md](references/header.md)), под ним — открытые развилки:

```
развилка · вариант А / Б / В · цена каждого · рекомендация · [R-NN · замер|модель · уверенность]
```

Потом разговорный текст: почему так, что поменяется в плане. Предупреждения `core-check.mjs` — строкой
`P2 · непонятно · ядро · симптом · правка · [R-NN · замер · высокая]` по `story-review/references/priority.md`.
Решение не принято — оно в «Открытых вопросах», а не в ядре.

## Состояние

`story-core` пишет только D-NN ядра (через `core-snapshot.mjs` → `decision-add.mjs`), черновик ядра
`docs/stories/<id>/core-draft.md` и шапку ink из одобренного D-NN — и только после одобрения автора (в конвейере —
королевы). Остальное отдаёт `story-desk`: строку для `STATUS.md` («ядро vN <дата>: D-NN,
открыто — …»), шаг `core`, отвергнутые варианты ставки, противника и темы — в `ideas.md` с причиной.

## Готово, когда

`core-check.mjs` — 0 нерешённых, предупреждения починены или объяснены; `world-clock.mjs` без скачков,
которых не уложить; скрытая правда передана `story-mystery`; D-NN записан и шапка ink совпадает с ним.

## Объясни

По запросу «объясни»: **почему** (что почувствует игрок), **откуда** (`npm run -s story:rule R-NN`, `алиас:ID`
из [references/sources.md](references/sources.md), класс урока), **как сделать самому** — упражнение из
[references/explain.md](references/explain.md).

Версия: 1
