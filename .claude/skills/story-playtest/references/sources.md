# Источники `story-playtest`

Сгенерировано `npm run story:coverage -- --sources story-playtest --write`, руками не править.
Список ID — это уровень L1, а не покрытие: строка покрыта, когда в reference есть блок с её ID в заголовке
(L2) или знание исполняемо (L3). Отменённое (`superseded`) не переносится; «частично» — берётся часть
«в силе» (`docs/playbook/superseded.md`).

## story-playtest/brief.md

### TH-91 · бриф и сборка: `.json`, `beta_stop`, входы `test_*`
- `inkle-ingold:LESSON-06` — Давай тестеру одну кнопку «отправить журнал» (`docs/books/_clean/inkle-ingold/lessons.md:61` · K-inkle-ingold:P-15)
- `inkle-ingold:P-15` — Тестируй на живых людях и сохраняй историю ходов, а не только состояние (`docs/books/_clean/inkle-ingold/principles.md:119` · K-inkle-ingold:P-15)
- `inkle-ingold:P-15#нюанс` — нюанс к P-15 (`docs/books/_clean/inkle-ingold/principles.md:157`)
- `narrative-postmortems:P-15` — Проверяй чужими руками и записывай каждый выбор (`docs/books/_clean/narrative-postmortems/principles.md:125`)
- `narrative-testing:LESSON-01` — Прикладывай к каждому отзыву всю историю выборов, а не только описание (`docs/books/_clean/narrative-testing/lessons.md:7` · K-inkle-ingold:P-15)
- `narrative-testing:P-03` — Перед тестом скажи тестеру, что искать и что уже известно (`docs/books/_clean/narrative-testing/principles.md:30`)
- `narrative-testing:P-04` — Получай транскрипт с маршрутом, а не пересказ (`docs/books/_clean/narrative-testing/principles.md:36` · K-inkle-ingold:P-15)
- `narrative-testing:P-04#нюанс` — нюанс к P-04 (`docs/books/_clean/narrative-testing/principles.md:146`)
- `narrative-testing:PAT-02` — Волны тестеров (staged beta — «бета волнами») (`docs/books/_clean/narrative-testing/patterns.md:39` · K-narrative-testing:P-05)
- `narrative-testing:PAT-03` — Вход в середину с набранным состоянием (save files for branches — «сохранения на развилках») (`docs/books/_clean/narrative-testing/patterns.md:66`)
- `narrative-testing:RED-19` — В транскрипте тестер подряд выбирает первую кнопку или «Промолчать» и не читает (`docs/books/_clean/narrative-testing/flags.md:51` · K-inkle-ingold:P-15)

## story-playtest/build.md

### TH-94 · регрессия маршрутов и эталоны
- `narrative-testing:GREEN-02` — Цель игрока понятна из чужих сообщений до первой паузы ≥1 ч (`docs/books/_clean/narrative-testing/flags.md:10`)
- `narrative-testing:PAT-01` — Эталонный транскрипт до сценария (golden transcript — «транскрипт-эталон») (`docs/books/_clean/narrative-testing/patterns.md:7` · K-inkle-ingold:P-15)
- `narrative-testing:PAT-01#нюанс` — нюанс к PAT-01 (`docs/books/_clean/narrative-testing/patterns.md:326`)
- `narrative-testing:RED-20` — Ставка (что будет, если ничего не делать) не прозвучала до первой паузы ≥1 ч на основном маршруте (`docs/books/_clean/narrative-testing/flags.md:59`)
- `narrative-testing:SYS-2` — SYS-02. Ранний групповой разбор сюжета (Narrative Review Process, Ubisoft Montreal) (`docs/books/_clean/narrative-testing/patterns.md:280`)

## story-playtest/cold-reader.md

### TH-88 · протокол холодного читателя: режимы
- `attention-today:RED-04` — Кнопка непонятна по трём сообщениям над ней (`docs/books/_clean/attention-today/flags.md:23` · K-R-46)

### без кластера TH
- `#attn-check-cold` — Холодный тест (`docs/playbook/attention-merged.md:201`)

### TH-88 · протокол холодного читателя: режимы
- `maass-fire-in-fiction:P-16` — Проверяй случайный срез переписки (`docs/books/_clean/maass-fire-in-fiction/principles.md:160`)
- `maass-fire-in-fiction:P-16#нюанс` — нюанс к P-16 (`docs/books/_clean/maass-fire-in-fiction/principles.md:246`)
- `narrative-testing:PAT-10` — Проверка пересказом (retell check) (`docs/books/_clean/narrative-testing/patterns.md:239`)
- `narrative-testing:PAT-10#нюанс` — нюанс к PAT-10 (`docs/books/_clean/narrative-testing/patterns.md:332`)
- `narrative-testing:RED-07` — В пересказе тестера ошибка в том, кто есть кто, или пустое место про цель (`docs/books/_clean/narrative-testing/flags.md:30`)
- `narrative-testing:RED-22` — Пересказ после главы 1 не называет цель игрока (`docs/books/_clean/narrative-testing/flags.md:61`)
- `narrative-testing:RED-23` — Первый контакт пишет так, что непонятно, кто он игроку (`docs/books/_clean/narrative-testing/flags.md:62`)
- `narrative-testing:SYS-5` — SYS-05. Анкета и проверка понимания (PTC, Bromley) (`docs/books/_clean/narrative-testing/patterns.md:314`)

## story-playtest/digest.md

