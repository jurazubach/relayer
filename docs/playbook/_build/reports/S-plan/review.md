# S-plan — ревью

Вердикт: pass

## Исправил сам

- **Порог «коридора» без ключа и без проверки.** `references/flags.md` (`ashwell-standard-patterns:RED-01`) и
  `references/patterns-structures.md` (`PAT-12`) держали число «больше 60% узлов на 100%» в тексте, а flags.md
  обещал, что это ловит `plan-check.mjs`, хотя скрипт проверял только нижнюю границу хребта (клубок). Завёл
  `skill.plan.spine.max_share` (0.6, `basis: source`, RED-01) в `thresholds.json`; `plan-check.mjs` теперь пишет
  «больше skill.plan.spine.max_share — коридор…» (hint), `plan-compare.mjs` — «коридор?» в строке хребта; оба
  `--help` обновлены; в тексте references число заменено ключом.
- `SKILL.md`, шаг 1: «новая версия плана устареет главы» → «сделает написанные главы устаревшими».
- Выборка верности (20 пар) записана в `docs/playbook/coverage/story-plan.json` (`by=review`).
- В коммит взят прогон срабатывания `docs/lab/runs/triggers/2026-10-28-story-plan.json`, сделанный на текущем HEAD
  (лежал неотслеженным).

## Доделать (если fail)

—

## Проверено

- `node docs/playbook/_build/checks/skill-check.mjs story-plan --min-refs 9 --min-scripts 3 --fixes F-15` — ✓, 0
  предупреждений (до и после правок).
- `npm run story:coverage -- --skill story-plan --min L2` — ✓ (277 строк, 190 кластеров).
- `npm run lab:triggers -- --skill story-plan --runs 3 --min build` — прогон на HEAD `1257e95` (после него менялись
  только скрипты, текст references и одна фраза шага 1 — описание и листинг не трогал, повторно не гонял):
  `ok: true`; story-plan 38/39 (промах ушёл в story-time), ложных 0; соседи: endings 44/44, brainstorm 43/44,
  time 42/44, desk 42/45; отказов в правах 6 из 222 (ниже `lab.denials.max_invalid_share`).
- Самопроверки: `scripts/lint/selftest-story-plan.mjs` — код 0; `test:lint` 167/167; `test:coverage` 12/0;
  `test:lib` 33/33; `story:coverage -- --summary` ✓ (без владельца 0, два владельца 0).
- Скрипты на трёх историях: `schedule.mjs` (текст и `--json`), `skeleton.mjs --check`, `plan-check.mjs --json` на
  the-number, slepoe-pyatno, chuzhoy-golos — работают, JSON разбирается; `plan-compare.mjs` на двух шаблонных
  скелетах (`--template`) — таблица, граница по C-39, тёмная ночь; без скелетов честно пишет «нет скелетов». У всех
  четырёх есть `--help`.
- Выборка верности `--fidelity-sample story-plan 20 --seed 48974317`: 20/20 ok (bad 0). Мелочи в заметках:
  `ashwell-standard-patterns:PAT-05` («для бота — два финала» пересказано как горлышко), `snyder-save-the-cat:PAT-03`
  (не сказано, что адаптация под пилот у источника не проверена). Ручная сверка с разборами: P-14 (порог чтений и
  обратный нюанс — ключом `skill.plan.river`), PAT-02 (откат, «когда нет»), R-10 (все пороги ключами
  `skill.plan.beats`), yorke P-06 (проверка начала главы — правда C-39 (б), сверил `story:rule C-39`), P-19
  (уверенность «одна строка рецензии» сохранена).
- Ядро `SKILL.md` — 110 строк, развилки уходят в references; описание — симптомами; модуль
  (`user-invocable: false`); пример F-15 «до/после» компилируется (skill-check), имена придуманные, род игрока не задан.
- Границы: вне разрешённых путей — `thresholds.json` (ключи `skill.plan.*`, как у S-brainstorm и S-branch),
  `docs/lab/runs/S-plan/` (сырые прогоны), `coverage/story-plan.json` (статус и выборка), отчёты — допустимо.
  `docs/books/*` и `_build/*` (кроме отчётов) не тронуты. Длинных цитат нет.

## Замечания на будущее

- **Дубли ключей со слитым story-branch** (итог волны w4-creation): `skill.plan.branches` {min 3, max 5} повторяет
  `story.branch.budget.min/max`, `skill.plan.spine.events.merge_within` — `story.branch.fan.merge_hops`. И «дорогая
  развилка» определена по-разному: у `plan-check.mjs` — кнопки ведут в разные узлы, у story-branch — ещё и
  `story.branch.expensive.msgs` сообщений в области кнопки. Свести в один ключ и одно определение (просьба п. 1
  в `requests.md`).
- **Слияние:** ветка конфликтует с `build/main` только в `CLAUDE.md` (строка таблицы) — там `merge=union`, должно
  сойтись само; `thresholds.json` сливается чисто.
- **Чужие по смыслу строки с `owner_via: cluster|refs`** (перенести в «опору» нужного TH в `owners.md`):
  начало — `choiceofgames-design:RED-21`, `choiceofgames-design:LESSON-03`, `yorke-into-the-woods:LESSON-05`,
  `yorke-into-the-woods:RED-01`, `yorke-into-the-woods:RED-02`, `narrative-testing:contra-1`,
  `narrative-testing:LESSON-06/07`, `emshort-structures:RED-14` → story-opening; паузы —
  `serial-hooks:GREEN-05`, `serial-hooks:RED-14` → story-pauses/story-time; финалы — `failbetter-qbn:RED-02`,
  `emshort-structures:RED-08` → story-endings; состав — `choiceofgames-design:RED-16`, `nicklin-writing-for-games:RED-11`
  → story-cast; тест — `bateman-game-writing:P-12`, `narrative-testing:LESSON-09` → story-playtest/story-review.
  Блоки в story-plan по ним не пустые (план учитывает эти вещи), но владелец должен быть другой.
- В references много «цен» и масштабов числами из источников («3–10 сообщений на ветку», «10–30% текста»,
  «30–60% хребта — наша оценка»). Это оценки, а не пороги проверок, линт их пропускает; если какую-то начнёт считать
  команда — сначала ключ.
- `selftest-story-plan.mjs` молчит при успехе — удобно для конвейера, но строка «N тестов прошли» помогла бы.
- `story:coverage` выдаёт новую выборку на каждый вызов `--fidelity-sample` без `--seed`: ревьюерам стоит сразу брать
  `--seed`, иначе печать и запись расходятся.
