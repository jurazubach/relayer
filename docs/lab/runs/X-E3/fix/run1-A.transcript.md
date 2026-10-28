# Транскрипт fixA.jsonl

ходов 46, $3.45, 796 с, отказов в правах 1

## Шаги

1. **Skill** `story-fix`
   → Launching skill: story-fix
2. **Bash** `node /private/tmp/claude-501/-Users-y-zubach-dev-jurazubach-relayer--worktrees-X-E3/47140924-443a-4374-9c4b-84d1bd856cf9/scratchpad/fix1/.claude/skills/story-fix/scripts/pick.mjs --report docs/stories/chuzhoy-golos/reviews/2026-10-28-story-review.md`
3. **Read** `/private/tmp/claude-501/-Users-y-zubach-dev-jurazubach-relayer--worktrees-X-E3/47140924-443a-4374-9c4b-84d1bd856cf9/scratchpad/fix1/docs/stories/chuzhoy-golos/STATUS.md`
4. **Read** `/private/tmp/claude-501/-Users-y-zubach-dev-jurazubach-relayer--worktrees-X-E3/47140924-443a-4374-9c4b-84d1bd856cf9/scratchpad/fix1/.claude/skills/story-fix/references/approval.md`
   → <persisted-output> Output too large (43.5KB). Full output saved to: /Users/y.zubach/.claude/projects/-private-tmp-claude-501--Users-y-zubach-dev-jurazubach-relayer--worktrees-X-E3-47140924-443a-4374-9c4b-84d1bd856cf9-scratchpad-fix1/0b605a28-a861-4edd-836e-257c2eb62de6/tool-results/bj8vymkj7.txt Pre
   → 1 # STATUS · chuzhoy-golos 2 3 <!-- Формат читает npm run story:status (scripts/story/status.mjs), план §7. Поля — строки «- ключ: значение»; 4 шаг — один из: idea, directions, core, plan, skeleton, chapters:1-2, review, fix, playtest:wave1, 5 chapters:3-N, review:full, playtest:wave2, release. Реше
   → 1 # Одобрение: что применять и как показать предложение 2 3 Решение автора (`INTENT.md`, «Чего нельзя»): **правка текста без одобрения запрещена**. Скилл предлагает, 4 применяет только одобренное. В жизни одобряет автор, в конвейере — королева в пределах `INTENT.md` и с записью 5 решения. Одобряется
5. **Read** `/Users/y.zubach/.claude/projects/-private-tmp-claude-501--Users-y-zubach-dev-jurazubach-relayer--worktrees-X-E3-47140924-443a-4374-9c4b-84d1bd856cf9-scratchpad-fix1/0b605a28-a861-4edd-836e-257c2eb62de6/tool-results/bj8vymkj7.txt`
   → 1 pick · docs/stories/chuzhoy-golos/reviews/2026-10-28-story-review.md · находок 81 2 1. P3 · баг · ch1_hub (гл. 1) · у bank нет записи в `characters`, C-21 и C-45 считают его человеком · `service: true` · [C-45 · замер] 3 варианты: — (нет: строить у владельца по F-NN, см. fixes-index.md) 4 2. P3 · 
6. **Bash** `wc -l src/stories/chuzhoy-golos/*.ink src/stories/chuzhoy-golos/meta.json docs/style.md docs/stories/chuzhoy-golos/reviews/2026-10-28-story-review.md .claude/skills/story-fix/references/fixes-index.md`
   → 312 src/stories/chuzhoy-golos/ch01.ink 165 src/stories/chuzhoy-golos/ch02.ink 162 src/stories/chuzhoy-golos/ch03.ink 157 src/stories/chuzhoy-golos/ch04.ink 167 src/stories/chuzhoy-golos/ch05.ink 388 src/stories/chuzhoy-golos/ch06.ink 283 src/stories/chuzhoy-golos/ch07.ink 336 src/stories/chuzhoy-gol
7. **Read** `/private/tmp/claude-501/-Users-y-zubach-dev-jurazubach-relayer--worktrees-X-E3/47140924-443a-4374-9c4b-84d1bd856cf9/scratchpad/fix1/docs/stories/chuzhoy-golos/reviews/2026-10-28-story-review.md`
   → 1 # Ревью · chuzhoy-golos · 2026-10-28 2 3 - история: chuzhoy-golos, ревизия 1, коммит 63c226a, режим full 4 - линзы: story-cast, story-choices, story-continuity, story-endings, story-mystery, story-opening, story-pace, story-pauses, story-time, story-voice; ответы: cold-middle-skeptic.md, cold-open
8. **Read** `/private/tmp/claude-501/-Users-y-zubach-dev-jurazubach-relayer--worktrees-X-E3/47140924-443a-4374-9c4b-84d1bd856cf9/scratchpad/fix1/.claude/skills/story-fix/references/fixes-index.md`
   → 1 # Указатель ремонтных приёмов: F-NN → файл владельца 2 3 `story-fix` приёмов не держит: каждый лежит у скилла-владельца в `references/fixes/F-NN-*.md` 4 (`docs/playbook/owners.md` §4). Здесь — куда идти, что проверить после и чего приём сам боится сломать. 5 Шаги, ink «до» и «после» — только в фай
9. **Read** `/private/tmp/claude-501/-Users-y-zubach-dev-jurazubach-relayer--worktrees-X-E3/47140924-443a-4374-9c4b-84d1bd856cf9/scratchpad/fix1/src/stories/chuzhoy-golos/story.ink`
   → 1 # title: Векскомб · Чужой голос 2 # contact: ellie, Элли, amber 3 # contact: jess, Джесс, pink 4 # contact: connor, Коннор, orange 5 # contact: kieran, Киран, indigo 6 # contact: tom, Том, cyan 7 # contact: beth, Бет, purple 8 # contact: owen, Оуэн Брайт, blue 9 # contact: judith, Джудит Марш, tea
10. **Read** `/private/tmp/claude-501/-Users-y-zubach-dev-jurazubach-relayer--worktrees-X-E3/47140924-443a-4374-9c4b-84d1bd856cf9/scratchpad/fix1/src/stories/chuzhoy-golos/ch01.ink`
   → 1 // ============ ГЛАВА 1 ============ 2 3 === ch1 === 4 День 1 · Подработка #from:ellie #sys:ellie #chapter 5 привет! это по объявлению #from:ellie #delay:5s 6 remote research assistant, только переписка, £12 в час 7 спасибо за отклик #delay:4s 8 сначала один вопрос #delay:8s 9 ты же не из девона? 
