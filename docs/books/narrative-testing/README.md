# Тестирование и ревью интерактивных сюжетов

- **Авторы:** Emily Short; John Ryan (SFWA); Jonathan Dankoff (Ubisoft Montreal, GDC 2015); сообщество Choice of Games; PlaytestCloud.
- **Тип:** подборка статей, форумных обсуждений и доклада; годы 2014–2024.
- **Открыто и прочитано:**
  - Emily Short, «Suggestions for Testing» — https://emshort.blog/how-to-play/writing-if/my-articles/suggestions-for-testing/
  - Расшифровка обсуждения о тестировании в ifMUD (Short, zarf, baf и др., 2014) — http://emshort.blog/if-discussion-club/transcript-of-aug-9-ifmud-discussion-on-testing/
  - John Ryan, «QA and Storytelling in Video Games», SFWA, 2024 — https://sfwa.org/2024/10/01/qa-and-storytelling-in-video-games/
  - Choice of Games: «How to get the most out of automated testing, part 2», 2018 — https://www.choiceofgames.com/2018/01/how-to-get-the-most-out-of-automated-testing-part-2/
  - Форум CoG: «On beta testing» — https://forum.choiceofgames.com/t/on-beta-testing/16584 ; «All About Beta Testing» — https://forum.choiceofgames.com/t/all-about-beta-testing/26284 ; «Make Transcripts of Your Game» — https://forum.choiceofgames.com/t/make-transcripts-of-your-game/77729
  - PlaytestCloud, анкета для оценки сюжета — https://help.playtestcloud.com/en/articles/6332176-survey-questions-for-assessing-your-game-s-narrative-in-a-playtest
  - Devlog «The Inverted Spire» о работе с бета-ридерами — https://voidblob-coop.itch.io/the-inverted-spire/devlog/304181/on-what-were-learning-from-working-with-our-beta-readers
  - IFWiki «Betatesting» — https://www.ifwiki.org/Betatesting (только определения и ссылки)
- **Доклад Dankoff** «Narrative Review Process — Getting Useful Feedback on Your Story» (GDC 2015) — https://www.gdcvault.com/play/1022166 ; шаги метода — по пересказу в Game Developer: https://www.gamedeveloper.com/audio/gdc-2015-the-delayed-impressions-of-a-games-user-researcher . Статья Dankoff и Shkirando в ICIDS 2015 (LNCS 9445) — только аннотация, текст за пейволлом.
- **Второй проход:** Bromley о проверке понимания сюжета — https://gamesuserresearch.com/how-to-playtest-your-games-story/ ; CoG об автотестах, часть 1; эссе Short 2008–2009; постмортемы и интервью Lifeline, Bury me, my Love, 80 Days, Overboard!, The Walking Dead, Hooked, A Normal Lost Phone — ссылки в `lessons.md` и `attention.md`.

## О чём источник

Подборка собирает три практики. Первая — бета-тестирование текстовых игр: тестер присылает транскрипт с комментариями, автор проходит несколько раундов. Вторая — нарративный QA в студиях: отдельный проход ищет нестыковки, сбои голоса персонажа, пропущенные реплики и ошибки в именах. Третья — исследование игроков: анкеты по шкале и попытка проверить сюжет до того, как он станет играбельным.

## Главная мысль

Бот проверяет, что история не сломана, а человек — хороша ли она. Эти проверки разделяют и проводят до того, как править сюжет станет поздно.

## Самое ценное для нас

1. Случайный бот не похож на игрока. Доли прохождений из `check:story` нужно перепроверять ботами с характером: «молчун», «доверчивый», «подозрительный» (P-11, PAT-04).
2. Если один финал собирает больше половины прохождений, значит, игроку подставили ловушку. В «Чужом голосе» `fin_revenge` получает 60–68 % случайных прогонов (RED-12, PAT-07, for-relayer §4). Доли считать по узлу `fin_*` или переменной `ending`, а не по последней строке, как сейчас делает `check:story` (P-12).
3. «Скучно», «непонятно» и «не верю» — три разные поломки. На каждую в анкете нужен свой вопрос, и чинят их по-разному (P-15, flags: три раздела).
4. Сюжет тестируют, пока прозы ещё нет: по бумажному скелету и эталонному транскрипту (P-01, PAT-01, PAT-09).
5. У нарративного QA свой проход: последовательность фактов, голос персонажа, обрывы логики, пропущенные реплики, имена, орфография. Половину этого можно считать автоматически (P-14, for-relayer §2).

## Уверенность

- **Проверено по открытым текстам (перепроверено при ревью):** процедуры бета-теста (Short, форумы CoG), список того, что смотрит нарративный QA (Ryan), пороги покрытия и редкости из randomtest (блог CoG), семь пунктов анкеты PlaytestCloud и оговорка, что они не валидированы, сомнения в репрезентативности бота (обсуждение ifMUD, 2014).
- **Проверено по нашим данным:** цифры по «Чужому голосу» — `check:story` и отдельный прогон пяти персон по 300 раз (октябрь 2026). Доли случайного бота плавают от прогона к прогону на ±5 п. п.
- **По пересказу доклада:** метод Dankoff — состав группы, материал и шесть шагов (SYS-02). Вопросы и метрики метода в открытых материалах не найдены.
- **Второй проход:** 12 уроков практиков (`lessons.md`), адаптация к мобильному игроку и пороги нагрузки (`attention.md`), пять систем источника (patterns.md, SYS-01…05), согласия и противоречия с другими источниками (for-relayer §6).
- **Знание модели:** think-aloud (рассуждение вслух), проверка пересказом, разбор реакций по типам. Помечено у каждого пункта.
- **Наш вывод, а не мысль источника:** всё, что касается реального времени и пауз. В источниках такого формата нет.
