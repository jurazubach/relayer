// ============ ГЛАВА 3 ============

=== ch3 ===
День 3 · Город #from:ellie #sys:ellie #chapter #delay:6h
на моём шкафчике написали #from:ellie #delay:1m
неважно что
денег больше нет #delay:10m
можешь больше не
* [Я продолжу бесплатно #to:ellie]
    ~ ellie_trust += 2
    почему #from:ellie #delay:2m
    -> ch3_why
* [Тогда я заканчиваю #to:ellie]
    ~ quit_job = true
    понимаю #from:ellie #delay:3m
    спасибо за всё
    Элли не в сети #sys:ellie
    -> ch3_owen
* [Промолчать #to:ellie #silent]
    ладно #from:ellie #delay:1h
    -> ch3_owen

=== ch3_why ===
- (ask)
* [Потому что тебе никто не верит #to:ellie]
* [Потому что хочу знать, что случилось #to:ellie]
* [#remind:10m] мне никто ничего не делает бесплатно. вот и спрашиваю
    -> ask
* [#noanswer]
- ок #from:ellie #delay:1m
спасибо
-> ch3_owen

=== ch3_owen ===
{owen_contacted:Привет ещё раз 🙂 Видел пост в группе|Привет! Это Оуэн Брайт 🙂 Видел пост в группе} #from:owen #delay:2h
Ты тот самый студент, да?
Честно, хорошо, что кто-то этим занимается 🙏
Город просто хочет забыть
Давай созвонимся? Так проще
* [Не могу говорить. Только переписка #to:owen]
    Окей 🙂 #from:owen #delay:20s
* [Откуда у тебя мой номер? #to:owen]
    Маленький город 🙂 #from:owen #delay:20s
* [Промолчать #to:owen #silent]
    Не бойся, я не кусаюсь 😄 #from:owen #delay:15m
- Одна вещь, которую тебе стоит знать #from:owen #delay:1m
Коннор Пайк в ту ночь торговал таблетками
Лили грозилась его сдать
Я не говорю, что он что-то сделал 🤷
Просто проверь
* [Токсикология чистая. Только алкоголь #to:owen]
    Хм. Значит, не в ту ночь 🤷 #from:owen #delay:1m
* [Спасибо, проверю #to:owen]
    Обращайся 🙂 #from:owen #delay:20s
- -> ch3_owen_probe

=== ch3_owen_probe ===
Кстати, ты в каком универе? #from:owen #delay:30s
У меня там знакомый на кафедре, может, поможет с опросом 🙂
* [Не скажу #to:owen]
    Окей, загадочно 😄 #from:owen #delay:20s
* [В Бристоле #to:owen #label:Соврать]
    О, Бристоль! Отлично 🙂 #from:owen #delay:20s
* [Честно? Я вообще не из Англии #to:owen #label:Сказать правду]
    ~ owen_knows += 2
    Ого. Издалека 🙂 #from:owen #delay:20s
- А кто тебя нанял? Элли? 🙂 #from:owen #delay:1m
* [Никто меня не нанимал #to:owen]
    Ну-ну 🙂 #from:owen #delay:20s
* [Да, Элли #to:owen]
    ~ owen_knows += 1
    Бедная девочка 🙏 #from:owen #delay:20s
* [Промолчать #to:owen #silent]
    Ладно, не важно 🙂 #from:owen #delay:5m
- -> ch3_fake

=== ch3_fake ===
слушайте #from:jess #delay:2h
{jess_suspicious:
    я всё ещё не уверена что вы студент
    но ладно
}
этот wexcombe watch создали в тот же вечер
0 друзей
и первым его лайкнул оуэн. через минуту после поста #delay:8s
просто говорю
* [Оуэн, Wexcombe Watch — это ты? #to:owen]
    ~ exposed_fake = true
    Ты серьёзно? 😂 #from:owen #delay:2m
    Я лайкаю всё, что про город
    -> ch3_connor
* {not quit_job} [Элли, пост выложил Оуэн. Похоже на то #to:ellie]
    ~ exposed_fake = true
    ~ ellie_trust += 1
    конечно он #from:ellie #delay:5m
    -> ch3_connor
* [Спасибо, Джесс #to:jess]
    не за что. и аккуратнее #from:jess #delay:20s
    -> ch3_connor

=== ch3_connor ===
{
- connor_blocked: -> ch3_connor_relay
}
* [Коннор, говорят, в ту ночь ты продавал таблетки #to:connor]
- кто говорит #from:connor #delay:1h
оуэн?
ну продавал. и чё #delay:20s
лили их не брала. у неё в крови только алкоголь
* [Коннор, полиция знает больше, чем ты думаешь. Расскажи первым #to:connor #label:Блефовать]
    ~ connor_to_owen = true
    -> ch3_cc_fast
* [Я никому не скажу. Обещаю #to:connor #label:Пообещать молчать]
    ~ connor_ally = true
    -> ch3_cc_slow
* [Ладно. Удачи #to:connor]
    -> ch3_hook

=== ch3_cc_fast ===
чёрт #from:connor #delay:2m
ладно
-> ch3_cc_body

=== ch3_cc_slow ===
обещаешь значит #from:connor #delay:40m
ок
-> ch3_cc_body

=== ch3_cc_body ===
~ connor_jacket = true
я там был #from:connor #delay:1m
когда денни
не только я
лили это узнала. не знаю как #delay:20s
и ещё. она в ту ночь возвращалась к костру #delay:30s
рылась в куртках
я потом всё оттуда забрал. я уходил последний
* [Коннор был там, когда погиб Денни. Лили рылась в куртках у костра. Коннор всё забрал #to:notes #label:Сохранить в заметки]
    -> ch3_hook
* [Кто ещё там был? #to:connor]
    спроси свою элли #from:connor #delay:2m
    Коннор не в сети #sys:connor
    -> ch3_hook

=== ch3_connor_relay ===
{
- quit_job: -> ch3_hook
}
коннор написал мне #from:ellie #delay:3h
впервые за 3 месяца
спрашивал кто ты
сказал что про таблетки это оуэн всё раскручивает
-> ch3_hook

=== ch3_hook ===
{connor_to_owen:
    Говорят, ты пугаешь Коннора полицией 🙂 #from:owen #delay:30m
    Не надо так
}
Элли тебе не рассказывала, что была там, когда погиб Денни? 🙂 #from:owen #delay:1h
* [Откуда ты знаешь про Денни? #to:owen]
    Все знают. Она давала показания 🙂 #from:owen #delay:1m
* [Промолчать #to:owen #silent]
    Спокойной ночи 🙂 #from:owen #delay:10m
- -> ch4

