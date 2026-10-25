# Источники `story-time`

Сгенерировано `npm run story:coverage -- --sources story-time --write`, руками не править.
Список ID — это уровень L1, а не покрытие: строка покрыта, когда в reference есть блок с её ID в заголовке
(L2) или знание исполняемо (L3). Отменённое (`superseded`) не переносится; «частично» — берётся часть
«в силе» (`docs/playbook/superseded.md`).

## story-time/attention.md
- `#attn-player` — Игрок и два режима (`docs/playbook/attention-merged.md:25`)
- `#attn-return-click` — Режим «по клику» (`docs/playbook/attention-merged.md:295`)
- `#attn-return-reason` — Причина паузы (`docs/playbook/attention-merged.md:231`)
- `#attn-return-rhythm` — Ритм и длина пауз (`docs/playbook/attention-merged.md:302`)
- `#attn-return-silence` — Молчание игрока и напоминания (`docs/playbook/attention-merged.md:286`)
- `maass-fire-in-fiction:attention§3` — Возвращение после паузы (`docs/books/_clean/maass-fire-in-fiction/attention.md:53`)
- `narrative-postmortems:attention§3` — Возвращение после паузы (`docs/books/_clean/narrative-postmortems/attention.md:49`) — частично отменено A-01
- `yorke-into-the-woods:attention§3` — Возвращение после паузы (`docs/books/_clean/yorke-into-the-woods/attention.md:47`)

## story-time/clock.md

### TH-47 · часы сюжета против часов игрока
- `attention-today:LESSON-08` — Помни, что сообщение «от человека» давит сильнее любого пуша (`docs/books/_clean/attention-today/lessons.md:63` · K-R-114)
- `attention-today:P-11` — Срочность в тексте — редкая и сюжетная (`docs/books/_clean/attention-today/principles.md:92` · K-R-114)
- `attention-today:P-11#нюанс` — нюанс к P-11 (`docs/books/_clean/attention-today/principles.md:200`)
- `attention-today:PAT-05` — Честный дедлайн (`docs/books/_clean/attention-today/patterns.md:34` · K-R-114)
- `attention-today:PAT-05#нюанс` — нюанс к PAT-05 (`docs/books/_clean/attention-today/patterns.md:91`)

### без кластера TH
- `C-27` — Пауза без причины (`docs/playbook/checks.md:708`)

### TH-48 · причина паузы без срока возвращения
- `chat-fiction-apps:PAT-03` — Таймер словами (известный срок вместо счётчика) (`docs/books/_clean/chat-fiction-apps/patterns.md:50`) — частично отменено A-01
- `choiceofgames-design:GREEN-12` — У паузы ≥30 мин есть причина в реплике («я на смене», «сплю») (`docs/books/_clean/choiceofgames-design/flags.md:70`)
- `choiceofgames-design:LESSON-02` — Объясняй каждую паузу сюжетом и открывай быстрый режим после первого финала (`docs/books/_clean/choiceofgames-design/lessons.md:15` · K-R-47) — частично отменено A-04
- `maass-fire-in-fiction:LESSON-03` — Объясняй паузу сюжетом, тогда она становится напряжением (`docs/books/_clean/maass-fire-in-fiction/lessons.md:38`)
- `mckee-story:LESSON-10` — Ставь паузу туда, где герою по жизни нужно время, и буди только ради решения (`docs/books/_clean/mckee-story/lessons.md:88`)

### TH-47 · часы сюжета против часов игрока
- `messenger-genre:GREEN-05` — Длина пауз подстроена под сюжетные часы флагом (`docs/books/_clean/messenger-genre/flags.md:15`)
- `messenger-genre:P-12` — Привязывай долгие паузы к часам сюжета (`docs/books/_clean/messenger-genre/principles.md:135` · K-R-121) — частично отменено A-02
- `messenger-genre:P-12#нюанс` — нюанс к P-12 (`docs/books/_clean/messenger-genre/principles.md:249`) — частично отменено A-02
- `messenger-genre:PAT-03` — Пауза до утра, выровненная флагом (`docs/books/_clean/messenger-genre/patterns.md:62`)

### TH-48 · причина паузы без срока возвращения
- `narrative-postmortems:LESSON-01` — Первую долгую паузу дай рано и объясни её действием героя (`docs/books/_clean/narrative-postmortems/lessons.md:5` · K-narrative-postmortems:LESSON-01)

