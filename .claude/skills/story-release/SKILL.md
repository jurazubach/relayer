---
name: story-release
description: "Можно выпускать? Проверь перед выпуском: линт, тест, готовность; карточка и затравки не спойлерят и не врут, два времени честные; платная граница на крючке и не тёмный паттерн; поднять ли ревизию после правки; собери .json для загрузки тестерам."
allowed-tools: Bash(npm run story*), Bash(npm run -s story*), Bash(node ${CLAUDE_SKILL_DIR}/scripts/*), Edit(src/stories/*/meta.json)
metadata:
  version: 1
---

# story-release — гейт выпуска: готово, честно, не ломает

`story-release` решает, можно ли выпускать историю, и показывает почему — пункт за пунктом, каждый командой.
**Готово ли:** все главы, `story:lint` без ошибок, вторая волна теста. **Честно ли:** карточка и затравки без
спойлеров и вранья (C-49, R-11), два времени (A-05), платная граница на сильном крючке с выплатой сразу
(INTENT), этика и монетизация (R-115, [ethics.md](references/ethics.md) — единственный источник). **Не ломает
ли:** ревизия и сохранения, файл `story:pack`. Скилл не правит текст: даёт вердикт, находки и варианты; правит
`story-fix`, состояние пишет `story-desk`. Сам — только `meta.json` по одобрению (`revision`, минуты и дни карточки).
Числа — только из команд, пороги — ключами `docs/playbook/thresholds.json`.

**Команды — по одной на вызов, ровно как написаны:** без `cd`, пайпов, `;`, `&&`, `>`, `$?`, `| head`.
Составная команда получает отказ в правах. Упала команда — «нет данных: <команда>», не угадывай.

## Границы

- **Вход:** «можно выпускать?», «проверь перед выпуском», «подготовь карточку», «где поставить платную
  границу», «поднять ли ревизию», «собери файл для загрузки»; история в `src/stories/<id>/` или путь к папке.
- **Выход:** вердикт гейта (можно / после решений / нельзя), находки строкой формата, предложения для
  `meta.json` (два времени, затравки, карточка), отчёт и строка для `STATUS.md`.
- **Не здесь:** ставит границу в плане — `story-plan`; длина, паузы, напоминания, C-31 — `story-time`; финалы и
  их разметка — `story-endings`; крючки и стыки глав (C-26, C-39) — `story-pauses`; волна теста — `story-playtest`;
  таблица фактов `facts.md` (C-49 (г)) — `story-continuity`; ревью целиком — `story-review`; правка текста —
  `story-fix`; запись решений и шага — `story-desk`.

## Алгоритм

1. **Состояние.** Прочитай `docs/stories/<id>/STATUS.md`. Не знаешь, о какой истории речь, — спроси. Шаг не
   `playtest:wave2` и не `release` — скажи сразу: выпуск раньше цикла ([decisions-release.md](references/decisions-release.md)).
2. **Гейт целиком.** `node ${CLAUDE_SKILL_DIR}/scripts/release-gate.mjs <id>` — шаг, главы, линт, этика, тест,
   карточка, граница, ревизия, файл ([systems/release-gate.md](references/systems/release-gate.md)). История вне
   каталога без состояния — `--skip шаг,тест`.
3. **Готовность.** ✗ в «главы», «линт», «тест» — дальше только отчёт: что довести и чьим скиллом. Ошибки линта —
   `npm run -s story:lint -- --story <id>`, владелец — в строке находки. Развилки — [decisions-release.md](references/decisions-release.md).
4. **Карточка.** `node ${CLAUDE_SKILL_DIR}/scripts/card-check.mjs --story <id>` — C-49 по пунктам (а)…(з), счёт
   глав и героев; `node ${CLAUDE_SKILL_DIR}/scripts/durations.mjs --story <id>` — два времени. Читай
   [card.md](references/card.md), [teasers.md](references/teasers.md), [two-durations.md](references/two-durations.md).
   Предлагаешь `tagline`, `synopsis` или затравку — прочитай `docs/style.md` (§3, §11) прямо перед тем, как писать.
5. **Граница.** Есть `free_chapters` или автор спрашивает, где её ставить, —
   `node ${CLAUDE_SKILL_DIR}/scripts/boundary-check.mjs --story <id>` (примерить — `--free N`). Читай
   [free-boundary-gate.md](references/free-boundary-gate.md); пример ink — [patterns-release.md](references/patterns-release.md).
6. **Этика.** Семь вопросов [ethics.md](references/ethics.md): строка «этика» гейта (C-27, C-32, C-37, C-47) плюс
   продажа паузы, платный выбор, наказание бесплатного пути. Спор «так можно?» — [attention.md](references/attention.md),
   классификация — [systems/dark-patterns.md](references/systems/dark-patterns.md).
