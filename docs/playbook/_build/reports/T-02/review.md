# T-02 — ревью

Вердикт: pass

## Исправил сам

Ничего: блокирующих мелочей не нашёл.

## Доделать (если fail)

—

## Проверено

- **Приёмка, все команды прогнал сам:** `npm run build` (с `postbuild` → `dist/stories/*.story.json`), `npm run check:story`,
  `HEADLESS=1 npm run test:e2e` (60 passed), `npm run prompt -- --quiet`, `npm run story:pack -- --check`
  (5/5 без потерь), `npm run kb:clean -- --quiet && npm run kb:clean -- --verify` (✓). Сверх приёмки:
  `npm run test:lib` (29/29), `npm run graph`, `SINGLE=1 npm run build` — всё ок.
- **Старые команды не сломаны.** Распаковал `build/main` в scratchpad и сравнил `check:story --seed 7`
  на трёх историях: 521 строка совпадает, отличается только путь (`.json` → папка).
- **Без потерь против исходных файлов.** `story:pack -- --flat` по каждой из трёх папок даёт `ink`,
  совпадающий байт в байт с прежним `src/stories/<id>.json`. В метаданных добавлены только `revision` и `days`.
  `story:unpack` старого `the-number.json` в чистую папку даёт файлы, равные закоммиченным, кроме двух новых полей в `meta.json`.
- **Полнота по пунктам задачи:** папки и три разложенные истории; INCLUDE в браузере собирается через
  `JsonFileHandler`, и это проверяет e2e-тест на встроенной истории. Есть `story:pack` / `story:unpack` / `--check`, `--help`, `--json`.
  `library.ts` читает папки через glob, папка вытесняет одноимённый `.json`; так же устроены `listStories`, `--check`
  и `e2e/fixture.ts`. Загрузка `.json` с `includes` покрыта e2e, загрузка `.ink` и старого `.json` работает как раньше
  (прежние тесты зелёные). `scripts/lib/story.mjs` читает папку, `.json` с `includes` и без, а также `.ink`.
  Тип `Story` (`revision`, `minutes`, `days`, `free_chapters`, `includes`, `Character.voice` / `arc`),
  README, `CLAUDE.md` (команды, проверка перед коммитом, `scripts/lib/`, «Как добавить историю»)
  и `capabilities.json` (`storyfile`) обновлены в том же коммите. `story-terms.mjs` переведён на `scripts/lib/story.mjs`.
- **`voice` / `arc` не на экране:** `src/ui/StoryScreen.tsx` не тронут и выводит только `name`, `role`, `about`.
- **Границы.** Вне списка разрешённых путей правлены только `docs/PROMPT.md` (его пересобирает `npm run prompt`
  из реестра, иначе отстал бы) и отчёты в `_build/reports/T-02/`. `ui` и `docs/books` не тронуты, новых зависимостей нет,
  код и комментарии на русском, реальных брендов в новых текстах (`demo`, README) нет.
- **Отступление от T-01 обосновано.** T-01 просил «узлы главного файла — до INCLUDE», но inkjs читает `INCLUDE` после узла как реплику.
  Поэтому узлов в главном файле нет совсем, а общее вынесено в `common.ink`. Правило записано в README и `CLAUDE.md`,
  его проверяет `layoutProblems`.

## Замечания на будущее

- `sizeLabel` уже принимает дни, но карточка их не показывает: нужна правка `ui` (`requests.md` п. 1).
  Пока замысел «два числа на карточке» не выполнен.
- У «Чужого голоса» `days: 7.3` при потолке замысла около 3 дней. Это задача на правку истории; сверять дни с замером должен `story:lint` (T-03, C-31).
- `layoutProblems` пока зовёт только `story:pack`. T-03 должен подключить его в `story:lint` (`requests.md` п. 4).
- `useGame` пересобирает историю по ссылке на `story.includes`. Сейчас ссылка стабильна: для встроенных историй её даёт glob,
  для загруженных — `useState`. Если кто-то начнёт пересоздавать объект истории при каждом рендере, история будет компилироваться заново.
- Ссылки «номера строк по полю `ink` из `src/stories/*.json`» в `story-findings.md` и `REVIEW.md` устарели (`requests.md` п. 3).
  Сделать то же можно через `story:pack -- --flat --out …`.
- Автотеста, что старые сохранения грузятся в новую сборку, нет: исполнитель проверил это вручную, 12 из 12.