11. **Read** `/private/tmp/claude-501/-Users-y-zubach-dev-jurazubach-relayer--worktrees-X-E3/47140924-443a-4374-9c4b-84d1bd856cf9/scratchpad/fix1/src/stories/chuzhoy-golos/meta.json`
   → 1 { 2 "format": "relayer-story", 3 "version": 1, 4 "id": "chuzhoy-golos", 5 "revision": 1, 6 "series": "Векскомб", 7 "title": "Чужой голос", 8 "tagline": "£12 в час за то, чтобы писать свидетелям чужим голосом", 9 "synopsis": "Векскомб, городок на побережье Девона. В июне в затопленном карьере нашли
12. **Read** `/private/tmp/claude-501/-Users-y-zubach-dev-jurazubach-relayer--worktrees-X-E3/47140924-443a-4374-9c4b-84d1bd856cf9/scratchpad/fix1/src/stories/chuzhoy-golos/ch05.ink`
   → 1 // ============ ГЛАВА 5 ============ 2 3 === ch5 === 4 День 5 · Слушание #from:ellie #sys:ellie #chapter #delay:1h 5 посмотрела #from:ellie #delay:30m 6 там денни 7 голос оуэна #delay:15s 8 и я. и коннор 9 её ночи там нет. только денни #delay:20s 10 Кадр 1: край карьера ночью, свет телефона, два с
13. **Grep** `kieran|called_bluff|knows_tox|ellie_trust|#remind|#noanswer|Киран`
   → src/stories/chuzhoy-golos/ch02.ink:39:~ ellie_trust += 1 src/stories/chuzhoy-golos/ch02.ink:97:~ knows_tox = true src/stories/chuzhoy-golos/ch02.ink:127:- knows_tox: -> ch2_beth src/stories/chuzhoy-golos/ch02.ink:132:~ knows_tox = true src/stories/chuzhoy-golos/ch02.ink:162: ~ ellie_trust += 1 src/s
14. **Read** `/private/tmp/claude-501/-Users-y-zubach-dev-jurazubach-relayer--worktrees-X-E3/47140924-443a-4374-9c4b-84d1bd856cf9/scratchpad/fix1/src/stories/chuzhoy-golos/ch02.ink`
   → 1 // ============ ГЛАВА 2 ============ 2 3 === ch2 === 4 День 2 · Свидетели #from:ellie #sys:ellie #chapter #delay:1h 5 { 6 - connor_told: -> ch2_ellie 7 } 8 -> ch2_rumor 9 10 === ch2_rumor === 11 ~ jess_rumor = true 12 слушайте #from:jess #delay:20m 13 я тут вспомнила 14 коннор потом всем говорил ч
15. **Read** `/private/tmp/claude-501/-Users-y-zubach-dev-jurazubach-relayer--worktrees-X-E3/47140924-443a-4374-9c4b-84d1bd856cf9/scratchpad/fix1/src/stories/chuzhoy-golos/ch04.ink`
   → 1 // ============ ГЛАВА 4 ============ 2 3 === ch4 === 4 День 4 · Денни #from:ellie #sys:ellie #chapter #delay:7h 5 { 6 - unknown_blocked: -> ch4_blocked 7 } 8 -> ch4_unknown 9 10 === ch4_unknown === 11 Вы не остановились. #from:unknown #delay:30m 12 Оставьте Элли в покое. 13 Ей и без Вас хватает. 1
16. **Read** `/private/tmp/claude-501/-Users-y-zubach-dev-jurazubach-relayer--worktrees-X-E3/47140924-443a-4374-9c4b-84d1bd856cf9/scratchpad/fix1/src/stories/chuzhoy-golos/ch09.ink`
   → 120 Ладно. {world == "open":Завтра на допросе я скажу|Тогда я всем скажу}, что голос на записи — Элли 🙂 #from:owen #delay:1h 121 -> ch9_maya 122 123 === ch9_owen_turn === 124 ~ owen_turned = true 125 ~ jess_clues += 2 126 она выплыла #from:owen #delay:14m 127 четыре месяца я думал, что это я #delay
17. **Read** `/private/tmp/claude-501/-Users-y-zubach-dev-jurazubach-relayer--worktrees-X-E3/47140924-443a-4374-9c4b-84d1bd856cf9/scratchpad/fix1/src/stories/chuzhoy-golos/ch10.ink`
   → 1 // ============ ГЛАВА 10 ============ 2 3 === ch10 === 4 День 10 · На счёт три #from:jess #sys:jess #chapter #delay:5h 5 ~ sync_world() 6 мы на воде #from:jess #delay:1m 7 шестеро и я #delay:20s 8 я считаю #delay:20s 9 мы на берегу #delay:55m 10 -> ch10_dawn 11 12 === ch10_dawn === 13 { 14 - jess_
18. **Grep** `remind|noanswer|"service"|#time|#skip|"tag"`
   → 18: "tag": "contact", 31: "tag": "unlock", 44: "tag": "rename", 66: "tag": "from", 79: "tag": "me", 92: "tag": "sys", 104: "tag": "photo", 117: "tag": "delay", 187: "tag": "to", 200: "tag": "silent", 208: "id": "remind", 213: "tag": "remind", 214: "syntax": "* [#remind:40m] реплика напоминания — скр
19. **Bash** `sed -n 195,235p docs/capabilities.json`
   → "id": "silent", "group": "Выбор игрока", "title": "Промолчать", "status": "ready", "since": "0.1", "tag": "silent", "syntax": "#silent", "what": "Выбор без исходящего сообщения: игрок решил не отвечать.", "looks": "Кнопка есть, но в чате после неё ничего не появляется.", "example": "* [Промолчать. Э
20. **Grep** `service`
   → src/stories/the-number/meta.json:95: "service": true src/stories/the-number/meta.json:101: "service": true
21. **Bash** `sed -n 85,105p src/stories/the-number/meta.json`
   → { "id": "ray", "name": "Рэй Колдуэлл", "role": "тот, чей это был номер", "about": "Держал для людей чужие вещи и решал их проблемы. Отсутствует до самого финала." }, { "id": "nimbus", "name": "Нимбус", "role": "облачный сервис: коды входа", "service": true }, { "id": "parking", "name": "Парковочная 
22. **Grep** `^## |^### ST-(32|6[0-9]|7[0-9])|remind`
   → 43:## 1. Короткая версия 68:## 2. Ориентир: Lifeline 114:## 3. Формат сообщения 168:## 4. Голос и тон 215:## 5. Как персонажи различаются 249:## 6. Кнопки 293:## 7. Как герой переспрашивает игрока 323:## 8. Время мира, паузы, напоминания и системные строки 370:герой напоминает не больше `story.remin
23. **Read** `/private/tmp/claude-501/-Users-y-zubach-dev-jurazubach-relayer--worktrees-X-E3/47140924-443a-4374-9c4b-84d1bd856cf9/scratchpad/fix1/docs/style.md`
   → 1 # Стиль повествования relayer 2 3 «Код-стайл» историй: как звучит переписка, из каких пузырей она состоит, как говорят люди, кнопки, 4 паузы и системные строки. Ему следует любая история и любая правка: генератор, `chapter-write`, 5 `story-fix`, `story-voice` и ручная работа автора. 6 7 `версия 2 
24. **Bash** `node -e "const t=require('./docs/playbook/thresholds.json');const g=(o,p)=>p.split('.').reduce((a,k)=>a&&a[k],o);for(const k of ['story.reminders','story.tail','C-42','C-21','C-24','C-30','C-08','C-03'])console.log(k,JSON.stringify(g(t,k)??t[k]))"`
   → **ошибка/отказ:** Permission for this tool use was denied. It requires approval, and this session has no approval surface — nobody can answer a permission prompt here — so it was denied automatically. The action was NOT performed; do not claim it succeeded, and do not retry it: this action, and anything else that req
25. **Read** `/private/tmp/claude-501/-Users-y-zubach-dev-jurazubach-relayer--worktrees-X-E3/47140924-443a-4374-9c4b-84d1bd856cf9/scratchpad/fix1/.claude/skills/story-endings/references/fixes/F-12-resolution.md`
   → 1 # F-12 · Сжать развязку 2 3 Ремонтный приём `story-endings`. Применяет `story-fix` — только одобренное. Длина всей истории и паузы 4 между главами — `story-time`; здесь только хвост после последней кнопки. 5 6 ### F-12 · Сжать развязку 7 8 **Когда.** После последней кнопки хвост длиннее `C-42.msgs
26. **Read** `/private/tmp/claude-501/-Users-y-zubach-dev-jurazubach-relayer--worktrees-X-E3/47140924-443a-4374-9c4b-84d1bd856cf9/scratchpad/fix1/.claude/skills/story-endings/references/fixes/F-09-threshold.md`
   → 1 # F-09 · Показать скрытый порог 2 3 Ремонтный приём `story-endings`. Применяет `story-fix` — только одобренное. Ссылается `story-choices`: эхо 4 переменной до финала — его F-08, а показ порога, от которого зависит финал, — этот приём. 5 6 ### F-09 · Показать скрытый порог 7 8 **Когда.** Переменная
27. **Read** `/private/tmp/claude-501/-Users-y-zubach-dev-jurazubach-relayer--worktrees-X-E3/47140924-443a-4374-9c4b-84d1bd856cf9/scratchpad/fix1/.claude/skills/story-choices/references/fixes/F-14-menace.md`
   → 1 # F-14 · Угроза вместо тихого провала 2 3 Ремонтный приём `story-choices`. Применяет `story-fix` — только одобренное. Ссылается `story-core/axes.md`: 4 растущие счётчики — его правило R-41; здесь — как превратить тихий штраф в видимую угрозу со сценой. 5 6 ### F-14 · Угроза вместо тихого провала 7
28. **Grep** `"(reminders|tail|max_delay_min|msgs|max|first_contacts|new_contacts)"`
   → 369- "min": 10, 370: "max": 15 371- }, -- 4610- "min": 2, 4611: "max": 5 4612- }, -- 7180- "min": 0.3, 7181: "max": 0.7 7182- }, -- 8155- "median": 8, 8156: "max": 25 8157- }, -- 8226- "target": 2, 8227: "max": 3 8228- }, -- 8728- "min": 1, 8729: "max": 3 8730- }, -- 9018- "min": 2, 9019: "max": 3 9