7. **Ревизия и файл.** `node ${CLAUDE_SKILL_DIR}/scripts/revision-check.mjs --story <id>` — ломает ли правка
   сохранения ([versioning.md](references/versioning.md)); ✗ — `revision` +1 только по одобрению;
   `node ${CLAUDE_SKILL_DIR}/scripts/pack.mjs <id>` — `story:pack --check`. Собрать файл (`--write`) и поставить тег —
   только после одобрения.
8. **Сверка.** Каждую находку замера сверь с ink и правилом (`npm run -s story:rule C-NN`): узел, контекст,
   исключения («когда не работает» в references). Ложная — в отчёт с причиной, не в находки (LOCAL-04).
9. **Отчёт и состояние.** Вердикт, находки, варианты («советую»), режим «объясни» по запросу; предложи
   `story-desk` записать (раздел «Состояние»). Пуш в `master` — не здесь: это деплой, его делает автор.

## Карта references

| развилка | файл |
|---|---|
| что делать с пунктом гейта, где ставить границу, поднимать ли ревизию | [decisions-release.md](references/decisions-release.md) |
| карточка: R-11, C-49, роль игрока, тяжёлые темы | [card.md](references/card.md) |
| затравки: спойлеры, опора на главу 1, стиль | [teasers.md](references/teasers.md) |
| два времени и формула | [two-durations.md](references/two-durations.md) |
| платная граница | [free-boundary-gate.md](references/free-boundary-gate.md), [patterns-release.md](references/patterns-release.md) |
| этика и монетизация | [ethics.md](references/ethics.md), [ethics-sources.md](references/ethics-sources.md), [attention.md](references/attention.md), [systems/dark-patterns.md](references/systems/dark-patterns.md) |
| ревизия, журнал, сохранения | [versioning.md](references/versioning.md) |
| признаки, уроки, споры, «объясни» | [flags.md](references/flags.md), [lessons.md](references/lessons.md), [contradictions.md](references/contradictions.md), [explain.md](references/explain.md), [systems/release-gate.md](references/systems/release-gate.md) |

## Главные правила

- **R-11** — карточка привязана к тексту: пункты `features` звучат, числа совпадают, роль игрока названа.
- **C-49** — факты, карточка, затравки (ж) и обещанные финалы (з); подсказка, вердикт — после сверки с ink.
- **A-05** — на карточке два числа: минуты по клику и дни в реальном времени, из `durations.mjs`.
- **INTENT «Платная граница»** — стык глав не раньше главы 1, сильный крючок, выплата сразу; платных выборов
  нет, «по клику» не продаётся (A-04), бесплатный путь не наказан.
- **R-115, A-03** — пауза не продаётся, отсутствие не наказывается; уведомление — только настоящая реплика.
- **A-01** — в затравках и карточке нет срока возвращения персонажа.
- **LOCAL-04** — каждая находка сверена с ink до отчёта; **LOCAL-09** — `docs/style.md` в шаге, где пишешь текст.
- **R-117** — всё вымышлено: в карточке и примерах нет реальных людей, компаний, брендов.

## Формат результата

Сначала вердикт гейта одной строкой и строки пунктов как их дал `release-gate.mjs`. Потом находки — строго:

```
P1 · непонятно · <узел> · симптом · правка (F-NN | → <скилл>) · [C-NN · замер|модель|человек · уверенность]
```

Узел — третьим полем (`история`, если находка о карточке), приём владельца или «→ скилл» — в поле правки.
Тип: непонятно / скучно / не верю / нестыковка / баг. P — по общей таблице
`.claude/skills/story-review/references/priority.md`: ✗ гейта — P1; «скучно» без человека (граница без
крючка) — не выше `skill.review.p_cap`; обман витрины и этика — «не верю». Потом разговор: что увидит игрок на карточке и на
границе, варианты А/Б с «советую», предложения для `meta.json` (`"minutes"`, `"days"`, затравки) — как
предложения, не правка.

## Состояние

Скилл сам в состояние не пишет — отдаёт `story-desk` (после одобрения автора, в конвейере — королевы): отчёт
`docs/stories/<id>/reviews/<дата>-story-release.md` (вердикт, пункты гейта, находки, предложения для карточки,
журнал изменений из `revision-check.mjs`) и одну строку для `STATUS.md`: «выпуск <дата>: гейт <вердикт>, ✗ — …,
карточка — …, ревизия N». После выпуска — шаг `release` и тег `<id>-r<revision>`.

## Готово, когда

`release-gate.mjs` прогнан, каждый ✗ и ⚠ разобран (владелец, вариант или «ложное» с причиной), два времени и
затравки предложены числами и текстом из команд, этика пройдена по семи вопросам, запись в состояние
предложена.

## Объясни

По запросу «объясни»: **почему** (что игрок увидит до первой реплики и на границе), **откуда**
(`npm run -s story:rule <ID>`, `алиас:ID` из [references/sources.md](references/sources.md), класс урока в
[lessons.md](references/lessons.md)), **как сделать самому** — [explain.md](references/explain.md).

Версия: 1
