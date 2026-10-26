# Источники `story-review`

Сгенерировано `npm run story:coverage -- --sources story-review --write`, руками не править.
Список ID — это уровень L1, а не покрытие: строка покрыта, когда в reference есть блок с её ID в заголовке
(L2) или знание исполняемо (L3). Отменённое (`superseded`) не переносится; «частично» — берётся часть
«в силе» (`docs/playbook/superseded.md`).

## story-review/finding-format.md

### TH-28 · формат находки, уровни «замер / модель / человек»
- `LOCAL-02` — · Без разметки A-06 часть проверок на старых историях молчит (`docs/playbook/local-lessons.md:21`)
- `LOCAL-03` — · Bash(npm run story: ) не пропускает ни одной команды story: (`docs/playbook/local-lessons.md:30`)
- `LOCAL-04` — · Модель повторяет ложные срабатывания замера, не сверив их с ink (`docs/playbook/local-lessons.md:43`)
- `LOCAL-07` — · Основа мутантов чиста для линта, но не для модели (`docs/playbook/local-lessons.md:72`)
- `LOCAL-08` — · Отложенная история не отложена для команд (`docs/playbook/local-lessons.md:82`)
- `mckee-story:LESSON-12` — Переводи «по вкусу» Макки в пороги, иначе советом не воспользуются (`docs/books/_clean/mckee-story/lessons.md:104`)
- `narrative-testing:P-02` — Раздели «работает по замыслу» и «замысел хорош» (`docs/books/_clean/narrative-testing/principles.md:23` · K-R-63)

## story-review/lenses.md

### TH-30 · линзы теорий как «упущенные возможности»
- `cron-wired-for-story:contra-4` — Шаблон битов или ядро? (`docs/books/_clean/cron-wired-for-story/for-relayer.md:113`)
- `meaningful-choice:SYS-1` — SYS-1. Четыре компонента Morrison (awareness → consequences → permanence, reminders поверх) (`docs/books/_clean/meaningful-choice/principles.md:112`)
- `meaningful-choice:SYS-2` — SYS-2. Интересные решения Мейера (`docs/books/_clean/meaningful-choice/principles.md:125`)
- `meaningful-choice:SYS-3` — SYS-3. Три свойства Compton и случаи, когда выбор не нужен (`docs/books/_clean/meaningful-choice/principles.md:142`)
- `meaningful-choice:SYS-4` — SYS-4. Discernable и integrated (Salen & Zimmerman) (`docs/books/_clean/meaningful-choice/principles.md:150`)
- `schell-art-of-game-design:LESSON-12` — Брать из колоды линз несколько карт на проход, а не всю колоду (`docs/books/_clean/schell-art-of-game-design/lessons.md:95`)
- `schell-art-of-game-design:SYS-2` — Система 2. Линзы как метод ревью (`docs/books/_clean/schell-art-of-game-design/principles.md:194`)
- `snyder-save-the-cat:contra-1` — Схема до текста или после (`docs/books/_clean/snyder-save-the-cat/for-relayer.md:136`)
- `snyder-save-the-cat:LESSON-01` — Накладывай биты на готовый черновик и смотри, что стоит на позициях поворотов (`docs/books/_clean/snyder-save-the-cat/lessons.md:21` · K-R-30)
- `snyder-save-the-cat:LESSON-04` — Прячь биты: видимая схема хуже пропущенной (`docs/books/_clean/snyder-save-the-cat/lessons.md:45` · K-R-87)
- `snyder-save-the-cat:LESSON-12` — Бери из метода инструмент, а не книгу (`docs/books/_clean/snyder-save-the-cat/lessons.md:109`)
- `truby-anatomy-of-story:contra-5` — Структура до текста или после (`docs/books/_clean/truby-anatomy-of-story/for-relayer.md:124`)
- `vogler-writers-journey:LESSON-01` — Держи путь героя как карту для проверки, а не как бланк для заполнения (`docs/books/_clean/vogler-writers-journey/lessons.md:19` · K-R-10)
- `vogler-writers-journey:LESSON-02` — На ревью ищи упущенные возможности, а не переписывай (`docs/books/_clean/vogler-writers-journey/lessons.md:27` · K-R-101)
- `vogler-writers-journey:P-01` — Сверяй историю со стадиями после черновика, а не пиши по ним (`docs/books/_clean/vogler-writers-journey/principles.md:7` · K-R-10)
- `vogler-writers-journey:P-01#нюанс` — нюанс к P-01 (`docs/books/_clean/vogler-writers-journey/principles.md:197`)
- `yorke-into-the-woods:P-15` — Используй форму для ревизии, а не как формулу (`docs/books/_clean/yorke-into-the-woods/principles.md:142` · K-R-10)

## story-review/priority.md

### TH-29 · приоритет: непонятное раньше скучного, конфликты правок
- `edgerton-hooked:LESSON-01` — Чини непонятное начало раньше, чем «скучное» (`docs/books/_clean/edgerton-hooked/lessons.md:20`)
- `narrative-testing:P-05` — Записывай проблему, а не предложенное решение (`docs/books/_clean/narrative-testing/principles.md:43` · K-narrative-testing:P-05)
- `narrative-testing:P-15` — Различай «скучно», «непонятно» и «не верю» (`docs/books/_clean/narrative-testing/principles.md:116` · K-R-24)
- `narrative-testing:P-15#нюанс` — нюанс к P-15 (`docs/books/_clean/narrative-testing/principles.md:152`)
- `nicklin-writing-for-games:LESSON-10` — Плохой текст — симптом процесса: чини условия и порядок отклика, а не только строки (`docs/books/_clean/nicklin-writing-for-games/lessons.md:86`)
- `nicklin-writing-for-games:SYS-1` — Critical Response (критический отклик) — как он устроен (`docs/books/_clean/nicklin-writing-for-games/patterns.md:251`)
- `snyder-save-the-cat:LESSON-05` — Чини непонятное начало раньше, чем «скучное» (`docs/books/_clean/snyder-save-the-cat/lessons.md:53` · K-R-24)

## story-review/qa-six.md

### TH-31 · QA «шесть списков»
- `narrative-testing:attention§3` — Возвращение после паузы (`docs/books/_clean/narrative-testing/attention.md:58`)
- `narrative-testing:P-14` — Проводи отдельный проход нарративного QA по шести пунктам (`docs/books/_clean/narrative-testing/principles.md:109` · K-R-75)
- `narrative-testing:SYS-4` — SYS-04. Шесть категорий нарративного QA (Ryan) (`docs/books/_clean/narrative-testing/patterns.md:302`)
