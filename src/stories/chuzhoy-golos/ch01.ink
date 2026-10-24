// ============ ГЛАВА 1 ============

=== ch1 ===
День 1 · Подработка #from:ellie #sys:ellie #chapter
привет! это по объявлению #from:ellie #delay:5s
remote research assistant, только переписка, £12 в час
спасибо за отклик #delay:4s
сначала один вопрос #delay:8s
ты же не из девона?
* [Нет, далеко #to:ellie]
    хорошо #from:ellie
* [А это важно? #to:ellie]
    да #from:ellie
* [Это какой-то развод? #to:ellie]
    ~ ellie_trust -= 1
    нет. честно нет #from:ellie
    могу заплатить вперёд
- прости #from:ellie #delay:6s
важно чтобы тут тебя никто не знал
работа простая #delay:10s
я даю 6 номеров
ты пишешь им как студент
опрос «безопасность молодёжи на вечеринках под открытым небом»
за ответы ваучер £10. ваучеры куплю я
со мной они не разговаривают #delay:12s
с тобой будут
* [Ок, давай #to:ellie]
    ~ ellie_trust += 1
    -> ch1_terms
* [А что за вечеринка? #to:ellie]
    -> ch1_party
* [Это странно. Я пас #to:ellie]
    -> ch1_refuse

=== ch1_party ===
была девушка #from:ellie #delay:40s
в газетах всё есть
полиция закрыла за 9 дней #delay:8s
слушание у коронера через 4 дня
после него всё
* [Ладно. Берусь #to:ellie]
    ~ ellie_trust += 1
    -> ch1_terms
* [Это не для меня #to:ellie]
    -> ch1_refuse

=== ch1_refuse ===
понятно #from:ellie #delay:20s
Элли В. перевела вам £12.00 · «просто так. если вдруг» #from:bank #delay:2m
* [Зачем? #to:ellie]
    больше никто не ответил #from:ellie #delay:1m
    за три дня
    ** [Ладно. Что надо делать? #to:ellie]
        -> ch1_terms
* [Хорошо. Что надо делать? #to:ellie]
    -> ch1_terms
* [Промолчать #to:ellie #silent]
    ещё тут? #from:ellie #delay:25m
    мне правда больше некого просить
    ** [Тут. Рассказывай #to:ellie]
        -> ch1_terms

=== ch1_terms ===
спасибо #from:ellie #delay:6s
как тебя подписать? настоящее имя не нужно
* [Сэм #to:ellie]
    ~ alias = "Сэм"
* [Алекс #to:ellie]
    ~ alias = "Алекс"
* [Джордан #to:ellie]
    ~ alias = "Джордан"
- ок, {alias} #from:ellie
и ещё #delay:5s
ты пишешь как студент, как я предложила? или говоришь как есть?
* [Студент. Как договорились #to:ellie]
    ~ cover = "student"
    ~ opener = "Здравствуйте! Я " + alias + ", студент. Делаю опрос о безопасности на вечеринках. 5 вопросов, ваучер £10. Можно?"
    ок. так проще #from:ellie
* [Скажу правду: помогаю знакомой #to:ellie]
    ~ cover = "honest"
    ~ opener = "Здравствуйте, я " + alias + ". Помогаю знакомой понять, что случилось на карьере в июне. Можно пару вопросов?"
    тогда тебе никто не ответит #from:ellie
    но как знаешь
- вот номера #from:ellie #delay:15s
Скрин участников чата «Shortest Night 🔥»: Коннор Пайк, Джесс Холлис, Киран Лоу, Том Эйкерс, Бет Солтер, Оуэн Брайт. Строка «Lily 💧» серая. Внизу: «Элли вышла из чата» #photo
оуэну брайту НЕ пиши #delay:8s
он организатор. просто не надо
и перепиши себе список. скрин я удалю
* [Коннор, Джесс, Киран, Том, Бет. Оуэну не писать #to:notes #label:Сохранить список в заметки]
    -> ch1_terms_end
* [Зачем удалять? #to:ellie]
    если у меня заберут телефон #from:ellie #delay:20s
    тут такое бывает
    -> ch1_terms_end

=== ch1_terms_end ===
коннор отвечает только после смены, ближе к ночи #from:ellie #delay:10s
остальные днём
мама пришла. напишу через пару часов #delay:8s
Элли не в сети #sys:ellie
-> ch1_hub

=== ch1_hub ===
* [{opener} #to:jess #label:Написать Джесс]
    -> ch1_jess
* [{opener} #to:kieran #label:Написать Кирану и Тому]
    {opener} #me:tom
    -> ch1_kt
* [{opener} #to:beth #label:Написать Бет]
    ~ beth_written = true
    -> ch1_beth
* [{opener} #to:owen #label:Написать Оуэну, хотя Элли просила не писать]
    -> ch1_owen
* {jess_done} [Хватит пока. Подождать Элли #to:ellie #silent]
    -> ch1_evening

=== ch1_jess ===
омг да!! заполню #from:jess #delay:1m
ваучер на что?
* [Любой на выбор #to:jess]
* [На кофейню #to:jess]
- супер #from:jess
давай
* [Где вы обычно собираетесь летом? #to:jess]
- на пляже. или на карьере #from:jess #delay:30s
карьер вообще-то самое опасное #delay:6s
там девочка погибла в июне
вы же знаете?
* [Нет. Расскажи #to:jess]
    лили. мы вместе гребли #from:jess #delay:20s
    утонула после вечеринки. все говорят пьяная
* [Про конкретные случаи я не спрашиваю #to:jess]
    да я сама скажу #from:jess #delay:15s
    лили. мы вместе гребли
* [А ты там была? #to:jess]
    ~ jess_push += 1
    ну да. все были #from:jess #delay:15s
- я была на той вечеринке #from:jess #delay:8s
лили и элли весь вечер грызлись
все видели
* [Из-за чего? #to:jess]
    ~ jess_push += 1
    не знаю #from:jess #delay:20s
    элли потом вообще исчезла
* [Лили и Элли ругались весь вечер #to:notes #label:Сохранить в заметки]
* [Спасибо. Это очень помогает #to:jess]
- (g1)
{
- jess_push >= 2: -> ch1_jess_sus
}
кстати я завтра к её маме захожу #from:jess #delay:10s
она будет рада что кто-то этим занимается
~ jess_done = true
-> ch1_hub

=== ch1_jess_sus ===
~ jess_suspicious = true
стоп #from:jess #delay:30s
а это точно опрос?
* [Точно. Просто тема тяжёлая #to:jess]
* [Промолчать #to:jess #silent]
- ладно #from:jess #delay:20s
кстати я завтра к её маме захожу
~ jess_done = true
-> ch1_hub

=== ch1_kt ===
Прочитано #sys:tom #delay:2m
кто это? #from:kieran #delay:3m
* {cover == "student"} [Студент. Опрос про вечеринки #to:kieran]
* {cover == "honest"} [Помогаю подруге Лили #to:kieran]
* [Промолчать #to:kieran #silent]
- Киран не в сети #sys:kieran #delay:5m
-> ch1_hub

=== ch1_beth ===
Бет не в сети #sys:beth #delay:1m
-> ch1_hub

=== ch1_owen ===
~ owen_contacted = true
Привет! Конечно помогу 🙂 #from:owen #delay:40s
А кто дал тебе мой номер?
* [Он был в общем чате вечеринки #to:owen]
    ~ owen_knows += 1
    А, Shortest Night 🔥 Понятно #from:owen #delay:20s
    Пиши, если что. Я за любые исследования 🙏
    -> ch1_hub
* [Однокурсник #to:owen]
    Окей 🙂 Пиши, если что #from:owen #delay:20s
    -> ch1_hub
* [Промолчать #to:owen #silent]
    Ты тут? 🙂 #from:owen #delay:3m
    -> ch1_hub

=== ch1_evening ===
я тут #from:ellie #delay:1h
кто-нибудь ответил?
* [Джесс. Говорит, вы с Лили ругались весь вечер #to:ellie]
    -> ch1_ellie_lie
* {owen_contacted} [Оуэн ответил. Очень дружелюбно #to:ellie]
    ~ ellie_trust -= 1
    я же просила #from:ellie #delay:20s
    Элли не в сети #sys:ellie
    ладно #from:ellie #delay:10m
    что сказала джесс?
    ** [Что вы с Лили ругались весь вечер #to:ellie]
        -> ch1_ellie_lie
* [Пока тишина #to:ellie]
    понятно #from:ellie #delay:20s
    а джесс? она всегда отвечает
    ** [Джесс говорит, вы с Лили ругались весь вечер #to:ellie]
        -> ch1_ellie_lie

=== ch1_ellie_lie ===
да мы поругались но это было раньше #from:ellie #delay:1m
где-то в 11 она сказала что я веду себя как ребёнок
потому что я не хотела прыгать
я сказала что иду домой и ушла
в половине 12 я уже шла по трассе
мама мне ещё писала где я, могу скрин показать
* [Не надо. Верю #to:ellie]
    ~ ellie_trust += 1
* [Покажи #to:ellie]
    Скрин переписки: «мама: ты где?». Время на скрине обрезано #from:ellie #photo #delay:30s
* [Элли: ушла в 23:30 #to:notes #label:Сохранить в заметки]
- коннор знает больше всех #from:ellie #delay:10s
он был с ней раньше
пиши ему, он отвечает из автобуса
Элли В. перевела вам £12.00 · «час 1 x» #from:bank #delay:1m
-> ch1_connor

=== ch1_connor ===
* [{opener} #to:connor #label:Написать Коннору]
    -> ch1_connor_reply
* [Не писать Коннору сегодня #to:connor #silent]
    -> ch1_connor_skip

=== ch1_connor_skip ===
коннор ответил? #from:ellie #delay:40m
он правда знает больше всех
* [Ладно. Пишу #to:ellie]
    {opener} #me:connor
    -> ch1_connor_reply
* [Завтра #to:ellie]
    ок #from:ellie #delay:20s
    -> ch1_unknown

=== ch1_connor_reply ===
я со смены #from:connor #delay:1h
чё за опрос
ваучер реально дадут или это скам
* [Дадут. Пять вопросов #to:connor]
    -> ch1_connor_soft
* [Два вопроса — и ваучер твой #to:connor]
    -> ch1_connor_soft
* [Ты знал Лили Марш? #to:connor]
    -> ch1_connor_direct

=== ch1_connor_direct ===
~ connor_blocked = true
ты не студент #from:connor #delay:30s
отвали
Сообщение не доставлено #sys:connor #delay:1m
-> ch1_unknown

=== ch1_connor_soft ===
ага #from:connor #delay:20s
* [Что самое опасное ты видел на вечеринках? #to:connor]
- самое? #from:connor #delay:40s
лол
июнь ясно
* [Если не хочешь, не надо #to:connor]
    да не #from:connor #delay:20s
* [Это анонимно #to:connor]
    ну ок #from:connor #delay:20s
- все набухались #from:connor #delay:30s
оуэн полночи бегал искал свой телефон как бешеный
элли с лили пошли вниз к воде где-то в пол первого #delay:10s
потом элли вернулась одна
кроссы мокрые
сорян смена завтра рано #delay:10s
Коннор не в сети #sys:connor
~ connor_told = true
* [00:30 Элли и Лили пошли к воде. Элли вернулась одна, мокрая. Оуэн искал телефон #to:notes #label:Сохранить в заметки]
    ~ note_connor = true
* [Не сохранять #to:notes #silent]
- -> ch1_confront

=== ch1_confront ===
Элли в сети #sys:ellie #delay:2m
* [Коннор говорит, вы с Лили пошли к воде вместе. В 00:30 #to:ellie]
    ~ confronted_night = true
    Прочитано #sys:ellie #delay:1m
    -> ch1_unknown
* [Подождать до утра #to:ellie #silent]
    спокойной ночи #from:ellie #delay:30m
    спасибо что делаешь это
    -> ch1_unknown

=== ch1_unknown ===
{cover == "student":Вы не студент.|Вы не из Векскомба.} #from:unknown #delay:7h
Прекратите писать людям о Лилиан.
* [Кто это? #to:unknown]
    Прочитано #sys:unknown #delay:1m
* [Это просто опрос #to:unknown]
    Прочитано #sys:unknown #delay:1m
* [Заблокировать #to:unknown #silent #label:Заблокировать номер]
    ~ unknown_blocked = true
    Номер заблокирован #sys:unknown
- -> ch2

