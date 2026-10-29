---
name: story-brainstorm
description: "Есть идея — что из неё выйдет; накидай направлений; хочу историю про…, не знаю, с чего начать; поворот или твист для идеи; дай ещё варианты; всё не то, предложи другое. Из сырой идеи — 3–5 направлений: оси, логлайн, трудное для автора, трейлер в 5 сообщений с первой кнопкой, банк отвергнутых идей."
allowed-tools: Bash(npm run story*), Bash(npm run -s story*), Bash(node ${CLAUDE_SKILL_DIR}/scripts/*)
metadata:
  version: 1
---

# story-brainstorm — из сырой идеи в разные направления

Автор приносит фразу («девушка находит чужой телефон в такси»), скилл возвращает 3–5 направлений
(`skill.brainstorm.directions.count`), разных минимум по `skill.brainstorm.directions.axes_min_diff` осям из семи:
роль игрока, герой, ядро-правило, ставка, противник, структура, жанр. Генерация в два прохода: сначала таблица
осей, потом текст. У каждого направления — логлайн, «что трудно» словами автора (он не умеет строить сюжеты: цена
должна быть понятна) и трейлер — пять сообщений и первая кнопка на ink. Различие, форму логлайна и трейлер
считают скрипты, не модель на глаз. Всё вымышлено (R-117). Выбирает автор; скилл предлагает и объясняет.

**Команды — по одной на вызов, ровно как написаны:** без `cd`, пайпов, `;`, `&&`, `>`, `$?`. Составная команда
получает отказ в правах. Упала команда — «нет данных: <команда>».

## Границы

- **Вход:** сырая идея, «ещё», «всё не то», «сочетай B и D». История — по id (`docs/stories/<id>/`) или новая.
- **Выход:** раунд в `docs/stories/<id>/directions.md`, таблица и карточки автору, совет по сочетанию с
  критериями, вопрос с вариантами ответа; отвергнутое — в банк через `story-desk`.
- **Не здесь:** ядро выбранного направления, вопросы по ставке и противнику, логлайн в шапку — `story-core`;
  план и скелет — `story-plan`; куда свернуть посреди работы — `story-branch`; состояние, банк, решения —
  `story-desk`; начало уже написанной истории — `story-opening`; что говорит база — `story-kb`.

## Алгоритм

1. **Состояние.** Всегда, даже для новой идеи: `npm run story:status -- --all`, затем `docs/stories/<id>/STATUS.md`.
   Не знаешь, о какой истории речь, — спроси или предложи id (папку заводит `story-desk`). Шаг уже `core` и
   дальше — скажи: смена направления устаревает ядро и план (Б-5, `story-desk`).
2. **Что уже было.** `node ${CLAUDE_SKILL_DIR}/scripts/ideas-bank.mjs --query "<идея>"` — банк, раунды, каталог.
   Для «ещё» и Б-4: `node ${CLAUDE_SKILL_DIR}/scripts/directions.mjs --exclude --story <id>`.
3. **Режим и опись.** Развилка по словам автора — [references/decisions-rounds.md](references/decisions-rounds.md):
   первый, «ещё», «далеко» (Б-4: сначала вопрос по осям), сочетание. Что автор закрепил — не трогай; вымысел —
   [references/fiction.md](references/fiction.md).
4. **Проход 1 — таблица осей.** Метки семи осей для всех направлений сразу, без текста:
   [references/decisions-direction.md](references/decisions-direction.md), [references/diversity.md](references/diversity.md),
   повороты — [references/patterns-twists.md](references/patterns-twists.md). Запиши раунд в `directions.md` по
   [references/directions-format.md](references/directions-format.md) (шаблон —
   `node ${CLAUDE_SKILL_DIR}/scripts/directions.mjs --template`) и проверь:
   `node ${CLAUDE_SKILL_DIR}/scripts/directions.mjs --story <id> --axes` (без папки — `--file <путь>`). Текст не
   пиши, пока `--axes` не прошёл: перефразировки правятся на метках, а не на готовых трейлерах.
5. **Проход 2 — текст.** Логлайн и ядро-правило — [references/patterns-premise.md](references/patterns-premise.md);
   «что трудно» — таблица в `decisions-rounds.md`. Прочитай `docs/style.md` (§1, §6, §8) прямо перед тем, как
   писать трейлер, затем трейлер — [references/trailer.md](references/trailer.md). Теги только `ready`.
6. **Проверка формы.** `node ${CLAUDE_SKILL_DIR}/scripts/directions.mjs --story <id>` и
   `node ${CLAUDE_SKILL_DIR}/scripts/premise-check.mjs --directions <id>`. Каждое ✗ исправь; каждое ⚠ исправь или
   объясни автору одной строкой. Признаки — [references/flags.md](references/flags.md).
7. **Показ автору.** Формат ниже: таблица, карточки, трейлеры, совет по сочетанию через R-02, R-04, R-05, R-06
   (`decisions-rounds.md`), вопрос с вариантами: «беру A / ещё / всё не то — что мимо по осям / сочетать».
8. **После ответа.** Статусы в `directions.md` («выбрано», «отвергнуто: причина»). Отвергнутые — в банк, шаг
   `directions` в `STATUS.md` — через `story-desk`; выбранное — в `story-core`. «Ещё» и Б-4 — новый раунд с шага 2.

## Карта references

| развилка | файл |
|---|---|
| оси, какая решает; роль, герой, правило, жанр | [decisions-direction.md](references/decisions-direction.md) |
| режимы раунда, Б-4, «что трудно», совет по сочетанию | [decisions-rounds.md](references/decisions-rounds.md) |
| различие, два прохода, матрица, семейства инцидентов | [diversity.md](references/diversity.md) |
| правило, одно допущение, желание, жанровая карточка | [patterns-premise.md](references/patterns-premise.md) |
| повороты замысла: союзник, маска, ирония, призрак | [patterns-twists.md](references/patterns-twists.md) |
| трейлер на пять сообщений | [trailer.md](references/trailer.md) |
| что держит на рынке: содержание / форма | [market.md](references/market.md), [market-form.md](references/market-form.md) |
| вымысел, книги без заимствования | [fiction.md](references/fiction.md) |
| формат `directions.md` с примером раунда | [directions-format.md](references/directions-format.md) |
| признаки → команда → правка | [flags.md](references/flags.md) |
| «объясни»: уроки, споры, внимание, системы | [lessons.md](references/lessons.md), [contradictions.md](references/contradictions.md), [attention.md](references/attention.md), [explain.md](references/explain.md), `references/systems/` |

## Главные правила

- **R-04** ядро — 1–3 правила мира, «обычно…, а здесь…», не событие (`skill.brainstorm.rule.max_words`).
- **R-05** одно допущение; ставки растут внутри ядра, не новой силой.
- **R-06** (у `story-core`) герой — собеседник, у игрока малое своё желание и одна личная ставка.
- **R-02** (у `story-core`) логлайн «ты — X, пишет Y, но Z», до `story.logline.max_words` слов.
- **R-117** всё вымышлено: ни реальных компаний, людей, брендов, ни цифр настоящих инцидентов.
- **Различие** — по меткам осей, `skill.brainstorm.directions.axes_min_diff`; «ещё» не повторяет показанное.
- **Б-4** — не четвёртый набор тем же способом: вопрос по осям, `skill.brainstorm.directions.far_count` далёких.
- **Трейлер** — `skill.brainstorm.trailer.messages` сообщений до кнопки, без срока паузы (A-01), читается в обоих режимах.

## Формат результата

Сначала таблица раунда, потом по каждому направлению карточка, потом разговор:

```
| | название | роль игрока | герой | ядро-правило | ставка | противник | структура | жанр |
A · <название> — логлайн · что трудно: … · трейлер (ink) · проверка: directions.mjs ✓, premise-check ✓/⚠
Совет: A+C — R-02 ✓, R-04 ✓, R-05 ✗ (два чуда) → … · Вопрос: беру A / ещё / всё не то (что мимо?) / сочетать
```

## Состояние

Раунд скилл пишет сам в `docs/stories/<id>/directions.md` — это его рабочий файл. Остальное отдаёт `story-desk`
после одобрения автора (в конвейере — королевы): отвергнутые направления с причиной и «когда вернуться» в
`ideas.md` (`idea-park.mjs`); строку для `STATUS.md`: «направления <дата>: раунд N, показано K, выбрано X или
открыто, файл — directions.md»; шаг `directions`. Выбранное становится ядром только у `story-core` (D-NN).

## Готово, когда

Раунд записан; `directions.mjs` и `premise-check.mjs` без ✗; у каждого направления логлайн, «что трудно» и
трейлер; автору задан вопрос с вариантами; после ответа статусы проставлены, отвергнутое передано в банк.

## Объясни

По запросу «объясни»: **почему** (оси, правило, трейлер, цена — [references/explain.md](references/explain.md)),
**откуда** (`npm run story:rule R-NN`, `алиас:ID` из [references/sources.md](references/sources.md), класс урока
из `lessons.md`), **как самому** — упражнения из `explain.md`.

Версия: 1
