# S-chapter · Скилл chapter-write — сборка

## Сделано

**`.claude/skills/chapter-write/SKILL.md`** (104 строки тела) — модуль (`user-invocable: false`), описание
симптомами автора (277 знаков), `allowed-tools` по LOCAL-03 плюс `Bash(node scripts/hooks/full.mjs *)`, алгоритм из
8 шагов: STATUS → пакет `chapter-context` (facts.md первым) → каркас и вход по R-27 → текст (чтение `docs/style.md`
и образцы именно на этом шаге) → паузы и `#remind`/`#noanswer` → замер `chapter-lint` + полный хук + нужные
диагностические скиллы → сверка находок с ink → facts.md и отчёт. Карта references, 9 правил по ID, формат находки,
«Состояние» через `story-desk`, «Готово», «Объясни», версия.

**`references/`** (15 файлов, все ≤ 300 строк, у каждого «Источники»):
- `ink-idioms.md` (TH-24) — R-27 вход в главу, R-118, теги, weave (`inkle:PAT-01`, `PAT-02`), поток (`PAT-08`,
  `RED-11`), `LESSON-13`; 5 примеров ink.
- `patterns-ink.md` — каскад (`procedural:PAT-01`, `emshort:P-11`, `LESSON-02`), шафл (`PAT-06`, `P-11`, `RED-09`,
  `LESSON-01`), сшитая реплика (`bateman:P-17`, `PAT-09`, `RED-09`, `SYS-5`); 4 примера.
- `scene.md` (TH-25) — «поэтому», сцепка на стыке, тест «и что?», план → перемена, конфликт, качели, деталь и место,
  два спора; 5 примеров. `decisions-scene.md` — развилки «сцена буксует» (Маасс, Макки, Снайдер, Шелл, Воглер, Йорк).
- `facts-anchor.md` (TH-26) — что брать из facts.md до главы и что предлагать после; `procedural:LESSON-08`, `P-15`,
  Dille, Шелл, Сколник; пример идентичности игрока.
- `chapter-checklist.md` (TH-27) — 37 пунктов, сведённых из 30 чек-листов «как написать главу», с таблицей
  выброшенного (A-01, A-02, A-03, A-06).
- `pause-lines.md` — реплики у паузы и у молчащей кнопки в обоих режимах; два компилируемых примера `#remind` +
  `#silent` и `#remind` + `#noanswer` (проверены `story:trace --persona unresponsive`).
- `decisions-chapter.md` — развилки писателя: новая/правка, нет плана, глава 1, часть с `beta_stop`, агент, weave/узел,
  отклик на прошлое, шафл, нужен ли `#remind`, паузы, новый факт.
- `messages.md` (карта ST-NN → ключ → проверка, тема у `story-voice`), `flags.md`, `lessons.md` (12 карточек A/B/C),
  `attention.md` (нарезка 7 якорей, без ID чужих якорей в заголовках), `contradictions.md` (10 споров), `explain.md`
  (5 упражнений), `sources.md` (сгенерирован `story:coverage --sources --write`).
- `systems/weave.md` (`inkle:SYS-1`), `systems/scene-cause.md` (`cron:SYS-2`, `yorke:SYS-2`).

**`scripts/`** (4, у каждого `--help`, вывод для человека и `--json`):
- `chapter-context.mjs` — пакет главы: facts.md, шапка, строка плана и сцены скелета, карточки, концы главы N−1 по
  путям (персоны + случайные, склейка одинаковых концов, VAR общие и различающие, команда повтора `story:trace
  --route`), §1 стиля; `--out` для агента.
- `chapter-lint.mjs` — `check:story` + `story:lint` (находки главы N целиком, прочее числом), авто `--partial` при
  `beta_stop`, «молчание у кнопок» по «неотвечающему»: где кнопка ждёт вечно, сколько напоминаний.
- `ink-compile.mjs` — история, фрагмент (бот + теги против реестра) или блоки ` ```ink ` в markdown.
- `style-sample.mjs` — ST-NN, образцы SG и антиобразцы AS по теме или положению, стиль автора поверх.

**Хуки (`scripts/hooks/`)** — режим части: `isPartial(id)` в `core.mjs` (узел `beta_stop` в .ink папки или в .json),
`checkStory` передаёт `story:lint --partial`; `post-edit.mjs` — `modeFor(agent, id)` над `MODE_BY_AGENT`, режим
`partial` в заголовке отчёта; `full.mjs` — строка «часть истории»; тест в `selftest.mjs`.

**Прочее:** ключи `skill.chapter.tail_msgs`, `context_runs`, `tail_paths_max`, `style_samples` в `thresholds.json`
(рядом с `skill.plan.*`, с `history`); `scripts/lint/selftest-chapter-write.mjs` (5 тестов); фразы
`docs/lab/triggers/chapter-write.json` (11 позитивных, 6 негативных); строка в таблице «симптом → скилл» и пометка о
`--partial` в `CLAUDE.md`; сырые прогоны — `docs/lab/runs/S-chapter/`.

## Решения

- **Нюанс — отдельным подблоком `####`.** Заголовок со словом «нюанс» делает нюансом каждый ID в нём
  (`kb-levels.mjs`), поэтому базовый ID и его нюанс разнесены по разным заголовкам.
