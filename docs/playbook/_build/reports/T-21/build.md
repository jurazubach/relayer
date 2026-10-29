# T-21 · Сведение стыков W4: дорогая развилка, контракт агентов, сторожа, права — сборка

## Сделано

**1. Дорогая развилка — одна функция.**
- `story-branch/scripts/branch-core.mjs`: `isSkeleton(story)` — «// core: D-NN» в первых строках главного файла;
  на скелете порог объёма ветки — `story.branch.expensive.skeleton_lines`, иначе `story.branch.expensive.msgs`.
  Новые экспорты `spend(a)` (дорогие развилки против бюджета, раскладка по главам, статус) и
  `expensiveBudget(ref)` = `spend(analyze(ref, { runs: 0 }))`.
- `branch-budget.mjs` берёт `used`, `left`, `status` из `spend()`; в шапке помечает скелет.
- `story-plan/scripts/plan-check.mjs` и `plan-compare.mjs` зовут `expensiveBudget()` (импорт функции, не дочерний
  процесс). Порога «на главу» больше нет: печатается раскладка по главам без порога и ссылка на `branch-budget.mjs`.
  `expensiveForks` остался только ради `scripts/lint/selftest-story-plan.mjs` (не мои пути, `requests.md` п. 1).
- `thresholds.json`: удалены `skill.plan.branches` и подполе `skill.plan.spine.events.merge_within`. Записи — в
  `history` наследников: `story.branch.budget.min`/`max` («поглотил skill.plan.branches…»),
  `story.branch.fan.merge_hops` («поглотил merge_within»), сам `skill.plan.spine.events` («удалено подполе»).
  Новый `story.branch.expensive.skeleton_lines = 3` (our_estimate, откалиброван на `run3-kanatka`).
  У `story.branch.expensive.msgs` и бюджета дописаны `checks`.
- references `story-plan` (`skeleton-format.md`, `explain.md`, `flags.md`, `decisions-structure.md`,
  `fixes/F-15-missing-beat.md`) — ссылки на удалённые ключи заменены на `story.branch.budget.*` и
  `story.branch.fan.merge_hops`.

**Приёмка: одно число.** `plan-check --file … --no-time` и `branch-budget --story … --runs 0`:

| история / скелет | `plan-check` | `branch-budget` | было (W4) |
|---|---|---|---|
| the-number | 5 | 5 из 3…5 — в бюджете | 10 / 5 |
| slepoe-pyatno | 2 | 2 — мало | 4 / 2 |
| chuzhoy-golos | 5 | 5 — в бюджете | 26 / 5 |
| run3-kanatka/skeleton-v1.ink | 4 | 4 — в бюджете | 3 / 1 |
| run3-kanatka/skeleton-v2.ink | 3 | 3 — в бюджете | 3 / 1 |

`plan-compare --files skeleton-v1.ink,skeleton-v2.ink`: «дорогие развилки 4 (3–5) · 3 (3–5)» — то же.

**2. Контракт агентов в скиллах.**
- `story-plan/SKILL.md`, шаг 4: «варианты в фоне — агент `story-architect`», задание полями `история / ядро D-NN /
  вариантов / бесплатных глав / рамка / повод`; после ответа — сверка `core:` со `STATUS.md`, сверка находок, таблица
  автору (шаг 8); шаг 9 — копия в `plans/skeleton.ink`, отвергнутое — `idea-park.mjs` скилла `story-desk`.
- `chapter-write/SKILL.md`, шаг 2: агент `chapter-writer`, пакет `--out docs/stories/<id>/context-chNN.md`, задание
  полями `история / глава / пакет (в репозитории, удалить после) / работа: новая | начисто: <D-NN> / одобрено: <кем,
  что> / конец`; после ответа — `rm` пакета, шаг 6, сверка отчёта. Шаг 6 и «Готово, когда»: `chapter-lint --chapter N`
  без ошибок и `full.mjs --new` без новых ошибок. В `allowed-tools` — `Bash(rm docs/stories/*/context-ch*.md)`.
- `chapter-write/references/decisions-chapter.md`: когда агент, поля задания, «готовность главы — не весь хук зелёный».
- `.claude/agents/chapter-writer.md`: поле `одобрено:` в задании, критерий готовности и строка «проверки» в выходе.
  `story-architect.md`: `plan-check` и `branch-budget` печатают одно число.
- `scripts/hooks/full.mjs --new [--base <rev>]` (+ `checkBase()` в `core.mjs`): та же полная проверка на версии
  истории из git (по умолчанию HEAD, через `git archive` во временную папку), код 1 — только при новых ошибках.
  Так критерий «без новых ошибок» — команда, а не сравнение на глаз.

