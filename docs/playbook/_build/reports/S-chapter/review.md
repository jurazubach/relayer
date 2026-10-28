# S-chapter — ревью

Вердикт: pass

## Исправил сам

- `scripts/hooks/post-edit.mjs` — `checkStory(id, { quick, partial: mode === 'partial' })` явно передавал `partial: false`
  в режиме `full` и тем перекрывал умолчание `isPartial(id)`: агент с `full` в `MODE_BY_AGENT` проверял бы часть с
  `beta_stop` без `--partial`. Теперь `partial` не передаётся, `checkStory` сам смотрит `isPartial`; для `quick` /
  `partial` поведение то же (`test:hooks` 15/15).
- Выборка верности: 20 пар записаны в `docs/playbook/coverage/chapter-write.json` (`by=review`, все `ok`).
- Сырые прогоны `lab:triggers` (`docs/lab/runs/triggers/2026-10-28-chapter-write-2.json` от исполнителя и `-3.json`
  от ревью) добавлены в git.

## Доделать (если fail)

—

## Проверено

- **Приёмка, все три — ✓:**
  - `node docs/playbook/_build/checks/skill-check.mjs chapter-write --min-refs 8 --min-scripts 3` — ок, 0 предупреждений
    (15 references + `systems/`, 4 скрипта);
  - `npm run story:coverage -- --skill chapter-write --min L2` — все кластеры не ниже L2 (59 строк L3, 20 L2);
  - `npm run lab:triggers -- --skill chapter-write --runs 3 --min build --jobs 3` — `chapter-write` 100% (36/36),
    ложных 0% (0/222), 526 с; пороги пройдены. Промахи у соседей (`story-fix` 88%, `story-voice` 89%, `story-plan`
    90%) — их фразы, к этому скиллу не относятся.
- **Полнота по задаче.** `chapter-context` (facts.md первым, шапка, план и скелет, карточки, концы N−1 по путям с VAR
  и командой повтора `story:trace --route`), `docs/style.md` на шаге текста, оба режима, напоминания
  (`pause-lines.md`: `- (ask)`, 1–2 `#remind`, `#noanswer` / `#silent` не хуже — синтаксис сверен с
  `capabilities.json` `remind` / `noanswer`), `facts-anchor.md`, разметка (A-06/C-53), после главы — `full.mjs` и
  диагностические скиллы по таблице. Модуль `user-invocable: false`, описание — симптомы. Режим части в хуке по
  `beta_stop` (`isPartial` + `modeFor` над `MODE_BY_AGENT`), тест в `selftest.mjs`. Строка в таблице `CLAUDE.md`.
- **ID в SKILL.md** (`story:rule`): R-27, R-63, R-64, R-68, R-91, R-118, R-119, R-120, R-122, A-01/03/04/06, C-53,
  ST-35, `story-review/references/priority.md` — существуют.
- **Примеры ink:** `ink-compile.mjs --md` по всем references — 18 блоков, 0 ошибок; самопроверка
  `test:lint --only chapter-write` 5/5 (в т.ч. компиляция всех примеров).
- **Скрипты на трёх историях**, `--help` у всех четырёх: `chapter-context --json` (the-number гл. 2 и 3,
  slepoe-pyatno гл. 3, chuzhoy-golos гл. 6), `chapter-lint --quick --json` (те же), `ink-compile --story
  slepoe-pyatno --json`, `style-sample --topic pauses --json` — код 0, JSON разбирается.
- **Верность** (`--fidelity-sample chapter-write 20`, seed 55126218): snyder PAT-04, procedural P-15 / PAT-01,
  inkle LESSON-13 / PAT-08 / PAT-02#нюанс, R-27, skolnick P-12, dille RED-04 / P-04#нюанс / LESSON-09, mckee LESSON-04,
  emshort P-11, cron RED-05, schell P-08 / P-08#нюанс / LESSON-11, bateman P-17, maass RED-14 / P-07 — условия,
  исключения и уверенность сохранены; «наша оценка» у L4D и доски Снайдера не превращена в правило. bad 0 из 20.
- **Границы.** Имена контактов трёх историй и их id в skill не встречаются; длинных цитат (кавычки от 90 знаков)
  нет; `docs/books/*` и `_build/*` (кроме отчётов) не тронуты.

## Замечания на будущее

- **Пути вне списка:** `docs/playbook/thresholds.json` (+4 ключа `skill.chapter.*` с `basis` и `history`) и
  `docs/lab/runs/S-chapter/` — так делали и прошлые скиллы (S-plan, S-kb), но в «разрешённых путях» задачи их нет;
  королеве — внести в шаблон задачи скилла.
- **Владение по кластеру.** Через K-R-29 к TH-25 приписаны строки, по смыслу у `story-pace` (`mckee:RED-02`, RED-07,
  `schell:RED-12`, LESSON-11, `snyder:RED-06`) и `story-pauses` (`maass:RED-14` — пустое возвращение); через K-R-91 к
  TH-26 — `dille:RED-04`, `mystery-fair-play:RED-03` (у `story-continuity` / `story-mystery`). В references они
  поданы как «если → то» со ссылкой на владельца, но в `owners.md` их стоит перенести в «опору» TH-NN владельцев.
- Числа из книг в прозе nuance-блоков («до десяти карточек на ряд», «в пяти местах и больше», «короче четырёх
  реплик») — не ключи `thresholds.json`; skill-check их не ловит. Для пишущего скилла некритично, но при калибровке
  стоит завести ключи или сослаться на `C-36.static_min_lines`, `C-46.button_nodes`.
- `chapter-context.mjs`: путь в разделе «Стык» склеивает прогоны с одинаковым видимым концом, и строка «VAR, которыми
  путь отличается» показывает разброс внутри склейки (`theo_trust=2|4|3`) — читается двусмысленно; уточнить подпись.
- Из `requests.md`: негатив «Напиши главу 2 начисто по плану» в `story-plan.json` → `expect: chapter-write`; флаг
  `--chapter` у `story:lint` — по желанию инфраструктуры.
- Живой прогон написания главы по скиллу не делался — его покажут Э4/Э6.
