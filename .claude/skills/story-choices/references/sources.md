# Источники `story-choices`

Сгенерировано `npm run story:coverage -- --sources story-choices --write --compact`, руками не править.
Компактная форма: ID сгруппированы по кластеру TH, без названий и путей; нюансы — отдельными строками.
Список ID — это уровень L1, а не покрытие: строка покрыта, когда в reference есть блок с её ID в заголовке
(L2) или знание исполняемо (L3). Отменённое (`superseded`) не переносится; «частично» — берётся часть
«в силе» (`docs/playbook/superseded.md`).

## story-choices/attention.md

**без кластера TH:**
`#attn-min-choice` · `#attn-min-state`

## story-choices/buttons.md

**TH-55 · текст кнопки, число вариантов, голос кнопок:**
`attention-today:LESSON-01` · `attention-today:P-01` · `attention-today:RED-01` · `attention-today:SYS-2`
`chat-fiction-apps:LESSON-08` · `choiceofgames-design:GREEN-10` · `choiceofgames-design:P-05` · `choiceofgames-design:P-24`
`emshort-structures:LESSON-03` · `emshort-structures:RED-13` · `failbetter-qbn:contra-6` · `failbetter-qbn:P-16`
`failbetter-qbn:RED-07` · `failbetter-qbn:RED-10` · `inkle-ingold:contra-4` (влит в ashwell-standard-patterns:contra-2)
`inkle-ingold:GREEN-08` · `inkle-ingold:P-08` · `inkle-ingold:P-09` · `inkle-ingold:RED-07` · `mckee-story:GREEN-05`
`mckee-story:LESSON-05` · `mckee-story:P-10` · `mckee-story:RED-09` · `mckee-story:SYS-2`
`meaningful-choice:contra-8` (влит в schell-art-of-game-design:contra-6) · `meaningful-choice:P-01` · `meaningful-choice:P-13`
`meaningful-choice:RED-09` · `messenger-genre:P-07` · `messenger-genre:P-13` · `messenger-genre:RED-08`
`mystery-fair-play:LESSON-11` · `narrative-postmortems:GREEN-08` · `narrative-postmortems:LESSON-11`
`narrative-postmortems:P-12` · `narrative-testing:RED-26` · `narrative-testing:RED-27` · `nicklin-writing-for-games:P-12`
`nicklin-writing-for-games:RED-07` · `nicklin-writing-for-games:RED-21` · `nicklin-writing-for-games:SYS-5` · `R-43` · `R-45`
`R-46` · `schell-art-of-game-design:contra-6` · `sheldon-character-storytelling:LESSON-08`
`skolnick-video-game-storytelling:LESSON-07` (влит в sheldon-character-storytelling:LESSON-03)
`attention-today:P-01#нюанс` · `choiceofgames-design:P-05#нюанс` · `inkle-ingold:P-08#нюанс` · `inkle-ingold:P-09#нюанс`
`mckee-story:P-10#нюанс` · `meaningful-choice:P-01#нюанс` · `meaningful-choice:P-13#нюанс` · `messenger-genre:P-07#нюанс`
`messenger-genre:P-13#нюанс` · `narrative-postmortems:P-12#нюанс` · `nicklin-writing-for-games:P-12#нюанс`

**без кластера TH:**
`C-12` · `C-13` · `C-16`

## story-choices/choice-types.md

