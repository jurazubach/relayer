# Второй проход: отчёт

## Новые источники (все открыты, кроме помеченных)
- S18 [Writing for Choice of Games: Games](https://docs.google.com/document/d/17MxymBbcIal4vh_k2w7A1vbd-H6dAorQ9O-Q5zLjCsc/edit) — руководство CoG для авторов (ссылка из S6)
- S19 [Choice of Games Style Guide](https://docs.google.com/document/d/1kiuE4AuhoH6ra-V5TOmV2jKVlJdXDxhsd_RHCUAjGVs/edit) (ссылка со [страницы Hosted Games](https://www.choiceofgames.com/write-a-hosted-game/))
- S20 [Length and Coding Efficiency](https://www.choiceofgames.com/2017/07/length-and-coding-efficiency/), Strong-Morse, 2017
- S21 [Automated Testing, ч. 1](https://www.choiceofgames.com/2018/01/how-to-get-the-most-out-of-automated-testing-part-1/) и [ч. 2](https://www.choiceofgames.com/2018/01/how-to-get-the-most-out-of-automated-testing-part-2/), Towers, 2018
- S22 [Tensions and Difficulties Created by the Vignette Structure](https://www.choiceofgames.com/2010/01/tensions-and-difficulties-created-by-the-vignette-structure/), Strong-Morse, 2010
- S23 [Authorial Intent in IF](https://www.choiceofgames.com/2010/04/make-a-choice-of-game-your-own-authorial-intent-in-if/), Strong-Morse, 2010
- S24 [How We Judge a Good Game — Part 3](https://www.choiceofgames.com/2017/04/how-we-judge-a-good-game-part-3/), Towers, 2017
- S25 [Important ChoiceScript Commands and Techniques](https://www.choiceofgames.com/make-your-own-games/important-choicescript-commands-and-techniques/) (FairMath)
- S26 [How long is too long to go without a choice](https://forum.choiceofgames.com/t/how-long-is-too-long-to-go-without-a-choice/58610), форум, Mary Duffy (сотрудница CoG, ведёт интервью в блоге студии), 2019
- S27 [Choice of Games and Discourse](https://blog.discourse.org/2015/08/choice-of-games-and-discourse/), интервью Fabulich и Hill, 2015
- S28 [Inclusivity in Choice of Games](https://www.choiceofgames.com/2017/11/inclusivity-in-choice-of-games/), Slitt, 2017; S29 [Looking for Writers](https://www.choiceofgames.com/looking-for-writers/)
- S30 [What's the origin of FairMath](https://forum.choiceofgames.com/t/whats-the-origin-of-fairmath/28563), Fabulich, 2017
- Уроки практиков (Hooked, Lifeline, Bury me, Mr. Robot, Telltale, inkle, Failbetter, Choices/Episode, авторы CoG) — ссылки прямо в `lessons.md`.

## Что добавлено по файлам
- `patterns.md` — раздел «Устройство авторских систем», `SYS-01…05`. Это машина ChoiceScript, статы и FairMath с калибровкой ботом, производственный цикл, рубрика жюри, архитектура ветвления с долей прохождения. По каждой системе — вход и выход шагов, цена пропуска шага, ошибки понимания, короткие формы. Пример машины на 5 минут на ink компилируется.
- `principles.md` — новые `P-21` (проверка двигает другую переменную), `P-22` (доля прохождения 0,2–0,4), `P-23` (первый выбор активный, клиффхэнгер перед паузой), `P-24` (длина и форма кнопок). Плюс нюансы ко всем `P-01…P-20`: когда правило не работает, пограничные случаи, 5 сообщений против 50.
- `lessons.md` — 15 уроков; цифры есть у `LESSON-01, 02, 03, 05, 09, 11, 12`.
- `attention.md` — минимальные версии принципов, что резать, отметки 30 с / 3 мин / глава, возвращение после паузы, 12 порогов нагрузки, тёмные паттерны.
- `for-relayer.md` — 8 правил генератора, проверки 18–24, скиллы `/pause-audit`, `/first-minutes`, `/tester-feedback`, наблюдения по историям, раздел «Согласия и противоречия»: 7 согласий и 10 противоречий с решениями.
- `flags.md` — `GREEN-12, 13`, `RED-17…21`. `checklists.md` — процедура «Паузы и возвращения». `README.md` — автор S7, ссылки на новые файлы.

## Закрытые вопросы `REVIEW.md`
- Автор S7 — Rachel E. Towers (подпись на странице); ей же принадлежат части 1 и 3.
- Style Guide и руководство для авторов открыты (S18, S19). Три варианта S18 называет признаком хорошего выбора. Длина варианта (15–20 слов) — S19; пять слов там — предел для кнопок перехода, а не для вариантов. Порога слов между выборами нет ни там, ни там; ближайшее — S26 (≈250 слов на экран).
- Пересчёт: в «Чужом голосе» бот встретил 146 развилок: 12/55/64/15 с 1/2/3/4 кнопками. У `ellie_trust` 23 присваивания и 5 чтений (а не 6).

## Что не нашлось
- Опубликованных данных об удержании, дочитывании и длине сессии у CoG, Lifeline, Bury me, Mr. Robot нет. Нет и конверсии бесплатных глав CoG.
- Докладов GDC от Fabulich, Strong-Morse и Hill не нашли. Расшифровок подкастов тоже нет.
- Разборов ложных уведомлений в нарративных играх не нашли.
- Не открыты, а видны только в выдаче: Quartz о Hooked; подсказки статов в Spire, Surge, and Sea!; ветка форума о проверках статов; схема «жди или плати» у Hooked. При ревью утверждения из них убраны из `lessons.md` и `attention.md`.
- Пороги нагрузки по контактам, сообщениям без выбора и минутам — наша оценка, нужна проверка на живых тестах.
