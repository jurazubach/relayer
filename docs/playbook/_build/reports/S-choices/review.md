# S-choices — ревью

Вердикт: pass

## Исправил сам

- `references/decisions-choices.md` (`meaningful-choice:P-02#нюанс`): в примере ставки стояло имя «Мая» —
  героиня «Чужого голоса» (пришло из неочищенного разбора). Заменил на «Вера»: примеры придуманные, не из наших историй.
- `references/silence.md` (`vogler-writers-journey:PAT-06`, «Когда не работает»): у источника это история короче
  15 минут, в reference стало «короче нескольких десятков минут». Условие исказилось, а ключа под это число нет.
  Переписал: «совсем короткая история, на одну короткую сессию». Пара из выборки верности записана как `bad`, в заметке
  сказано, что исправлено.
- Выборка верности (20 пар) записана в `docs/playbook/coverage.json` с `by=review`.

## Доделать (если fail)

—

## Проверено

- `skill-check.mjs story-choices --min-refs 12 --min-scripts 3 --fixes F-07,F-08,F-11,F-14`: ✓, 0 предупреждений.
  Повторил после моих правок, примеры ink компилируются.
- `story:coverage -- --skill story-choices --min L2`: ✓, все кластеры не ниже L2. Повторил после записей верности.
- `lab:triggers -- --skill story-choices --runs 3 --min build` (`--no-save`): попадания 97 % (38/39), ложные 0 % (0/12).
  Один промах — тот же, что у исполнителя («проверь развилки во второй главе…»: 1 раз из 3 выпало `none`). Порог пройден.
  `--check-env` пишет «скилла нет в листинге». Это ложная тревога про `user-invocable: false`, см. `requests.md`.
- `skills:test -- --skill story-choices --min` (`--no-save`): 4 мутанта × 2 прогона, полнота 8/8 (100 % ≥ 80 %).
  Все попадания — в узле дефекта и со своей C-NN (m02 C-01, m14 C-10, m20 C-12, m24 C-11).
- `test:lint`: 80 из 80.
- Скрипты `choices`, `echo-map`, `position-bias`, `people-balance`: у всех работает `--help`. С `--json` дают валидный JSON
  на the-number, slepoe-pyatno, chuzhoy-golos. Человеческий вывод сверил выборочно: в the-number гл. 4 косметических 60 %
  с меткой «!», у `theo_trust` пометка «только финал»; в slepoe-pyatno C-16 — последняя кнопка, 92 %.
- `dict.refusal`: `T.re` собирает его с флагами `iu`, поэтому `\p{L}` работает. Проверил на строках. «это странно. я пас»,
  «откажусь» и «не стану.» — отказ. «паспорт у тебя?» и «нету» — не отказ. История ключа и `calibrated_on` записаны.
- `C-19.mjs`: правка только в тексте сообщения для случая с видимым простым выходом. Условие, ключ и тест прежние.
- Глубокая сверка: целиком прочитал `people-choice.md`, `fixes/F-14-menace.md` и часть `silence.md`. Пять пунктов сверил
  с `docs/books/_clean`: `narrative-postmortems:P-05` и его нюанс, `maass-fire-in-fiction:P-06`, `vogler:PAT-06`,
  `mckee-story:P-10`. Смысл и исключения сохранены, «когда не работает» есть, `basis` честный (model / secondary).
- Выборка верности `--fidelity-sample story-choices 20`: 19 ok, 1 bad (vogler PAT-06, исправлен). Доля ok 95 %, порог
  `lab.fidelity.min_share` — 0.9.
- Границы. Правки в разрешённых путях. Кроме них: `coverage.json` (статусы `merged-into` и записи через `--record` —
  этого требует сама задача) и `_build/reports/S-choices/` (отчёт). В `docs/books/*` правок нет. Цитат из книг длиннее
  15 слов нет. Реальных брендов в references нет: игры и студии из разборов обезличены.
- Ядро `SKILL.md`: 88 строк. Алгоритм из 9 шагов, каждый ведёт в команду или reference. Описание сформулировано симптомами
  автора. Числа даны ключами.

## Замечания на будущее

- **Чужие по смыслу строки с `owner_via: cluster|refs`** — королеве перенести в «опору» нужного TH-NN в `owners.md`:
  - `story-time`: `choiceofgames-design:GREEN-12` (причина у паузы ≥ 30 мин), `choiceofgames-design:LESSON-02`
    (объясняй паузу, быстрый режим);
  - `story-pace`: `choiceofgames-design:RED-11` (стена текста без выбора), `narrative-postmortems:RED-01` (коридор
    без кнопки), `attention-today:P-01`, `RED-01`, `LESSON-01` («8 секунд»);
  - `story-branch`: `skolnick-video-game-storytelling:LESSON-07` («лоза»), `sheldon-character-storytelling:LESSON-03`
    (своди ветки);
  - `story-endings`: `emshort-structures:RED-02`, `procedural-storytelling:RED-10`, `mobile-interactive-stories:RED-11`
    (финал по скрытой проверке, вина за невидимый порог);
  - `story-voice`: `nicklin-writing-for-games:RED-21`, `SYS-5` (регистры письма).
- Числа из источников часто уходят в слова без ключа: «за 1–3 сообщения» → «за несколько», окно 2–12 сообщений,
  ориентир 50 % у `meaningful-choice:P-09`. Смысл это сохраняет, но для L3 этим строкам нужны ключи. Где проверки
  нет, это вопрос к T-задаче на пороги.
- `skill-check` не ловит имена героев наших историй в примерах. Стоит сверять с `characters[].name` из `meta.json`.
- `story:coverage --record` идёт ~50 с на запись: 20 записей выборки — около 17 минут. Нужен пакетный `--record`.
- Просьбы исполнителя в `requests.md` обоснованы: тест C-11 на отказ в середине кнопки, `--compact` для `sources.md`,
  `checkEnv` для `user-invocable: false`, строгий `matchFinding`. Первая и последняя важнее всего: расширение
  `dict.refusal` пока без теста в `test:lint`.
- Соседей нет в worktree, поэтому 6 отрицательных фраз с `expect` ещё не гонялись. Перехват повторить после сборки соседних скиллов.
