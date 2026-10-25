# Источники `story-desk`

Сгенерировано `npm run story:coverage -- --sources story-desk --write`, руками не править. Список ID — это
уровень L1, а не покрытие: строка покрыта, когда в reference есть блок с её ID в заголовке (L2) или
знание исполняемо (L3). Отменённое (`superseded`) не переносится; «частично» — берётся часть «в силе»
(`docs/playbook/superseded.md`).

## story-desk/multi-author.md

### TH-104 · несколько авторов: владельцы глав, `INCLUDE`
- `bateman-game-writing:GREEN-06` — У каждого VAR в шапке комментарий: где ставится, где читается, на какой финал влияет (P-08) (`docs/books/_clean/bateman-game-writing/flags.md:14` · K-R-39)
- `bateman-game-writing:LESSON-03` — Рисуй структуру так, чтобы её читал не только автор (`docs/books/_clean/bateman-game-writing/lessons.md:35` · K-R-39)
- `bateman-game-writing:P-08` — Пиши структуру так, чтобы её понимал не только автор (`docs/books/_clean/bateman-game-writing/principles.md:81` · K-R-39)
- `bateman-game-writing:P-08#нюанс` — нюанс к P-08 (`docs/books/_clean/bateman-game-writing/principles.md:263`)

## story-desk/staleness.md

### TH-103 · что устаревает при смене ядра или плана; перепись ранних глав после поздних и после теста (Б-1, Б-5)
- `dille-ultimate-guide:LESSON-05` — Сверяй вторую главу с первой, когда первая готова (`docs/books/_clean/dille-ultimate-guide/lessons.md:39` · K-R-64)
- `narrative-postmortems:LESSON-14` — Разбирай главу, которая не передаёт чувство, а не доводи её (`docs/books/_clean/narrative-postmortems/lessons.md:106`)
- `narrative-postmortems:P-07` — Когда механика созрела, перепиши ранние главы под неё (`docs/books/_clean/narrative-postmortems/principles.md:55`)
- `narrative-postmortems:P-07#нюанс` — нюанс к P-07 (`docs/books/_clean/narrative-postmortems/principles.md:177`)
- `narrative-postmortems:RED-12` — Поздние главы используют теги и приёмы, которых нет в первых (`docs/books/_clean/narrative-postmortems/flags.md:33`)
- `truby-anatomy-of-story:LESSON-05` — Не пиши сцены раньше, чем устоялся механизм выбора (`docs/books/_clean/truby-anatomy-of-story/lessons.md:37`)

## story-desk/state-format.md

### TH-100 · состояние истории: шаги, кто что пишет
- `dille-ultimate-guide:SYS-1` — Устройство: конвейер документов (pitch → concept → bible → design doc → script) (`docs/books/_clean/dille-ultimate-guide/principles.md:103`)
- `procedural-storytelling:LESSON-07` — Вкладывайся в инструменты автора: они ускоряют сильнее, чем движок (`docs/books/_clean/procedural-storytelling/lessons.md:55`)
