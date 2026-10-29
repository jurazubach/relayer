---
name: story-plan
description: "Нужен план истории: сколько глав, где развилки и хребет, где паузы и платная граница, с чего начинать писать; сделай скелет до текста; сравни варианты плана; граф почти линейный или ветки разрослись; не хватает середины или опоры. План, skeleton.ink, проверка числами."
user-invocable: false
allowed-tools: Bash(npm run story*), Bash(npm run -s story*), Bash(node ${CLAUDE_SKILL_DIR}/scripts/*), Edit(src/stories/**), Edit(docs/stories/**)
metadata:
  version: 1
---

# story-plan — план и скелет истории до текста

Из ядра (D-NN «ядро vN») скилл делает 2–3 варианта плана (`skill.plan.variants`): таблицу глав в
`docs/stories/<id>/plans/plan-vN.md` и скелет всей истории `plans/skeleton-vN.ink` — по строке на сцену, настоящие
выборы, переменные, финалы с `// финал:`, паузы длиной в дело мира. Скелет — обычный ink: его проверяют `check:story`,
`story:lint --plan`, `story:endings`, `story:sessions`, а варианты сравниваются числами, не мнением модели. Здесь же —
порядок производства (скелет → главы 1–2 → тест → главы 3–N), расписание пауз в обоих режимах и место платной
границы. Автор выбирает; скилл предлагает, объясняет и применяет только одобренное.

**Команды — по одной на вызов, ровно как написаны:** без `cd`, пайпов, `;`, `&&`, `>`, `$?`. Составная команда
получает отказ в правах. Упала команда — «нет данных: <команда>», а не оценка на глаз.

## Границы

- **Вход:** ядро D-NN (`story-core`), просьба «план», «скелет», «сравни планы»; после теста или ревью — новая версия
  плана (Б-1); найденный ревью пропуск опоры (F-15).
- **Выход:** `plans/plan-vN.md` и `plans/skeleton-vN.ink`, сравнение `plan-compare.mjs`, активный `plans/skeleton.ink`
  после выбора; отвергнутые варианты — `idea-park.mjs`, строка для `STATUS.md` — через `story-desk`.
- **Не здесь:** ядро, ставка, оси — `story-core`; куда свернуть посреди работы и бюджет веток — `story-branch`; главы
  начисто — `chapter-write`; ревью скелета — `story-review --plan`; распределитель и видимость порога финала —
  `story-endings`; длина и режимы — `story-time`; крючки пауз — `story-pauses`; проверка границы перед выпуском —
  `story-release`; что устарело при смене плана — `story-desk`.

## Алгоритм

1. **Состояние.** `npm run story:status -- --all`, затем прочитай `docs/stories/<id>/STATUS.md` и `decisions.md`.
   Историю не угадывай — спроси. Нет ядра D-NN — сначала `story-core`. Шаг дальше `skeleton` — скажи, что новая
   версия плана сделает написанные главы устаревшими (`story-desk`).
2. **Рамка.** Длина по клику и в днях, жанр, роль игрока — из ядра. Число глав заранее не задаётся (A-08): его
   решает содержание, см. «Главные правила». Объём опор и глав по длине —
   [references/beats.md](references/beats.md) (R-10); какая структура — [references/decisions-structure.md](references/decisions-structure.md).
3. **Финалы первым.** Строкой «этот финал получает игрок, который…» и переменные, которые финал читает:
   [references/endings-plan.md](references/endings-plan.md), [references/process.md](references/process.md).
4. **Варианты.** 2–3 плана, разных по структуре: [references/structures.md](references/structures.md),
   [references/hubs.md](references/hubs.md); глава — по [references/chapter-formula.md](references/chapter-formula.md);
   паузы — [references/schedule.md](references/schedule.md); граница — [references/free-boundary.md](references/free-boundary.md).
   Запиши `plans/plan-vN.md` по [references/skeleton-format.md](references/skeleton-format.md).
   **Варианты в фоне — агент `story-architect`** (шаги 4–7 он делает сам и возвращает таблицу `plan-compare`).
   Задание ровно этими полями:
   ```
   история: <id>                ядро: D-NN (из STATUS.md)
   вариантов: 2 | 3             бесплатных глав: N (free_chapters из meta.json)
   рамка: минут по клику, дней, жанр — что сказал автор (или «—»); глав — по содержанию, если автор не назвал
   повод: новая история | новая версия плана после хода story-branch (D-NN хода) | Б-1 после теста
   ```
   После ответа: `core:` в его первой строке сверь с `ядро:` в `STATUS.md` (разошлись — варианты устарели, заново);
   находки сверь сам (шаг 7) и переходи к шагу 8 с его таблицей.
5. **Скелет.** Заготовка: `node ${CLAUDE_SKILL_DIR}/scripts/skeleton.mjs --new --story <id> --chapters <N>`. Прочитай
   `docs/style.md` §6 (кнопки) и §8 (время мира, паузы) прямо перед тем, как писать кнопки и строки-сцены; формы на ink —
   [references/patterns-structures.md](references/patterns-structures.md). Затем
   `node ${CLAUDE_SKILL_DIR}/scripts/skeleton.mjs --check --file docs/stories/<id>/plans/skeleton-vN.ink`.
6. **Замер.** Для каждого варианта `node ${CLAUDE_SKILL_DIR}/scripts/plan-check.mjs --file <скелет>` и
   `node ${CLAUDE_SKILL_DIR}/scripts/schedule.mjs --file <скелет>`; вместе —
   `node ${CLAUDE_SKILL_DIR}/scripts/plan-compare.mjs --story <id> --free <N>`. Все ✗ чини в скелете до показа.
7. **Сверка.** Каждую находку сверь с ink и правилом: узел, контекст, исключение — [references/flags.md](references/flags.md)
   (стык последней главы в C-38, переменная-кнопка последней главы, задуманный ранний финал). Ложное — вычеркни с причиной.
8. **Показ автору.** Таблица `plan-compare.mjs`, по варианту: опоры, финалы, цена, что трудно; совет с правилами по ID и
   вопрос с вариантами: «беру v2 / v2, но … / ещё вариант / объясни». Споры — [references/contradictions.md](references/contradictions.md).
9. **После выбора.** Выбранный скелет — копией в `plans/skeleton.ink`, затем `npm run story:lint -- --plan --story <id>`.
   Отвергнутые варианты — в банк скриптом `idea-park.mjs` скилла `story-desk`: `--story <id> --kind план --text "…"
   --why "<число из сравнения>" --when "<условие>" --from plans/plan-vN.md` (готовые строки даёт агент).
   Дальше `story-review --plan`, потом `chapter-write` главы 1–2. Пропуск опоры из ревью — приём
   [references/fixes/F-15-missing-beat.md](references/fixes/F-15-missing-beat.md).

## Карта references

| развилка | файл |
|---|---|
| какая структура, хребет, лоза, река, главы-эпизоды | [decisions-structure.md](references/decisions-structure.md) |
| каталог структур и цена; формы на ink и переходы | [structures.md](references/structures.md), [patterns-structures.md](references/patterns-structures.md) |
| хабы, модули, множество середин, линии A/B/C | [hubs.md](references/hubs.md) |
| формула главы, потеря, длина; опоры по длине | [chapter-formula.md](references/chapter-formula.md), [beats.md](references/beats.md) |
| порядок работы; формат плана и скелета | [process.md](references/process.md), [skeleton-format.md](references/skeleton-format.md) |
| паузы в двух режимах; финалы; граница | [schedule.md](references/schedule.md), [endings-plan.md](references/endings-plan.md), [free-boundary.md](references/free-boundary.md) |
| признаки → команда → правка; споры | [flags.md](references/flags.md), [contradictions.md](references/contradictions.md) |
| «объясни»: уроки, внимание, системы по шагам | [lessons.md](references/lessons.md), [attention.md](references/attention.md), [explain.md](references/explain.md), `references/systems/` |

## Главные правила

- **A-08** число глав — по содержанию, не заранее: глава ≈ один день мира или одна большая сцена с крючком на конце;
  пропорции и длину проверяют C-38 и `story:sessions`, 5 или 20 — решает план. Глава — единица автора: игрок не видит
  ни числа, ни номера, ни заголовка `#chapter`; стык для него — пауза персонажа, её держит последняя реплика.
- **R-09** порядок: шапка → план строкой на главу → финал → скелет всей истории → главы; глава 1 окончательно — после поздних.
- **R-10** опоры по длине (`skill.plan.beats`); полные схемы — проверка, а не рецепт.
- **R-25** хребет `skill.plan.spine.events`, ветки сходятся до конца главы; расходиться на финалы — в последней главе.
- **R-28** глава: событие, срок или угроза, развилка с переменной, удивление, раскрытие, крючок; передышки — C-38.
- **R-31** каждая глава отнимает опору; **R-33** потеря в предпоследней главе и тёмная ночь `skill.plan.dark_night_h`.
- **R-42** короткие главы: `skill.plan.chapter.buttons` кнопок, последняя не тоньше `C-38.thin`.
- **R-102, R-103** (у `story-endings`) финал — кнопка-ценность плюс накопленное, каждый с `// финал:`.
- **A-01, A-04, A-06** пауза без срока; скелет читается в обоих режимах; в ink только разметка `build-plan.md` §9.
- **Граница** (INTENT): на стыке глав, на сильном крючке, который сбывается сразу; платных выборов нет.

## Формат результата

Сначала находки по скелету — строго строкой, приоритет по `story-review/references/priority.md`:
`P2 · скучно · ch3 · в главе нет потери, ставка не растёт · строка «потеря» в плане (F-15) · [R-31 · модель · средняя]`.
Потом таблица `plan-compare.mjs`, по варианту — опоры, финалы («игрок, который…»), цена, что трудно; совет и вопрос.

## Состояние

План и скелеты скилл пишет сам в `docs/stories/<id>/plans/` (новая версия — новый файл); одобренную разметку
плана (`build-plan.md` §9: метки и `#chapter`) в главах `src/stories/<id>/` — тоже сам, реплики не трогает. Остальное — через
`story-desk` после одобрения автора (в конвейере — королевы): отчёт `docs/stories/<id>/reviews/<дата>-story-plan.md`
(находки и таблица сравнения); строка для `STATUS.md`: «план <дата>: v2 из 3, скелет ✓ plan-check, финалов K, граница
после гл.N — reviews/…»; поле `план:` и шаг `plan` → `skeleton`; отвергнутые варианты с причиной — в `ideas.md`.

## Готово, когда

Есть `plan-vN.md` и скелет к каждому варианту; `plan-check.mjs` ✓ у выбранного; автору показаны сравнение и вопрос;
выбранный скелет лежит в `plans/skeleton.ink`, `story:lint --plan` без ошибок; состояние передано `story-desk`.

## Объясни

По запросу «объясни»: **почему** (план до текста, хребет, финал первым — [references/explain.md](references/explain.md)),
**откуда** (`npm run story:rule R-NN`, `алиас:ID` из [references/sources.md](references/sources.md), класс урока из
`lessons.md`), **как самому** — упражнения из `explain.md` и системы по шагам в `references/systems/`.

Версия: 1
