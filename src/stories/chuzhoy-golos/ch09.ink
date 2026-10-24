// ============ ГЛАВА 9 ============

=== ch9 ===
День 9 · Лестница #from:judith #sys:judith #chapter #delay:7h
~ sync_world()
{
- bill_asked: -> ch9_bill
}
-> ch9_morning

=== ch9_bill ===
~ bill_found = true
Доброе утро. Я открыла конверт за июнь. #from:judith #delay:1m
Детализация номера 07700 900521, 22 июня: 00:24 SMS → …188 · 00:41, 00:43, 00:46 SMS → …650 · 00:52, 00:53 SMS → …777 · 00:55 SMS → …314 · 01:19 исходящий вызов, 0:14 → …314 #photo #delay:30s
650 — Элли. #delay:30s
777 и 188 я не знаю. #delay:10s
314 записан у меня в телефоне. #delay:20s
Джессика Холлис. #delay:20s
Лилиан звонила ей в 01:19. Четырнадцать секунд. #delay:40s
{not judith_guarded:
    ~ c9_jess_warned = true
    Вчера вечером я написала Джессике, что Вы просили открыть счета. Простите. Я не думала. #delay:1m
}
Джессика придёт в восемь. Как каждый вторник. #delay:30s
Что мне делать? #delay:10s
* [Ведите себя как обычно. Ни слова #to:judith]
    Она ушла. Я налила ей чай. #from:judith #delay:2h
    Я не знаю, как я это сделала. #delay:30s
* [Спросите её прямо #to:judith]
    ~ c9_jess_warned = true
    Я спросила, звонила ли ей Лилиан в ту ночь. #from:judith #delay:2h
    Она сказала: «звонила. я не взяла». Потом заплакала и ушла. #delay:30s
* [Отмените. Скажитесь больной #to:judith]
    Хорошо. #from:judith #delay:2m
    Она ответила: «выздоравливайте!!» #delay:40m
-
* [777 — это Бет Солтер. 188 — сестра Денни, Мая Кин #to:judith]
    Значит, всё сходится. #from:judith #delay:2m
* {note_she} [Лили написала Мае: «сначала поговорю с ней». А в 00:55 — Джессике #to:judith]
    ~ jess_clues += 1
    Я поняла. #from:judith #delay:3m
* [Промолчать #to:judith #silent]
- -> ch9_fake -> ch9_dj -> ch9_owen

=== ch9_morning ===
Джессика была у меня в восемь. Как каждый вторник. #from:judith #delay:150m
{not judith_guarded:
    ~ c9_jess_warned = true
    Спрашивала, чем Вы заняты. Я сказала, что Вы ищете телефон Лилиан. #delay:30s
}
* [Откройте детализацию её номера за июнь. С кем она говорила последней? #to:judith]
    ~ bill_asked = true
    ~ c9_bill_day = true
    Хорошо. Днём. #from:judith #delay:5m
* [Как Вы? #to:judith]
    Плохо. #from:judith #delay:3m
* [Промолчать #to:judith #silent]
- -> ch9_owen

// туннель: второй шанс поймать подделку
=== ch9_fake ===
{
- fake_note_caught: ->->
}
Ещё одно. Мне прислали скрин той записки. Её пересылает полгорода. #from:judith #delay:5m
Там два восклицательных знака. Лилиан так не писала. #delay:30s
* [Значит, записку написал кто-то другой. Тот, кто знал её код #to:judith]
    ~ fake_note_caught = true
    Кто-то из своих. #from:judith #delay:2m
* [Она могла написать так в панике #to:judith]
    Могла. #from:judith #delay:3m
    Я уже ничего не знаю про свою дочь. #delay:30s
* [Промолчать #to:judith #silent]
- ->->

// туннель: сожжённая страница дневника
=== ch9_dj ===
~ jess_clues += 1
На одной из сожжённых страниц было: «Дж. знает про дэна». #from:judith #delay:2m
Лилиан звала меня «Дж.» в записках на холодильнике. Я решила, что это обо мне. #delay:30s
Теперь я думаю, что не обо мне. #delay:20s
->->

=== ch9_owen ===
{
- world == "open":
    Завтра в десять у меня допрос. #from:owen #delay:40m
- maya_target == "owen":
    Мая Кин вчера стояла у моего дома. #from:owen #delay:40m
- else:
    Привет. #from:owen #delay:40m
}
Нам надо поговорить. #delay:20s
{hart_fooled:
    Спасибо за файлы. Харт — это я. #delay:30s
}
{hart_exposed:
    Да, Харт — это был я. Глупо. #delay:30s
}
{exposed_fake:
    ~ jess_clues += 1
    Про Wexcombe Watch. Это была Джесс. Я попросил. #delay:30s
}
* {ladder_known} [Лили выбралась из воды. В 01:15 её видели на старой лестнице #to:owen #label:Сказать Оуэну, что Лили выплыла]
    -> ch9_owen_turn
* {note_shown_to == "owen" || note_shown_to == "maya"} [Тот телефон нашли у старой лестницы. Не в воде #to:owen]
    в воде он остался бы на дне #from:owen #delay:5m
    -> ch9_owen_turn
* {note_threat} [У меня есть твоё «жаль будет, если история про Денни всплывёт». Говори #to:owen #label:Надавить угрозой из заметок]
    ладно #from:owen #delay:5m
    я схватил её за руку. она упала. я ушёл #delay:30s
    ** [Лили выбралась из воды. В 01:15 её видели на старой лестнице #to:owen #label:Сказать Оуэну, что Лили выплыла]
        -> ch9_owen_turn
    ** [Промолчать #to:owen #silent]
        -> ch9_owen_silent
* [Промолчать #to:owen #silent]
    -> ch9_owen_silent

=== ch9_owen_silent ===
Ладно. {world == "open":Завтра на допросе я скажу|Тогда я всем скажу}, что голос на записи — Элли 🙂 #from:owen #delay:1h
-> ch9_maya

=== ch9_owen_turn ===
~ owen_turned = true
~ jess_clues += 2
она выплыла #from:owen #delay:14m
четыре месяца я думал, что это я #delay:40s
я нашёл её на уступе. около часа #delay:30s
она сказала: карты в телефоне уже нет. и бросила мой телефон в воду #delay:20s
я схватил её за руку. она упала #delay:30s
она плыла. я видел. и ушёл #delay:40s
на верхней тропе стояла джесс #delay:1m
я сказал ей: ты ничего не видела. как тогда #delay:20s
как тогда — это денни. два года назад она стояла с ним наверху #delay:40s
это её голос на записи #delay:20s
она толкнула его. я видел #delay:30s
телефон лили у неё. больше не у кого #delay:40s
* [Расскажи это полиции. Всё. Я подтвержу про лестницу #to:owen]
    ~ owen_deal = true
    {world == "open":в десять. всё|завтра поеду в эксетер сам} #from:owen #delay:5m
    {world == "owen":
        и отдам карту #delay:20s
    }
* [Ты оставил её в воде. Ничего я тебе не обещаю #to:owen]
    знаю #from:owen #delay:5m
    всё равно скажу #delay:20s
* [Промолчать #to:owen #silent]
    подумай до утра #from:owen #delay:30m
-
* {knows_tox} [Оуэн: около 01:00 драка на уступе, Лили упала в воду и плыла. На тропе стояла Джесс. Синяк на запястье — его рука #to:notes #label:Сохранить в заметки]
* {not knows_tox} [Оуэн: около 01:00 драка на уступе, Лили упала в воду и плыла. На тропе стояла Джесс #to:notes #label:Сохранить в заметки]
* [Не сохранять #to:notes #silent]
- -> ch9_maya

=== ch9_maya ===
{
- whisper_known:
    Тренер прислал видео гонок. #from:maya #delay:2h
    Я искала голос Дэна. #delay:20s
    На старте рулевая считает: «на счёт три». #delay:40s
    Тот же счёт. Та же пауза перед «три». #delay:30s
    это не элли #delay:1m
    Это Джесс Холлис. #delay:30s
    ~ maya_target = "jess"
    Я знаю, где она живёт. #delay:20s
- maya_target == "owen":
    Брайт вызвал на меня полицию. Я в машине у пирса. #from:maya #delay:2h
    Скажи мне, что ты знаешь. #delay:30s
- else:
    Я в машине у пирса. #from:maya #delay:2h
    Скажи мне, что ты знаешь. #delay:30s
}
* [Подожди до завтра. Дай мне сутки #to:maya #label:Попросить сутки]
    {
    - maya_trust >= 2:
        ~ maya_trust += 1
        Сутки. #from:maya #delay:3m
    - else:
        У меня было два года. #from:maya #delay:3m
    }
* {owen_turned} [Это Джесс. Оуэн видел её на тропе в ту ночь. И телефон Лили, скорее всего, у неё #to:maya]
    -> ch9_maya_told
* {not owen_turned && bill_found} [Это Джесс. Лили звонила ей последней, в 01:19 #to:maya]
    -> ch9_maya_told
* {whisper_known} [Ты точно знаешь? Ты уже ошиблась с Элли #to:maya]
    ~ maya_trust -= 1
    Не ошиблась бы, если бы мне кто-то помогал. #from:maya #delay:3m
* [Промолчать #to:maya #silent]
- -> ch9_after_maya

=== ch9_maya_told ===
~ maya_target = "jess"
~ maya_trust += 2
Спасибо. #from:maya #delay:5m
Теперь я решу сама. #delay:30s
-> ch9_after_maya

=== ch9_after_maya ===
{
- c9_bill_day: -> ch9_bill_day
}
-> ch9_jess

=== ch9_bill_day ===
~ bill_found = true
Я открыла конверт. #from:judith #delay:80m
Детализация номера 07700 900521, 22 июня: 00:24 SMS → …188 · 00:41, 00:43, 00:46 SMS → …650 · 00:52, 00:53 SMS → …777 · 00:55 SMS → …314 · 01:19 исходящий вызов, 0:14 → …314 #photo #delay:30s
650 — Элли. 314 записан у меня в телефоне. #delay:30s
Джессика Холлис. #delay:20s
Лилиан звонила ей в 01:19. Четырнадцать секунд. #delay:30s
Она была у меня сегодня в восемь. Я налила ей чай. #delay:30s
-> ch9_fake -> ch9_dj -> ch9_jess

=== ch9_jess ===
~ c9_has_ev = bill_found || owen_turned || fake_note_caught || jess_clues >= 3 || whisper_known
{
- c9_jess_warned:
    вы что-то спрашивали у джудит про лили?? зачем?? #from:jess #delay:1h
- else:
    Джесс в сети #sys:jess #delay:1h
}
* {bill_found} [Лили звонила тебе в 01:19. Четырнадцать секунд #to:jess #label:Предъявить звонок]
    -> ch9_jess_conf
* {owen_turned} [Оуэн видел тебя на тропе в ту ночь. И два года назад — на уступе #to:jess]
    -> ch9_jess_conf
* {fake_note_caught || jess_clues >= 3} [Записку с её телефона написала ты. «*хотел» #to:jess]
    -> ch9_jess_conf
* {whisper_known} [«на счёт три, дэн». Так считают в лодке #to:jess]
    -> ch9_jess_conf
* {not c9_has_ev} [Джесс, тебе есть что мне сказать? #to:jess]
    нет. простите. мне надо идти #from:jess #delay:5m
    -> ch9_beth_gate
* {not c9_has_ev} [Промолчать #to:jess #silent]
    -> ch9_beth_gate

=== ch9_jess_conf ===
что?? нет!! вы с ума сошли #from:jess #delay:2m
-> ch9_denny ->
~ jess_confessed = 1
лили я не трогала!! #delay:1m
* [Тебе было пятнадцать #to:jess]
    ~ jess_bond += 1
    мне и сейчас как будто пятнадцать #from:jess #delay:3m
* [Ты два года смотрела, как Элли за это платит #to:jess]
    ~ jess_bond -= 1
    я знаю #from:jess #delay:5m
* [Где телефон Лили? #to:jess]
    {jess_bond >= 1:у меня|телефон?? какой телефон!!} #from:jess #delay:5m
-
* {bill_found} [Тогда почему Лили звонила тебе в 01:19? #to:jess]
    {
    - not c9_jess_warned || jess_bond >= 1:
        ~ jess_promised = true
        не могу. не сейчас #from:jess #delay:20m
        завтра в пять я на воде. потом скажу вам всё. только вам #delay:1m
    - else:
        она позвонила. я не пошла. я была дома!! #from:jess #delay:5m
    }
* [Иди домой, Джесс #to:jess]
    иду #from:jess #delay:2m
* [Промолчать #to:jess #silent]
    Джесс не в сети #sys:jess #delay:10m
- -> ch9_beth_gate

// туннель: признание про Денни (гл. 9 или запасной путь на рассвете гл. 10)
=== ch9_denny ===
{
- c10_dawn:
    дэн #from:jess #delay:2m
- else:
    дэн #from:jess #delay:40m
}
мы стояли вдвоём. он боялся #delay:40s
я сказала на счёт три. как в лодке. я всегда так считаю #delay:40s
я толкнула его. чуть-чуть. как новичков с мостков #delay:1m
он поскользнулся #delay:30s
оуэн сказал: тебя тут не было. беги #delay:40s
и я побежала #delay:30s
->->

=== ch9_beth_gate ===
{
- c8_beth_done: -> ch9_ellie
}
-> ch9_beth

=== ch9_beth ===
{beth_written:
    эм привет. вы мне тогда писали про опрос #from:beth #delay:2h
- else:
    ~ jess_clues += 1
    эм привет. это джесс тогда сказала мне вам написать #from:beth #delay:2h
    сказала, что про куртку важно #delay:20s
}
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
* [Промолчать #to:beth #silent]
- -> ch9_ellie

=== ch9_ellie ===
что происходит. все молчат #from:ellie #delay:90m
* [На уступе с Денни была Джесс. Это её голос #to:ellie]
    ~ ellie_trust += 1
    джесс #from:ellie #delay:5m
    мы сидели рядом на химии #delay:1m
    она носила мне конспекты когда со мной никто не #delay:40s
    значит мне не показалось #delay:1m
    прости #delay:30s
* [Завтра. Сейчас не могу #to:ellie]
    ок #from:ellie #delay:30s
* [Как ты? #to:ellie]
    не знаю #from:ellie #delay:1m
- -> ch9_ellie_end

=== ch9_ellie_end ===
{ellie_block_told:
    если всё выйдет наружу — я скажу им про блок. сама #from:ellie #delay:2m
}
{
- not bill_found: -> ch9_bill_late
}
-> ch9_hook

=== ch9_bill_late ===
~ bill_found = true
Сегодня я открыла конверт за июнь. Из-за того сообщения с её номера. #from:judith #delay:70m
Детализация номера 07700 900521, 22 июня: 00:24 SMS → …188 · 00:41, 00:43, 00:46 SMS → …650 · 00:52, 00:53 SMS → …777 · 00:55 SMS → …314 · 01:19 исходящий вызов, 0:14 → …314 #photo #delay:30s
314 — Джессика Холлис. #delay:40s
Лилиан звонила ей в 01:19. Четырнадцать секунд. #delay:30s
Она была у меня сегодня в восемь. Я налила ей чай. #delay:30s
-> ch9_fake -> ch9_dj -> ch9_hook

=== ch9_hook ===
Я попросила Джессику прийти завтра в восемь. #from:judith #delay:30m
Сказала, что хочу отдать ей вещи Лилиан. #delay:20s
Kind regards, J. Marsh.
{jess_promised:
    завтра в пять я на воде #from:jess #delay:90m
    потом скажу всё #delay:20s
    только вам
- else:
    джудит позвала меня завтра. зачем?? #from:jess #delay:90m
}
-> ch10

