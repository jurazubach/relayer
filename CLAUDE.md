# relayer — памятка для ИИ-ассистента

Веб-прототип интерактивных историй: мессенджер, в котором сюжет на [ink](https://www.inklestudios.com/ink/)
приходит сообщениями в реальном времени. React + Vite + TypeScript, без бэкенда,
прогресс в `localStorage`, деплой на GitHub Pages.

## Команды

```bash
npm install                 # первый раз
npm run dev                 # дев-сервер, http://localhost:5173
npm run build               # tsc -b && vite build → dist/ (+ dist/stories/*.story.json от story:pack)
npm run preview             # посмотреть собранное
npm run check:story         # бот прогоняет сценарии 400 раз (редкие ветки добирает до 2000): тупики, финалы, длительность
npm run graph               # карта сюжета: граф узлов, реплики и выборы → graph/index.html (-- --open)
npm run story:pack          # папки историй → один .json для загрузки (dist/stories/); -- --check: без потерь
npm run story:unpack        # история одним .json → папка src/stories/<id>/ с главами
npm run test:lib            # самопроверка scripts/lib: синтетические примеры ink и три истории
npm run story:lint          # проверки C-01…C-54 по checks.md (--strict, --summary, --changed --quick, --partial, --plan, --json)
npm run test:lint           # самопроверка story:lint: дефект и чистый двойник на каждую проверку
npm run story:trace         # прохождение персоной: переписка, маршрут, переменные, оба режима (--help)
npm run story:vars          # переменные: где пишется → где читается, мёртвые и невидимые
npm run story:sessions      # расписание без часов игрока: сессии, микросессии, длина против карточки
npm run story:cast          # контакты и их уровень: ось / сторона / источник / фон / эпизодический
npm run story:endings       # финалы, доли по персонам, что их решает
npm run story:diff          # метрики и реплики истории до и после между ревизиями git
npm run story:rule          # текст свода по ID: правило R-NN, проверка C-NN, решение автора A-NN
npm run story:status        # где история в цикле: docs/stories/<id>/STATUS.md (--all)
npm run story:cold-read     # холодное чтение: видимая переписка до узла для claude -p из пустого каталога
npm run test:story-cmd      # самопроверка команд story:*
npm run skills:test         # мутанты docs/lab/mutants: ловит ли story:lint (и скилл через --skill) дефекты своей зоны
npm run test:lab:mutants    # самопроверка skills:test: сборка мутантов, ключ, вердикт
npm run test:e2e            # Playwright: smoke-тесты в настоящем браузере
npm run shots               # скриншоты всех экранов в screenshots/<устройство>/
npm run test:e2e:ui         # интерактивный режим Playwright
npm run prompt              # пересобрать промпт для генерации историй из реестра возможностей
npm run story:coverage      # покрытие знаний скиллами: строки базы и свода, владельцы, L0–L3 (-- --help)
npm run test:coverage       # самопроверка story:coverage
npm run kb:clean            # очищенная копия базы docs/books/_clean/ (не в git) без строк про наши истории; -- --verify
npm run test:kb:clean       # самопроверка kb:clean
npm run lab:triggers        # тест срабатывания скиллов: claude -p на фразу (-- --skill <имя>, --dry-run); тратит запуски Opus
npm run test:lab:triggers   # самопроверка lab:triggers
npm run test:hooks          # самопроверка хуков .claude/settings.json (scripts/hooks)
```

Проверка перед коммитом: `npm run check:story && npm run test:lib && npm run test:lint && npm run test:story-cmd && npm run skills:test && npm run test:lab:mutants && npm run story:pack -- --check && npm run build && npm run test:e2e && npm run prompt -- --quiet && npm run test:coverage && npm run story:coverage -- --summary && npm run test:hooks`.

### Playwright

Браузер один — chromium (`npx playwright install chromium`), мобильные экраны эмулируются вьюпортом.
Проекты в `playwright.config.ts`: `phone` (390×844), `small` (360×640), `desktop` (1280×900).
Сервер Playwright поднимает сам (`npm run dev` на порту 4173, другой — `E2E_PORT=4273`); `E2E_PREVIEW=1` гоняет по продакшен-сборке.

**Браузер по умолчанию видимый** (окно уезжает вправо, движения замедлены на 120 мс), чтобы
пользователь мог подсмотреть, что происходит. `HEADLESS=1` — без окна, так быстрее;
`SLOWMO=400` — помедленнее. В видимом режиме воркер один: одно окно на прогон.

```bash
npm run test:e2e -- --project=phone     # одно устройство
npm run shots -- --project=desktop      # снимки только для десктопа
npx playwright show-trace test-results/*/trace.zip
```

**Чтобы посмотреть, как выглядит игра: `npm run shots`, затем открыть PNG из `screenshots/`.**
Это самый быстрый способ убедиться, что правка не развалила вёрстку.

### Параметры в адресе

Игра идёт настоящими минутами, поэтому для тестов и снимков есть флаги:

| параметр | что делает |
|---|---|
| `?story=the-number` | сразу открыть историю (по умолчанию — сразу играть) |
| `?screen=home` \| `story` \| `game` | какой экран показать |
| `?fresh=1` | стереть прогресс перед запуском |
| `?fast=1` | без пауз сюжета, набор текста ×4 |
| `?mode=click` \| `realtime` | режим новой игры, если она начинается не с экрана истории |

Например: `http://localhost:5173/?story=the-number&fresh=1&fast=1`.

## Устройство

Три экрана, назад всегда на уровень выше: чат → список чатов → описание истории → главный.

**Логика живёт в `engine`, оформление — в `ui`.** Компоненты `ui` чистые: получают данные
и обработчики пропсами, ничего не знают про localStorage, маршруты и разбор файлов.
Понадобилось состояние или хранилище — это в `engine`, а не в компоненте.

```
src/App.tsx                связывание: маршруты и передача данных в экраны
src/engine/engine.ts       движок сценария: inkjs, разбор тегов, очередь сообщений, сохранение
src/engine/story.ts        тип Story: описание, герои, главы и ink (главный файл + includes) в одном объекте
src/engine/library.ts      каталог: import.meta.glob по папкам src/stories/<алиас>/ + загруженные
src/engine/bundle.ts       разбор и выгрузка файла истории, storyPalette
src/engine/choiceLog.ts    файл журнала выборов для тестеров: маршрут для story:trace --from-save
src/engine/uploads.ts      загруженные истории в localStorage
src/engine/progress.ts     прогресс без запуска движка
src/engine/flags.ts        параметры в адресе и доступ к localStorage
src/engine/useRouter.ts    маршруты (home | story | game) с запоминанием
src/engine/useLibrary.ts   список историй, загрузка, удаление, сброс прогресса
src/engine/useGame.ts      одна игровая сессия: компиляция, тиканье, уведомления
src/engine/index.ts        бочка: ui импортирует только отсюда («../engine»)
src/ui/                    HomeScreen, StoryTile, StoryScreen, ChatsScreen, ChatScreen,
                           DebugSheet, Notice, ErrorScreen, Avatar, Icons
src/styles/                tokens.css, base.css, blocks/*.css
src/stories/<алиас>/        истории: meta.json + story.ink + ch01.ink…; новая папка = новая история
examples/demo.story.json   пример истории одним файлом (шаблон для авторов)
examples/e2e.story.json    фикстура e2e: тесты и снимки идут на ней, а не на историях каталога
docs/capabilities.json     реестр возможностей чата
docs/books/<алиас>/         база знаний сценариста: разборы 30 книг и статей (как собирать — docs/books/README.md)
docs/playbook/             свод из базы: правила генератора, проверки, находки по историям, план скиллов
scripts/lib/               общая библиотека разбора: ink.mjs (дерево), compile.mjs, bot.mjs (прохождения
                           с журналом), story.mjs (загрузка .json / папки / .ink, раскладка и сборка);
                           thresholds.mjs (пороги), lexicon.mjs (словари dict.*), playtime.mjs (время игрока)
scripts/story/             команды story:* на scripts/lib (README внутри)
scripts/check-story.mjs    бот-тестировщик (теги берёт из реестра)
scripts/story-pack.mjs     story:pack / story:unpack: папка истории ⇄ один .json
scripts/story-graph.mjs    карта сюжета: разбор ink в граф + шаблон story-graph.html
scripts/lint/              story:lint: проверки checks/C-NN.mjs, журнал бота, подавление // намеренно:, владелец из owners.md
docs/playbook/thresholds.json  единственное место чисел и порогов (проверки, словари, внимание, стиль, боты, скиллы)
docs/style.md              стиль повествования: код-стайл историй (ST-NN), образцы SG-NN и антиобразцы AS-NN
scripts/kb/                база знаний: kb:clean (очистка входа), story:coverage, кластеры
scripts/hooks/             хуки Claude Code: проверка после правки src/stories, статус при старте; full.mjs — полный прогон главы
scripts/lab/               эксперименты: lab:triggers, skills:test и сборка мутантов
docs/lab/                  журнал экспериментов, baseline.md, runs/, мутанты, фразы срабатывания, cases/ (кейсы наших историй, руками не править)
e2e/                       Playwright: smoke / modes / reminders / choice-log .spec.ts (проверки), shots.spec.ts (снимки, @shots), fixture.ts
```

Ключи в `localStorage`: `relay:<storyId>` — прогресс истории, `relay:route` — где игрок был
в прошлый раз (экран, история и открытый чат), `relay:uploads` — загруженные истории целиком,
`relay:fast` — быстрый набор в отладке, `relay:notices` — `0`, если игрок выключил уведомления,
`relay:open:<storyId>` — `1`, если продолжение за бесплатной границей открыто (пока из отладки; «начать заново» его не закрывает).
Режим игры (`realtime` / `click`), молчание у кнопки (напоминания `#remind`) и журнал выборов (выгрузка из отладки
для `story:trace --from-save`) лежат в прогрессе истории.

Прогресс хранится по `id` истории, а не по происхождению: загруженная файлом и приехавшая
потом в репозиторий — это одна и та же история, и встроенная вытесняет загруженную копию.

## Истории в каталоге

Три готовые истории: две по пять глав, «Чужой голос» — десять (пилот и сезон в одной истории;
«Пилот» в названиях и заголовках не пишем):

| папка | на карточке | ≈ минут |
|---|---|---|
| `src/stories/the-number/` | THE NUMBER (без серии) | 25 |
| `src/stories/slepoe-pyatno/` | 01:42 · Слепое пятно | 40 |
| `src/stories/chuzhoy-golos/` | Векскомб · Чужой голос | 90 |

Над названием мелко — `series`, крупно — `title`; в сценарии `# title:` повторяет их через « · ».
Флаги в примерах опираются на `the-number`, e2e — на фикстуру `examples/e2e.story.json`. Всё в историях вымышлено: никаких
реальных компаний, людей и точных цифр из настоящих инцидентов.

## Как добавить историю

В репозиторий: папка `src/stories/<алиас>/` — `meta.json` (описание, `characters`, `chapters`, `cover`,
`revision`, `minutes`, `days`, `free_chapters`, `teasers` — затравки для карточки) и `story.ink`, главы — `ch01.ink`… через `INCLUDE`.
Каталог собирается `import.meta.glob`, регистрировать нигде не нужно. Готовый `.json` разложить —
`npm run story:unpack -- путь.json`.

Раскладка (иначе INCLUDE в inkjs ломается или съезжает нумерация глав):
- в `story.ink` — только шапка (`# title:`, `# contact:`), `VAR`, начальный `-> ch1` и строки `INCLUDE`
  в конце; узлов в главном файле нет;
- в файле главы до первого `===` — только комментарии и `VAR`; `INCLUDE` — только из главного файла;
- функции и общие узлы до первой главы — в `common.ink`.
`npm run story:pack -- --check` это проверяет.

Если рядом лежат папка и `.json` с одним id, источник — папка, а `.json` — копия от `story:pack`:
так считают и сайт, и `check:story`, и `scripts/lib`.

Без репозитория: «Загрузить историю» на главном принимает `.json` от `story:pack` (главный файл в `ink`,
главы в `includes`), `.json` с одним `ink` или просто `.ink`. Формат описан в README, пример — `examples/demo.story.json`.
Загрузка истории с тем же `id` заменяет её — так автор правит файл и перезагружает, не теряя место в списке.

В `characters` поля `voice` (карточка голоса) и `arc` (функция по главам) — служебные: экран истории
их не показывает, иначе «виновная с главы 8» станет спойлером.

## Скиллы: симптом → скилл

Скиллы лежат в `.claude/skills/`, подхватываются сами по описанию. Модули (`user-invocable: false`) зовут входы
или главная сессия по этой таблице. Каждый новый скилл дописывает сюда свою строку.

| симптом словами автора | скилл |
|---|---|
| где мы с историей, что дальше, запиши решение, отложи идею, что устарело | `story-desk` |
| есть идея — что из неё выйдет, накидай направлений, не знаю, с чего начать, дай ещё варианты, всё не то | `story-brainstorm` |
| о чём история, что на кону и к какому сроку, главный вопрос, кто противник и чего хочет, роль игрока, тема, логлайн | `story-core` |
| разверни ядро в план, сколько глав, сделай скелет до текста, сравни варианты плана, где паузы и платная граница, не хватает опоры | `story-plan` |
| посмотри историю целиком, что не так, где слабые места, что чинить первым, посмотри скелет до текста, тестеры спорят с ревью | `story-review` |
| выбор не ощущается, кнопки ничего не меняют, пустые кнопки, всё сходится в одно | `story-choices` |
| скучно, середина провисает, глава тянется, длинные куски без кнопок | `story-pace` |
| поймут ли игроки, где бросят читать, дай прочитать холодным читателям, сборка и анкета для тестеров, что ответили тестеры | `story-playtest` |
| персонаж знает то, чего ему не писали, после ветки здоровается второй раз, время в разных местах разное, чаты живут отдельно | `story-continuity` |
| все пишут одинаково, стена текста в пузыре, канцелярит, игроку приписан пол, путаются имена, не смешно | `story-voice` |
| начало не цепляет, непонятно, кто пишет и зачем, первая кнопка поздно, каша из имён, первое сообщение «привет» | `story-opening` |
| после паузы не возвращаются, глава обрывается на «ок», после паузы «привет», стена непрочитанного, стык глав провисает | `story-pauses` |
| «напишу через час», сколько напоминать молчащему, что ночью, режим по клику, проверить паузы без ожидания, сколько дней идёт история | `story-time` |
| финал решает скрытая проверка, все приходят в один конец, финал ничего не помнит, после последней кнопки ждать часами | `story-endings` |
| слишком много чатов, кто есть кто, персонаж лишний или только отвечает, ответ ушёл в пустоту, когда ввести нового героя | `story-cast` |
| разгадку угадывают сразу или никто, виновник из ниоткуда, улика только в ветке, разгадку объявляет персонаж | `story-mystery` |
| граф почти линейный, куда может свернуть сюжет, что может случиться дальше, хочу ещё ветку или финал — потянем | `story-branch` |
| примени одобренные правки, возьми вариант Б, покажи реплики до и после, не сломалось ли что, сократи до N минут или в одну сессию | `story-fix` |

## Реестр возможностей

`docs/capabilities.json` — что умеет чат: каждая фича с синтаксисом, примером, статусом
(`ready` / `partial` / `planned`) и описанием, как она выглядит в приложении.
`npm run prompt` собирает из него `docs/PROMPT.md` — промпт для генерации новых историй.

**Меняешь поведение чата — правь реестр в том же коммите.** Сборщик промпта сверяет его
с `engine.ts`: тег со статусом `ready`, которого движок не разбирает (или `planned`, который
уже работает), роняет сборку с объяснением. Так промпт не отстаёт от кода.

Когда реализуешь фичу из раздела «Задумано»: поменять `status` на `ready`, уточнить `syntax`
под то, что получилось, дописать `looks` и пример, выставить `since`.

## Договорённости

- Проектный `.claude/settings.json` отключает лишние плагины, коннекторы claude.ai и личные скиллы, чтобы освободить листинг
  скиллов проекта. Вернуть себе — `true` / `"on"` в `.claude/settings.local.json`.
- Код и комментарии на русском, комментарии — только там, где объясняют «почему», а не «что».
- Никаких зависимостей сверх необходимых: прототип должен собираться в один файл (`SINGLE=1 npm run build`).
- Стили по БЭМ: `block`, `block__element`, `block--modifier`, общие состояния через `is-`.
  Значения только из токенов `src/styles/tokens.css`; новый блок — новый файл в `blocks/`
  и строчка импорта в `src/styles/index.css`. Вложенные селекторы не использовать.
- Селекторы для тестов — `data-testid`, не классы: `home`, `tile-<id>`, `tile-teasers-<id>`, `tile-counts-<id>`, `upload`, `upload-input`,
  `upload-error`, `story`, `play`, `reset`, `story-back`, `export`, `delete-story`, `contacts`,
  `thread-<id>`, `chat`, `notice`, `notices`, `back-story`, `debug-home`, `mode-realtime`, `mode-click`, `mode-confirm`,
  `choice-log`, `choice-log-export`,
  `skip-next`, `revision-notice`, `revision-notice-ok`, `tile-free-<id>`, `free-chapters`, `chapter-locked`,
  `paywall`, `paywall-buy`, `paywall-stub`, `chapters-open`.
- Экраны внутри `.phone` — колонка на flex. У блоков, которые не должны ужиматься,
  ставь `flex: none` (на этом уже обжигались: обложка истории сплющивалась).
  И `width: 100%` у `.phone` не убирать: с автоотступами в flex-колонке он ужимается
  под содержимое, и ширина скачет от длины сообщений.
- Ветка по умолчанию — `master`, пуш в неё запускает деплой на Pages.
