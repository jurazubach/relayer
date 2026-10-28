# F-08 · Эхо и колбэки

Ремонтный приём `story-choices`. Применяет `story-fix` — только одобренное. Ссылается `story-endings`: эхо до
финала делает финал заслуженным, а показ скрытого порога финала — его приём F-09.

### F-08 · Эхо и колбэки

**Когда.** Переменная «только финал» или «молчит»: C-03 (`C-03.invisible`), C-04 (`C-04.gap_hint`,
`C-04.gap_warning`), метка «молчит» в `npm run story:vars` (тишина дольше `vars.silent_chapters` глав),
C-05 (`C-05.recalls`) — глава не вспоминает прошлого.

**Шаги.**
1. Возьми переменные без видимых чтений и молчащие: `node ${CLAUDE_SKILL_DIR}/scripts/echo-map.mjs --story <id>`
   (колонки «видимо», «дальность», «только финал»).
2. Для каждой выбери главу +1…+3 после записи и контакт, который мог узнать о поступке, — лучше третий,
   не тот, кому игрок писал (`meaningful-choice:P-09`, `GREEN-02`).
3. Напиши одну условную реплику его голосом (`docs/style.md`): называет уже случившийся след, повторяет
   ключевое слово кнопки, не обещает будущего (`meaningful-choice:PAT-01`).
4. Поставь её в общий узел после схождения, куда приходят все пути (`narrative-testing:PAT-06`): эхо в
   ветке, куда половина игроков не заходит, никто не увидит.
5. В начало каждой главы со второй — одна-три строки-эха по переменным прошлых глав
   (`choiceofgames-design:PAT-09`); для счётчика — лупа на пороге (`procedural-storytelling:PAT-05`).
6. Если переменная решает финал — проверь, слышна ли она хотя бы раз до последней главы; показ самого порога —
   F-09 у `story-endings`.
7. Перезапусти замер: `npm run story:lint -- --story <id> --only C-03,C-04,C-05` и `npm run story:vars -- --story <id> --only молчит`.

**Готово, когда.** `story:vars` не находит «молчит» дольше `vars.silent_chapters` глав; у переменных финала
есть видимое чтение до финала (C-03 молчит).

**Что нельзя сломать.** Знание персонажа: эхо не раскрывает то, чего говорящий знать не может (это ловит
`story-continuity`); не больше двух-трёх строк-эха подряд — иначе список; число откликов на главу — немногие
колбэки деталью, остальное в счётчики (`emshort-structures:LESSON-11`).

**До:**

```ink
# contact: ilya, Илья, teal
# contact: zina, Зина, amber
VAR hid_photo = false
-> ch1
=== ch1 ===
удали фото с парковки. пожалуйста #from:ilya
* [Удалено #to:ilya]
    ~ hid_photo = true
    спасибо #from:ilya #delay:30s
* [Нет. Оно может пригодиться #to:ilya]
    как знаешь #from:ilya #delay:1m
- -> ch2
=== ch2 ===
Глава 2 #sys:zina #chapter
у реки нашли машину. уже в новостях #from:zina #delay:3h
-> END
```

**После** (колбэк голосом третьего контакта в общем узле):

```ink
# contact: ilya, Илья, teal
# contact: zina, Зина, amber
VAR hid_photo = false
-> ch1
=== ch1 ===
удали фото с парковки. пожалуйста #from:ilya
* [Готово, удалено #to:ilya]
    ~ hid_photo = true
    спасибо #from:ilya #delay:30s
* [Нет. Оно может пригодиться #to:ilya]
    как знаешь #from:ilya #delay:1m
- -> ch2
=== ch2 ===
Глава 2 #sys:zina #chapter
{hid_photo:Илья сказал, фото с парковки больше нет. жаль, оно бы сейчас помогло #from:zina #delay:3h|у тебя же осталось фото с парковки? пришли #from:zina #delay:3h}
у реки нашли машину #from:zina #delay:20s
-> END
```

basis: secondary · опора: `skills.md` §6 F-08; `choiceofgames-design:PAT-09` и проход `/echo-pass`;
`meaningful-choice:PAT-01` и проход `/callback-pass`; `inkle-ingold:PAT-09`; `procedural-storytelling:PAT-05`.

## Источники

- Свод: F-08 (`npm run story:rule F-08`), R-40; проверки C-03, C-04, C-05.
- База: `meaningful-choice:P-09`, `PAT-01`, `GREEN-02`; `narrative-testing:PAT-06`; `choiceofgames-design:PAT-09`;
  `procedural-storytelling:PAT-05`; `emshort-structures:LESSON-11`.
