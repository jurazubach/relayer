# Failbetter: quality-based narrative и сторилеты

- **Источник:** подход студии Failbetter Games (Fallen London, ранее Echo Bazaar, 2009; движок StoryNexus). Сооснователь и первый автор — Alexis Kennedy, с 2016 года вне студии (знание модели, уверенность: высокая). Тип — блог студии: гайдлайны для авторов, «Narrative Snippets», разборы структур. «Don't Poke That» — июль 2011 (проверено), разборы структур Echo Bazaar — около 2010 (знание модели, средняя), у гайдлайнов год не указан.
- **На что опирались (открывались):**
  - https://www.failbettergames.com/news/useful-posts-for-writers — индекс постов для авторов
  - https://www.failbettergames.com/news/echo-bazaar-narrative-structures-part-two и `…-part-three`
  - https://www.failbettergames.com/news/new-narrative-structures
  - https://www.failbettergames.com/news/dont-poke-that-narrative-engineering-principles-part-1
  - https://www.failbettergames.com/news/narrative-snippets-parsimony-2, `…-pacing`, `…-agency-and-choices`, `…-difficulty-rewards-and-punishment`, `…-storynexus-tricks`
  - https://www.failbettergames.com/news/fallen-london-writer-guidelines-part-i, `…-part-ii`, `…-part-iii`
  - https://www.failbettergames.com/news/the-problem-with-branching — гостевой пост David Dunham (King of Dragon Pass)
  - https://emshort.blog/2016/04/12/beyond-branching-quality-based-and-salience-based-narrative-structures/
  - [W] https://en.wikipedia.org/wiki/Fallen_London; [E] https://www.engadget.com/2017-05-27-fallen-london-gothic-horror-game-interview-writing.html — интервью Chris Gardiner

## О чём

Вместо дерева — набор сторилетов: кусок текста с условием входа по качествам (числовым переменным), выбором и изменением качеств. Следующую сцену определяет состояние, а не стрелка. Студия описала десятки повторяемых структур на качествах и строгий процесс: заявка, играбельный скелет до прозы, QA.

**Главная мысль:** история растёт за счёт условий на немногих переменных с ясным смыслом, а не за счёт новых веток.

## Самое ценное для нас

1. Скрытый порог, который решает финал, надо озвучить репликой персонажа → P-07, RED-01, разбор `proof` и `maya_trust` в for-relayer.
2. Меньше переменных, у каждой одно значение и комментарий; минимум две на главу → P-02, P-03, RED-04.
3. Готовые структуры на одном-двух счётчиках вместо дерева: хаб, цепочка, лестница, угроза → PAT-01, PAT-02, PAT-03, PAT-08.
4. Сначала скелет из условий и эффектов, прозу — после прогона бота → P-01, checklists §2.
5. Пауза с названным сроком и напоминание ставки после неё → P-08, P-14, RED-06.
6. Вердикт для ink: сторилеты — внутри главы хабом из 3–4 вариантов, между главами — линия; что это стоит → for-relayer §0, P-17, PAT-05.

## Второй проход

- `lessons.md` — 13 уроков практиков: возвращение после паузы и пересказы (опрос почти 8 700 игроков, 2024/25), ярусы вместо окон по навыку (2015), гринд в начале (2023–2025), типы качеств и «resource narrative» Kennedy (2017), постмортем Sunless Sea, StoryNexus, отмена Metempsychosis.
- `attention.md` — минимальные версии принципов, что резать, первые 30 секунд / 3 минуты / глава, возвращение после паузы, пороги нагрузки, против тёмных паттернов.
- Углублено: `principles.md` — устройство четырёх систем и нюансы к принципам; `patterns.md` — PAT-11, PAT-12; `flags.md` — RED-12…14, GREEN-07…08; `for-relayer.md` §6–7. Отчёт — `DEEPEN.md`.

## Уверенность

- **Проверено по открытым источникам (перепроверено на ревью):** определения storylet и quality; questicle/venture, Mark of Cain (part two), Simple Faust и Faust's Tea Party, Midnight Staircase (part three), Midnight Buffet, Carousel, Grandfather Clock; «около шестидесяти структур»; parsimony, минимум два качества, одно значение у качества, порядок одним качеством, show them the implements; river not tree и ориентир ~90 %; fires in the desert; счётчики вверх; Sometimes-сторилеты; пять выборов по два вместо десяти; большой выбор в два шага; трудность через цену; menaces и драматичный провал; напоминания для игроков «урывками»; лимиты 30/20/100 слов; этапы заявка → midflight → проза → QA (≈ треть времени).
- **Знание модели:** уход Kennedy из студии в 2016 (высокая); показ закрытых веток с требованиями в интерфейсе Fallen London (средняя: вики игры этого не подтверждает). Замена термина QBN найдена во втором проходе: Kennedy в 2017 году предложил «resource narrative» (LESSON-07).
- **Не проверено:** слайды Echo Bazaar Narrative Structures (часть структур только на картинках) и остальные посты из индекса для авторов — не открывались. Названия «Kittens Triple Fork», «Blood Gamble», «Faust's Ham and Eggs» упомянуты студией, но нам не нужны.
- **Наше:** все пороги (12 слов, 20 %, 2–50 %, 1h, хаб 3–4), автопроверки, вердикт в for-relayer §0 и разбор «Чужого голоса». Все примеры ink (в `principles.md` и `patterns.md`) самодостаточны и компилируются inkjs; примеры `patterns.md` прогнаны 200 случайными проходами каждый без тупиков.
