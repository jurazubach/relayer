// ============ ГЛАВА 5 · пятница, утро ============

=== ch5 ===
Пятница, утро · Слушание #sys:ellie #chapter #delay:5h
на карте одно видео. та ночь с денни #from:ellie
Кадр 1: край карьера ночью, свет телефона, Денни на уступе #photo
голос оуэна за кадром: «давай, прыгай» #delay:15s
* [Кто ещё в кадре? #to:ellie]
    я. и коннор #from:ellie #delay:1m
    сбоку, у куста. лица видно
* [Ты как? #to:ellie]
    ~ ellie_trust += 1
    мама отдала ноутбук в семь #from:ellie #delay:1m
    с тех пор смотрю. там я. и коннор #delay:20s
* [#noanswer:10m]
    там я. и коннор. сбоку #from:ellie
- Кадр 2: тот же уступ. Сбоку Элли и Коннор #photo
Кадр 3: тёмный экран. Голос Оуэна, под ним чей-то шёпот #photo #delay:20s
шёпот не разобрать. я пробовала
её ночи там нет. только денни
слушание в 10. файлы надо отдать до него #delay:20s
если вырежу нас с коннором, оригинал всё равно останется на карте
что показывать?
- (ask)
* [Всё как есть #to:ellie]
    ок. всё #from:ellie #delay:1m
    денни должны видеть целиком
* [Вырежи кадры с тобой и Коннором #to:ellie]
    ~ cut_frames = true
    вырезала #from:ellie #delay:5m
    три раза промахнулась. руки
* [#remind:12m] кадр 2 я пересмотрела ещё раз. там видно моё лицо
    -> ask
* [#noanswer]
    решу сама. оставлю всё #from:ellie
- -> ch5_files

=== ch5_files ===
Элли отправила вам 3 файла #sys:ellie #delay:1m
{cut_frames:без кадра 2. оригинал у меня на карте|все три. как есть} #from:ellie
пусть будут у того, до кого он не дотянется #delay:20s
{found_jacket_self:без твоего вопроса про куртку я бы её не открыла}
мама везёт меня к суду
-> ch5_owen

=== ch5_owen ===
Файлы у тебя. Я знаю 🙂 #from:owen #delay:20m
{called_bluff:Доказательств больше не просишь? Правильно}
Отправь их мне, и про Элли никто ничего не узнает #delay:10s
{owen_knows >= 2:
    Ты ведь не из Англии 🙂 #delay:20s
    Найти человека проще, чем кажется
}
{owen_weakened:
    Коннор, кстати, не отвечает. Это ничего не меняет #delay:20s
}
* [Откуда ты знаешь про файлы? #to:owen]
    Карта пропала из моего телефона в ту ночь, в июне #from:owen #delay:1m
    Элли не стала бы держать её у себя. А ты далеко 🙂
* [Промолчать #to:owen #silent]
    Прочитано #sys:owen
    Молчишь. Значит, файлы правда у тебя 🙂 #from:owen #delay:2m
* [#noanswer:10m]
- -> ch5_judith

=== ch5_judith ===
{judith_revealed:
    Я буду у коронера в девять. #from:unknown #delay:10m
    Если у Вас есть что-то о той ночи, я передам до начала.
    {judith_trust >= 2:Вам я верю. Со мной это бывает нечасто.}
    -> ch5_judith_owen
- else:
    Слушание в десять. Не знаю, зачем пишу Вам. #from:judith #delay:10m
    Я буду в зале. Если Элли что-то знает, пусть скажет сама.
    Kind regards, J. Marsh.
    -> ch5_final
}

=== ch5_judith_owen ===
* [Оуэн требует файлы до слушания #to:unknown #label:Рассказать Джудит про Оуэна]
    ~ judith_trust += 1
    Значит, в них то, чего он боится. #from:unknown #delay:2m
    Не отдавайте ему ничего. Даже если он пишет вежливо.
* [Промолчать #to:unknown #silent]
    Прочитано #sys:unknown
    Понимаю. Решать не мне. #from:unknown #delay:2m
* [#noanswer:5m]
- -> ch5_final

=== ch5_final ===
- (ask)
* {judith_revealed} [Отправляю файлы Вам. Передайте коронеру #to:unknown #label:Отправить файлы Джудит]
    -> end_coroner
* [Решай сама, Элли. Это твоя жизнь #to:ellie #label:Отдать решение Элли]
    -> end_ellie
* [Отправляю. Оставь её в покое #to:owen #label:Отправить файлы Оуэну]
    -> end_owen
* [Не отвечать никому #to:ellie #silent]
    -> end_silence
* [#remind:12m] мы у суда. файлы у тебя, я ничего не трогаю #from:ellie
    -> ask
* [#remind:12m] тут у входа забирают телефоны #from:ellie
    -> ask
* [#noanswer]
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
Слушание отложено. #from:unknown #delay:55m
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
* [#noanswer:5m]
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
слушание отложили #from:ellie #delay:55m
меня допросят. оуэна тоже
мне страшно. но уже не так
* [Я рядом #to:ellie]
    ~ ellie_trust += 1
    знаю. поэтому и не так #from:ellie #delay:1m
* [Промолчать #to:ellie #silent]
    Прочитано #sys:ellie
    просто хотелось, чтобы кто-то узнал первым #from:ellie #delay:2m
* [#noanswer:5m]
- -> ch5_maya

=== end_ellie_together ===
~ act1 = "ellie_together"
тогда будь на связи #from:ellie #delay:5m
пока я иду до входа. там телефоны забирают
пиши мне что-нибудь
* [Я тут #to:ellie]
    хорошо. так идти проще #from:ellie #delay:1m
* [Говори правду. Всю #to:ellie]
    всю. и про ту ночь тоже #from:ellie #delay:1m
    если начну про денни, остановиться уже не выйдет
* [#noanswer:5m]
    ладно. захожу #from:ellie
- Элли не в сети #sys:ellie
меня вызвали #from:ellie #delay:55m
я сказала про денни
и про ту ночь
слушание отложили. файлы забрала полиция #delay:30s
спасибо. правда
-> ch5_maya

=== end_ellie_hides ===
~ act1 = "ellie_hides"
я удалила файлы #from:ellie #delay:10m
у тебя есть копия. делай что хочешь
только без моего имени
иду туда без них. телефоны сдают на входе #delay:20s
Элли не в сети #sys:ellie
вердикт: несчастный случай #from:ellie #delay:55m
про денни никто даже не спросил
* [Это твои файлы. Твоё право #to:ellie]
    знаю. легче не стало #from:ellie #delay:1m
* [Промолчать #to:ellie #silent]
    Прочитано #sys:ellie
    вот и я молчала. два года #from:ellie #delay:2m
* [#noanswer:5m]
- -> ch5_maya

=== end_owen ===
~ act1 = "owen"
Умница 🙂 #from:owen #delay:1m
иду. телефоны сдают на входе #from:ellie #delay:10m
Элли не в сети #sys:ellie
вердикт: несчастный случай #from:ellie #delay:55m
почему у оуэна мои файлы #delay:1m
он прислал мне кадр. со мной #delay:20s
- (ask)
* [Он обещал оставить тебя в покое #to:ellie]
    он соврал. он всегда врёт #from:ellie #delay:1m
* [Прости #to:ellie]
    не знаю, что на это сказать #from:ellie #delay:2m
* [#remind:12m] я не ругаюсь. я хочу понять #from:ellie
    -> ask
* [#noanswer]
    пойду. мама ждёт в машине #from:ellie
- {owen_knows >= 2:
    Будешь в наших краях, заходи 🙂 #from:owen #delay:5m
}
{owen_weakened:
    коннор пошёл в полицию сам #from:ellie #delay:10m
    без записи ему никто не верит
}
-> ch5_maya

=== end_silence ===
иду сама. телефон сдаю на входе #from:ellie #delay:10m
Элли не в сети #sys:ellie
{ellie_trust >= 3:
    ~ act1 = "ellie_alone_truth"
    я ходила с файлами #from:ellie #delay:50m
    слушание отложили
    оуэна вызвали на допрос. меня тоже
- else:
    ~ act1 = "ellie_alone_owen"
    я отдала карту оуэну #from:ellie #delay:50m
    он ждал у входа. обещал
    вердикт: несчастный случай #delay:30s
}
* [Ты пошла одна #to:ellie]
    {ellie_trust >= 3:да. и дошла|да. и не дошла} #from:ellie #delay:1m
* [Промолчать #to:ellie #silent]
    Прочитано #sys:ellie
    {ellie_trust >= 3:справилась и так|я так и думала} #from:ellie #delay:2m
* [#noanswer:5m]
- -> ch5_maya

=== ch5_maya ===
~ sync_world()
Это ведь ты задаёшь вопросы про карьер? #from:maya #delay:20m
Денни Кин был моим братом. Ему было 15. #delay:20s
* [Кто ты? #to:maya]
    ~ maya_trust += 1
    Мая. Старшая сестра. #from:maya #delay:1m
    #rename:maya, Мая Кин
* [Откуда у тебя мой номер? #to:maya]
    {cover == "honest":Из того поста. Его видел весь город.|Из того поста про опрос. Его видел весь город.} #from:maya #delay:1m
    Я Мая, его сестра.
    #rename:maya, Мая Кин
* [#noanswer:10m]
    Я Мая, его сестра. Можно не отвечать. #from:maya
    #rename:maya, Мая Кин
- Я в студии, сессия. Выйду и расскажу по порядку. #from:maya #delay:20s
На той записи не все, кто стоял наверху.
Мая не в сети #sys:maya
-> ch6
