# scripts/lib — общая библиотека разбора ink

Одна библиотека для всех инструментов: `check:story`, `graph`, будущие `story:*` и проверки.
Без зависимостей, кроме `inkjs`. Самопроверка — `npm run test:lib`.

| модуль | что даёт |
|---|---|
| `story.mjs` | `loadStory(id \| путь)` — папка `meta.json` + `story.ink` с `INCLUDE`, `.json` (с `includes` от `story:pack` или одним `ink`), голый `.ink`; `storyFromJson`, `listStories()`, `storyRefs(args)`, `parseStory(story)`, `compileInput(story)`. Раскладка и сборка: `splitInk`, `glueStory`, `packStory`, `unpackStory`, `writeFolder`, `layoutProblems`, `sameRuntime` |
| `ink.mjs` | `parseInk(src \| файлы)` — дерево; `nodeIds`, `findEndings`, `allMarks`, `walk`, `stripComments`, `resolveTarget`, `splitTags`, `parseTag`, `parseDelay`, `tokenize` |
| `compile.mjs` | `compile(src \| {main, files})` → `{ ok, json, errors, warnings, newStory() }`; ошибки `{ file, line, message, excerpt }`, `formatMessages()` |
| `bot.mjs` | `play(json, { strategy, rng, nodes, maxSteps, log, trackVars, setup, mode })` → журнал и итоги; стратегия видит только кнопки и может вернуть `NO_ANSWER` — тогда напоминания `#remind` и ветка «не ответил» (события `remind`, `stall`, `choice.noAnswer`), как в engine.ts; `strategies` (random, first, last, scripted, unresponsive), `splitChoices`, `choiceRole`, `noAnswer(choices)`, `reminderSeries(events)`, `seeded(seed)` |
| `thresholds.mjs` | `loadThresholds()` — пороги из `docs/playbook/thresholds.json` (`value`, `re`, `show`, `seconds` по единице, `entry`), `validateThresholds`; `threshold(key)`, `thresholdSeconds(key)` — общий экземпляр. Ключа нет — исключение |
| `lexicon.mjs` | словари `dict.*` как их применяют все: `norm`, `dict`, `isClosing`, `isPromise`, `isReproach`, `returnDeadline` |
| `playtime.mjs` | время игрока по `engine.typing`: `typingTime`, `gapTime`, `lineKind`, `playerClock()` — пауза `#delay`, зазор и набор строк журнала |

## Дерево

`parseInk` возвращает `{ contacts, header, head, vars, includes, externals, knots, functions, start, chapters, comments }`.

- **Узел** — knot или stitch (`knot.stitch`). Функции ink в `functions`, узлами не считаются. Это единственное
  определение узла: `nodeIds(tree)` берут все инструменты.
- У узла: `id, kind, chapter, line, items, marks, lead` (+ `file` для историй из нескольких файлов, `params`, `ending`).
- Элементы: `msg / me / sys` (`who, text, tags, line`), `tags`, `code` (`~`), `gather`, `divert`
  (`target, kind: divert | tunnel | return`), `choice` (`depth, label, conds, text, tags, sticky, items`),
  `cond` (`head, branches[{ cond, items }]`), `comment` (`kind: line | block, text, mark?`).
- Однострочное условие с переходом `{x == 1: -> a}` (и `{x: -> a | -> b}`, и под кнопкой) — `cond` с веткой,
  а не реплика «{x == 1: }» плюс безусловный переход. Условный текст без перехода (`{x: да|нет}`) — реплика.
- **Комментарии — токены.** Метки `// reveal:`, `// намеренно: C-NN причина`, `// финал: <имя>` собираются в
  `knot.marks`; комментарии прямо над заголовком узла относятся к нему (`knot.lead`). Шапка до первого узла
  (`// ставка:`, `// вопрос:`, `// оси:`, `// логлайн:`) — в `tree.head`.
- **Финалы** (`findEndings`): если в истории есть хоть одна `// финал:`, финалы — только размеченные узлы,
  а узлы с `-> END` без метки попадают в `unmarked`. Каждая метка — свой финал, в одном узле их может быть несколько (по веткам состояния). Без меток — узлы с `-> END`.

## Журнал бота

События по порядку: `knot { id }`, `delay { seconds }`, `line { text, kind, who, tags, knot }`,
`choice { options, picked, text }`, `var { name, value, prev }`, `end` или `stuck` (упёрлись в `maxSteps`).
Стратегия выбора — функция `(choices, ctx) → индекс`; `ctx` даёт `rng, story, vars, events, knot, step, picks`.
Персоны пишутся как такие функции.

Узел строки — тот, где inkjs вывел её текст (первый кусок текста за `Continue()`, без текста тегов и кнопок).
`previousPointer` для этого не годится: inkjs заглядывает за переход, нет ли склейки `<>`, и указатель уже в
следующем узле, а после последнего `Continue()` перед `-> END` он пуст. Узел точки выбора — по `sourcePath`
кнопки: хаб без реплик по строкам не увидеть. Строка из одних тегов текста не выводит — ей остаётся `previousPointer`.

## Раскладка и сборка

- `splitInk(ink)` режет сценарий одним текстом: `story.ink` — всё до первого узла и строки `INCLUDE`
  в конце; `common.ink` — функции и узлы до первой главы; `ch01.ink`… — от узла с `#chapter` до следующего.
  Комментарии над заголовком уезжают с узлом. Без `#chapter` история остаётся одним файлом.
- `glueStory(story)` подставляет файлы на место `INCLUDE`; для результата `splitInk` это исходный
  текст байт в байт.
- `sameRuntime(a, b)` сравнивает два JSON от компилятора. INCLUDE добавляет `"\n"` сразу после перехода
  (`-> ch1` перед строками INCLUDE); ход до него не доходит, поэтому сравнение его пропускает.
- `layoutProblems(story)` — нарушения раскладки: узел в главном файле, текст до первого узла в главе,
  `INCLUDE` не из главного файла, файл без `INCLUDE`.
