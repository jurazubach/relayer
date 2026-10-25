# T-03c — ревью

Вердикт: pass

## Исправил сам

- `scripts/lib/selftest.mjs`, `scripts/lint/selftest.mjs`: последняя строка — `process.exit(…)` сразу после
  `console.log(JSON…)` с `--json` (тот же приём, что п. 8 убирает в `lint.mjs`). Сейчас вывод мал (5 и 12 КБ) и не
  обрезается, но при росте числа тестов сломался бы так же. Заменено на `process.exitCode`; `test:lib`,
  `test:lint` и `--json | JSON.parse` проходят, процесс не виснет.

## Доделать (если fail)

—

## Проверено

- Приёмка, все с кодом 0: `build`, `check:story`, `test:lib` (32), `test:lint` (78), `test:story-cmd`, `story:lint`,
  `story:trace -- --help`, `skills:test -- --lint-only` (основа чистая: 0 ошибок, 0 предупреждений; полнота 22 из
  22, m16 и m17 — «только скилл» с причиной), `test:lab:mutants`, `test:coverage`. После своей правки —
  `test:lib`, `test:lint` повторно.
- До и после (отдельный worktree `build/main`, `--json`, три истории), сравнение по полям:
  - `story:trace --persona all` без поля `knot` — совпадает побайтно на the-number и slepoe-pyatno; в
    chuzhoy-golos отличается только `maxPauseKnot` (`ch6_ellie_talk` → `ch6_ellie`) — следствие п. 4;
  - `story:cast` — совпадает (без `thresholds`); `story:endings` — те же доли, меняются только имена ключей в
    подсказках (`endings.rare` → `C-40.rare_share`);
  - `story:sessions` — время то же; меняются `knot` сессий/скачков, признак `closed` (по `dict.closing`) и имена
    ключей. Выборочно сверил узел: сессия 6 the-number начинается строкой «Глава 3 · Эвакуатор» из `ch3`, а не
    `tow_plan`, — новая подпись верна;
  - `story:lint`: находок 350 → 350, 159 → 157 (C-31 2 → 1, C-38 3 → 2 — время по `#delay` как в движке),
    857 → 857; C-03 и C-06 (сообщение + узел) совпадают на всех трёх историях. Всё как в `build.md`.
- `node scripts/lint/lint.mjs chuzhoy-golos --json | node -e 'JSON.parse(…)'` — разбирается.
- Пороги: 24 ключа `thresholds.default.json` найдены в `thresholds.json` (новые или сведённые к прежним), значения
  совпадают с запасным файлом после перевода единиц; у новых есть `unit`, `basis`, `sources`. Ссылок на
  `thresholds.default`, `core/thresholds`, `core/lexicon`, `isInlineDivert`, `lineTime`, `textKnots` в `scripts/` нет.
- Код: `bot.play()` (перехват `PushToOutputStream`, узел развилки по `sourcePath`), `ink.mjs` (`INLINE_COND_RE`,
  ветки `cond`), `playtime.mjs`, `lint.mjs`, C-24, C-26 — прочитал; тесты на п. 4 и 5 есть в `test:lib`.
- Ключ мутантов: у всех `catches` — полные `алиас:RED-NN` и `C-NN`; `lint_auto: false` у m10, m11, m16, m17 с
  `lint_why`; у m19 `lint: ["C-26"]`.
- Границы: все изменённые файлы — в разрешённых путях (плюс отчёт исполнителя); `docs/books`, свод не тронуты.

## Замечания на будущее

- Сведение `sessions.*`/`click.*`/`endings.*` к прежним ключам (`story.pause.*`, `C-40.*`, `C-30.*`) вместо переноса
  под старыми именами — отступление от буквы п. 1, но по смыслу «один источник» верное; подсказки команд теперь
  называют ключи свода.
- `lint_auto: false` у m10 и m11 означает «главная проверка C-32 не может», хотя мутанта ловят смежные C-47 и C-11.
  Это шире формулировки T-13 («линт по определению не ловит»); после E-02 (C-32 п. 6–7) флаг стоит снять.
- C-24 поменяла поведение (ставка — от `story.stake.min_roots` корней); `checks.md` ещё не описывает это, как и
  правки C-26, C-11, C-53 — просьба в `requests.md` п. 4, после неё `--build-clusters`.
- Перехват `PushToOutputStream` завязан на внутренности inkjs 2.4; страхует тест в `test:lib`.
- `vars.silent_chapters` заведён, но `story:vars` его не читает.
- Вне зоны: `scripts/check-story.mjs` всё ещё обрезает `--json` в трубе; `scripts/kb`, `scripts/hooks` — на
  переадресацию `scripts/lint/thresholds.mjs` (`requests.md` п. 1–3).
