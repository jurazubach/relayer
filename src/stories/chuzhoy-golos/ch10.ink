// ============ ГЛАВА 10 ============


// намеренно: C-47 заголовок главы по плану §1 — день недели и время мира
// намеренно: C-51 «На счёт три» — название главы из плана, не улика в реплике
=== ch10 ===
Воскресенье, до рассвета · На счёт три #sys:jess #chapter #delay:5h
~ sync_world()
{jess_promised:
    я на лодочной. на воду так и не вышла #from:jess
- else:
    я на лодочной. к тёте наташе в полшестого, а я тут #from:jess
}
одна. ещё темно #delay:20s
достала из шкафчика её телефон. он в её чехле для гребли #delay:30s
{jess_promised:я обещала сказать вам всё. я помню|четыре месяца он лежал там. под моей формой} #delay:30s
- (ask)
* [Что ты будешь с ним делать? #to:jess]
    ~ c10_asked_phone = true
    не знаю. держу двумя руками, как будто уроню #from:jess #delay:40s
* [Я тут #to:jess]
    ~ jess_bond += 1
    хорошо. хорошо что тут #from:jess #delay:40s
* [#remind:5m] у него треснул угол экрана. я раньше не замечала
    -> ask
* [#noanswer]
    ладно. я всё равно скажу. так проще #from:jess #delay:40s
- сижу в лодке у мостков. считаю: раз, два. дальше не получается #from:jess #delay:40s
{jess_confessed == 0: -> ch10_denny}
-> ch10_split

// намеренно: C-35 признание про Дена — туннель гл. 9, исповедь кнопкой не перебивают (PAT-02#нюанс)
=== ch10_denny ===
~ c10_dawn = true
раз все и так смотрят на меня. сначала про дена #from:jess #delay:30s
-> ch9_denny ->
~ jess_confessed = 1
* [Спасибо, что сказала #to:jess]
    ~ jess_bond += 1
    не надо спасибо. правда не надо #from:jess #delay:40s
* [Почему ты молчала два года? #to:jess]
    ~ c10_pressed = true
    остап сказал, что меня посадят. мне было пятнадцать. я поверила #from:jess #delay:40s
* [#noanswer:3m]
    это первый раз, когда я сказала вслух #from:jess #delay:40s
- -> ch10_split

=== ch10_split ===
{jess_promised || jess_bond >= 2 || (clue_bill && owen_turned): -> ch10_full}
-> ch10_deny

// намеренно: C-51 «на тропе» говорит сама Ника — это её признание, а не знание игрока
=== ch10_full ===
~ jess_confessed = 2
в 00:55 лиля написала мне: «я слышала тебя на записи. в час на уступе» #from:jess #delay:40s
я пришла на верхнюю тропу. внизу остап держал её за запястье. она упала в воду #delay:50s
он прошёл мимо меня. сказал: ты ничего не видела. как тогда #delay:30s
* [Ты видела, как она упала? #to:jess]
    видела. и как она выплыла тоже #from:jess #delay:40s
* [Почему ты не ушла? #to:jess]
    ~ c10_pressed = true
    я ушла. до поворота. потом вернулась. не знаю зачем #from:jess #delay:40s
* [#noanswer:3m]
    дальше. если остановлюсь, уже не скажу #from:jess #delay:40s
- она выплыла. она всегда выплывает #from:jess #delay:30s
в 01:19 позвонила мне. от старой лестницы #delay:20s
сказала: завтра полиция. про него. и про тебя #delay:50s
* [И ты спустилась #to:jess]
    спустилась. там бетонная плита над водой. скользкая #from:jess #delay:40s
* [Ты могла позвонить 103 #to:jess]
    ~ c10_pressed = true
    могла. я испугалась. я всегда убегаю #from:jess #delay:40s
* [#noanswer:3m]
    я спустилась к ней. на плиту #from:jess #delay:40s
- я взяла её за руку. хотела сказать: подожди #from:jess #delay:40s
она выдернула руку. там мокро #delay:20s
она упала. её не было видно #delay:40s
я не позвонила. никому #delay:40s
{c10_asked_phone:вы спрашивали, что я с ним сделаю. отдать тёте наташе? или с причала|её телефон у меня. отдать тёте наташе? или с причала} #delay:40s
- (ask)
* [Возьми телефон. Отдай Наталье #to:jess]
    ~ jess_bond += 1
    возьму. в её чехле #from:jess #delay:40s
    в 01:40 он загорелся у меня в кармане. «оля: прости» #delay:40s
* [Промолчать #to:jess #silent]
    ~ jess_bond -= 1
    вы теперь меня ненавидите. я понимаю #from:jess #delay:1m
* [#remind:5m] у мостков плещет. как тогда. я сижу и не могу встать
    -> ask
* [#noanswer]
    ладно. я сама решу, что с ним делать #from:jess #delay:40s
- -> ch10_judith

=== ch10_deny ===
про лилю не спрашивайте #from:jess #delay:40s
она звонила, да. я не пошла. я была дома, в кровати!! #delay:40s
{c10_asked_phone:вы спросили, что я с ним сделаю. отдам тёте наташе. и всё|а телефон отдам тёте наташе. и всё} #delay:30s
* [Тогда скажи это Наталье #to:jess]
    скажу. этими словами #from:jess #delay:40s
* [Как её телефон оказался у тебя? #to:jess]
    ~ c10_pressed = true
    я была дома!! хватит, пожалуйста #from:jess #delay:40s
* [#noanswer:3m]
    мне пора. надо ещё дойти #from:jess #delay:40s
- -> ch10_judith

=== ch10_judith ===
Я не спала. Пеку пирог. Не знаю, зачем. #from:judith #delay:1m
С вишней. Она его любит. #delay:20s
В половине шестого придёт Вероника. #delay:30s
Она приходит каждую субботу. С июня не пропустила ни одной. #delay:30s
Я поставила на стол три чашки. По привычке. #delay:30s
{owen_turned:
    Ночью звонил Остап Бондарь. Сказал, что видел её на тропе. Я положила трубку. #delay:40s
}
Я не знаю, что ей сказать. Если Вы знаете — скажите мне. #delay:40s
Если оставите это мне, я спрошу её сама. Не дожидаясь Вас. #delay:10s
- (ask)
* [Не говорите ей ничего, пока я не напишу #to:judith #label:Попросить Наталью подождать]
    ~ judith_promised = true
    Хорошо. Я жду Вас. #from:judith #delay:40s
* [Это Ваш дом и Ваша дочь. Решайте сами #to:judith #label:Оставить решение Наталье]
    ~ judith_waits = false
    Я не умею решать такие вещи. Но попробую. #from:judith #delay:40s
* [Промолчать #to:judith #silent]
    Я подожду Вас. Пирог как раз успеет. #from:judith #delay:40s
* [#remind:5m] Пирог в духовке. Я сижу у окна, отсюда видно калитку.
    -> ask
* [#noanswer]
    Я подожду Вас. #from:judith #delay:40s
    С уважением, Н. Марченко. #delay:10s
- -> ch10_maya

=== ch10_maya ===
{maya_target != "jess": -> ch10_owen}
Я у лодочной. В машине. #from:maya #delay:1m
Она только что вышла с мостков. С чем-то в руке. #delay:30s
В пять выкладываю {clue_whisper:запись|всё, что знаю}. С её именем. #delay:30s
{
- maya_trust >= 3:
    Скажи одно слово — подожду. #delay:30s
- maya_trust >= 0:
    Обещаний мне мало. Если она тебе что-то сказала — скажи. #delay:30s
- else:
    Не трать время на уговоры. Но ответь. #delay:30s
}
- (ask)
* [Делай, что считаешь нужным #to:maya]
    ~ maya_go = true
    ~ maya_post = 2
    Делаю. #from:maya #delay:40s
    -> ch10_tom
* [Промолчать #to:maya #silent]
    -> ch10_anon
* {jess_confessed != 2} [Подожди. В полшестого она идёт к Наталье. Сама #to:maya #label:Попросить Майю подождать]
    -> ch10_wait
* {jess_confessed == 2} [Подожди. Она мне всё рассказала #to:maya]
    -> ch10_wait
* [#remind:5m] У неё в руке телефон в чехле. Как у гребцов.
    -> ask
* [#remind:5m] Дорожка чистая. Подпись написана. Сижу в машине.
    -> ask
* [#noanswer]
    -> ch10_anon

=== ch10_wait ===
{maya_trust >= 3 || (jess_confessed == 2 && maya_trust >= 0):
    ~ maya_stopped = true
    До шести. Потом — сама. #from:maya #delay:40s
    -> ch10_owen
}
~ maya_post = 2
Сама она два года не шла. #from:maya #delay:40s
-> ch10_tom

=== ch10_anon ===
~ maya_post = 1
Тогда без имени. #from:maya #delay:1m
{clue_whisper:Только голос. Пусть посёлок сам слушает.|Только про уступ. Пусть посёлок сам вспоминает.} #delay:30s
-> ch10_tom

=== ch10_tom ===
{tom_hold && not maya_go:
    ~ maya_post = 0
    ~ maya_at_door = true
    пост майи пришёл в очередь. я его не пропустил, как обещал. #from:tom #delay:1m
    Твой админ не пропустил. Ладно. #from:maya #delay:40s
    Еду к дому Марченко. Посмотрю сама. #delay:30s
    -> ch10_owen
}
{tom_hold:
    пост майи я в чат не пропустил. она выложила его у себя, и его уже переслали все. #from:tom #delay:1m
- else:
    пост майи вышел. держать я не стал. #from:tom #delay:1m
}
{
- maya_post == 2 && clue_whisper:
    Пост Майи Кравец: дорожка с уступа и подпись «Это голос Ники Гаврилюк» #photo:ch10-maya-voice #from:maya #delay:30s
- maya_post == 2:
    Пост Майи Кравец: «Ника Гаврилюк стояла наверху, когда погиб мой брат» #photo:ch10-maya-jess #from:maya #delay:30s
- clue_whisper:
    Пост Майи Кравец: дорожка с уступа и подпись «Кто считает до трёх?» #photo:ch10-maya-count #from:maya #delay:30s
- else:
    Пост Майи Кравец: «Два года назад наверху стоял не один человек» #photo:ch10-maya-many #from:maya #delay:30s
}
{maya_post == 2 && maya_files == 2 && not cut_frames:
    кадр с краю. там видно меня. опять #from:ellie #delay:40s
}
-> ch10_owen

=== ch10_owen ===
{owen_turned:
    Еду в полицию. Сам. Скажу про неё и про себя. #from:owen #delay:1m
    {owen_deal:
        Про лестницу — как договорились 🙏 #delay:30s
    }
- else:
    Сегодня всё решится 🙂 #from:owen #delay:1m
    {world == "open":
        В десять я скажу им, чей голос на записи. Оле будет непросто 🙂 #delay:30s
    }
    {hart_fooled && owen_knows >= 2:
        И не вмешивайся. Я знаю, как тебя зовут 🙂 #delay:30s
    }
}
* {not owen_turned && clue_ladder} [Лиля выплыла. Ты её не убивал. Скажи им про Нику #to:owen #label:Сказать Остапу про лестницу]
    ~ owen_turned = true
    ~ note_ladder = true
    Она выплыла. #from:owen #delay:1m
    Тогда на тропе стояла Ника. Я прошёл мимо неё. #delay:40s
    ~ clue_owen_saw = true
    Ладно. Скажу. Про неё и про себя 🙏 #delay:30s
* [Скажи им правду. Всю #to:owen]
    {owen_turned:Скажу. Всю.|Правду 🙂 Чью именно?} #from:owen #delay:40s
* [Промолчать #to:owen #silent]
* [#noanswer:3m]
- -> ch10_ellie

=== ch10_ellie ===
не сплю #from:ellie #delay:1m
в восемь иду в полицию{world == "open": к следователю|. сама} #delay:30s
{ellie_block_told:сказать им про блок или только то, что спросят|сказать всё или только то, что спросят} #delay:30s
- (ask)
* [Скажи. Всё #to:ellie]
    ~ ellie_testifies = true
    ок. всё #from:ellie #delay:40s
    мама сказала, пойдёт со мной #delay:30s
* [Это только твоё. Можешь не говорить #to:ellie]
    ~ ellie_testifies = false
    ок #from:ellie #delay:40s
    спасибо. прости #delay:20s
* [#remind:5m] мама уже встала. гремит чайником
    -> ask
* [#remind:5m] надела ту куртку. первый раз с июня
    -> ask
* [#noanswer]
    ~ ellie_testifies = ellie_block_told
    ладно. решу у двери #from:ellie #delay:40s
- -> ch10_door

// reveal: clue_bill, clue_ladder, clue_owen_saw
// намеренно: C-16 исход решает кнопка у двери (план §4), «Это был Остап» всегда ведёт к Остапу
=== ch10_door ===
~ proof = 0
{clue_bill:
    ~ proof += 1
}
{note_ladder:
    ~ proof += 1
}
{owen_turned:
    ~ proof += 1
}
{fake_note_caught:
    ~ proof += 1
}
{jess_confessed == 2:
    ~ proof += 2
}
{
- maya_post == 2:
    у калитки двое с телефонами. все видели пост #from:jess #delay:1m
    я всё равно у двери #delay:20s
- maya_post == 1:
    я у двери. пост без имени, но все слушают голос. я тоже слушала #from:jess #delay:1m
- else:
    я у двери #from:jess #delay:1m
}
{jess_confessed == 2:
    {jess_bond >= 2:если вы скажете «сама» — я смогу|не знаю, кому из вас я сейчас верю} #delay:20s
- else:
    если скажете «сама» — я опять скажу, что была дома #delay:10s
}
{c10_pressed:тётя наташа спросит то же, что вы. считаю до трёх. раз|считаю до трёх. раз} #delay:20s
{clue_ladder:
    лестница. 01:15. скажу если чё #from:connor #delay:30s
}
Она у двери. Я вижу её в окно. #from:judith #delay:40s
{clue_bill:Распечатка у меня на столе. В 01:19 Лилия звонила ей.|Конверт с распечаткой за июнь так и лежит нераспечатанный.} #delay:20s
{
- owen_turned:
    Остап Бондарь скажет, что видел её на тропе. #delay:20s
- clue_owen_saw:
    Остап Бондарь видел её на тропе. Но говорить он не станет. #delay:20s
- else:
    Остап Бондарь молчит. #delay:20s
}
{fake_note_caught:Записку про Остапа писала не Лилия.|Чья записка про Остапа — я не знаю.} #delay:20s
{proof >= 3:С этим полиция её выслушает.|Этого мало. Нужно, чтобы она сказала сама.} #delay:30s
{maya_at_door:
    Я у дома Марченко. Вижу её у двери. #from:maya #delay:30s
}
- (ask)
* [Это был Остап. Записка — правда #to:judith #label:Сказать Наталье, что это Остап]
    ~ final_choice = "owen"
* [Откройте. И вот всё, что у меня есть #to:judith #label:Отдать Наталье всю правду]
    ~ final_choice = "truth"
* [Промолчать #to:jess #silent]
    ~ final_choice = "silent"
* [Скажи ей сама. Сейчас #to:jess #label:Дать Нике сказать самой]
    ~ final_choice = "mercy"
* [#remind:8m] два
    -> ask
* [#remind:8m] Она подняла руку к звонку. И опустила.
    -> ask
* [#noanswer]
    ~ final_choice = "silent"
- -> ch10_route

=== ch10_route ===
{
- final_choice == "owen": -> fin_scapegoat
- final_choice == "truth" && proof >= 3: -> fin_truth
- final_choice == "truth" && maya_post == 2: -> fin_revenge
- final_choice == "truth": -> fin_unproven
- final_choice == "mercy" && jess_confessed == 2 && jess_bond >= 2: -> fin_herself
- final_choice == "mercy" && jess_confessed != 2 && maya_post == 2: -> fin_revenge
- final_choice == "mercy": -> fin_unproven
- judith_waits: -> fin_silence
- jess_confessed == 2 && jess_bond >= 2: -> fin_herself
- else: -> fin_unproven
}

// ============ ФИНАЛЫ ============

// финал: truth
=== fin_truth ===
~ ending = "truth"
Открываю. #from:judith #delay:1m
{jess_confessed == 2:
    Она рассказала всё. Сама положила на стол телефон Лилии. #delay:40s
- else:
    Я показала ей распечатку. Она долго молчала. Потом рассказала. #delay:40s
}
Я сама позвонила в полицию. #delay:30s
она открыла сразу. я даже не досчитала #from:jess #delay:30s
* [Ты постучала #to:jess]
    на счёт три #from:jess #delay:30s
* [Как ты? #to:jess]
    не знаю. сижу у неё на кухне. пахнет пирогом #from:jess #delay:30s
* [#noanswer:3m]
- Лилия выплыла после Остапа. Поднялась по старой лестнице и позвонила ей. #from:judith #delay:15s
На плите Вероника взяла её за руку. Лилия вырвалась и упала. #delay:15s
Я отдам им всё: {clue_bill:звонок в 01:19|Ваши скрины}{note_ladder:, свет на лестнице в 01:15|}. #delay:15s
{owen_turned || fake_note_caught:
    {owen_turned:Остап скажет про тропу. |}{fake_note_caught:Записку писала не Лилия.|} #delay:10s
}
{maya_post >= 1:
    Пост Майи я видела. Полиции он не помог и не помешал. #delay:10s
}
тётя наташа прислала мне скрины с её телефона #from:ellie #delay:30s
-> fin_lily_screens ->
* [Она тебя ждала #to:ellie]
    знаю. теперь знаю #from:ellie #delay:15s
* [Ты не виновата в этом #to:ellie]
    виновата. но не в этом #from:ellie #delay:15s
* [#noanswer:3m]
- Три недели спустя #sys:judith #delay:5s
Веронике — убийство по неосторожности. Ей семнадцать, судить будут как несовершеннолетнюю. #from:judith #delay:10s
Остапу Бондарю — воспрепятствование правосудию и нападение{note_threat:. И запугивание: Ваш скрин пригодился|}. #delay:10s
Производство по гибели Дениса Кравца возобновили. #delay:10s
{cover == "honest":Вы с первого дня были честны. Но кто Вы — я так и не знаю.|Вы так и не сказали, кто Вы.} #delay:10s
-> fin_coda ->
{ellie_trust >= 2:
    Оля В. перевела вам 200,00 ₴ · «последний час. спасибо ❤️» #from:bank #delay:10s
}
Конец #sys:judith
-> END

// финал: herself
=== fin_herself ===
~ ending = "herself"
раз #from:jess #delay:40s
два #delay:5s
три #delay:20s
она открыла #delay:40s
Мы на кухне. Пирог остыл. Её телефон лежит между нами, в чехле. #from:judith #delay:1m
Она рассказала всё. Сама. Я не задала ни одного вопроса. #delay:30s
{judith_promised:
    Вы обещали написать. Не понадобилось. #delay:20s
}
Сейчас я позвоню в полицию. Она ждёт со мной. #delay:30s
* [Скажите ей, что я рядом #to:judith]
    Сказала. Она кивнула. #from:judith #delay:20s
* [Вы её простите? #to:judith]
    Не сегодня. Но я её выслушала. #from:judith #delay:20s
* [#noanswer:3m]
- тётя наташа позвала меня. впервые с июня #from:ellie #delay:15s
-> fin_lily_screens ->
Три недели спустя #sys:judith #delay:5s
Веронике предъявили обвинение. Суд учтёт, что она пришла сама. #from:judith #delay:10s
Остапу Бондарю — воспрепятствование правосудию{hart_exposed:. И то, что выдавал себя за полицейского|}. #delay:10s
Производство по гибели Дениса Кравца возобновили. #delay:10s
-> fin_coda ->
я досчитала #from:jess #delay:10s
Конец #sys:judith
-> END

// финал: unproven
=== fin_unproven ===
~ ending = "unproven"
{
- final_choice == "truth":
    Открываю. Я показала ей распечатку. #from:judith #delay:1m
    Она сказала: «она позвонила. я не пошла». И ушла. #delay:30s
    Звонок на четырнадцать секунд. У неё адвокат. «Недостаточно для обвинения». #delay:40s
- final_choice == "mercy":
    я не могу #from:jess #delay:1m
    простите #delay:30s
    Она постояла у двери и ушла. #from:judith #delay:40s
    её телефон — с причала. его больше нет #from:jess #delay:40s
- else:
    Я спросила её сама. #from:judith #delay:1m
    Она сказала, что в ту ночь спала. И ушла. #delay:30s
}
{maya_post >= 1:
    Пост {maya_post == 2:с её именем|без имени} у всех. Я знаю, кто. И она знает, что я знаю. Этого мало. #from:maya #delay:40s
}
* [Вы сделали всё, что могли #to:judith]
    Не всё. Но больше я сама не смогу. #from:judith #delay:20s
* [Это ещё не конец #to:judith]
    Для полиции — конец. Для меня — нет. #from:judith #delay:20s
* [#noanswer:3m]
- {ellie_testifies:я сказала им про блок. сама. легче не стало. но стало честно|про блок я так никому и не сказала. теперь это моё} #from:ellie #delay:15s
Три недели спустя #sys:judith #delay:5s
Вероника больше не приходит по субботам. #from:judith #delay:10s
{final_choice != "mercy":
    остап столкнул её. она выплыла и позвонила мне #from:jess #delay:10s
    на плите я держала её за руку. она вырвалась. вы ведь это хотели знать #delay:10s
}
-> fin_coda ->
Сегодня я отключила её номер. #from:judith #delay:10s
Конец #sys:judith
-> END

// финал: scapegoat
=== fin_scapegoat ===
~ ending = "scapegoat"
Значит, Остап. Я отнесу записку в полицию. #from:judith #delay:1m
Вероника пришла за вещами Лилии. Я отдала. #delay:40s
почему #from:jess #delay:40s
спасибо #delay:30s
{
- fake_note_caught || jess_confessed == 2:
    {owen_deal:Мы договаривались. |}Я её не убивал. Ты знаешь. #from:owen #delay:40s
- else:
    Я её не убивал. Мне всё равно никто не поверит 🙂 #from:owen #delay:40s
}
* [Тогда кто? #to:owen]
    {fake_note_caught || jess_confessed == 2:Ты знаешь.|Спроси ту, что считает до трёх 🙂} #from:owen #delay:20s
* [Суд разберётся #to:owen]
    Суд уже разобрался. Без меня 🙂 #from:owen #delay:20s
* [#noanswer:3m]
- Пять месяцев спустя #sys:judith #delay:5s
Остапа Бондаря осудили за смерть Лилии. Голос на записи «не установлен». #from:judith #delay:10s
-> fin_ellie_owen ->
{
- fake_note_caught || jess_confessed == 2:
    она выплыла после него. я держала её за руку. я больше не считаю #from:jess #delay:10s
- clue_whisper:
    Досмотрела видео гонок. Рулевая считает до трёх. Тот же счёт. #from:maya #delay:10s
    Записку полиция получила от тебя. #delay:10s
- else:
    остап передал. на тропе была ника. ему не поверили #from:connor #delay:10s
}
-> fin_coda ->
В ночь, когда его арестовали, я впервые с июня спала. #from:judith #delay:10s
{ellie_trust >= 2:
    Оля В. перевела вам 200,00 ₴ · «спасибо ❤️» #from:bank #delay:10s
}
Конец #sys:judith
-> END

// финал: revenge
=== fin_revenge ===
~ ending = "revenge"
{final_choice == "truth":
    Я открыла. {clue_bill:Сказала ей про звонок в 01:19.|Сказала, что всё знаю.} #from:judith #delay:1m
    Она обернулась на калитку. Там люди с телефонами. #delay:30s
- else:
    вы сказали «сама». я правда хотела #from:jess #delay:1m
    у калитки люди с телефонами. я не могу стучать #delay:30s
}
они снимают. я ухожу #from:jess #delay:30s
её телефон — с причала #delay:30s
* [Ника, вернись #to:jess]
    поздно. я держала её за руку. на плите. она вырвалась #from:jess #delay:20s
* [Не смотри на них #to:jess]
    я не смотрю. я их слышу #from:jess #delay:20s
* [#noanswer:3m]
- {clue_whisper && maya_files == 2 && not cut_frames:там и я. опять. мама увозит меня к тёте|у дома гаврилюков человек тридцать. снимают} #from:ellie #delay:15s
Три недели спустя #sys:maya #delay:5s
Гаврилюки уехали ночью. #from:maya #delay:10s
Дело остановили: пост «скомпрометировал доказательства». #delay:10s
Бондарю — обвинение. По Дену. Мне — предупреждение за травлю. #delay:10s
-> fin_coda ->
Все знают. Ничего не изменилось. #from:maya #delay:10s
Конец #sys:maya
-> END

// финал: silence
// намеренно: C-43 последняя реплика Ники зеркалит первое сообщение игрока (план §3), ответа не ждёт
=== fin_silence ===
~ ending = "silence"
Она на кухне. Я режу пирог. #from:judith #delay:30s
Она ушла. Я ничего не сказала. #delay:40s
{judith_promised:Вы обещали написать.|Я ждала Вашего слова.} #delay:30s
- (ask)
* [Простите #to:judith]
    Вам не за что. Вы ведь ничего не сделали. #from:judith #delay:20s
* [Она ещё придёт #to:judith]
    Придёт. В субботу. Как всегда. #from:judith #delay:20s
* [#remind:2m] Её чашка так и стоит на столе. Я не убрала. #from:judith
    -> ask
* [#noanswer:1m]
- {maya_stopped:До шести, как договаривались. Дальше — без тебя.|Ладно. Спасибо за запись.} #from:maya #delay:15s
{maya_post >= 1:
    Пост уже у всех. #delay:10s
}
Три недели спустя #sys:judith #delay:5s
Вероника приходит по субботам. Я открываю. Не знаю, зачем. #from:judith #delay:10s
-> fin_coda ->
{cover == "honest":привет!! вы ещё помогаете знакомым? 🙂|привет!! вы ещё делаете опросы? 🙂} #from:jess #delay:10s
Конец #sys:jess
-> END

=== fin_ellie_ref ===
{
- ellie_reaction == "support":
    «ты была ребёнком» — я это помню #from:ellie #delay:10s
- ellie_reaction == "judge":
    «ты два года врала». это было правдой #from:ellie #delay:10s
- ellie_reaction == "together":
    вместе. как в том сообщении #from:ellie #delay:10s
- else:
    я ту куртку так и не надела. теперь надену #from:ellie #delay:10s
}
->->

=== fin_lily_screens ===
Лиля 💧 → Оля · 00:41 «оля» · 00:43 «не будь дурой» · 00:46 «разблокируй. я не злюсь» · Не доставлено #photo:ch10-lily-ellie #from:ellie #delay:10s
она не злилась #delay:10s
-> fin_ellie_ref ->
->->

=== fin_ellie_owen ===
все извинились. даже мама #from:ellie #delay:10s
{ellie_testifies:про блок я им сказала. записали и забыли. всем был нужен остап|про блок никто не спросил. это осталось у меня} #delay:10s
->->

=== fin_coda ===
{
- ending == "truth" || ending == "herself":
    сказал им про лестницу. и что это я сказал остапу где она #from:connor #delay:10s
- ending == "revenge":
    про лестницу сказал. им всё равно #from:connor #delay:10s
    {tom_hold:её пост я не пропустил. не помогло.|это я нажал «опубликовать». оба раза.} #from:tom #delay:10s
- ending == "unproven":
    про лестницу сказал. им всё равно #from:connor #delay:10s
- else:
    про лестницу так и не сказал. сорян #from:connor #delay:10s
}
{hart_fooled && owen_knows >= 2:
    {
    - ending == "silence" || ending == "unproven":
        Будешь в наших краях — заходи. Я теперь знаю, кого ждать 🙂 #from:owen #delay:10s
    - else:
        Остап рассказал полиции, что знает, кто Вы. Ему сказали, что это не его дело. #from:judith #delay:10s
    }
}
->->