- **Заметки сцены не в ink.** Источники советуют `// ценность:`, `// + → −`, `// хочет / мешает`, `// truth:` — это
  отменено A-06 (C-53 ругается). Везде сказано: в плане главы и рабочих заметках, правда — в facts.md.
- **`#remind` по умолчанию у развилок, где ждут ответа**, исключение — инициатива игрока (хаб, действие): тогда
  `#noanswer:<срок>` или «кнопка ждёт» с записью в плане. Отсутствие ведёт в исход не хуже `#silent`.
- **Отсутствующий `--chapter` у `story:lint`** — фильтрую по полю `chapter` находок в `chapter-lint.mjs`; числа
  сверены с `story:lint` на трёх историях (the-number гл. 2: 43 из 297; chuzhoy-golos гл. 5: 63 из 669).
- **«Кнопка ждёт вечно» считает бот**, а не регулярка по ink: стоп «неотвечающего» в главе N — это ровно то, что
  увидит молчащий игрок в реальном времени.
- **Режим части в хуке — автоматически по `beta_stop`**, для любого агента, а не только `chapter-writer`: главная
  сессия пишет главы 1–2 так же.
- **Агента `chapter-writer` пока нет** (отдельная задача плана §6): SKILL.md отдаёт ему пакет, если агент есть, иначе
  пишет сам.
- **Примеры — свой мир** (канатная дорога: Ася, Роман; мост: Олег в тесте), без имён трёх историй и основы мутантов.
  В примерах нет рода игрока (поймал и исправил «ты пропал», «показал», «Студентка» в кнопке).
- **attention.md** — якоря чужих владельцев без ID в заголовке, иначе `story:coverage` считает это пересказом.

## Проверки

- `node docs/playbook/_build/checks/skill-check.mjs chapter-write --min-refs 8 --min-scripts 3` — ✓ ок, 0 предупреждений.
- `npm run story:coverage -- --skill chapter-write --min L2` — ✓ все 45 кластеров не ниже L2; строк 79: L3 — 59,
  L2 — 20 (нюансы, споры, системы, RED без мутанта), L0/L1 — 0.
- `npm run lab:triggers -- --skill chapter-write --runs 3 --min build` — ✓ код 0; `chapter-write` 100% (36/36),
  ложных 0% (0/220), 258 запусков, 557 с (`docs/lab/runs/S-chapter/triggers-group.json`). Первый запуск оборвался
  кодом 144 без вывода; по частям (`--file` своего файла и пяти соседей) — тот же результат, затем полный прогон прошёл.
- `claude -p` с шагами скилла: Skill → `chapter-context.mjs` → `chapter-lint.mjs --quick` → `full.mjs` — отказов в
  правах 0 (`docs/lab/runs/S-chapter/claude-p-permissions.jsonl`).
- `npm run test:hooks` — 15/15; `npm run test:lint` — 178/178 (с 5 тестами `chapter-write`); `npm run test:coverage` —
  12/12; `npm run story:coverage -- --summary` — код 0; `npm run test:story-cmd` — 38/38.
- Скрипты на трёх историях: `chapter-context` (the-number гл. 3, slepoe-pyatno гл. 2, chuzhoy-golos гл. 1 и 10),
  `chapter-lint` (the-number гл. 2, slepoe-pyatno гл. 1, chuzhoy-golos гл. 5 — числа совпали со `story:lint`),
  `ink-compile --story` (все три ✓), `--md` на всех references ✓.

## Открыто

- **Живой прогон написания главы** не делался: `claude -p` проверял права и замеры, но не текст главы. Качество
  главы, написанной по скиллу, проверит Э4/Э6 и ревью.
- **Агент `chapter-writer`** и его `PreToolUse`-ограничение путей — отдельная задача; `MODE_BY_AGENT` уже знает его
  `agent_type`.
- **20 строк на L2** (нюансы, `contra`, `SYS`, RED без мутанта): L3 для RED требует мутантов — их зона у
  `skills:test`, диагностических мутантов у `chapter-write` нет (скилл пишущий).
- **Автору:** интервал `#remind` не регламентирован числом (только `story.reminders.max`); в `pause-lines.md`
  совет «по сцене». Нужен ли ключ вроде `story.reminders.interval_min` — решить по Э6.
- Просьбы вне путей — `requests.md` (негатив `story-plan.json`, флаг `--chapter` у `story:lint`).
