// ============ ГЛАВА 2 ============

=== ch2 ===
День 2 · Свидетели #from:ellie #sys:ellie #chapter #delay:1h
{
- connor_told: -> ch2_ellie
}
-> ch2_rumor

=== ch2_rumor ===
~ jess_rumor = true
слушайте #from:jess #delay:20m
я тут вспомнила
коннор потом всем говорил что элли вернулась с воды одна. мокрая
это наверно ерунда
* [Коннор: Элли вернулась с воды одна, мокрая #to:notes #label:Сохранить в заметки]
* [Спасибо, Джесс #to:jess]
- -> ch2_ellie

=== ch2_ellie ===
{
- confronted_night: -> ch2_ellie_night
}
доброе #from:ellie #delay:30m
я в школе. как вчера?
* {note_connor} [У меня записано: к воде вы пошли вместе в 00:30. Вернулась ты одна и мокрая #to:ellie #label:Показать запись из заметок]
    -> ch2_ellie_full
* [Коннор говорит, ты ушла не в 23:30 #to:ellie]
    -> ch2_ellie_partial
* [Ничего нового #to:ellie #label:Не поднимать тему]
    -> ch2_ellie_none

=== ch2_ellie_night ===
да #from:ellie #delay:20m
я ушла не в 23:30
-> ch2_ellie_full

=== ch2_ellie_full ===
~ ellie_trust += 1
мы пошли к воде вместе #from:ellie #delay:40s
поругались прямо в воде. по щиколотку
у неё был чей-то телефон
не её #delay:8s
я ушла в 00:40. она осталась
это правда #delay:20s
-> ch2_judith_intro

=== ch2_ellie_partial ===
коннор в ту ночь был в хлам #from:ellie #delay:1m
ладно #from:ellie #delay:2h
не в 23:30. в 00:40
мы поругались у воды
больше ничего
-> ch2_judith_intro

=== ch2_ellie_none ===
ок #from:ellie #delay:20s
-> ch2_judith_intro

=== ch2_judith_intro ===
есть ещё один номер #from:ellie #delay:15s
её мама. джудит марш #unlock:judith
со мной она не говорит
она медсестра, отвечает рано утром или поздно вечером
я не знаю можно ли так #delay:10s
* [Напишу ей #to:ellie]
    спасибо #from:ellie #delay:20s
* [Не знаю, правильно ли это #to:ellie]
    я тоже #from:ellie #delay:20s
    но больше некому
- -> ch2_judith

=== ch2_judith ===
* {cover == "student"} [Здравствуйте. Я {alias}, провожу опрос о безопасности на вечеринках. Можно задать несколько вопросов о карьере Холлоуэй? #to:judith]
* {cover == "honest"} [Здравствуйте. Я {alias}. Помогаю разобраться, что случилось с Лили. Можно задать несколько вопросов? #to:judith]
- Здравствуйте. #from:judith #delay:3h
Я отвечу на Ваши вопросы.
Но я хочу знать, кто Вы на самом деле. До конца недели.
* [Какой была Лили? #to:judith]
    Лилиан была упрямой. #from:judith #delay:2m
    Гребля в пять утра, в любую погоду.
    Последние месяцы она всё время читала про Денни Кина.
* [Почему Вы думаете, что это не несчастный случай? #to:judith]
    Я этого не говорила. #from:judith #delay:3m
    Но последние месяцы Лилиан всё время читала про Денни Кина.
- (g2)
{
- cover == "honest": -> ch2_judith_med
}
* [Что сказал коронер? #to:judith]
    Это я с исследователем обсуждать не буду. #from:judith #delay:1m
    -> ch2_judith_who
* [Спасибо #to:judith]
    -> ch2_judith_who

=== ch2_judith_med ===
~ knows_tox = true
Раз уж Вы честны со мной. #from:judith #delay:1m
Токсикология: только алкоголь. Никаких таблеток.
На запястье был синяк. Коронер написал: от падения.
Я медсестра. Я видела много падений.
* [Только алкоголь. Синяк на запястье #to:notes #label:Сохранить в заметки]
* [Спасибо, что сказали #to:judith]
- -> ch2_judith_who

=== ch2_judith_who ===
Кто Вас попросил? #from:judith #delay:30s
* [Элли Вэнс #to:judith]
    ~ told_judith_ellie = true
    ~ judith_trust += 2
    Понятно. #from:judith #delay:1m
    Джудит не в сети #sys:judith
* [Я не могу сказать #to:judith]
    Значит, кто-то, кого я знаю. #from:judith #delay:1m
    Kind regards, J. Marsh.
* [Промолчать #to:judith #silent]
    ~ judith_trust -= 1
    Kind regards, J. Marsh. #from:judith #delay:2m
- -> ch2_denny

=== ch2_denny ===
* [Элли, кто такой Денни Кин? #to:ellie]
- мальчик #from:ellie #delay:40m
погиб там 2 года назад
я не хочу об этом
{
- knows_tox: -> ch2_beth
}
-> ch2_article

=== ch2_article ===
~ knows_tox = true
вот ещё #from:ellie #delay:5m
Exeter Express: «Предварительное заседание по делу Лили Марш, 17 лет. Токсикология: только алкоголь. Синяк на запястье объяснён падением. Слушание назначено на пятницу» #photo
-> ch2_beth

=== ch2_beth ===
эм привет #from:beth #delay:2h
{beth_written:я вчера не ответила, извините|мне джесс дала ваш номер}
это про опрос
я не знаю важно ли
лили писала мне той ночью #delay:10s
в 00:52
я не ответила. спала
Скрин: «Lily 💧 00:52 — если элли спросит, её куртка у костра. пусть заберёт сама» #photo
* [Лили, 00:52: куртка Элли у костра. «Пусть заберёт сама» #to:notes #label:Сохранить в заметки]
    ~ note_beth = true
* [Спасибо, Бет #to:beth]
* [Почему она написала это тебе? #to:beth]
    не знаю #from:beth #delay:30s
    мы даже не дружили особо
- -> ch2_hook

=== ch2_hook ===
Скрин поста в «Wexcombe Community Noticeboard». Аккаунт Wexcombe Watch, 01:12: «Кто-то пишет нашим детям под видом студента и выспрашивает про карьер. Кто знает, кто это?» Ниже скрин вашего опроса #from:ellie #photo #delay:8h
они знают что это я #delay:20s
только у меня был этот список
* [Мне жаль #to:ellie]
* [Кто это выложил? #to:ellie]
    не знаю. аккаунт новый #from:ellie #delay:30s
* [Ложись спать. Утром разберёмся #to:ellie]
    ~ ellie_trust += 1
    не могу #from:ellie #delay:30s
- -> ch3

