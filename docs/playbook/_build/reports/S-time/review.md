# S-time — ревью

Вердикт: pass

Ревью попытки 3. Главное замечание прошлого ревью — скилл не ловил развилку, где собеседник ждёт ответа, а
напоминаний нет, и не предлагал их текст. Оно закрыто.

## Исправил сам

- `.claude/skills/story-time/references/no-guilt.md:95`: «компонент «напоминания» Морриса» → «Моррисона»
  (автор источника `meaningful-choice` — Morrison).
- `docs/playbook/coverage.json`: 20 записей `fidelity=ok by=review` (выборка seed 7, см. ниже).
- Сырые данные прогонов: `docs/lab/runs/triggers/2026-10-25-story-time-5.json`,
  `docs/lab/runs/mutants/2026-10-25-story-time.json`. Файл `…-story-time-4.json` остался от прерванного прошлого
  ревью (89%, 8 отказов в правах). Оставил как сырые данные.

## Доделать (если fail)

—

## Проверено

- **Замечание прошлого ревью, пункты (а)–(д):**
  - (а) `guilt-scan.mjs --missing` и `reminders.missing` в `--json`. На трёх историях находит 54 / 20 / 98
    развилок (the-number / slepoe-pyatno / chuzhoy-golos), на основе мутантов — 12. На slepoe-pyatno список
    прочитан: везде собеседник и его последняя реплика, хабов нет. Развилка `ch4_moves` с репликой из прошлого
    узла добрана по журналу бота;
  - (б) SKILL.md шаг 5: снять ложные, предложить 1–2 `#remind` по ST-66, добавить `#noanswer` / `#silent`, дать
    ink до/после;
  - (в) R-120 в `decisions-time.md`: симптом → замер → если/то → «когда не работает» → масштаб → приоритет;
  - (г) приоритет P2 записан в формате находки;
  - (д) тест в `selftest-story-time.mjs`: в список попадают обычная развилка, `#noanswer:30m`, смешанная
    развилка, `#to` без `#from`, развилка под условием. Не попадают `#remind`, хаб, меню, `#me`, `#sys`,
    служебный контакт. Есть проверка `unresolved`. Мутант не собран: нужна правка основы, это `requests.md` п. 8.
    Обосновано: в основе нет `#remind`, удалять нечего.
- **Живой прогон** (`docs/lab/runs/S-time/2026-10-25-live-reminders.md`) прочитан:
  - находки одной P2 на главу;
  - `ch2_lev` снят как ложная находка, это верно: Лев не ждёт ответа;
  - напоминания без сроков и упрёков, второе приносит новую деталь;
  - улика в «не ответил» сохранена.
- **Приёмка:**
  - `node docs/playbook/_build/checks/skill-check.mjs story-time --min-refs 9 --min-scripts 4` — ✓, 0
    предупреждений, до и после правки. Новая пара ink в `patterns-time.md` компилируется;
  - `npm run story:coverage -- --skill story-time --min L2` — ✓. После `--build-clusters` файл `clusters.json` не
    изменился. Строк чужого смысла с `owner_via: cluster|refs` в выводе нет;
  - `npm run lab:triggers -- --skill story-time --runs 3 --min build --jobs 3` — ✓:
    - story-time — 93% (39/42), ложных 6% (6/101); story-choices — 98%, story-desk — 93%;
    - мимо те же фразы, что в попытках 2–3: «Как протестировать паузы…» → none, две фразы `story-pauses` →
      story-time.

    Первый запуск упал: 102 ошибки `spawn claude ENOENT`, `claude` обновился посреди прогона. Перезапустил;
  - `npm run skills:test -- --skill story-time --jobs 3` — ✓: 5/5 мутантов, 9/9 попаданий, 1 прогон не в счёт;
  - `npm run test:lint` — 97/97, включая новый тест `waitingForks`.
- **Скрипты.** `promise-scan`, `clock-scan`, `guilt-scan`, `click-transcript` с `--help` — код 0. С
  `--story <id> --json` на the-number / slepoe-pyatno / chuzhoy-golos — код 0, JSON разбирается. Позиционный id
  работает (`guilt-scan.mjs slepoe-pyatno --missing`).
- **Выборка верности** `--fidelity-sample story-time 20 --seed 7`: 20 пар сверены с `docs/books/_clean/*` и
  сводом, все `ok`, bad — 0.
  - Условия и исключения сохранены. Отменённое помечено: A-01 у `narrative-postmortems:LESSON-01` и
    `attention§3`, A-02 у `messenger-genre:P-12` и `narrative-testing:RED-33`.
  - Классы уроков (B, C) и basis совпадают с источником.
  - Мелкие потери, не блокируют: у `yorke-into-the-woods:attention§3` опущена пометка «наша оценка» про 40 знаков
    превью; у `maass:LESSON-03` порог «≥ 10m» заменён проверкой C-27.
  - Пустых блоков ради уровня нет.
- **Границы.** `docs/books/*` и `_build/*` не тронуты, кроме своих отчётов. `owners.md` правлен точечно: опоры
  TH-46 и TH-47 плюс абзац в §5. Новые примеры выдуманные (Илья, Ума, Савва), имён из трёх историй нет. Цитат
  длиннее 15 слов нет.

## Замечания на будущее

- **`lab:triggers` сообщает «✓ пороги пройдены» при 102 ошибках запуска.** В первом прогоне по story-time не было
  ни одного действительного запуска, а строка всё равно зелёная (`--min —`). Нужен порог на долю ошибок или
  fail, если у проверяемого скилла 0 действительных прогонов. Это инфраструктура `scripts/lab`, не S-time.
- **`skills:test`: отказ в правах.** Скилл пробовал `node -e "…require('thresholds.json')…"`, чтобы прочитать
  пороги. Стоит дать в SKILL.md законный способ: `npm run -s story:rule` или ключ в справке скрипта. Мелочь,
  1 прогон из 10.
- **Шум `--missing` на каталоге** (перебор-петли на `*` в the-number) снимается на сверке. Когда появится
  пометка `// намеренно: C-32 кнопка ждёт`, её стоит поддержать в `guilt-scan`.
- **`requests.md` п. 1–9 в силе:** checks.md C-27 и C-32 п. 7, `trace` на `reproachContexts`, ST-66
  `deferred:E-02`, мутант m26 с правкой основы, общая выборка `waitingForks` для `story:trace`.
- **Вопрос автору** из build.md: ставить напоминания по всему каталогу (≈170 развилок без `#remind`) или только у
  вопросов и концов глав.
- **Перенос чужих строк по кластеру** — без изменений с прошлого ревью: PAT-02 и GREEN-02 → `story-pauses`; RED-09,
  PAT-07 и RED-03 → `story-endings`; RED-11, LESSON-09 и RED-06 → `story-choices`. Перенести, когда у владельцев
  появятся блоки.
- `selftest-story-time.mjs` импортирует `waitingForks` из `.claude/skills/story-time/scripts/`: `scripts/lint`
  зависит от каталога скилла. Если `waitingForks` уедет в `scripts/lib` (п. 9), импорт поправить.
