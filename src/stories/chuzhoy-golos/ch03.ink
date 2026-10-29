// ============ ГЛАВА 3 · четверг, день ============

// сколько игрок уже прождал у кнопок в ветке «не ответил»: следующая пауза короче на это время

=== ch3 ===
Четверг, день · Город #sys:ellie #chapter #delay:90m
на моём шкафчике написали #from:ellie
маркером, после того поста в watch. неважно что #delay:8s
и мама сказала, денег больше нет #delay:20s
а слушание послезавтра
можешь больше не
- (ask)
* [Я продолжу бесплатно #to:ellie]
    ~ ellie_trust += 2
    мне никто ничего не делает бесплатно #from:ellie #delay:40s
    -> ch3_why
* [Тогда я заканчиваю #to:ellie]
    ~ quit_job = true
    понимаю #from:ellie #delay:1m
    спасибо за всё
    только про шкафчик. там было не про лили #delay:20s
    там было про денни
    Элли не в сети #sys:ellie
    -> ch3_owen
* [Промолчать #to:ellie #silent]
    ладно #from:ellie #delay:30s
    -> ch3_bell
* [#remind:8m] перемена кончается. мне хватит одного слова
    -> ask
* [#noanswer]
    ~ c3_wait = 16
    ладно. если что, я тут #from:ellie
    -> ch3_bell

=== ch3_why ===
почему ты? #from:ellie #delay:6s
- (ask)
* [Потому что тебе никто не верит #to:ellie]
    ~ ellie_trust += 1
    мама верит #from:ellie #delay:30s
    наверное
* [Потому что хочу знать, что случилось #to:ellie]
    я тоже #from:ellie #delay:40s
    только мне страшно, что узнаем
* [#remind:5m] сижу в туалете, тут никто не смотрит. просто скажи
    -> ask
* [#noanswer]
    ~ c3_wait = 10
    ладно. не отвечай. всё равно спасибо #from:ellie
- -> ch3_bell

=== ch3_bell ===
на шкафчике было не про лили #from:ellie #delay:10s
про денни
звонок. на химии телефоны в коробку
Элли не в сети #sys:ellie
-> ch3_owen

=== ch3_owen ===
{c3_wait:
- 16:
    Видел пост в Wexcombe Watch 🙂 #from:owen #delay:4m
- 10:
    Видел пост в Wexcombe Watch 🙂 #from:owen #delay:10m
- else:
    Видел пост в Wexcombe Watch 🙂 #from:owen #delay:20m
}
~ c3_wait = 0
{cover == "honest":Ты тот, кто «помогает знакомой»?|Ты тот, кто с опросом?} #from:owen
Это Оуэн Брайт. Хорошо, что кто-то этим занимается 🙏 #delay:10s
Давай созвонимся? Так проще
- (ask)
* [Только переписка #to:owen]
    Окей 🙂 #from:owen #delay:20s
* [Откуда у тебя мой номер? #to:owen]
    ~ c3_owen_doubt = true
    Маленький город 🙂 #from:owen #delay:20s
* [#remind:5m] Сижу в машине, могу набрать прямо сейчас 🙂 #from:owen
    -> ask
* [#noanswer]
    Ладно, напишу так #from:owen
- Коннор Пайк в ту ночь торговал таблетками #from:owen #delay:30s
Лили грозилась его сдать
- (ask2)
* [С чего ты это взял? #to:owen]
    ~ c3_owen_doubt = true
    Все видели. Я не говорю, что он что-то сделал 🤷 #from:owen #delay:30s
* [Спасибо, проверю #to:owen]
    ~ c3_owen_tip = true
    Обращайся 🙂 #from:owen #delay:20s
* [#noanswer:3m]
- -> ch3_owen_probe

=== ch3_owen_probe ===
{cover == "honest":Помогаешь Элли, да? 🙂|А ты в каком универе? 🙂} #from:owen #delay:30s
- (ask)
* {cover != "honest"} [В Бристоле #to:owen #label:Соврать]
    О, Бристоль! Отлично 🙂 #from:owen #delay:20s
* {cover == "honest"} [Да, Элли #to:owen]
    ~ owen_knows += 1
    Бедная девочка 🙏 #from:owen #delay:20s
* [Не скажу #to:owen]
    Окей, загадочно 😄 #from:owen #delay:20s
* [Честно? Я вообще не из Англии #to:owen #label:Сказать правду]
    ~ owen_knows += 2
    Ого. Издалека 🙂 #from:owen #delay:20s
* [#remind:5m] Стою на заправке 🙂 Просто интересно, с кем говорю
    -> ask
* [#noanswer]
    ~ c3_wait = 10
    Ладно, не важно 🙂 #from:owen
- Всё, я за рулём #from:owen #delay:20s
Подумай про Коннора 🙏
Оуэн не в сети #sys:owen
-> ch3_beth

=== ch3_beth ===
{c3_wait:
- 10:
    у меня есть сообщение от лили. из той ночи #from:beth #delay:10m
- else:
    у меня есть сообщение от лили. из той ночи #from:beth #delay:20m
}
~ c3_wait = 0
эм. я бет. джесс сказала, вам надо показать #from:beth #delay:10s
я видела пост. поэтому вам, а не в полицию
вот. в 00:52 #delay:20s
Скрин: «Lily 💧 00:52 — если элли спросит, её куртка у костра. пусть заберёт сама» #photo
* [Lily, 00:52: куртка Элли у костра. «Пусть заберёт сама» #to:notes #label:Сохранить в заметки]
    ~ note_beth = true
* [Почему она написала это тебе? #to:beth]
    не знаю #from:beth #delay:30s
    мы даже не дружили
* [#noanswer:3m]
    ~ c3_wait = 3
- меня зовут. всё #from:beth #delay:20s
эм. я вам ничего не показывала, ладно?
Бет не в сети #sys:beth
-> ch3_fake

=== ch3_fake ===
{c3_wait:
- 3:
    этот wexcombe watch создали в тот же вечер!! #from:jess #delay:17m
- else:
    этот wexcombe watch создали в тот же вечер!! #from:jess #delay:20m
}
~ c3_wait = 0
{cover == "honest":я всё ещё не понимаю, кому Вы помогаете|я всё ещё не уверена, что это опрос} #from:jess #delay:10s
но это важнее
у аккаунта 0 друзей и ни одного фото
* [И кто за ним стоит? #to:jess]
    вот!! #from:jess #delay:20s
    я тоже спросила
* [Это может быть кто угодно #to:jess]
    не кто угодно!! #from:jess #delay:20s
    смотрите
* [#noanswer:3m]
    я посмотрела, кто его лайкал #from:jess
- первым его лайкнул оуэн. через минуту после поста #from:jess #delay:8s
{jess_bond > 0:говорю только Вам|просто говорю}
- (ask)
* [Оуэн, Wexcombe Watch — это ты? #to:owen]
    ~ exposed_fake = true
    Ты серьёзно? 😂 #from:owen #delay:2m
    Я лайкаю всё, что про город
* {not quit_job} [Элли, пост, похоже, от Оуэна #to:ellie]
    ~ exposed_fake = true
    ~ ellie_trust += 1
    конечно он #from:ellie #delay:5m
    кто ещё
* [Спасибо, Джесс #to:jess]
    не за что!! #from:jess #delay:20s
    и аккуратнее с ним
* [#noanswer:3m]
    ~ c3_wait = 3
- контрольная. всё, убираю телефон #from:jess #delay:20s
Джесс не в сети #sys:jess
-> ch3_connor

=== ch3_connor ===
{
- connor_blocked: -> ch3_connor_relay
}
{c3_wait:
- 3:
    оуэн всем пишет, что я торговал #from:connor #delay:17m
- else:
    оуэн всем пишет, что я торговал #from:connor #delay:20m
}
~ c3_wait = 0
ну торговал. и чё #from:connor #delay:10s
лили их не брала. у неё в крови только алкоголь
{jess_rumor and connor_told:и про мокрую элли. я это только тебе сказал}
я перед сменой. это ты раскручиваешь? #delay:10s
- (ask)
* [Не я. Оуэн и мне писал про таблетки #to:connor]
    ясно #from:connor #delay:30s
    он и тогда всё на других повесил
    всё. смена
    Коннор не в сети #sys:connor
    -> ch3_hook
* [Полиция знает больше, чем ты думаешь. Расскажи первым #to:connor #label:Блефовать]
    ~ connor_to_owen = true
    ~ connor_jacket = true
    чёрт #from:connor #delay:40s
    ладно
* [Я никому не скажу #to:connor #label:Пообещать молчать]
    ~ connor_ally = true
    ~ connor_jacket = true
    обещаешь значит #from:connor #delay:1m
    ок
* [#remind:5m] автобус подходит. да или нет #from:connor
    -> ask
* [#noanswer]
    ~ c3_wait = 10
    ладно. смена #from:connor
    Коннор не в сети #sys:connor
    -> ch3_hook
- -> ch3_cc_body

=== ch3_cc_body ===
я там был #from:connor #delay:20s
когда денни
не только я #delay:10s
- (ask)
* [Кто ещё там был? #to:connor]
    спроси свою элли #from:connor #delay:40s
* [Что узнала Лили? #to:connor]
    про денни. не знаю как #from:connor #delay:40s
* [#noanswer:3m]
- в ту ночь она возвращалась к костру #from:connor #delay:20s
рылась в куртках
я потом всё оттуда забрал. я уходил последний
* [Коннор был там, когда погиб Денни. Лили рылась в куртках у костра #to:notes #label:Сохранить в заметки]
    ~ c3_note_cc = true
* [Что ты забрал? #to:connor]
    шмотки. кто что бросил #from:connor #delay:30s
* [#noanswer:3m]
    ~ c3_wait = 3
- всё. смена #from:connor #delay:10s
Коннор не в сети #sys:connor
-> ch3_hook

=== ch3_connor_relay ===
{
- quit_job: -> ch3_hook
}
{c3_wait:
- 3:
    коннор объявился #from:ellie #delay:17m
- else:
    коннор объявился #from:ellie #delay:20m
}
~ c3_wait = 0
первый раз за три месяца. на перемене, прямо в личку #from:ellie
спрашивал, кто ты
сказал, про таблетки это оуэн раскручивает
- (ask)
* [Оуэн и мне про таблетки писал #to:ellie]
    значит, уже всем #from:ellie #delay:30s
    коннор не врёт обычно. он просто молчит
* [Ты ему ответила? #to:ellie]
    нет #from:ellie #delay:40s
    я не знаю, что ему говорить. два года не знаю
* [#noanswer:3m]
    ~ c3_wait = 3
- всё, у меня история. телефоны опять в коробку #from:ellie #delay:10s
Элли не в сети #sys:ellie
-> ch3_hook

=== ch3_hook ===
{c3_wait:
- 10:
    #delay:30s
- 3:
    #delay:2m
- else:
    #delay:5m
}
~ c3_wait = 0
{connor_to_owen:
    Говорят, ты пугаешь Коннора полицией 🙂 #from:owen
    Не надо так
}
{exposed_fake and not connor_to_owen:
    Говорят, ты ищешь, кто ведёт Watch 🙂 #from:owen
    Маленький город
}
{not connor_to_owen and not exposed_fake:
    {c3_owen_tip:
        Ну что, проверил Коннора? 🙂 #from:owen
    - else:
        Кстати 🙂 #from:owen
    }
}
{c3_owen_doubt:
    Ты задаёшь хорошие вопросы 🙂 #from:owen #delay:10s
    Задай один Элли
}
Элли тебе не рассказывала, что была там, когда погиб Денни? 🙂 #from:owen #delay:10s
- (ask)
* [Откуда ты знаешь про Денни? #to:owen]
    Все знают. Она давала показания 🙂 #from:owen #delay:1m
* {c3_note_cc} [Коннор говорит, он тоже был там #to:owen]
    Коннор много где был. А показания давала Элли 🙂 #from:owen #delay:1m
* [Промолчать #to:owen #silent]
* [#remind:5m] Я ещё у машины 🙂 Так рассказывала или нет?
    -> ask
* [#noanswer]
- Мне на работу 🙏 #from:owen #delay:30s
Ты точно знаешь, кому помогаешь? 🙂
Оуэн не в сети #sys:owen
-> ch4
