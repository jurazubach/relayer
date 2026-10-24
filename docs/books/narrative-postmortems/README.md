# Постмортемы нарративных игр: что сломалось и что починили

- **Авторы:** inkle (80 Days, Sorcery!), Mountains (Florence), Sam Barlow (Her Story), Nerial (Reigns), Telltale (The Walking Dead), Dontnod (Life is Strange).
- **Тип:** постмортемы, доклады GDC, интервью; 2013–2019.
- **Открытые материалы** (сокращения используются во всех файлах):
  - [GD80] https://www.gamedeveloper.com/business/postmortem-inkle-s-i-80-days-i- (постмортем 80 Days, 2015)
  - [IF50] https://if50.substack.com/p/2014-80-days (разбор 80 Days с выводами inkle о выборе)
  - [XS] https://accelerator.xsolla.com/blog/narrative-sorcery-coherent-storytelling-in-an-open-world (аннотация доклада Ингольда, GDC 2017)
  - [PGB] https://www.pocketgamer.biz/making-of-her-story/ · [GDHS] https://www.gamedeveloper.com/audio/road-to-the-igf-sam-barlow-s-i-her-story-i-
  - [AU] https://www.appunwrapper.com/2016/08/17/interview-with-reigns-developer-francois-alliot/ · [INV] https://www.inverse.com/gaming/23117-reigns-francois-alliot-nerial-developer-interview
  - [KOT] https://kotaku.com/the-most-important-part-of-writing-a-video-game-is-the-1822627600 · [GDHM] https://www.gamedeveloper.com/design/the-importance-of-tools-when-writing-i-reigns-her-majesty-i- (Reigns: Her Majesty)
  - [GW] https://game.watch.impress.co.jp/docs/news/1175744.html (японский отчёт о докладе Кена Вонга про Florence, GDC 2019) · [WF] https://en.wikipedia.org/wiki/Florence_(video_game)
  - [TWD] https://www.gamedeveloper.com/design/classic-postmortem-telltale-games-the-walking-dead-2012 · [GI] https://www.gameinformer.com/b/news/archive/2013/03/28/telltale-why-fewer-people-saved-doug-in-the-walking-dead.aspx
  - Только по выдержкам поиска, страницы не открылись или пустые: [GDCR] страница доклада Alliot на GDC Vault (сайт на обслуживании), [PCG] PC Gamer о панели Telltale на GDC 2013 (открылся только заголовок), [LIS] интервью Dontnod (Red Bull, Square Enix — тексты не загрузились).

**О чём.** Шесть студий рассказывают, что они выкинули или переделали по ходу разработки и после релиза. inkle сделала прогулки по городам необязательными и вырезала диалоговую мини-игру. Telltale переписала второй эпизод и разобралась, почему выбор «спасти Дуга или Карли» вышел перекошенным 25/75. Барлоу балансировал базу клипов по частоте слов. Nerial заменила дерево колодой карт. Вонг отказался от 3D и от финала «через 30 лет».

**Главная мысль.** Выбор работает, когда игрок видит его след и успел узнать тех, кого он касается. Объём, который игрок обязан прочесть, режут первым.

- **Второй проход:** `lessons.md` (16 уроков), `attention.md`, системы SYS-1…5 и PAT-10 в `patterns.md`, нюансы в `principles.md`, отчёт — `DEEPEN.md`. Новые источники — в конце `lessons.md`.

## Самое ценное для relayer

1. Выбор между двумя людьми перекашивается, если с одним было больше сцен. Считай сцены до развилки: `P-05`, `PAT-07`, `RED-05`.
2. Переменная, которую записали, но ни разу не прочли, — это обещание без оплаты. В «Чужом голосе» так с `called_bluff`: `P-03`, `RED-02`, `for-relayer.md` §4.
3. Обязательный текст без выбора и без награды становится рутиной. inkle сделала такой текст пропускаемым и превратила в награду: `P-01`, `PAT-01`, `RED-01`.
4. Финал, который выбирает скрытый счёт, игрок должен видеть заранее хотя бы косвенно. Сейчас `proof` в `ch10_route` невидим: `P-03`, `PAT-06`, `for-relayer.md` §4.
5. К концу выдыхаются: у 80 Days вышли тонкие Америки, у нас глава 5 почти втрое короче соседних. Сравнивай плотность глав: `P-16`, `RED-09`.

## Уверенность

- **Проверено по открытым страницам:** весь постмортем 80 Days (GD80), выводы inkle о частых мелких выборах и видимой структуре (IF50), лимит в 5 клипов, частотный анализ слов и ручная подгонка базы, клипы в нескольких контекстах (PGB, GDHS), колода из 770 карт, «сто решений за пять минут», прототип на сотню карт и пять персонажей, династия, вырезанные королевы, юмор появился позже (INV, AU), спредшит и живая загрузка текста в Her Majesty (KOT, GDHM), полгода в 3D, пазл из 7 частей, сжимающийся до одной, вырезанная встреча через 30 лет, ранняя линейность (GW, WF), Дуг/Карли 25/75 и слова Родкина (GI), переписанный второй эпизод, ветка Марка как «vestigial story problem», экран статистики, мелкие выборы лучше больших развилок (TWD). Отказ от гонки на 80 настоящих дней — «слишком долго» (GD80).
- **Знание модели:** что «defensive logic» Ингольда — это проверки знаний игрока (средняя; аннотация XS называет термин без деталей), надпись «Clementine will remember this» (высокая).
- **Не удалось проверить:** что именно Telltale говорила о лишнем ветвлении на GDC 2013 (PCG — только заголовок), тезис Alliot «ограничения задают тон, а не сюжет» (GDCR — выдержка поиска), детали докладов Dontnod. Уроки Life is Strange в базе почти отсутствуют: одна оговорка в P-10 с низкой уверенностью.
