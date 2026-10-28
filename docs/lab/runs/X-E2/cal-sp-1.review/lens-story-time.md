линза: story-time · история: slepoe-pyatno · режим: полный · узлов от story:lint: 2 · состояние: review

находки:
P2 · нестыковка · — (карточка, meta.json) · Карточка обещает 40 мин; по клику 17 мин (12–19), в реальном времени медиана 2 ч · правка (→ story-release): `minutes`/`days` из медианы `story:sessions` · [C-31 · замер · story.card.mismatch_ratio = 1.5 · высокая]
P2 · скучно · ch1, ch1_reading, ch1_bonus · 5 развилок без напоминаний, partner торопит «…или нам звонить в регулятор?» и молчит · правка (→ story-time): 1–2 `#remind` + `#noanswer` · [R-120 · замер guilt-scan --missing · высокая]
P2 · скучно · ch2, ch2_vera, ch2_rita, ch2_rotate · 5 развилок без напоминаний, `#silent` нет · правка (→ story-time): `#remind` у вопросов sec · [R-120 · замер · высокая]
P2 · скучно · ch3, ch3_token, ch3_ghost · 4 развилки без напоминаний · правка (→ story-time) · [R-120 · замер · средняя]
P2 · скучно · ch4_moves, ch4_cleanup и др. · «у нас пять минут на первый ход» — при молчании атака стоит на паузе · правка (→ story-time): `#remind` + `#noanswer` · [R-120 · замер · высокая]
P3 · скучно · ch1 (стр. 35–38) · `#delay:40s` + `#delay:2m` на первой минуте · правка (→ story-time): сжать до `attn.pause.early_max` · [C-32 · замер · средняя]
P3 · скучно · ch1_prng (стр. 78) · неверная догадка стоит 6 мин тишины · правка (→ story-time): укоротить, время мира в `#sys` · [модель · кандидат]

ложные (story:lint → почему не находка):
C-47.absence · ch3 · «Спасибо. Наконец-то.» — ответ на нажатую кнопку.
C-27 · паузы ≥ 15 мин объяснены.

нет данных:
—

вне линзы (передать):
story-endings · хвост, 40 мин в end_backdoor
story-release · meta.json · число на карточке
story-continuity · метки часов → facts.md
