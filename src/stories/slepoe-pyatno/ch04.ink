// ============ ГЛАВА 4 · 01:42 ============
=== ch4 ===
#delay:25m
Глава 4 · 01:42 #sys:argus #chapter
{rotate_full:
    -> ch4_locked
}
[audit] github: ci-бот создал workflow в infra-репо #from:argus #delay:3s
01:42 UTC. коммит в master
автор коммита: рид #delay:4s
#delay:6s
РИД. это твой коммит #from:lead #delay:3s
ты что-то пушил ночью? #delay:3s
я спал #from:devops #delay:30s
Я СПАЛ
последний раз я коммитил туда три дня назад #delay:3s

* [автор в гите это просто текст. проверь подпись коммита #to:lead]
    ~ skill += 1
    ~ trust_lead += 1
    не подписан #from:lead #delay:5s
    у рида все подписаны. у этого нет
    он взял имя последнего, кто коммитил. изучал историю репо #delay:3s
    -> ch4_oidc
* [рид, коммит под твоим именем. объясни #to:devops]
    ~ blamed_rid = true
    ~ trust_lead -= 1
    ты серьёзно #from:devops #delay:6s
    я тебе помогал пайплайны держать
    -> ch4_oidc
* [промолчать #to:devops #silent]
    молчишь. отлично #from:devops #delay:20s
    -> ch4_oidc

=== ch4_oidc ===
#delay:6s
разбираю workflow #from:sec #delay:3s
он хотел ключи от aws через oidc #delay:3s
это как пропуск, который действует только внутри одного запуска
вынести наружу нельзя. он минут двадцать пытался #delay:4s
потом понял и сменил тактику
роль деплоя умеет менять права iam #delay:3s
и выдал права админа старой учётке интеграции метрик metrics-integration
временный пропуск стал постоянным ключом #delay:4s

* [почему роль деплоя доверяет любому коду из репо? #to:sec]
    ~ skill += 1
    ~ trust_sec += 1
    потому что trust policy широкая #from:sec #delay:4s
    должна пускать только защищённую ветку с ревью
* [почему интеграция метрик ходит с вечными ключами? #to:sec]
    ~ skill += 1
    ~ trust_sec += 1
    исторически #from:sec #delay:4s
    пользователь = вечные ключи. роль = пропуск на время
* [понятно. отзываем всё подряд #to:sec]
    подряд нельзя. по порядку #from:sec #delay:4s

- -> ch4_node

=== ch4_node ===
#delay:3m
[ssm] сессия на ноде gx-7-node-04 #from:argus #delay:3s
[k8s] math-svc рестарт 1/6 #delay:20s
[k8s] math-svc рестарт 2/6
#delay:4s
он на ноде через ssm. без ssh, через консоль aws #from:devops #delay:3s
и перезапускает математику по одному #delay:3s
мы же пересобрали образы без отладчика!
он включает отладчик на уровне ноды. мимо образа #delay:3s
{note_defense:
    он ЗНАЛ что мы сделали #from:sec #delay:3s
    это было в твоих заметках
}
[k8s] math-svc рестарт 4/6 #from:argus #delay:30s
{shift_alert:
    [S1] повтор шифта: 31 игрок на одной строке. 02:24 #delay:5s
    алерт итана сработал. через минуты, не часы #from:lead #delay:3s
- else:
    #delay:8m
    Это снова Кронбет. Снова «Лунный экспресс». #from:partner #delay:3s
    Второй раз за осень. Вы шутите? #delay:3s
    партнёр опять увидел первым #from:lead #delay:4s
}
#delay:4s
-> ch4_fake

=== ch4_fake ===
#delay:5s
это рид. телефон сдох, пишу с жениного #from:fake #unlock:fake #delay:3s
меня выкинуло из всего. нужен код из аварийного доступа в облако
он у тебя в почте был, скинь сюда. горит #delay:3s

* [держи, сейчас найду #to:fake]
    ~ phished = true
    ~ leaked += 1
    #delay:30s
    код из письма «break-glass» #me:fake
    спасибо #from:fake #delay:4s
    #delay:20s
    кто сейчас зашёл аварийным доступом??? #from:sec #delay:3s
    это был не рид. рид сидит в нашем чате #delay:3s
    код больше никому. никогда. ни в каком чате
    -> ch4_fake_after
* [рид, это ты пишешь с другого номера? #to:devops #label:Проверить у настоящего Рида]
    ~ checked_fake = true
    ~ skill += 2
    ~ trust_sec += 1
    что? нет. я тут, мой телефон живой #from:devops #delay:4s
    НЕ ОТПРАВЛЯЙ ему ничего #delay:3s
    перепроверить по другому каналу — правильно #from:sec #delay:4s
    он знает имена, знает про жену рида из соцсетей. и давит на «горит»
    -> ch4_fake_after
* [промолчать #to:fake #silent]
    ты тут? срочно же #from:fake #delay:40s
    ну?
    -> ch4_fake_after

=== ch4_fake_after ===
#delay:4s
у нас пять минут на первый ход. что первым? #from:sec #delay:3s
-> ch4_moves

=== ch4_moves ===
* [заморозить игры и снять их у оператора #to:lead #label:Сначала остановить деньги]
    ~ moves += 1
    {moves == 1:
        ~ first_move = "games"
        ~ skill += 1
    }
    делаю. игры сняты #from:lead #delay:5s
    подменять больше нечего #delay:3s
* [отозвать токен ci-бота #to:devops #label:Закрыть вход в гитхаб]
    ~ moves += 1
    {moves == 1:
        ~ first_move = "token"
    }
    отозвал. пайплайны легли #from:devops #delay:5s
    но он уже не в гитхабе. он на ноде #delay:3s
* [выключить ключи metrics-integration #to:sec #label:Закрыть вход в облако]
    ~ moves += 1
    {moves == 1:
        ~ first_move = "iam"
    }
    ключи выключены, политика админа снята #from:sec #delay:5s
    проверяю, не создал ли он других #delay:3s
- {moves < 3:
    #delay:5s
    дальше? #from:sec #delay:2s
    -> ch4_moves
}
-> ch4_after

=== ch4_after ===
#delay:6s
{first_move == "games":
    первым делом остановили деньги. правильно #from:sec #delay:3s
- else:
    пока закрывали двери, он ещё крутил шифты #from:sec #delay:3s
    {shift_alert:
        сорок минут вместо пяти
    - else:
        и партнёр ещё полтора часа считал выигрыши
    }
}
теперь нода. на ней его бэкдор. наверняка #delay:3s
-> ch4_cleanup

=== ch4_cleanup ===
могу вычистить её за час #from:devops #delay:4s
найду его файлы, удалю, перезапущу

* [не чистить. заменить все ноды кластера #to:devops]
    ~ replace_nodes = true
    ~ skill += 1
    все?? #from:devops #delay:5s
    {trust_lead >= 2:
        все. я подписываю. рид, пересобирай #from:lead #delay:4s
    - else:
        нельзя. через ssm он мог поменять что угодно #from:sec #delay:4s
        systemd, kubelet, рантайм. такую ноду не лечат
    }
* [да, вычисти. быстрее будет #to:devops]
    ок, к четырём закончу #from:devops #delay:4s

- #delay:6s
и последнее #from:sec #delay:3s
два часа он был админом в нашем aws
cloudtrail — журнал всех действий в aws
смотрим только то, что уже знаем, или целиком?

* [целиком. с момента выдачи прав #to:sec]
    ~ cloudtrail = true
    ~ skill += 1
    ~ trust_sec += 1
    #delay:10m
    нашла #from:sec #delay:3s
    второй ключ доступа. на другом пользователе. создан в 01:58
    и роль с доверием на внешний аккаунт #delay:3s
    оба удалены. без полного разбора мы бы их не нашли
* [по известному. и так ясно #to:sec]
    ок. ключи интеграции, нода, токен #from:sec #delay:4s

- -> ch5

=== ch4_locked ===
[audit] github: вход ci-ботом. 401 bad credentials #from:argus #delay:3s
01:42 UTC #delay:3s
[audit] github: вход ci-ботом. 401 #delay:20s
[audit] github: вход ci-ботом. 401 #delay:20s
#delay:5s
он пришёл #from:sec #delay:3s
в ту же минуту, что и в прошлый раз. и стучит в закрытую дверь #delay:3s
#delay:5s
Чисто сделано. #from:ghost #delay:3s
Но я терпеливый.
#delay:5s
итан, что по аудиту гитхаба? #from:sec #delay:3s
он склонировал репо математики ещё в августе #from:intern #delay:4s
вот откуда шифты #delay:3s

* [значит меняем таблицы шифтов, они скомпрометированы #to:sec]
    ~ skill += 1
    ~ trust_sec += 1
    да. и кто имел доступ к этим репо #from:sec #delay:4s
* [дверь закрыта, всё, мы победили #to:sec]
    дверь закрыта #from:sec #delay:4s
    то, что он унёс, всё ещё у него

- #delay:5s
и на всякий случай ищем другие двери #from:sec #delay:3s
порт отладчика запрещаем политикой кластера, не только образом #delay:3s
~ replace_nodes = true
~ cloudtrail = true
-> ch5

