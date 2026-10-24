# Standard Patterns in Choice-Based Games — Sam Kabo Ashwell

- **Тип:** статья в блоге *These Heterogenous Tasks*, 26 января 2015 г. Позже переложена в статью IFWiki.
- **На что опирались (открыто и прочитано):**
  - https://heterogenoustasks.wordpress.com/2015/01/26/standard-patterns-in-choice-based-games/ — оригинал;
  - https://www.ifwiki.org/Standard_Patterns_in_Choice-Based_Games — копия статьи на IFWiki;
  - https://www.choiceofgames.com/2011/07/by-the-numbers-how-to-write-a-long-interactive-novel-that-doesnt-suck/ — Dan Fabulich, delayed branching (на него ссылается Эшвелл);
  - https://emshort.blog/2016/04/12/beyond-branching-quality-based-and-salience-based-narrative-structures/ — Emily Short, развитие темы floating modules и quality-based narrative.
- **Второй проход (уроки практиков, `lessons.md`, `attention.md`):** ранние разборы Эшвелла 2011 г. (maga-dogg.livejournal.com, перечислены в IFWiki), samizdat.co/cyoa (Swinehart), постмортем «Sorcery!» (Ingold, Game Developer 2016), IF50 о «80 Days» и «Lifeline», интервью Lifeline (Game Developer 2015, GameAnalytics), Telltale о «The Walking Dead» (Game Informer 2013, Giant Bomb), Emily Short (2016, 2017), Hooked и Choices. Полный список — `DEEPEN.md`.
- **Наши данные:** `npm run graph` и `npm run check:story` от 2026-10-24 по трём историям из `src/stories/`.

## О чём источник

Эшвелл сводит в каталог структуры, которые повторяются в играх с выбором: time cave, gauntlet, branch and bottleneck, quest, open map, sorting hat, floating modules, loop and grow с разновидностью spoke and hub. Для каждой он описывает форму графа, нужное отслеживание состояния, примерный объём и ощущение, которое она даёт игроку. Список заявлен как неполный, а структуры — как смешиваемые.

## Главная мысль

Форма ветвления определяет, сколько текста стоит вариативность, сколько его увидит игрок и что он почувствует. Слияние веток без запоминаемого состояния превращает любое ветвление в коридор.

## Самое ценное для нас

1. Наши истории по карте выглядят коридорами, но «Чужой голос» по состоянию — ветвление с горлышком. Структуру надо определять картой вместе с чтениями переменных (`P-14`, `for-relayer.md` §2, проверки A1–A4).
2. Выбор теряется в «сжатых» переменных: много записей на мало чтений (`ellie_trust` 23/5) или запись без чтения (`called_bluff`) — `RED-04`, `RED-05`, `P-06`.
3. Финал сильнее всего, когда его решают последняя кнопка и ранние оси вместе. Образец — `ch10_route`, слабое место — `ch5_final` (`P-11`, `RED-06`, `RED-07`).
4. Начало теряет опору, когда ставка и срок спрятаны в необязательной ветке: «через 4 дня» видят 35% (`RED-12`, `P-08`).
5. Перевод из коридора в ветвление с горлышком — пошаговый рецепт с ценой 10–20% текста (`PAT-12`, `PAT-11`).

## Уверенность

- **Проверено по открытым источникам:** список и названия структур, их описания (форма, роль состояния, объём, ощущение), деление коридоров на deadly и friendly, эффект exquisite corpse у невидимых горлышек (только название — расшифровка наша), замечание о важности сигнала у sorting hat, оправдание повтора в loop and grow, ссылка на delayed branching Fabulich и на quality-based narrative (Alexis Kennedy).
- **Ранняя версия найдена:** статья 2015 года выросла из серии разборов книг CYOA, которую Эшвелл вёл в LiveJournal под ником maga_dogg в 2011–2012 гг. (IFWiki относит эти посты к нему). Открыты разборы «The Cave of Time» и поздних книг серии (`LESSON-10`). Докладов, лекций и подкастов Эшвелла по этой теме IFWiki не перечисляет, поиск их тоже не нашёл.
- **Наши выводы, не Эшвелла:** все числовые пороги (60% ствола, `w/r > 4`, 10% посещаемости, 15 сообщений, ≥ 3%), переложение quest на контакты, `PAT-12`, `PAT-13`, раздел «Что не подходит».
- **Не проверено:** комментарии под оригинальным постом (видны только пингбэки), схемы-картинки статьи (описаны со слов страницы, сами изображения не разбирались).