29. **Grep** `tom|Том|Киран|Kieran`
   → 143:-> ch7_tom 145:=== ch7_tom === 146:здравствуйте. я том эйкерс. да, тот самый «прочитано». #from:tom #delay:90m 155:~ tom_proof = true 160:* [Оуэн лайкнул тот пост через минуту? #to:tom] 161: время лайка не видно никому. даже мне. #from:tom #delay:1m 170:* [Спасибо, Том #to:tom] 171:- -> ch7_tom_
30. **Grep** `beth|#from:bank`
   → src/stories/chuzhoy-golos/meta.json:119: "id": "beth", src/stories/chuzhoy-golos/ch02.ink:127:- knows_tox: -> ch2_beth src/stories/chuzhoy-golos/ch02.ink:135:-> ch2_beth src/stories/chuzhoy-golos/ch02.ink:137:=== ch2_beth === src/stories/chuzhoy-golos/ch02.ink:138:эм привет #from:beth #delay:2h src/
31. **Grep** `// ставка:`
   → No matches found
32. **Grep** `ставка:`
   → 22- for (const l of run.lines) { 23- if (l.chapter > 1 || (l.delay >= long && l.i > 0)) break; 24- const t = l.text.toLowerCase(); 25: // одно общее слово со ставкой — ещё не ставка: «камера» звучит в любой ветке истории про камеру 26- const shared = [...roots(t, T.value('C-24.root'))].filter((r) =>
33. **Read** `/private/tmp/claude-501/-Users-y-zubach-dev-jurazubach-relayer--worktrees-X-E3/47140924-443a-4374-9c4b-84d1bd856cf9/scratchpad/fix1/scripts/lint/checks/C-24.mjs`
   → 1 // C-24. Ставка и срок в стволе: в главе 1 до первой долгой паузы звучит срок мира или ставка из шапки. 2 // Срок здесь — время мира (R-17, R-121), не срок паузы. Отсутствие — точный сигнал, совпадение — нет. 3 import { isIncoming, median, visitShare } from '../journal.mjs'; 4 import { pct, roots 
34. **Grep** `head\[|head\.|ставка|reveal|финал:`
   → 8- 9-/** Разметка в комментариях (план §9): шапка истории и метки у узлов. */ 10:export const HEAD_KEYS = ['ставка', 'вопрос', 'оси', 'логлайн']; 11:export const MARK_KEYS = ['reveal', 'намеренно', 'финал']; 12-const MARK_RE = new RegExp(`^(${[...HEAD_KEYS, ...MARK_KEYS].join('|')})\\s*:\\s*(.*)$`, 
35. **Grep** `^// (ставка|вопрос|оси|логлайн):`
   → No matches found
36. **Bash** `ls docs/stories/chuzhoy-golos/`
   → STATUS.md decisions.md ideas.md reviews
37. **Read** `/private/tmp/claude-501/-Users-y-zubach-dev-jurazubach-relayer--worktrees-X-E3/47140924-443a-4374-9c4b-84d1bd856cf9/scratchpad/fix1/docs/stories/chuzhoy-golos/decisions.md`
   → 1 # Решения · chuzhoy-golos 2 3 ## D-01 · 2026-10-25 · королева — ядро v0, восстановлено из текста (черновик, одобрено королевой) 4 5 - вид: ядро 6 - почему: история написана до цикла: ядро не записывалось; без него stale-check, story:status и скиллы упираются в вопрос автору. Ставка, вопрос, оси и 
38. **Grep** `^=== (ch3_why|ch6_cut|ch7_gate|ch8_finder|ch9_bill) ===`
   → src/stories/chuzhoy-golos/ch03.ink:23:=== ch3_why === src/stories/chuzhoy-golos/ch03.ink-24-* [Потому что тебе никто не верит #to:ellie] src/stories/chuzhoy-golos/ch03.ink-25-* [Потому что хочу знать, что случилось #to:ellie] src/stories/chuzhoy-golos/ch03.ink-26-- ок #from:ellie #delay:1m src/stori
39. **Read** `/private/tmp/claude-501/-Users-y-zubach-dev-jurazubach-relayer--worktrees-X-E3/47140924-443a-4374-9c4b-84d1bd856cf9/scratchpad/fix1/src/stories/chuzhoy-golos/ch03.ink`
   → 1 // ============ ГЛАВА 3 ============ 2 3 === ch3 === 4 День 3 · Город #from:ellie #sys:ellie #chapter #delay:6h 5 на моём шкафчике написали #from:ellie #delay:1m 6 неважно что 7 денег больше нет #delay:10m 8 можешь больше не 9 * [Я продолжу бесплатно #to:ellie] 10 ~ ellie_trust += 2 11 почему #fro
40. **Read** `/private/tmp/claude-501/-Users-y-zubach-dev-jurazubach-relayer--worktrees-X-E3/47140924-443a-4374-9c4b-84d1bd856cf9/scratchpad/fix1/.claude/skills/story-endings/references/fixes/F-10-finale-recap.md`
   → 1 # F-10 · Сводка перед финалом 2 3 Ремонтный приём `story-endings`. Применяет `story-fix` — только одобренное. 4 5 ### F-10 · Сводка перед финалом 6 7 **Когда.** Финал выбирает скрытая проверка по нескольким переменным, а перед распределителем нет перечня: 8 `node ${CLAUDE_SKILL_DIR}/scripts/thresh
41. **Read** `/private/tmp/claude-501/-Users-y-zubach-dev-jurazubach-relayer--worktrees-X-E3/47140924-443a-4374-9c4b-84d1bd856cf9/scratchpad/fix1/src/stories/chuzhoy-golos/ch07.ink`
   → 50 * [Не выходи. Пусть говорит через дверь #to:ellie] 51 ок #from:ellie #delay:1m 52 Не вышла. Те, кому нечего скрывать, выходят. #from:maya #delay:30m 53 * [Мая, уезжай. Ты пугаешь не того человека #to:maya] 54 Того. #from:maya #delay:1m 55 - -> ch7_connor 56 57 === ch7_connor === 58 { 59 - connor_
42. **Grep** `#remind|#noanswer`
   → 21: "Если молчать у кнопки в реальном времени, Мира напоминает — скрытые варианты #remind, ветка «не ответил» — #silent или #noanswer", 59:[Omitted long matching line]
43. **Bash** `grep -o 'ask[^"]\{0,400\}remind[^"]\{0,300\}' examples/e2e.story.json`
   → **ошибка/отказ:** Exit code 2 grep: maximum repetition exceeds 255
44. **Grep** `.{0,250}#remind.{0,200}`
   → 21: "Если молчать у кнопки в реальном времени, Мира напоминает — скрытые варианты #remind, ветка «не ответил» — #silent или #noanswer", 59:озови смотрителя #to:mira]\n сейчас напишу ему #from:mira #delay:10s\n видел огонь у старой пристани #from:keeper #unlock:keeper #delay:20s\n -> shore\n* [Промол

## Отказы в правах (permission_denials)

- Bash: `node -e "const t=require('./docs/playbook/thresholds.json');const g=(o,p)=>p.split('.').reduce((a,k)=>a&&a[k],o);for(const k of ['story.reminders','story.tail','C-42','C-21','C-24','C-30','C-08','C-03'])console.log(k,JSON.stringify(g(t,k)??t[k]))"`

## Ответ

Ничего не правил — ниже только предложения. В отчёте ревью у находок нет готовых вариантов А/Б (`pick.mjs`: «варианты: —»), поэтому я собрал их сам по приёмам владельцев (F-03, F-08, F-09, F-10, F-12, F-14) и по `docs/style.md`. Пункты, которые правят один и тот же узел, показываю вместе.

Одна команда не прошла: чтение порогов через `node -e` отклонено по правам. Числа порогов взял из текста ревью: `story.tail.max_delay_min` = 15 мин, `C-42.msgs` = 10, напоминаний 1–2.

---

## Глава 1

### 3 · P1 · непонятно · ch1_party, ch1 · срок мира есть только за необязательной кнопкой · R-17 + шапка `// ставка:` · [C-24]
**Почему:** на основном пути («Ок, давай») игрок не узнаёт ни срока, ни того, что на кону, а дальше идёт пауза на 7 часов.

**А** — срок переходит в общий блок после «прости» (9-е входящее), из ch1_party его убираю, чтобы не было повтора. Шапку ставлю в `story.ink` после строк `# contact:`.
```diff
 - прости #from:ellie #delay:6s
 важно чтобы тут тебя никто не знал
+через 4 дня слушание у коронера #delay:5s
+после него всё закроют
 работа простая #delay:10s

 === ch1_party ===
 была девушка #from:ellie #delay:40s
 в газетах всё есть
 полиция закрыла за 9 дней #delay:8s
-слушание у коронера через 4 дня
-после него всё
 * [Ladно. Берусь #to:ellie]
```
```diff
 # contact: hart, Сержант Харт, blue
+// ставка: через 4 дня слушание у коронера, после него смерть Лили закроют как несчастный случай; город говорит с игроком, пока не узнает, кто он
```
**Б** — то же место, но срок звучит как личный счёт Элли: `у меня 4 дня. в пятницу слушание у коронера`.

**Советую А:** «после него всё закроют» оставляет открытым вопрос «что закроют?», и на него отвечает первая же кнопка «А что за вечеринка?».
⚠ Попутно нашёл расхождение: в synopsis и в D-01 написано «пять дней», в ink — «4 дня» (день 1 → слушание в день 5). Поправить synopsis на «четыре»? Это вне списка, без вашего слова не трогаю.

### 7 + 50 · P2 · ch1_hub, ch1_kt · 8 новых контактов, Киран говорит один раз · `service` для bank, Кирана слить с Томом · [C-21, C-45]
**Почему:** в хабе толпа имён, а Киран — пустой контакт: «кто это?», потом «не в сети».

**А** — убрать Кирана совсем. Том остаётся только с «Прочитано»: это заготовка под гл. 7, где он пишет «да, тот самый «прочитано»». Номеров становится пять.
```diff
 // story.ink
-# contact: kieran, Киран, indigo

 // ch01.ink
-я даю 6 номеров
+я даю 5 номеров
-Скрин участников чата «Shortest Night 🔥»: Коннор Пайк, Джесс Холлис, Киран Лоу, Том Эйкерс, Бет Солтер, Оуэн Брайт. …
+Скрин участников чата «Shortest Night 🔥»: Коннор Пайк, Джесс Холлис, Том Эйкерс, Бет Солтер, Оуэн Брайт. …
-* [Коннор, Джесс, Киран, Том, Бет. Оуэну не писать #to:notes #label:Сохранить список в заметки]
+* [Коннор, Джесс, Том, Бет. Оуэну не писать #to:notes #label:Сохранить список в заметки]
-* [{opener} #to:kieran #label:Написать Кирану и Тому]
-    {opener} #me:tom
+* [{opener} #to:tom #label:Написать Тому]
     -> ch1_kt

 === ch1_kt ===
 Прочитано #sys:tom #delay:2m
-кто это? #from:kieran #delay:3m
-* {cover == "student"} [Студент. Опрос про вечеринки #to:kieran]
-* {cover == "honest"} [Помогаю подруге Лили #to:kieran]
-* [Промолчать #to:kieran #silent]
-- Киран не в сети #sys:kieran #delay:5m
 -> ch1_hub
```
В `meta.json`: тизер «Шесть номеров. …» → «Пять номеров. …», `chapters[0].about` «шесть номеров» → «пять номеров». В `characters` добавляется банк — так же, как в the-number:
```json
{ "id": "bank", "name": "Банк", "role": "переводы", "service": true }
```
**Б** — Киран остаётся именем на скрине, контакт убираем, Элли объясняет одной строкой («кирана не ищи. он уехал в июле»). Выходит лишнее имя и тупик для игрока.

**Бет** советую не трогать: её «не в сети» окупается в гл. 2 («я вчера не ответила, извините»), а контакты в хабе открывает сам игрок.

**Советую А.** Заодно уходит кнопка «Студент. Опрос про вечеринки» — одно из мест, где игроку задан мужской род (п. 5). Честно: C-21 по главе 1 после правки всё равно останется выше порога 3, потому что хаб открывает контакты по выбору игрока. Ревью потому и ставит этот пункт в P2, а не в P1.

---

## Глава 2

### 51 (только ellie_trust) · P2 · ch1→ch5 · доверие Элли пишется с гл. 1, а впервые читается в гл. 5 · F-08 · [C-04]
**Почему:** игрок делает пять «тёплых» и «холодных» ходов с Элли, а она до гл. 5 ведёт себя одинаково.

**А** — отклик в гл. 2, когда Элли отдаёт номер матери Лили. Это поступок доверия, и к этому месту доверие уже бывает ≥ 2 (ch1 +1, «Верю» +1, ch2_ellie_full +1).
```diff
 есть ещё один номер #from:ellie #delay:15s
 её мама. джудит марш #unlock:judith
+{ellie_trust >= 2:тебе я верю. поэтому даю|я тебе пока не верю до конца. но других у меня нет}
 со мной она не говорит
```
**Б** — отклик в начале гл. 3, в недоговорённом «можешь больше не». Но тогда пропадает обрыв, ради которого эта строка написана.

**Советую А:** это ближайшая глава, поступок естественный, порог 2 совпадает с проверками в гл. 7 и 10.

---

## Главы 4–5

### 18 · P2 · ch4_bluff · `called_bluff` пишется и нигде не читается · F-08 · [C-01]
**А** — Оуэн вспоминает это наутро (без рода игрока):
```diff
 Файлы у тебя. Я знаю
+{called_bluff:
+    Вчера тебе нужны были доказательства. Теперь они у тебя в руках 🙂 #delay:10s
+}
 Отправь их мне — и про Элли никто ничего не узнает #delay:10s
```
**Б** — убрать переменную: `VAR called_bluff` и `~ called_bluff = true`.

**Советую А:** одной репликой выбор «потребовать доказательств» перестаёт быть пустым.

### 22 · P2 · end_* → season_hook · после последней развилки пилота 3–4 уведомления без выбора, 7–13 ч · F-03 · [C-30]
**А** — в каждом end_* остаётся одна долгая пауза (само слушание), остальные задержки становятся минутами. Перед season_hook появляется общая реакция с ответами по `act1`. Длинная пауза 6 ч остаётся только перед season_hook.
```diff
 // end_coroner
-меня вызвали давать показания #from:ellie #delay:1h
+меня вызвали давать показания #from:ellie #delay:5m
-    я тоже пойду #from:connor #delay:30m
+    я тоже пойду #from:connor #delay:3m
--> season_hook
+-> ch5_after
 // end_ellie_together: «я захожу» 1h→20m, «меня вызвали» 40m→1h, «я сказала про денни» 20m→2m, «слушание отложили» 30m→3m
 // end_owen: «Будешь в наших краях» 2h→3m, «коннор пошёл в полицию» 2h→5m
 // end_silence (else): «я отдала карту оуэну» 2h→30m, «вердикт» 1h→3h
 // end_ellie_truth / end_ellie_hides: задержки как есть (3h = слушание)
 // во всех end_*: -> season_hook  →  -> ch5_after
```
```ink
=== ch5_after ===
* [Как ты? #to:ellie]
    {
    - act1 == "owen":
        не пиши мне пока #from:ellie #delay:2m
    - act1 == "ellie_hides" || act1 == "ellie_alone_owen":
        никак. всё закончилось. а ничего не кончилось #from:ellie #delay:2m
    - else:
        страшно. но я сказала это вслух. первый раз #from:ellie #delay:2m
    }
* [Оуэн так просто не отстанет #to:ellie]
    {
    - act1 == "owen":
        он и не отставал. у него теперь всё #from:ellie #delay:2m
    - else:
        знаю. но теперь это не только моё #from:ellie #delay:2m
    }
* [Промолчать #to:ellie #silent]
* [#noanswer:30m]
- Элли не в сети #sys:ellie
-> season_hook
```
**Б** — только сжать задержки, без ch5_after.

**Советую А:** стык пилота и сезона — место, где игроки уходят. У игрока остаётся ход, а исход пилота звучит голосом Элли.

---

## Глава 9

### 2 · P3 · баг · ch9_owen_turn · кнопка `{not knows_tox}` недостижима · F-07 · [C-15]
`knows_tox` ставится на обоих путях гл. 2 (ch2_judith_med или ch2_article). Вариант один:
```diff
-* {knows_tox} [Оуэн: около 01:00 драка на уступе, Лили упала в воду и плыла. На тропе стояла Джесс. Синяк на запястье — его рука #to:notes #label:Сохранить в заметки]
-* {not knows_tox} [Оуэн: около 01:00 драка на уступе, Лили упала в воду и плыла. На тропе стояла Джесс #to:notes #label:Сохранить в заметки]
+* [Оуэн: около 01:00 драка на уступе, Лили упала в воду и плыла. На тропе стояла Джесс. Синяк на запястье — его рука #to:notes #label:Сохранить в заметки]
```

---

## Глава 10 — маршрут к финалам

### 44 + 45 · P1 · ch10_maya, ch10_maya_go, fin_revenge · «Подожди» молча проваливается, fin_revenge забирает 71 % и наступает мимо последнего выбора · F-14 + F-09 + R-102 · [C-03, C-08, C-40]
**Почему:** игрок просит Маю подождать, не зная, что ей нужно, а финал наступает раньше двери.

**А** — Мая до кнопок своим голосом говорит, чего ей хватит (по уровням `maya_trust`). Пути «не уговорил», «Делай» и «молчание» больше не уводят сразу в финал: пост выходит (новая `VAR maya_went = false`), история идёт через ch10_owen → ch10_door, и fin_revenge становится одним из исходов ch10_route.
```diff
 В 7:30 я выкладываю {whisper_known:запись|всё, что знаю} и её имя. #delay:30s
-Скажи одно слово — и я подожду. #delay:30s
+{
+- maya_trust >= 3:
+    Тебе я верю. Скажи одно слово — и я подожду. #delay:30s
+- jess_confessed == 2 && maya_trust >= 0:
+    Если она тебе что-то сказала, скажи. Тогда подожду. #delay:30s
+- else:
+    Одного «подожди» мало. Два года мне все говорили «подожди». #delay:30s
+}
 * [Подожди. В восемь она идёт к Джудит. Сама #to:maya]
     …(как есть)
 * [Делай, что считаешь нужным #to:maya]
-    -> fin_revenge
+    ~ maya_went = true
+    Делаю. #from:maya #delay:2m
+    -> ch10_owen

 === ch10_maya_go ===
 { - tom_hold: …(как есть) -> ch10_owen }
--> fin_revenge
+~ maya_went = true
+Выложила. #from:maya #delay:20m
+-> ch10_owen

 // ch10_door — начало
-я у двери #from:jess #delay:5m
+{maya_went:
+    все уже знают #from:jess #delay:5m
+    я всё равно у двери #delay:20s
+- else:
+    я у двери #from:jess #delay:5m
+}

 // ch10_route — первым правилом
+- maya_went && not ((final_choice == "mercy" || final_choice == "silent") && jess_confessed == 2 && jess_bond >= 2): -> fin_revenge
 - final_choice == "truth" && proof >= 3: -> fin_truth

 // fin_revenge: Джесс теперь была у двери
-все пишут #from:jess #delay:10m
-у лодочной люди #delay:30s
-я не пойду к джудит #delay:1m
+я не смогла постучать #from:jess #delay:5m
 я выбросила её телефон. с пирса …
-Я узнала из группы. Как все. #from:judith #delay:30m
-Она не пришла. #delay:30s
+Она постояла у двери и ушла. Остальное я узнала из группы. Как все. #from:judith #delay:5m
```
**Б** — только порог голосом Маи (первый блок), маршрут как есть.

**Советую А:** без перестройки маршрута порог слышен, но последний выбор у двери так и остаётся пропущенным. Честно: доля fin_revenge упадёт в основном за счёт слышимого порога (игроки чаще уговорят Маю), а не за счёт маршрута. Молчащая персона по-прежнему придёт в revenge (молчание у Маи и у двери). Перемерю.

### 42 + 70 · P1/P2 · ch10_door, ch10_route · «Откройте. И вот всё» молча ведёт в fin_unproven, сводка частичная (3 из 7) · F-14 + F-10 · [C-08, C-02]
**А** — перед кнопками у двери Джудит спрашивает, что у неё будет в руках. Заметки сухо перечисляют есть / нет по каждой опоре распределителя, Джудит говорит, хватит ли этого. Расчёт `proof` переезжает из ch10_route в начало ch10_door: `owen_turned` может измениться в ch10_owen, а это раньше двери.
```diff
 === ch10_door ===
+~ proof = 0
+(блок { bill_found: ~ proof += 1 } … { jess_confessed == 2: ~ proof += 2 } — переносится из ch10_route как есть)
 …(Джесс у двери, «считаю до трёх», Джудит «Она у двери…», {judith_waits})
+Что я ей скажу, когда открою? #from:judith #delay:30s
+{bill_found:Счёт: 01:19, Лили звонила Джесс, 14 секунд|Счёта за ту ночь нет} #from:notes #delay:20s
+{ladder_known:Лестница: 01:15, кто-то лез со светом|Кто был на лестнице — неизвестно} #delay:10s
+{owen_turned:Оуэн: Лили выплыла, на тропе стояла Джесс|Оуэн молчит о том, что видел} #delay:10s
+{fake_note_caught:Записка с номера Лили изменена в 05:38|Записка про Оуэна не проверена} #delay:10s
+{jess_confessed == 2:Джесс сама рассказала про полку|Про полку Джесс не сказала ничего} #delay:10s
+{
+- maya_went:
+    Её имя уже в группе. Что бы я ни спросила, она скажет: травля. #from:judith #delay:30s
+- proof >= 3:
+    С этим я смогу спросить её прямо. #from:judith #delay:30s
+- else:
+    Этого мало. Она скажет, что спала, и уйдёт. #from:judith #delay:30s
+}
+{jess_confessed == 2:
+    {jess_bond >= 2:мне нужно, чтобы кто-то сказал «иди». тогда я постучу|не знаю, смогу ли я сама} #from:jess #delay:20s
+}
 {c10_maya_door: …}
 * [Откройте. И вот всё, что у меня есть …]
```
**Б** — без списка в заметках, только строка Джудит по `proof`. Пункт 42 закрыт, 70 — нет.

**Советую А.** Компромисс: Джудит судит о собранном до того, как получила его. Зато игрок видит цену до нажатия, и лучший финал нигде не назван. Сводка — около 8 строк подряд перед кнопками. Это внутри порога кульминации, но близко к нему.

---

## Глава 10 — развязки

### 43 + 46 + 76 · P1/P2 · fin_* · после последней кнопки ждать 4–13 ч, 14–29 сообщений, хроника на 8 уведомлений · F-12 + F-03 · [C-42, C-30]
**Почему:** игрок нажал последнюю кнопку и до слова «Конец» ждёт полдня.

**А** — во всех финалах задержки от 30 мин становятся минутами. Одна долгая пауза («Три недели / Пять месяцев спустя», 2 ч) остаётся только там, где после неё идёт кнопка. Где «спустя» стоит после последней кнопки — `#delay:5s`. Где хвост длиннее 10, ставлю позднюю кнопку-реакцию (у каждой — `#noanswer:30m`, равный молчанию). Повторный пересказ механики, которую Джесс уже рассказала, срезаю. Условия `{var}` (следы пути) сохраняю.

- **fin_coda / fin_ellie_ref** (общие): все `#delay:1h` → `1m`.
- **fin_truth**: только задержки — 40m→3m, 1h→2m, 30m→3m, owen 1h→2m, ellie 1h→2m, скрины 30m→1m, maya 2h→3m, «Три недели спустя» 2h остаётся (до кнопки «Тот, кто откликнулся»), bank/Джудит 1h→1m; у кнопки `* [#noanswer:30m]`. После кнопки около 7 сообщений и около 5 мин.
- **fin_ellie_owen** (туннель scapegoat и puppet) — одна кнопка закрывает оба финала:
```ink
=== fin_ellie_owen ===
все извинились. даже мама #from:ellie #delay:2m
{ellie_testifies:
    про блок я им сказала. записали и забыли. всем был нужен оуэн #delay:30s
- else:
    про блок никто не спросил. это осталось у меня #delay:30s
}
* [Он был там не один #to:ellie]
    знаю. но слушают только про него #from:ellie #delay:2m
* [Теперь тебя хотя бы слушают #to:ellie]
    да. странно это #from:ellie #delay:2m
* [Промолчать #to:ellie #silent]
* [#noanswer:30m]
- ->->
```
- **fin_scapegoat**: «Джессика пришла» 30m→5m, Джесс 40m→3m, «спасибо» 2m→1m, Оуэн 2h→5m, «Пять месяцев» 2h остаётся, Мая 1h→2m, Джесс 1h→3m, bank 30m→1m, Джудит 1h→2m. После кнопки 6–9 сообщений.
- **fin_puppet**: 30m→5m, Оуэн 2h→5m, «Ладно» 1h→1m, «Пять месяцев» 2h остаётся, lily 1h→2m; текст Маи не трогаю (повтор раскрытия — это п. 71). После кнопки 9–10 сообщений.
- **fin_herself** — пересказ «Лилиан выплыла… Оуэн столкнул» (298–300) убираю: на этот финал попадают только при `jess_confessed == 2`, игрок уже слышал всё от Джесс. Две кнопки:
```ink
=== fin_herself ===
~ ending = "herself"
раз #from:jess #delay:2m
два #delay:5s
три #delay:40s
она открыла #delay:2m
Она принесла пирог. И телефон Лилиан в её чехле. #from:judith #delay:5m
Она рассказала всё. Сама. Я не задала ни одного вопроса. #delay:30s
* [Как она? #to:judith]
    Сидит на кухне. Держит чашку двумя руками. #from:judith #delay:2m
* [Что Вы будете делать? #to:judith]
    Дослушаю. Потом позвоню в полицию. Она сказала, что подождёт со мной. #from:judith #delay:2m
* [Промолчать #to:judith #silent]
* [#noanswer:30m]
- Я позвонила в полицию. Она ждала со мной. #from:judith #delay:3m
джудит позвала меня. впервые с июня. показала её телефон #from:ellie #delay:3m
Lily 💧 → Элли · 00:41 «элли» · 00:43 «не будь дурой. карта будет в твоей куртке» · 00:46 «разблокируй. я не злюсь. я просто не могу одна» · Не доставлено #photo #delay:20s
она не злилась #delay:1m
-> fin_ellie_ref ->
{
- owen_turned:
    сказал всё. меня оставили до вечера #from:owen #delay:2m
- else:
    Мне предъявили. За Денни. И за уступ. #from:owen #delay:2m
}
Она пришла сама. Для Дэна это ничего не меняет. #from:maya #delay:2m
Для меня — немного. #delay:30s
Три недели спустя #sys:judith #delay:2h
Джессике предъявили обвинение в непредумышленном убийстве. Суд учтёт, что она пришла сама. #from:judith #delay:1m
Оуэну Брайту — воспрепятствование правосудию и нападение. #delay:30s
{hart_exposed:
    И то, что он выдавал себя за полицейского. #delay:20s
}
Дело Денни Кина открыто заново. #delay:30s
Элли получила предупреждение за ложные показания. Ей было пятнадцать. #delay:30s
я досчитала #from:jess #delay:2m
* [Теперь можно не считать #to:jess]
    да #from:jess #delay:1m
* [Ты дошла до двери. Это главное #to:jess]
    теперь знаю #from:jess #delay:1m
* [Промолчать #to:jess #silent]
* [#noanswer:30m]
- -> fin_coda ->
Лилиан бы её выслушала. Я выслушала. #from:judith #delay:1m
Конец #sys:judith
-> END
```
- **fin_unproven** — ветки сжимаются (truth: 4 строки, mercy: «я выбросила её телефон. с пирса» + две строки Джесс, else: 2 строки), задержки 2h/1h → 3–5m, «Три недели спустя» 2h остаётся. После «Мне этого не доказать.» появляется кнопка:
```ink
* [Вы это знаете. Это уже немало #to:judith]
    Для меня. Не для суда. #from:judith #delay:2m
* [Вы ещё платите за её номер? #to:judith]
    Плачу. Не знаю, зачем. #from:judith #delay:2m
* [Промолчать #to:judith #silent]
* [#noanswer:30m]
-
```
  Дальше: две строки Джесс (1h→3m), fin_coda, «Сегодня я отключила её номер» (1h→2m), «Конец». После кнопки 5 сообщений.
- **fin_silence** — пустое «ладно #delay:1h» после вопроса Элли становится кнопкой:
```ink
ты ведь что-то знаешь. да? #from:ellie #delay:3m
* [Знаю. Пока не могу сказать #to:ellie]
    ладно. я подожду #from:ellie #delay:2m
* [Нет #to:ellie]
    ладно #from:ellie #delay:2m
* [Промолчать #to:ellie #silent]
    ладно #from:ellie #delay:10m
* [#noanswer:30m]
    ладно #from:ellie #delay:1m
-
```
  Остальное: 20m→5m, 1h→10m, Оуэн 1h→3m, Мая 30m→3m («Ты молчишь. Дальше без тебя.» — одной строкой), «Три недели спустя» `#delay:5s`, Джудит/Джесс 1h→1–2m.
- **fin_revenge** — последняя кнопка (п. 46): реплика Оуэна поднимается выше, после строк Элли (1h→5m) ставлю:
```ink
* [Это не ты выложила #to:ellie]
    знаю. но всё равно стыдно #from:ellie #delay:2m
* [Не заходи в группу #to:ellie]
    уже вышла #from:ellie #delay:2m
* [Промолчать #to:ellie #silent]
* [#noanswer:30m]
-
Три недели спустя #sys:maya #delay:5s
```
  Строки Маи: «Брайт признал драку на уступе. Обвинение ему предъявили по Дэну.» — две строки в одну, «Все знают.» убираю; «Дэн бы сказал…» 1h→2m. После кнопки 10 сообщений.

**Б** — только задержки, без новых кнопок и срезов. Закрывает 43 и 76, но не 46: после двери останется 14–29 сообщений.

**Советую А:** только так проходят все три проверки. Риск: отрезки до первой кнопки (scapegoat — около 13 сообщений, сводка у двери) близки к порогу серии без выбора. Покажу по C-35 после правки. `minutes` и `days` карточки перемерю.

---

## Сквозное

### 54 · P2 · 98 развилок без `#remind` · ST-66, A-03 · [C-32]
Схема везде одна: `- (ask)` прямо перед кнопками, 1–2 напоминания (второе с новой деталью, без упрёка и без срока), ветка «не ответил». Если «Промолчать» стоит дешевле остальных — `#noanswer` по умолчанию идёт в `#silent`. Если `#silent` нет или он дороже — свой `#noanswer` с исходом не хуже нейтральной кнопки. Не трогаю, где собеседник не ждёт ответа: ch8_finder (lily), hart, хабы, кнопки-вопросы самого игрока.

Пример (ch1, девон):
```diff
 ты же не из девона?
+- (ask1)
 * [Нет, далеко #to:ellie]
 …
+* [#remind:20m] это не проверка. просто важно #from:ellie
+    -> ask1
+* [#remind:40m] если ты отсюда, работа не получится. поэтому спрашиваю #from:ellie
+    -> ask1
+* [#noanswer]
+    ладно. будем считать что нет #from:ellie #delay:1m
 - прости #from:ellie #delay:6s
```
Остальные узлы (напоминания → куда «не ответил»):

| узел | #remind | не ответил |
|---|---|---|
| ch1 «Ок, давай» | 30m «£12 в час. только переписка. подумай» · 1h «если не хочешь, просто скажи. я пойму» | → ch1_party (Элли объясняет сама) |
| ch1_terms, имя | 20m «любое имя. хоть первое попавшееся» | `~ alias = "Сэм"` → «ок, Сэм» |
| ch1_terms, легенда | 30m «от этого зависит, что я пришлю. студент или как есть?» | легенда «студент», как предложила Элли (⚠ род — п. 5, вне списка) |
| ch1_jess «ваучер на что?» | 30m «вы тут? ваучер на что?» | «ладно потом» (строку «супер» переношу внутрь двух кнопок) |
| ch1_evening | 30m «я не тороплю. просто скажи хоть что-то» | «джесс ответила? она всегда отвечает» + та же вложенная кнопка |
| ch1_connor_reply | 20m «ау. пока еду, могу ответить» | «ладно. давай свои вопросы» → ch1_connor_soft (= «Дадут») |
| ch1_unknown | 1h «Я вижу, что Вы прочитали.» | **пустой `#noanswer` → ch2**: иначе по умолчанию сработает `#silent` = «Заблокировать», а это закрывает end_coroner |
| ch2_ellie | 1h «на перемене смогу ответить. кто-нибудь что-то сказал?» | → ch2_ellie_none |
| ch2_judith_who | 3h «Я спрашиваю не из любопытства. Я её мать.» | «Kind regards, J. Marsh.» **без** `judith_trust -= 1` |
| ch3_why | 30m «можешь не отвечать. просто никто не делает бесплатно» | → «ок / спасибо» |
| ch4_please | 20m «я дома. дверь заперла» | → ch4_confess без изменения доверия |
| ch5 «что показывать?» | 30m «до слушания несколько часов. мне надо решить» | → ch5_files («ок. оставляю всё») |
| ch6_cut | 30m «Я слышу склейку. Мне нужно имя.» | «Ладно. Узнаю сама.» без изменения `maya_trust` |
| ch7_gate | 20m «она всё ещё у калитки» | = «Не выходи» (те же реплики Элли и Маи) |
| ch9_bill | 1h «Она придёт в восемь. Я должна знать, как с ней говорить.» | = «Ведите себя как обычно» |
| ch10_maya | 10m «Она идёт к машине.» · 10m «Семь двадцать.» | `#silent` → ch10_maya_go (после 45 — к двери) |
| ch10_ellie | 20m «я уже у участка» | `#silent` (`ellie_testifies = ellie_block_told`) |
| ch10_door (Джесс считает) | 5m «Она подняла руку к звонку.» · 5m «Опустила.» (от Джудит) | `#silent` → как «Промолчать» |
| кнопки финалов (п. 43/46) | — | `#noanswer:30m` = молчание, иначе финал ждёт нажатия вечно |

**Советую так, как в таблице.** Главное в ней — ch1_unknown и ch2_judith_who: там исход по умолчанию был бы хуже обычного молчания.

---

## Порядок и проверка после одобрения
Применяю в порядке: 3 → 7/50 → 51 → 18 → 22 → 2 → 44/45 → 42/70 → 43/46/76 → 54 (последним, потому что он трогает те же узлы гл. 10). Потом `fix-guard.mjs`, `text-diff.mjs` и `diff-report.mjs` по изменённым узлам, повтор `story:lint --only C-01,C-03,C-04,C-08,C-15,C-21,C-24,C-30,C-32,C-35,C-40,C-42`, `story:sessions`, `check:story`. Цифры принесу, догадок не будет.

Ответьте по каждому пункту: «да, А», «Б», «нет» или «потом». И отдельно: synopsis «пять дней» → «четыре» — да или нет?