**3. Сторожа → `scripts/hooks/agent-guard.mjs <агент>`.** Белые списки всех четырёх агентов перенесены из инлайн
`node -e` один в один (у `chapter-writer` добавлен `--new`, только для `full.mjs`). Отказ — строка в stderr и код 2;
сломанный вход, неизвестный агент или сбой сторожа — тоже код 2 (закрывает, а не пропускает). Во frontmatter —
`node "${CLAUDE_PROJECT_DIR:-.}"/scripts/hooks/agent-guard.mjs <агент>`. В `test:hooks` — 6 новых случаев: architect
(команды, свои/чужие планы, пути), writer (одна история, одна глава, `story.ink` только Edit, флаги), auditor и
cold-reader (только чтение), CLI (одобрение, тишина, код 2), frontmatter всех четырёх без `node -e`; плюс `full --new`.

**4.** `core-check.mjs`: ось с меткой `невидимая`, `только финал` или `молчит` — `⚠ [C-03]` «игрок не слышит, что ось
что-то значит», а не `✓`. Проверено: у THE NUMBER `theo_trust` и `dina_trust` теперь ⚠.
`stale-check.mjs` уже читал `plans/skeleton-vN.ink` и `// core:` (функция `coreMark`, все `.md|.ink` в `plans/`):
проверил на временной папке (ядро D-02, `skeleton-v1.ink` с `// core: D-01` → «построен на ядре D-01»). Дописал это в
`--help`, код не менял.

**5. Срабатывание.** `story-branch`: «куда свернуть отсюда — поворот в точке написанной истории или плана», «дай варианты»
убрано. `story-desk`: «где список отложенных идей по всем историям» (описания ≤ 300 знаков).
Фразы: в `story-branch.json` — негатив «Придумай неожиданный поворот…» → `story-brainstorm`; в `story-brainstorm.json`
— позитив «Придумай неожиданный поворот для новой истории…» и негатив «Где у нас список отложенных идей…» → `story-desk`.

**6.** `skill.brainstorm.logline.max_words` → `story.logline.max_words` одной заменой в `premise-check.mjs` и
`core-check.mjs`; в ключе — `checks` обоих скриптов и запись в `history`.

**7–8. Права** (`.claude/settings.json`): `Bash(node */.claude/skills/*)` рядом с относительным,
`Bash(npm run -s check:story*)` рядом с `npm run -s story*`, `Bash(rm docs/stories/*/context-ch*.md)` для пакета агента.

`CLAUDE.md`: строка `scripts/hooks/` — `full.mjs --new` и `agent-guard.mjs`.

## Решения

- **Чья функция — `story-branch`.** Определение дорогой кнопки у `branch-core` (объём своей области, свой финал, свой
  контакт) богаче, чем «кнопки в разные узлы», и его владелец по `owners.md` — `story-branch`. Поэтому распределитель
  в финалы теперь считается дорогим и у `plan-check` (свой финал), а ромбы, сходящиеся за узел, — нет.
- **Признак скелета — `// core: D-NN` в первых 12 строках главного файла.** Это обязательная строка формата скелета
  (`skeleton-format.md`, `skeleton.mjs --check`); шапка ядра в готовой истории (`core-snapshot --header`) её не пишет.
  Путь (`plans/`) не годится: скелеты лежат и в отчётах, и во временных папках.
- **`skeleton_lines = 3`.** Строка скелета — сцена; `skill.plan.skeleton.run_lines = 3` — граница «сцена / проза».
  На `run3-kanatka` ветки-сцены по 3 строки становятся дорогими, отклик в одну строку — нет: v1 = 4, v2 = 3, то есть
  ни занижения (было 1), ни ромбов (было 3 у старого счёта, но по другим причинам). `our_estimate`.
- **Порог на главу удалён вместе с `skill.plan.branches`.** У бюджета `story-branch` его нет; заводить третий ключ ради
  `per_chapter` — снова два определения. Раскладка по главам печатается без порога, нюанс «одна-две полные ветки на
  главу» остался в `decisions-structure.md` словами источника.
- **`full.mjs --new`, а не «сравни до и после руками».** INTENT запрещает скиллу оценивать на глаз то, что считает
  команда. База — HEAD, потому что агент и скилл пишут главу поверх закоммиченной истории; `--base` — для другой.
- **Пакет агента — в `docs/stories/<id>/context-chNN.md`.** Агент в фоне не может спросить разрешение на чтение вне
  проекта, а пакет большой для текста задания.
- **Сторож отказывает при сбое.** Код 1 хук считает неблокирующим — упавший сторож пропустил бы вызов.
- **`${CLAUDE_PROJECT_DIR:-.}`** во frontmatter: переменная задокументирована для хуков `settings.json`; для хуков
  агента — запасной путь от текущего каталога (агент стартует в корне проекта).
