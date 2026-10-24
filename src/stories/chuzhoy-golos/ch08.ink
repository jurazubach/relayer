// ============ ГЛАВА 8 ============

=== ch8 ===
День 8 · Номер Лили #from:lily #sys:lily #chapter #delay:5m
~ sync_world()
* [Кто вы? #to:lily]
    Неважно, кто я. Я просто нашёл. #from:lily #delay:2m
* [Где именно у лестницы? #to:lily]
    На полке. Над водой. #from:lily #delay:2m
    Под камнем. #delay:20s
* [Почему не отнесёте в полицию сами? #to:lily]
    Меня там не должно было быть. #from:lily #delay:3m
* [Промолчать #to:lily #silent]
    Вы получили?? Это важно!! #from:lily #delay:25m
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
- -> ch8_show

=== ch8_show ===
Номер не в сети #sys:lily #delay:50m
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

=== ch8_show_ellie ===
{
- maya_posted && c7_post_ellie:
    ~ c8_ellie_late = true
    Элли не в сети #sys:ellie #delay:5m
    -> ch8_jess
}
-> ch8_ellie_sees

=== ch8_ellie_late ===
~ ellie_trust -= 1
мама забрала телефон. из-за поста #from:ellie #delay:30m
только что отдала #delay:20s
-> ch8_ellie_sees

=== ch8_ellie_sees ===
это её номер #from:ellie #delay:3m
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
- -> ch8_ellie_after

=== ch8_ellie_after ===
{
- c8_ellie_late: -> ch8_maya
}
-> ch8_jess

=== ch8_show_judith ===
Это номер Лилиан. #from:judith #delay:20m
#rename:lily, Lily 💧
Я до сих пор плачу за него. Не смогла отключить. #delay:30s
Лилиан никогда не ставила восклицательных знаков. Она говорила, что это крик. #delay:40s
У её телефона был код. Четыре цифры. Я его так и не узнала. #delay:30s
* [Откройте детализацию за июнь. С кем она говорила последней? #to:judith]
    ~ bill_asked = true
    Конверты от оператора я не открываю с июня. #from:judith #delay:3m
    {
    - judith_trust >= 2:
        Хорошо. Вечером. #delay:30s
    - else:
        Зачем Вам? #delay:20s
        Тот, у кого её телефон, мог быть с ней в ту ночь #me:judith #delay:1m
        Хорошо. Вечером. #from:judith #delay:5m
    }
* [Значит, записку написал кто-то другой #to:judith]
    ~ fake_note_caught = true
    Кто-то, кто знал её код. #from:judith #delay:2m
* [Спасибо #to:judith]
    Kind regards, J. Marsh. #from:judith #delay:1m
- -> ch8_jess

=== ch8_show_maya ===
Брайт. #from:maya #delay:10m
Конечно. #delay:20s
{
- maya_target == "jess":
    Или кто-то хочет, чтобы мы так думали. #delay:40s
- else:
    ~ maya_target = "owen"
    Я поговорю с ним. #delay:30s
}
-> ch8_jess

=== ch8_show_owen ===
Это не она писала. #from:owen #delay:14m
Откуда у тебя это. #delay:30s
Кто прислал. #delay:10s
* [Пишут с телефона, который нашли у старой лестницы #to:owen]
    Понятно 🙂 #from:owen #delay:20m
* [Промолчать #to:owen #silent]
    Ладно 🙂 #from:owen #delay:30m
- -> ch8_jess

=== ch8_jess ===
{
- note_shown_to == "maya":
    омг мая всем рассказывает про какой-то телефон!! #from:jess #delay:5h
    и там про оуэна #delay:20s
    -> ch8_jess_b
- note_shown_to == "owen":
    омг оуэн всех обзванивает. спрашивает про какой-то телефон!! #from:jess #delay:5h
    -> ch8_jess_b
}
омг вы слышали?? #from:jess #delay:5h
говорят у кого-то её телефон!! и там про оуэна #delay:20s
-> ch8_jess_a

=== ch8_jess_a ===
{jess_exposed:
    я понимаю что вы мне теперь не верите. но это правда #delay:30s
}
* [Откуда ты знаешь про телефон? Об этом знают двое #to:jess]
    ~ jess_clues += 1
    ну… все говорят!! #from:jess #delay:3m
    элли сказала #delay:30s
* [Кто говорит? #to:jess]
    ну люди #from:jess #delay:1m
    это точно оуэн. я всегда знала!! #delay:20s
* [Промолчать #to:jess #silent]
    ау?? #from:jess #delay:20m
- -> ch8_hart

=== ch8_jess_b ===
{jess_exposed:
    я понимаю что вы мне теперь не верите. но это правда #delay:30s
}
* [Что ты про это думаешь? #to:jess]
    я думаю это оуэн. я всегда знала!! #from:jess #delay:1m
* [Промолчать #to:jess #silent]
    ау?? #from:jess #delay:20m
- -> ch8_hart

=== ch8_hart ===
Добрый день. Детектив-сержант Харт, полиция Девона. #from:hart #delay:150m
Вы — {alias}, автор опроса о вечеринках на карьере? #delay:20s
{
- world == "open":
    Я в группе повторного расследования гибели Дэниела Кина. #delay:30s
- else:
    Мы получили анонимное сообщение о записи с карьера Холлоуэй. #delay:30s
}
{
- owen_reply == "deleted":
    Нам известно, что Вы удалили копии. Но удалённое часто остаётся. #delay:30s
- owen_reply == "refused":
    Понимаю, Вы не хотите переписки с участниками событий. #delay:30s
- else:
    Вы правильно не отвечаете частным лицам. Но полиции ответить придётся. #delay:30s
}
{owen_knows >= 2:
    Мы знаем, что Вы находитесь за пределами Великобритании. #delay:20s
}
{note_shown_to == "owen" || note_shown_to == "maya":
    Также нас интересуют сообщения с телефона Лилиан Марш. #delay:20s
}
Пришлите файлы ответом сюда. Или на мою личную почту, не через участок: так быстрее. #delay:30s
Давайте по-взрослому. #delay:10s
DS Харт, полиция Девона
* [Отправляю. Три файла во вложении #to:hart #label:Отправить файлы сержанту]
    ~ hart_fooled = true
    Вы отправили 3 файла #sys:hart #delay:10s
    Получено. Благодарю за содействие 🙏 #from:hart #delay:2m
    {act1 == "owen":
        Ай-ай 🙂 #from:owen #delay:5m
        Я же просил удалить
    }
    -> ch8_after_hart
* [Назовите номер жетона. Я позвоню в участок #to:hart]
    Конечно. 4471. Звоните 🙂 #from:hart #delay:4m
    -> ch8_hart_check
* {owen_knows >= 2 || owen_reply != ""} [Это ты, Оуэн? #to:hart]
    ~ hart_exposed = true
    Сообщение не доставлено #sys:hart #delay:2m
    Не понимаю, о чём ты 🙂 #from:owen #delay:1h
    -> ch8_after_hart
* [Промолчать #to:hart #silent]
    Если файлы не поступят до среды, мы будем вынуждены… #from:hart #delay:2h
    -> ch8_after_hart

=== ch8_hart_check ===
* [В полиции Девона есть сержант Харт? #to:judith]
    Я спрошу у знакомой из отдела. #from:judith #delay:20m
    Такого нет. #delay:2h
    ~ hart_exposed = true
* {world == "open"} [Как зовут детектива, который с тобой говорил? #to:ellie]
    ~ hart_exposed = true
    окафор. констебль окафор. женщина #from:ellie #delay:40m
    а что #delay:20s
* [Не проверять #to:hart #silent]
- -> ch8_after_hart

=== ch8_after_hart ===
{
- c8_ellie_late: -> ch8_ellie_late
}
-> ch8_maya

=== ch8_maya ===
{
- maya_target == "owen":
    Я была у дома Брайта. Его отец вызвал полицию. Меня попросили уехать. #from:maya #delay:90m
- maya_posted && c7_post_ellie:
    Пост висит. Под ним двести комментариев. Мне всё равно. #from:maya #delay:90m
- else:
    Я весь день в Векскомбе. #from:maya #delay:90m
}
Я сходила на лодочную станцию. Дэн там грёб с двенадцати. #delay:30s
Тренер обещал скинуть старые видео гонок. Хочу услышать его голос. #delay:30s
* {tom_proof} [Wexcombe Watch — это Джесс Холлис. Она с первого дня врала #to:maya]
    ~ maya_target = "jess"
    ~ maya_trust += 1
    Джесс Холлис. #from:maya #delay:3m
    Запомню. #delay:30s
* [Будь осторожна #to:maya]
    Я два года осторожна. #from:maya #delay:2m
* [Промолчать #to:maya #silent]
- -> ch8_judith

=== ch8_judith ===
{
- note_shown_to == "judith": -> ch8_beth_gate
}
Мне сказали, что кто-то пишет с номера Лилиан. #from:judith #delay:1h
#rename:lily, Lily 💧
Я до сих пор плачу за этот номер. #delay:30s
Конверты от оператора я не открываю с июня. #delay:20s
* [Откройте детализацию за июнь #to:judith]
    ~ bill_asked = true
    Зачем? #from:judith #delay:2m
    Тот, у кого её телефон, мог быть с ней в ту ночь #me:judith #delay:30s
    Хорошо. Сегодня. #from:judith #delay:3m
* [Не надо. Это слишком тяжело #to:judith]
    Да. #from:judith #delay:2m
* [Промолчать #to:judith #silent]
    Kind regards, J. Marsh. #from:judith #delay:5m
- -> ch8_beth_gate

=== ch8_beth_gate ===
{
- maya_posted && not c7_post_ellie: -> ch8_beth
}
-> ch8_connor

=== ch8_beth ===
~ c8_beth_done = true
эм привет #from:beth #delay:90m
я видела пост маи #delay:20s
я тогда показала не всё #delay:30s
Lily 💧 00:53 — она меня заблокировала. глупая. скажи ей что я не злюсь #photo #delay:30s
я думала элли от этого будет хуже #delay:30s
~ ellie_block_told = true
* [Lily 💧 00:53: «она меня заблокировала. глупая. скажи ей что я не злюсь» #to:ellie #label:Переслать Элли]
    ~ ellie_trust += 1
    она не злилась #from:ellie #delay:5m
    она не злилась #delay:10s
* [Спасибо, Бет #to:beth]
    простите что так поздно #from:beth #delay:1m
- -> ch8_connor

=== ch8_connor ===
{
- connor_blocked:
    это коннор. разблокировал. надо поговорить #from:connor #delay:2h
    -> ch8_connor_talk
- connor_ally:
    ты тут #from:connor #delay:2h
    -> ch8_connor_talk
}
Коннор в сети #sys:connor #delay:2h
* [Коннор, нужен один ответ. Про ту ночь #to:connor]
    ну #from:connor #delay:10m
    -> ch8_connor_talk
* [Промолчать #to:connor #silent]
    ладно я сам #from:connor #delay:40m
    -> ch8_connor_ladder

=== ch8_connor_talk ===
{
- not ellie_alibi:
    ~ ellie_alibi = true
    и про элли. мы с ней были в воде когда денни. скажи сестре #from:connor #delay:30s
}
* [Ты забрал всё от костра. Её телефон был там? #to:connor]
    нет. куртки колонка бутылки. всё #from:connor #delay:2m
    она его на шее носила. в чехле. для гребли. всегда #delay:20s
* {note_connor} [У меня записано твоё: в 00:30 они пошли к воде. А в час? #to:connor #label:Показать запись из заметок]
    в час я был у костра #from:connor #delay:2m
    собирал всё. я уходил последний #delay:20s
* [Как Оуэн нашёл её в ту ночь? #to:connor]
    это я ему сказал #from:connor #delay:5m
    что лили ходила к воде. с чьим-то телефоном #delay:20s
    я не знал #delay:30s
- -> ch8_connor_ladder

=== ch8_connor_ladder ===
слушай #from:connor #delay:1m
я никому не говорил #delay:20s
в 01:15 по старой лестнице кто-то лез. со светом #delay:30s
я думал пьяный. я был под своим же товаром #delay:20s
сегодня говорят её телефон нашли у старой лестницы #delay:2m
я думаю это была она #delay:40s
~ ladder_known = true
-> ch9

