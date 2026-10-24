# Мобильные интерактивные истории: Choices, Episode, Chapters

- **Что это:** рынок историй с выбором на телефоне. Choices: Stories You Play (Pixelberry, 2016), Episode (Pocket Gems, 2014; позже Episode Interactive), Chapters: Interactive Stories (Crazy Maple Studio, 2017).
- **Тип:** рынок. Подборка статей, интервью, вакансий и рецензий, общего года нет.
- **Открытые материалы** (сокращения в квадратных скобках используются во всех файлах):
  - [WC] https://en.wikipedia.org/wiki/Choices:_Stories_You_Play
  - [WE] https://en.wikipedia.org/wiki/Episode_(app)
  - [ES] https://emshort.blog/2017/03/13/choices-episode/ (Emily Short, 2017; в комментариях dfabulich пересказывает доклад Cass Phillipps, GDC 2016)
  - [PGB] http://www.pocketgamer.biz/how-does-choices-stories-you-play-monetise/ (Matt Suckley, разбор монетизации)
  - [UD] https://www.blog.udonis.co/mobile-marketing/mobile-games/choices-stories-you-play-analysis
  - [PBR] https://www.pixelberrystudios.com/blog/2025/7/2/choices-rewind-writer (интервью сценаристки Pixelberry)
  - [PB13] https://www.pixelberrystudios.com/blog/2025/10/10/inside-choices-the-thirteenth-house
  - [PGM] https://www.pocketgamer.biz/pixelberrys-oliver-miao-on-how-weekly-updates-keep-high-school-storys-day-7-retention-over-50/ (2013, High School Story — не Choices)
  - [JF] https://janefriedman.com/4-things-learned-episode/ (Kathryn Stanley, автор Episode, гостевой пост; в комментариях — рассказ о собеседовании в Pocket Gems)
  - [CM] https://apply.workable.com/crazymaplestudio/jobs/view/844A250C6A (условия Chapters для авторов)
  - [PP] https://publishingperspectives.com/2017/11/crazy-maple-studio-introduces-chapters-interactive-stories/
  - [GN] https://www.gaming.net/pl/joey-jia-ceo-of-crazy-maple-studio-interview-series/
  - [MG] https://mobilegamer.biz/mags-alice-bowman-on-how-narrative-can-help-ua-retention-monetisation-and-more/ (Alice Bowman, MAG Interactive; про сюжет в мобильных играх вообще, Choices и Episode упомянуты мимоходом)
  - [WX] https://writingexcuses.com/?p=15578 (подкаст Writing Excuses 16.20 «Branching Narratives»; общий, не про рынок)
  - Второй проход (2026-10-24), см. `lessons.md` и `DEEPEN.md`:
  - [GDY] https://www.gamedeveloper.com/design/gdc-youtube-top-5-wooga-s-jana-sloan-van-geest (обзор доклада Phillipps, 2019)
  - [PGD] https://www.pocketgamer.biz/interview/68179/episode-is-ready-to-fend-off-new-competition/ (Michael Dawson, Episode, 2018)
  - [PGL] https://www.pocketgamer.biz/how-to-understand-mobile-player-behaviour-according-to-pocket-gems/ (Ben Liu, Pocket Gems, 2013)
  - [VB] https://gamesbeat.com/?p=129487 (Episode: 3 млн игроков в неделю, аудитория)
  - [PBJ] https://careers.jobscore.com/careers/pixelberrystudios/jobs/external-writer-bcFt5OZuPk-iJl2fFAxfAW (вакансия: глава ~5000 слов)
  - [PBU] https://www.pixelberrystudios.com/blog/2024/1/19/2024-studio-updates (закрытие StoryLoom)
  - [SBTB] https://smartbitchestrashybooks.com/reviews/guest-game-review-choices/ (рецензия 2016 и комментарии 2017)
  - [EF] форум Episode, сниппеты поиска о длине эпизода и клиффхэнгерах, уверенность низкая
  - [SN] Только сниппеты поиска, страницы не открывались: отзывы игроков (justuseapp, Common Sense Media), заметка автора NaNoWriMo, листинг доклада Phillipps на Podwise.

**О чём.** Три приложения продают романтические, детективные и фэнтези-истории короткими главами. Глава открывается «ключом» или «пропуском», который восстанавливается часами, а лучшие варианты ответа стоят алмазов или кристаллов. Сюжет в основном линейный, с косметическими выборами, счётчиками отношений и небольшим числом состояний мира.

**Главная мысль.** Рынок удерживает игрока ритмом коротких глав, крючком на конце главы и ощущением, что персонажи помнят его ответы, а не настоящим ветвлением.

## Самое ценное для relayer

1. Ветвление дорого и почти не окупается: копи последствия в 2–3 состояниях мира и в отзвуках, а не в отдельных сюжетах. См. `P-04`, `PAT-04`.
2. Конец главы — открытый вопрос, длинная пауза — только после крючка. См. `P-02`, `P-09`, `RED-03`.
3. Игроки ненавидят, когда хороший вариант недоступен или выбор отменяет скрытая проверка. В «Чужом голосе» это `ch10_maya`. См. `P-07`, `RED-01`, `for-relayer.md` §4.
4. Каждый косметический выбор получает свою реакцию и хотя бы один отзвук позже. См. `P-05`, `P-06`, `PAT-02`.
5. Показывай накопленное: итог главы в «Заметках». См. `P-12`, `PAT-06`.
6. Первый акт — в первые 5 минут (Dawson, PGD); удержание от ветвления, по пересказу доклада Phillipps, не растёт; премиум-выбор — антипример. См. `lessons.md`, `attention.md`, SYS-1…3 в `patterns.md`.

## Уверенность

- **Проверено по открытым страницам (ревью 2026-10-24):** ключи (максимум два, восстановление за два часа), алмазы и платные варианты, ролик перед главой (WC, UD). Отчёт в конце главы и то, что платные варианты явно лучше бесплатных (PGB). Сюжеты Choices «относительно линейные», короткие главы под мобильное внимание, давление виной в The Crown and the Flame (ES). Два состояния мира вместо финала на каждого персонажа из-за нагрузки на тестирование, маленькие подарки внимательным игрокам и ветка эффектного провала (PBR). Отказ от календаря в The Thirteenth House: навыки и романы остались, календарь вместе с ними не вытягивали по объёму текста (PB13, перепроверено во втором ревью). Сезоны Episode по 10–20 глав (JF); около 400 строк диалога на главу — со слов комментатора, не автора (JF). Тестовая выдача Chapters: 14 дней, от 300 читателей, контракт при удержании от 50% (CM). Советы по клиффхэнгерам, открытой линии и напоминаниям (MG — мобильные игры вообще). D7 выше 50% у High School Story, 2013 (PGM).
- **Знание модели:** типичная длина главы Choices — 10–20 минут (средняя). Новые главы Choices выходили раз в неделю, книги складывались в серии по 2–3 (средняя). Финалы трилогий зависят от накопленных очков (средняя).
- **Не проверено:** запись доклада Phillipps «All Choice No Consequence: Efficiently Branching Narrative» (GDC 2016 — по комментарию dfabulich к ES; видео выложено в 2019). Его вывод о том, что ветвление не повышает удержание, известен только из пересказа. Не открывались статья Do Own Kim (пересказ в WC), отзывы игроков и заметка NaNoWriMo (SN). Цифра «в главе 12 выборов, бесплатный только худший в 7» из первой версии разбора не подтвердилась и удалена.
