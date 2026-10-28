# S-branch — ревью

Вердикт: pass

Попытка 2. Содержимое скилла уже слито в `build/main` (43e4b44, вручную королевой) и с тех пор не менялось:
дифф ветки против `build/main` — только отчёт `build.md` (раздел «Попытка 2») и прогон
`docs/lab/runs/S-branch/triggers-own-attempt2.json`. Разбор качества первой попытки (ядро, references,
скрипты, выборка верности 20/20, границы) — в истории этого файла (коммит ревью попытки 1) и остаётся в силе.

## Исправил сам

- Закоммитил полный прогон приёмки `docs/lab/runs/triggers/2026-10-28-story-branch-4.json`, который лежал
  неотслеженным.
- Записал выборку верности попытки 2 (4 пары) в `docs/playbook/coverage/story-branch.json`.

## Доделать (если fail)

—

## Проверено

- `git merge-tree build/main HEAD` — слияние чистое (`build/main` ушёл вперёд на S-plan, ветка трогает только
  свои отчёты и прогоны).
- `node docs/playbook/_build/checks/skill-check.mjs story-branch --min-refs 8 --min-scripts 2` — ✓, 0
  предупреждений.
- `npm run story:coverage -- --skill story-branch --min L2` — ✓ все кластеры не ниже L2.
- `npm run lab:triggers -- --skill story-branch` — полный прогон есть: `2026-10-28-story-branch-4.json`
  (348 проверок, 1136 с, `ok: true`). story-branch: попадания 42/42, ложных 1/294 (0,3 %; фраза
  `story-cast` про неизвестный номер-союзника, просьба 4). Соседи `story-brainstorm` 40/41, ложных у
  story-branch от `story-brainstorm` нет, так что риск из `align.md` (утечка «дай варианты») на слитой ветке
  не подтвердился. Отказы в правах (12) — в чужих фразах, на составных Bash-командах соседей.
- Скрипты `branch-budget.mjs` и `branch-impact.mjs` с `--json` — работают на the-number, slepoe-pyatno,
  chuzhoy-golos.
- Выборка верности `--fidelity-sample story-branch 4 --seed 49372990`: R-32, `snyder-save-the-cat:RED-08`,
  `emshort-structures:P-03#нюанс`, `ashwell-standard-patterns:P-10#нюанс` — 4/4 ok: условия, исключения
  («значение 0 — тоже черта», «кроме финалов и сцен-наград»), масштаб сохранены, пороги заменены ключами
  (`C-11.refusal_hops`, `C-15.rare_branch_*`, `C-43.bare_end`), пример ink с `varya` придуманный.

## Замечания на будущее

- Замечания попытки 1 в силе: `branch-core.mjs` считает долю игроков у одинаковых кнопок одного узла по
  префиксу текста; нулевые строки глав без развилок не печатаются; «3–5 ходов» в ядре — размер ответа без
  ключа. Для `plan-compare` из S-plan (просьба 2 исполнителя) первое стоит починить до того, как он начнёт
  звать `branch-budget.mjs --json`.
- Фразу `story-cast` про неизвестный номер, ставший союзником, итогу волны отдать одному владельцу.
- Полный `lab:triggers --skill story-branch` идёт ≈ 19 минут — дольше одного вызова переднего плана; конвейеру
  нужен больший таймаут или прогон частями.
