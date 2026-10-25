# S-time · Скилл story-time — сборка

## Сделано

- `.claude/skills/story-time/SKILL.md` — модуль (`user-invocable: false`, `metadata.version: 1`), описание из
  симптомов (284 знака), 9 шагов: STATUS → `story:lint` C-27/31/32/37 → `story:sessions` → `promise-scan` →
  `guilt-scan` + `story:trace --compare silent` → `clock-scan` + `click-transcript` → обязательная сверка с ink и
  правилом → правка (с `docs/style.md` §8 в шаге письма) → отчёт и состояние через `story-desk`.
- `references/` (15): `decisions-time.md` (развилки «симптом → замер → решение»), `patterns-time.md` (9 приёмов,
  ink компилируется), `clock.md` (TH-47, TH-48, C-27), `reminders.md` (TH-46, C-32), `no-guilt.md` (TH-51, TH-52,
  C-37), `modes.md` (TH-45, кнопка «пропустить»), `length.md` (TH-49, C-31), `replay.md` (TH-50), `attention.md`
  (5 якорей + три `attention§3`), `flags.md`, `lessons.md`, `contradictions.md`, `explain.md`,
  `systems/realtime.md`, `sources.md` (сгенерирован).
- `scripts/` (4): `promise-scan.mjs` (паузы, окно до и строка после, сроки возвращения по тексту — места из
  экспорта `pausePlaces` C-27), `guilt-scan.mjs` (упрёки с контекстом, давление, напоминания — `reproachContexts`
  C-32, `pressureLines` C-37), `clock-scan.mjs` (время игрока, метки мира, «сплю → утро», свой `#sys` у скачка,
  нагрузка по суткам от старта — `sleepMorning`, `dayLoad` C-32), `click-transcript.mjs` (обёртка над
  `story:trace --mode click --json` с пометками того, что ломается без ожидания).
- Проверки: `C-27.mjs` (экспорт мест, образец окна из прогона без причины, два исключения из базы),
  `C-32.mjs` (экспорт помощников, контекст упрёка по решению T-08), `C-37.mjs` (напоминания не в счёт главы,
  срок в напоминании — по-прежнему находка). Тесты — `scripts/lint/selftest-story-time.mjs` (5).
- `thresholds.json` — только записи `history` S-time у `C-27.long_h`, `C-32.no_answer_reproach`, `C-37.per_chapter`.
- `owners.md` — в «опору» TH-46 `attention:RED-07`, TH-47 `narrative-postmortems:LESSON-08` (+ абзац в §5);
  `sessions-view.mjs` заменён на `story:sessions` / `clock-scan.mjs`; скрипты у C-32, C-37. `clusters.json` пересобран
  (свеж, без изменений).
- `docs/lab/triggers/story-time.json` (13 позитивных, 7 негативных); прогоны — `docs/lab/runs/S-time/`.

## Решения

- **Граница упрёка (T-08) в коде, а не только в скрипте.** Контекст строки: `silent` (ответ на нажатый `#silent`
  до паузы — можно), `button` (ответ на кнопку — смысл судит C-47), запрещены `remind`, `noanswer`, `fallback`
  (после напоминаний), `pause` (после паузы истории — даже после `#silent`, по R-74). Сняло ложное «Спасибо.
  Наконец-то.» в slepoe-pyatno; m10 ловится.
- **C-27: два исключения из нюансов базы** — «Прочитано» без ответа (тишина-событие) и стык глав после срока
  события мира. Предупреждения 22/0/2 → 20/0/0 (chuzhoy / slepoe / the-number). Остальные подсказки (причина
  другими словами) не лечу словарём: это шаг сверки с ink.
- **«Нагрузка по суткам»** в `clock-scan` — сутки от старта прохождения, явно подписаны «не часы игрока»; пик
  возвращений совпадает с C-32 п. 1. Свой `#sys` «Три недели спустя» — законный скачок дальше паузы, не дубль.
- **Отменённое** (PAT-03 и GREEN-05 messenger, «время ждёт игрока», срок в PAT-03 chat-fiction, PAT-10 np) —
  блоками «что советовал источник → что отменено → что в силе», без `--record` (coverage.json не в моих путях).
- **Своих F-NN нет** — в формате находки поле правки ссылается на приём владельца или `patterns-time.md`.

## Проверки

- `skill-check.mjs story-time --min-refs 9 --min-scripts 4` — ✓, 0 предупреждений.
- `story:coverage -- --skill story-time --min L2` — ✓; 88 строк: L3 74, L2 14 (RED без мутантов, устаревшие
  приёмы, уроки о повторе). `--summary`: без владельца 0, два владельца 0; story-choices не просел.
- `lab:triggers -- --skill story-time --runs 3 --min build` — ✓: story-time 92% (36/39), ложных 6% (6/96);
  story-choices 91%, story-desk 89%. Мимо: «Как протестировать паузы…» → none.
- `skills:test -- --skill story-time` — ✓ 5/5 мутантов, 10/10 попаданий, отказов в правах 0.
- `test:lint` — 91/91. Также зелёные: `skills:test --lint-only` (23/23, основа чистая), `test:story-cmd`,
  `test:lib`, `test:coverage`, `test:lab:mutants`, `test:hooks`, `story:pack --check`, `prompt --quiet`, `build`.
  `check:story` и `test:e2e` не гонял целиком повторно: `src/` не менял.
- Скрипты против команд на трёх историях (`docs/lab/runs/S-time/*.scripts.txt`): C-27 в `promise-scan` = `story:lint`
  (0/0/4, 0/0/0, 0/20/33); время по клику и в реальном времени в `click-transcript` = `story:trace`; пик
  возвращений chuzhoy 9 = C-32; C-37 shout 2 = линт.

## Открыто

- Ложные 6%: две фразы `story-pauses` («глава обрывается…», «игрок вернулся и не помнит…») уходят в story-time —
  скилла `story-pauses` ещё нет. Перепроверить, когда он появится.
- `story:trace --compare silent` и текст `checks.md` C-27 / C-32 п. 7 отстают от кода — `requests.md` п. 1–3.
- `docs/style.md` ST-66 ещё пишет «deferred:E-02» — `requests.md` п. 4.
- **автору:** старт с главы и пропуск прочитанного для повтора — кандидат в `capabilities.json` (`planned`), п. 6.
- Строки `messenger-genre:PAT-07`, `RED-11`, `LESSON-09` по смыслу у `story-choices` — п. 5.
