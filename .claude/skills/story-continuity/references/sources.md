# Источники `story-continuity`

Сгенерировано `npm run story:coverage -- --sources story-continuity --write`, руками не править.
Список ID — это уровень L1, а не покрытие: строка покрыта, когда в reference есть блок с её ID в заголовке
(L2) или знание исполняемо (L3). Отменённое (`superseded`) не переносится; «частично» — берётся часть
«в силе» (`docs/playbook/superseded.md`).

## story-continuity/canon.md

### TH-78 · канон серии (на будущее, E-06)
- `bateman-game-writing:P-18` — В серии держи правила мира, тон и героев (`docs/books/_clean/bateman-game-writing/principles.md:154` · K-R-05)
- `dille-ultimate-guide:P-12` — Веди канон серии так, как ведут чужую лицензию (`docs/books/_clean/dille-ultimate-guide/principles.md:84` · K-R-113)
- `dille-ultimate-guide:P-12#нюанс` — нюанс к P-12 (`docs/books/_clean/dille-ultimate-guide/principles.md:163`)
- `dille-ultimate-guide:PAT-05` — Свёртка исходов в состояние мира (канон серии) (`docs/books/_clean/dille-ultimate-guide/patterns.md:39`)
- `dille-ultimate-guide:PAT-05#нюанс` — нюанс к PAT-05 (`docs/books/_clean/dille-ultimate-guide/patterns.md:89`)
- `dille-ultimate-guide:PAT-07` — Лист рабочих документов истории (bible pack) (`docs/books/_clean/dille-ultimate-guide/patterns.md:50` · K-R-01)
- `dille-ultimate-guide:PAT-07#нюанс` — нюанс к PAT-07 (`docs/books/_clean/dille-ultimate-guide/patterns.md:91`)
- `mobile-interactive-stories:PAT-04` — Состояния мира на границе глав (world states) (`docs/books/_clean/mobile-interactive-stories/patterns.md:92`)
- `mobile-interactive-stories:RED-07` — Больше 3 состояний мира или больше 4 расходящихся развилок на главу (`docs/books/_clean/mobile-interactive-stories/flags.md:28`)
- `vogler-writers-journey:PAT-10` — Второй зов для сезона (новый вестник, Herald) (`docs/books/_clean/vogler-writers-journey/patterns.md:291` · K-R-76)
- `vogler-writers-journey:PAT-10#нюанс` — нюанс к PAT-10 (`docs/books/_clean/vogler-writers-journey/patterns.md:373`)

## story-continuity/cross-chat.md

### TH-75 · сведения между чатами
- `ashwell-standard-patterns:P-13` — Организуй квест по контактам, а не по местам (`docs/books/_clean/ashwell-standard-patterns/principles.md:102` · K-R-55)
- `ashwell-standard-patterns:P-13#нюанс` — нюанс к P-13 (`docs/books/_clean/ashwell-standard-patterns/principles.md:102`)
- `mckee-story:GREEN-06` — Игрок видит в одном чате то, чего не знает собеседник в другом, и решает, передать ли (`docs/books/_clean/mckee-story/flags.md:14` · K-R-55)
- `messenger-genre:GREEN-03` — Факт из чата A используется кнопкой в чате B (`docs/books/_clean/messenger-genre/flags.md:13` · K-R-55)
- `messenger-genre:P-10` — Заставляй сведения переходить из чата в чат (`docs/books/_clean/messenger-genre/principles.md:110` · K-R-55)
- `messenger-genre:P-10#нюанс` — нюанс к P-10 (`docs/books/_clean/messenger-genre/principles.md:247`)
- `messenger-genre:PAT-05` — Улика через чат (перенос сведений между переписками) (`docs/books/_clean/messenger-genre/patterns.md:99`)
- `mystery-fair-play:P-07` — Разводи улики по каналам (`docs/books/_clean/mystery-fair-play/principles.md:82` · K-R-55)
- `mystery-fair-play:SYS-3` — С-3. Правило трёх улик и его следствия (Alexander) (`docs/books/_clean/mystery-fair-play/principles.md:212`)
- `nicklin-writing-for-games:PAT-05` — «Объясняй план, выполняя план» (heist format) (`docs/books/_clean/nicklin-writing-for-games/patterns.md:130`)
- `nicklin-writing-for-games:PAT-05#нюанс` — нюанс к PAT-05 (`docs/books/_clean/nicklin-writing-for-games/patterns.md:291`)
- `R-55` — Раз в главу дай кнопку to в один чат с фактом, который игрок узнал в другом ( {knows …} ). Получатель реагирует, эхо возвращается в первый чат. Хотя бы раз за… (`docs/playbook/rules.md:312` · K-R-55)

