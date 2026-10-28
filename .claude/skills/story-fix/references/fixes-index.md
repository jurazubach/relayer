# Указатель ремонтных приёмов: F-NN → файл владельца

`story-fix` приёмов не держит: каждый лежит у скилла-владельца в `references/fixes/F-NN-*.md`
(`docs/playbook/owners.md` §4). Здесь — куда идти, что проверить после и чего приём сам боится сломать.
Шаги, ink «до» и «после» — только в файле владельца: копия здесь разошлась бы с ним при первой правке.

## TH-87 · Указатель ремонтных приёмов

Правка находки идёт так: строка находки называет приём (`правка (F-07)`) → файл владельца из таблицы →
его шаги на узле из находки → его «готово, когда» как условие сдачи → общая страховка
[safety.md](safety.md) поверх «что нельзя сломать» приёма. Если в поле правки нет F-NN, а стоит
«→ <скилл>», приёма у владельца нет: вызови этот скилл (`Skill`) на узле, получи варианты, потом
одобрение ([approval.md](approval.md)).

| ID | приём | владелец | файл | перезамер после | что приём боится сломать |
|---|---|---|---|---|---|
| F-01 | крючок перед паузой | `story-pauses` | [F-01-hook.md](../../story-pauses/references/fixes/F-01-hook.md) | C-26, C-29 | крючок против первой строки после паузы (R-69); новое имя в крючке |
| F-02 | рекап после паузы | `story-pauses` | [F-02-recap.md](../../story-pauses/references/fixes/F-02-recap.md) | C-28 | напоминание невыбранного; новичок первой строкой |
| F-03 | склейка сессий | `story-pauses` | [F-03-merge-sessions.md](../../story-pauses/references/fixes/F-03-merge-sessions.md) | C-30, C-33, `story:sessions` | пауза с причиной в мире; стена без кнопки |
| F-04 | нарезать монолог | `story-opening` | [F-04-split-monologue.md](../../story-opening/references/fixes/F-04-split-monologue.md) | C-20, C-35, C-47 | обязательный факт за необязательной кнопкой |
| F-05 | экспозиция в спор | `story-pace` | [F-05-exposition-to-conflict.md](../../story-pace/references/fixes/F-05-exposition-to-conflict.md) | C-35 | факт, на который ссылаются позже |
| F-06 | хаб вместо коридора | `story-pace` | [F-06-hub.md](../../story-pace/references/fixes/F-06-hub.md) | C-19, C-35 | выход хаба; факт, нужный стволу |
| F-07 | оживить кнопку | `story-choices` | [F-07-live-button.md](../../story-choices/references/fixes/F-07-live-button.md) | C-10, C-11, C-13 | сборка `-` и переходы; род игрока |
| F-08 | эхо и колбэки | `story-choices` | [F-08-echo.md](../../story-choices/references/fixes/F-08-echo.md) | C-01…C-03, `story:vars` | знание персонажа; эхо списком |
| F-09 | показать скрытый порог | `story-endings` | [F-09-threshold.md](../../story-endings/references/fixes/F-09-threshold.md) | C-03, C-40 | тайна: назвать недостающее, а не счёт |
| F-10 | сводка перед финалом | `story-endings` | [F-10-finale-recap.md](../../story-endings/references/fixes/F-10-finale-recap.md) | C-40 | вывод загадки в сводке |
| F-11 | развилка в горлышке | `story-choices` | [F-11-bottleneck.md](../../story-choices/references/fixes/F-11-bottleneck.md) | C-01, C-03, C-09 | обязательные сцены на стволе |
| F-12 | сжать развязку | `story-endings` | [F-12-resolution.md](../../story-endings/references/fixes/F-12-resolution.md) | C-42, C-07, C-41 | следы пути; длина провального против удачного |
| F-13 | защитить слияние | `story-continuity` | [F-13-merge-guard.md](../../story-continuity/references/fixes/F-13-merge-guard.md) | C-51, C-15 | общий хвост сцены; голос в каждой ветке |
| F-14 | угроза вместо тихого провала | `story-choices` | [F-14-menace.md](../../story-choices/references/fixes/F-14-menace.md) | C-03, C-08 | отсутствие не дороже молчания (A-03) |
| F-15 | дописать опору или стадию | `story-plan` | [F-15-missing-beat.md](../../story-plan/references/fixes/F-15-missing-beat.md) | линза ревью | доля пути в коридоре |

- **Когда не работает.** У находки нет приёма и нет владельца (суждение модели «не верю» без проверки):
  указатель молчит — правка идёт вариантами линзы, если они есть в отчёте, иначе пункт возвращается
  автору вопросом.
- **Масштаб.** На 5 сообщениях почти любой приём сводится к одной реплике; на 50 и больше приём
  трогает несколько узлов — тогда список узлов идёт в `--nodes` у `text-diff.mjs` и `diff-report.mjs`.
- basis: our_estimate (раскладка `owners.md` §4; перезамеры — из «Шагов» и «Готово, когда» файлов владельцев).

## Перезамер: команда на приём

После правки по приёму — проверки из колонки «перезамер», одной командой:
`npm run -s story:lint -- --story <id> --only C-NN,C-MM`. Для F-03 и F-12 ещё
`npm run -s story:sessions -- --story <id>` (время и хвост), для F-08 и F-11 — `npm run -s story:vars -- --story <id>`.
Перезамер владельца не заменяет полный `story:lint` до и после (`diff-report.mjs`): он подтверждает, что
находка ушла, а полный — что ничего не появилось в другом месте.

## Если приёмы спорят

Две одобренные правки на одном узле применяются по очереди, каждая со своим `fix-guard.mjs`. Порядок —
по приоритету находки (`story-review/references/priority.md`): непонятное раньше скучного. Если вторая
правка отменяет первую (F-03 склеивает сессию, куда F-01 только что поставил крючок перед паузой), —
решение в [decisions-fix.md](decisions-fix.md), «Две правки на одном узле».

## Источники

- `docs/playbook/owners.md` §4 (раскладка F-NN), `docs/playbook/skills.md` §6 (строки приёмов,
  `npm run story:rule F-NN`).
- Файлы владельцев `references/fixes/F-NN-*.md`: «Готово, когда», «Что нельзя сломать».