**TH-53 · типы выбора и когда какой:**
`ashwell-standard-patterns:GREEN-06` · `ashwell-standard-patterns:LESSON-07` (влит в maass-fire-in-fiction:LESSON-05)
`bateman-game-writing:GREEN-05` · `bateman-game-writing:P-16` · `bateman-game-writing:PAT-07` · `bateman-game-writing:SYS-4`
`chat-fiction-apps:LESSON-04` · `choiceofgames-design:GREEN-01` · `choiceofgames-design:GREEN-09`
`choiceofgames-design:GREEN-12` · `choiceofgames-design:LESSON-02` (частично отменено A-04)
`choiceofgames-design:LESSON-07` (влит в maass-fire-in-fiction:LESSON-05) · `choiceofgames-design:LESSON-15`
`choiceofgames-design:P-01` · `choiceofgames-design:P-02` · `choiceofgames-design:P-20` · `choiceofgames-design:PAT-10`
`choiceofgames-design:RED-01` · `choiceofgames-design:RED-11` · `cron-wired-for-story:GREEN-03` · `cron-wired-for-story:P-10`
`cron-wired-for-story:RED-07` · `dille-ultimate-guide:contra-3` (влит в choiceofgames-design:contra-2)
`emshort-structures:GREEN-03` · `emshort-structures:LESSON-05` · `emshort-structures:P-06` · `emshort-structures:RED-17`
`failbetter-qbn:contra-2` · `failbetter-qbn:GREEN-05` · `failbetter-qbn:LESSON-07` · `failbetter-qbn:P-12`
`failbetter-qbn:PAT-10` · `failbetter-qbn:RED-09` · `inkle-ingold:LESSON-08` · `maass-fire-in-fiction:P-05`
`maass-fire-in-fiction:PAT-08` · `mckee-story:contra-1` · `mckee-story:LESSON-01` · `mckee-story:LESSON-11` · `mckee-story:PAT-02`
`mckee-story:PAT-10` · `mckee-story:RED-16` · `meaningful-choice:contra-1` (влит в bateman-game-writing:contra-5)
`meaningful-choice:GREEN-03` · `meaningful-choice:P-02` · `meaningful-choice:P-05` · `meaningful-choice:P-06`
`meaningful-choice:P-12` · `meaningful-choice:PAT-08` · `meaningful-choice:RED-01` · `meaningful-choice:RED-11`
`messenger-genre:contra-3` · `messenger-genre:LESSON-06` · `messenger-genre:RED-05` · `messenger-genre:SYS-2`
`narrative-postmortems:LESSON-07` · `nicklin-writing-for-games:P-11` · `nicklin-writing-for-games:PAT-06`
`nicklin-writing-for-games:RED-19` · `R-44` · `R-50` · `R-51` · `R-54` · `R-57` · `R-58` · `schell-art-of-game-design:contra-4`
`schell-art-of-game-design:GREEN-04` · `schell-art-of-game-design:LESSON-07` (влит в ashwell-standard-patterns:LESSON-08)
`schell-art-of-game-design:P-10` · `schell-art-of-game-design:P-11` · `schell-art-of-game-design:P-12`
`schell-art-of-game-design:PAT-06` · `schell-art-of-game-design:RED-08` · `sheldon-character-storytelling:contra-4`
`sheldon-character-storytelling:GREEN-07` · `sheldon-character-storytelling:P-15` · `sheldon-character-storytelling:PAT-08`
`sheldon-character-storytelling:RED-09` · `truby-anatomy-of-story:GREEN-06` · `truby-anatomy-of-story:P-10`
`truby-anatomy-of-story:RED-10` · `video-three-things:PAT-03`
`bateman-game-writing:PAT-07#нюанс` · `choiceofgames-design:P-01#нюанс` · `choiceofgames-design:P-02#нюанс`
`choiceofgames-design:P-20#нюанс` · `cron-wired-for-story:P-10#нюанс` · `emshort-structures:P-06#нюанс`
`failbetter-qbn:P-12#нюанс` · `maass-fire-in-fiction:P-05#нюанс` · `mckee-story:PAT-02#нюанс` · `mckee-story:PAT-10#нюанс`
`meaningful-choice:P-02#нюанс` · `meaningful-choice:P-05#нюанс` · `meaningful-choice:P-06#нюанс` · `meaningful-choice:P-12#нюанс`
`meaningful-choice:PAT-08#нюанс` · `nicklin-writing-for-games:P-11#нюанс` · `nicklin-writing-for-games:PAT-06#нюанс`
`schell-art-of-game-design:P-10#нюанс` · `schell-art-of-game-design:P-11#нюанс` · `schell-art-of-game-design:P-12#нюанс`
`schell-art-of-game-design:PAT-06#нюанс` · `sheldon-character-storytelling:P-15#нюанс`
`sheldon-character-storytelling:PAT-08#нюанс` · `truby-anatomy-of-story:P-10#нюанс` · `video-three-things:PAT-03#нюанс`