## story-continuity/fixes/F-13-merge-guard.md

### TH-76 · защита слияния
- `F-13` — Защитить слияние (`docs/playbook/skills.md:644`)

## story-continuity/knowledge-flow.md

### TH-74 · кто что знает, защитная логика
- `C-51` — Знание игрока на пути (`docs/playbook/checks.md:1302`)
- `emshort-structures:GREEN-08` — Условные блоки реплик идут от узкого условия к широкому и заканчиваются else (`docs/books/_clean/emshort-structures/flags.md:16` · K-R-35)
- `emshort-structures:LESSON-12` — Условия разрастаются: без карты связей управлять ими трудно (`docs/books/_clean/emshort-structures/lessons.md:109` · K-R-35)
- `emshort-structures:RED-10` — Условный блок без else или с широкой веткой выше узкой (`docs/books/_clean/emshort-structures/flags.md:31`)
- `inkle-ingold:GREEN-03` — Персонаж в общем узле знает, писал ли ему игрок (`docs/books/_clean/inkle-ingold/flags.md:11` · K-R-35)
- `inkle-ingold:LESSON-07` — Проверяй на входе не только «нужное», но и «уже лишнее» (`docs/books/_clean/inkle-ingold/lessons.md:69` · K-R-35)
- `inkle-ingold:LESSON-10` — Сначала прочитай всё сам: если автор пролистывает, игрок тоже (`docs/books/_clean/inkle-ingold/lessons.md:94` · K-R-35)
- `inkle-ingold:P-04` — Пиши каждую сцену так, будто в неё можно прийти с любой стороны (defensive logic, защитная логика) (`docs/books/_clean/inkle-ingold/principles.md:39` · K-R-35)
- `inkle-ingold:P-04#нюанс` — нюанс к P-04 (`docs/books/_clean/inkle-ingold/principles.md:146`)
- `inkle-ingold:P-05` — Храни, что игрок знает, отдельно от того, что он сделал (`docs/books/_clean/inkle-ingold/principles.md:46` · K-R-54)
- `inkle-ingold:P-05#нюанс` — нюанс к P-05 (`docs/books/_clean/inkle-ingold/principles.md:147`)
- `inkle-ingold:PAT-03` — Защитный вход в сцену (defensive logic, защитная логика) (`docs/books/_clean/inkle-ingold/patterns.md:68`)
- `inkle-ingold:PAT-03#нюанс` — нюанс к PAT-03 (`docs/books/_clean/inkle-ingold/patterns.md:445`)
- `inkle-ingold:PAT-04` — Цепочка знаний на LIST (incremental knowledge, накопительное знание) (`docs/books/_clean/inkle-ingold/patterns.md:111`)
- `inkle-ingold:PAT-04#нюанс` — нюанс к PAT-04 (`docs/books/_clean/inkle-ingold/patterns.md:446`)
- `inkle-ingold:RED-04` — Персонаж в узле с несколькими входами говорит как при первой встрече, хотя игрок мог писать ему раньше (`docs/books/_clean/inkle-ingold/flags.md:25` · K-R-35)
- `inkle-ingold:RED-05` — Кнопка ссылается на факт, который игрок мог не узнать (`docs/books/_clean/inkle-ingold/flags.md:26`)
- `inkle-ingold:SYS-2` — SYS-2. Защитная логика (defensive logic): две проверки на входе (`docs/books/_clean/inkle-ingold/patterns.md:343`)
- `inkle-ingold:SYS-4` — SYS-4. Модель знаний (knowledge model) (`docs/books/_clean/inkle-ingold/patterns.md:369`)
- `narrative-postmortems:PAT-05` — Оборонительный хаб (defensive scripting, Sorcery!) (`docs/books/_clean/narrative-postmortems/patterns.md:123`)
- `procedural-storytelling:GREEN-03` — Условные блоки идут от узкого к общему и заканчиваются else (`docs/books/_clean/procedural-storytelling/flags.md:11` · K-R-35)
- `procedural-storytelling:GREEN-06` — Одно событие доставляется разными путями в зависимости от мира (`docs/books/_clean/procedural-storytelling/flags.md:14` · K-R-35)
- `procedural-storytelling:P-12` — Ставь частный случай перед общим и всегда оставляй общий запасной (`docs/books/_clean/procedural-storytelling/principles.md:94` · K-R-35)
- `procedural-storytelling:P-12#нюанс` — нюанс к P-12 (`docs/books/_clean/procedural-storytelling/principles.md:246`)
- `procedural-storytelling:P-14` — Делай сцену связной при любом пути прихода (`docs/books/_clean/procedural-storytelling/principles.md:116` · K-R-35)
- `procedural-storytelling:PAT-02` — Пул сцен с предусловиями и счётчиками (storylets, QBN) (`docs/books/_clean/procedural-storytelling/patterns.md:49` · K-R-35)
- `procedural-storytelling:PAT-02#нюанс` — нюанс к PAT-02 (`docs/books/_clean/procedural-storytelling/patterns.md:260`)
- `procedural-storytelling:PAT-07` — Защитная сцена-слияние (defensive convergence) (`docs/books/_clean/procedural-storytelling/patterns.md:209`)
- `procedural-storytelling:PAT-07#нюанс` — нюанс к PAT-07 (`docs/books/_clean/procedural-storytelling/patterns.md:275`)
- `procedural-storytelling:RED-04` — Многоветочный условный блок без else (`docs/books/_clean/procedural-storytelling/flags.md:23` · K-R-35)
- `procedural-storytelling:RED-05` — Широкое условие стоит выше узкого (`docs/books/_clean/procedural-storytelling/flags.md:24` · K-R-35)
- `procedural-storytelling:RED-06` — Реплика упоминает имя или факт, которого игрок на своём пути не получал (`docs/books/_clean/procedural-storytelling/flags.md:25` · K-R-35)
- `R-85` — Персонаж знает только то, что ему написали в его чат или могли переслать. Упрекает игрока («ты соврал», «ты молчал») только под условием на его выбор. Закрытый… (`docs/playbook/rules.md:451` · K-R-85)

## story-continuity/merge-guard.md

### TH-76 · защита слияния
- `R-35` — Сцены, которые игрок проходит в любом порядке, не ссылаются на факты друг друга без условия. В узел, куда ведут несколько путей, входи каскадом { - самое узкое… (`docs/playbook/rules.md:218` · K-R-35)

## story-continuity/timeline.md

### TH-77 · хронология, таблица фактов, дубли текста
- `narrative-testing:GREEN-05` — Факты с точным временем и числами повторяются одинаково во всех местах (`docs/books/_clean/narrative-testing/flags.md:13` · K-narrative-testing:GREEN-05)
- `narrative-testing:RED-10` — Факт с цифрой отличается в двух местах (`docs/books/_clean/narrative-testing/flags.md:33` · K-narrative-testing:GREEN-05)
- `narrative-testing:RED-16` — Длинная копия одного и того же текста в нескольких узлах (`docs/books/_clean/narrative-testing/flags.md:39`)
- `R-91` — До сюжета запиши правду — хронологию «время мира → событие», что на самом деле сделал противник, по шагам — в docs/stories/<id /facts.md , а не в ink. Любое… (`docs/playbook/rules.md:479` · K-R-91)
