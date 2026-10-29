// ============ ГЛАВА 9 · суббота, утро ============

// игрок уже прождал у кнопки в ветке «не ответил» (3 мин; long — 10 мин с напоминанием): столько же снимается
// с паузы перед следующей сценой

=== ch9 ===
Суббота, утро · Лестница #sys:judith #chapter #delay:5h
~ sync_world()
{not judith_guarded:
    ~ jess_alarmed = true
}
{bill_asked: -> ch9_bill}
{note_shown_to == "judith":
    Конверт с распечаткой звонков Лилии за июнь лежит у меня нераспечатанный. Номер оформлен на меня. #from:judith #delay:1m
- else:
    Конверт с распечаткой звонков Лилии за июнь так и лежит на столе. #from:judith #delay:1m
}
Вероника придёт в восемь. Как каждую субботу. #from:judith #delay:30s
{jess_alarmed:
    Вчера я сказала ей, что Вы ищете телефон Лилии. Я не подумала. #delay:40s
}
- (ask)
* [Откройте конверт. Посмотрите, кому она звонила последней #to:judith #label:Попросить открыть конверт]
    ~ bill_asked = true
    Хорошо. Когда она уйдёт. #from:judith #delay:3m
* [Как Вы? #to:judith]
    Плохо. Спасибо, что спросили. #from:judith #delay:3m
* [#noanswer:3m]
    ~ c9_waited = true
- Пойду поставлю чайник. Две чашки, как всегда. #from:judith #delay:1m
Наталья Марченко не в сети #sys:judith
-> ch9_owen

=== ch9_bill ===
Я открыла конверт за июнь. #from:judith #delay:1m
-> ch9_receipt ->
{jess_alarmed:
    Вчера я сказала ей, что Вы ищете телефон Лилии. Простите. #delay:40s
}
Вероника придёт в восемь. Как каждую субботу. #delay:30s
Мне вести себя как обычно? Или спросить её прямо? #delay:20s
- (ask)
* (usual) [Ведите себя как обычно #to:judith]
    Хорошо. Как обычно. #from:judith #delay:2m
* (direct) [Спросите её прямо #to:judith]
    ~ jess_alarmed = true
    Хорошо. Спрошу. #from:judith #delay:2m
* [#remind:8m] Она всегда приходит на пять минут раньше.
    -> ask
* [#remind:8m] Я достала две чашки. Как всегда.
    -> ask
* [#noanswer]
    Я ничего не буду менять. #from:judith
- Звонок в дверь. #from:judith #delay:1m
Наталья Марченко не в сети #sys:judith
{
- usual:
    Она ушла. Я налила ей чай. #from:judith #delay:30m
    Я не знаю, как я это сделала. #delay:30s
- direct:
    Я спросила, звонила ли ей Лилия в ту ночь. #from:judith #delay:30m
    Она сказала: «звонила. я не взяла». Заплакала и ушла. #delay:40s
- else:
    Она ушла. Чай, печенье, всё как всегда. #from:judith #delay:5m
    Она ни о чём не спросила. #delay:30s
}
Я буду разбирать её записки. #delay:1m
Наталья Марченко не в сети #sys:judith
-> ch9_owen

// туннель со счётом за июнь — утром (bill_asked) или днём в ch9_judith
=== ch9_receipt ===
Детализация номера 067 342 18 59, 24 июня: 00:24 СМС → …188 · 00:41, 00:43, 00:46 СМС → …650 · 00:52, 00:53 СМС → …777 · 00:55 СМС → …314 · 01:19 исх. вызов, 0:14 → …314 #photo:ch09-bill #from:judith #delay:30s
650 — Оля. 314 записан у меня в телефоне. #delay:30s
Вероника Гаврилюк. #delay:20s
Лилия звонила ей в 01:19. Четырнадцать секунд. #delay:40s
~ clue_bill = true
->->

// пауза между сценами главы: прождал у кнопки — пауза короче на столько же
// намеренно: C-02 c9_waited_long — служебный учёт ожидания у кнопки для длины паузы, а не состояние, которое копит игрок
=== ch9_gap ===
{
- c9_waited_long:
    #delay:10m
- c9_waited:
    #delay:17m
- else:
    #delay:20m
}
~ c9_waited = false
~ c9_waited_long = false
->->

=== ch9_owen ===
{c9_waited:
    #delay:2m
- else:
    #delay:5m
}
~ c9_waited = false
Мой отец нанял адвоката. #from:owen
Нам надо поговорить 🙂 #delay:20s
{hart_fooled || hart_exposed:
    Гордиенко — это был я. Глупо, знаю. #delay:30s
}
{exposed_fake:
    ~ jess_clues += 1
    И «Соседский дозор» — это Ника. Я её попросил. #delay:30s
}
Когда полиция спросит меня про запись, я скажу, что голос на ней — Олин 🙂 #delay:40s
Если только ты не скажешь мне, что у тебя есть 🙏 #delay:20s
- (ask)
* {clue_ladder} [Лиля выплыла. В 01:15 её видели на старой лестнице #to:owen #label:Сказать Остапу, что Лиля выплыла]
    -> ch9_turn
* {note_threat} [У меня есть твоё «жаль будет». Говори #to:owen #label:Надавить угрозой из заметок]
    ладно #from:owen #delay:5m
    я схватил её за руку. она упала. я ушёл #delay:30s
    больше я ничего не скажу #delay:20s
    - - (ask_more)
    ** {clue_ladder} [Лиля выплыла. В 01:15 её видели на старой лестнице #to:owen #label:Сказать Остапу, что Лиля выплыла]
        -> ch9_turn
    ** [Промолчать #to:owen #silent]
        -> ch9_owen_off
    ** [#noanswer:3m]
        ~ c9_waited = true
        -> ch9_owen_off
* [Промолчать #to:owen #silent]
    -> ch9_owen_off
* [#remind:5m] Адвокат уже сидит у нас в гостиной 🙂
    -> ask
* [#noanswer]
    ~ c9_waited_long = true
    -> ch9_owen_off

=== ch9_owen_off ===
Как скажешь 🙂 #from:owen #delay:2m
Адвокат зовёт. Пойду. #delay:30s
Остап Бондарь не в сети #sys:owen
-> ch9_maya

=== ch9_turn ===
~ owen_turned = true
она выплыла #from:owen #delay:3m
четыре месяца я думал, что это я #delay:40s
я нашёл её на уступе. около часа #delay:30s
она сказала: карты в телефоне уже нет. и бросила мой телефон в воду #delay:30s
я схватил её за запястье. она упала #delay:30s
если на руке у неё нашли след — это мои пальцы #delay:20s
она плыла. я видел. и ушёл #delay:40s
на верхней тропе стояла ника #delay:1m
~ clue_owen_saw = true
я сказал ей: ты ничего не видела. как тогда #delay:30s
про тогда не спрашивай. там я тоже виноват #delay:40s
- (ask)
* [Расскажи это полиции. Я подтвержу про лестницу #to:owen #label:Уговорить пойти в полицию]
    ~ owen_deal = true
    {world == "open":скажу на допросе. всё|поеду в борисполь сам} #from:owen #delay:5m
    {world == "owen":
        и отдам им карту #delay:20s
    }
* [Ты оставил её в воде. Ничего не обещаю #to:owen]
    знаю #from:owen #delay:5m
    всё равно скажу #delay:20s
* [#noanswer:3m]
    ~ c9_waited = true
    ладно #from:owen
- адвокат зовёт. отец не знает ничего из этого #from:owen #delay:1m
Остап Бондарь не в сети #sys:owen
-> ch9_maya

=== ch9_maya ===
-> ch9_gap ->
{
- clue_whisper:
    Тренер прислал видео гонок. #from:maya
    Я искала голос Дена. #delay:20s
    На старте рулевая считает: «на счёт три». #delay:40s
    Та же пауза перед «три». Как на записи. #delay:30s
    Кто сидел у них рулевой в тот год, тренер не говорит. Ты знаешь? #delay:30s
- maya_target == "owen":
    Отец Бондаря вызвал на меня полицию. #from:maya
    Я в машине у причала. Скажи мне, что ты знаешь. #delay:30s
- else:
    Я в машине у причала. Вторые сутки. #from:maya
    Скажи мне, что ты знаешь. #delay:30s
}
- (ask)
* {clue_whisper} [Рулевая у Дена — Ника Гаврилюк. Её счёт #to:maya]
    -> ch9_named
* {not clue_whisper && clue_owen_saw} [Это Ника. Остап видел её на тропе #to:maya]
    -> ch9_named
* {not clue_whisper && not clue_owen_saw && clue_bill} [Это Ника. Лиля звонила ей в 01:19 #to:maya]
    -> ch9_named
* {not clue_whisper && not clue_owen_saw && not clue_bill && clue_watch} [Это Ника Гаврилюк. Заявку «Соседского дозора» подали из её дома #to:maya #label:Назвать Нику]
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
* [#remind:5m] Я у лодочной. Отсюда видно стеллажи с их лодками.
    -> ask
* [#noanswer]
    ~ c9_waited_long = true
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
Майя Кравец не в сети #sys:maya
-> ch9_judith

=== ch9_judith ===
-> ch9_gap ->
{
- clue_bill:
    Я разложила её записки по датам. #from:judith
- bill_asked:
    Она ушла. Я открыла конверт. #from:judith
    -> ch9_receipt ->
    А в восемь я налила ей чай. #delay:40s
- else:
    Я открыла конверт сама. Из-за записки с номера Лилии. #from:judith
    Я хотела знать, кто ещё знает код её телефона. #delay:30s
    -> ch9_receipt ->
}
В её записках есть две вещи, которых я не понимаю. #delay:30s
{not fake_note_caught:
    Спросите сначала про записку. После страниц я уже не смогу говорить. #delay:20s
}
- (ask)
* {not fake_note_caught} [Восклицательные знаки — Лиля так писала? #to:judith]
    ~ fake_note_caught = true
    Никогда. Даже «люблю» она писала с точкой. #from:judith #delay:3m
    Эту записку написал кто-то, кто знал код её телефона. #delay:40s
    -> ask
* [От сожжённых страниц что-то осталось? #to:judith]
    -> ch9_diary
* [#noanswer:3m]
    Я скажу сама. #from:judith
    -> ch9_diary

=== ch9_diary ===
~ jess_clues += 1
На одной сожжённой странице уцелело: «Н. знает про дена». #from:judith #delay:2m
Лилия звала меня «Н.» в записках на холодильнике. Я думала, это обо мне. #delay:40s
Теперь я думаю, что нет. #delay:30s
Мне нужно лечь. Я не спала с пятницы. #delay:1m
С уважением, Н. Марченко. #delay:10s
Наталья Марченко не в сети #sys:judith
-> ch9_jess

// reveal: clue_whisper, clue_bill, clue_watch, clue_owen_saw
=== ch9_jess ===
{
- jess_alarmed:
    вы спрашивали у тёти наташи про лилю?? зачем?? #from:jess #delay:20m
- else:
    у лодочной с утра стоит машина майи кравец!! #from:jess #delay:20m
    она что-то про меня знает?? #delay:20s
}
- (ask)
* {clue_owen_saw} [Остап видел тебя на верхней тропе. Как тогда, с Денисом #to:jess #label:Сказать про тропу]
    -> ch9_conf
* {not clue_owen_saw} [Лиля звонила тебе в 01:19. Четырнадцать секунд #to:jess #label:Предъявить звонок]
    -> ch9_conf
* [Ника, тебе есть что мне сказать? #to:jess]
    нет!! простите #from:jess #delay:5m
    -> ch9_jess_off
* [#remind:5m] я правда не понимаю что происходит
    -> ask
* [#noanswer]
    ~ c9_waited_long = true
    -> ch9_jess_off

=== ch9_conf ===
что?? нет!! #from:jess #delay:2m
вы с ума сошли #delay:20s
-> ch9_denny ->
~ jess_confessed = 1
но лилю я не трогала!! #from:jess #delay:1m
- (ask)
* [Тогда почему Лиля звонила тебе в 01:19? #to:jess]
    {
    - not jess_alarmed || jess_bond >= 1:
        ~ jess_promised = true
        не сейчас. я не могу #from:jess #delay:10m
        завтра скажу вам всё. только вам #delay:1m
    - else:
        она позвонила. я не взяла. я была дома!! #from:jess #delay:5m
    }
* [Иди домой, Ника #to:jess]
    иду #from:jess #delay:2m
* [#noanswer:3m]
    ~ c9_waited = true
- -> ch9_jess_off

=== ch9_jess_off ===
мне на воду. тренер уже два раза звонил #from:jess #delay:1m
Ника не в сети #sys:jess
-> ch9_beth

// туннель с признанием про Дениса (гл. 9 или запасной путь на рассвете гл. 10)
=== ch9_denny ===
{
- c10_dawn:
    ден #from:jess #delay:2m
- else:
    ден #from:jess #delay:5m
}
мы стояли вдвоём. он боялся #delay:40s
я сказала: на счёт три. как в лодке. я всегда так считаю #delay:40s
я это никому не говорила. только вам #delay:30s
- (ask)
* [И что потом? #to:jess]
* [Тебе было пятнадцать #to:jess]
    ~ jess_bond += 1
    мне и сейчас как будто пятнадцать #from:jess #delay:3m
* [За это два года платила Оля #to:jess]
    ~ jess_bond -= 1
    я знаю #from:jess #delay:5m
* [#noanswer:3m]
    я стираю и пишу заново #from:jess
- я толкнула его. чуть-чуть. как новичков с мостков #from:jess #delay:1m
он поскользнулся #delay:30s
остап сказал: тебя тут не было. беги #delay:40s
и я побежала #delay:30s
->->

// намеренно: C-17 это не выбор между людьми: улику Сони либо пересылают Оле, либо нет, — знакомство с Олей тут ничего не предрешает
=== ch9_beth ===
{c8_beth_done: -> ch9_ellie}
-> ch9_gap ->
у меня есть ещё одно сообщение от лили #from:beth
эм. я тогда показала не всё #delay:30s
{not beth_written:
    ~ jess_clues += 1
    это ника тогда сказала мне вам написать. про куртку #delay:30s
}
Лиля 💧 00:53 — она меня заблокировала. глупая. скажи ей что я не злюсь #photo:ch09-beth-lily #delay:30s
я думала оле от этого будет хуже #delay:30s
~ ellie_block_told = true
* (fwd) [Лиля 💧 00:53: «она меня заблокировала. глупая. скажи ей что я не злюсь» #to:ellie #label:Переслать Оле]
    ~ ellie_trust += 1
    она не злилась #from:ellie #delay:5m
    она не злилась #delay:10s
* [Спасибо, Соня #to:beth]
    простите что так поздно #from:beth #delay:1m
* [#noanswer:3m]
    ~ c9_waited = true
- мама зовёт. простите #from:beth #delay:1m
Соня не в сети #sys:beth
-> ch9_ellie

=== ch9_ellie ===
-> ch9_gap ->
{
- maya_target == "jess":
    майя кравец написала мне. «я думала на тебя. прости». и всё #from:ellie
- else:
    в школьном чате все обсуждают пост майи. я вышла из чата #from:ellie
}
{ch9_beth.fwd:
    я сохранила её сообщение. то от сони #delay:40s
}
что происходит. скажи мне #delay:30s
- (ask)
// «Её голос» — только тому, кто слышал голос сам (шёпот на записи) или от Ники
* {jess_confessed >= 1 || clue_whisper || jess_clues >= 3} [С Денисом наверху была Ника{jess_confessed >= 1 || clue_whisper:. Её голос} #to:ellie]
    ~ ellie_trust += 1
    ника #from:ellie #delay:5m
    мы сидели рядом на химии #delay:1m
    она носила мне конспекты когда со мной никто не #delay:40s
    значит мне не показалось #delay:1m
* [Пока не могу сказать. Скоро скажу #to:ellie]
    ок #from:ellie #delay:1m
* [#remind:5m] мама спрашивает почему я весь день с телефоном
    -> ask
* [#noanswer]
    ~ c9_waited_long = true
    ок. я тут #from:ellie
- {ellie_block_told:
    если всё выйдет наружу — я скажу им про блок. сама #from:ellie #delay:2m
}
мама пришла. уберу телефон #from:ellie #delay:1m
Оля не в сети #sys:ellie
-> ch9_hook

=== ch9_hook ===
-> ch9_gap ->
Я позвонила Веронике. #from:judith
Попросила прийти завтра в половине шестого, до моей смены. #delay:30s
Сказала, что хочу отдать ей вещи Лилии. #delay:30s
Я хочу видеть её лицо, когда спрошу про 01:19. #delay:40s
{owen_deal:
    Звонил отец Остапа Бондаря. Сын собирается в полицию. #delay:40s
}
* [Встретите её одна? #to:judith]
    Я не одна. Вы же будете на связи. #from:judith #delay:3m
* [Хорошо #to:judith]
    Хорошо. #from:judith #delay:2m
* [#noanswer:3m]
    ~ c9_waited = true
- С уважением, Н. Марченко. #from:judith #delay:10s
{c9_waited:
    #delay:7m
- else:
    #delay:10m
}
~ c9_waited = false
{
- jess_promised:
    в четыре я буду на лодочной #from:jess
    потом скажу всё. только вам #delay:30s
- else:
    тётя наташа позвала меня завтра в полшестого утра!! #from:jess
    отдать вещи лили. почему сейчас?? #delay:20s
}
- (ask)
* [Иди к ней. Скажи ей сама #to:jess]
    ~ jess_bond += 1
    сама?? #from:jess #delay:3m
    я подумаю #delay:30s
* [Не знаю #to:jess]
    вы тоже не знаете #from:jess #delay:3m
* [#remind:5m] я лежу и смотрю в потолок
    -> ask
* [#noanswer]
- всё равно не усну #from:jess #delay:1m
в шкафчике на лодочной лежит одна вещь. с июня. завтра скажу какая #delay:10s
Ника не в сети #sys:jess
-> ch10
