# S-choices-v2 — ревью

Вердикт: pass

## Исправил сам

- **Тесты C-04, C-10, C-12 в `npm run test:lint`** (п. 5 задачи). Исполнитель оставил их в `tests-proposed.mjs`, потому что
  `selftest*.mjs` нет в разрешённых путях. Я встроил три блока в `scripts/lint/selftest-wave2.mjs`: C-04 — в секцию
  «переменные», C-10 и C-12 — перед тестом владельца. Итог: 84 из 84. На модулях из `build/main` новые тесты падают
  3 из 3, то есть проверяют именно правку. Просьба №1 из `requests.md` закрыта.
- **Выборка верности** `story-choices`, 20 пар (seed 1939919491), записана в `coverage.json` (`by=review`).
- Коммит `72c5553`.

## Доделать (если fail)

—

## Проверено

**Приёмка** — все команды прошли:
- `skill-check.mjs story-choices --min-refs 12 --min-scripts 3 --fixes F-07,F-08,F-11,F-14` — ✓, 0 предупреждений;
- `skill-check.mjs story-desk --min-refs 6 --min-scripts 3` — ✓;
- `story:coverage --skill story-choices --min L2` и `--skill story-desk --min L2` — ✓;
- `skills:test --skill story-choices` — 5 мутантов, 10 из 10, полнота 100 %; m25 найден 2 из 2;
- `lab:triggers --skill story-choices --runs 3 --min build`:
  - попадания 95 % (40 из 42), ложные 0 из 12;
  - целевая фраза «Проверь развилки во второй главе, кажется там пустые кнопки» сработала 3 из 3;
  - мимо 2 из 3 прошла «Как сделать, чтобы история помнила, что игрок соврал…», у исполнителя было 3 из 3: это разброс;
- `test:lint` — 84 из 84, после моих тестов;
- `story:status --all` — три истории, шаг `review`, ядро D-01.

**Рядом** — всё ✓: `story:coverage --summary`, `--build-clusters --check`, `test:coverage`, `test:hooks`, `test:story-cmd` (36 из 36).

**Проверки на трёх историях** (`story:lint --only C-04,C-10,C-12`):
- Находка C-10 «ответил не тот» в `the-number` (`intruder`) сверена с ink и `engine.ts`: после кнопки с `#to:theo`
  нет `#from:theo`. Движок оставляет `speaker` прежним, и ответ уходит в чужой чат. Баг настоящий, исполнитель передал его автору.
- `slepoe-pyatno` ch3 — находка X-E2mini; `chuzhoy-golos` — 0 ложных.

**`stale-check`**:
- `the-number` и `slepoe-pyatno` — «ничего не устарело»: первое ядро главы больше не старит.
- `chuzhoy-golos` — одна находка п. 5 («приёмы», `#rename`). Она законная и к ядру не относится.
- `--help` и `--json` работают.

**Скилл**:
- Команды в обоих `SKILL.md` — по одной, без составных.
- Карта references сведена в одну таблицу; по одной теме — не больше двух файлов.
- Уроки:
  - LOCAL-05, LOCAL-06, LOCAL-09 (`lessons-local.md`) и LOCAL-10 (`story-desk/lessons.md`) — вывод без примеров из историй;
  - R-36 в `hubs.md` задан ключами `C-15.rare_branch_share`, `C-15.rare_branch_msgs`, `C-19.spur_msgs`; `story:rule R-36` их показывает.
- В добавленном тексте скиллов имён из наших историй нет.
- Состояние трёх историй (`docs/stories/*/STATUS.md`, `decisions.md`):
  - D-01 помечен «черновик, одобрено королевой»;
  - открытые вопросы взяты из `baseline.md`.
- Живой прогон (`live-*.md`): `permission_denials` = 0 у обоих скиллов.

**Верность**: 19 из 20 ok (95 %, порог `lab.fidelity.min_share` — 0.9).
- `bad` — `meaningful-choice:contra-9` (`contradictions.md`): доли решения потеряны — ≥ 30 % отклик обязателен,
  5–30 % — по желанию, < 5 % не пишется. Вместо них «заметная / средняя / редкая» без ключа.
- Мелкие потери чисел при `ok`:
  - `failbetter-qbn:PAT-10`: 4–8 реплик подводки стали «несколько»;
  - `narrative-postmortems:RED-03`: «5+ строк»;
  - `inkle-ingold:P-13#нюанс`: «< 20 %».
- Выборку сверял с `docs/books/_clean/*`: условия, исключения и уверенность (inkle P-12 — «низкая») сохранены.

**Границы**: `docs/books/*` не тронуты. В `_build/` — только папка отчётов задачи.

## Замечания на будущее

- **Правки вне разрешённых путей.** `docs/playbook/thresholds.json` (4 ключа) и `checks.md` (C-10 п. 5, строки
  «Ключи» у C-10, C-15, C-19) правлены точечно и с `history`. Без них не завести ключ R-36 (этого требует задача)
  и падает `test:lint`. Принял. В список путей похожих задач стоит сразу включать `thresholds.json`, `checks.md` и `scripts/lint/selftest*.mjs`.
- **`meaningful-choice:contra-9`.** Завести ключи долей (например, `C-15.echo_required_share` и `C-15.echo_skip_share`)
  и вернуть их в `contradictions.md`. Сейчас решение спора нельзя проверить.
- **Ещё две строки story-choices, похожие на чужие** (`owner_via: cluster`):
  - `attention-today:RED-07` («молчание или промедление ведут к худшему финалу») — скорее `story-time` (TH-46) или `story-endings`;
  - `narrative-postmortems:LESSON-08` («таймер — только когда герой чувствует время») — `story-time`.

  Решить при сборке `story-time`.
- **Открытые просьбы из `requests.md`:**
  - C-15 и C-19 должны считать новые ключи R-36;
  - двойной сигнал C-50 и C-10 «ответил не тот» на одном месте.
- **Незакоммиченные файлы прогонов** (`docs/lab/runs/mutants/2026-10-25-story-choices.json`, `runs/triggers/…-4.json`)
  лежат в worktree от прогонов приёмки. Путь не разрешён, я их не коммитил. Пусть конвейер решит, класть ли сырые данные в `docs/lab/runs/`.
- **Автору:** `the-number` `ch01.ink:282` — добавить `#from:theo` после кнопки «Тео, ты выходил к воротам?» (через `story-fix`).
