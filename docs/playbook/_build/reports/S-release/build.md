# S-release · Скилл story-release — сборка

## Сделано

- **`.claude/skills/story-release/SKILL.md`** (119 строк): пользовательский вход; гейт выпуска «готово → честно →
  не ломает» за 9 шагов, первый — `STATUS.md`; `docs/style.md` — в шаге, где предлагается текст карточки;
  границы с `story-plan`, `story-time`, `story-endings`, `story-pauses`, `story-playtest`, `story-continuity`,
  `story-fix`, `story-desk`; карта references; 8 главных правил по ID; формат находки; «Состояние»; «объясни».
- **references (17 файлов):** `decisions-release.md` (развилки гейта), `card.md` (R-11, C-49, TH-95),
  `teasers.md` (затравки: C-49 (ж), стиль), `two-durations.md` (TH-98, формула), `free-boundary-gate.md` (TH-97),
  `ethics.md` (единственный источник по этике и монетизации, R-115, семь вопросов выпуска), `ethics-sources.md`
  (раздел 5 двадцати семи разборов — вклад каждого), `attention.md` (`#attn-ethics` без пересказа, числа — ключами,
  столбец источников вынесен), `versioning.md` (TH-99), `patterns-release.md` (3 примера ink: граница на
  развилке, обещание карточки в главе 1, тяжёлая сцена с обходом), `lessons.md` (19 карточек с классом A/B/C),
  `flags.md`, `contradictions.md` (7 споров с учётом A-01, A-03, A-04, A-05), `explain.md`,
  `systems/release-gate.md`, `systems/dark-patterns.md` (SYS-4), `sources.md` (сгенерирован).
- **scripts (6):** `release-gate.mjs` (все пункты гейта, код 1 при ✗), `card-check.mjs` (C-49 по пунктам, счёт
  глав и героев, два времени), `durations.mjs` (медианы `story:sessions` → `minutes`/`days`, как покажет
  карточка), `boundary-check.mjs` (крючок, выплата, пауза после открытия, доля дошедших, C-26/C-39 на стыке,
  `--free N`), `revision-check.mjs` (ломает ли правка сохранения против тега `<id>-rN`), `pack.mjs`
  (`story:pack --check`, `--write` со сверкой полей карточки). У всех `--help` и `--json`.
- **`scripts/lint/checks/C-49.mjs`:** (б) не считает спойлером героя-завязку, имя которого звучит в главе 1;
  новые (ж) затравки — число, поздние имена и числа, опора на завязку и главу 1, стиль `docs/style.md`; (з)
  обещание финалов в карточке против финалов бота (та же раскладка, что у C-40 и `story:endings`); пункт
  `features` о финалах больше не ищется словами в репликах.
- **`scripts/lint/selftest-story-release.mjs`:** 6 тестов — дефект и чистый двойник на (б), (ж) ×4, (з).
- **`docs/playbook/thresholds.json`** (рядом с C-49): `C-49.known_chapter`, `C-49.teasers`, `C-49.teaser_chapter`,
  `C-49.teaser_ground`, `C-49.teaser_style`, `C-49.teaser_chars`, `C-49.endings_min`, `C-49.endings_word`,
  `skill.release.lint_errors`, `skill.release.boundary.{hook_lines,payoff_lines,pause_max_min,reach_share}`,
  `skill.release.card.minutes_step` — у всех опора и `history`.
- **`docs/playbook/checks.md` C-49:** текст (б) уточнён, добавлены (ж) и (з), строка «Ключи», два шаблона
  сообщений. Только раздел своей проверки.
- **`docs/lab/triggers/story-release.json`:** 12 позитивов, 7 негативов (5 с `expect`).
- **`CLAUDE.md`:** строка в таблице «симптом → скилл».
- **`docs/lab/runs/S-release/`:** сырые прогоны `lab:triggers` и `skills:test`.

## Решения

- **Затравки проверяет C-49 (ж), а не новая проверка.** Задача отдаёт мне только C-49; затравки — часть карточки
  (R-11), поэтому они ушли новым пунктом той же проверки со своими ключами `C-49.teaser_*`. Длина затравки —
  свой ключ `C-49.teaser_chars`: test:lint запрещает чужие ключи (`C-34.*`) в модуле C-49.
- **(б) уточнена по калибровке на трёх историях:** «Рэй Колдуэлл» в карточке the-number — пропавший, о котором
  говорят с первой главы; это завязка, а не спойлер. Новый ключ `C-49.known_chapter` опирается на
  `video-three-things:P-10` («имена из описания впервые появляются в первой главе»).
