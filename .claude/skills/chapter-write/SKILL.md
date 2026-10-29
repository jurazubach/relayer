---
name: chapter-write
description: "Напиши главу по плану: следующую главу, главы 1–2 до теста, главы 3–N после теста, перепиши главу начисто; разверни скелет главы в реплики; как начать главу, чтобы помнила выборы прошлой. Глава на ink по плану, facts.md и docs/style.md, оба режима, напоминания, проверка хуком."
user-invocable: false
allowed-tools: Bash(npm run story*), Bash(npm run -s story*), Bash(node ${CLAUDE_SKILL_DIR}/scripts/*), Bash(node scripts/hooks/full.mjs *), Bash(rm docs/stories/*/context-ch*.md)
metadata:
  version: 1
---

# chapter-write — глава на ink по одобренному плану

Скилл пишет одну главу начисто: из пакета `chapter-context.mjs` (facts.md первым, шапка, строка плана и сцены скелета,
карточки, концы прошлой главы по путям с VAR на стыке, короткая версия стиля) — в `src/stories/<id>/chNN.ink`. Глава
читается в обоих режимах, у каждой развилки, где собеседник ждёт, есть напоминания и ветка «не ответил», вход помнит
прошлую главу, факты не расходятся с facts.md. После письма — `chapter-lint.mjs`, полный хук и сверка находок с ink.
Каркас главы задаёт план автора; скилл пишет реплики, предлагает и объясняет, правит готовое только с одобрения.

**Команды — по одной на вызов, ровно как написаны:** без `cd`, пайпов, `;`, `&&`, `>`, `$?`. Упала команда — «нет
данных: <команда>», а не оценка на глаз.

## Границы

- **Вход:** шаг `chapters:1-2` или `chapters:3-N` в STATUS.md, одобренный план (`story-plan`) и скелет; просьба
  «напиши главу N», «главы 1–2 до теста», «перепиши главу начисто» (с одобрения).
- **Выход:** `chNN.ink` (и строка `INCLUDE` в `story.ink` для новой главы), предложение строк для facts.md, отчёт главы.
- **Не здесь:** план, скелет, порядок глав — `story-plan`; точечная правка по ревью — `story-fix`; ревью главы —
  `story-review`; первая минута главы 1 — эталон у `story-opening`; голоса и редактура реплик — `story-voice`; время,
  режимы, напоминания как норма — `story-time`; крючки и возвращения — `story-pauses`; кто что знает и facts.md —
  `story-continuity`; кнопки и эхо — `story-choices`; набор `beta_stop` для теста — `story-playtest`; запись в
  STATUS.md и facts.md — `story-desk`.

## Алгоритм

1. **Состояние.** `npm run story:status -- --all`, затем прочитай `docs/stories/<id>/STATUS.md`. Историю не угадывай —
   спроси. Шаг раньше `skeleton` или плана нет — скажи и предложи `story-plan`. Новая глава или правка —
   [references/decisions-chapter.md](references/decisions-chapter.md).
2. **Пакет.** `node ${CLAUDE_SKILL_DIR}/scripts/chapter-context.mjs --story <id> --chapter N`. Сначала факты:
   выпиши имена, время, числа и VAR об игроке по [references/facts-anchor.md](references/facts-anchor.md). Глава 1 —
   сначала эталон первой минуты по `story-opening`. **Глава в фоне — агент `chapter-writer`** (когда —
   [references/decisions-chapter.md](references/decisions-chapter.md)): пакет в репозиторий —
   `node ${CLAUDE_SKILL_DIR}/scripts/chapter-context.mjs --story <id> --chapter N --out docs/stories/<id>/context-chNN.md`
   (агент в фоне читает только файлы проекта), затем задание агенту ровно этими полями:
   ```
   история: <id>                глава: N
   пакет: docs/stories/<id>/context-chNN.md (в репозитории; удалить после ответа агента)
   работа: новая | начисто: <D-NN или пункт ревью>
   одобрено: <кем, что — «автор, <дата>: переписать гл. N начисто по D-NN»; для новой главы «—»>
   конец: крючок к главе N+1 | beta_stop | финалы
   ```
   «Начисто» без `одобрено:` агент не пишет: одобрение берут у автора до вызова. После ответа: удали пакет (`rm docs/stories/<id>/context-chNN.md`), сам прогони шаг 6 и сверь отчёт агента с ink
   (шаг 7); шаги 3–5 делает агент. Без агента — шаги 3–8 сам.
3. **Каркас.** Сцены из строки плана и скелета → узлы, кнопки, `~`, переходы, по строке-заглушке на узел. Вход в главу
   с `#chapter` и условными первыми строками по VAR на стыке — [references/ink-idioms.md](references/ink-idioms.md)
   (R-27); сцены — [references/scene.md](references/scene.md). Проверь:
   `node ${CLAUDE_SKILL_DIR}/scripts/ink-compile.mjs --story <id>`.
4. **Текст.** Прямо сейчас прочитай `docs/style.md` §1 и разделы §3–§8 и возьми образцы:
   `node ${CLAUDE_SKILL_DIR}/scripts/style-sample.mjs --topic format` (затем `voice`, `buttons`, `pauses`). Пиши
   weave по [references/systems/weave.md](references/systems/weave.md): сначала переписка голосами карточек, потом
   кнопки со своим ответом; приёмы — [references/patterns-ink.md](references/patterns-ink.md), пузырь —
   [references/messages.md](references/messages.md).
5. **Паузы и молчание.** По [references/pause-lines.md](references/pause-lines.md): причина без срока перед паузой,
   событие первым после, у каждой развилки, где ждут ответа, — `- (ask)`, `#remind` и `#noanswer` или `#silent`.
   Конец главы — крючок; часть для теста кончается узлом `beta_stop`.