**TH-54 · хабы и необязательное:**
`attention-today:GREEN-03` · `bateman-game-writing:PAT-06` · `C-19` · `dille-ultimate-guide:GREEN-03`
`dille-ultimate-guide:P-09` · `dille-ultimate-guide:RED-07` · `emshort-structures:RED-05` · `emshort-structures:RED-09`
`emshort-structures:RED-15` · `failbetter-qbn:P-17` · `failbetter-qbn:RED-08` · `inkle-ingold:GREEN-06` · `inkle-ingold:LESSON-14`
`inkle-ingold:P-13` · `inkle-ingold:PAT-06` · `inkle-ingold:PAT-10` · `mobile-interactive-stories:PAT-03`
`narrative-postmortems:GREEN-02` · `narrative-postmortems:P-01` · `narrative-postmortems:PAT-01` · `narrative-postmortems:RED-06`
`narrative-testing:PAT-08` · `narrative-testing:RED-01` · `narrative-testing:RED-17` · `R-34` · `R-36`
`bateman-game-writing:PAT-06#нюанс` · `dille-ultimate-guide:P-09#нюанс` · `failbetter-qbn:P-17#нюанс` · `inkle-ingold:P-13#нюанс`
`inkle-ingold:PAT-06#нюанс` · `inkle-ingold:PAT-10#нюанс` · `mobile-interactive-stories:PAT-03#нюанс`
`narrative-postmortems:P-01#нюанс` · `narrative-testing:PAT-08#нюанс`

**без кластера TH:**
`C-10` · `C-15`

## story-choices/cost.md

**TH-58 · цена, нет лучшего, мораль не очками:**
`ashwell-standard-patterns:LESSON-14` (влит в choiceofgames-design:LESSON-12) · `bateman-game-writing:LESSON-12`
`bateman-game-writing:RED-12` · `chat-fiction-apps:GREEN-05` · `chat-fiction-apps:RED-07` · `choiceofgames-design:GREEN-06`
`choiceofgames-design:LESSON-12` · `choiceofgames-design:P-03` · `choiceofgames-design:RED-02` · `choiceofgames-design:RED-03`
`failbetter-qbn:PAT-06` · `inkle-ingold:P-14` · `maass-fire-in-fiction:GREEN-07` · `maass-fire-in-fiction:LESSON-05`
`maass-fire-in-fiction:PAT-03` · `maass-fire-in-fiction:RED-15` · `mckee-story:RED-08` · `mckee-story:RED-11`
`meaningful-choice:LESSON-02` · `meaningful-choice:LESSON-03` · `meaningful-choice:LESSON-04`
`meaningful-choice:LESSON-12` (влит в choiceofgames-design:LESSON-12) · `meaningful-choice:P-03` · `meaningful-choice:P-04`
`meaningful-choice:PAT-02` · `meaningful-choice:PAT-09` · `meaningful-choice:RED-04`
`mobile-interactive-stories:LESSON-05` (влит в choiceofgames-design:LESSON-12) · `mobile-interactive-stories:RED-01`
`mobile-interactive-stories:RED-02` · `mobile-interactive-stories:RED-11` · `mobile-interactive-stories:SYS-2`
`narrative-postmortems:GREEN-06` · `narrative-postmortems:LESSON-05` · `narrative-postmortems:P-18`
`nicklin-writing-for-games:LESSON-09` (влит в choiceofgames-design:LESSON-12) · `R-47` · `R-48` · `R-56` · `R-116`
`schell-art-of-game-design:PAT-05` · `skolnick-video-game-storytelling:LESSON-02` (влит в truby-anatomy-of-story:LESSON-01)
`truby-anatomy-of-story:LESSON-01` · `truby-anatomy-of-story:LESSON-02` (влит в meaningful-choice:LESSON-04)
`truby-anatomy-of-story:LESSON-03` · `truby-anatomy-of-story:PAT-06`
`choiceofgames-design:P-03#нюанс` · `inkle-ingold:P-14#нюанс` · `meaningful-choice:P-03#нюанс` · `meaningful-choice:P-04#нюанс`
`meaningful-choice:PAT-02#нюанс` · `meaningful-choice:PAT-09#нюанс` · `narrative-postmortems:P-18#нюанс`
`schell-art-of-game-design:PAT-05#нюанс` · `truby-anatomy-of-story:PAT-06#нюанс`

**без кластера TH:**
`C-08` · `C-18`

## story-choices/echo.md