- **(з) обещание финалов** — вместо поиска слов «финал» в репликах (давал ложную находку на slepoe-pyatno и
  chuzhoy-golos, у которых семь финалов): число финалов бота той же функцией, что у C-40. Результат совпал с
  открытым вопросом `docs/stories/the-number/STATUS.md` (TN-04: финал один, карточка обещает несколько).
- **`days` округляется так, как покажет карточка** (`library.ts` `daysText`: от суток — дни, меньше — часы), а
  не шагом: шаг в полдня дал бы slepoe-pyatno «≈ 12 ч» при медиане 2 ч. Ключ `days_step` заводить не стал.
- **Граница: «сразу» = пауза строки `#chapter` и строк до выплаты** — движок встаёт до этой паузы
  (`capabilities.json` paywall), поэтому заплативший её ждёт. Порог `skill.release.boundary.pause_max_min` —
  наша оценка (INTENT «сбывается сразу»), калибровки нет.
- **Вторая волна = симуляция тоже** (INTENT: живых тестов в этом проходе нет): гейт принимает `playtests/wave-2/`,
  `sim-<дата>/` и отчёт `story-playtest` о второй волне, и сверяет дату с последней правкой истории.
- **Дубли уроков — одним блоком с несколькими ID**, а не статусом `merged-into`: пять пересказов одного
  постмортема о бесплатной модели и два — об одном исследовании сериалов; блок верен каждому источнику.
- **`pack.mjs` по умолчанию ничего не пишет** — `--write` только после одобрения: в прогонах мутантов скилл не
  должен создавать файлы.

## Проверки

- `node docs/playbook/_build/checks/skill-check.mjs story-release --min-refs 8 --min-scripts 4` — ✓, 0
  предупреждений.
- `npm run story:coverage -- --skill story-release --min L2` — ✓: строк 78, L3 — 28, L2 — 50, ниже L2 нет.
  На L2 из проверяемых — RED (L3 только с мутантом), `serial-hooks:P-12#нюанс`, `video-three-things:GREEN-01`.
- `npm run lab:triggers -- --skill story-release --runs 3 --min build` (с `--jobs 3`, 630 с) — ✓: story-release
  92 % (36/39), ложных 1 % (3/209); соседи 93–100 %. Промах: «Не будет ли это тёмным паттерном — сделать первую
  главу бесплатной…» → модель ответила сама (none ×3). Ложное: фраза story-time «на карточке 30 минут, а по
  факту три дня» ушла в story-release ×3 — это TH-98 (`requests.md` п. 4). Отказы в правах — 20 у соседей
  (составные команды), прогоны не в счёт. Сырьё — `docs/lab/runs/S-release/triggers-1.*`.
- `npm run skills:test -- --skill story-release` (с `--jobs 2`) — ✓: m19 2/2, полнота 100 %, отказов 0.
  Сырьё — `docs/lab/runs/S-release/mutants-1.*`.
- `npm run test:lint` — ✓ 175 из 175.
- Ещё: `npm run skills:test -- --lint-only` — полнота линта 100 % (24/24); `npm run test:coverage` — ✓;
  `npm run story:coverage -- --summary` — без дублей и строк без владельца.
- **Сверка скриптов с командами на трёх историях:** `durations.mjs` = медианы `story:sessions` (the-number:
  24 ч 27 мин и 18 мин); `card-check.mjs` = `story:lint --only C-49`; счёт ошибок и предупреждений в
  `release-gate.mjs` = `story:lint` (the-number 5/68, slepoe-pyatno 0/53); `boundary-check.mjs` на m19 — C-26 и
  C-39 те же, что в линте.

## Открыто

- Мутант в зоне один (m19); затравки и обещание финалов скилл держит без мутантов — просьба в `requests.md` п. 1.
- `skill.release.boundary.pause_max_min` и `skill.release.boundary.reach_share` — наша оценка без калибровки:
  ни у одной истории каталога нет `free_chapters`. На `--free 1` the-number получает ⚠ «после открытия ждать 6 ч»
  — это и есть случай, ради которого порог, но число не проверено на людях.
- Выплата на границе меряется общими основами слов крючка и начала платной главы: крючок-решение («кому
  поверить») словами не совпадает с последствием — скилл предписывает сверку окна глазами.
- **Автору:** три истории каталога сейчас гейт не проходят — the-number: ошибки C-01 ×5, нет второй волны,
  карточка обещает несколько финалов при одном; slepoe-pyatno: `minutes` 40 при медиане 17 мин; chuzhoy-golos:
  176 ч реального времени — больше `story.length.max_h` (решение по длине — у `story-time`).
- **Автору:** промах на фразе про «первая глава бесплатно, остальное платно — тёмный паттерн?» — модель отвечает
  на вопрос об этике без скилла. Если такой вопрос должен вести в скилл, нужна фраза в `description`; бюджет
  описания 252 из 300 знаков.
