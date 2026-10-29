// ============ ГЛАВА 5 · пятница, утро ============

// игрок не ответил у развилки и уже прождал: следующая пауза короче на это ожидание

=== ch5 ===
Пятница, утро · Суд #sys:ellie #chapter #delay:5h
на карте одно видео. та ночь с денисом #from:ellie
Кадр 1: край карьера ночью, свет телефона, Денис на уступе. За кадром голос Остапа: «давай, прыгай» #photo:ch05-frame1 #delay:15s
* [Кто ещё в кадре? #to:ellie]
    я. и костя, сбоку у куста. лица видно #from:ellie #delay:1m
* [Ты как? #to:ellie]
    ~ ellie_trust += 1
    мама отдала ноутбук в семь #from:ellie #delay:1m
    с тех пор смотрю. там я. и костя #delay:20s
* [#noanswer:3m]
    там я. и костя. сбоку #from:ellie
- Кадр 2: тот же уступ. Сбоку Оля и Костя #photo:ch05-frame2
Кадр 3: тёмный экран. Голос Остапа, под ним чей-то шёпот #photo:ch05-frame3 #delay:20s
шёпот не разобрать. и её ночи там нет, только денис
суд в 10. файлы надо отдать до него #delay:20s
если вырежу нас с костей, оригинал всё равно останется на карте. что показывать?
- (ask)
* [Всё как есть #to:ellie]
    ок. всё #from:ellie #delay:1m
    дениса должны видеть целиком
* [Вырежи кадры с тобой и Костей #to:ellie]
    ~ cut_frames = true
    вырезала #from:ellie #delay:5m
    три раза промахнулась. руки
* [#remind:5m] кадр 2 я пересмотрела ещё раз. там видно моё лицо
    -> ask
* [#noanswer]
    решу сама. оставлю всё #from:ellie
- -> ch5_files

=== ch5_files ===
Оля отправила вам 3 файла #sys:ellie #delay:1m
{cut_frames:без кадра 2. оригинал у меня на карте|все три. как есть} #from:ellie
пусть будут у того, до кого он не дотянется #delay:20s
{found_jacket_self:без твоего вопроса про куртку я бы её не открыла}
-> ch5_owen

// намеренно: C-01 c5_waited читается в динамических тегах #delay:{c5_waited:…} (ch5_judith, ch5_final, end_silence, ch5_maya), линт не видит чтение внутри тега
=== ch5_owen ===
Файлы у тебя. Я знаю 🙂 #from:owen #delay:10m
{called_bluff:Доказательств больше не просишь? Правильно}
Оля уже едет к суду. С мамой #delay:10s
Отправь их мне, и про Олю никто ничего не узнает #delay:10s
{owen_knows >= 2:
    Ты ведь не из Украины 🙂 #delay:20s
    Найти человека проще, чем кажется
}
{owen_weakened:
    Костя, кстати, не отвечает. Это ничего не меняет #delay:20s
}
- (ask)
* [Откуда ты знаешь про файлы? #to:owen]
    Карта пропала из моего телефона в ту ночь, в июне #from:owen #delay:1m
    Оля не стала бы держать её у себя. А ты далеко 🙂
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
    Я буду в суде в девять. #from:unknown #delay:{c5_waited:20s|10m}
    ~ c5_waited = false
    Прямо со смены, переодеться не успею.
    Если у Вас есть что-то о той ночи, я передам до начала. #delay:20s
    Мне не нужно знать, откуда это у Вас.
    Мне нужно, чтобы это увидели в зале.
    {judith_trust >= 2:Вам я верю. Со мной это бывает нечасто.}
    -> ch5_judith_owen
- else:
    Суд в десять. Не знаю, зачем пишу Вам. #from:judith #delay:{c5_waited:20s|10m}
    ~ c5_waited = false
    Я буду в зале. Если Оля что-то знает, пусть скажет сама.
    С уважением, Н. Марченко.
    -> ch5_final
}

=== ch5_judith_owen ===
- (ask)
* [Остап требует файлы до суда #to:unknown #label:Рассказать Наталье про Остапа]
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
* {judith_revealed} [Отправляю файлы Вам. Приложите к жалобе #to:unknown #label:Отправить файлы Наталье]
    -> end_coroner
* [Решай сама, Оля. Это твоя жизнь #to:ellie #label:Отдать решение Оле]
    -> end_ellie
* [Отправляю. Оставь её в покое #to:owen #label:Отправить файлы Остапу]
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
Получила. Приложу к жалобе. #from:unknown #delay:3m
Я в зале до начала.
{note_threat:
    Если у Вас есть что-то ещё от него, пришлите. #delay:30s
    Скрин Остапа: «Жаль будет, если старая история про Дениса вдруг всплывёт. Особенно для Оли» #me:unknown
}
Телефоны сдают на входе. Дальше я без связи. #delay:20s
Наталья не в сети #sys:unknown
{cut_frames:
    ~ act1 = "adjourned_cut"
- else:
    ~ act1 = "adjourned"
}
Жалобу удовлетворили. #from:unknown #delay:30m
Судья вернул дело в полицию.
Остапа вызвали на допрос. #delay:30s
{cut_frames:
    Полиция спросила, почему в записи нет кусков. #delay:1m
    Оригинал нашли на карте. Оле придётся объяснять и это.
}
меня вызвали давать показания #from:ellie #delay:5m
про дениса
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
Оля не в сети #sys:ellie
дело открыли заново #from:ellie #delay:30m
меня допросят. остапа тоже
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
    если начну про дениса, остановиться уже не выйдет
* [#remind:2m] тут ступенек двенадцать. я их считаю #from:ellie
    -> ask
* [#noanswer:1m]
    ладно. захожу #from:ellie
- Оля не в сети #sys:ellie
судья посмотрел файлы #from:ellie #delay:30m
жалобу удовлетворили
меня вызовут в полицию. скажу про дениса и про ту ночь
дело открыли заново. файлы забрала полиция #delay:30s
спасибо. правда
-> ch5_maya

=== end_ellie_hides ===
~ act1 = "ellie_hides"
я удалила файлы #from:ellie #delay:5m
у тебя есть копия. делай что хочешь
только без моего имени
иду туда без них. телефоны сдают на входе #delay:20s
Оля не в сети #sys:ellie
жалобу отклонили. несчастный случай #from:ellie #delay:30m
про дениса никто даже не спросил
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
Оля не в сети #sys:ellie
жалобу отклонили. несчастный случай #from:ellie #delay:30m
он прислал мне кадр. со мной #delay:1m
почему у остапа мои файлы? #delay:20s
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
    костя пошёл в полицию сам #from:ellie #delay:5m
    без записи ему никто не верит
}
-> ch5_maya

=== end_silence ===
// после «не ответил» у развилки главы игрок уже ждал 24 минуты
иду сама. телефон сдаю на входе #from:ellie #delay:{c5_waited:20s|5m}
~ c5_waited = false
Оля не в сети #sys:ellie
{ellie_trust >= 3:
    ~ act1 = "ellie_alone_truth"
    я ходила с файлами #from:ellie #delay:30m
    дело открыли заново
    остапа вызвали на допрос. меня тоже
- else:
    ~ act1 = "ellie_alone_owen"
    я отдала карту остапу #from:ellie #delay:30m
    он ждал у входа. сказал: карту — и про меня никто ничего не узнает
    от тебя ни слова. а он стоял в двух шагах
    жалобу отклонили. несчастный случай #delay:30s
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
Денис Кравец был моим братом. Ему было 15. #delay:20s
* [Кто ты? #to:maya]
    ~ maya_trust += 1
    Майя. Старшая сестра. #from:maya #delay:1m
    #rename:maya, Майя Кравец
* [Кто дал тебе этот номер? #to:maya]
    {cover == "honest":Из того поста. Его видел весь посёлок.|Из того поста про опрос. Его видел весь посёлок.} #from:maya #delay:1m
    Я Майя, его сестра.
    #rename:maya, Майя Кравец
* [#noanswer:3m]
    Я Майя, его сестра. Можно не отвечать. #from:maya
    #rename:maya, Майя Кравец
- Я в студии, сессия. Выйду и расскажу по порядку. #from:maya #delay:20s
На той записи не все, кто стоял наверху.
Майя не в сети #sys:maya
-> ch6
