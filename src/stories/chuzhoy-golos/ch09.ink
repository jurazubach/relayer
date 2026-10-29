// ============ ГЛАВА 9 · суббота, утро ============


=== ch9 ===
Суббота, утро · Лестница #sys:judith #chapter #delay:5h
~ sync_world()
{not judith_guarded:
    ~ jess_alarmed = true
}
{bill_asked: -> ch9_bill}
Конверт от оператора за июнь так и лежит на столе. #from:judith #delay:1m
Джессика придёт в восемь. Как каждую субботу. #delay:30s
{jess_alarmed:
    Вчера я сказала ей, что Вы ищете телефон Лилиан. Я не подумала. #delay:40s
}
- (ask)
* [Откройте конверт. Посмотрите, кому она звонила последней #to:judith #label:Попросить открыть конверт]
    ~ bill_asked = true
    Хорошо. Когда она уйдёт. #from:judith #delay:3m
* [Как Вы? #to:judith]
    Плохо. Спасибо, что спросили. #from:judith #delay:3m
* [#noanswer:10m]
- Пойду поставлю чайник. Две чашки, как всегда. #from:judith #delay:1m
Джудит Марш не в сети #sys:judith
-> ch9_owen

=== ch9_bill ===
Я открыла конверт за июнь. #from:judith #delay:1m
-> ch9_receipt ->
{jess_alarmed:
    Вчера я сказала ей, что Вы ищете телефон Лилиан. Простите. #delay:40s
}
Джессика придёт в восемь. Как каждую субботу. #delay:30s
Мне вести себя как обычно? Или спросить её прямо? #delay:20s
- (ask)
* (usual) [Ведите себя как обычно #to:judith]
    Хорошо. Как обычно. #from:judith #delay:2m
* (direct) [Спросите её прямо #to:judith]
    ~ jess_alarmed = true
    Хорошо. Спрошу. #from:judith #delay:2m
* [#remind:15m] Она всегда приходит на пять минут раньше.
    -> ask
* [#remind:15m] Я достала две чашки. Как всегда.
    -> ask
* [#noanswer:10m]
    Я ничего не буду менять. #from:judith
- Звонок в дверь. #from:judith #delay:1m
Джудит Марш не в сети #sys:judith
{
- usual:
    Она ушла. Я налила ей чай. #from:judith #delay:30m
    Я не знаю, как я это сделала. #delay:30s
- direct:
    Я спросила, звонила ли ей Лилиан в ту ночь. #from:judith #delay:30m
    Она сказала: «звонила. я не взяла». Заплакала и ушла. #delay:40s
- else:
    Она ушла. Чай, печенье, всё как всегда. #from:judith #delay:5m
    Она ни о чём не спросила. #delay:30s
}
Я буду разбирать её записки. #delay:1m
Джудит Марш не в сети #sys:judith
-> ch9_owen

// туннель со счётом за июнь — утром (bill_asked) или днём в ch9_judith
=== ch9_receipt ===
Детализация номера 07700 900521, 22 июня: 00:24 SMS → …188 · 00:41, 00:43, 00:46 SMS → …650 · 00:52, 00:53 SMS → …777 · 00:55 SMS → …314 · 01:19 исходящий вызов, 0:14 → …314 #photo #from:judith #delay:30s
650 — Элли. 314 записан у меня в телефоне. #delay:30s
Джессика Холлис. #delay:20s
Лилиан звонила ей в 01:19. Четырнадцать секунд. #delay:40s
~ clue_bill = true
->->

=== ch9_owen ===
Мой отец нанял адвоката. #from:owen #delay:5m
Нам надо поговорить 🙂 #delay:20s
{hart_fooled || hart_exposed:
    Харт — это был я. Глупо, знаю. #delay:30s
}
{exposed_fake:
    ~ jess_clues += 1
    И Wexcombe Watch — это Джесс. Я её попросил. #delay:30s
}
Когда полиция спросит меня про запись, я скажу, что голос на ней — Элли 🙂 #delay:40s
Если только ты не скажешь мне, что у тебя есть 🙏 #delay:20s
- (ask)
* {clue_ladder} [Лили выплыла. В 01:15 её видели на старой лестнице #to:owen #label:Сказать Оуэну, что Лили выплыла]
    -> ch9_turn
* {note_threat} [У меня есть твоё «жаль будет». Говори #to:owen #label:Надавить угрозой из заметок]
    ладно #from:owen #delay:5m
    я схватил её за руку. она упала. я ушёл #delay:30s
    больше я ничего не скажу #delay:20s
    - - (ask_more)
    ** {clue_ladder} [Лили выплыла. В 01:15 её видели на старой лестнице #to:owen #label:Сказать Оуэну, что Лили выплыла]
        -> ch9_turn
    ** [Промолчать #to:owen #silent]
        -> ch9_owen_off
* [Промолчать #to:owen #silent]
    -> ch9_owen_off
* [#remind:15m] Адвокат уже сидит у нас в гостиной 🙂
    -> ask

=== ch9_owen_off ===
Как скажешь 🙂 #from:owen #delay:2m
Адвокат зовёт. Пойду. #delay:30s
Оуэн Брайт не в сети #sys:owen
-> ch9_maya

=== ch9_turn ===
~ owen_turned = true
она выплыла #from:owen #delay:3m
четыре месяца я думал, что это я #delay:40s
я нашёл её на уступе. около часа #delay:30s
она сказала: карты в телефоне уже нет. и бросила мой телефон в воду #delay:30s
я схватил её за запястье. она упала #delay:30s
синяк — это я #delay:20s
она плыла. я видел. и ушёл #delay:40s
на верхней тропе стояла джесс #delay:1m
~ clue_owen_saw = true
я сказал ей: ты ничего не видела. как тогда #delay:30s
про тогда не спрашивай. там я тоже виноват #delay:40s
- (ask)
* [Расскажи это полиции. Я подтвержу про лестницу #to:owen #label:Уговорить пойти в полицию]
    ~ owen_deal = true
    {world == "open":скажу на допросе. всё|поеду в эксетер сам} #from:owen #delay:5m
    {world == "owen":
        и отдам им карту #delay:20s
    }
* [Ты оставил её в воде. Ничего не обещаю #to:owen]
    знаю #from:owen #delay:5m
    всё равно скажу #delay:20s
* [#remind:10m] я этого никому не говорил. ни отцу ни адвокату
    -> ask
* [#noanswer:10m]
    ладно #from:owen
- адвокат зовёт. отец не знает ничего из этого #from:owen #delay:1m
Оуэн Брайт не в сети #sys:owen
-> ch9_maya

=== ch9_maya ===
{
- clue_whisper:
    Тренер прислал видео гонок. #from:maya #delay:20m
    Я искала голос Дэна. #delay:20s
    На старте рулевая считает: «на счёт три». #delay:40s
    Та же пауза перед «три». Как на записи. #delay:30s
    Кто сидел у них рулевой в тот год, тренер не говорит. Ты знаешь? #delay:30s
- maya_target == "owen":
    Отец Брайта вызвал на меня полицию. #from:maya #delay:20m
    Я в машине у пирса. Скажи мне, что ты знаешь. #delay:30s
- else:
    Я в машине у пирса. Вторые сутки. #from:maya #delay:20m
    Скажи мне, что ты знаешь. #delay:30s
}
- (ask)
* {clue_whisper} [Рулевая у Дэна — Джесс Холлис. Её счёт #to:maya]
    -> ch9_named
* {not clue_whisper && clue_owen_saw} [Это Джесс. Оуэн видел её на тропе #to:maya]
    -> ch9_named
* {not clue_whisper && not clue_owen_saw && clue_bill} [Это Джесс. Лили звонила ей в 01:19 #to:maya]
    -> ch9_named
* {not clue_whisper && not clue_owen_saw && not clue_bill && clue_watch} [Это Джесс Холлис. Заявку в Wexcombe Watch подали из её дома #to:maya #label:Назвать Джесс]
    -> ch9_named
* [Подожди. Дай мне сутки #to:maya]
    {
    - maya_trust >= 2:
        ~ maya_trust += 1
        Сутки. #from:maya #delay:3m
    - else:
        У меня было два года. #from:maya #delay:3m
    }
    -> ch9_maya_after
* [#remind:15m] Я у лодочной. Отсюда видно стойки с их гичками.
    -> ask
* [#noanswer:10m]
    -> ch9_maya_after

=== ch9_named ===
~ maya_target = "jess"
~ maya_trust += 2
Спасибо. #from:maya #delay:5m
Теперь я решу сама. #delay:30s
-> ch9_maya_off

=== ch9_maya_after ===
{clue_whisper:
    ~ maya_target = "jess"
    Тренер ответил. Я знаю, где живёт их рулевая. #from:maya #delay:5m
}
-> ch9_maya_off

=== ch9_maya_off ===
Выключаю телефон. Мне надо подумать. #from:maya #delay:30s
Мая Кин не в сети #sys:maya
-> ch9_judith

=== ch9_judith ===
{
- clue_bill:
    Я разложила её записки по датам. #from:judith #delay:30m
- bill_asked:
    Она ушла. Я открыла конверт. #from:judith #delay:30m
    -> ch9_receipt ->
    А в восемь я налила ей чай. #delay:40s
- else:
    Я открыла конверт сама. Из-за записки с номера Лилиан. #from:judith #delay:30m
    Я хотела знать, кто ещё знает код её телефона. #delay:30s
    -> ch9_receipt ->
}
В них есть две вещи, которых я не понимаю. #delay:30s
- (ask)
* {not fake_note_caught} [Два «!!» в записке. Лили так писала? #to:judith]
    ~ fake_note_caught = true
    Никогда. Даже «люблю» она писала с точкой. #from:judith #delay:3m
    Эту записку написал кто-то, кто знал код её телефона. #delay:40s
    -> ask
* [Что было на сожжённых страницах? #to:judith]
    -> ch9_diary
* [#remind:15m] Записки заняли весь стол. Я не могу их убрать.
    -> ask
* [#noanswer:10m]
    Я скажу сама. #from:judith
    -> ch9_diary

=== ch9_diary ===
~ jess_clues += 1
На одной сожжённой странице уцелело: «Дж. знает про дэна». #from:judith #delay:2m
Лилиан звала меня «Дж.» в записках на холодильнике. Я думала, это обо мне. #delay:40s
Теперь я думаю, что нет. #delay:30s
Мне нужно лечь. Я не спала с пятницы. #delay:1m
Kind regards, J. Marsh. #delay:10s
Джудит Марш не в сети #sys:judith
-> ch9_jess

// reveal: clue_whisper, clue_bill, clue_watch, clue_owen_saw
=== ch9_jess ===
{
- jess_alarmed:
    вы спрашивали у джудит про лили?? зачем?? #from:jess #delay:30m
- else:
    у лодочной с утра стоит машина маи кин!! #from:jess #delay:30m
    она что-то про меня знает?? #delay:20s
}
- (ask)
* {clue_owen_saw} [Оуэн видел тебя на верхней тропе. Как тогда, с Денни #to:jess #label:Сказать про тропу]
    -> ch9_conf
* {not clue_owen_saw} [Лили звонила тебе в 01:19. Четырнадцать секунд #to:jess #label:Предъявить звонок]
    -> ch9_conf
* [Джесс, тебе есть что мне сказать? #to:jess]
    нет!! простите #from:jess #delay:5m
    -> ch9_jess_off
* [#remind:15m] я правда не понимаю что происходит
    -> ask
* [#noanswer:10m]
    -> ch9_jess_off

=== ch9_conf ===
что?? нет!! #from:jess #delay:2m
вы с ума сошли #delay:20s
-> ch9_denny ->
~ jess_confessed = 1
но лили я не трогала!! #from:jess #delay:1m
- (ask)
* [Тогда почему Лили звонила тебе в 01:19? #to:jess]
    {
    - not jess_alarmed || jess_bond >= 1:
        ~ jess_promised = true
        не сейчас. я не могу #from:jess #delay:10m
        завтра скажу вам всё. только вам #delay:1m
    - else:
        она позвонила. я не взяла. я была дома!! #from:jess #delay:5m
    }
* [Иди домой, Джесс #to:jess]
    иду #from:jess #delay:2m
* [#noanswer:10m]
- -> ch9_jess_off

=== ch9_jess_off ===
мне на воду. тренер уже два раза звонил #from:jess #delay:1m
Джесс не в сети #sys:jess
-> ch9_beth

// туннель с признанием про Денни (гл. 9 или запасной путь на рассвете гл. 10)
=== ch9_denny ===
{
- c10_dawn:
    дэн #from:jess #delay:2m
- else:
    дэн #from:jess #delay:5m
}
мы стояли вдвоём. он боялся #delay:40s
я сказала: на счёт три. как в лодке. я всегда так считаю #delay:40s
- (ask)
* [И что потом? #to:jess]
* [Тебе было пятнадцать #to:jess]
    ~ jess_bond += 1
    мне и сейчас как будто пятнадцать #from:jess #delay:3m
* [За это два года платила Элли #to:jess]
    ~ jess_bond -= 1
    я знаю #from:jess #delay:5m
* [#remind:10m] я стираю и пишу заново
    -> ask
* [#noanswer:5m]
- я толкнула его. чуть-чуть. как новичков с мостков #from:jess #delay:1m
он поскользнулся #delay:30s
оуэн сказал: тебя тут не было. беги #delay:40s
и я побежала #delay:30s
->->

=== ch9_beth ===
{c8_beth_done: -> ch9_ellie}
у меня есть ещё одно сообщение от лили #from:beth #delay:20m
эм. я тогда показала не всё #delay:30s
{not beth_written:
    ~ jess_clues += 1
    это джесс тогда сказала мне вам написать. про куртку #delay:30s
}
Lily 💧 00:53 — она меня заблокировала. глупая. скажи ей что я не злюсь #photo #delay:30s
я думала элли от этого будет хуже #delay:30s
~ ellie_block_told = true
* (fwd) [Lily 💧 00:53: «она меня заблокировала. глупая. скажи ей что я не злюсь» #to:ellie #label:Переслать Элли]
    ~ ellie_trust += 1
    она не злилась #from:ellie #delay:5m
    она не злилась #delay:10s
* [Спасибо, Бет #to:beth]
    простите что так поздно #from:beth #delay:1m
* [#noanswer:5m]
- мама зовёт. простите #from:beth #delay:1m
Бет не в сети #sys:beth
-> ch9_ellie

=== ch9_ellie ===
{
- maya_target == "jess":
    мая кин написала мне. «я ошиблась насчёт тебя». и всё #from:ellie #delay:30m
- else:
    в школьном чате все обсуждают пост маи. я вышла из чата #from:ellie #delay:30m
}
{ch9_beth.fwd:
    я сохранила её сообщение. то от бет #delay:40s
}
что происходит. скажи мне #delay:30s
- (ask)
* {jess_confessed >= 1 || clue_whisper || jess_clues >= 3} [С Денни наверху была Джесс. Её голос #to:ellie]
    ~ ellie_trust += 1
    джесс #from:ellie #delay:5m
    мы сидели рядом на химии #delay:1m
    она носила мне конспекты когда со мной никто не #delay:40s
    значит мне не показалось #delay:1m
* [Пока не могу сказать. Скоро скажу #to:ellie]
    ок #from:ellie #delay:1m
* [#remind:15m] мама спрашивает почему я весь день с телефоном
    -> ask
* [#noanswer:10m]
    ок. я тут #from:ellie
- {ellie_block_told:
    если всё выйдет наружу — я скажу им про блок. сама #from:ellie #delay:2m
}
мама пришла. уберу телефон #from:ellie #delay:1m
Элли не в сети #sys:ellie
-> ch9_hook

=== ch9_hook ===
Я позвонила Джессике. #from:judith #delay:20m
Попросила прийти завтра в половине шестого, до моей смены. #delay:30s
Сказала, что хочу отдать ей вещи Лилиан. #delay:30s
Я хочу видеть её лицо, когда спрошу про 01:19. #delay:40s
{owen_deal:
    Звонил отец Оуэна Брайта. Сын собирается в полицию. #delay:40s
}
* [Вы уверены, что хотите с ней одна? #to:judith]
    Я не одна. Вы же будете на связи. #from:judith #delay:3m
* [Хорошо #to:judith]
    Хорошо. #from:judith #delay:2m
* [#noanswer:5m]
- Kind regards, J. Marsh. #from:judith #delay:10s
{
- jess_promised:
    в четыре я буду на лодочной #from:jess #delay:10m
    потом скажу всё. только вам #delay:30s
- else:
    джудит позвала меня завтра в полшестого утра!! #from:jess #delay:10m
    отдать вещи лили. почему сейчас?? #delay:20s
}
- (ask)
* [Иди к ней. Скажи ей сама #to:jess]
    ~ jess_bond += 1
    сама?? #from:jess #delay:3m
    я подумаю #delay:30s
* [Не знаю #to:jess]
    вы тоже не знаете #from:jess #delay:3m
* [#remind:10m] я лежу и смотрю в потолок
    -> ask
* [#noanswer:10m]
- всё равно не усну #from:jess #delay:1m
Джесс не в сети #sys:jess
-> ch10