### TH-47 · часы сюжета против часов игрока
- `narrative-postmortems:LESSON-08` — Таймер — только когда герой сам чувствует, что время уходит (`docs/books/_clean/narrative-postmortems/lessons.md:59`)

### TH-48 · причина паузы без срока возвращения
- `narrative-postmortems:PAT-10` — Пауза длиной в дело героя (темп реального времени Lifeline) (`docs/books/_clean/narrative-postmortems/patterns.md:264` · K-narrative-postmortems:LESSON-01) — частично отменено A-01
- `narrative-postmortems:RED-11` — После silent или паузы больше 1h нет объяснения тишины (`docs/books/_clean/narrative-postmortems/flags.md:32`)

### TH-47 · часы сюжета против часов игрока
- `narrative-testing:RED-33` — Больше 6 возвращений (пауза ≥1 ч) за сутки игрового времени или пауза, которая кончается между 23:00 и 8:00 (`docs/books/_clean/narrative-testing/flags.md:91`) — частично отменено A-02

### TH-48 · причина паузы без срока возвращения
- `R-63` — Объявляй каждую паузу от 15 минут словами персонажа: причина без срока (смена, дорога, сон, батарея, кто-то пришёл), затем sys «… не в сети», затем строка с… (`docs/playbook/rules.md:348` · K-R-63)

### TH-47 · часы сюжета против часов игрока
- `R-114` — Не ставь сроков в реальном времени игрока («у тебя 10 минут»): исход не зависит от того, как быстро игрок ответил, а срок — только событие в мире истории.… (`docs/playbook/rules.md:589` · K-R-114)
- `R-121` — Время суток в истории — время мира, а не часы игрока. «Доброе утро», «в два ночи», «письмо ушло в 9:14» — события у персонажа, их время берётся из хронологии… (`docs/playbook/rules.md:631` · K-R-121)

### TH-48 · причина паузы без срока возвращения
- `serial-hooks:GREEN-08` — Игрок сам выбирает уйти: кнопка «Подождать до утра» / silent перед длинной паузой (`docs/books/_clean/serial-hooks/flags.md:16`)
- `serial-hooks:RED-08` — Названный в реплике срок расходится с delay больше чем вдвое (`docs/books/_clean/serial-hooks/flags.md:29`)

### TH-47 · часы сюжета против часов игрока
- `serial-hooks:SYS-3` — Система 3. Тайминг Lifeline (P-05, P-06, P-07) (`docs/books/_clean/serial-hooks/principles.md:157`)

## story-time/length.md
- `C-31` — Реальное время истории (`docs/playbook/checks.md:812`)

