# S-pauses — ревью

Вердикт: pass

## Исправил сам

- `scripts/lint/checks/C-26.mjs` — исключение эпилога считало последней кнопкой `-1`, если на пути кнопок нет:
  тогда `l.i >= -1` выбрасывал все паузы, и C-26 молчал на любом линейном пути (в том числе на истории без
  кнопок). Теперь `?? Infinity`: без кнопок эпилога нет, проверяются все паузы. На трёх историях вывод C-26
  не изменился.
- `scripts/lint/selftest-story-pauses.mjs` — случай «путь без кнопок, прощание перед паузой → `C-26.closing`»
  (до правки падал).
- `docs/playbook/coverage.json` — выборка верности 20 пар записана `--record … by=review`.

## Проверено

- `skill-check.mjs story-pauses --min-refs 8 --min-scripts 2 --fixes F-01,F-02,F-03` — ✓, 0 предупреждений
  (21 reference, 4 скрипта, примеры ink компилируются); повторно после правок — ✓.
- `story:coverage -- --skill story-pauses --min L2` — ✓ все кластеры не ниже L2 (до и после правок).
- `lab:triggers` — полный набор с соседями (147 запусков) не влезает в 10 минут одного вызова, поэтому
  перемерил своим файлом: `--file docs/lab/triggers/story-pauses.json --runs 3 --jobs 3 --min build`:
  story-pauses попадания 97 % (36/37), ложные 13 % (3/23), порог `--min build` пройден, код 0; недействительных
  прогонов 12 (Bash-отказы внутри прогонов). Прогон исполнителя `docs/lab/runs/S-pauses/triggers-2.*` (98 % / 5 %)
  согласуется.
- `skills:test -- --skill story-pauses` — m15, m23: 4/4, полнота 100 %, отказов 0. `skills:test --lint-only`
  после правки C-26 — полнота линта 100 %.
- `test:lint` — 92/92 (после правок); `test:story-cmd` — 36/36; `test:coverage` — ✓.
- Старое поведение: `story:lint --only C-26,C-28,C-29,C-30,C-33,C-39 --summary` на `build/main` и на ветке по трём
  историям. the-number: C-29 ℹ1→0, C-39 ℹ7→6, C-26 50 %→57 % (эпилог выпал из знаменателя); slepoe-pyatno — без
  изменений; chuzhoy-golos: C-28 ⚠60→53, C-26 ⚠6→4, C-29 ℹ22→4, C-39 ℹ16→9. Снятые — ложные из отчёта сборки,
  мутанты по-прежнему ловятся.
- `story:sessions --persona distracted` на трёх историях — строка «пачка при возвращении» и предупреждение против
  `C-28.pack` есть (T-15 закрыта).
- Скрипты скилла (`hook-pairs`, `return-pack`, `seams`, `notes-map`): `--help` и `--json` (валидный JSON) на трёх
  историях — ✓.
- Содержание: прочитаны `SKILL.md` (114 строк, развилки уведены в references), `hooks.md` целиком в части C-26/C-29,
  R-64…R-66; сверено с `story:rule R-66` (тексты совпадают, A-06 учтено). Имена персонажей трёх историй в скилле не
  встречаются; цитат длиннее 15 слов нет.
- Верность (`--fidelity-sample story-pauses 20`, seed 1948203647): 20/20 ok, bad 0 (порог `lab.fidelity.min_share`
  соблюдён). Мелкие потери записаны в note: `attention-today:P-06#нюанс` (10 мин источника → `story.pause.notice_min`
  = 15), `edgerton-hooked:PAT-08` («кнопка не позже 3-го» обобщена до `C-28.pack`), `dille-ultimate-guide:P-13`
  (низкая уверенность источника не помечена в сводном блоке R-64).

## Замечания на будущее

- **Границы.** Вне разрешённых путей: `docs/playbook/thresholds.json` (новый ключ `C-28.pack_percentile` с
  историей — нужен, иначе голое 0.9 в коде), `docs/playbook/checks.md` (одна строка «Ключи» C-28),
  `docs/playbook/coverage.json` (статусы через `--record`), `docs/lab/runs/S-pauses/*` (сырые прогоны). Всё точечно и
  по смыслу задачи; королеве стоит добавить эти пути в шаблон разрешённых для скилл-задач.
- **Тексты проверок отстали от модулей:** C-26 (эпилог), C-28 п. 2, C-29 п. 1–2, C-39 (б) — просьбы в `requests.md`
  точные, их стоит внести в `checks.md`.
- **R-70 против `attn.recap.*`** — расхождение ступеней (просьба 1) нужно свести до сборки `story-time`.
- **`owner_via: cluster|refs`, по смыслу чужие** (перенести в «опору» нужного TH в `owners.md`):
  - к `story-pace` (серии без кнопки, кривая интереса): `maass-fire-in-fiction:RED-02`, `bateman-game-writing:RED-03`,
    `bateman-game-writing:P-10`, `schell-art-of-game-design:P-05`, `schell-art-of-game-design:PAT-01`;
  - к `story-time` / `story-opening` (первая пауза истории): `serial-hooks:GREEN-07`, `serial-hooks:RED-09`,
    `serial-hooks:RED-10`;
  - к `story-mystery`: `cron-wired-for-story:PAT-02`, `cron-wired-for-story:RED-19`;
  - к `story-choices`: `chat-fiction-apps:PAT-06`, `PAT-09` (уже в просьбах исполнителя);
  - общие уроки без владельца-пауз: `bateman-game-writing:LESSON-05`, `LESSON-11`, `serial-hooks:LESSON-11`,
    `chat-fiction-apps:LESSON-07`.
- **Срабатывание:** «В середине третьей главы всё провисает» (негатив `story-pace`) 2/3 уходит в story-pauses;
  «буду через два часа» — в story-pauses. Перемерить, когда появятся `story-pace` и `story-time`; при необходимости
  сузить описание («провисает» → «стык глав провисает» уже есть, общее «провисает» отдать `story-pace`).
- Числа словами в `hooks.md` («не больше двух подряд», «не больше двух на историю») повторяют текст R-66; когда
  R-66 переведут на ключи, обновить и скилл.
- Подсказка «нет крючка» в `hook-pairs.mjs` срабатывает на угрозах утверждением («Посмотрим, куда.») — грубый
  словарь, шаг 6 SKILL.md это учитывает; кандидат в словарь угроз.
- В рабочем дереве остались неотслеживаемые `docs/lab/runs/mutants/2026-10-25-story-pauses.json` и
  `docs/lab/runs/triggers/2026-10-25-story-pauses.json` (выход по умолчанию от прогонов); не коммитил.
