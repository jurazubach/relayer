# S-kb — ревью

Вердикт: pass

## Исправил сам

- `SKILL.md`, «Формат результата»: пример строки приписывал `meaningful-choice:P-06` «цену до нажатия» и
  `story-choices/cost.md`. На деле P-06 — выбор ради выражения себя, target — `story-choices/choice-types.md`
  (сверено `kb-search.mjs`). Пример переписан.
- `references/mentor.md`, пример ink к `nicklin-writing-for-games:PAT-08`: `covered` писался и нигде не
  читался (`story:lint` C-01 — ошибка), а нюанс ниже утверждает «остаётся `false` и потом читается».
  Добавлено чтение после развилки; теперь ошибок 0.
- `references/lessons.md`, `references/exercises.md`: к `snyder-save-the-cat:LESSON-12` приписано «шесть
  теорий подряд дают противоречивые правки» — в источнике этого нет (там: писательница взяла из учебника
  один лист битов, Short советует взять у метода одно ограничение). Переформулировано по источнику.
- Закоммичены сырые данные полного прогона срабатывания `docs/lab/runs/triggers/2026-10-28-story-kb.json`
  и записи верности `docs/playbook/coverage/story-kb.json`.

## Доделать (если fail)

—

## Проверено

- `node docs/playbook/_build/checks/skill-check.mjs story-kb --min-refs 5 --min-scripts 1` — ✓, 0 предупреждений
  (до и после правок).
- `npm run story:coverage -- --skill story-kb --min L2` — ✓: 5 строк L3, `video-three-things:attention§3` L2;
  строк с `owner_via: cluster|refs` нет.
- `npm run lab:triggers -- --skill story-kb --runs 3 --min build` — полный прогон 340 проверок, сделан после
  коммита исполнителя (описание с тех пор не менялось, правки только в теле): `ok: true`, story-kb 42/42,
  ложных 0; соседи: brainstorm 1.00, review 0.97, mystery 0.95, choices 0.93, desk 0.93, voice 0.89,
  fix 0.88 — все выше `lab.triggers.min_share_build`; отказов в правах 17/340, ниже
  `lab.denials.max_invalid_share`. Перезапускать не стал: 1073 с, больше предела одного вызова.
- `npm run test:coverage` — 13/13; `story:coverage -- --summary` — без владельца 0, два владельца 0.
- `kb-index.mjs --check`, `kb-contradictions.mjs --check` — свежие; `--help` и `--json` у всех трёх скриптов
  работают (`kb-search` по `алиас:ID`, `A-01`, словам; `kb-contradictions --attn`; `kb-index --alias`).
- Флаги, на которые ссылаются references (`story:cold-read --mode voices|guess|opening --until`,
  `story:lint <путь> --summary`), существуют; все ключи `thresholds.json` из `contradictions.md` есть.
- Выборка верности `--fidelity-sample story-kb 20` — 6 пар (всего у скилла 6), все `ok`: SYS-5 (поддержано /
  спорно / решение — сохранены), PAT-08 и нюанс (условие «нет сомнения → инструкция», провал уговора,
  15–25 и 10–20 сообщений как в источнике), `attention§3` (уверенность «средняя», «сутки — наша оценка»),
  `#attn-contra`, `#attn-superseded`. Доля `bad` 0.
- Ручная сверка пунктов references с разборами: `attention-today:LESSON-05` (класс A, оговорка о переносе),
  `edgerton-hooked:LESSON-10` (данные о вебе, «наша оценка» сохранена), `narrative-testing:P-05`,
  `maass-fire-in-fiction:P-08`, `sheldon-character-storytelling:P-05` — ок; `snyder-save-the-cat:LESSON-12` —
  искажение, исправлено (выше).
- `scripts/kb/kb-clusters.mjs`: нюанс без своей опоры берёт тему родителя после разбора всех родителей; тест
  покрывает «родитель по ссылкам», «нюанс раньше родителя в списке» и «своя опора сильнее».
- Границы: изменения в разрешённых путях плюс отчёты и `docs/lab/runs/S-kb/` (как у соседних задач);
  `docs/books/*` не тронут; `CLAUDE.md` — одна строка таблицы; цитат из книг длиннее 15 слов нет
  (`attention.md` — нарезка нашего `attention-merged.md`); примеры придуманы, брендов в сюжетах нет.

## Замечания на будущее

- Полный `lab:triggers -- --skill story-kb` идёт ≈18 минут (семь соседей): конвейеру нужен сторож длиннее
  10 минут или прогон по `--file` (просьба исполнителя п. 1).
- `kb-index.mjs --check` и `kb-contradictions.mjs --check` не входят в проверку перед коммитом: индексы
  устареют при правке `owners.md` или споров (просьба п. 3) — решить на итоге волны.
- Маршрут «общий вопрос ремесла → скилл темы» в `_routing.json` (просьба п. 2) закрепит границу, которая
  сейчас держится только описанием `story-kb`.
- `env.skills` в прогоне срабатывания показывает только часть проектных скиллов (это листинг сессии, не
  проекта); стоит проверить на итоге волны, не режет ли бюджет листинга описания.
