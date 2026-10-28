# choices-tn-after

```
TOOL Skill {"skill":"story-choices","args":"the-number: выбор не чувствуется, жмёшь кнопки, а всё равно приходишь туда же. Найти причину и как починить."}
  ERR "Execute skill: story-choices"
TOOL Read {"file_path":"/Users/y.zubach/dev/jurazubach/relayer/.worktrees/_main/.claude/skills/story-choices/SKILL.md"}
TOOL Bash {"command":"ls docs/stories/the-number 2>&1; npm run -s story:lint -- --story the-number --only C-01,C-02,C-03,C-04,C-05,C-08,C-09,C-10,C-11,C-12,C-13,C-15,C-16,C-17,C-18,C-19 --js
  ERR "This Bash command contains multiple operations. The following part requires approval: echo \"exit $?\""
TOOL Bash {"command":"S=.claude/skills/story-choices/scripts; for s in choices echo-map position-bias people-balance; do echo \"=== $s\"; node $S/$s.mjs --story the-number 2>&1 | head -120; 
  ERR "A variable in this command can't be checked before it runs"
TOOL Bash {"command":"npm run -s story:lint -- --story the-number --only C-01,C-02,C-03,C-04,C-05,C-08,C-09,C-10,C-11,C-12,C-13,C-15,C-16,C-17,C-18,C-19 --summary","description":"Run choice-
TOOL Bash {"command":"node .claude/skills/story-choices/scripts/choices.mjs --story the-number","description":"Profile buttons per chapter"}
TOOL Bash {"command":"node .claude/skills/story-choices/scripts/echo-map.mjs --story the-number","description":"Map variable writes to visible reads"}
TOOL Bash {"command":"node .claude/skills/story-choices/scripts/position-bias.mjs --story the-number","description":"Check ending bias by button position"}
TOOL Bash {"command":"npm run -s story:endings -- the-number; ls src/stories/the-number; wc -l src/stories/the-number/*.ink","description":"Show endings and story files"}
TOOL Bash {"command":"grep -n \"ending\\|theo_trust\\|dina_trust\\|^===\\|-> END\\|#ending\" src/stories/the-number/*.ink | grep -v \"^.*//\" | head -150","description":"Find ending logic an
TOOL Read {"file_path":"/Users/y.zubach/dev/jurazubach/relayer/.worktrees/_main/src/stories/the-number/ch05.ink"}
TOOL Read {"file_path":"/Users/y.zubach/dev/jurazubach/relayer/.worktrees/_main/src/stories/the-number/ch04.ink"}
TOOL Read {"file_path":"/Users/y.zubach/dev/jurazubach/relayer/.worktrees/_main/src/stories/the-number/ch02.ink"}
TOOL Read {"file_path":"/Users/y.zubach/dev/jurazubach/relayer/.worktrees/_main/src/stories/the-number/ch01.ink","offset":317}
TOOL Read {"file_path":"/Users/y.zubach/dev/jurazubach/relayer/.worktrees/_main/src/stories/the-number/ch03.ink"}
COST 0.5138324000000001 turns 16 ms 100773 denials Skill | ls docs/stories/the-number 2>&1; npm run -s story:lint -- --story the-number --only C-01,C-02,C-03,C-04,C-05,C-08,C-09,C-10,C-11,C-12,C-13,C-15,C-16,C-17,C-18,C-19 --json > /private/tmp/claude-501/-Users-y-zubach-dev-jurazubach-relayer--worktrees--main/f2a9ecc9-d7ee-4c96-a667-5cc83e9b8fd8/scratchpad/lint.json 2>&1; echo "exit $?"; wc -c /private/tmp/claude-501/-Users-y-zubach-dev-jurazubach-relayer--worktrees--main/f2a9ecc9-d7ee-4c96-a667-5cc83e9b8fd8/scratchpad/lint.json | S=.claude/skills/story-choices/scripts; for s in choices echo-map position-bias people-balance; do echo "=== $s"; node $S/$s.mjs --story the-number 2>&1 | head -120; done
```

## Ответ

Посмотрел. Если коротко: история почти не помнит, что выбрал игрок. Решения записываются в переменные, но почти ничего потом их не читает, а все ветки сходятся в один финал.

## Почему выбор не чувствуется (по замерам)

