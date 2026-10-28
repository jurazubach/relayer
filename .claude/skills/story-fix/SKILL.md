---
name: story-fix
description: "Примени правки из ревью: почини найденное, возьми вариант Б по пункту 3, исправь эти находки; покажи, какие реплики поменялись; не сломалось ли что после правки; сократи историю до 10 минут или в одну сессию. Применяет только одобренное, дифф до и после."
allowed-tools: Bash(npm run story*), Bash(npm run -s story*), Bash(node ${CLAUDE_SKILL_DIR}/scripts/*)
metadata:
  version: 2
---

# story-fix — применить одобренное и показать, что поменялось

`story-fix` правит текст истории **только по одобренным пунктам**: находка + выбранный вариант. Одобряет автор,
в конвейере — королева в пределах `INTENT.md`, с записью решения. Варианты А/Б/В с ink «до» и «после» берутся
**дословно** из отчёта линзы; нет вариантов — строятся приёмом владельца (`F-NN`). После правки — страховка
(улики, мотивы, переменные, переходы, разметка), реплики до и после, полный `story:lint` до и после, повтор линзы
на изменённых узлах. Режим `--compress` — сжать до N минут или в одну сессию. Числа — только из команд, пороги —
ключами `docs/playbook/thresholds.json`.

**Команды — по одной на вызов, ровно как написаны:** без `cd`, пайпов, `;`, `&&`, `>`, `$?`, `| head`.
Составная команда получает отказ в правах. Упала команда — «нет данных: <команда>», не угадывай. Значение
порога — `npm run -s story:rule C-NN --brief`; JSON проекта (`capabilities.json`, `meta.json`) — `Read` или
`Grep`; много одинаковых правок (задержки в финале) — `Edit` по узлу. `node -e`, `python3`, `sed -i` получают
отказ (LOCAL-20). `check:story` не нужен: тупики и недостижимое уже в `story:lint` (C-52, C-15). Общие файлы
(`CLAUDE.md`, `README.md`) не правь — нужную строку (минуты карточки) отдай в отчёт для `story-desk`. Вывод
`text-diff.mjs` / `diff-report.mjs` в отчёт — их `--md --out <файл отчёта>`, а не `cp`.

## Границы

- **Вход:** фраза автора («примени правки из ревью», «возьми вариант Б», «сократи до 10 минут»); отчёт линзы
  или ревью `docs/stories/<id>/reviews/<дата>-<скилл>.md`; сводка тестеров от `story-playtest` (Б-2).
- **Выход:** правленые файлы `src/stories/<id>/`, реплики до и после, отчёт правки, строка для `STATUS.md`.
- **Не здесь:** найти проблемы — `story-review` и линзы по таблице `CLAUDE.md`; сами приёмы ремонта — у
  владельцев ([fixes-index.md](references/fixes-index.md)); ядро, план, куда свернуть — `story-desk` (Б-5),
  `story-plan`, `story-branch`; писать главу с нуля — `chapter-write`; записать решение — `story-desk`.

## Алгоритм

1. **Состояние.** Прочитай `docs/stories/<id>/STATUS.md`. Не знаешь, о какой истории речь, — спроси. Нет
   отчёта и нет просьбы о конкретной правке — сначала ревью (`story-review`), а не правка.
2. **Пункты.** Отчёт линзы — `node ${CLAUDE_SKILL_DIR}/scripts/pick.mjs --report <файл>`: находки и варианты.
   Покажи по одному: строка находки, «почему», варианты, «советую» ([approval.md](references/approval.md)).
   Применяется только выбранное. `--compress` — шаг 2 по [compress.md](references/compress.md) с
   `node ${CLAUDE_SKILL_DIR}/scripts/compress-plan.mjs --story <id> --minutes N` (или `--session`).
3. **Вариант.** Одобрено — `node ${CLAUDE_SKILL_DIR}/scripts/pick.mjs --report <файл> --take N:К --story <id>`:
   дословный ink и «до найдено» или «устарело». Варианта нет — приём владельца
   ([fixes-index.md](references/fixes-index.md)), развилки — [decisions-fix.md](references/decisions-fix.md).
   Баг — сначала маршрут: `npm run story:trace -- --story <id> --route <кнопки>` ([safety.md](references/safety.md)).
4. **Правка.** Прочитай `docs/style.md` (ST-NN о репликах и кнопках) прямо перед тем, как писать реплику,
   кнопку или ink. Вноси вариант дословно, каркас на месте ([patterns-fix.md](references/patterns-fix.md)).
5. **Страховка.** `node ${CLAUDE_SKILL_DIR}/scripts/fix-guard.mjs --story <id>`. «✗» — не сдавать: вернуть
   или откатить; каждое «⚠» сверить с ink и правилом (`npm run -s story:rule C-NN`).
6. **До и после.** `node ${CLAUDE_SKILL_DIR}/scripts/text-diff.mjs --story <id> --nodes <узлы>` — реплики;
   `node ${CLAUDE_SKILL_DIR}/scripts/diff-report.mjs --story <id> --nodes <узлы>` — полный `story:lint` и
   метрики до и после. Новое в чужих местах — открой в ink: регрессия (новый пункт) или ложное (LOCAL-04).
   «До» — `HEAD`; правка уже в коммите — `--from <коммит перед правкой>` у всех трёх скриптов.
7. **Повтор линзы** на изменённых узлах: её проверки `npm run -s story:lint -- --story <id> --only C-NN`, её
   скилл через `Skill` на этих узлах; находка читателя — тот же `npm run story:cold-read` на том же узле.
   Правка распределителя или финалов — линза `story-endings` всегда; напоминания — `story:trace --compare
   silent` и `story:sessions --persona unresponsive` ([decisions-fix.md](references/decisions-fix.md), LOCAL-17…19).
8. **Отчёт** ([diff-for-author.md](references/diff-for-author.md)): строки пунктов с итогом, реплики «было /
   стало», до и после, страховка, повтор линзы. Режим «объясни» — по запросу.
9. **Состояние.** Предложи `story-desk`: отчёт `reviews/<дата>-story-fix.md`, строку `STATUS.md`, решения
   D-NN (отклонено — с хэшем узла, «намеренно» — с причиной). Пишет `story-desk` после одобрения.

## Карта references

| развилка | файл |
|---|---|
| откуда вариант, порядок, конфликт правок, регрессия, повтор линзы | [decisions-fix.md](references/decisions-fix.md) |
| одобрение по пункту, королева, «намеренно» | [approval.md](references/approval.md) |
| F-NN → файл владельца, перезамер | [fixes-index.md](references/fixes-index.md) |
| что нельзя сломать, маршрут бага | [safety.md](references/safety.md) |
| как вносить, дробить, склеивать, метка | [patterns-fix.md](references/patterns-fix.md) |
| дифф и отчёт для автора | [diff-for-author.md](references/diff-for-author.md) |
| `--compress`: порядок и «что резать» | [compress.md](references/compress.md), [compress-sources.md](references/compress-sources.md) |
| признаки плохой правки | [flags.md](references/flags.md) |
| «объясни»: уроки, споры, внимание, цикл | [lessons.md](references/lessons.md), [contradictions.md](references/contradictions.md), [attention.md](references/attention.md), [explain.md](references/explain.md), [systems/fix-loop.md](references/systems/fix-loop.md) |

## Главные правила

- **`INTENT.md`** — правка текста без одобрения запрещена; одобряется каждый пункт.
- **LOCAL-21** — буква одобрения не совпала с советом и оставляет P1 открытым — скажи это до правки.
- **Варианты дословно** — из отчёта линзы; «устарело» — повтор линзы, а не догадка.
- **`attention-today:RED-10`** — дроби подачу, не режь улику и мотив; `--compress` режет структуру и повторы.
- **`narrative-testing:P-16`** — баг сначала маршрутом, после правки тот же маршрут.
- **LOCAL-04** — новая находка после правки сверяется с ink до отчёта.
- **LOCAL-09** — `docs/style.md` открывается в шаге правки, перед первой репликой.
- **A-01, A-03** — правка не вводит срок паузы и упрёк за отсутствие; **C-53** — теги только `ready`.
- **Метка `// намеренно:`** — только после решения D-NN; тупик C-52 и недостижимое C-15 меткой не гасятся.

## Формат результата

Сначала пункты строкой формата, с итогом после стрелки:

```
P1 · непонятно · <узел> · симптом · правка (F-07, вариант А) · [C-10 · замер · высокая] → применено: C-10 ушла
```

Узел — третьим полем, приём и вариант — в поле правки. Итог: применено / отклонено / отложено / намеренно
(D-NN) / устарело. Потом разговор: что почувствует игрок, реплики «было / стало», что сдвинулось в истории.

## Состояние

`story-fix` в состояние не пишет сам — отдаёт `story-desk` (после одобрения автора, в конвейере — королевы):
отчёт `docs/stories/<id>/reviews/<дата>-story-fix.md` (пункты, `text-diff.mjs --md`, `diff-report.mjs --md`,
итог `fix-guard.mjs`, повтор линзы) и строку для `STATUS.md` из `diff-report.mjs`.

## Готово, когда

Каждый одобренный пункт применён дословно или получил итог с причиной; `fix-guard.mjs` без «✗», «⚠» разобраны;
`diff-report.mjs` без новых ошибок, чужие находки разобраны; линза на изменённых узлах повторена; запись в
состояние предложена.

## Объясни

По запросу «объясни»: **почему** (что почувствует игрок), **откуда** (`npm run -s story:rule <ID>`, `алиас:ID` из
[references/sources.md](references/sources.md), класс урока), **как сделать самому** — упражнения из
[references/explain.md](references/explain.md).

Версия: 2 (Э3, X-E3: отложенные замеры после правки, LOCAL-17…21)
