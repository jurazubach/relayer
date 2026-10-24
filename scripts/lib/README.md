# scripts/lib — общая библиотека разбора ink

Одна библиотека для всех инструментов: `check:story`, `graph`, будущие `story:*` и проверки.
Без зависимостей, кроме `inkjs`. Самопроверка — `npm run test:lib`.

| модуль | что даёт |
|---|---|
| `story.mjs` | `loadStory(id \| путь)` — папка `meta.json` + `story.ink` с `INCLUDE`, `.json` (с `includes` от `story:pack` или одним `ink`), голый `.ink`; `storyFromJson`, `listStories()`, `storyRefs(args)`, `parseStory(story)`, `compileInput(story)`. Раскладка и сборка: `splitInk`, `glueStory`, `packStory`, `unpackStory`, `writeFolder`, `layoutProblems`, `sameRuntime` |
| `ink.mjs` | `parseInk(src \| файлы)` — дерево; `nodeIds`, `findEndings`, `allMarks`, `walk`, `stripComments`, `resolveTarget`, `splitTags`, `parseTag`, `parseDelay`, `tokenize` |
| `compile.mjs` | `compile(src \| {main, files})` → `{ ok, json, errors, warnings, newStory() }`; ошибки `{ file, line, message, excerpt }`, `formatMessages()` |
| `bot.mjs` | `play(json, { strategy, rng, nodes, maxSteps, log, trackVars, setup })` → журнал и итоги; `strategies` (random, first, last, scripted), `seeded(seed)` |

## Дерево

`parseInk` возвращает `{ contacts, header, head, vars, includes, externals, knots, functions, start, chapters, comments }`.

- **Узел** — knot или stitch (`knot.stitch`). Функции ink в `functions`, узлами не считаются. Это единственное
  определение узла: `nodeIds(tree)` берут все инструменты.
- У узла: `id, kind, chapter, line, items, marks, lead` (+ `file` для историй из нескольких файлов, `params`, `ending`).
- Элементы: `msg / me / sys` (`who, text, tags, line`), `tags`, `code` (`~`), `gather`, `divert`
  (`target, kind: divert | tunnel | return`), `choice` (`depth, label, conds, text, tags, sticky, items`),
  `cond` (`head, branches[{ cond, items }]`), `comment` (`kind: line | block, text, mark?`).
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
