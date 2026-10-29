// ============ ГЛАВА 7 ============

=== ch7 ===
День 7 · Голос #from:maya #sys:maya #chapter #delay:100m
~ sync_world()
* {ellie_water} [Это не Элли. Она была в воде, когда он упал #to:maya]
    Это она так говорит? #from:maya #delay:2m
    Два года назад она говорила, что он пришёл один. #delay:20s
* {note_she} [Лили говорила с Элли в 00:30 и всё равно собиралась в полицию. «Она» — не Элли #to:maya]
    ~ maya_trust += 1
    Допустим. #from:maya #delay:4m
    Тогда кто? #delay:20s
* [Элли, сестра Денни едет к тебе. Она думает, что на записи твой голос #to:ellie #label:Предупредить Элли]
    ~ ellie_warned = true
    ~ ellie_water = true
    не сплю #from:ellie #delay:30m
    мой голос? #delay:20s
    я была в воде #delay:40s
    я её не боюсь. я боюсь что она права. не про меня. про то что там кто-то был #delay:1m
* [Промолчать #to:maya #silent]
- -> ch7_gate

=== ch7_gate ===
Я у её дома. Синяя калитка. #from:maya #delay:9h
{ellie_warned:
    она тут. я выйду #from:ellie #delay:3m
- else:
    у нашей калитки какая-то девушка сидит в машине уже час #from:ellie #delay:3m
    это она? #delay:20s
}
- (ask)
* {whisper_known} [Спроси её, как она звала Денни #to:maya #label:Предложить Мае проверку]
    ~ c7_ellie_out = true
    ~ maya_trust += 1
    ~ maya_target = ""
    она спросила как я звала его #from:ellie #delay:20m
    денни. все звали его денни #delay:20s
    Она сказала «Денни». Не «Дэн». #from:maya #delay:5m
    Это ничего не доказывает. #delay:20s
    Но я слышала.
* [Выйди. Скажи ей, где ты была #to:ellie]
    ~ c7_ellie_out = true
    {ellie_warned:
        ~ ellie_water = true
        я сказала. она слушала и молчала #from:ellie #delay:25m
        Говорит, была в воде. Свидетель — Коннор Пайк. #from:maya #delay:10m
    - else:
        я не смогла. она спросила про голос и я заплакала #from:ellie #delay:25m
        Плачут те, кому есть что скрывать. #from:maya #delay:10m
    }
* [Не выходи. Пусть говорит через дверь #to:ellie]
    ок #from:ellie #delay:1m
    Не вышла. Те, кому нечего скрывать, выходят. #from:maya #delay:30m
* [Мая, уезжай. Ты пугаешь не того человека #to:maya]
    Того. #from:maya #delay:1m
* [#remind:15m] она вышла из машины. стоит у калитки. мне выходить?
    -> ask
* [#noanswer]
    не выхожу. сижу на лестнице. она так и стоит #from:ellie
- -> ch7_connor

=== ch7_connor ===
{
- connor_ally:
    ~ ellie_alibi = true
    элли написала #from:connor #delay:90m
    ага я был с ней в воде #delay:20s
    мы прыгнули с бокового до него
    скажи этой сестре #delay:20s
    -> ch7_alibi
- connor_blocked && (c7_ellie_out || ellie_warned):
    ~ ellie_alibi = true
    коннор написал мне #from:ellie #delay:90m
    говорит мы были в воде. он скажет ей сам если она спросит #delay:20s
    -> ch7_alibi
- connor_blocked:
    -> ch7_maya
}
Коннор в сети #sys:connor #delay:90m
* [Коннор, где была Элли, когда Денни прыгал? #to:connor]
    ~ ellie_alibi = true
    {connor_to_owen:
        отвали #from:connor #delay:1m
        ладно. в воде. я тоже. всё #delay:2h
    - else:
        в воде. мы оба #from:connor #delay:2m
        прыгнули с бокового до него #delay:20s
    }
    -> ch7_alibi
* [Кто стоял наверху с Денни? #to:connor]
    оуэн снимал с бокового #from:connor #delay:2m
    наверху денни и кто-то мелкий #delay:20s
    я думал девчонка. оуэн сказал показалось #delay:20s
    ** [Коннор: наверху с Денни был кто-то мелкий. Девчонка? #to:notes #label:Сохранить в заметки]
        ~ jess_clues += 1
    ** [Не сохранять #to:notes #silent]
    -- -> ch7_maya
* {jess_rumor} [Джесс говорила, ты всем рассказывал про мокрые кроссы Элли #to:connor]
    ~ jess_clues += 1
    чего #from:connor #delay:2m
    я никому не говорил. ни одной живой душе #delay:20s
    -> ch7_maya

=== ch7_alibi ===
* [Коннор подтверждает: Элли была в воде, когда Денни упал #to:maya]
    ~ maya_target = ""
    Двое, которые два года врали полиции, подтверждают друг друга. #from:maya #delay:3m
    Хорошо. Допустим. #delay:30s
    Тогда чей голос?
* [Промолчать #to:maya #silent]
- -> ch7_maya

=== ch7_maya ===
{
- jess_warned:
    Мне вчера написала Джесс Холлис. Подруга Дэна по гребле. #from:maya #delay:40m
    Сказала, что помнит: Элли в ту ночь хвасталась, что поднималась наверх. #delay:20s
    -> ch7_maya_jess
}
Я весь день говорила с людьми. #from:maya #delay:40m
Все знают про «студента». Про голос не знает никто. #delay:20s
-> ch7_post

=== ch7_maya_jess ===
* [Про твою теорию Джесс узнала от меня. Больше ей никто не говорил #to:maya]
    ~ maya_target = "jess"
    ~ maya_trust += 1
    ~ jess_clues += 1
    Значит, она торопится. #from:maya #delay:3m
* [Промолчать #to:maya #silent]
- -> ch7_post

=== ch7_post ===
{
- maya_target == "ellie":
    ~ c7_post_ellie = true
    Я отправила пост в городскую группу. С её именем. #from:maya #delay:20s
    {whisper_known:
        И с дорожкой. Пусть город послушает. #delay:20s
    }
- whisper_known:
    Я отправила пост в городскую группу. Без имён. #from:maya #delay:20s
    Только дорожка и вопрос: «Чей это голос?» #delay:20s
- else:
    Я отправила пост в городскую группу. Без имён. #from:maya #delay:20s
    Только вопрос: «Кто стоял наверху с Дэном?» #delay:20s
}
-> ch7_tom

=== ch7_tom ===
здравствуйте. я том эйкерс. да, тот самый «прочитано». #from:tom #delay:90m
я админ городской группы. моя работа — читать всё и молчать. #delay:20s
это я одобрил пост wexcombe watch. с вашим номером. простите. не подумал. #delay:30s
сейчас у меня в очереди пост маи кин. #delay:20s
{c7_post_ellie:с именем элли вэнс.|без имён.}
прежде чем решать, хочу кое-что показать. #delay:30s
чтобы вступить в группу, надо ответить на три вопроса. #delay:20s
Заявка «Wexcombe Watch», 01:04, за восемь минут до поста. Вопрос «Ваш адрес в Векскомбе?» — ответ «Набережная, 4» #photo #delay:20s
набережная, 4 — дом холлисов. джесс холлис. #delay:30s
~ tom_proof = true
~ clue_watch = true
{cover == "honest":
    и ещё. в посте написано «под видом студента». а вы людям писали честно. #delay:20s
    текст переписали, чтобы вас выставить.
}
* [Оуэн лайкнул тот пост через минуту? #to:tom]
    время лайка не видно никому. даже мне. #from:tom #delay:1m
    видно только, кто лайкнул. #delay:10s
    «через минуту» знает только тот, кто сидел и смотрел на пост в 01:13. #delay:20s
    ** [Джесс знала «через минуту». Это видно только тому, кто в 01:13 смотрел на свой пост #to:notes #label:Сохранить в заметки]
        ~ note_minute = true
        ~ jess_clues += 1
    ** [Не сохранять #to:notes #silent]
* [Wexcombe Watch: адрес при вступлении — Набережная, 4. Дом Холлисов #to:notes #label:Сохранить в заметки]
    ~ jess_clues += 1
* [Спасибо, Том #to:tom]
- -> ch7_tom_queue

=== ch7_tom_queue ===
с постом маи решаю до вечера. #from:tom #delay:1m
* [Не публикуй #to:tom]
    ~ tom_hold = true
    ок. и следующие её посты придержу, пока не разберусь. #from:tom #delay:1m
* [Публикуй. Пусть город слушает #to:tom]
    ~ maya_posted = true
    ок. правила этого не запрещают. #from:tom #delay:1m
* {c7_post_ellie} [Мая, сними пост. Это не Элли #to:maya]
    -> ch7_maya_pull
* {not c7_post_ellie} [Мая, сними пост. Ты спугнёшь того, кто это сделал #to:maya]
    -> ch7_maya_pull
* [Промолчать #to:tom #silent]
    ~ maya_posted = true
    раз никто не против — публикую. #from:tom #delay:2h
- -> ch7_jess

=== ch7_maya_pull ===
{
- maya_trust >= 2:
    Ладно. Сняла. Пока. #from:maya #delay:20m
- else:
    ~ maya_posted = true
    Нет. #from:maya #delay:5m
    автор пост не снимает. правила не нарушены. публикую. #from:tom #delay:1h
}
-> ch7_jess

=== ch7_jess ===
{
- maya_posted && c7_post_ellie:
    омг вы видели пост этой маи?? #from:jess #delay:2h
    она пишет что это элли!! я же говорила #delay:20s
- maya_posted:
    омг вы видели пост этой маи?? #from:jess #delay:2h
    там какой-то голос. жуть #delay:20s
- else:
    привет!! как вы? #from:jess #delay:2h
}
* {tom_proof} [Wexcombe Watch — это ты. При вступлении указан адрес Холлисов #to:jess #label:Предъявить Джесс заявку]
    -> ch7_jess_caught
* {note_minute} [Откуда ты знала, что Оуэн лайкнул «через минуту»? Время лайка никому не видно #to:jess]
    -> ch7_jess_caught
* [Джесс, как ты? #to:jess]
    норм. устала #from:jess #delay:1m
    кстати я тут вспомнила #delay:20s
    элли тогда с денни поднималась наверх!! я помню #delay:20s
    -> ch7_ellie

=== ch7_jess_caught ===
~ jess_exposed = true
что?? нет!! #from:jess #delay:1m
да. это я #delay:12m
оуэн попросил узнать кто вы. сказал вы журналист и элли будет хуже #delay:30s
текст его. я только выложила #delay:20s
я его боюсь. с тех пор как дэн… #delay:20s
простите!! #delay:20s
* [Я понимаю. Он и Элли запугивал #to:jess]
    ~ jess_bond += 1
    спасибо. правда #from:jess #delay:1m
* [Ты выложила мой номер на весь город #to:jess]
    ~ jess_bond -= 1
    я знаю. простите!! #from:jess #delay:1m
* [Почему ты его боишься? #to:jess]
    ~ jess_clues += 1
    не сейчас. пожалуйста #from:jess #delay:2m
- -> ch7_ellie

=== ch7_ellie ===
ты тут? #from:ellie #delay:3h
она уехала. сестра #delay:30s
{found_jacket_self:
    ~ ellie_trust += 1
    про куртку тогда — твой вопрос. без него я бы не нашла #delay:40s
}
* {note_beth} [У меня записано: в 00:52 она написала Бет про твою куртку. Почему не тебе? #to:ellie #label:Показать запись из заметок]
    -> ch7_ellie_block
* [Почему Лили написала про куртку Бет, а не тебе? #to:ellie]
    {
    - ellie_trust >= 2: -> ch7_ellie_block
    }
    не знаю. может телефон сел #from:ellie #delay:2m
    ** [В 00:52 у неё телефон работал #to:ellie]
        -> ch7_ellie_block
    ** [Ладно #to:ellie]
        ок #from:ellie #delay:30s
        -> ch7_hook
* [Спи, Элли #to:ellie]
    попробую #from:ellie #delay:1m
    -> ch7_hook

=== ch7_ellie_block ===
~ ellie_block_told = true
~ ellie_trust += 1
я её заблокировала #from:ellie #delay:4m
у воды. в 00:40 #delay:30s
чтобы она перестала #delay:20s
она поэтому написала бет #delay:30s
она мне писала. а я не видела #delay:40s
до сих пор не знаю что #delay:20s
прости #delay:30s
-> ch7_hook

=== ch7_hook ===
Здравствуйте. Этот телефон я нашёл у карьера. #from:lily #delay:7h
Под камнями у старой лестницы. #delay:20s
Телефон в прозрачном чехле для гребли, на шнурке. Экран в трещинах #photo #delay:20s
Скрин заметки: «если со мной что-то случится — это Оуэн Брайт!! он держал меня за руку». Вверху мелко: «Изменено: сегодня, 05:38» #photo #delay:20s
Отдайте полиции. Сам я не могу. #delay:30s
-> ch8