6. **Замер.** `node ${CLAUDE_SKILL_DIR}/scripts/chapter-lint.mjs --story <id> --chapter N`, затем
   `node scripts/hooks/full.mjs <id> --new` (сам включит `--partial` при `beta_stop`; `--new` — только ошибки, которых
   нет в версии из git). Ошибки главы N и новые ошибки чини; прежние ошибки других глав — строкой в отчёте, не здесь. По симптомам из таблицы
   «симптом → скилл» в `CLAUDE.md` позови нужный диагностический скилл (`story-voice`, `story-pace`, `story-choices`,
   `story-pauses`, `story-time`, `story-continuity`), а не все подряд.
7. **Сверка.** Каждую находку сверь с ink и правилом: узел, контекст, исключение из нюансов —
   [references/flags.md](references/flags.md), [references/decisions-scene.md](references/decisions-scene.md).
   Ложная — `// намеренно: C-NN причина` с причиной, иначе правка. Пройди
   [references/chapter-checklist.md](references/chapter-checklist.md).
8. **Факты и отчёт.** Строки для facts.md по [references/facts-anchor.md](references/facts-anchor.md); отчёт главы
   автору — формат ниже; состояние — через `story-desk`.

## Карта references

| развилка | файл |
|---|---|
| новая глава или правка, план, глава 1, часть, агент, weave или узел, `#remind` | [decisions-chapter.md](references/decisions-chapter.md) |
| вход в главу, теги, weave, общая кнопка; каскад, шафл, сшивка | [ink-idioms.md](references/ink-idioms.md), [patterns-ink.md](references/patterns-ink.md) |
| сцена с «поэтому», план собеседника, помеха, деталь; сцена буксует | [scene.md](references/scene.md), [decisions-scene.md](references/decisions-scene.md) |
| facts.md до и после главы | [facts-anchor.md](references/facts-anchor.md) |
| реплики у паузы, напоминания, оба режима; пузырь | [pause-lines.md](references/pause-lines.md), [messages.md](references/messages.md) |
| чек-лист главы; признаки → команда → правка; споры | [chapter-checklist.md](references/chapter-checklist.md), [flags.md](references/flags.md), [contradictions.md](references/contradictions.md) |
| «объясни»: уроки, внимание, системы по шагам | [explain.md](references/explain.md), [lessons.md](references/lessons.md), [attention.md](references/attention.md), `references/systems/` |

## Главные правила

- **A-08** глава — внутренняя единица автора, игрок её не видит: строка `#chapter` в переписку не приходит, её пауза
  переходит на первую реплику. Стык для игрока — пауза персонажа, поэтому что прошло и который день мира, говорит
  первая реплика (ST-62, ST-85), а не заголовок; «Глава N», «в прошлой главе» в репликах и `#sys` не пишутся.
- **R-27** вход в главу одним узлом с `#chapter`; прошлое — через VAR; первые строки зависят от выборов и отвечают на крючок.
- **R-118** только теги `ready` из `docs/capabilities.json`; `#photo` — заглушка с подписью.
- **R-91** (у `story-continuity`) правда — в facts.md; реплики берут время и имена оттуда, новое — предложением в реестр.
- **A-01, R-63** перед паузой причина без срока; **R-64, R-68** (у `story-pauses`) крючок последним, событие первым после.
- **A-03, R-120** молчит игрок — до `story.reminders.max` напоминаний без упрёка, потом ветка «не ответил», не дороже `#silent`.
- **A-04, R-122** текст читается в обоих режимах: без прожитого ожидания, метку «спустя N» ставит движок.
- **R-119** (у `story-voice`) не сшивать реплики без согласования; род игрока — никогда (ST-35).
- **A-06, C-53** в ink только шапка и `reveal` / `намеренно` / `финал`; заметки сцены — в плане.
- **`docs/style.md`** — код-стайл: одна мысль в пузыре, кнопки по §6, паузы по §8.

## Формат результата

Сначала то, что осталось после правки, — строго строкой, приоритет по `story-review/references/priority.md`:
`P2 · скучно · ch3_dock · серия без кнопки после возвращения · вставка выбора в монолог · [C-35 · замер · высокая]`.
Потом: что написано (узлы, кнопки, переменные пишет / читает), развилки с напоминаниями, новые строки для facts.md,
вопросы автору с вариантами ответа.

## Состояние

Главу скилл пишет сам в `src/stories/<id>/`. Остальное — через `story-desk` после одобрения: отчёт
`docs/stories/<id>/reviews/<дата>-chapter-write.md` (находки, строки facts.md, вопросы); строка для `STATUS.md`:
«гл. N написана <дата>: chapter-lint ✓, full --new ✓ (прежних P), напоминаний K, фактов в реестр M — reviews/…»; шаг
`chapters:1-2` → `review` после глав 1–2.

## Готово, когда

Глава компилируется; `chapter-lint.mjs --chapter N` без ошибок и `node scripts/hooks/full.mjs <id> --new` без новых
ошибок (весь полный отчёт зелёным быть не обязан: на истории бывают прежние ошибки других глав); «кнопка ждёт вечно» только
там, где это записано в плане; находки сверены с ink; строки facts.md предложены; отчёт передан `story-desk`.

## Объясни

По запросу «объясни»: **почему** — [references/explain.md](references/explain.md); **откуда** — `npm run story:rule R-NN`,
`алиас:ID` из [references/sources.md](references/sources.md), класс урока в [references/lessons.md](references/lessons.md);
**как самому** — упражнения в `explain.md` и системы по шагам в `references/systems/`.

Версия: 1
