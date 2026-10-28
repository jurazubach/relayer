// ============ ГЛАВА 5 ============

=== ch5 ===
День 5 · Слушание #from:ellie #sys:ellie #chapter #delay:1h
посмотрела #from:ellie #delay:30m
там денни
голос оуэна #delay:15s
и я. и коннор
её ночи там нет. только денни #delay:20s
Кадр 1: край карьера ночью, свет телефона, два силуэта на уступе #photo
Кадр 2: тот же уступ. Сбоку видно Элли и Коннора #photo
Кадр 3: тёмный экран. Голос Оуэна за кадром: «давай, прыгай». Под ним что-то тихое, не разобрать #photo
что показывать? #delay:30s
- (ask)
* [Всё как есть #to:ellie]
    -> ch5_files
* [Вырежи кадры с тобой и Коннором #to:ellie]
    точно? #from:ellie #delay:1m
    ** [Точно #to:ellie]
        ~ cut_frames = true
        -> ch5_files
    ** [Нет. Оставь всё #to:ellie]
        -> ch5_files
    ** [#noanswer:20m]
        ~ cut_frames = true
        -> ch5_files
* [#remind:30m] слушание в 10. файлы надо отдать до него
    -> ask
* [#remind:30m] кадр 2 я пересмотрела раз пять. там видно моё лицо
    -> ask
* [#noanswer]
    ладно. решу сама #from:ellie
    -> ch5_files

=== ch5_files ===
{cut_frames:
    ок. вырезала #from:ellie #delay:10m
- else:
    ок. оставляю всё #from:ellie #delay:2m
}
Элли отправила вам 3 файла #sys:ellie #delay:1m
пусть будет у того до кого он не дотянется #from:ellie
слушание в 10 #delay:20s
-> ch5_owen

=== ch5_owen ===
Доброе утро 🙂 #from:owen #delay:5h
Давай по-взрослому
{called_bluff:
    Доказательств больше не просишь? 🙂 Правильно #delay:10s
}
Файлы у тебя. Я знаю
Отправь их мне — и про Элли никто ничего не узнает #delay:10s
Слушание в 10
{owen_knows >= 2:
    И кстати. Я помню, что ты не из Англии 🙂 #delay:30s
    Найти человека проще, чем кажется
}
{owen_weakened:
    Коннор, кстати, не отвечает. Это ничего не меняет 🙂 #delay:20s
}
-> ch5_final

=== ch5_final ===
* {judith_revealed} [Отправляю файлы Вам. Передайте коронеру #to:unknown #label:Отправить файлы Джудит]
    -> end_coroner
* [Решай сама, Элли. Это твоя жизнь #to:ellie #label:Отдать решение Элли]
    -> end_ellie
* [Отправляю. Оставь её в покое #to:owen #label:Отправить файлы Оуэну]
    -> end_owen
* [Не отвечать никому #to:ellie #silent]
    -> end_silence

// ============ ФИНАЛЫ ============

=== end_coroner ===
Получила. #from:unknown #delay:3m
Я буду у коронера до начала.
{note_threat:
    Если у Вас есть что-то ещё от него, пришлите. #delay:30s
    Скрин Оуэна: «Жаль будет, если старая история про Денни вдруг всплывёт. Особенно для Элли» #me:unknown
}
Два часа спустя #sys:unknown #delay:5s
Слушание отложено. #from:unknown #delay:1m
Коронер передал материалы в полицию.
Оуэна вызвали на допрос. #delay:30s
{cut_frames:
    ~ act1 = "adjourned_cut"
    Полиция спрашивает, почему в записи вырезаны куски. #delay:1m
    Оригинал нашли на карте. Элли придётся объяснять и это.
- else:
    ~ act1 = "adjourned"
}
меня вызвали давать показания #from:ellie #delay:5m
про денни
{ellie_reaction == "judge":даже если ты думаешь что я не заслуживаю|я скажу правду}
* [Не бойся #to:ellie]
    боюсь. но пойду #from:ellie #delay:1m
* [Я с тобой #to:ellie]
    знаю #from:ellie #delay:1m
- {connor_ally:
    я тоже пойду #from:connor #delay:5m
    хватит
}
-> season_hook

=== end_ellie ===
{ ellie_reaction:
- "support": -> end_ellie_truth
- "together": -> end_ellie_together
- else: -> end_ellie_hides
}

=== end_ellie_truth ===
~ act1 = "ellie_truth"
ок #from:ellie #delay:10m
я иду туда сама
{cut_frames:с оригиналом. без вырезок|с файлами. со всеми}
Два часа спустя #sys:ellie #delay:5s
слушание отложили #from:ellie #delay:1m
меня допросят. оуэна тоже
мне страшно. но уже не так
* [Я рядом #to:ellie]
    знаю. поэтому и не так #from:ellie #delay:1m
* [Промолчать #to:ellie #silent]
- -> season_hook

=== end_ellie_together ===
~ act1 = "ellie_together"
тогда будь на связи #from:ellie #delay:5m
пока я там
пиши мне что-нибудь
я захожу #from:ellie #delay:10m
* [Я тут #to:ellie]
* [Говори правду. Всю #to:ellie]
- меня вызвали #from:ellie #delay:10m
я сказала про денни #delay:5m
и про ту ночь
слушание отложили. файлы забрала полиция #delay:10m
спасибо. правда
-> season_hook

=== end_ellie_hides ===
~ act1 = "ellie_hides"
я удалила файлы #from:ellie #delay:10m
у тебя есть копия. делай что хочешь
только без моего имени
Два часа спустя #sys:ellie #delay:5s
вердикт: несчастный случай #from:ellie #delay:1m
* [Это твои файлы. Твоё право #to:ellie]
    знаю. легче не стало #from:ellie #delay:1m
* [Промолчать #to:ellie #silent]
- -> season_hook

=== end_owen ===
~ act1 = "owen"
Умница 🙂 #from:owen #delay:1m
Два часа спустя #sys:ellie #delay:5s
вердикт несчастный случай #from:ellie #delay:1m
почему у оуэна мои файлы #delay:1m
он прислал мне кадр. со мной #delay:20s
* [Он обещал оставить тебя в покое #to:ellie]
    он соврал. он всегда врёт #from:ellie #delay:1m
* [Прости #to:ellie]
    не знаю #from:ellie #delay:2m
- {owen_knows >= 2:
    Будешь в наших краях — заходи 🙂 #from:owen #delay:5m
}
{owen_weakened:
    коннор пошёл в полицию сам #from:ellie #delay:10m
    без записи ему никто не верит
}
-> season_hook

=== end_silence ===
ты тут? #from:ellie #delay:10m
слушание через час #delay:10m
ладно. сама #delay:5m
Два часа спустя #sys:ellie #delay:5s
{ellie_trust >= 3:
    ~ act1 = "ellie_alone_truth"
    я ходила с файлами #from:ellie #delay:1m
    слушание отложили
    оуэна вызвали на допрос. меня тоже
- else:
    ~ act1 = "ellie_alone_owen"
    я отдала карту оуэну #from:ellie #delay:1m
    он обещал
    вердикт: несчастный случай #delay:30s
}
* [Ты пошла одна #to:ellie]
    {ellie_trust >= 3:да. и дошла|да. и не дошла} #from:ellie #delay:1m
* [Промолчать #to:ellie #silent]
- -> season_hook

=== season_hook ===
Это ведь ты задаёшь людям вопросы про карьер? #from:maya #delay:6h
Я два года ждала, что кто-то начнёт.
Меня зовут Мая. Денни был моим братом. #delay:20s
#rename:maya, Мая Кин
На той записи не все, кто стоял наверху. #delay:30s
-> ch6

