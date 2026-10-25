# S-voice · сырые прогоны сборки скилла story-voice (2026-10-25)

| файл | что |
|---|---|
| `triggers-p1.json` | первый частичный прогон срабатывания (7 своих фраз × 3): фразу про повтор в хабе забрал `story-choices` → в описание добавлено «персонаж повторяет одну и ту же фразу» |
| `triggers-full-1.json` | `npm run lab:triggers -- --skill story-voice --runs 3 --jobs 3 --min build`: story-voice 98 % (41/42), ложных 0 %; порог сборки пройден |
| `mutants-1.json`, `mutants-2.json` | `npm run skills:test -- --skill story-voice`: m16 и m21 — 4/4 оба раза (второй — после правок C-47 и C-48) |
| `mutants-control.json` | то же с `--control --runs 1`: на чистой основе скилл дал 3 находки — род игрока в кнопке «напишу ей сама» (настоящая, C-14 её не видит — просьба в `requests.md`), повтор у одного контакта и тире в реплике (кандидаты) |
| `blind-the-number-theo-dina.json` | `blind-sample.mjs --story the-number --ask`: самая близкая пара по профилю, угадано 8 и 7 из 10 — одна сторона ниже `style.blind_min` |
| `triggers-full-postmerge.json` | тот же полный прогон после слияния `build/main` (89 фраз, 8 скиллов в листинге): story-voice 98 % (41/42), ложных 0,9 % (2/217, фраза «подруга пересказывает прошлое лекцией» у `story-opening`); соседи 84–93 %, порог пройден |