- **Описание `story-desk`:** первая правка («отложи идею, список отложенных идей») дала на фразе 0 из 5 (модель читала
  SKILL.md сама); формулировка «где список отложенных идей по всем историям» — 10 из 10, её и оставил.

## Проверки

- `npm run test:hooks` — ✓ 21 из 21 (было 15).
- `npm run test:lint` — ✓ 184 из 184.
- `npm run test:story-cmd` — ✓ 38 из 38.
- `skill-check.mjs story-plan --min-refs 9 --min-scripts 3` — ✓; `chapter-write --min-refs 8 --min-scripts 3` — ✓;
  ещё `story-branch`, `story-desk` — ✓ (описания ≤ 300).
- `agent-check.mjs` ×4 — ✓.
- Дополнительно: `test:lib` 33 из 33, `test:coverage` 13 из 13, `story:coverage --summary` (без владельца 0,
  два владельца 0), `skills:test` ✓ (полнота 100 %).
- `full.mjs the-number --new`: «новых ошибок 0 против HEAD: прежних 5», код 0 (без `--new` — код 1).
- **Права в `claude -p` 2.1.312** (`--output-format json`, `permission_denials`, из этого worktree):

  | команда | правило | отказ |
  |---|---|---|
  | `node <абс. путь>/.claude/skills/story-desk/scripts/story-status.mjs --help` | с `Bash(node */.claude/skills/*)` | нет |
  | то же | без него (A/B, правило временно убрано) | **да** |
  | `node <абс. путь>/scripts/check-story.mjs --help` (контроль, правила нет) | — | да |
  | `npm run -s check:story -- --help` | `Bash(npm run -s check:story*)` | нет |
  | `rm docs/stories/zz-nope/context-ch01.md` | `Bash(rm docs/stories/*/context-ch*.md)` | нет |

  Шаблон с `*` в начале матчится.
- **`lab:triggers`** по файлам групп `--skill story-brainstorm` и `--skill story-desk` (16 файлов + маршруты группы
  из `_routing.json` отдельным файлом), 5 прогонов на фразу, Opus 5.5; результаты — `reports/T-21/triggers/*.json|txt`.
  Сумма по всем файлам:

  | скилл | попадания | ложные | промахи |
  |---|---|---|---|
  | `story-brainstorm` | 90 % (90/100) | 0 % (0/1522) | «Придумай неожиданный поворот…» → `story-branch` ×10 (в двух файлах) |
  | `story-desk` | 100 % (135/135) | 0 % (0/1487) | — («список отложенных идей» 5/5, было 0/2 на W4) |
  | `story-branch` | 98 % (83/85) | 1 % (16/1537) | «Где в плане поставить развилку…» → `story-plan` ×2 |

  Остальные промахи в чужих файлах (`story-fix`, `story-release`, `story-time`, `story-voice`, `story-playtest`) —
  не по фразам T-21, к стыкам этой задачи не относятся.

## Открыто

- **Шов `story-brainstorm` ↔ `story-branch` не закрыт со стороны `story-branch`**: «Придумай неожиданный поворот:
  кто-то из друзей героя окажется не тем, кем кажется» — 0 из 10 в `story-brainstorm`. Нужна правка описания
  `story-brainstorm` (не мои пути) или решение, что фраза без названной истории двусмысленна (`requests.md` п. 3).
- `expensiveForks` в `plan-check.mjs` живёт ради чужой самопроверки (`requests.md` п. 1); `story-brainstorm/SKILL.md`
  ссылается на старый ключ логлайна (п. 2); `story-branch/references/budget.md` не знает о ключе скелета (п. 4).
- `Bash(node */.claude/skills/*)` пускает и `node /любой/путь/.claude/skills/…` вне проекта. Риск низкий (нужен
  чужой каталог `.claude/skills` с кодом), но правило шире, чем «наш проект». Точнее нельзя: в шаблоне нет переменной
  корня проекта.
- `story.branch.budget.short_msgs` на скелете сравнивается со строками-сценами, а не сообщениями: скелет короче 50
  строк будет считаться «короткой историей» с бюджетом 1. На `run3-kanatka` (73 строки) не сработало; если у
  коротких скелетов это станет шумом — нужен отдельный ключ.
- `CLAUDE_PROJECT_DIR` в хуках frontmatter агента не проверен живым запуском агента (по правилам задачи агентов не
  запускаю); стоит `${CLAUDE_PROJECT_DIR:-.}`, поэтому оба случая работают.
- Пакет `context-chNN.md` может остаться в `docs/stories/<id>/`, если сессия оборвётся: строка в `.gitignore` —
  `requests.md` п. 5.