**TH-56 · мёртвая переменная, отклик, дальность, эхо:**
`ashwell-standard-patterns:contra-1` (влит в emshort-structures:contra-3) · `ashwell-standard-patterns:contra-2`
`ashwell-standard-patterns:LESSON-01` · `ashwell-standard-patterns:P-06` · `ashwell-standard-patterns:RED-04`
`ashwell-standard-patterns:RED-05` · `bateman-game-writing:contra-5` · `bateman-game-writing:RED-04`
`bateman-game-writing:RED-18` · `C-01` · `C-02` · `C-03` · `C-04` · `C-05` · `choiceofgames-design:GREEN-02`
`choiceofgames-design:LESSON-08` · `choiceofgames-design:P-07` · `choiceofgames-design:P-14` · `choiceofgames-design:PAT-09`
`choiceofgames-design:RED-06` · `choiceofgames-design:RED-07` · `cron-wired-for-story:LESSON-06` · `cron-wired-for-story:RED-14`
`dille-ultimate-guide:LESSON-07` · `dille-ultimate-guide:P-11` · `dille-ultimate-guide:RED-05` · `emshort-structures:contra-3`
`emshort-structures:GREEN-06` · `emshort-structures:LESSON-11` · `emshort-structures:P-09` · `emshort-structures:P-15`
`emshort-structures:P-16` · `emshort-structures:RED-01` · `emshort-structures:RED-02` · `emshort-structures:RED-03`
`failbetter-qbn:P-09` · `inkle-ingold:contra-3` (влит в emshort-structures:contra-3) · `inkle-ingold:GREEN-02`
`inkle-ingold:P-02` · `inkle-ingold:P-03` · `inkle-ingold:P-06` · `inkle-ingold:RED-02` · `inkle-ingold:RED-06`
`maass-fire-in-fiction:RED-06` · `maass-fire-in-fiction:RED-07` · `maass-fire-in-fiction:RED-08`
`mckee-story:contra-2` (влит в emshort-structures:contra-3) · `meaningful-choice:contra-5` (влит в emshort-structures:contra-3)
`meaningful-choice:contra-7` · `meaningful-choice:contra-9` · `meaningful-choice:GREEN-02` · `meaningful-choice:GREEN-06`
`meaningful-choice:LESSON-01` · `meaningful-choice:P-08` · `meaningful-choice:P-09` · `meaningful-choice:PAT-01`
`meaningful-choice:PAT-03` · `meaningful-choice:RED-10` · `messenger-genre:contra-5` (влит в bateman-game-writing:contra-5)
`mobile-interactive-stories:GREEN-04` · `mobile-interactive-stories:LESSON-08` · `mobile-interactive-stories:P-06`
`mobile-interactive-stories:PAT-02` · `mobile-interactive-stories:RED-09`
`narrative-postmortems:contra-2` (влит в bateman-game-writing:contra-5) · `narrative-postmortems:contra-6`
`narrative-postmortems:GREEN-01` · `narrative-postmortems:LESSON-08` · `narrative-postmortems:LESSON-10`
`narrative-postmortems:P-03` · `narrative-postmortems:P-04` · `narrative-postmortems:PAT-03` · `narrative-postmortems:RED-01`
`narrative-postmortems:RED-02` · `narrative-postmortems:RED-03` · `narrative-postmortems:SYS-1`
`narrative-testing:contra-3` (влит в emshort-structures:contra-3) · `narrative-testing:GREEN-10` · `narrative-testing:PAT-05`
`narrative-testing:PAT-06` · `narrative-testing:RED-02` · `narrative-testing:RED-03` · `narrative-testing:RED-04`
`narrative-testing:RED-24` · `nicklin-writing-for-games:contra-1` (влит в bateman-game-writing:contra-5)
`nicklin-writing-for-games:RED-20` · `procedural-storytelling:contra-1` (влит в emshort-structures:contra-3)
`procedural-storytelling:GREEN-01` · `procedural-storytelling:LESSON-05` · `procedural-storytelling:P-02`
`procedural-storytelling:P-10` · `procedural-storytelling:PAT-05` · `procedural-storytelling:RED-01`
`procedural-storytelling:RED-03` · `procedural-storytelling:RED-10` · `R-40`
`sheldon-character-storytelling:contra-1` (влит в emshort-structures:contra-3) · `sheldon-character-storytelling:GREEN-01`
`sheldon-character-storytelling:GREEN-05` · `sheldon-character-storytelling:LESSON-03`
`sheldon-character-storytelling:LESSON-06` · `sheldon-character-storytelling:LESSON-07` (влит в narrative-postmortems:LESSON-10)
`sheldon-character-storytelling:P-06` · `sheldon-character-storytelling:P-08` · `sheldon-character-storytelling:PAT-05`
`sheldon-character-storytelling:RED-01` · `sheldon-character-storytelling:RED-04` · `sheldon-character-storytelling:SYS-3`
`sheldon-character-storytelling:SYS-4` · `skolnick-video-game-storytelling:LESSON-04` (влит в narrative-postmortems:LESSON-10)
`snyder-save-the-cat:RED-15`
`ashwell-standard-patterns:P-06#нюанс` · `choiceofgames-design:P-07#нюанс` · `choiceofgames-design:P-14#нюанс`
`dille-ultimate-guide:P-11#нюанс` · `emshort-structures:P-09#нюанс` · `emshort-structures:P-16#нюанс` · `inkle-ingold:P-02#нюанс`
`inkle-ingold:P-03#нюанс` · `inkle-ingold:P-06#нюанс` · `meaningful-choice:P-08#нюанс` · `meaningful-choice:P-09#нюанс`
`meaningful-choice:PAT-01#нюанс` (влит в meaningful-choice:P-09#нюанс) · `meaningful-choice:PAT-03#нюанс`
`narrative-postmortems:P-03#нюанс` · `narrative-postmortems:P-04#нюанс` · `narrative-testing:PAT-05#нюанс`
`procedural-storytelling:P-10#нюанс` · `sheldon-character-storytelling:P-06#нюанс` · `sheldon-character-storytelling:P-08#нюанс`
`sheldon-character-storytelling:PAT-05#нюанс`

**без кластера TH:**
`C-09`

## story-choices/fixes/F-07-live-button.md

**TH-87 · указатель приёмов:**
`F-07`

## story-choices/fixes/F-08-echo.md

**TH-87 · указатель приёмов:**
`F-08`

## story-choices/fixes/F-11-bottleneck.md

**TH-87 · указатель приёмов:**
`F-11`

## story-choices/fixes/F-14-menace.md

**TH-87 · указатель приёмов:**
`F-14`

## story-choices/people-choice.md

**TH-59 · выбор между людьми: уравнять знакомство:**
`ashwell-standard-patterns:LESSON-08` · `C-17` · `choiceofgames-design:LESSON-11` (влит в ashwell-standard-patterns:LESSON-08)
`maass-fire-in-fiction:P-06` · `narrative-postmortems:LESSON-06` · `narrative-postmortems:P-05` · `narrative-postmortems:PAT-07`
`narrative-postmortems:RED-05` · `R-49` · `sheldon-character-storytelling:LESSON-05` (влит в ashwell-standard-patterns:LESSON-08)
`sheldon-character-storytelling:SYS-1` · `skolnick-video-game-storytelling:LESSON-01` (влит в ashwell-standard-patterns:LESSON-08)
`truby-anatomy-of-story:GREEN-07`
`narrative-postmortems:P-05#нюанс`

## story-choices/silence.md

**TH-57 · молчание как ход; спор с CoG:**
`attention-today:RED-07` · `choiceofgames-design:contra-2` · `choiceofgames-design:P-04` · `choiceofgames-design:RED-04`
`inkle-ingold:contra-2` (влит в choiceofgames-design:contra-2) · `inkle-ingold:P-07` · `inkle-ingold:P-12` · `inkle-ingold:PAT-05`
`inkle-ingold:RED-03` · `meaningful-choice:contra-3` (влит в choiceofgames-design:contra-2) · `meaningful-choice:GREEN-05`
`meaningful-choice:LESSON-08` (влит в sheldon-character-storytelling:LESSON-09) · `meaningful-choice:P-11`
`meaningful-choice:PAT-04` · `narrative-testing:contra-2` (влит в choiceofgames-design:contra-2) · `narrative-testing:GREEN-08`
`nicklin-writing-for-games:contra-2` (влит в choiceofgames-design:contra-2) · `nicklin-writing-for-games:RED-06` · `R-52` · `R-53`
`sheldon-character-storytelling:LESSON-09` · `vogler-writers-journey:PAT-06`
`choiceofgames-design:P-04#нюанс` · `inkle-ingold:P-07#нюанс` · `inkle-ingold:P-12#нюанс`
`inkle-ingold:PAT-05#нюанс` (влит в inkle-ingold:P-12#нюанс) · `meaningful-choice:P-11#нюанс`
`meaningful-choice:PAT-04#нюанс` (влит в meaningful-choice:P-11#нюанс) · `vogler-writers-journey:PAT-06#нюанс`

**без кластера TH:**
`C-11`
