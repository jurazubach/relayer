// ============ ГЛАВА 6 ============

// Джесс — рулевая, «на счёт три» (план v1 §7, ствол гл. 6)

=== ch6 ===
Пятница, день · Сестра #from:maya #sys:maya #chapter #delay:90m
// сохранение старого пилота: исход лежал в ending, а не в act1
{
- act1 == "" && ending != "":
    ~ act1 = ending
    ~ ending = ""
}
~ sync_world()
{
- jess_suspicious:
    ~ jess_bond -= 1
}
#rename:maya, Мая Кин
Последнее, что мне написал Дэн. Денни, мой брат. #from:maya
Скрин: «Дэн, 23:41 — она здесь. иду наверх» #photo
Два года назад, в августе, на том же карьере. Ему было пятнадцать. #delay:20s
* [Кто «она»? #to:maya]
    Всё лето он говорил про какую-то «её». Кто она, так и не сказал. #from:maya #delay:30s
    Полиция решила: девочка, которая так и не пришла. Я в это не верю. #delay:20s
* [Почему ты пишешь мне? #to:maya]
    ~ maya_trust += 1
    Вопросы про карьер в этом городе задают только с твоего номера. #from:maya #delay:30s
    Остальные здесь молчат два года. #delay:15s
* [#noanswer:3m]
- -> ch6_story

=== ch6_story ===
Полиция: пришёл ночью один и прыгнул. #from:maya #delay:20s
22 июня в 00:24 мне написала Лили. #delay:20s
Скрин: «Lily 💧, 00:24 — я нашла запись той ночи. там не все, кто стоял наверху. завтра скажу кто. сначала поговорю с ней» #photo
Мы переписывались с апреля. Она спрашивала, с кем Дэн грёб. #delay:15s
Юниорская гичка. Шестеро гребцов и рулевая. #delay:10s
Утром её нашли в воде. Полиции это «к делу не относится». #delay:15s
* [Дэн, 23:41: «она здесь. иду наверх». Лили, 00:24: «там не все, кто стоял наверху… сначала поговорю с ней» #to:notes #label:Сохранить в заметки]
    ~ note_she = true
* [Не сохранять #to:notes #silent]
* [#noanswer:3m]
- -> ch6_ask

=== ch6_ask ===
{
- world == "open":
    На дознании всплыла запись. Семье не дают даже послушать. #from:maya #delay:40s
- world == "hidden":
    Вердикт: несчастный случай. Но Брайт полгорода спрашивает про какую-то копию. #from:maya #delay:40s
    Думаю, она у тебя. #delay:15s
- else:
    Вердикт: несчастный случай. Говорят, запись у Брайта. Копий всегда две. #from:maya #delay:40s
}
Там три ролика: уступ, Элли с Коннором и темнота с голосом Брайта. #delay:30s
Я звукорежиссёр. Шесть лет чищу чужие голоса от шума. #delay:20s
Пришли третий. Тот, где темно. #delay:15s
- (ask)
* [Отправляю все три #to:maya #label:Отправить Мае все три файла]
    ~ maya_files = 2
    {
    - asked_ellie:
        ~ maya_trust += 1
    - else:
        ~ maya_trust += 2
    }
    Вы отправили 3 файла #sys:maya #delay:10s
    {
    - cut_frames: -> ch6_cut
    }
    -> ch6_files_done
* [Только третий. Остальное не моё #to:maya]
    ~ maya_files = 1
    ~ maya_trust += 1
    Вы отправили 1 файл #sys:maya #delay:10s
    {not asked_ellie:
        Почему не все? #from:maya #delay:30s
        Ладно. Мне хватит голоса. #delay:20s
    }
    -> ch6_files_done
// Элли отвечает и возвращает к кнопкам Маи (спица хаба)
* (asked_ellie) [Сестра Денни просит запись. Можно? #to:ellie #label:Спросить Элли]
    {
    - act1 == "owen":
        ты у меня спрашиваешь? после оуэна? #from:ellie #delay:20m
        делай что хочешь #delay:20s
    - act1 == "ellie_alone_owen":
        отправь. мне уже всё равно #from:ellie #delay:20m
    - world == "hidden":
        без моего имени. помнишь? #from:ellie #delay:20m
        третий можно. там меня нет #delay:20s
    - else:
        она имеет право. там её брат #from:ellie #delay:20m
        отправь #delay:20s
    }
    {
    - act1 != "owen":
        ~ ellie_trust += 1
    }
    -> ask
* [Нет. Запись не моя #to:maya]
    ~ maya_trust -= 1
    {
    - asked_ellie:
        Понятно. Элли решает за тебя. #from:maya #delay:30s
    - else:
        Понятно. #from:maya #delay:30s
        Найду другой способ. #delay:10s
    }
    -> ch6_files_done
* [#remind:8m] Мне не нужно всё. Только голос в темноте. #from:maya
    -> ask
* [#noanswer]
    Ладно. Поищу другой способ. #from:maya
    -> ch6_files_done

=== ch6_cut ===
Во втором вырезано. Кто резал? #from:maya #delay:3m
- (ask)
* [Элли. Там были она и Коннор #to:maya]
    ~ maya_trust += 1
    Спасибо, что не врёшь. #from:maya #delay:30s
* [Не знаю #to:maya]
    ~ maya_trust -= 1
    Знаешь. #from:maya #delay:30s
* [#remind:5m] Склейка грубая, по живому. Полиция так не режет. #from:maya
    -> ask
* [#noanswer]
    Ладно. Разберусь сама. #from:maya
- -> ch6_files_done

=== ch6_files_done ===
{
- maya_files >= 1:
    Получила. #from:maya #delay:2m
    Сажусь чистить. Мне нужна тишина. #delay:10s
- else:
    Сяду за то, что есть. Два скрина и шесть минут между ними. #from:maya #delay:2m
}
Мая не в сети #sys:maya
-> ch6_ellie

=== ch6_ellie ===
{
- act1 == "owen":
    -> ch6_ellie_owen
- act1 == "ellie_together":
    спасибо за утро. правда #from:ellie #delay:20m
    мама со мной не разговаривает #delay:20s
- act1 == "adjourned" || act1 == "adjourned_cut":
    меня вызывали ещё раз. после перерыва #from:ellie #delay:20m
    {act1 == "adjourned_cut":
        спрашивали зачем я резала запись. я сказала испугалась #delay:20s
    }
- act1 == "ellie_alone_truth":
    я дошла сама. и сказала всё #from:ellie #delay:20m
    про денни тоже #delay:20s
- act1 == "ellie_hides":
    я выбросила карту. с пирса #from:ellie #delay:20m
    теперь запись только у тебя #delay:20s
- act1 == "ellie_alone_owen":
    я отдала карту оуэну. он обещал #from:ellie #delay:20m
    прости. я решила сама. и решила не так #delay:30s
- else:
    меня теперь ненавидят по-другому #from:ellie #delay:20m
    раньше думали что я её бросила. теперь знают что я врала про денни #delay:20s
}
а после зала оуэн ждал меня у выхода #delay:30s
сказал держись того что говорила два года. «он пришёл один» #delay:20s
-> ch6_ellie_talk

=== ch6_ellie_owen ===
мои файлы у оуэна. из-за тебя #from:ellie #delay:20m
он пришёл за картой. я отдала. у него и так всё было #delay:30s
* [Прости. Это была ошибка #to:ellie]
    ~ ellie_trust += 1
    поздно #from:ellie #delay:2m
    но ладно #delay:20s
    -> ch6_ellie_talk
* [Он бы нашёл тебя через меня #to:ellie]
    может быть #from:ellie #delay:2m
    -> ch6_ellie_talk
* [Промолчать #to:ellie #silent]
    ~ ellie_trust -= 1
    Элли не в сети #sys:ellie #delay:5m
    #delay:20m
    -> ch6_jess
* [#noanswer:3m]
    Элли не в сети #sys:ellie
    // пауза перед Джесс короче на время ожидания у кнопок
    #delay:17m
    -> ch6_jess

=== ch6_ellie_talk ===
{
- quit_job:
    «тогда я заканчиваю». помню. а ты всё ещё тут #from:ellie #delay:30s
}
* [Кто ещё был наверху, когда погиб Денни? #to:ellie]
    ~ ellie_water = true
    денни. оуэн снимал с бокового #from:ellie #delay:2m
    мы с коннором прыгнули раньше него. с бокового #delay:20s
    я была в воде когда он упал #delay:20s
    мне тогда показалось что наверху двое #delay:30s
    оуэн сказал показалось
* [Тебе может написать сестра Денни #to:ellie]
    ~ ellie_warned = true
    пусть пишет #from:ellie #delay:1m
    я ей ничего не должна
    должна. наверно #delay:2m
* [Ты как после зала? #to:ellie]
    ~ ellie_trust += 1
    плохо. но лучше чем в июне #from:ellie #delay:1m
* [#noanswer:3m]
    ладно. мама зовёт #from:ellie
    #delay:17m
    -> ch6_jess
- #delay:20m
-> ch6_jess

=== ch6_jess ===
{
- world == "open":
    омг вы видели что в группе?? #from:jess
    все только про денни и говорят
- else:
    в группе уже пишут про вердикт #from:jess
    несчастный случай. я думала вы что-то найдёте
}
{
- jess_bond >= 1:
    я только вам про это пишу #delay:15s
- jess_bond < 0:
    знаю, вы мне не очень доверяете. но всё равно спрошу #delay:15s
- else:
    в группе все злые #delay:15s
}
а запись правда была? оуэн всем говорит что нет #delay:20s
- (ask)
* [Сестра Денни ищет, кто был наверху #to:jess]
    ~ jess_warned = true
    о #from:jess #delay:3m
    кто?? #delay:40s
    ну то есть она что-то нашла? #delay:20s
* [Почему тебя это так интересует? #to:jess]
    ~ jess_clues += 1
    в смысле?? я просто спросила #from:jess #delay:40s
    дэн был моим другом вообще-то #delay:20s
    мы были в одной лодке
* [Про запись ничего не знаю #to:jess]
    ну ладно. если что пишите #from:jess #delay:30s
* [#remind:5m] просто все спрашивают а я не знаю что отвечать #from:jess
    -> ask
* [#noanswer]
    ладно. если что пишите #from:jess
- ой мне бежать!! вечерняя тренировка #from:jess #delay:1m
я ж рулевая. шестеро сидят в лодке и ждут моё «на счёт три» #delay:20s
~ clue_count = true
Джесс не в сети #sys:jess
-> ch6_owen

=== ch6_owen ===
{
- act1 == "owen":
    Оуэн Б. перевёл вам £200.00 · «за порядок 🙂» #from:bank #delay:20m
    Спасибо ещё раз 🙂 С тобой приятно иметь дело #from:owen #delay:1m
    Удали свою копию. Для порядка 🙂 #delay:20s
- act1 == "ellie_alone_owen":
    Карта у меня 🙂 Спасибо за тишину #from:owen #delay:20m
    Если у тебя что-то осталось, удали. Для всех будет лучше 🙏 #delay:20s
- world == "hidden":
    Вердикт есть 🙂 Всё позади #from:owen #delay:20m
    Удали файлы, и забудем эту неделю 🙏 #delay:20s
- else:
    Сестра Денни уже тебе написала? 🙂 #from:owen #delay:20m
    Осторожно. Она два года ищет, кого обвинить 🙏 #delay:20s
    Наверху был только Денни. Я снимал. Всё это уже у полиции 🙂 #delay:20s
    {owen_knows >= 2:
        Ты же далеко. Зачем тебе это 🙂 #delay:20s
    }
    А копию свою удали. Для твоего же спокойствия 🙏 #delay:20s
}
- (ask)
* [Удалено #to:owen #label:Соврать, что файлы удалены]
    ~ owen_reply = "deleted"
    Умница 🙂 #from:owen #delay:1m
* [Не пиши мне #to:owen]
    ~ owen_reply = "refused"
    Как скажешь 🙂 #from:owen #delay:1m
* [Промолчать #to:owen #silent]
    ~ owen_reply = "silent"
    Молчание тоже ответ 🙂 #from:owen #delay:1m
* [#remind:5m] Это просто файл. Удалить дольше, чем прочитать 🙂 #from:owen
    -> ask
* [#noanswer]
    ~ owen_reply = "silent"
    #delay:10m
    -> ch6_judith
- #delay:20m
-> ch6_judith

=== ch6_judith ===
{
- judith_revealed:
    Пишу с основного номера. Прятаться больше незачем. #from:judith
    -> ch6_judith_jess
}
Второй номер был мой. «{cover == "honest":Вы не из Векскомба.|Это не опрос.}» писала я. #from:judith
#rename:unknown, Джудит Марш (второй номер)
{unknown_blocked:
    Вы тогда заблокировали тот номер. Правильно сделали. #delay:20s
- else:
    И «Оставьте Элли в покое» тоже. #delay:20s
}
Лилиан вела дневник. Несколько страниц я сожгла. #delay:30s
Страница дневника, почерк Лили: «если что-то случится, не дайте им обвинить элли» #photo
* [Что было на сожжённых страницах? #to:judith]
    Денни. И Элли. Больше я об этом писать не буду. #from:judith #delay:2m
* [Почему Вы показываете это сейчас? #to:judith]
    Слушание прошло. Мне больше нечего беречь. #from:judith #delay:2m
* [#noanswer:3m]
- -> ch6_judith_jess

=== ch6_judith_jess ===
{
- act1 == "adjourned" || act1 == "adjourned_cut":
    Полиция взяла у меня показания. Я рассказала про синяк. #from:judith #delay:30s
- world == "open":
    Я узнала из новостей, что Элли дала показания про Денни Кина. #from:judith #delay:30s
- else:
    Вердикт: несчастный случай. #from:judith #delay:30s
    {judith_revealed:
        Вы не прислали мне файлы. Я ждала. #delay:20s
    }
}
~ judith_revealed = true
Джессика заходила сегодня, хотя обычно приходит по субботам. #delay:30s
Спрашивала о Вас. Что Вы ещё делаете. #delay:10s
{jess_clues >= 1:
    Сказала, что Вы её в чём-то подозреваете. Пирог так и не разрезала. #delay:20s
}
* [Не рассказывайте ей обо мне #to:judith]
    ~ judith_guarded = true
    Хорошо. Почему? #from:judith #delay:2m
    Чем меньше людей знают, тем лучше #me:judith #delay:30s
    Понимаю. #from:judith #delay:1m
* [Она подруга Лили. Пусть знает #to:judith]
    Она приходит каждую неделю с пирогом. #from:judith #delay:2m
    Больше никто не приходит. #delay:20s
* [Промолчать #to:judith #silent]
    Kind regards, J. Marsh. #from:judith #delay:5m
* [#noanswer:3m]
    Kind regards, J. Marsh. #from:judith
    #delay:17m
    -> ch6_hook
- #delay:20m
-> ch6_hook

=== ch6_hook ===
{
- maya_files >= 1:
    ~ whisper_known = true
    Третий файл. Под его «давай, прыгай» есть второй голос. #from:maya
    Девичий. «на счёт три, дэн. раз. два». #delay:30s
    ~ clue_whisper = true
    Мая отправила вам 1 файл #sys:maya #delay:10s
    {maya_files == 2 && not cut_frames:
        На втором файле она стоит у края. Сбоку. #from:maya #delay:30s
    }
- world == "open":
    ~ whisper_known = true
    Полиция всё-таки дала семье послушать. Один раз, в кабинете. #from:maya
    Я записала из кармана. Под его «давай, прыгай» есть второй голос. #delay:20s
    Девичий. «на счёт три, дэн». #delay:30s
    ~ clue_whisper = true
- world == "owen":
    ~ whisper_known = true
    Брайт прислал мне третий файл. Сам. «послушай внимательно, там её голос 🙂». #from:maya
    Я подняла средние частоты. Под его «давай, прыгай» есть второй голос. #delay:20s
    Девичий. «на счёт три, дэн». #delay:30s
    ~ clue_whisper = true
- else:
    Записи у меня нет. Есть шесть минут. #from:maya
    Дэн написал «она здесь». Лили написала «сначала поговорю с ней». #delay:20s
    В 00:30 Лили ушла к воде с Элли Вэнс. Это знает весь город. #delay:20s
}
{whisper_known:
    «Дэн» его звали только свои. Это Элли Вэнс. #delay:20s
- else:
    Это Элли Вэнс. #delay:20s
}
~ maya_target = "ellie"
* [Ты уверена? #to:maya]
    {whisper_known:
        Я слышала её голос на дознании по Дэну. «Он пришёл один». #from:maya #delay:40s
        Два года он у меня в голове. #delay:20s
    - else:
        Оба раза «она». Оба раза рядом Элли. #from:maya #delay:40s
    }
* {ellie_water} [Элли была в воде, когда он упал #to:maya]
    Это она так говорит. #from:maya #delay:40s
    А Брайт говорит, что наверху был один Дэн. Кто-то из них врёт. #delay:20s
* {clue_whisper && clue_count} [Джесс рулевая. И считает «на счёт три» #to:maya]
    ~ jess_clues += 1
    Джесс Холлис? #from:maya #delay:40s
    Рулевые так считают в каждой лодке. Это привычка, а не имя. #delay:20s
    Но я запомню. #delay:10s
* {note_she && not ellie_water} [Лили писала «сначала поговорю с ней». Элли она бы назвала по имени #to:maya #label:Показать запись из заметок]
    ~ maya_trust += 1
    Допустим. Про лучшую подругу «сначала поговорю с ней» не пишут. #from:maya #delay:40s
    Тогда «она» у Дэна, может, и не Элли. Тогда кто? #delay:20s
* [Не езжай к ней #to:maya]
    Я два года не ездила. Хватит. #from:maya #delay:40s
* [#noanswer:3m]
- Я выезжаю в Векскомб. #from:maya #delay:20s
Ты ведь знаешь, где живёт Элли? #delay:10s
Ладно. Найду сама. #delay:20s
-> ch7
