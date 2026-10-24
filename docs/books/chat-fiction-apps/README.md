# Чат-фикшн приложения: Hooked, Yarn, Tap и подобные

- **Что это:** рынок «историй перепиской» 2015–2020: Hooked (Telepathic, 2015), Yarn (Mammoth Media, 2017), Tap (Wattpad, 2017), Amazon Rapids (2016, для детей 5–12).
- **Тип:** рынок, подборка статей и рецензий; общего года нет.
- **Открытые материалы** (сокращения используются во всех файлах):
  - [WH] https://en.wikipedia.org/wiki/Hooked_(app) · [WCF] https://en.wikipedia.org/wiki/Chat_fiction
  - [TC15] https://techcrunch.com/2015/09/17/hooked/ (запуск Hooked)
  - [TC17] https://techcrunch.com/2017/06/13/the-chat-fiction-apps-that-teens-go-crazy-for/
  - [TB] https://www.tubefilter.com/2017/02/22/wattpad-tap-chat-stories-app/ (запуск Tap)
  - [RG] https://www.theringer.com/2017/04/27/tech/hooked-tapped-text-message-stories-teens-reading-683714901b6
  - [OMR] https://omr.com/de/daily/hooked-app (немецкий разбор маркетинга и подписки Hooked)
  - [BT] https://bigthink.com/?p=48986 (тест Hooked на 15 000 читателях)
  - [DD] https://digiday.com/future-of-tv/tv-networks-studios-use-chat-fiction-app-yarn-promote-shows-develop-new-franchises/ (Yarn, 2018)
  - [TC19] https://techcrunch.com/2019/08/19/mammoth-media-introduces-choose-your-own-adventure-style-storytelling-to-its-chat-fiction-app-yarn
  - [HU] https://thehustle.co/hooked-chat-fiction-snapchat (Dark Matter, падение в рейтинге)
  - [CSM] https://www.commonsensemedia.org/app-reviews/hooked-chat-stories (критическая рецензия)
  - [TC18] https://techcrunch.com/2018/08/02/amazon-rapids-the-chat-fiction-for-kids-is-now-free
  - [FF] https://faintflex.substack.com/p/faintflex-vol-15-phony-content (обзор рынка, 2020-е)
  - Только по выдержкам из поиска, сами страницы не открылись: CNBC 2017 (403), статья Jane Friedman (платная, пометка «Tap закрыт»), SmartSocial (жалобы на отмену подписки; то же подтверждает OMR).
  - Второй проход: Lifeline, Bury Me, My Love, Choices, Episode, Dark Matter, Yarn 2018, Aragon Outlook (открыт), Mr. Robot:1.51exfiltrati0n — список в `lessons.md`.

**О чём.** Короткие истории без рассказчика, только переписка. Одно сообщение появляется на каждый тап. Эпизод читается за 2–5 минут и обрывается на напряжённом месте. Дальше платишь или ждёшь 15–30 минут (у Yarn ещё можно посмотреть рекламу). Формат взлетел у подростков на хорроре и триллере, а к 2018–2020 упёрся в удержание и сменил модель: видео, длинные сериалы, платные выборы. Tap закрыли.

**Главная мысль.** Переписка удерживает лучше прозы, пока каждая порция короткая и обрывается на вопросе. Ожидание, которое выглядит как плата, а не как часть истории, разрушает доверие.

## Самое ценное для relayer

1. Обрывай сессию на открытом вопросе и до паузы, а не после неё. В «Чужом голосе» 33 из 55 пауз ≥ 1h начинаются в пределах двух строк после ответа игрока, и лишь ~13% пауз предваряет крючок: `P-02`, `P-03`, `RED-02`, `for-relayer.md` §4.
2. Возвращение после долгой паузы должно окупать ожидание. Медиана — около 20 секунд набора, это меньше эпизода Yarn: `P-01`, `RED-01`.
3. Срок паузы называет персонаж. У Hooked и Yarn игрок знал, сколько ждать: `P-04`, `PAT-03`.
4. Контекст раньше интриги: в тесте Hooked читатели дочитывали, когда понимали, что происходит: `P-06`, `RED-05`.
5. Меряй, где бросают, построчно, как тепловые карты Yarn: `P-10`, `for-relayer.md` §2–3.

## Уверенность

- **Проверено по открытым страницам:** длина эпизодов (WH, DD), таймеры (WH, OMR, DD), цены (TC15, TC17, DD, TB, TC18), тест на 15 000 (BT, OMR, RG), жанры (WH, WCF, RG), падение аудитории Yarn (DD), выход Hooked из топ-200 (HU), платные выборы Yarn (TC19), бесплатный Rapids (TC18), критика (CSM, RG).
- **Расхождения:** «в 5 раз чаще дочитывают» (WH) против «лучшие книги дочитывала треть, а переписку почти все» (BT, OMR) — точного множителя нет. Ожидание у Hooked: 15 минут (WH), «чуть больше 30» (OMR), около 20 (школьная газета). Загрузки Hooked: 10 млн (RG/Apptopia), 14,2 млн (OMR/Priori), 20 млн (компания, WH).
- **Знание модели:** обратный отсчёт таймера на экране (средняя), причины закрытия Tap (низкая: закрытие подтверждает только редакторская пометка на сайте Jane Friedman, даты и причины нет).
- **Уточнено при ревью:** 1000–1300 слов у WH — длина всей короткой истории Hooked, а не эпизода. Платный третий вариант Yarn в TC19 описан как «ускоряет или меняет направление», а не как «самый резкий». Хоррор как первый успех Hooked подтверждает WH (со ссылкой на Celebrity Secret), CNBC открыть не удалось. Пробный период: три дня (WH) против семи (OMR). comScore по Yarn считал только аудиторию 18+.
- **Не найдено:** открытых данных о доле дочитавших до конца серии и об удержании на D1/D7. Цифры удержания в файлах — только косвенные (comScore по Yarn).
- **Второй проход:** уроки практиков — `lessons.md`, игрок с коротким вниманием — `attention.md`, отчёт — `DEEPEN.md`.
