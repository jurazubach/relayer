// ============ ГЛАВА 7 · пятница, вечер ============


=== ch7 ===
Пятница, вечер · Голос #sys:maya #chapter #delay:2h
~ sync_world()
Я в Векскомбе. У её дома, синяя калитка. #from:maya
{ellie_warned:
    она приехала. сестра денни #from:ellie #delay:1m
    сидит в машине у нашей калитки уже час #delay:20s
- else:
    у нашей калитки девушка в машине. сидит уже час #from:ellie #delay:1m
    это она? сестра денни? #delay:20s
}
мама спрашивает, вызвать ли полицию #delay:30s
мне выйти?
- (ask)
* {clue_whisper} [Спроси её, как она звала Денни #to:maya #label:Предложить Мае проверку]
    ~ c7_ellie_out = true
    ~ maya_trust += 1
    ~ maya_target = ""
    Хорошая проверка. Иду к двери, спрошу сама. #from:maya #delay:1m
    #delay:20m
    она спросила, как я его звала #from:ellie
    денни. все звали его денни #delay:20s
    Она сказала «Денни». Не «Дэн». #from:maya #delay:3m
    Это ничего не доказывает. #delay:20s
    Но я слышала.
* [Выйди. Скажи ей, где ты была #to:ellie]
    ~ c7_ellie_out = true
    выхожу к калитке. мама стоит в дверях #from:ellie #delay:1m
    #delay:20m
    {ellie_water:
        я сказала. что была в воде. она слушала и молчала #from:ellie
        Говорит, была в воде. Свидетель Коннор Пайк. #from:maya #delay:4m
    - else:
        я не смогла. она спросила про голос, и я заплакала #from:ellie
        Плачут и те, кому есть что скрывать. #from:maya #delay:4m
    }
* [Не выходи. Говори через дверь #to:ellie]
    ок. сижу на лестнице. мама пошла к калитке говорить с ней #from:ellie #delay:1m
    #delay:20m
    она постучала два раза и вернулась к машине #from:ellie
    Не вышла. Те, кому нечего скрывать, выходят. #from:maya #delay:4m
* [#remind:12m] она вышла из машины. стоит у калитки и смотрит на окна
    -> ask
* [#noanswer]
    сижу на лестнице. не выхожу #from:ellie
    #delay:5m
    она так и стоит у калитки #from:ellie
    Дверь мне не открыли. Подожду. #from:maya #delay:2m
- -> ch7_connor

=== ch7_connor ===
{
- connor_ally:
    ~ ellie_alibi = true
    элли написала про сестру #from:connor #delay:5m
    мы с ней были в воде #delay:20s
    прыгнули с бокового до него #delay:20s
    а наверху с денни стоял кто-то мелкий. не элли #delay:30s
    ~ jess_clues += 1
    скажи этой сестре #delay:20s
    -> ch7_alibi
- connor_blocked:
    ~ ellie_alibi = true
    коннор написал мне. тебе не пишет #from:ellie #delay:5m
    говорит, мы с ним были в воде. прыгнули до денни #delay:20s
    сестре скажет сам, если спросит #delay:20s
    -> ch7_alibi
}
Коннор в сети #sys:connor #delay:5m
* [Где была Элли, когда Денни прыгал? #to:connor]
    ~ ellie_alibi = true
    {connor_to_owen:
        чё опять #from:connor #delay:2m
        ладно. в воде. я тоже #delay:30s
    - else:
        в воде. мы оба #from:connor #delay:2m
        прыгнули с бокового до него #delay:20s
    }
    -> ch7_alibi
* [Кто стоял наверху с Денни? #to:connor]
    ~ jess_clues += 1
    оуэн снимал с бокового #from:connor #delay:2m
    наверху денни и кто-то мелкий #delay:20s
    я думал, девчонка. оуэн сказал, показалось #delay:20s
* {jess_rumor} [Джесс говорит, ты рассказывал про мокрые кроссы Элли #to:connor #label:Спросить про слух от Джесс]
    ~ jess_clues += 1
    чё #from:connor #delay:2m
    я никому не говорил. ни одной живой душе #delay:20s
* [#noanswer:10m]
- -> ch7_jessnote

=== ch7_alibi ===
* [Коннор подтверждает: Элли была в воде #to:maya]
    ~ maya_target = ""
    Двое, которые два года врали полиции, подтверждают друг друга. #from:maya #delay:3m
    Тогда чей голос на записи? #delay:30s
* [Промолчать #to:maya #silent]
* [#noanswer:5m]
- -> ch7_jessnote

=== ch7_jessnote ===
{not jess_warned: -> ch7_post}
Мне написала Джесс Холлис. Из клуба Дэна. #from:maya #delay:5m
Пишет, что Элли в ту ночь хвасталась: поднималась наверх. #delay:20s
* [Про голос Джесс знала только от меня #to:maya]
    ~ maya_target = "jess"
    ~ maya_trust += 1
    ~ jess_clues += 1
    Значит, она торопится. #from:maya #delay:2m
    Запомню. #delay:20s
* [Промолчать #to:maya #silent]
    Удобно. Свидетель пришёл сам. #from:maya #delay:1m
* [#noanswer:5m]
- -> ch7_post

=== ch7_post ===
{maya_target == "ellie":
    Я пишу пост в городскую группу. С именем Элли Вэнс. #from:maya #delay:5m
- else:
    Я пишу пост в городскую группу. Без имён. #from:maya #delay:5m
}
{clue_whisper:
    Дорожка с голосом и вопрос: чей он. #delay:20s
- else:
    Один вопрос: кто стоял наверху с Дэном. #delay:20s
}
Скажи сейчас, если я неправа. #delay:20s
- (ask)
* {maya_target == "ellie"} [Убери имя. Ты не уверена #to:maya]
    {maya_trust >= 1:
        ~ maya_target = ""
        Ладно. Без имени. #from:maya #delay:2m
        Голос пусть узнают сами. #delay:20s
    - else:
        Я уверена. #from:maya #delay:1m
        Я слышала её на дознании. #delay:20s
    }
* [Не выкладывай. Спугнёшь того, кто это сделал #to:maya #label:Отговорить Маю]
    {maya_trust >= 2:
        Ладно. Пока нет. #from:maya #delay:2m
        Тогда спрошу админа, кто завёл тот Wexcombe Watch. #delay:20s
        -> ch7_wait
    }
    У меня было два года. Хватит. #from:maya #delay:1m
* [Выкладывай #to:maya]
    Выкладываю. #from:maya #delay:1m
* [Промолчать #to:maya #silent]
    Молчание засчитаю как «да». #from:maya #delay:2m
* [#remind:12m] Текст готов. Сверху фото Дэна на мостках.
    -> ask
- ~ maya_sent = true
~ c7_post_ellie = (maya_target == "ellie")
Пост ушёл на проверку админу группы #sys:maya #delay:20s
-> ch7_wait

=== ch7_wait ===
Поеду к пристани, там паб с розеткой. #from:maya #delay:30s
Мая не в сети #sys:maya
#delay:30m
-> ch7_tom

=== ch7_tom ===
это я пропустил пост wexcombe watch с вашим номером. #from:tom
простите. я том эйкерс, админ городской группы. #delay:30s
{maya_sent:
    сейчас у меня в очереди пост маи кин{c7_post_ellie:, с именем элли вэнс|, без имён}. #delay:30s
- else:
    мая кин спросила, кто завёл wexcombe watch. отвечу вам, а не ей. #delay:30s
}
* [Почему вы его пропустили? #to:tom]
    он ответил на три вопроса, как все. теперь я смотрю на ответы иначе. #from:tom #delay:1m
* [Что вы хотите мне показать? #to:tom]
    ответ на третий вопрос. его видит только админ. #from:tom #delay:1m
* [#noanswer:5m]
- Заявка Wexcombe Watch, 01:04: «Набережная, 4» #photo #from:tom #delay:30s
адрес при вступлении: набережная, 4. это дом холлисов, там живёт джесс холлис. #delay:30s
~ clue_watch = true
* [Оуэн лайкнул тот пост через минуту? #to:tom]
    время лайка не видно никому. даже мне. видно только, кто лайкнул. #from:tom #delay:1m
    «через минуту» знает тот, кто в 01:13 сидел над этим постом. #delay:30s
    ~ note_minute = true
    ~ jess_clues += 1
* [Wexcombe Watch: адрес при вступлении Набережная, 4. Дом Холлисов #to:notes #label:Сохранить в заметки]
    ~ jess_clues += 1
* [Спасибо, Том #to:tom]
    не за что. я и так виноват. #from:tom #delay:1m
* [#noanswer:5m]
- {cover == "honest":
    в посте написано «под видом опроса», а вы никому опроса не предлагали. #from:tom #delay:30s
    значит, текст писал не тот, кто его выложил. #delay:20s
}
{maya_sent: -> ch7_queue}
-> ch7_jess

=== ch7_queue ===
{c7_post_ellie:
    если пост маи выйдет, его увидит весь город. и элли, и её мама. #from:tom #delay:30s
- else:
    если пост маи выйдет, его увидит весь город. и тот, чей это голос. #from:tom #delay:30s
}
если придержу, мая выложит у себя. там её читают человек сорок. #delay:20s
решить мне нужно до ночи, и я хотел бы знать ваше мнение. #delay:20s
- (ask)
* [Придержи пост #to:tom]
    ~ tom_hold = true
    придержу. и следующие её посты тоже, пока не разберусь. #from:tom #delay:1m
* [Выпускай #to:tom]
    ~ maya_posted = true
    выпускаю. правила этого не запрещают. #from:tom #delay:1m
* [Промолчать #to:tom #silent]
    ~ maya_posted = true
    раз никто не против, выпускаю. #from:tom #delay:2m
* [#remind:10m] пост маи всё ещё у меня. рядом в очереди объявление про потерянную собаку.
    -> ask
- -> ch7_jess

=== ch7_jess ===
{
- maya_posted && c7_post_ellie:
    омг вы видели пост маи кин?? #from:jess #delay:10m
    она пишет что это элли!! я же говорила #delay:20s
- maya_posted:
    омг вы видели пост маи кин?? #from:jess #delay:10m
    {clue_whisper:там голос с той ночи. жуть|там про то кто стоял наверху с денни. жуть} #delay:20s
- tom_hold:
    омг говорят админ не пропустил пост маи кин #from:jess #delay:10m
    она теперь у себя выложит?? #delay:20s
- else:
    омг тут опять все про этот watch #from:jess #delay:10m
    вы как?? #delay:20s
}
- (ask)
* {clue_watch} [Wexcombe Watch завела ты. Адрес Холлисов #to:jess #label:Предъявить Джесс заявку]
    -> ch7_caught
* {note_minute} [Откуда ты знала про «через минуту»? #to:jess]
    -> ch7_caught
* [Как ты, Джесс? #to:jess]
    ~ jess_clues += 1
    устала #from:jess #delay:1m
    кстати я вспомнила!! #delay:20s
    элли тогда с денни поднималась наверх. я помню #delay:20s
    -> ch7_jess_off
* [#remind:12m] я тут если что. сижу на эрге, мама ругается
    -> ask
* [#noanswer]
    -> ch7_jess_off

=== ch7_caught ===
~ jess_exposed = true
что?? нет!! #from:jess #delay:1m
да. это я #delay:4m
оуэн попросил узнать, кто вы. сказал, элли будет хуже #delay:30s
текст его. я только выложила #delay:20s
я его боюсь. с тех пор как дэн #delay:20s
- (ask)
* [Он и Элли запугивал #to:jess]
    ~ jess_bond += 1
    спасибо. правда #from:jess #delay:1m
* [Ты выложила мой номер на весь город #to:jess]
    ~ jess_bond -= 1
    я знаю. простите!! #from:jess #delay:1m
* [Почему ты его боишься? #to:jess]
    ~ jess_clues += 1
    не сейчас. пожалуйста #from:jess #delay:2m
* [#remind:10m] я удалила тот аккаунт. только что
    -> ask
* [#noanswer]
    ладно. я тут, если что #from:jess
- -> ch7_jess_off

=== ch7_jess_off ===
мама зовёт ужинать. за столом без телефонов #from:jess #delay:1m
Джесс не в сети #sys:jess
-> ch7_ellie

=== ch7_ellie ===
она уехала. сестра #from:ellie #delay:30m
{c7_ellie_out:
    мы стояли у калитки. она не кричала. это хуже #delay:30s
- else:
    больше не стучала. постояла и уехала #delay:30s
}
{found_jacket_self:
    ~ ellie_trust += 1
    про куртку тогда. твой вопрос. без него я бы не нашла #delay:40s
}
она спросила последнее. писала ли мне лили в ту ночь #delay:30s
я сказала нет #delay:20s
- (ask)
* {note_beth} [В 00:52 Лили писала Бет про твою куртку. Почему не тебе? #to:ellie #label:Показать запись из заметок]
    -> ch7_block
// намеренно: C-18 кнопки взаимоисключающие (note_beth): без записи признание даёт только доверие Элли, иначе она уходит в «телефон сел»
* {not note_beth} [А она писала? #to:ellie]
    {ellie_trust >= 2: -> ch7_block}
    не знаю. может, телефон сел #from:ellie #delay:2m
    -> ch7_end
* [Спи, Элли #to:ellie]
    не усну. но попробую #from:ellie #delay:1m
    -> ch7_end
* [#remind:12m] у калитки ещё мокрые следы от её шин
    -> ask
* [#noanswer]
    -> ch7_end

=== ch7_block ===
// намеренно: C-51 блок здесь и раскрывается: говорит сама Элли, раньше игрок о нём не знал
~ ellie_block_told = true
~ ellie_trust += 1
я её заблокировала #from:ellie #delay:3m
у воды. в 00:40 #delay:30s
чтобы она перестала про полицию #delay:20s
поэтому она писала бет, а не мне #delay:30s
она мне писала. а я не видела #delay:30s
- (ask)
* [Разблокируй. Может, сообщения придут #to:ellie]
    разблокировала в июле #from:ellie #delay:2m
    ничего не пришло. что ушло в блок, то не приходит #delay:30s
    оно осталось только в её телефоне. а его так и не нашли #delay:30s
* [Узнаем, что она писала #to:ellie]
    как? её телефон так и не нашли #from:ellie #delay:2m
* [#remind:10m] прости. надо было сказать тебе в первый же вечер
    -> ask
* [#noanswer]
    её телефон так и не нашли. там всё, что она писала #from:ellie
- -> ch7_end

=== ch7_end ===
{maya_posted:
    мама увидела пост. забирает телефон #from:ellie #delay:1m
- else:
    мама забирает телефон. говорит, хватит на сегодня #from:ellie #delay:1m
}
{ellie_block_told:
    а я всё думаю, что она мне писала #delay:20s
- else:
    я сказала сестре нет. а сама не знаю #delay:20s
}
Элли не в сети #sys:ellie
-> ch8
