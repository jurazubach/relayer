// ============ ГЛАВА 4 ============

=== ch4 ===
День 4 · Денни #from:ellie #sys:ellie #chapter #delay:7h
{
- unknown_blocked: -> ch4_blocked
}
-> ch4_unknown

=== ch4_unknown ===
Вы не остановились. #from:unknown #delay:30m
Оставьте Элли в покое.
Ей и без Вас хватает.
* [Вы называете её Лилиан. Так пишет только Джудит Марш #to:unknown #label:Догадка: это Джудит]
    -> ch4_reveal
* [Джесс ведь заходит к Вам? Это она переслала мой опрос #to:unknown #label:Догадка: опрос переслала Джесс]
    -> ch4_reveal
* [Это Оуэн? #to:unknown]
    Нет. #from:unknown #delay:2m
    Прочитано #sys:unknown
    -> ch4_ellie
* [Промолчать #to:unknown #silent]
    -> ch4_ellie

=== ch4_reveal ===
~ judith_revealed = true
~ judith_trust += 1
Да. #from:unknown #delay:5m
Это второй номер. Чтобы никто в городе не знал, что я пишу.
#rename:unknown, Джудит Марш (второй номер)
Лилиан вела дневник.
Я сожгла несколько страниц. Там было про Денни. И про Элли. #delay:20s
Последняя запись осталась.
Страница дневника, почерк Лили: «если что-то случится, не дайте им обвинить элли» #photo
Я видела синяк на её запястье. Это не падение. #delay:30s
Но чтобы доказать, мне пришлось бы отдать дневник. И Элли вместе с ним.
Поэтому я молчу. И ненавижу себя за это.
{told_judith_ellie:Вы сказали мне правду в первый же день. Поэтому я пишу.|Джесс рассказала мне, кто Вас нанял. Вы могли сказать сами.}
* [Спасибо, что рассказали #to:unknown]
* [Помогите нам до пятницы #to:unknown]
    ~ judith_trust += 1
    Я сделаю, что смогу. #from:unknown #delay:1m
- -> ch4_ellie

=== ch4_blocked ===
{
- quit_job: -> ch4_ellie
}
её мама написала мне #from:ellie #delay:2h
впервые с июня
сказала держаться от тебя подальше
и что она меня не винит #delay:20s
я не понимаю
-> ch4_ellie

=== ch4_ellie ===
{
- quit_job: -> ch4_please
}
оуэн тебе написал? про денни #from:ellie #delay:3h
* [Да #to:ellie]
* [Расскажи сама #to:ellie]
- -> ch4_confess

=== ch4_please ===
я ходила к оуэну #from:ellie #delay:9h
одна
он думает что у меня что-то есть #delay:20s
что-то её
пожалуйста #delay:1m
- (ask)
* [Я тут #to:ellie]
    ~ ellie_trust += 1
* [Что он сказал? #to:ellie]
* [#remind:15m] я на остановке у его дома. автобус только через час
    -> ask
* [#noanswer]
    ладно. напишу как есть #from:ellie
- -> ch4_confess

=== ch4_confess ===
мне было 15 #from:ellie #delay:2m
оуэн уговаривал всех прыгать с уступа. и снимал
денни прыгнул неудачно #delay:30s
я видела
потом оуэн сказал всем говорить что денни пришёл туда один. ночью #delay:20s
и я так сказала полиции
коннор тоже #delay:15s
у оуэна есть запись. поэтому мы молчали два года
в ту ночь она нашла запись в его телефоне #delay:40s
показала мне у воды. мы стояли в воде, поэтому кроссы
она хотела в полицию. я умоляла не надо #delay:20s
потому что меня тоже посадят
я ушла
больше я её не видела #delay:30s
* [Ты была ребёнком. Ты испугалась #to:ellie #label:Поддержать]
    ~ ellie_reaction = "support"
    ~ ellie_trust += 1
    так ещё никто не говорил #from:ellie #delay:2m
* [Ты два года врала. Из-за этого она пошла против него одна #to:ellie #label:Осудить]
    ~ ellie_reaction = "judge"
    ~ ellie_trust -= 1
    я знаю #from:ellie #delay:5m
* [Значит, идём в полицию. Вместе #to:ellie #label:Предложить идти вместе]
    ~ ellie_reaction = "together"
    ~ ellie_trust += 1
    вместе это как. тебя тут даже нет #from:ellie #delay:2m
    но спасибо
- -> ch4_threat

=== ch4_threat ===
Слушай, давай без драмы 🙂 #from:owen #delay:1h
Жаль будет, если старая история про Денни вдруг всплывёт
Особенно для Элли
Удали это. Неудачно выразился 🙂 #delay:30s
* [Скрин Оуэна: «Жаль будет, если старая история про Денни вдруг всплывёт. Особенно для Элли» #to:notes #label:Сохранить угрозу в заметки]
    ~ note_threat = true
* [Не сохранять #to:notes #silent]
- -> ch4_bluff

=== ch4_bluff ===
Ну? 🙂 #from:owen #delay:2m
* [Чем ты докажешь, что она врала? #to:owen #label:Потребовать доказательств]
    ~ called_bluff = true
    Коннор подтвердит 🙂 #from:owen #delay:1m
    Он мне должен
    ** {connor_ally} [Коннор уже на моей стороне #to:owen]
        ~ owen_weakened = true
        Посмотрим 🙂 #from:owen #delay:10m
        -> ch4_jacket
    ** [Промолчать #to:owen #silent]
        -> ch4_jacket
* [Промолчать #to:owen #silent]
    -> ch4_jacket

=== ch4_jacket ===
ты тут? #from:ellie #delay:20m
мне кажется он что-то ищет
* {note_beth or connor_jacket} [Элли, Коннор отдавал тебе куртку после той ночи? #to:ellie #label:Связать сообщение Лили и куртку]
    ~ found_jacket_self = true
    да #from:ellie #delay:1m
    через неделю. я её не надевала #delay:20s
    подожди
    в кармане что-то есть #from:ellie #delay:15m
    -> ch4_end
* [Ложись спать, Элли #to:ellie]
    -> ch4_late
* [Промолчать #to:ellie #silent]
    -> ch4_late

=== ch4_late ===
коннор принёс мне куртку тогда, в июне #from:ellie #delay:3h
я её не надевала
сейчас достала зачем-то #delay:30s
в кармане что-то есть
-> ch4_end

=== ch4_end ===
Фото на ладони: карта памяти microSD #from:ellie #photo #delay:20s
это его #delay:10s
-> ch5

