# E-07 · Скрыть THE NUMBER и «Слепое пятно» из каталога — сборка

## Сделано
- `src/engine/story.ts` — необязательное поле `hidden?: boolean` в `Story`.
- `src/engine/flags.ts` — флаг `?all=1` (`FLAGS.all`).
- `src/engine/library.ts` — `catalogStories(stories, all)`: список главного без скрытых; `isHidden(id)`.
- `src/engine/useLibrary.ts` — `library.catalog` (главный) рядом с `library.stories` (все: поиск по `?story=`, выбор в отладке).
- `src/App.tsx` — главный получает `library.catalog`.
- `src/engine/useRouter.ts` — сохранённый маршрут в скрытую историю ведёт на главный (без `?all=1`).
- `src/engine/bundle.ts` — загрузка файла сохраняет `hidden: true` (раньше поле отбрасывалось).
- `src/stories/the-number/meta.json`, `src/stories/slepoe-pyatno/meta.json` — `"hidden": true`; сценарии не тронуты.
- `scripts/lib/story.mjs` — `listStories(dir, { hidden })`, `isHiddenStory(path)`, `SITE_BUILD`.
- `e2e/hidden.spec.ts` — 4 проверки: скрытая копия фикстуры не видна на главном и открывается по `?story=`; `?all=1` её показывает; сохранённый маршрут ведёт на главный; каталог = встроенные без `hidden` (по `meta.json`).
- `e2e/fixture.ts` — `BUILTIN` берёт видимую историю, новые `HIDDEN` / `VISIBLE`.
- `e2e/shots.spec.ts` — снимок `0-home-catalog`: главный без загрузок (одна карточка «Чужого голоса» и «Загрузить историю»).
- `docs/capabilities.json` (`storyfile`: `looks` и `note`), `docs/PROMPT.md` (пересобран), `README.md` (поле, флаг, сборка), `CLAUDE.md` (флаг в таблице параметров, пометка «скрыта» в таблице историй).

## Решения
- **Как `story:pack` пропускает скрытые при сборке сайта.** `story-pack.mjs` и `package.json` менять нельзя,
  поэтому решение живёт в `scripts/lib/story.mjs`: `listStories()` по умолчанию прячет скрытые только
  при `npm_lifecycle_event === 'postbuild'`, то есть когда story:pack зовёт `npm run build`. Ручной
  `npm run story:pack`, `--check`, `check:story`, `story:lint`, `story:*` видят все истории. Явный путь
  через `--site` записан в `requests.md`.
- **Скрытость действует и на загруженные истории.** Правило одно: `hidden: true` — не на главном, откуда бы
  история ни пришла. Поэтому e2e идёт на фикстуре (скрытая копия), а не на текстах наших историй.
- **Бандл сайта скрытые истории содержит**: иначе `?story=<id>` не смог бы их открыть. Не на Pages только
  `.json` в `dist/stories/`.
- **Панель отладки** показывает в выборе истории все, включая скрытые: это инструмент разработки.
- **Сохранённый маршрут** в скрытую историю ведёт на главный: иначе игроки, открывавшие THE NUMBER раньше,
  продолжали бы попадать в неё без флага.

## Проверки
- `npm run build` — ок, в `dist/stories/` только `chuzhoy-golos.story.json`.
- `npm run check:story` — ок, все три истории.
- `HEADLESS=1 npm run test:e2e` — 153 passed.
- `npm run prompt -- --quiet` — ок.
- `npm run story:pack -- --check` — ок (все три истории и examples).
- `SINGLE=1 npm run build` — ок.
- Дополнительно: `npm run test:lib` (33/33), `npm run test:story-cmd` (38/38), `npm run shots -- --project=phone` (снимок проверен глазами).

## Открыто
- `requests.md`: явный `--site` в `story-pack.mjs`/`postbuild`, README и selftest библиотеки.
- Хук проверки историй показывает у `the-number` 5 ошибок C-01 (переменные без чтения). Они были до задачи,
  текст сценария не тронут.