### TH-49 · длина истории и главы в реальном времени
- `chat-fiction-apps:P-13` — Обещай на карточке ту длительность, которую игрок проживёт (`docs/books/_clean/chat-fiction-apps/principles.md:97` · K-R-11)
- `chat-fiction-apps:PAT-05` — Ежедневный выпуск с напоминанием (daily installment) (`docs/books/_clean/chat-fiction-apps/patterns.md:86`)
- `inkle-ingold:LESSON-01` — Не растягивай историю в реальном времени дольше, чем держится интерес (`docs/books/_clean/inkle-ingold/lessons.md:22` · K-R-121)
- `inkle-ingold:P-18` — Ограничивай реальное время истории (`docs/books/_clean/inkle-ingold/principles.md:168` · K-R-67)
- `inkle-ingold:P-18#нюанс` — нюанс к P-18 (`docs/books/_clean/inkle-ingold/principles.md:168`)
- `LOCAL-01` — · Длину «Чужого голоса» держат паузы внутри глав, а не только ночные (`docs/playbook/local-lessons.md:13`)
- `messenger-genre:GREEN-02` — Глава заканчивается крючком перед долгой паузой (`docs/books/_clean/messenger-genre/flags.md:12`)
- `messenger-genre:LESSON-09` — Скрывайте счётчики, но показывайте их последствия (`docs/books/_clean/messenger-genre/lessons.md:79` · K-messenger-genre:RED-11)
- `messenger-genre:PAT-02` — Крючок на возвращение (cliffhanger перед ночью) (`docs/books/_clean/messenger-genre/patterns.md:30` · K-R-67) — частично отменено A-01
- `messenger-genre:PAT-07` — Скрытые накопители и финал-сортировщик (как моральный дух, деньги и романтика в Bury Me, My Love) (`docs/books/_clean/messenger-genre/patterns.md:155` · K-R-67)
- `messenger-genre:RED-09` — После последней кнопки ждать больше 15 минут (`docs/books/_clean/messenger-genre/flags.md:30` · K-R-67)
- `messenger-genre:RED-11` — Переменная меняется кнопками, а читается только в финальной проверке (`docs/books/_clean/messenger-genre/flags.md:32` · K-messenger-genre:RED-11)
- `messenger-genre:RED-13` — Утро в сюжете наступает меньше чем через 5h после «спокойной ночи» (`docs/books/_clean/messenger-genre/flags.md:34` · K-R-67)
- `narrative-postmortems:P-17` — Длину задаёт история, а не ожидание «настоящей игры» (`docs/books/_clean/narrative-postmortems/principles.md:140`)
- `R-67` — Длина пауз в реальном времени. Вся история — до 48 часов реального времени ( story.length.target_h ), потолок около трёх дней ( story.length.max_h ), если… (`docs/playbook/rules.md:368` · K-R-67)
- `schell-art-of-game-design:RED-03` — Длинная развязка: 10 сообщений или 15 мин delay после последней кнопки ( messenger-genre:P-16 ) (`docs/books/_clean/schell-art-of-game-design/flags.md:24` · K-R-67)
- `serial-hooks:LESSON-04` — Держи два варианта на развилке и ограничь срок истории (`docs/books/_clean/serial-hooks/lessons.md:31` · K-R-67)
- `serial-hooks:LESSON-13` — Перерыв дольше трёх дней дорого стоит даже платному сериалу (`docs/books/_clean/serial-hooks/lessons.md:101`)
- `serial-hooks:RED-07` — Пауза больше 24h (`docs/books/_clean/serial-hooks/flags.md:28`)
- `video-three-things:LESSON-11` — Не растягивай реальное время дольше, чем живёт ядро (`docs/books/_clean/video-three-things/lessons.md:72`)
- `yorke-into-the-woods:LESSON-10` — Сжимай реальное время и оправдывай паузы миром истории (`docs/books/_clean/yorke-into-the-woods/lessons.md:91`)
- `yorke-into-the-woods:RED-16` — Суммарная пауза медианного пути больше 72h (`docs/books/_clean/yorke-into-the-woods/flags.md:67`)

## story-time/modes.md

### TH-45 · два равноценных режима; кнопка «пропустить» для тестов
- `choiceofgames-design:LESSON-10` — Не отказывайся от реального времени: на нём держится эмоция (`docs/books/_clean/choiceofgames-design/lessons.md:97`)
- `maass-fire-in-fiction:LESSON-06` — Не убирай паузы ради удобства, если не готов потерять вовлечённость (`docs/books/_clean/maass-fire-in-fiction/lessons.md:62`)
- `messenger-genre:LESSON-10` — Не убирайте реальное время, не заменив его (`docs/books/_clean/messenger-genre/lessons.md:87` · K-R-122)
- `narrative-postmortems:SYS-5` — SYS-5. Реальное время на уведомлениях (Lifeline) (`docs/books/_clean/narrative-postmortems/patterns.md:335`)
- `R-122` — Пиши так, чтобы текст читался в обоих режимах. Режим выбирают в начале истории, сменить его можно только перезапуском; режимы равноценны. Сюжет, выборы и… (`docs/playbook/rules.md:636` · K-R-122)
- `schell-art-of-game-design:LESSON-06` — Давать игроку выбирать темп и вход посреди истории (`docs/books/_clean/schell-art-of-game-design/lessons.md:49` · K-R-122)

## story-time/no-guilt.md

### TH-51 · упрёк только за `#silent`, никогда за отсутствие
- `attention-today:LESSON-11` — Расписание становится тёмным паттерном, когда пропуск стоит потери (`docs/books/_clean/attention-today/lessons.md:85` · K-R-52)
- `attention-today:P-10` — Не наказывай отсутствие сильнее, чем выбор (`docs/books/_clean/attention-today/principles.md:85` · K-R-52) — частично отменено A-03
- `attention-today:P-10#нюанс` — нюанс к P-10 (`docs/books/_clean/attention-today/principles.md:199`) — частично отменено A-03

