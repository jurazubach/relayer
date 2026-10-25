# S-endings — ревью

Вердикт: pass

## Исправил сам

- `references/patterns-finale.md`, блок `mckee-story:PAT-06#нюанс`. Было «кнопок кризиса… три — потолок»: число
  словом без ключа, и оно расходится с источником (в разборе «на кризисе до 4»). Стало «на кризисе развилка
  может быть шире обычной, но не больше `C-12.four`».
- Выборка верности (20 пар) записана в `docs/playbook/coverage.json` с `by=review`: 19 ok, 1 bad (та же
  строка, исправлена выше).
- Свои прогоны приёмки сохранил в `docs/lab/runs/S-endings/`: `review-triggers-story-endings.json` и
  `review-mutants-story-endings.json`.

## Доделать (если fail)

—

## Проверено

- **Приёмка.** Все шесть команд прогнал сам, все зелёные.
  - `skill-check story-endings --min-refs 8 --min-scripts 2 --fixes F-09,F-10,F-12`: ✓, 0 предупреждений. Сюда
    входит компиляция примеров ink и `--help` скриптов.
  - `story:coverage --skill story-endings --min L2`: ✓.
  - `lab:triggers --skill story-endings --runs 3 --min build`: ✓. У `story-endings` 100 % попаданий (39/39) и
    4 % ложных (3/81). Все три ложных — фраза `story-choices` про trust, как и в отчёте исполнителя.
  - `skills:test --skill story-endings`: 3/3 мутанта, 6/6 попаданий, отказов в правах 0.
  - `test:lint`: 89/89. `test:story-cmd`: 36/36. Ещё прогнал `test:coverage` (11/11) и
    `story:coverage --summary` (owners §8 ✓).
- **Стык W1.** На THE NUMBER `story:endings` пишет «финалов 1» и «VAR ending — исход главы 1, не финал». Есть
  подсказка «⚠ один финал, карточка обещает несколько… (C-49, story-release)». Переменную финалом не считает.
- **Старые команды не сломаны.** Сравнил с `build/main` (worktree `_main`, тот же коммит `c5e5503`).
  - Вывод `story:endings` на «Слепом пятне» и «Чужом голосе» побайтно совпадает.
  - `story:lint --only C-06,C-07,C-40…C-43 --summary` на трёх историях меняется ровно так, как описано в
    отчёте:
    - ушли шесть ложных `C-07.callbacks` на «Слепом пятне» (общий `debrief`);
    - ушло `C-43.first_absent` про SMS оператора в THE NUMBER;
    - узел находки C-42 о времени ожидания переехал туда, где копятся паузы (`fin_revenge`, `fin_coda`,
      `ch5`).
  - Код правок C-07, C-42, C-43 и `endings.mjs` прочитан. `cardPromise` верно переводит словарь
    `dict.numerals` в числа. `endings.frame_lines` — новый ключ с `history` рядом с `endings.*`: это
    допустимая точечная правка общего реестра.
- **Скрипты.** `endings-map`, `threshold-visibility` и `tail` проверил на трёх историях: `--help` и `--json`
  работают.
- **Ядро.** `SKILL.md` содержит:
  - описание симптомами (279 знаков);
  - `user-invocable: false`, `allowed-tools` без `story:*`;
  - 9 шагов, первый — STATUS, сверка с ink до отчёта, `docs/style.md` в шаге правки;
  - карту references одной таблицей;
  - строгий формат находки, разделы «Состояние» и «Объясни».
- **References.** Читал `resolution.md` и `decisions-threshold.md` целиком, `patterns-finale.md` — частями.
  Сверил с разборами пять пунктов, все верны:
  - `messenger-genre:P-16`: «наш вывод», исключение «финал-тишина»;
  - `schell:P-04` и `schell:PAT-07`: ловушка «обрубить развязку» и нюансы 5/50;
  - `messenger-genre:P-15`;
  - `failbetter-qbn:P-07` и его нюанс про тайну;
  - `meaningful-choice:LESSON-09`.

  Числа везде заданы ключами. Блоков-пустышек не нашёл. Реальных брендов в примерах нет, длинных цитат нет.
- **Выборка верности.** `--fidelity-sample story-endings 20`: bad 1 из 20 (5 %), допустимо при
  `lab.fidelity.min_share` 0,9.
  - bad — `mckee-story:PAT-06#нюанс` (исправлено).
  - Ещё у `snyder:P-14` потеряна строка «в последней главе минимум три развилки». Смысл держит C-06, поэтому
    записано как ok с пометкой.

## Замечания на будущее

- **Чужие по смыслу строки с `owner_via: cluster|refs`.** Блоки содержательные и повёрнуты к финалу, но
  владелец по теме — другой скилл. Королеве: перенести строки в «опору» нужного TH-NN в `owners.md`.
  - `narrative-testing:RED-30` (петля «ты тут?» → «Промолчать»), `narrative-testing:LESSON-04` (формулировка
    подсказывает кнопку), `emshort-structures:LESSON-08` (неравная подача вариантов) → `story-choices`.
  - `yorke-into-the-woods:LESSON-09` (покупки ломают погружение) → `story-release`.
  - `schell-art-of-game-design:LESSON-05` (на повторе отключать ожидание) → `story-time`.
  - `dille-ultimate-guide:LESSON-03` (икона серии) → `story-continuity`.
  - `yorke-into-the-woods:LESSON-08` (лоза, а не дерево) → `story-branch` / `story-plan`.
- **Повтор в `resolution.md`.** Нюансы `schell:PAT-07#нюанс` и `schell:P-04#нюанс` почти дословно повторяют
  друг друга про кнопку в эпилоге. В источниках так и есть, но блоки можно слить.
- **Перехват фразы `story-choices`.** Фраза «trust в первой главе, читается только в финале» уходит в
  `story-endings` 3 раза из 3. Решить описанием или признать общую зону F-08 / F-09. Это открытый вопрос из
  отчёта.
- **Просьбы `requests.md` обоснованы.**
  - Текст `checks.md` для C-07, C-42, C-43 отстал от кода.
  - Нужен тест на новые поля `story:endings` (`card`, `endingVar`, `frame`) в `scripts/story/selftest.mjs`.
- **Предсуществующее, не из этой задачи.** На «Чужом голосе» в строке «финальные узлы» нет `fin_truth`, хотя в
  таблице он есть: в списке `idx.final` нет финала, в который приходят через `fin_coda`.
- **Мусор в рабочей копии.** В worktree остался неотслеживаемый `docs/lab/runs/triggers/2026-10-25-story-endings.json`
  от исполнителя. Его копия закоммичена в `docs/lab/runs/S-endings/`.