**1. Финал один, и решения на него не влияют.** Бот прошёл историю 1602 раза, и все прохождения закончились в `new_client`. Ни одна переменная не предсказывает исход (`story:endings`). В финале меняются три строчки: что пишет Слоун про флешку, «Тео не в сети» и «Вы ведь ответите?». Продал ли игрок Дину, верил ли ему Тео, чем кончилась ночь на складе — в конце этого не видно.

**2. Главная развилка главы 1 забывается к главе 3.** Переменную `ending` (заперт / отдал / сбежал) читают только главы 1–2. После `keys` (`ch02.ink:206`) ветки сходятся, и с главы 3 ночь на складе не упоминается ни разу.

**3. Доверие копится, но игрок его не видит.**
- `theo_trust` меняют 14 кнопок. Читается он один раз, в главе 5 (`ch05.ink:129`): открывает кнопку, после которой ответ тот же, что и у соседней. Между главой 1 и главой 5 игрок не получает ни одного отклика (C-03, C-04).
- `dina_trust` меняют 8 кнопок, и видимо он не читается нигде. Единственное применение — `dina_trust > 0` в начале главы 3. По тексту это условие выполняется почти всегда: в `rescue_drive` обе кнопки дают `+1` (это я вывел из кода, отдельно не замерял).

**4. Пять переменных пишутся и ни разу не читаются (C-01, ошибки):** `told_theo`, `code_choice`, `warned_tail`, `gave_card`, `heard_audio`. Например, игрок переставил цифры в коде (`code_fake`), а Слоун потом ни разу об этом не вспоминает. С `heard_audio` ещё хуже: обе кнопки ставят `true`, так что выбора там нет вообще.

**5. Почти половина кнопок — косметика.** Это кнопки без своего последствия, которые сразу сходятся: 47–60% по главам, в главе 4 — 60%, выше порога. Типичный случай — `audio` (`ch05.ink:52`): «Он тебя любит» и «Я здесь» обе дают `theo_trust += 1`, Тео отвечает по-разному, но это ничего не меняет.

## Как починить (от самого заметного эффекта)

**A. Финал читает накопленное (эхо, F-08).** Последнее сообщение Тео должно зависеть от доверия и от предательства:
```ink
#from:theo #delay:2h
{ sold_out and not redeemed:
    дина сказала, кто дал ему адрес
    я не знаю, что про тебя думать. правда не знаю
    -> new_client
- theo_trust >= 4:
    сегодня первый раз за два месяца я не буду писать на его номер
    потому что на его номере теперь ты
    спокойной ночи, не-рэй
- else:
    спасибо. за всё это
    я пока не знаю, кто ты. но ты отвечал
}
```
Если нужны разные финалы, а не только разный текст, это уже работа для распределителя финалов (скилл story-endings).

**B. Вернуть ночь на складе в главы 3–5.** Хватит одной-двух реплик в каждой главе, например в `ch04.ink:29` и в `drive_open`:
```ink
{ ending == "locked": я всю ночь просидел в том боксе. теперь вот прачечная. прогресс }
{ ending == "ran": экран так и не починил. пишу через трещину }
```

**C. Дать мёртвым переменным реплику-отклик (F-08)** или удалить их:
- `code_choice == "fake"` → Слоун в прачечной (`ch04.ink:64`): «Две цифры. Я запомнил».
- `warned_tail` → Тео в главе 4: «если б ты не написал про машину, я бы вышел через главный вход».
- `gave_card` → Слоун в финале: «Запись посмотрел. Ты на ней тоже есть».
- `heard_audio`: либо третья кнопка «Не открывай пока» с другим исходом, либо удалить переменную.

**D. Доверие показывать раньше главы 5 (F-07).** Ответы Тео в главе 3 («ты со мной?», `ch03.ink:169`) и в главе 4 («на тебя немного», `ch04.ink:34`) должны зависеть от `theo_trust`. В `rescue_drive` у второй кнопки убрать `+1` и дать Дине реплику с упрёком вроде «долго». Тогда кнопка начнёт на что-то влиять.

Пункты A и C дадут больше всего: игрок начнёт видеть «это потому, что я тогда…». Пункт B — две-три строчки на главу.

Сам ничего не правил. Скажи, какие пункты применить, и я внесу их, а потом перезапущу `story:lint` и `check:story`. Отдельно: скилл story-choices не запустился через инструмент, поэтому я прошёл его шаги вручную теми же командами.