### TH-52 · давление и ложная срочность
- `attention-today:RED-08` — Больше 2 реплик с давлением («срочно», «ответь», «ты где») на главу (`docs/books/_clean/attention-today/flags.md:27` · K-R-114)
- `C-37` — Давление и ложная срочность (`docs/playbook/checks.md:1001`)
- `maass-fire-in-fiction:RED-10` — Тревожная сцена из одних восклицаний и «помоги» (`docs/books/_clean/maass-fire-in-fiction/flags.md:30` · K-R-87)

### TH-51 · упрёк только за `#silent`, никогда за отсутствие
- `meaningful-choice:attention§3` — Возвращение после паузы (`docs/books/_clean/meaningful-choice/attention.md:52`)
- `meaningful-choice:attention§5` — Против тёмных паттернов (`docs/books/_clean/meaningful-choice/attention.md:74`)
- `messenger-genre:attention§5` — Против тёмных паттернов (`docs/books/_clean/messenger-genre/attention.md:72`)
- `messenger-genre:PAT-09` — Главы как отдельные встречи (пять разговоров за пять лет в Emily is Away) (`docs/books/_clean/messenger-genre/patterns.md:212` · K-R-74)
- `messenger-genre:RED-06` — Текст на кнопке не совпадает с ушедшим сообщением без label , или me решает за игрока то, за что его потом упрекнут (`docs/books/_clean/messenger-genre/flags.md:27` · K-R-74)
- `R-74` — Не упрекай игрока за долгий ответ и за то, что он пропал: ни за паузу, которую поставила сама история, ни за молчание у кнопки. Обида — только на нажатый… (`docs/playbook/rules.md:398` · K-R-74)

### TH-52 · давление и ложная срочность
- `serial-hooks:RED-17` — «Печатает…» или плашка, после которых не приходит сообщение; угроза «у тебя N минут», которая не исполняется (`docs/books/_clean/serial-hooks/flags.md:61` · K-R-52)

### TH-51 · упрёк только за `#silent`, никогда за отсутствие
- `snyder-save-the-cat:RED-21` — Финал из пяти шагов, где ловушка отнимает ресурс, добытый игроком (`docs/books/_clean/snyder-save-the-cat/flags.md:79` · K-R-74)

## story-time/reminders.md

### TH-46 · напоминания при молчании, ветка «не ответил»
- `attention-today:RED-07` — Молчание или промедление ведут к худшему финалу без единой кнопки (`docs/books/_clean/attention-today/flags.md:26` · K-R-52)

### без кластера TH
- `C-32` — Расписание возвращений и напоминания (`docs/playbook/checks.md:836`)

### TH-46 · напоминания при молчании, ветка «не ответил»
- `inkle-ingold:PAT-07` — Напоминание при молчании, которое не повторяется (`docs/books/_clean/inkle-ingold/patterns.md:223` · K-R-120) — частично отменено A-01
- `inkle-ingold:PAT-07#нюанс` — нюанс к PAT-07 (`docs/books/_clean/inkle-ingold/patterns.md:449`) — частично отменено A-01
- `inkle-ingold:RED-09` — Одна и та же входящая строка дважды за прохождение (`docs/books/_clean/inkle-ingold/flags.md:30`)
- `messenger-genre:SYS-1` — Система 1. Реальное время Lifeline (Justus, Jokela) (`docs/books/_clean/messenger-genre/principles.md:189`)
- `R-120` — Если игрок молчит у кнопки в реальном времени, персонаж напоминает 1–2 раза ( story.reminders.max ), а потом история идёт дальше без ответа и запоминает это.… (`docs/playbook/rules.md:622` · K-R-120)

## story-time/replay.md

### TH-50 · повтор и быстрый режим
- `messenger-genre:LESSON-04` — Сделайте повтор дешёвым (`docs/books/_clean/messenger-genre/lessons.md:39`)
- `narrative-postmortems:LESSON-15` — Если история рассчитана на повтор, скажи об этом игроку (`docs/books/_clean/narrative-postmortems/lessons.md:114`)
- `sheldon-character-storytelling:LESSON-11` — Давай переиграть с середины, не заставляя ждать заново (`docs/books/_clean/sheldon-character-storytelling/lessons.md:86`)
- `skolnick-video-game-storytelling:LESSON-06` — Давай ускорение как награду за повторное прохождение, а не за деньги (`docs/books/_clean/skolnick-video-game-storytelling/lessons.md:47`) — частично отменено A-04
