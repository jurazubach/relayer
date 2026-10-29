---
name: story-review
description: "Посмотри историю целиком: что не так, где слабые места, где игроку станет скучно или непонятно; ревью главы, части перед тестом или скелета плана; тестеры спорят с ревью. Линзы, холодный читатель и QA — в отчёт с приоритетами: сначала непонятное, потом скучное."
allowed-tools: Bash(npm run story*), Bash(npm run -s story*), Bash(node ${CLAUDE_SKILL_DIR}/scripts/*)
metadata:
  version: 1
---

# story-review — что в истории чинить первым

Ревью — оркестратор: замер `story:lint`, выбор линз (диагностических скиллов) по разметке и метрикам,
параллельные агенты `story-auditor` по линзам и холодный читатель, QA «шесть списков», сведение и **короткий**
отчёт: P1…P3, сначала непонятное, потом скучное, по главам не больше `skill.review.top_per_chapter`,
остальное — в приложении. Знание тем — в линзах; здесь — порядок, приоритет и сведение. Числа — только из
команд, пороги — ключами `docs/playbook/thresholds.json`. Текст не правит: правки строит `story-fix` после
одобрения, состояние пишет `story-desk`.

**Команды — по одной на вызов, ровно как написаны:** без `cd`, пайпов, `;`, `&&`, `>`, `$?`, `| head`.
Составная команда получает отказ в правах. Длинный вывод — `--summary` или `--json`. Упала команда —
«нет данных: <команда>», не угадывай.

## Границы

- **Вход:** фраза автора «посмотри историю», «что не так», «где слабые места», «где станет скучно»; глава,
  набор с `beta_stop` или скелет (`--plan`, Б-7); сводка тестеров от `story-playtest`, если спорит с ревью (Б-3).
- **Выход:** отчёт `report.mjs` с «почему важно» у каждой находки (режим «объясни»), разговор о главном,
  отчёт и строка для `STATUS.md` — через `story-desk`.
- **Не здесь:** одна тема по симптому («кнопки ничего не меняют», «начало не цепляет») — сама линза в главной
  сессии по таблице `CLAUDE.md`; панель профилей читателей, сборка и анкета для тестеров — `story-playtest`;
  применить правку — `story-fix`; записать решение и отклонение — `story-desk`; гейт выпуска — `story-release`;
  куда свернуть сюжет — `story-branch`; вставить пропущенную опору (F-15) — `story-plan`.

## Алгоритм

1. **Состояние.** Прочитай `docs/stories/<id>/STATUS.md`. Не знаешь, о какой истории речь, — спроси. Режим —
   по шагу ([references/decisions-review.md](references/decisions-review.md)): `skeleton` → `--plan`, набор с
   `beta_stop` → `--partial`, иначе полный. Шаг раньше скелета — ревью нечего смотреть, скажи об этом.
2. **Замер.** `node ${CLAUDE_SKILL_DIR}/scripts/review-cache.mjs --story <id>` (плюс `--partial` или `--plan`) —
   `story:lint` один раз на ревизию ink и папка прогона `.story-review/<id>/<ключ>/` (вне git), куда ложатся ответы.
3. **Линзы.** `node ${CLAUDE_SKILL_DIR}/scripts/select-lenses.mjs --story <id>`; симптом автора → `--focus <линза>`
   по таблице `CLAUDE.md` и `--symptom "<его слова>"`. Правило и холодный читатель — [references/routing.md](references/routing.md).
   Строка «разметка A-06» — первым пунктом отчёта предложить разметку (LOCAL-02).
4. **Аудиторы и читатель — параллельно, одним сообщением.** На каждую линзу без ответа: задание —
   `node ${CLAUDE_SKILL_DIR}/scripts/select-lenses.mjs --story <id> --task <линза>`, затем агент `story-auditor`
   (Agent, `subagent_type: story-auditor`, `run_in_background: false`) с этим заданием; в том же сообщении —
   агент `cold-reader` на каждую точку шага 3. Не в фоне: вызовы одного сообщения и так идут параллельно, а права
   скилла на команды живут до конца хода — после фонового агента `merge-findings` получит отказ. Каждый ответ дословно — Write в папку прогона: `lens-<линза>.md`, `cold-<…>.md`
   (Write отказан — сводишь сам по [references/priority.md](references/priority.md) и говоришь, что без `merge-findings`).
   Есть строки `#photo` (`npm run -s story:images -- <id>`) — линза «картинки» в главной сессии: `story-images` через
   Skill, только находки по его `choosing.md`; ответ — `lens-story-images.md` в ту же папку прогона.
5. **QA «шесть списков».** `node ${CLAUDE_SKILL_DIR}/scripts/qa-six.mjs --story <id>`, по списку — `--list <имя>`,
   по контакту — `--contact <id>`. Сверь кандидатов с узлами, запиши `qa-six.md` в папку прогона: шесть
   разделов, пустой — «проверено, нет» ([references/qa-six.md](references/qa-six.md)). Не в `--plan`.
6. **Люди (если есть).** Сводку `story-playtest` строками формата — `human-<волна>.md` в папку прогона; споры —
   [references/conflicts.md](references/conflicts.md).
7. **Сведение и сверка.** `node ${CLAUDE_SKILL_DIR}/scripts/merge-findings.mjs --story <id>`. Каждую P1 и P2
   открой в узле ink и сверь с правилом: `npm run -s story:rule C-NN`. В основной список — только сверенное
   (LOCAL-04); аудитор не ответил в формате — повтори задание, не переписывай за него.
8. **Отчёт.** `node ${CLAUDE_SKILL_DIR}/scripts/report.mjs --story <id> --explain`, затем разговорная часть:
   главное, владельцы P1, варианты — по [references/report.md](references/report.md) и стадиям
   [references/systems/critical-response.md](references/systems/critical-response.md). Реплик не пишешь; просит
   пример — сперва `docs/style.md` (ST-NN о репликах).
9. **Состояние.** Предложи автору: отчёт в `docs/stories/<id>/reviews/<дата>-story-review.md` и строку для
   `STATUS.md`, отклонённое — записью с хэшем узла; пишет `story-desk` после одобрения.

## Карта references

| развилка | файл |
|---|---|
| просьба → режим → команды; сколько показывать; повторное ревью | [decisions-review.md](references/decisions-review.md) |
| какие линзы, режимы, холодный читатель, задание аудитору | [routing.md](references/routing.md) |
| формат находки, замер / модель / человек, два прохода | [finding-format.md](references/finding-format.md) |
| P1–P3, порядок типов, глава не держится | [priority.md](references/priority.md) |
| человек против замера, отклонённое, ложные (Б-3) | [conflicts.md](references/conflicts.md) |
| QA «шесть списков» | [qa-six.md](references/qa-six.md) |
| линзы теорий: упущенные возможности | [lenses.md](references/lenses.md) |
| метка «намеренно», разметка, `beta_stop`, скелет на ink | [patterns-review.md](references/patterns-review.md) |
| отчёт и «объясни» | [report.md](references/report.md), [explain.md](references/explain.md) |
| признаки плохого ревью | [flags.md](references/flags.md) |
| уроки, споры, внимание, системы | [lessons.md](references/lessons.md), [contradictions.md](references/contradictions.md), [attention.md](references/attention.md), `references/systems/` |

## Главные правила

- **`narrative-testing:P-02`** — поломки и впечатление отдельно; раздел «Поломки» есть всегда.
- **LOCAL-04** — строка замера идёт в отчёт только после сверки с узлом и правилом.
- **`narrative-testing:P-15`** — у находки один тип; **`edgerton-hooked:LESSON-01`** — непонятное раньше скучного.
- **`narrative-testing:P-05`** — симптом человека реален, его рецепт — в `ideas.md`; по «скучно» человек сильнее модели.
- **`narrative-testing:P-14`** — QA сдаёт шесть списков, пустой — «проверено, нет».
- **`schell-art-of-game-design:SYS-2`** — линзы под симптом, немного правок на главу (`skill.review.top_per_chapter`).
- **LOCAL-02** — нет разметки A-06 — сначала разметка; **A-07** — читатель только Opus.
- Отклонённое автором не всплывает, пока хэш узла тот же (`build-plan.md` §4).

## Формат находки

```
P1 · непонятно · <узел> · симптом · правка (F-NN) · [C-NN · замер|модель|человек · уверенность]
```

Строго этот порядок: узел третьим полем, приём F-NN владельца — в поле правки (нет приёма — «→ <скилл>»). Тип:
баг / непонятно / нестыковка / не верю / скучно; без человека «скучно» и «не верю» — «(кандидат)». P1–P3 —
[references/priority.md](references/priority.md). Просят JSON — `merge-findings.mjs --json`.

## Состояние

Скилл сам в состояние не пишет — отдаёт `story-desk` (после одобрения автора, в конвейере — королевы): отчёт
`docs/stories/<id>/reviews/<дата>-story-review.md` (вывод `report.mjs`) и строку для `STATUS.md` из его конца;
отклонённое — `decision-add.mjs --kind отклонено --node --finding` с хэшем узла.

## Готово, когда

Выбранные линзы ответили, читатель с изоляцией «ок», QA сдал шесть списков (кроме `--plan`); P1 и P2 сверены с
ink; отчёт с приоритетами и «почему важно» показан; запись в состояние предложена.

## Объясни

По запросу «объясни»: **почему** (что почувствует игрок), **откуда** (`npm run -s story:rule <ID>`, `алиас:ID` из
[references/sources.md](references/sources.md), класс урока), **как сделать самому** — упражнения из
[references/explain.md](references/explain.md).

Версия: 1
