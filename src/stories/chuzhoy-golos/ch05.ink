// ============ ГЛАВА 5 · пятница, утро ============

// игрок не ответил у развилки и уже прождал: следующая пауза короче на это ожидание

=== ch5 ===
Пятница, утро · Слушание #sys:ellie #chapter #delay:5h
на карте одно видео. та ночь с денни #from:ellie
Кадр 1: край карьера ночью, свет телефона, Денни на уступе. За кадром голос Оуэна: «давай, прыгай» #photo #delay:15s
* [Кто ещё в кадре? #to:ellie]
    я. и коннор, сбоку у куста. лица видно #from:ellie #delay:1m
* [Ты как? #to:ellie]
    ~ ellie_trust += 1
    мама отдала ноутбук в семь #from:ellie #delay:1m
    с тех пор смотрю. там я. и коннор #delay:20s
* [#noanswer:3m]
    там я. и коннор. сбоку #from:ellie
- Кадр 2: тот же уступ. Сбоку Элли и Коннор #photo
Кадр 3: тёмный экран. Голос Оуэна, под ним чей-то шёпот #photo #delay:20s
шёпот не разобрать. и её ночи там нет, только денни
слушание в 10. файлы надо отдать до него #delay:20s
если вырежу нас с коннором, оригинал всё равно останется на карте. что показывать?
- (ask)
* [Всё как есть #to:ellie]
    ок. всё #from:ellie #delay:1m
    денни должны видеть целиком
* [Вырежи кадры с тобой и Коннором #to:ellie]
    ~ cut_frames = true
    вырезала #from:ellie #delay:5m
    три раза промахнулась. руки
* [#remind:5m] кадр 2 я пересмотрела ещё раз. там видно моё лицо
    -> ask
* [#noanswer]
    решу сама. оставлю всё #from:ellie
- -> ch5_files

=== ch5_files ===
Элли отправила вам 3 файла #sys:ellie #delay:1m
{cut_frames:без кадра 2. оригинал у меня на карте|все три. как есть} #from:ellie
пусть будут у того, до кого он не дотянется #delay:20s
{found_jacket_self:без твоего вопроса про куртку я бы её не открыла}
-> ch5_owen

// намеренно: C-01 c5_waited читается в динамических тегах #delay:{c5_waited:…} (ch5_judith, ch5_final, end_silence, ch5_maya), линт не видит чтение внутри тега
=== ch5_owen ===
Файлы у тебя. Я знаю 🙂 #from:owen #delay:10m
{called_bluff:Доказательств больше не просишь? Правильно}
Элли уже едет к суду. С мамой #delay:10s
Отправь их мне, и про Элли никто ничего не узнает #delay:10s
{owen_knows >= 2:
    Ты ведь не из Англии 🙂 #delay:20s
    Найти человека проще, чем кажется
}
{owen_weakened:
    Коннор, кстати, не отвечает. Это ничего не меняет #delay:20s
}
- (ask)
* [Откуда ты знаешь про файлы? #to:owen]
    Карта пропала из моего телефона в ту ночь, в июне #from:owen #delay:1m
    Элли не стала бы держать её у себя. А ты далеко 🙂
* [Промолчать #to:owen #silent]
    Прочитано #sys:owen
    Молчишь. Значит, файлы правда у тебя 🙂 #from:owen #delay:2m
* [#remind:5m] Вижу «прочитано». Читаешь медленно, это правильно 🙂 #from:owen
    -> ask
* [#noanswer]
    ~ c5_waited = true
- -> ch5_judith

=== ch5_judith ===
// после «не ответил» Оуэну игрок уже ждал 10 минут
{judith_revealed:
    Я буду у коронера в девять. #from:unknown #delay:{c5_waited:20s|10m}
    ~ c5_waited = false
    Прямо со смены, переодеться не успею.
    Если у Вас есть что-то о той ночи, я передам до начала. #delay:20s
    Мне не нужно знать, откуда это у Вас.
    Мне нужно, чтобы это увидели в зале.
    {judith_trust >= 2:Вам я верю. Со мной это бывает нечасто.}
    -> ch5_judith_owen
- else:
    Слушание в десять. Не знаю, зачем пишу Вам. #from:judith #delay:{c5_waited:20s|10m}
    ~ c5_waited = false
    Я буду в зале. Если Элли что-то знает, пусть скажет сама.
    Kind regards, J. Marsh.
    -> ch5_final
}

=== ch5_judith_owen ===
- (ask)
* [Оуэн требует файлы до слушания #to:unknown #label:Рассказать Джудит про Оуэна]
    ~ judith_trust += 1
    Значит, в них то, чего он боится. #from:unknown #delay:2m
    Не отдавайте ему ничего. Даже если он пишет вежливо.
* [Промолчать #to:unknown #silent]
    Прочитано #sys:unknown
    Понимаю. Решать не мне. #from:unknown #delay:2m
    Телефон у меня до входа в зал.
* [#remind:5m] Я в машине у здания. Читаю всё, что приходит. #from:unknown
    -> ask
* [#noanswer]
    ~ c5_waited = true
- -> ch5_final

=== ch5_final ===
// после «не ответил» Джудит игрок уже ждал 10 минут
Без двадцати десять. Файлы всё ещё у тебя 🙂 #from:owen #delay:{c5_waited:20s|3m}
~ c5_waited = false
Я жду
- (ask)
* {judith_revealed} [Отправляю файлы Вам. Передайте коронеру #to:unknown #label:Отправить файлы Джудит]
    -> end_coroner
* [Решай сама, Элли. Это твоя жизнь #to:ellie #label:Отдать решение Элли]
    -> end_ellie
* [Отправляю. Оставь её в покое #to:owen #label:Отправить файлы Оуэну]
    -> end_owen
* [Не отвечать никому #to:ellie #silent]
    -> end_silence
* [#remind:8m] мы у суда. файлы у тебя, я ничего не трогаю #from:ellie
    -> ask
* [#remind:8m] тут у входа забирают телефоны #from:ellie
    -> ask
* [#noanswer]
    ~ c5_waited = true
    -> end_silence

=== end_coroner ===
Получила. #from:unknown #delay:3m
Я в зале до начала.
{note_threat:
    Если у Вас есть что-то ещё от него, пришлите. #delay:30s
    Скрин Оуэна: «Жаль будет, если старая история про Денни вдруг всплывёт. Особенно для Элли» #me:unknown
}
Телефоны сдают на входе. Дальше я без связи. #delay:20s
Джудит не в сети #sys:unknown
{cut_frames:
    ~ act1 = "adjourned_cut"
- else:
    ~ act1 = "adjourned"
}
Слушание отложено. #from:unknown #delay:30m
Коронер передал материалы в полицию.
Оуэна вызвали на допрос. #delay:30s
{cut_frames:
    Полиция спросила, почему в записи нет кусков. #delay:1m
    Оригинал нашли на карте. Элли придётся объяснять и это.
}
меня вызвали давать показания #from:ellie #delay:5m
про денни
{ellie_reaction == "judge":даже если ты думаешь что я не заслуживаю|я скажу правду}
* [Не бойся #to:ellie]
    боюсь. но пойду #from:ellie #delay:1m
* [Я с тобой #to:ellie]
    ~ ellie_trust += 1
    знаю #from:ellie #delay:1m
* [#noanswer:3m]
    пошла #from:ellie
- {connor_ally:
    я тоже пойду #from:connor #delay:5m
    хватит
}
-> ch5_maya

=== end_ellie ===
{ ellie_reaction:
- "support": -> end_ellie_truth
- "together": -> end_ellie_together
- else: -> end_ellie_hides
}

=== end_ellie_truth ===
~ act1 = "ellie_truth"
ок. иду туда сама #from:ellie #delay:5m
{cut_frames:с оригиналом. без вырезок|со всеми файлами}
телефоны сдают на входе #delay:20s
Элли не в сети #sys:ellie
слушание отложили #from:ellie #delay:30m
меня допросят. оуэна тоже
мне страшно. но уже не так
* [Я рядом #to:ellie]
    ~ ellie_trust += 1
    знаю. поэтому и не так #from:ellie #delay:1m
* [Промолчать #to:ellie #silent]
    Прочитано #sys:ellie
    просто хотелось, чтобы кто-то узнал первым #from:ellie #delay:2m
* [#noanswer:3m]
    ~ c5_waited = true
- -> ch5_maya

=== end_ellie_together ===
~ act1 = "ellie_together"
тогда будь на связи #from:ellie #delay:5m
пока я иду до входа. там телефоны забирают
пиши мне что-нибудь
- (ask)
* [Я тут #to:ellie]
    хорошо. так идти проще #from:ellie #delay:1m
* [Говори правду. Всю #to:ellie]
    ~ ellie_trust += 1
    всю. и про ту ночь тоже #from:ellie #delay:1m
    если начну про денни, остановиться уже не выйдет
* [#remind:2m] тут ступенек двенадцать. я их считаю #from:ellie
    -> ask
* [#noanswer:1m]
    ладно. захожу #from:ellie
- Элли не в сети #sys:ellie
меня вызвали #from:ellie #delay:30m
я сказала про денни
и про ту ночь
слушание отложили. файлы забрала полиция #delay:30s
спасибо. правда
-> ch5_maya

=== end_ellie_hides ===
~ act1 = "ellie_hides"
я удалила файлы #from:ellie #delay:5m
у тебя есть копия. делай что хочешь
только без моего имени
иду туда без них. телефоны сдают на входе #delay:20s
Элли не в сети #sys:ellie
вердикт: несчастный случай #from:ellie #delay:30m
про денни никто даже не спросил
* [Это твои файлы. Твоё право #to:ellie]
    ~ ellie_trust += 1
    знаю. легче не стало #from:ellie #delay:1m
* [Промолчать #to:ellie #silent]
    Прочитано #sys:ellie
    вот и я молчала. два года #from:ellie #delay:2m
* [#noanswer:3m]
    ~ c5_waited = true
- -> ch5_maya

=== end_owen ===
~ act1 = "owen"
Умница 🙂 #from:owen #delay:1m
иду. телефоны сдают на входе #from:ellie #delay:5m
Элли не в сети #sys:ellie
вердикт: несчастный случай #from:ellie #delay:30m
он прислал мне кадр. со мной #delay:1m
почему у оуэна мои файлы? #delay:20s
- (ask)
* [Он обещал оставить тебя в покое #to:ellie]
    он соврал. он всегда врёт #from:ellie #delay:1m
* [Прости #to:ellie]
    ~ ellie_trust += 1
    не знаю, что на это сказать #from:ellie #delay:2m
* [#remind:5m] я не ругаюсь. я хочу понять #from:ellie
    -> ask
* [#noanswer]
    пойду. мама ждёт в машине #from:ellie
- {owen_knows >= 2:
    Будешь в наших краях, заходи 🙂 #from:owen #delay:5m
}
{owen_weakened:
    коннор пошёл в полицию сам #from:ellie #delay:5m
    без записи ему никто не верит
}
-> ch5_maya

=== end_silence ===
// после «не ответил» у развилки главы игрок уже ждал 24 минуты
иду сама. телефон сдаю на входе #from:ellie #delay:{c5_waited:20s|5m}
~ c5_waited = false
Элли не в сети #sys:ellie
{ellie_trust >= 3:
    ~ act1 = "ellie_alone_truth"
    я ходила с файлами #from:ellie #delay:30m
    слушание отложили
    оуэна вызвали на допрос. меня тоже
- else:
    ~ act1 = "ellie_alone_owen"
    я отдала карту оуэну #from:ellie #delay:30m
    он ждал у входа. сказал: карту — и про меня никто ничего не узнает
    от тебя ни слова. а он стоял в двух шагах
    вердикт: несчастный случай #delay:30s
}
* [Ты пошла одна #to:ellie]
    ~ ellie_trust += 1
    {ellie_trust >= 4:да. и дошла|да. до зала с картой не дошла} #from:ellie #delay:1m
* [Промолчать #to:ellie #silent]
    Прочитано #sys:ellie
    {ellie_trust >= 3:справилась и так|я так и думала} #from:ellie #delay:2m
* [#noanswer:3m]
    ~ c5_waited = true
- -> ch5_maya

=== ch5_maya ===
// после «не ответил» в развязке игрок уже ждал 3 минуты
~ sync_world()
Это ведь ты задаёшь вопросы про карьер? #from:maya #delay:{c5_waited:7m|10m}
~ c5_waited = false
Денни Кин был моим братом. Ему было 15. #delay:20s
* [Кто ты? #to:maya]
    ~ maya_trust += 1
    Мая. Старшая сестра. #from:maya #delay:1m
    #rename:maya, Мая Кин
* [Кто дал тебе этот номер? #to:maya]
    {cover == "honest":Из того поста. Его видел весь город.|Из того поста про опрос. Его видел весь город.} #from:maya #delay:1m
    Я Мая, его сестра.
    #rename:maya, Мая Кин
* [#noanswer:3m]
    Я Мая, его сестра. Можно не отвечать. #from:maya
    #rename:maya, Мая Кин
- Я в студии, сессия. Выйду и расскажу по порядку. #from:maya #delay:20s
На той записи не все, кто стоял наверху.
Мая не в сети #sys:maya
-> ch6
