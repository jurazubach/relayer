// ============ ГЛАВА 8 · пятница, ночь ============


// намеренно: C-51 «старой лестницы» здесь — место, где «нашли» телефон (ложь Джесс, facts.md: пятница ≈ 23:00), а не свет в 01:15: его игрок узнаёт от Коннора в ch8_connor_ladder
=== ch8 ===
Пятница, ночь · Номер Лили #sys:lily #chapter #delay:90m
~ sync_world()
Её телефон я нашёл у карьера, под камнями у старой лестницы. #from:lily #delay:20s
Телефон в прозрачном чехле для гребли, на шнурке. Экран в трещинах #photo #delay:20s
Скрин заметки: «это Оуэн Брайт!! он держал меня за руку». Изменено: сегодня, 05:38 #photo #delay:20s
Отдайте полиции. Сам я не могу. #delay:30s
- (ask)
* [Кто вы? #to:lily]
    Неважно, кто я. Я просто нашёл. #from:lily #delay:2m
* [Где именно у лестницы? #to:lily]
    ~ jess_clues += 1
    На полке. Над водой. #from:lily #delay:2m
    Под камнем. #delay:20s
* [Почему не в полицию? #to:lily]
    Меня там не должно было быть. #from:lily #delay:3m
* [#remind:5m] Вы получили?? Это важно!!
    -> ask
* [#noanswer]
- -> ch8_finder

=== ch8_finder ===
я не хотела вас пугать #from:lily #delay:1m
\*хотел #delay:20s
Мне пора. #delay:30s
* [Заметка изменена сегодня в 05:38. Вы написали её сами #to:lily #label:Уличить: заметку изменили сегодня]
    ~ fake_note_caught = true
    Сообщение не доставлено #sys:lily #delay:1m
* [Нашедший: «не хотела» → «*хотел». Пишет девушка. Записка изменена сегодня в 05:38 #to:notes #label:Сохранить в заметки]
    ~ jess_clues += 1
* [Не отвечать #to:lily #silent]
* [#noanswer:3m]
- -> ch8_show

=== ch8_show ===
Номер не в сети #sys:lily #delay:1m
* [Чей это номер? Мне прислали записку про Оуэна #to:ellie #label:Переслать записку Элли]
    ~ note_shown_to = "ellie"
    -> ch8_show_ellie
* [Вы знаете этот номер? Мне прислали с него записку #to:judith #label:Переслать записку Джудит]
    ~ note_shown_to = "judith"
    -> ch8_show_judith
* [Мне пишут с телефона, который нашли у карьера. Вот записка #to:maya #label:Переслать записку Мае]
    ~ note_shown_to = "maya"
    ~ maya_trust += 1
    -> ch8_show_maya
* [Тебе это знакомо? #to:owen #label:Переслать записку Оуэну]
    ~ note_shown_to = "owen"
    -> ch8_show_owen
* [#noanswer:3m]
    -> ch8_jess

// Элли без телефона с конца гл. 7: отвечает позже, когда мама его отдаёт (ch8_ellie_late)
=== ch8_show_ellie ===
~ c8_ellie_late = true
Элли не в сети #sys:ellie #delay:2m
-> ch8_jess

=== ch8_ellie_late ===
{maya_posted && c7_post_ellie:
    ~ ellie_trust -= 1
}
мама отдала телефон. на пять минут #from:ellie #delay:20m
{maya_posted && c7_post_ellie:
    забирала из-за поста #delay:20s
}
-> ch8_ellie_sees

=== ch8_ellie_sees ===
это номер лили #from:ellie #delay:1m
это её номер #delay:5s
откуда #delay:20s
#rename:lily, Lily 💧
она никогда не писала «оуэн брайт». только «брайт» #delay:40s
и таких знаков не ставила #delay:20s
* [Значит, это писала не она #to:ellie]
    ~ fake_note_caught = true
    конечно не она #from:ellie #delay:30s
* [Ты можешь ошибаться #to:ellie]
    нет #from:ellie #delay:30s
* [#noanswer:3m]
- мама у двери. всё #from:ellie #delay:30s
Элли не в сети #sys:ellie #delay:5s
-> ch8_judith

=== ch8_show_judith ===
Это номер Лилиан. #from:judith #delay:10m
#rename:lily, Lily 💧
Я до сих пор плачу за него. Не смогла отключить. #delay:30s
Лилиан никогда не ставила восклицательных знаков. Она говорила, что это крик. #delay:40s
У её телефона был код. Четыре цифры. Я его так и не узнала. #delay:30s
* [Откройте детализацию за июнь #to:judith]
    ~ bill_asked = true
    Конверты от оператора я не открываю с июня. #from:judith #delay:3m
    {
    - judith_trust >= 2:
        Хорошо. #delay:30s
    - else:
        Зачем Вам? #delay:20s
        Тот, у кого её телефон, мог быть с ней в ту ночь #me:judith #delay:1m
        Хорошо. #from:judith #delay:3m
    }
* [Значит, писал кто-то, кто знал её код #to:judith]
    ~ fake_note_caught = true
    Кто-то, кто знал её код. #from:judith #delay:2m
* [#noanswer:3m]
- Я на смене, меня зовут. #from:judith #delay:30s
{bill_asked:
    Конверт за июнь лежит у меня на столе. Открою утром. #delay:20s
}
-> ch8_jess

=== ch8_show_maya ===
Брайт. #from:maya #delay:5m
Конечно. #delay:20s
Я ночую в машине у моста. Сеть пропадает. #delay:30s
{
- maya_target == "jess":
    Или кто-то хочет, чтобы мы так думали. #delay:40s
- else:
    ~ maya_target = "owen"
    Утром поговорю с ним. #delay:30s
}
-> ch8_jess

=== ch8_show_owen ===
Это не она писала. #from:owen #delay:5m
Откуда у тебя это. #delay:30s
Кто прислал. #delay:10s
- (ask)
* [Пишут с телефона, который нашли у старой лестницы #to:owen #label:Сказать, откуда записка]
    Понятно 🙂 #from:owen #delay:3m
* [Промолчать #to:owen #silent]
    Ладно 🙂 #from:owen #delay:3m
* [#remind:5m] Мне хватит одного слова. Кто 🙂
    -> ask
* [#noanswer]
    Ладно. Узнаю сам 🙂 #from:owen #delay:1m
- Передай тому, кто пишет с её номера: я тоже умею писать с чужих. #delay:30s
-> ch8_jess

=== ch8_jess ===
{
- note_shown_to == "maya":
    омг мая всем рассказывает про какой-то телефон!! #from:jess #delay:20m
- note_shown_to == "owen":
    омг оуэн всех обзванивает. спрашивает про какой-то телефон #from:jess #delay:20m
- else:
    // не переслал никому (ветка «не ответил» в ch8_show) — 3 мин уже прождал у кнопки
    омг говорят у кого-то её телефон!! #from:jess #delay:{note_shown_to == "":17m|20m}
}
и там про оуэна #delay:20s
{jess_exposed:
    я понимаю что вы мне теперь не верите. но это правда #delay:30s
}
вам писали?? #delay:20s
- (ask)
* {note_shown_to != "maya" && note_shown_to != "owen"} [Откуда ты знаешь про телефон? #to:jess]
    ~ jess_clues += 1
    ну… все говорят #from:jess #delay:3m
    элли сказала #delay:30s
* [Что ты про это думаешь? #to:jess]
    я думаю это оуэн. я всегда знала!! #from:jess #delay:1m
* [Промолчать #to:jess #silent]
    ладно. я просто спросила #from:jess #delay:1m
* [#remind:5m] я третий раз перечитываю чат класса. там все только про это
    -> ask
* [#noanswer]
- всё, сплю. в пять на воду #from:jess #delay:30s
а если это правда оуэн. он знает где я живу #delay:20s
Джесс не в сети #sys:jess #delay:5s
-> ch8_hart

=== ch8_hart ===
Детектив-сержант Харт, полиция Девона. Простите за поздний час. #from:hart #delay:20m
{
- cover == "honest":
    Вы — {alias}? Вы расспрашиваете людей о гибели Лилиан Марш. #delay:20s
- else:
    Вы — {alias}? Вы делаете опрос о вечеринках на карьере. #delay:20s
}
{
- world == "open":
    Я в группе повторного расследования гибели Дэниела Кина. #delay:30s
- else:
    Мы получили анонимное сообщение о записи с карьера Холлоуэй. #delay:30s
}
* [Откуда у вас мой номер? #to:hart]
    Из поста Wexcombe Watch. Его видел весь город. #from:hart #delay:1m
* [Чем могу помочь? #to:hart]
    Хорошо, что Вы так ставите вопрос. #from:hart #delay:1m
* [#noanswer:3m]
- -> ch8_hart_files

=== ch8_hart_files ===
{
- owen_reply == "deleted":
    Нам известно, что Вы удалили копии. Но удалённое часто остаётся. #from:hart #delay:30s
- owen_reply == "refused":
    Понимаю, Вы не хотите переписки с участниками событий. #from:hart #delay:30s
- else:
    Вы правильно не отвечаете частным лицам. Но полиции ответить придётся. #from:hart #delay:30s
}
{owen_knows >= 2:
    Мы знаем, что Вы находитесь за пределами Великобритании. #delay:20s
}
{note_shown_to == "owen" || note_shown_to == "maya":
    Также нас интересуют сообщения с телефона Лилиан Марш. #delay:20s
}
Пришлите файлы сюда, не через участок. Давайте по-взрослому. #delay:30s
DS Харт, полиция Девона
- (ask)
* [Отправляю. Три файла во вложении #to:hart #label:Отправить файлы сержанту]
    ~ hart_fooled = true
    Вы отправили 3 файла #sys:hart #delay:10s
    Получено. Благодарю за содействие 🙏 #from:hart #delay:2m
    -> ch8_after_hart
* [Назовите номер жетона. Я проверю #to:hart]
    Конечно. 4471. Звоните 🙂 #from:hart #delay:4m
    -> ch8_hart_check
* {owen_knows >= 2 || owen_reply != ""} [Это ты, Оуэн? #to:hart]
    ~ hart_exposed = true
    Сообщение не доставлено #sys:hart #delay:2m
    Не понимаю, о чём ты 🙂 #from:owen #delay:5m
    -> ch8_after_hart
* [Промолчать #to:hart #silent]
    -> ch8_hart_quiet
* [#remind:8m] Это формальность. Файлы, и вопрос с Вашим участием закрыт.
    -> ask
* [#noanswer]
    // 16 мин уже прождал у кнопки — пятиминутной паузы ch8_hart_quiet не нужно
    Если файлы не поступят до понедельника, мы будем вынуждены… #from:hart #delay:30s
    -> ch8_after_hart

=== ch8_hart_quiet ===
Если файлы не поступят до понедельника, мы будем вынуждены… #from:hart #delay:5m
-> ch8_after_hart

=== ch8_hart_check ===
* [В полиции Девона есть сержант Харт? #to:judith]
    ~ hart_exposed = true
    Спросила знакомую из диспетчерской. #from:judith #delay:20m
    Сержанта Харта в полиции Девона нет. #delay:30s
* [Не проверять #to:hart #silent]
* [#noanswer:3m]
- -> ch8_after_hart

=== ch8_after_hart ===
{
- c8_ellie_late: -> ch8_ellie_late
}
-> ch8_judith

=== ch8_judith ===
{
- note_shown_to == "judith": -> ch8_connor
}
Мне сказали, что кто-то пишет с номера Лилиан. #from:judith #delay:20m
#rename:lily, Lily 💧
{judith_guarded:
    Джессике я о Вас ничего не сказала. #delay:30s
}
Я до сих пор плачу за этот номер. #delay:30s
Конверты от оператора я не открываю с июня. #delay:20s
* [Откройте конверт за июнь #to:judith]
    ~ bill_asked = true
    {
    - judith_trust >= 2:
        Хорошо. #from:judith #delay:2m
    - else:
        Зачем? #from:judith #delay:2m
        Тот, у кого её телефон, мог быть с ней в ту ночь #me:judith #delay:30s
        Хорошо. #from:judith #delay:3m
    }
* [Не надо. Это слишком тяжело #to:judith]
    Да. #from:judith #delay:2m
* [Промолчать #to:judith #silent]
* [#noanswer:3m]
- Я на смене, меня зовут. #from:judith #delay:30s
{bill_asked:
    Конверт за июнь лежит у меня на столе. Открою утром. #delay:20s
}
-> ch8_connor

=== ch8_connor ===
{connor_blocked:
    это коннор. разблокировал #from:connor #delay:20m
}
слышал про её телефон. у старой лестницы #from:connor #delay:{connor_blocked:20s|20m}
{
- not ellie_alibi:
    ~ ellie_alibi = true
    и про элли. мы с ней были в воде когда денни. скажи сестре #delay:30s
}
* [Её телефон был у костра? #to:connor]
    нет. куртки колонка бутылки. всё #from:connor #delay:2m
    она его на шее носила. в чехле. для гребли. всегда #delay:20s
* {note_connor} [У меня записано твоё: Элли и Лили пошли к воде. А что было в час? #to:connor #label:Показать запись из заметок]
    в час я был у костра #from:connor #delay:2m
    собирал всё. я уходил последний #delay:20s
* [Как Оуэн нашёл её в ту ночь? #to:connor]
    это я ему сказал #from:connor #delay:3m
    что лили ходила к воде. с чьим-то телефоном #delay:20s
    я не знал #delay:30s
* [#noanswer:3m]
- -> ch8_connor_ladder

=== ch8_connor_ladder ===
про лестницу я никому не говорил #from:connor #delay:1m
в 01:15 по старой лестнице кто-то лез. со светом #delay:30s
~ clue_ladder = true
* [Кто это был? #to:connor]
    не видел. только свет. думал пьяный #from:connor #delay:1m
* [Почему никому не сказал? #to:connor]
    я был под своим же товаром. кто б мне поверил #from:connor #delay:1m
* [#noanswer:3m]
- сегодня говорят её телефон нашли у старой лестницы #from:connor #delay:30s
я думаю это была она #delay:40s
* [01:15: кто-то со светом на старой лестнице. Коннор думает, что Лили #to:notes #label:Сохранить в заметки]
    ~ note_ladder = true
* [Значит, она выбралась из воды #to:connor]
    ~ note_ladder = true
    выбралась. и полезла наверх #from:connor #delay:1m
    а утром её нашли в воде #delay:30s
* [#noanswer:3m]
// лестница идёт в proof, только если игрок её связал (план §4): note_ladder
- -> ch8_night

=== ch8_night ===
{
- note_ladder:
    про свет пока никому. если она вылезла сама. кто был наверху? #from:connor #delay:30s
- else:
    ладно. может и показалось. только свет я видел. кто тогда лез? #from:connor #delay:30s
}
смена с утра. сплю #from:connor #delay:30s
Коннор не в сети #sys:connor #delay:5s
-> ch9
