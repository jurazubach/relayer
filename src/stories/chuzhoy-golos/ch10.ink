// ============ ГЛАВА 10 ============

=== ch10 ===
День 10 · На счёт три #from:jess #sys:jess #chapter #delay:5h
~ sync_world()
мы на воде #from:jess #delay:1m
шестеро и я #delay:20s
я считаю #delay:20s
мы на берегу #delay:55m
-> ch10_dawn

=== ch10_dawn ===
{
- jess_confessed == 0:
    ~ c10_dawn = true
    я скажу вам про дэна. раз все и так смотрят на меня #from:jess #delay:2m
    -> ch9_denny ->
    ~ jess_confessed = 1
}
* [Спасибо, что сказала #to:jess]
    ~ jess_bond += 1
    не надо спасибо #from:jess #delay:2m
* [Почему ты молчала два года? #to:jess]
    оуэн сказал, что меня посадят. мне было пятнадцать. я поверила #from:jess #delay:3m
* [Теперь про Лили #to:jess]
    да #from:jess #delay:5m
- -> ch10_split

=== ch10_split ===
{
- jess_promised || jess_bond >= 2 || (bill_found && owen_turned): -> ch10_full
}
-> ch10_deny

=== ch10_full ===
~ jess_confessed = 2
лили написала мне в 00:55 #from:jess #delay:3m
«я слышала тебя на записи. в час на уступе» #delay:30s
я пришла. там был оуэн #delay:40s
он ушёл мимо меня. сказал: как тогда #delay:30s
она выплыла. она всегда выплывает #delay:1m
она позвонила мне от лестницы #delay:30s
я спустилась. она сказала: завтра полиция. про него и про тебя #delay:40s
я взяла её за руку. хотела сказать подожди #delay:1m
она выдернула руку. там мокро #delay:40s
она упала #delay:30s
я звала. её не было видно #delay:1m
я не позвонила #delay:40s
у меня в кармане загорелся её экран. «элли: прости» #delay:1m
телефон в шкафчике на лодочной. в её чехле #delay:40s
в восемь я иду к джудит #delay:30s
я не знаю, смогу ли постучать #delay:20s
* [Возьми телефон с собой. Отдай ей #to:jess]
    ладно #from:jess #delay:2m
* [Почему ты не позвонила 999? #to:jess]
    я испугалась. как тогда. я всегда убегаю #from:jess #delay:3m
* [Промолчать #to:jess #silent]
    ~ jess_bond -= 1
    вы теперь меня ненавидите. я понимаю #from:jess #delay:10m
- -> ch10_judith

=== ch10_deny ===
лили я не трогала!! #from:jess #delay:3m
она позвонила. я не пошла. я была дома!! #delay:40s
в восемь я иду к джудит. она позвала #delay:1m
-> ch10_judith

=== ch10_judith ===
Я не спала. #from:judith #delay:20m
В восемь она придёт. #delay:20s
{owen_turned:
    Мне звонил Оуэн Брайт. Сказал, что видел её на тропе. Я положила трубку. #delay:40s
}
Я испекла пирог. Не знаю, зачем. #delay:30s
* [Не говорите ей ничего, пока я не напишу #to:judith]
    Хорошо. Я жду Вас. #from:judith #delay:2m
* [Это Ваш дом и Ваша дочь. Решайте сами #to:judith]
    ~ judith_waits = false
    Я не умею решать такие вещи. Но попробую. #from:judith #delay:3m
* [Промолчать #to:judith #silent]
    Kind regards, J. Marsh. #from:judith #delay:5m
- -> ch10_maya

=== ch10_maya ===
{
- maya_target != "jess": -> ch10_owen
}
Я у лодочной станции. Она только что вышла с воды. #from:maya #delay:15m
В 7:30 я выкладываю {whisper_known:запись|всё, что знаю} и её имя. #delay:30s
Скажи одно слово — и я подожду. #delay:30s
* [Подожди. В восемь она идёт к Джудит. Сама #to:maya]
    {
    - maya_trust >= 3 || (jess_confessed == 2 && maya_trust >= 0):
        ~ maya_stopped = true
        До девяти. #from:maya #delay:3m
        -> ch10_owen
    - else:
        Сама она два года не шла. #from:maya #delay:3m
        -> ch10_maya_go
    }
* [Делай, что считаешь нужным #to:maya]
    -> fin_revenge
* [Промолчать #to:maya #silent]
    -> ch10_maya_go

=== ch10_maya_go ===
{
- tom_hold:
    ~ c10_maya_door = true
    пост маи я не пропустил. как обещал. #from:tom #delay:20m
    Твой админ не пропустил. Ладно. #from:maya #delay:2m
    Я в машине у дома Марш. #delay:30s
    -> ch10_owen
}
-> fin_revenge

=== ch10_owen ===
{
- owen_turned:
    {world == "open":
        в десять допрос. скажу про неё. и про себя #from:owen #delay:10m
    - else:
        еду в эксетер. в полицию. сам #from:owen #delay:10m
        {world == "owen":
            карту отдам им #delay:20s
        }
    }
    {owen_deal:
        про лестницу — как договорились #delay:30s
    }
- else:
    Сегодня всё решится 🙂 #from:owen #delay:10m
    {world == "open":
        В десять я расскажу, чей там голос 🙂 Элли будет непросто #delay:30s
    }
    {hart_fooled && owen_knows >= 2:
        И не вмешивайся. Я знаю, как тебя зовут 🙂 #delay:30s
    }
}
* {not owen_turned && ladder_known} [Лили выплыла. Ты её не убивал. Скажи им про Джесс #to:owen]
    ~ owen_turned = true
    она выплыла #from:owen #delay:14m
    ладно. скажу #delay:1m
* [Скажи им правду. Всю #to:owen]
    {owen_turned:скажу|Правду 🙂} #from:owen #delay:3m
* [Промолчать #to:owen #silent]
- -> ch10_ellie

=== ch10_ellie ===
я иду в участок{world == "open": к окафор} #from:ellie #delay:5m
{ellie_block_told:
    скажу им что заблокировала её. пусть знают всё #delay:30s
- else:
    скажу всё что знаю #delay:30s
}
что мне делать #delay:30s
* [Скажи. Всё #to:ellie]
    ~ ellie_testifies = true
    ок #from:ellie #delay:1m
* [Это только твоё. Можешь не говорить #to:ellie]
    ~ ellie_testifies = false
    ок. спасибо #from:ellie #delay:1m
* [Промолчать #to:ellie #silent]
    ~ ellie_testifies = ellie_block_told
- -> ch10_door

=== ch10_door ===
я у двери #from:jess #delay:5m
считаю до трёх #delay:20s
Она у двери. Я вижу её в окно. #from:judith #delay:40s
{judith_waits:
    Я жду Вас. #delay:20s
}
{c10_maya_door:
    Я вижу её. Стоит у двери Марш. #from:maya #delay:30s
}
* [Откройте. И вот всё, что у меня есть #to:judith #label:Отдать Джудит всю правду]
    ~ final_choice = "truth"
* [Скажи ей сама. Сейчас #to:jess #label:Дать Джесс сказать самой]
    ~ final_choice = "mercy"
* [Это был Оуэн. Записка с её телефона — правда #to:judith #label:Сказать Джудит, что это Оуэн]
    ~ final_choice = "owen"
* [Промолчать #to:jess #silent]
    ~ final_choice = "silent"
- -> ch10_route

=== ch10_route ===
~ proof = 0
{ bill_found:
    ~ proof += 1
}
{ ladder_known:
    ~ proof += 1
}
{ owen_turned:
    ~ proof += 1
}
{ fake_note_caught:
    ~ proof += 1
}
{ jess_confessed == 2:
    ~ proof += 2
}
{
- final_choice == "truth" && proof >= 3: -> fin_truth
- final_choice == "owen" && (fake_note_caught || jess_confessed == 2): -> fin_scapegoat
- final_choice == "owen": -> fin_puppet
- (final_choice == "mercy" || final_choice == "silent") && jess_confessed == 2 && jess_bond >= 2: -> fin_herself
- final_choice == "silent" && judith_waits: -> fin_silence
- else: -> fin_unproven
}

// ============ ФИНАЛЫ СЕЗОНА ============

=== fin_truth ===
~ ending = "truth"
Открываю. #from:judith #delay:3m
Она сидит на кухне. Я показала ей счёт. #delay:40m
{jess_confessed == 2:
    Она рассказала всё. То же, что Вам. И положила на стол телефон Лилиан. #delay:2m
- else:
    Она долго молчала. Потом рассказала. И сказала, где телефон. #delay:2m
}
Я позвонила в полицию сама. #delay:1m
Лилиан выплыла. Поднялась по старой лестнице и позвонила Джессике. #delay:1h
Джессика спустилась к ней на полку. Взяла за руку. Лилиан вырвалась, поскользнулась и упала. #delay:30s
Джессика забрала её телефон и ушла. Никого не позвала. #delay:30s
А за двадцать минут до этого Оуэн Брайт столкнул её с уступа. И ушёл, видя, что она плывёт. #delay:30s
вы ей всё отдали #from:jess #delay:30m
правильно #delay:30s
{
- owen_turned:
    сказал всё. меня оставили до вечера #from:owen #delay:1h
    {hart_exposed:
        и за харта тоже спросили #delay:20s
    }
- else:
    Мне предъявили. За Денни. И за уступ. #from:owen #delay:1h
    {hart_exposed:
        И за Харта. #delay:20s
    }
}
{world == "owen":
    карту изъяли #delay:20s
}
{ellie_testifies:
    я сказала им про блок. они записали. и всё. никто не кричал #from:ellie #delay:1h
}
джудит прислала мне скрины с её телефона #from:ellie #delay:30m
Lily 💧 → Элли · 00:41 «элли» · 00:43 «не будь дурой. карта будет в твоей куртке» · 00:46 «разблокируй. я не злюсь. я просто не могу одна» · Не доставлено #photo #delay:20s
она не злилась #delay:1m
-> fin_ellie_ref ->
Джудит Марш позвонила мне. Сама. #from:maya #delay:2h
Дэна толкнула пятнадцатилетняя девочка, в которую он был влюблён. На счёт три. #delay:30s
Я два года ненавидела не тех. #delay:30s
Дэн бы её простил. Я пока нет. Подожду суда. #delay:30s
Три недели спустя #sys:judith #delay:2h
Джессике предъявили обвинение в непредумышленном убийстве. Ей семнадцать, дело будет в суде для несовершеннолетних. #from:judith #delay:1m
Оуэну Брайту — воспрепятствование правосудию и нападение. #delay:30s
{note_threat:
    И запугивание свидетеля. Ваш скрин пригодился. #delay:20s
}
Дело Денни Кина открыто заново. #delay:30s
Элли получила предупреждение за ложные показания. Ей было пятнадцать. #delay:30s
{world == "hidden":
    Ваши файлы были единственной копией. Теперь они у полиции. #delay:30s
}
{cover == "honest":
    Вы с первого дня были честны со мной. Но кто Вы — я так и не знаю. #delay:1m
- else:
    Вы так и не сказали, кто Вы. #delay:1m
}
* [Тот, кто откликнулся на объявление #to:judith]
* [Это уже неважно #to:judith]
* [Промолчать #to:judith #silent]
- Спасибо, {alias}. Если это Ваше имя. #from:judith #delay:2m
{ellie_trust >= 2:
    Лилиан выплыла. Она всегда выплывала. #delay:30s
}
-> fin_coda ->
{
- ellie_trust >= 2:
    Элли В. перевела вам £12.00 · «последний час. спасибо x» #from:bank #delay:1h
- else:
    Лилиан выплыла. Она всегда выплывала. #from:judith #delay:1h
}
Конец #sys:judith
-> END

=== fin_herself ===
~ ending = "herself"
раз #from:jess #delay:2m
два #delay:5s
три #delay:40s
она открыла #delay:2m
Она принесла пирог. И телефон Лилиан в её чехле. #from:judith #delay:1h
Она рассказала всё. Сама. Я не задала ни одного вопроса. #delay:30s
Лилиан выплыла. Поднялась по лестнице. Позвонила ей. #delay:30s
Джессика держала её за руку, когда она упала с полки. И ушла. С её телефоном. #delay:30s
А до этого Оуэн столкнул её с уступа и смотрел, как она плывёт. И тоже ушёл. #delay:30s
Мы сидели на кухне до полудня. #delay:30s
Потом я позвонила в полицию. Она ждала со мной. #delay:30s
джудит позвала меня. впервые с июня. я иду #from:ellie #delay:1h
она показала мне её телефон #from:ellie #delay:2h
Lily 💧 → Элли · 00:41 «элли» · 00:43 «не будь дурой. карта будет в твоей куртке» · 00:46 «разблокируй. я не злюсь. я просто не могу одна» · Не доставлено #photo #delay:20s
она не злилась #delay:1m
-> fin_ellie_ref ->
{
- owen_turned:
    сказал всё. меня оставили до вечера #from:owen #delay:1h
- else:
    Мне предъявили. За Денни. И за уступ. #from:owen #delay:1h
}
Она пришла сама. Для Дэна это ничего не меняет. #from:maya #delay:1h
Для меня — немного. #delay:30s
Три недели спустя #sys:judith #delay:2h
Джессике предъявили обвинение в непредумышленном убийстве. Суд учтёт, что она пришла сама. #from:judith #delay:1m
Оуэну Брайту — воспрепятствование правосудию и нападение. #delay:30s
{hart_exposed:
    И то, что он выдавал себя за полицейского. #delay:20s
}
Дело Денни Кина открыто заново. #delay:30s
Элли получила предупреждение за ложные показания. Ей было пятнадцать. #delay:30s
я досчитала #from:jess #delay:1h
-> fin_coda ->
Лилиан бы её выслушала. Я выслушала. #from:judith #delay:1h
Конец #sys:judith
-> END

=== fin_unproven ===
~ ending = "unproven"
{
- final_choice == "truth":
    Открываю. #from:judith #delay:3m
    Я показала ей счёт. #delay:40m
    Она сказала: «она позвонила. я не пошла». И ушла. #delay:30s
    Я отнесла счёт в полицию. #delay:2h
    Звонок на четырнадцать секунд. У неё адвокат. «Недостаточно для обвинения». #delay:30s
- final_choice == "mercy":
    я не могу #from:jess #delay:3m
    простите #delay:30s
    Она постояла у двери и ушла. #from:judith #delay:20m
    я выбросила его. с пирса #from:jess #delay:40m
    её телефон #delay:30s
    оуэн столкнул её с уступа. она выплыла и позвонила мне #delay:1m
    я держала её за руку. на полке. она вырвалась. вот и всё #delay:1m
- else:
    Я спросила её сама. #from:judith #delay:30m
    Она сказала, что в ту ночь спала. И ушла. #delay:30s
}
{
- world == "open":
    Обвинение мне предъявили. По Денни. Про Лили не спрашивали #from:owen #delay:2h
- final_choice == "truth":
    Твои файлы теперь у полиции. Дело Денни открыли. Мне есть чем заняться #from:owen #delay:2h
- else:
    Всё закончилось. По Денни меня никто не тронет 🙂 #from:owen #delay:2h
}
{world == "open" && not owen_turned:
    меня опять вызвали. оуэн сказал что это мой голос #from:ellie #delay:1h
    мне поверили. не сразу #delay:30s
}
{ellie_testifies:
    я сказала им про блок. сама. легче не стало. но стало честно #from:ellie #delay:1h
- else:
    про блок я так никому и не сказала. теперь это моё #from:ellie #delay:1h
}
{maya_target == "jess":
    Я знаю, кто. И она знает, что я знаю. Этого мало. #from:maya #delay:1h
- else:
    Значит, опять «несчастный случай». #from:maya #delay:1h
}
Три недели спустя #sys:judith #delay:2h
Джессика больше не приходит по вторникам. #from:judith #delay:1m
Лилиан звонила ей в 01:19. Я это знаю. Мне этого не доказать. #delay:30s
{final_choice != "mercy":
    оуэн столкнул её с уступа. она выплыла и позвонила мне #from:jess #delay:1h
    на полке я держала её за руку. она вырвалась. вы ведь это хотели знать #delay:30s
}
-> fin_coda ->
Сегодня я отключила её номер. #from:judith #delay:1h
Конец #sys:judith
-> END

=== fin_scapegoat ===
~ ending = "scapegoat"
Значит, Оуэн. #from:judith #delay:3m
Я отнесу записку в полицию. #delay:30s
Джессика пришла. Я отдала ей вещи Лилиан. Как обещала. #delay:30m
почему #from:jess #delay:40m
спасибо #delay:2m
{owen_deal:
    Мы договаривались. #from:owen #delay:2h
    Я её не убивал. Ты знаешь. #delay:30s
- else:
    Я её не убивал. Ты знаешь. #from:owen #delay:2h
}
Пять месяцев спустя #sys:judith #delay:2h
Оуэна Брайта осудили за смерть Лилиан. И за то, что он скрыл правду о Денни Кине. #from:judith #delay:1m
Он говорил, что на тропе была Джессика. Суд счёл это местью. #delay:30s
«Слово человека, который два года лгал о Денни». #delay:20s
Голос на записи «не установлен». #delay:20s
-> fin_ellie_owen ->
{maya_target == "jess":
    Брайт сел. За Лили или нет — он сел. #from:maya #delay:1h
    Дэну этого хватит. Мне — нет. #delay:30s
- else:
    Брайт сел. Я два года этого ждала. #from:maya #delay:1h
}
она выплыла после него. на полке я держала её за руку. вы это знаете #from:jess #delay:1h
я больше не считаю. рулевой теперь другая #delay:30s
-> fin_coda ->
{ellie_trust >= 2:
    Элли В. перевела вам £12.00 · «спасибо x» #from:bank #delay:30m
}
В ночь, когда его арестовали, я впервые с июня спала. Спасибо Вам. #from:judith #delay:1h
Конец #sys:judith
-> END

=== fin_puppet ===
~ ending = "puppet"
Значит, Оуэн. #from:judith #delay:3m
Я отнесу записку в полицию. #delay:30s
Джессика пришла. Я отдала ей вещи Лилиан. Как обещала. #delay:30m
Я её не убивал. #from:owen #delay:2h
Ладно. #delay:1h
Пять месяцев спустя #sys:maya #delay:2h
-> fin_ellie_owen ->
{
- whisper_known:
    Я наконец досмотрела видео гонок. #from:maya #delay:1m
    На старте рулевая считает: «на счёт три». Тот же счёт. #delay:30s
    Это Джесс Холлис. #delay:30s
    А Брайт сидит за Лили. #delay:30s
    Лили выплыла после драки с ним. И в 01:19 позвонила Джесс. Это есть в счёте. #delay:30s
    Записку с её телефона полиция получила от тебя. #delay:30s
    {maya_target == "jess" || bill_found:
        Джудит Марш сказала: «Я видела этот звонок в счёте и не поняла». #delay:30s
    }
- else:
    оуэн передал через брата #from:connor #delay:1m
    лили выплыла. на тропе была джесс. в 01:19 лили звонила ей #delay:30s
    ему никто не поверил #delay:30s
}
-> fin_coda ->
кстати. спасибо!! #from:lily #delay:1h
Конец #sys:lily
-> END

=== fin_revenge ===
~ ending = "revenge"
{tom_hold:
    пост маи я не пропустил. она выложила его у себя. к восьми его переслали все. #from:tom #delay:30m
- else:
    пост маи вышел. держать не стал. #from:tom #delay:30m
}
{
- whisper_known:
    Пост Маи Кин: очищенная дорожка и подпись «Это голос Джесс Холлис. Она столкнула моего брата. И она знает, как умерла Лили Марш»{maya_files == 2 && not cut_frames: + кадр, где у края видна Элли} #photo #from:maya #delay:1m
- else:
    Пост Маи Кин: «Джесс Холлис стояла наверху, когда погиб мой брат. И она знает, как умерла Лили Марш» #photo #from:maya #delay:1m
}
все пишут #from:jess #delay:10m
у лодочной люди #delay:30s
я не пойду к джудит #delay:1m
я выбросила её телефон. с пирса #delay:50m
я держала её за руку. на полке. она вырвалась. теперь это неважно #delay:2m
Я узнала из группы. Как все. #from:judith #delay:30m
Она не пришла. #delay:30s
{
- whisper_known && maya_files == 2 && not cut_frames:
    там и я. опять #from:ellie #delay:1h
    мама увозит меня к тёте в эксетер #delay:30s
- else:
    у дома холлисов человек тридцать. снимают на телефоны #from:ellie #delay:1h
    я не хочу так #delay:30s
}
Теперь ненавидят всех. Даже честно. #from:owen #delay:1h
Три недели спустя #sys:maya #delay:2h
Холлисы уехали из города. Ночью. #from:maya #delay:1m
Дело против неё остановили. Пост «скомпрометировал доказательства». Телефон на дне у пирса. #delay:30s
Брайт на допросе сказал, что подрался с Лили на уступе и ушёл. Что она плыла. #delay:30s
Ему предъявили обвинение. По Дэну. #delay:30s
Мне вынесли предупреждение за травлю. С работы уволили. #delay:30s
Все знают. #delay:30s
Ничего не изменилось. #delay:20s
-> fin_coda ->
Дэн бы сказал, что я дура. #from:maya #delay:1h
Конец #sys:maya
-> END

=== fin_silence ===
~ ending = "silence"
Я жду Вас. #from:judith #delay:5m
Она на кухне. Я режу пирог. #delay:20m
Она ушла. Я ничего не сказала. #delay:1h
Вы не написали. #delay:30s
{
- world == "open" && not owen_turned:
    Допрос был. Про Денни. Про Лили меня не спрашивали 🙂 #from:owen #delay:1h
    Голос на записи — Элли. Так я им и сказал 🙂 #delay:30s
- world == "open":
    Допрос был. Про Денни. Про Лили меня не спрашивали #from:owen #delay:1h
    про джесс я сказал. без тебя мне не поверили #delay:30s
- else:
    Всё закончилось 🙂 #from:owen #delay:1h
}
ты ведь что-то знаешь. да? #from:ellie #delay:1h
ладно #delay:1h
{world == "hidden":
    у тебя до сих пор та запись. единственная. делай что хочешь #delay:30s
}
{maya_stopped:
    До девяти, как договаривались. Сейчас девять. #from:maya #delay:30m
    Ты молчишь. #delay:30s
    Дальше — без тебя. #delay:30s
- else:
    Ладно. Спасибо за запись. #from:maya #delay:30m
}
Три недели спустя #sys:jess #delay:2h
{jess_confessed == 2:
    спасибо что ничего не сказали #from:jess #delay:1m
- else:
    оуэн столкнул её с уступа. она выплыла и позвонила мне #from:jess #delay:1m
    на полке я держала её за руку. она поскользнулась. вы же поняли #delay:30s
}
Джессика приходит по вторникам. Я открываю. Не знаю, зачем. #from:judith #delay:1h
-> fin_coda ->
привет!! вы ещё делаете опросы? 🙂 #from:jess #delay:1h
Конец #sys:jess
-> END

// туннель: отсылка Элли к её реакции в пилоте
=== fin_ellie_ref ===
{
- ellie_reaction == "support":
    «ты была ребёнком» — я это помню #from:ellie #delay:30s
- ellie_reaction == "judge":
    твои слова «ты два года врала». они были правдой #from:ellie #delay:30s
- ellie_reaction == "together":
    вместе. как в том сообщении #from:ellie #delay:30s
}
->->

// туннель: Элли в финалах, где посадили Оуэна
=== fin_ellie_owen ===
все извинились. даже мама #from:ellie #delay:1h
{ellie_testifies:
    про блок я им сказала. записали и забыли. всем был нужен оуэн #delay:30s
- else:
    про блок никто не спросил. это осталось у меня #delay:30s
}
->->

// туннель: сквозные закрытия
=== fin_coda ===
{
- ending == "truth" || ending == "herself":
    я сказал им про лестницу. и что это я сказал оуэну где она. теперь всё #from:connor #delay:1h
    я удалил пост wexcombe watch. четыре месяца спустя. #from:tom #delay:1h
    я отдала им скрин 00:53. элли разрешила #from:beth #delay:1h
- ending == "revenge":
    я сказал про лестницу. им всё равно #from:connor #delay:1h
    {tom_hold:
        я её пост не пропустил. не помогло. #from:tom #delay:1h
    - else:
        это я нажал «опубликовать». оба раза. #from:tom #delay:1h
    }
- ending == "unproven":
    я сказал про лестницу. им всё равно #from:connor #delay:1h
- else:
    я так и не сказал им про лестницу. сорян #from:connor #delay:1h
}
{hart_fooled && owen_knows >= 2:
    {
    - ending == "silence" || ending == "unproven":
        Будешь в наших краях — заходи. Я теперь знаю, кого ждать 🙂 #from:owen #delay:1h
    - else:
        Оуэн рассказал полиции, что знает, кто Вы. Ему сказали, что это не его дело. #from:judith #delay:1h
    }
}
->->

