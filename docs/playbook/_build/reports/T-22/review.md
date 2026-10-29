# T-22 — ревью

Вердикт: pass

## Исправил сам

Ничего: правок не потребовалось.

## Доделать (если fail)

—

## Проверено

- **Границы.** `git diff --name-only master...HEAD` (41 файл) сверил скриптом с разрешёнными путями.
  - Вне путей задачи только `CLAUDE.md`, общий файл. В нём одна строка: «C-01…C-54» → «C-01…C-55».
  - Ещё отчёты `_build/reports/T-22/`.
  - `docs/books/*` и `_build/*` (кроме отчётов) не тронуты.
- **Приёмка** (сам, все ✓):
  - `test:lint` — 189/189, `selftest-t22.mjs` подхватывается по маске `selftest-*.mjs`;
  - `test:story-cmd` — 39/39;
  - `check:story` — код 0;
  - `story:lint --story chuzhoy-golos --strict` — ошибок 0, предупреждений 2, код 0;
  - `revision-check --story chuzhoy-golos` — ✓ «против 4139577 (тега нет; там revision 2 → 3)», без `--from`;
  - `story:pack -- --check` — ✓;
  - `build` — ✓.
- **Дефект ревизии воспроизведён.** Скопировал новый `revision-check.mjs` в отдельный worktree на `master`. Там без
  `--from` он даёт ✗ «против e5c0994: end_ellie_together, fin_silence — выборов 3 → 4, revision та же (2)», код 1.
  Значит, опора «коммит смены revision» ловит именно сломанный случай из W5. На трёх историях без изменений: у
  `slepoe-pyatno` и `the-number` по-прежнему ℹ «первый выпуск». `--json` даёт новые поля `base` и `bumped`.
- **Набор волны 1.** Собрал `playtest-kit --chapters 10` в scratchpad (в `kit.json` `chapters: 10`). Получившийся
  `chuzhoy-golos-w1.story.json` побайтно совпадает с тем, что в ветке. Набор актуален ink, `revision` 3.
  - В записках `wave-1/*.md` слова «глава» нет.
  - `--dry-run` (`--chapters 10` и `--chapters 2`): «готово начало», точка анкеты — по последним репликам Элли на трёх
    путях, формулировка своя для каждого режима. «Глав…» осталось только в служебной строке консоли.
  - D-11 в `decisions.md` есть.
- **C-49 (и) и C-55** на трёх историях:
  - C-49 (и) ловит `the-number`, `features 4` «Главы открывают…»: подсказка, владелец `story-release`.
  - C-55 ловит `the-number` `ch3`: кнопки сразу за `#chapter`.
  - У «Чужого голоса» находок нет ни по одной.
  - Ключи `C-49.chapter_word`, `C-55.buttons`, `C-55.from_chapter`, `lab.playtest.brief.quote_words` заведены в
    `thresholds.json` с `basis`, источниками и историей.
  - Разделы в `checks.md` есть. Владелец C-55 — `story-pauses` (`owners.md` §2 и §3), итог «C — 55».
- **references A-08.** `grep` по `story-pauses`, `story-opening`, `story-time`: мест, где заголовок главы считается
  видимым игроку, не осталось.
- **card-check** на трёх историях: строка «героев N; глав для автора M (… игрок их не видит)». `--json` валиден.
- **story-status --check:** ⚠ «у 2 историй…», код 0. Тексты К10 и `decisions-desk.md` — «флаг без слова автора не
  снимать».
- **Права.** `allowed-tools`:
  - у `story-core` и `story-plan` — `Edit(src/stories/**)`, `Edit(docs/stories/**)`;
  - у `story-release` — `Edit(src/stories/*/meta.json)`.

  Живой `claude -p` сам не повторял (тратит Opus). В отчёте исполнителя 0 отказов в двух прогонах после маркера в
  описании.
- **story:rule.**
  - `'#attn-return-silence'` и `attn-return-silence` — раздел из `attention-merged.md`, `--brief` работает.
  - Неизвестный `#attn-…` — внятная ошибка.
  - `C-55` находится.
  - В `story-kb/SKILL.md` про кавычки сказано; пример в `kb-search.mjs` тоже работает.
- **Не по приёмке:**
  - `test:hooks` — 21/21;
  - `test:coverage` — ✗ 12/13, единственная причина — `coverage.test.mjs:531` (`54` против `55`), см. ниже.
- Выборку верности `story:coverage --fidelity-sample` не делал. Нового знания из книг задача в references не
  вносила: правки A-08 и C-55 опираются на решение автора, а не на разборы.

## Замечания на будущее

1. **Срочно до F-docs: `scripts/kb/coverage.test.mjs:531` `54 → 55`** (`requests.md` п. 1). Без этого
   `test:coverage` из проверки перед коммитом красный сразу после слияния. Файл вне путей T-22, поэтому сам не правил.
2. Справка «C-01…C-54» в `scripts/lint/lint.mjs`, `selftest.mjs` (`--help` и название теста) и
   `scripts/lint/README.md` — `requests.md` п. 2.
3. **Срабатывание мерили `--file`, а не `--skill`, как требовала задача.** Причина в отчёте честная: по 10 минут на
   вызов `--skill` не укладывается. Но это сужение: маршруты соседей к этим скиллам не перемерены. Королеве решить,
   хватит ли этого или нужен прогон `--skill` с `--runs 1` по частям.
4. Фраза «тёмный паттерн…» в `story-release.json` — 0/3, «none». Не снята: это не спор двух скиллов. Решить в
   F-docs (`requests.md` п. 6).
5. C-39 (г) и C-55 пересекаются на стыке после долгой паузы, на одном месте две находки (`requests.md` п. 3).
6. `story-core.json` — позитив «запиши ядро в шапку» (`requests.md` п. 4). Строку перемера — в `docs/lab/journal.md`
   (`requests.md` п. 5).
7. Автору: тег `chuzhoy-golos-r3` — после деплоя. До тега `revision-check` опирается на коммит 4139577.
