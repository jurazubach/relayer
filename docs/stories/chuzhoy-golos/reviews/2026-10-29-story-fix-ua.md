# story-fix · 2026-10-29 · украинский сеттинг (D-12)

Перенос по `localization-ua.md`: meta.json, шапка story.ink, facts.md, главы 1–10 (шесть агентов параллельно), вычитка стыков (28 находок: правлены переносные — даты 24 июня, «пирс», «Вероника», допрос в суде → полиция; и дешёвые старые — род игрока в ch03, падежи, «полпервого»; оставлены «записка» про заметку в телефоне и разнобой подписей «не в сети»). Скрины пересобраны (17), фото кадров видео не перегенерированы: на них по-прежнему каменный карьер. fix-guard: узлы 151 → 151, переменные 97 → 97, финалы 6, ⚠ только «реплики заменены». revision-check: сохранения не ломаются, ревизия 3. Набор волны 1 пересобран.

## До и после · chuzhoy-golos

- правленые узлы: ch1, ch1_cover, ch1_jess, ch1_jess_sus, ch1_lie, ch1_ellie_lie, ch1_skip, ch1_connor, ch1_end, ch1_end.confront, ch2_truth, ch2_ellie, ch2_ellie_partial, ch2_rumor, ch2_night, ch2_unknown, ch2_school, ch2_judith, ch2_judith_reply, ch2_judith_first, ch2_judith_talk, ch2_judith_med, ch2_judith_who, ch2_hook, ch3, ch3_why, ch3_bell, ch3_owen, ch3_owen_probe, ch3_beth, ch3_fake, ch3_connor, ch3_cc_body, ch3_connor_relay, ch3_hook, ch4, ch4_unknown, ch4_reveal, ch4_blocked, ch4_ellie, ch4_please, ch4_confess, ch4_owen, ch4_jacket, ch4_late, ch4_pocket, ch5, ch5_files, ch5_owen, ch5_judith, ch5_judith_owen, ch5_final, end_coroner, end_ellie_truth, end_ellie_together, end_ellie_hides, end_owen, end_silence, ch5_maya, ch6, ch6_story, ch6_ask, ch6_cut, ch6_files_done, ch6_ellie, ch6_ellie_owen, ch6_ellie_talk, ch6_jess, ch6_owen, ch6_judith, ch6_judith_jess, ch6_hook, ch7, ch7_connor, ch7_alibi, ch7_jessnote, ch7_post, ch7_wait, ch7_tom, ch7_queue, ch7_jess, ch7_caught, ch7_jess_off, ch7_ellie, ch7_block, ch7_end, ch8, ch8_finder, ch8_show, ch8_show_ellie, ch8_ellie_late, ch8_ellie_sees, ch8_show_judith, ch8_show_maya, ch8_show_owen, ch8_jess, ch8_hart, ch8_hart_files, ch8_hart_quiet, ch8_hart_check, ch8_judith, ch8_connor, ch8_connor_ladder, ch8_night, ch9, ch9_bill, ch9_receipt, ch9_owen, ch9_owen_off, ch9_turn, ch9_maya, ch9_maya_off, ch9_judith, ch9_diary, ch9_jess, ch9_conf, ch9_jess_off, ch9_denny, ch9_beth, ch9_ellie, ch9_hook, ch10, ch10_denny, ch10_full, ch10_deny, ch10_judith, ch10_maya, ch10_anon, ch10_tom, ch10_owen, ch10_ellie, ch10_door, fin_truth, fin_herself, fin_unproven, fin_scapegoat, fin_revenge, fin_silence, fin_ellie_ref, fin_lily_screens, fin_ellie_owen, fin_coda
- story:lint, ошибок: 0 → 0
- story:lint, предупреждений: 2 → 2
- story:lint, подсказок: 189 → 194

### ушли (10)
- C-22 · ch1_cover
- C-36 · ch10
- C-39 · ch4
- C-48 · ch10_tom
- C-48 · ch1_cover
- C-48 · ch2_judith
- C-48 · ch4_owen
- C-48 · ch6
- C-48 · ch8_hart
- C-48 · ch9_receipt

### появились у правленых узлов (16)
- C-22 · ch4_confess
- C-22 · ch6_judith
- C-22 · ch6_judith_jess
- C-22 · ch8_connor_ladder
- C-22 · ch8_hart
- C-22 · ch8_night
- C-22 · ch8_show_judith
- C-22 · ch9
- C-22 · end_silence
- C-22 · fin_herself
- C-36 · ch10_full
- C-46 · ch8_show_judith
- C-48 · ch10_judith
- C-48 · ch2_judith_who
- C-48 · ch6_hook
- C-48 · ch8_hart_files

### появились в других местах — регрессия? (0)
- ничего

### метрики, которые сдвинулись (4)
- sessions · по клику, медиана: 38 мин → 39 мин
- trace · строк у 10 персон: от −1 до +1
- trace · кнопок у 1 персон: −1
- trace · по клику у 5 персон: от +18 с до +28 с

### строка для STATUS.md
- правка 2026-10-29: ушло находок 10, появилось 16 (в чужих местах 0); ошибок 0 → 0; отчёт — reviews/2026-10-29-story-fix.md
