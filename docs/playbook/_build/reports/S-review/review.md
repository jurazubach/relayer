# S-review — ревью

Вердикт: pass

## Исправил сам

- `scripts/report.mjs` → `--explain` у находки «замер · не сверено» писал «сверено аудитором с узлом и правилом» —
  обещание, которого не было (LOCAL-04). Теперь для несверенной строки: «число из story:lint, с узлом ещё не
  сверено (LOCAL-04)».
- `references/lenses.md`, `schell-art-of-game-design:LESSON-12` → сомнение практика про AAA и ожидание «колода
  вернётся на полку» были слиты в одну причину; разведено, как в разборе.
- `references/lenses.md`, `snyder-save-the-cat:LESSON-04` → «когда не работает: серия из двух-трёх глав» спорило
  с порогом источника (≥ 3 глав подряд — уже предупреждение); заменено ключом `C-29.closing_repeat`, «предупреждение
  C-29» → «находка C-29» (у ключа уровень — подсказка).
- `references/lenses.md`, `snyder-save-the-cat:LESSON-01` → «правила он сам не выводит» → «она сама» (как в разборе).
- Записи верности 20 пар — `docs/playbook/coverage/story-review.json`.

## Доделать (если fail)

—

## Проверено

- `skill-check.mjs story-review --min-refs 8 --min-scripts 3` → ✓ 0 предупреждений (до и после правок).
- `story:coverage -- --skill story-review --min L2` → ✓ 34 строки, L3 — 28, L2 — 6 (до и после правок).
- `lab:triggers -- --skill story-review --runs 3 --min build --jobs 3` → ✓ пороги пройдены: `story-review` 90 %
  (37/41), ложных 0 %; весь набор 94 % (170/180). Промахи: «Где игроку станет скучно?» → `story-pace` 3/3 (см.
  `requests.md` п. 1), «скелет плана…» — 1 none + 1 отказ. 12 недействительных прогонов — отказы на Bash в
  чужих фразах (обходы модели), не в скилле. Вывод — в scratchpad, в репозиторий не клал.
- Скрипты на трёх историях: `review-cache` (295 / 138 / 671 — совпадает с отчётом исполнителя), `select-lenses
  --json`, `qa-six --json`, `merge-findings --lint-only --json`, `report --explain`; у всех пяти `--help`.
- `node scripts/lint/selftest-story-review.mjs` → код 0; `npm run test:lint` → 153/153; `test:coverage` → зелёный.
- Верность: `--fidelity-sample story-review 20` (seed 2009857675) — 18 ok, 2 bad (10 %, порог
  `lab.fidelity.min_share` 0.9 — не превышен); оба bad и одна неточность исправлены сам. Сверял разборы
  edgerton-hooked, snyder-save-the-cat, vogler, meaningful-choice, narrative-testing, nicklin, schell, LOCAL-03/04/08.
- Открыл целиком `SKILL.md`, `priority.md`, `conflicts.md`, `lenses.md` (частично), `lessons.md` (заголовки):
  развилки «когда не работает», масштаб, `basis`, класс у LOCAL; блоков-пустышек не нашёл; примеры выдуманные
  (Ася, Гоша, Ада, harbor_night), имён наших историй в references нет; длинных цитат из книг нет.
- Границы: вне разрешённых путей — `thresholds.json` (два ключа, требование задачи, `our_estimate` + `history`),
  строка в таблице `CLAUDE.md` (по его правилу «каждый новый скилл дописывает свою строку»), одна строка
  `.gitignore` (`.story-review`, обосновано в build.md), `docs/lab/runs/S-review/` (сырые прогоны). Всё точечно.
  `docs/books/*` и `_build/*` (кроме отчётов) не тронуты.

## Замечания на будущее

- `merge-findings.mjs`: отклонение с `finding` не вида `C-NN` (например, «скучно» модели) прячет **все** находки
  узла, включая баги и P1 — условие `!/^C-\d\d$/.test(d.finding)`. Стоит сужать по типу находки. И «отклонённое
  не всплывает, пока хэш тот же» не покрыто `selftest-story-review.mjs` — добавить тест (тот же хэш — скрыто,
  другой — поднято с пометкой).
- `report.mjs`: C-53 (нет разметки в шапке) типом «баг» попадает в «Поломки» — для автора это не поломка игры,
  а служебное; по LOCAL-02 разметка и так идёт первым пунктом. Может стоить отдельной строки, а не «Поломки».
- `lenses.md`: «3–5 линз», «не больше пяти на главу» — числа в тексте, а не ключом `thresholds.json`.
- `requests.md` п. 1–4 — королеве: маршрут «Где игроку станет скучно?», строки в `cold-reader.md` и
  `story-auditor.md`, `permissions.allow` для скриптов скиллов.
- Полного живого прогона всеми линзами с холодным читателем нет (только одна линза + QA); точность ревью на
  мутантах (Э2) не измерена — нужен режим `skills:test` для оркестратора с Write в `.story-review/`.
- В рабочем дереве лежит неотслеженный `docs/lab/runs/triggers/2026-10-26-story-review.json` от исполнителя — не
  закоммичен; решить, нужен ли он рядом с `docs/lab/runs/S-review/triggers-*.json`.
