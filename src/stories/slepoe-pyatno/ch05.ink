// ============ ГЛАВА 5 · РАССВЕТ ============
=== ch5 ===
#delay:15m
Глава 5 · Рассвет #sys:sec #chapter
{phished:
    ~ ending = "phished"
- else:
{leaked >= 1 && note_defense && !rotate_full:
    ~ ending = "complicit"
- else:
    {blamed_rid && !rotate_full:
        ~ ending = "burned"
    - else:
        {rotate_full:
            ~ ending = "locked"
        - else:
            {replace_nodes && cloudtrail && first_move == "games":
                ~ ending = "contained"
            - else:
                {obeyed_manager && !shift_alert:
                    ~ ending = "quiet"
                - else:
                    ~ ending = "backdoor"
                }
            }
        }
    }
}
}
{ending == "phished": -> end_phished}
{ending == "complicit": -> end_complicit}
{ending == "burned": -> end_burned}
{ending == "locked": -> end_locked}
{ending == "contained": -> end_contained}
{ending == "quiet": -> end_quiet}
-> end_backdoor

=== end_locked ===
второй волны не было #from:sec #delay:3s
была попытка. 401. и всё #delay:3s
потому что токен сменили целиком. без «в понедельник» #delay:4s
#delay:5s
пайплайны лежали полдня #from:devops #delay:3s
я ругался. зря ругался
-> debrief

=== end_contained ===
вторая волна: сорок минут до заморозки игр #from:sec #delay:3s
полтора часа до снятия игр у оператора. в сентябре было полночи #delay:3s
ноды новые, лишний ключ и роль нашли и удалили #delay:3s
#delay:5s
это лучшее, что можно было сделать с незамененным токеном #from:lead #delay:3s
а с замененным второй ночи не было бы вовсе
-> debrief

=== end_backdoor ===
закрыли то, что видели #from:sec #delay:3s
{not replace_nodes:
    ноду вычистили. не заменили
}
{not cloudtrail:
    журнал aws смотрели по известному. не целиком
}
#delay:40m
через девять дней #sys:argus
[ssm] сессия на ноде gx-7-node-04 #from:argus #delay:3s
{not cloudtrail:
    ключ доступа: не metrics-integration. другой #delay:3s
}
#delay:4s
он вернулся #from:sec #delay:3s
не через дверь. через то, что мы не вынесли
-> debrief

=== end_burned ===
меня отстранили #from:devops #delay:3s
«коммит от рида в 01:42». этого хватило #delay:4s
#delay:6s
коммит не подписан, а автор в гите — просто текстовое поле #from:sec #delay:3s
я это доказала. через неделю #delay:3s
рид к тому времени уже писал заявление
-> debrief

=== end_quiet ===
Коллеги, спасибо. Партнёрам — «технический сбой». #from:manager #delay:3s
Постмортем закрываем, расследование — силами отдела. #delay:3s
#delay:6s
Тихо — это хорошо. #from:ghost #delay:3s
Мне так удобнее.
-> debrief

=== end_complicit ===
Спасибо за переписку. #from:ghost #delay:3s
И за вики. Особенно за раздел «защита». #delay:4s
#delay:5s
он всегда был на шаг впереди #from:sec #delay:3s
потому что мы сами писали ему, что закрыли и как
-> debrief

=== end_phished ===
по аварийному коду он вошёл как главный админ #from:sec #delay:3s
удалил наши алерты, завёл себе три учётки #delay:3s
мы вычищали его до вечера. не уверена, что всех #delay:4s
#delay:5s
я бы тоже мог отправить #from:devops #delay:3s
он написал «горит». на это все ведутся
-> debrief

=== debrief ===
#delay:8s
Сол. Можешь записать. #from:ghost #delay:3s
#rename:ghost, Сол
#delay:6s
разбор. что рвало цепочку на каждом шаге #from:sec #delay:4s
{not rotate_full:
    1. токен. после компрометации меняется всё. без «на нём пайплайны» #delay:3s
- else:
    1. токен сменили целиком. поэтому он стучал в закрытую дверь #delay:3s
}
2. в процессе не должно быть админских токенов. вообще #delay:3s
3. отладчик в проде запрещает политика кластера, а не образ #delay:3s
4. oidc пускает только защищённую ветку с ревью #delay:3s
5. роль деплоя не трогает iam. интеграции — ролями, не пользователями #delay:3s
6. подписанные коммиты. и никаких обходов для админов #delay:3s
7. ноду после взлома заменяют. не чистят #delay:3s
{shift_alert:
    8. повтор шифта ловится за минуты. у нас теперь ловится #delay:3s
- else:
    8. алерт на повтор шифта. партнёр не должен видеть первым #delay:3s
}
{phished:
    0. срочность и знакомое имя — главные инструменты взлома. проверяй другим каналом #delay:3s
}
{checked_fake:
    0. ты проверил «рида» другим каналом. это спасло больше, чем все алерты #delay:3s
}
{note_defense:
    9. и не пиши, как защищаешься, туда, куда смотрит взломанный токен #delay:3s
}
#delay:5s
{skill >= 10:
    ты держал голову холодной всю ночь. спасибо #from:lead #delay:3s
- else:
    {skill >= 6:
        для первой такой ночи — неплохо #from:lead #delay:3s
    - else:
        запомни эту ночь. такие бывают чаще, чем кажется #from:lead #delay:3s
    }
}
{ending == "locked": Он пришёл в 01:42. Дверь была заперта. #sys:argus}
{ending == "contained": Вторая волна — полтора часа вместо ночи. Следующей не будет. #sys:argus}
{ending == "backdoor": Почистили — не значит заменили. #sys:argus}
{ending == "burned": Автор коммита — просто строка. Её подписали чужим именем. #sys:argus}
{ending == "quiet": Инцидент закрыт. Токен, вики и шифты остались у него. #sys:argus}
{ending == "phished": Самый слабый порт — человек, которому написали «горит». #sys:argus}
{ending == "complicit": Утечка была не в сети. Утечка была в заметках. #sys:argus}
-> END
