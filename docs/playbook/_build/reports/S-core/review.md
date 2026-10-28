# S-core — ревью

Вердикт: pass

## Исправил сам

- `.claude/skills/story-core/scripts/world-clock.mjs`: без календаря таблица «начало от старта» показывала «—» у
  каждой главы, которая не открывает свою сессию (у `slepoe-pyatno` гл.2–5 идут одной сессией). Теперь начало такой
  главы — сумма реального времени глав до неё по срединному прохождению (`slepoe-pyatno`: 0 / 13 / 23 / 58 мин /
  1 ч 42 мин; у `the-number` и `chuzhoy-golos` вывод не изменился). Сверка «мир против реальной паузы» тоже
  получает начала этих глав.
- `docs/playbook/coverage/story-core.json` — 20 записей верности `by=review`.
- `docs/lab/runs/triggers/2026-10-28-story-core.json` — полный прогон приёмки `lab:triggers` (лежал неотслеженным)
  закоммичен как сырые данные.

## Доделать (если fail)

—

## Проверено

- `node docs/playbook/_build/checks/skill-check.mjs story-core --min-refs 9 --min-scripts 2` — ✓ 0 предупреждений
  (до и после правки).
- `npm run story:coverage -- --skill story-core --min L2` — ✓ все кластеры ≥ L2.
- `npm run lab:triggers -- --skill story-core --runs 3 --min build`: полный прогон (14:07, после последнего коммита
  исполнителя, 826 с — в 10 минут одного вызова не помещается) — `ok: true`, story-core 42/42, ложные 6/264 (2,3 %),
  соседи ≥ 88 %, недействительных 3. Независимо перепроверил файл фраз скилла:
  `lab:triggers -- --file docs/lab/triggers/story-core.json --runs 3 --jobs 3 --min build` — story-core 39/39,
  негативы 0 ложных, ✓ пороги.
- Скрипты: `--help` у всех трёх, `--json` валиден на трёх историях (`core-check`, `world-clock`);
  `core-snapshot.mjs` без `--draft` — понятная ошибка. Полный цикл на выдуманной истории во временной папке
  (`--dir`): черновик → `core-check --draft` (0 нерешённых) → `world-clock --draft` (календарь из 3 глав) →
  `core-snapshot --write` (D-01 с полями, «ядро: D-01» в STATUS.md, черновик удалён, шапка ink напечатана) →
  `core-check` по записанному D-01.
- `npm run test:coverage` 12/12, `npm run test:story-cmd` 38/38.
- Верность: `--fidelity-sample story-core 20` (seed 44161561) — 20/20 ok (mckee P-01/P-07, failbetter P-02#нюанс/P-05,
  truby RED-04/RED-06/GREEN-04, skolnick P-10/LESSON-11, R-07, maass PAT-06/GREEN-05/RED-12, procedural P-03/RED-02,
  mystery-fair-play RED-01, cron RED-15, ashwell RED-12, inkle contra-7, meaningful P-14#нюанс). Ещё 6 пар из
  первой выборки (inkle P-16#нюанс, R-02, snyder P-11 и нюанс, schell PAT-08, sheldon PAT-04#нюанс, choiceofgames
  P-10, snyder SYS-1) — смысл и исключения на месте; у R-02 «до 35 слов» намеренно снято до ключа
  (`requests.md` п. 1).
- Ручная сверка references с `docs/books/_clean`: `antagonist.md`, `axes.md`, `theme.md` (плюс `decisions-stakes.md`,
  `patterns-stakes.md`, `flags.md` через выборку) — условия «когда не работает», масштаб 5/50 и уверенность
  (basis) сохранены; нюанс snyder P-11 (одна-две реплики злодея за главу) есть в источнике.
- Границы: изменения в `.claude/skills/story-core/**`, `docs/lab/triggers/story-core.json`, строка в `CLAUDE.md`;
  отчёты и сырые прогоны — в `docs/lab/runs/`, `docs/playbook/_build/reports/S-core/`. `docs/books/*` не тронуты.
  Английских фрагментов длиннее 10 слов нет; совпадения 16+ слов только с нашими русскими разборами
  `docs/books/_clean` (это наш текст, не книги). Реальных брендов нет; имён героев трёх историй в примерах нет.
- Примеры ink: теги `#sys`, `#chapter`, `#delay`, `#from`, `#to` — `ready` в `capabilities.json`; компилируются
  (skill-check).

## Замечания на будущее

- **Чужие по смыслу строки с `owner_via: cluster`** — флаги, которые ловят чужие проверки; ядро на них только
  ссылается. Перенести в «опору» нужного TH в `owners.md`: `mystery-fair-play:RED-01` → TH `story-mystery` (C-54);
  `procedural-storytelling:RED-02` → `story-choices` (C-01); `ashwell-standard-patterns:RED-12` → `story-opening`
  (C-24, TH-08 «ссылается»); `mckee-story:RED-05`, `cron-wired-for-story:RED-15` → `story-pace` / `story-plan`
  (плато и лёгкий путь в главе — это ритм и скелет, не ядро).
- **Ключ `core.logline.max_words`** (`requests.md` п. 1) — без него R-02 «до 35 слов» не проверяется; добавить
  при сведении волны.
- **`owners.md`**: R-01 → `core-check.mjs` вместо `header-check.mjs`, TH-13 → `world-clock.mjs` (`requests.md` п. 2).
- **`lab:triggers --skill story-core` не помещается в 10 минут** одного вызова (826 с при `lab.triggers.jobs`=2):
  для приёмки скиллов с большим кругом соседей стоит разрешить `--jobs 3` в команде или резать прогон по `--file`.
- **story-core забирает у story-cast** фразу «неизвестный номер … перешёл на сторону игрока» (3/51 в полном
  прогоне) и фразу story-opening «срок и ставка звучат, только если нажать…» — следить при правке описаний соседей.
- В `axes.md` (failbetter P-02) масштаб «50: 1–2 переменные» соседствует с «в главе работают хотя бы две
  переменные» — формально не противоречит (первое — новые, второе — работающие), но читается как спор; при
  следующей правке уточнить.
- `core-check.mjs` помечает ось `✓`, даже если она «невидимая» или «только финал, молчит» — для автора это скорее
  предупреждение; сейчас оценку оставляет `story:vars` / `story-choices`, но значок вводит в заблуждение.
