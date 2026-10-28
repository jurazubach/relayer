# S-brainstorm — ревью

Вердикт: pass

## Исправил сам

- `references/patterns-premise.md` (R-04) и `references/lessons.md` («Событие вместо правила»): пример ядра
  «номер получает чужие коды» / «номер продолжает получать его жизнь» — это ядро нашей THE NUMBER, перешедшее
  из R-04 и `video-three-things`. Заменил на придуманные («письма приходят на день раньше», «почта продолжает
  приходить на его имя»); смысл урока тот же.
- Выборка верности (20 пар, seed 43894276) записана в `docs/playbook/coverage/story-brainstorm.json`.
- Сырые данные прогонов срабатывания `docs/lab/runs/triggers/2026-10-28-story-brainstorm*.json` (прогон
  исполнителя и мой) закоммичены, как у соседних задач.

## Доделать (если fail)

—

## Проверено

- `node docs/playbook/_build/checks/skill-check.mjs story-brainstorm --min-refs 9 --min-scripts 3` →
  ✓ 0 предупреждений (22 references, 3 скрипта, примеры ink компилируются). До и после правок.
- `npm run story:coverage -- --skill story-brainstorm --min L2` → ✓ все кластеры не ниже L2 (223 строки).
- `npm run lab:triggers -- --skill story-brainstorm --runs 3 --min build --jobs 3` (сам, 386 с) →
  story-brainstorm 100% (41/41), ложных 0% (0/132); ✓ пороги пройдены. Мимо — у соседей: story-desk
  «список отложенных идей» → none ×3 (то же у исполнителя, `requests.md` п. 5), story-opening и story-mystery —
  по одной фразе, не в зоне скилла.
- `npm run test:lint` → 163/163, в т. ч. 6 тестов `selftest-story-brainstorm.mjs` (подключается `selftest.mjs`).
- `npm run test:coverage` ✓, `npm run story:coverage -- --summary` → код 0.
- Скрипты на трёх историях: `--help` у всех трёх; `premise-check.mjs --story <id> --json` читает D-01 у всех
  трёх; `directions.mjs --story <id> --json` → «нет файла» (раундов нет — ожидаемо); `ideas-bank.mjs --query
  … --json` ищет по каталогу из 3 историй.
- Все ID в references существуют (R-, A-, C-, ST- в `docs/style.md`); все ключи `skill.*`, `dict.*`, `C-NN.*` —
  в `thresholds.json`.
- Верность: 20 пар `--fidelity-sample`, все ok (bad 0 — ниже `lab.fidelity.min_share`). Вручную сверил
  `decisions-rounds.md`, `trailer.md`, `diversity.md`/`patterns-premise.md` с `chat-fiction-apps:P-07`, `P-09`,
  `edgerton-hooked:P-10`, `PAT-05`, `procedural-storytelling:P-04`, R-04, R-05: условия, «когда не работает»,
  уверенность («наша оценка») сохранены, числа источника заменены ключами или словами.
- Границы: имён контактов трёх историй в references нет; реальных брендов в примерах ink нет (название
  приложения из разборов заменено на «чат-приложение»); длинных цитат из книг нет.
- Полнота по задаче: 7 осей, два прохода (`--axes` до текста), трейлер с первой кнопкой (проверка движком),
  «ещё» (`--exclude`, повторы раундов), Б-4 (строка «не то», проверка «далеко»), банк (`ideas-bank.mjs` через
  `idea-park.mjs`), `fiction.md`, колонка «что трудно» таблицей «что придётся сделать → кто поможет», совет по
  сочетанию через R-02/R-04/R-05/R-06 — есть всё.

## Замечания на будущее

- **Пути вне разрешённых.** `docs/playbook/thresholds.json` (+212 строк, 9 ключей `skill.brainstorm.*` и 2
  словаря) и `docs/lab/runs/S-brainstorm/` правлены вне списка задачи. Прецедент есть у S-review, S-time и др.,
  исполнитель заявил это в `requests.md` п. 2; на итоге волны решить область порогов для скиллов создания
  (`AREAS` в `scripts/lib/thresholds.mjs`) — королеве.
- **Формат хранения.** `flow-review.md` §C просил все направления в `ideas.md`; исполнитель завёл
  `directions.md` (раунды) + отвергнутые в `ideas.md` через `story-desk`. Разумно, но формат `state-format.md`
  у story-desk надо дописать (`requests.md` п. 1) и свести с `build-plan.md` §7 на итоге волны.
- **`edgerton-hooked:PAT-01`** («пять сообщений» — каркас первой сцены) прямо назван в `flow-review.md` как
  опора трейлера, но `trailer.md` его в «Каркасе» не цитирует (есть только в `flags.md`). Стоит добавить
  опору при следующей правке.
- **Чужие по смыслу строки через `owner_via: cluster` (TH-02, TH-06):** `chat-fiction-apps:RED-06` (отрезок без
  кнопки — `story-pace`), `cron-wired-for-story:P-17`, `RED-16` (главный вопрос и финал — `story-core` /
  `story-endings`), `cron-wired-for-story:RED-08` (переменная-ось — `story-endings`), `dille-ultimate-guide:LESSON-06`
  (мелкий выбор с откликом — `story-choices`), `skolnick-video-game-storytelling:RED-03` (угроза до первого
  выбора — `story-opening`), `schell-art-of-game-design:RED-14` (фраза опыта — `story-core`). Перенести в
  «опору» нужных TH-NN в `owners.md`.
- Числа словами в нескольких местах («до десяти минут», «раз в две-три главы», «в первой четверти») — из
  источников и R-04, линт не роняют; при сведении волны можно заменить ключами, где ключ есть.
- Повторный живой прогон после ужесточения шагов 1 и 4 `SKILL.md` не делался (отмечено исполнителем).
