# Procedural Storytelling in Game Design

- **Редакторы:** Tanya X. Short, Tarn Adams. **Год:** 2019. **Тип:** сборник глав от практиков (A K Peters / CRC Press, 1-е изд.), 28 глав в пяти разделах.
- **Опирался на:**
  - [S1] страница издателя с оглавлением и описанием: https://www.routledge.com/Procedural-Storytelling-in-Game-Design-1st-Edition/Short-Adams/p/book/9781138595309
  - [S2] Tanya X. Short, блог-версия идей главы о сгенерированных личностях: https://www.gamedeveloper.com/design/maximizing-the-impact-of-procedural-personalities
  - [S3] Tanya X. Short, аннотация доклада AIIDE «Designing Stronger AI Personalities»: https://ojs.aaai.org/index.php/AIIDE/article/view/12973
  - [S4] Darius Kazemi, отрывок главы 2, опубликованный самим издателем на Game Developer: https://www.gamedeveloper.com/design/how-to-effectively-use-procedural-generation-in-games
  - [S5] Emily Short, QBN, salience-based и waypoint-структуры: https://emshort.blog/2016/04/12/beyond-branching-quality-based-and-salience-based-narrative-structures/
  - [S6] Emily Short, «Storylets: You Want Them»: https://emshort.blog/2019/11/29/storylets-you-want-them/
  - [S7] Emily Short о докладе Elan Ruskin (автор главы «Dialog»): https://emshort.blog/2012/03/16/gdc-2012-talk-on-dynamic-dialogue/
  - [S8] Bruno Dias (автор главы о Voyageur), туториал Improv: https://www.procjam.com/tutorials/en/improv
  - [S9] Kate Compton, «So You Want to Build a Generator»: оригинал на tumblr отдал 403, идею «10 000 тарелок овсянки» сверял по пересказам, в том числе https://flowingdata.com/2016/08/04/building-a-generator-for-stuff/

## О чём
Практики описывают, как обычные инструменты рассказчика (персонаж, мир, тема, темп) работают, когда текст собирает система, а не автор строка за строкой. Большая часть глав — разборы конкретных игр: The Sims, Dwarf Fortress, Voyageur, Left 4 Dead. Для нас полезны три темы: персонажи из нескольких компонентов, модули с предусловиями и выбор самой подходящей реплики.

## Главная мысль
Игрок замечает только различия, которые видит, поэтому система, генератор и модель должны производить заметные и объяснимые изменения, а не много вариантов текста.

## Самое ценное для нас
1. Скрытая переменная, которую игрок не видит в тексте, для него не существует. Отношение надо показывать репликой в момент изменения: `P-10`, `PAT-05`, `RED-01`.
2. Сто перефразировок одного ответа — это «овсянка». Варианты должны отличаться фактом, адресатом или последствием: `P-04`, `RED-03`.
3. Одно событие и две реакции в разных чатах раскрывают двух персонажей за раз. Мессенджер с несколькими чатами создан для этого: `P-08`, `PAT-03`.
4. Каскад «частный случай раньше общего, у каждого блока есть `else`» делает сцену-слияние связной при любом пути: `P-12`, `P-14`, `PAT-01`.
5. Генерации моделью отдавай только реплики с низкой ставкой. Повороты и превращения персонажей пишет автор: `P-11`, `P-09`.
6. Генерацию моделью проверяй по заранее выписанным свойствам и запретам на нескольких вариантах, а не по одному удачному: `P-17`, `P-18`.

## Уверенность
- **Проверено по открытым источникам (ревью 2026-10-24):** номера и авторы глав: Compton — 1, Kazemi — 2, Ingold — 7, Dias — 16, Tanya Short — 21, Ruskin — 25, Emily Short — 28 [S1]; оглавление и авторы глав [S1]; четыре компонента личности и советы Tanya Short [S2]; тезисы Kazemi о простоте и контексте [S4]; storylets, QBN и salience [S5, S6]; каскад «самое специфичное правило» [S7]; модель тегов и фильтр противоречий в Improv [S8].
- **Расхождение с заданием:** глава о персонажах написана Tanya X. Short (гл. 21, раздел «Characters»), а не Emily Short; это подтверждает оглавление издателя [S1]. У Emily Short глава 28 «Creating Tools for Procedural Storytelling» в разделе ресурсов. Её идеи здесь взяты из её блога [S5, S6], а не из главы. Отдельные магазины и каталоги называют издание «2nd ed.» и дают Emily Short главу «Plot & Story Directors»; у издателя такой главы нет, считаем это ошибкой каталогов.
- **По знаниям модели:** тезисы глав Ingold (narrative momentum), Horneman, Murray, Cook. Открытых текстов этих глав не нашёл, уверенность низкая или средняя, это помечено в каждом пункте.
- **Не проверено:** содержание глав, кроме главы Kazemi. Блог Tanya Short [S2] — её отдельный текст на ту же тему, а не сама глава.
- **Второй проход (2026-10-24):** `lessons.md` — 11 уроков практиков; `attention.md` — адаптация к игроку с телефоном; устройство систем С-1…С-5 и нюансы — в конце `principles.md` и `patterns.md`; согласия и противоречия с другими источниками — `for-relayer.md` §6. Отчёт — `DEEPEN.md`.