### TH-93 · сводка: симптом, а не рецепт
- `narrative-testing:GREEN-09` — В отзыве тестера есть узел, симптом и маршрут (`docs/books/_clean/narrative-testing/flags.md:17`)
- `narrative-testing:P-06` — Повтор у нескольких тестеров чини или объясняй письменно (`docs/books/_clean/narrative-testing/principles.md:50` · K-narrative-testing:P-06)
- `narrative-testing:P-06#нюанс` — нюанс к P-06 (`docs/books/_clean/narrative-testing/principles.md:147`)
- `narrative-testing:P-09` — Отдельно спрашивай, где стало скучно и где непонятно (`docs/books/_clean/narrative-testing/principles.md:72` · K-narrative-testing:P-09)
- `narrative-testing:P-10` — Раздели отзыв на «верхний» и «нижний» уровень (`docs/books/_clean/narrative-testing/principles.md:79`)
- `narrative-testing:RED-14` — Отзыв без места («в середине было скучно») (`docs/books/_clean/narrative-testing/flags.md:37` · K-narrative-testing:P-09)
- `narrative-testing:RED-15` — Одинаковая жалоба у ≥2 тестеров без решения (`docs/books/_clean/narrative-testing/flags.md:38` · K-narrative-testing:P-06)
- `serial-hooks:LESSON-05` — Проверяй формат на том, дочитывают ли до конца, а не на том, нравится ли (`docs/books/_clean/serial-hooks/lessons.md:39`)

## story-playtest/personas.md

### TH-89 · персоны бота и профили холодных читателей
- `attention-today:LESSON-03` — Тестируй на ходу: за столом непрерывный взгляд на экран втрое длиннее (`docs/books/_clean/attention-today/lessons.md:23` · K-R-59)
- `choiceofgames-design:LESSON-09` — Учитывай, что «Ты уверен?» искажает статистику бота (`docs/books/_clean/choiceofgames-design/lessons.md:89`)
- `messenger-genre:LESSON-08` — Проверяйте страшные сцены на человеке, который знает, как это бывает (`docs/books/_clean/messenger-genre/lessons.md:71`)
- `narrative-testing:LESSON-10` — Калибруй трудность по самым медленным читателям (`docs/books/_clean/narrative-testing/lessons.md:85` · K-R-98)
- `narrative-testing:P-07` — Набирай тестеров разного склада (`docs/books/_clean/narrative-testing/principles.md:57`)
- `narrative-testing:PAT-04` — Боты с характером (persona bots — «персоны») (`docs/books/_clean/narrative-testing/patterns.md:101`)
- `narrative-testing:PAT-04#нюанс` — нюанс к PAT-04 (`docs/books/_clean/narrative-testing/patterns.md:327`)
- `narrative-testing:RED-28` — Выигрышный путь — всегда первая (или всегда последняя) кнопка (`docs/books/_clean/narrative-testing/flags.md:76`)
- `procedural-storytelling:LESSON-10` — Тестируй на прогонах, а не на друзьях (`docs/books/_clean/procedural-storytelling/lessons.md:79`)
- `schell-art-of-game-design:P-17` — Смотри на игрока, а не только на граф (`docs/books/_clean/schell-art-of-game-design/principles.md:131` · K-ashwell-standard-patterns:P-14)
- `schell-art-of-game-design:P-17#нюанс` — нюанс к P-17 (`docs/books/_clean/schell-art-of-game-design/principles.md:248`)

## story-playtest/survey.md

### TH-92 · анкета: 3 вопроса и пересказ
- `meaningful-choice:attention§4` — Нагрузка (`docs/books/_clean/meaningful-choice/attention.md:61`)
- `narrative-testing:attention§1` — Минимальная версия каждого принципа (`docs/books/_clean/narrative-testing/attention.md:5`)
- `narrative-testing:attention§4` — Нагрузка: пороги для проверок (`docs/books/_clean/narrative-testing/attention.md:98`)
- `narrative-testing:RED-18` — Средний ответ ≥5 из 7 на «мысли уходили в сторону» (`docs/books/_clean/narrative-testing/flags.md:50`)

## story-playtest/waves.md

### TH-90 · волны теста, расход свежих глаз
- `choiceofgames-design:LESSON-06` — Собирай бету ради дыр, а не ради оценки (`docs/books/_clean/choiceofgames-design/lessons.md:60`)
- `choiceofgames-design:LESSON-14` — Тестируй на большем числе людей и прикладывай сохранение к отзыву (`docs/books/_clean/choiceofgames-design/lessons.md:142`)
- `narrative-testing:contra-7` — Одни и те же тестеры или новые (`docs/books/_clean/narrative-testing/for-relayer.md:113`)
- `narrative-testing:LESSON-11` — Облегчай начало, если тестеры застревают там, где ты не ждал (`docs/books/_clean/narrative-testing/lessons.md:93` · K-R-24)
- `narrative-testing:LESSON-12` — Принимай отзывы на каждую сборку, а не к сроку (`docs/books/_clean/narrative-testing/lessons.md:101` · K-inkle-ingold:P-15)
- `narrative-testing:P-08` — Планируй несколько раундов, а в каждый новый раунд зови свежих людей (`docs/books/_clean/narrative-testing/principles.md:65` · K-R-24)
- `narrative-testing:P-08#нюанс` — нюанс к P-08 (`docs/books/_clean/narrative-testing/principles.md:148`)
- `narrative-testing:SYS-1` — SYS-01. Цикл беты (Short, IFWiki, форумы CoG) (`docs/books/_clean/narrative-testing/patterns.md:266`)
