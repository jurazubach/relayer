// THE NUMBER (5 глав)
//
// Завязка. Игрок получил новый номер. Два месяца назад им пользовался Рэй Колдуэлл,
// который «держал» для людей чужие вещи и решал их проблемы. Рэй исчез, оператор выждал
// положенные 45 дней и отдал номер. Сегодня у всех, кто писал на мёртвый номер, загорелось «доставлено».
//
// Кто есть кто:
//   игрок     — главный герой. У него номер, а значит коды, уведомления, чужие напоминания. Половина улик.
//   Тео       — сердце истории. Ноги на месте. Ищет Рэя, который вытащил его из участка в 15 лет.
//   Рэй       — главный персонаж тайны. Отсутствует до финала.
//   Дина      — подруга Рэя, прачечная 24/7. Знает больше, чем говорит.
//   Неизвестный (Слоун) — человек застройщика Пайка. Читает почту Рэя, ему нужен телефон.
//   Окафор    — одна из тех, кому помогал Рэй. Её бумаги лежат в боксе 114.
//
// Макгаффин: то, что Рэй спрятал от Пайка. Синяя коробка — пустышка, машина — пустышка,
// настоящее всё время лежало у Тео в кармане: брелок от ключей оказывается флешкой.
//
// Главы:
//   1 Доставлено   ночь       склад, бокс 114, кто-то вошёл по коду Рэя
//   2 Код          утро       код от облака; кирпичи «Не туда смотришь»; Дина; эвакуатор
//   3 Эвакуатор    вечер      машина Рэя; регистратор: Рэя увезла Дина
//   4 Прачечная    ночь       правда Дины; брелок-флешка; Слоун; стиральная машина №7
//   5 Рэй          утро-ночь  голос Рэя для Тео; аукцион; Окафор; Рэй отвечает; новый человек пишет на номер
//
// Теги:
//   #from:id        дальше пишет контакт id (действует до следующего from)
//   #me:id          исходящее сообщение игрока в чат id (без кнопки)
//   #sys / #sys:id  серая системная строка (в текущем чате или в чате id)
//   #photo          строка показывается как фото
//   #delay:12m      пауза перед строкой (s, m, h)
//   #unlock:id      открыть контакт
//   #chapter        строка начинает новую главу (текст строки = название)
//   #rename:id, Имя контакт получает настоящее имя
//   на кнопке: #to:id      ответ уходит в чат id
//              #silent     выбор без исходящего сообщения
//              #label:...  что написать на кнопке, если сам текст сообщения неочевиден

# title: THE NUMBER
# contact: theo, Тео, blue
# contact: watcher, Неизвестный номер, grey
# contact: storage, Харбор Сторидж, teal
# contact: dental, Дентал Плюс, green
# contact: carrier, Вела Мобайл, purple
# contact: dina, Дина, amber
# contact: nimbus, Нимбус, indigo
# contact: parking, Парковочная служба, lime
# contact: okafor, Грейс Окафор, pink
# contact: ray, Рэй (новый номер), red
# contact: stranger, Неизвестный номер, cyan

// глава 1
VAR theo_trust = 0
VAR told_theo = false
VAR lied = false
VAR dentist_clue = false
VAR dentist_confirmed = false
VAR knows_story = false
VAR watcher_knows = false
VAR gave_code = false
VAR climbed = false
VAR warned = false
VAR saw_shoes = false
VAR bluffed = false
VAR asked_how = false
VAR ending = ""
// глава 2
VAR code_choice = ""
VAR hostile = false
VAR told_dina = false
VAR dina_trust = 0
// глава 3
VAR dina_drove = false
VAR warned_tail = false
VAR paid_fines = false
VAR found_adapter = false
VAR sold_out = false
// глава 4
VAR gave_card = false
VAR redeemed = false
VAR fob_safe = true
// глава 5
VAR heard_audio = false
VAR auction_won = false
VAR took_role = false
VAR keep_secret = false

-> ch1

INCLUDE ch01.ink
INCLUDE ch02.ink
INCLUDE ch03.ink
INCLUDE ch04.ink
INCLUDE ch05.ink
