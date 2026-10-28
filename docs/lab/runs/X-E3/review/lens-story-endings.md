линза: story-endings · история: chuzhoy-golos · режим: полный · узлов от story:lint: 21 · состояние: review

находки:
P1 · не верю · ch10_maya, ch10_maya_go → fin_revenge · fin_revenge забирает 71 % прохождений (endings-map; 64 % по tail); у персон silent, first, last, refuse — 100 %; финал наступает до ch10_door и ch10_route, мимо последнего выбора; «Подожди» срабатывает только при `maya_trust >= 3 || (jess_confessed == 2 && maya_trust >= 0)`, порог не звучит; «Промолчать» без `tom_hold` — сразу финал · правка (F-09): озвучить порог доверия Маи до кнопки; ветки «не уговорил» и «молчание» вернуть в ch10_owen → ch10_door, чтобы fin_revenge стал исходом ch10_route (R-102) · [C-40 · замер (`C-40.dominant_share` 0.5, доля 0.71) + модель · высокая]
P1 · скучно · fin_revenge, fin_coda, fin_silence, fin_scapegoat, fin_herself, fin_puppet, fin_unproven · после последней кнопки ждать часами при `story.tail.max_delay_min` 15 мин: fin_herself 13 ч 13 мин, fin_scapegoat 10 ч 49 мин, fin_silence 9 ч 58 мин, fin_revenge 9 ч 9 мин, fin_unproven 9 ч 8 мин, fin_puppet 8 ч 38 мин, fin_truth 4 ч 3 мин; эпилог на `#delay:1h`/`2h` · правка (F-12): сжать эпилог до минут, временной скачок — системной строкой без реального ожидания · [C-42 · замер · высокая]
P2 · скучно · fin_revenge, fin_herself, fin_scapegoat, fin_puppet, fin_unproven, fin_silence · после последней кнопки больше `C-42.msgs` (10) сообщений: 22 / 29 / 19 / 16 / 14 / 14; у fin_revenge 22 сообщения без кнопки, сцена у двери потеряна · правка (F-12): срезать сводку последствий до 2–3 голосов; в fin_revenge — последняя кнопка (R-102, R-110) · [C-42 · замер · высокая]
P2 · непонятно · fin_truth · ни одного финала с `// финал:`; 400 из 400 прогонов кончаются в неразмеченных узлах; молчат C-06, C-24, C-54 · правка (R-103): разметить семь финалов, перезамерить · [C-40 · замер · высокая]
P2 · непонятно · ch10_route · сводка перед финальной кнопкой частичная, 3 из 7: не звучат `jess_bond` (решает fin_herself), `fake_note_caught` (scapegoat / puppet), `bill_found`; порог `proof >= 3` игрок не знает · правка (F-10): в ch10_judith или ch10_door сводка «что есть и чего нет», лучший финал не называть · [threshold-visibility · замер · высокая]
P3 · не верю · fin_unproven, fin_silence, fin_puppet · тёмные финалы короче 0,6 самого длинного (fin_herself, 29) — читаются как наказание (R-112) · правка (F-12): сначала ужать длинные, затем сравнить · [C-41 · замер · средняя]
P3 · не верю · fin_revenge, fin_unproven, fin_herself, fin_silence, fin_puppet · рамку первого входящего возвращают только fin_truth и fin_scapegoat · правка (R-109): последняя строка от Элли или вложение той же формы · [модель · низкая]

ложные (story:lint → почему не находка):
C-41 · fin_truth · «6 против 29» замерено от косметической кнопки внутри финала; от ch10_door ~30 сообщений
C-40 · ch10_maya · «3 из 3 кнопок ведут туда» неточно — условно; доминант подтверждён
C-40 · fin_puppet · достижим целенаправленно (ch10_door при fake_note_caught = false)
C-43 · fin_silence · «вы ещё делаете опросы?» — рамка, не открытая петля

вне линзы (передать):
story-choices · ch10_maya · «Промолчать» сразу закрывает историю, silent — 100 % fin_revenge
story-time · fin_* · однотипные #delay в эпилогах, #delay:5h в начале ch10
