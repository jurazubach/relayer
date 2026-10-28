# E-07 — ревью

Вердикт: pass

## Исправил сам
Ничего: правок не потребовалось.

## Доделать (если fail)
—

## Проверено
- Полнота по пунктам задачи:
  - поле `hidden?: boolean` есть в `Story` (`src/engine/story.ts`), в `capabilities.json` → `storyfile` (`looks`, `note`) и в README (поле в примере meta.json, пояснение, флаг, строка про `npm run build`). `parseStoryFile` теперь сохраняет `hidden` у загруженных файлов;
  - главный получает `library.catalog` (без скрытых), а `library.stories`, по которому работают `?story=` и отладка, остался полным. `ui` не тронут, он по-прежнему чистый;
  - `?all=1` добавлен в `flags.ts`, в таблицы параметров CLAUDE.md и README;
  - `hidden: true` стоит в `meta.json` у `the-number` и `slepoe-pyatno`. `.ink` не тронуты, дифф только в meta.json;
  - `story:pack` при сборке сайта: `listStories()` прячет скрытые только при `npm_lifecycle_event === 'postbuild'`. После `npm run build` в `dist/stories/` лежит только `chuzhoy-golos.story.json`. Ручной `story:pack -- --check` видит все три истории и examples;
  - `story:*`, `check:story`, `scripts/lib` видят все истории: `check:story` прогнал три истории, `story:endings the-number` работает, `story:status --all` из хука показывает три;
  - e2e `e2e/hidden.spec.ts` (4 проверки) работает на скрытой копии фикстуры и на `meta.json` каталога. Снимок `0-home-catalog` в `shots.spec.ts` снимает главный без загрузок;
  - в CLAUDE.md в таблице историй стоит пометка «скрыта» и абзац о решении от 28.10.
- Приёмка, все с кодом 0: `npm run build`, `npm run check:story`, `HEADLESS=1 npm run test:e2e` (153 passed), `npm run prompt -- --quiet` (в рабочем дереве без изменений), `npm run story:pack -- --check`, `SINGLE=1 npm run build` (`dist-single/index.html`).
- Дополнительно: `npm run test:lib` 33/33, `npm run test:story-cmd` 38/38, `tsc -b`.
- Границы: правки только в разрешённых путях. Исключения — `docs/PROMPT.md` (его пересобирает `npm run prompt` из реестра, так и положено) и отчёты в `_build/reports/E-07/`. `docs/books/*` не тронут. Новых зависимостей нет.

## Замечания на будущее
- Сборка сайта узнаётся неявно, по `npm_lifecycle_event`. Работает, но в `story-pack.mjs --help` этого не видно. Просьба из `requests.md` разумная: сделать флаг `--site` в `story-pack.mjs` и `postbuild` и убрать `SITE_BUILD` из библиотеки. Её стоит взять отдельной задачей вместе с README библиотеки и случаем в `scripts/lib/selftest.mjs`.
- Сохранённый маршрут в скрытую историю ведёт на главный. Значит, тестер, который открыл скрытую историю по `?story=`, после перезагрузки без флага окажется на главном. Это задумано, но тестерам скрытых историй надо давать ссылку с `?story=`.
- Бандл сайта по-прежнему содержит тексты скрытых историй: без этого `?story=` не сработал бы. Скрытость здесь не защищает от спойлеров. Если историю понадобится убрать с Pages целиком, нужна отдельная задача.
