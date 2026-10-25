# S-cast — ревью

Вердикт: pass

## Исправил сам

- `references/patterns-scenes.md`: у всех четырёх приёмов не было поля «Масштаб» (контракт `type-skill.md`: у
  `patterns-*` те же поля, что у `decisions-*`). Дописал «Масштаб» и вынес `basis` отдельной строкой; «свидетель
  пишет через час» → «спустя долгую паузу» (число без ключа).
- `references/patterns-cast.md`: у `dille-ultimate-guide:PAT-01` не было «Масштаба» — дописал.
- `docs/playbook/coverage.json`: записал выборку верности (20 пар, `by=review`).
- Добавил в коммит сырые данные своих прогонов: `docs/lab/runs/triggers/2026-10-25-story-cast*.json`,
  `docs/lab/runs/mutants/2026-10-25-story-cast.json`.

## Проверено

- Полнота: SKILL.md (модуль, `user-invocable: false`, описание симптомами, 9 шагов, STATUS.md первым, сверка с ink
  перед отчётом, `docs/style.md` в шаге правки, границы поимённо, формат находки, «Состояние», «Объясни», версия);
  13 references + 7 систем (минимум 8), `arcs.md` есть; 3 скрипта (минимум 2); C-50 поправлена по решению
  S-choices-v2, тест — `scripts/lint/selftest-story-cast.mjs` (5 тестов); фразы — `docs/lab/triggers/story-cast.json`.
- Приёмка, все зелёные:
  - `skill-check.mjs story-cast --min-refs 8 --min-scripts 2` — ок, 0 предупреждений (до и после правок; ink компилируется);
  - `story:coverage -- --skill story-cast --min L2` — все кластеры ≥ L2 (132 строки: L3 — 62, L2 — 70);
  - `lab:triggers -- --skill story-cast --runs 3 --min build` — story-cast 93 % (39/42), ложных 0 %; мимо та же фраза
    про `role`/`about`; story-choices не перехвачен (93 %); 6 недействительных прогонов — отказы Bash на чужих фразах;
  - `skills:test -- --skill story-cast` — m06, m07 найдены 4/4, отказов 0;
  - `test:lint` — 96/96; дополнительно `test:coverage`, `story:coverage -- --summary` — ок.
- Границы: вне путей задачи правлены только `thresholds.json` (новый ключ `C-50.noise_share` рядом с `C-50.*`,
  записи `history`), строка C-50 в `checks.md`, `docs/lab/runs/S-cast/`, отчёты — всё это разрешено
  `type-skill.md`. В `docs/books/*` и `_build/*` (кроме отчётов) — ничего. Брендов и длинных цитат нет.
- C-50: прочитал дифф. Места C-10 `wrong_responder` берутся вызовом C-10 и сверкой узла/адресата/текста (с
  вставками `{…}`); «Прочитано» в чате адресата, закрывающая кнопка, вопрос после прошлой развилки, (в) доза шума.
  На трёх историях: the-number — 0 C-50, slepoe-pyatno — 2 (ch2 «в пустоту», гл. 4 канал argus 13 %),
  chuzhoy-golos — 0; совпадает с отчётом исполнителя.
- Скрипты: `cast.mjs`, `unlock-plan.mjs`, `arcs.mjs` — `--help` и `--json` (валидный JSON) на трёх историях;
  уровни `cast.mjs` совпадают со `story:cast --json` (chuzhoy-golos сверен поконтактно).
- Ключи: все `` `x.y` `` в скилле существуют в `thresholds.json`; числа в тексте — только масштаб «5 / 50».
- Верность: `--fidelity-sample story-cast 20` — 20/20 ok (доля bad 0 при `lab.fidelity.min_share` 0.9). Потери
  мелкие: «8 из 10» слепого теста (procedural P-06), «1–3 сообщения за главу» → «немного» (video contra-3), «1–3
  сообщения до перемены» → «пара» (procedural P-09). Отдельно сверил с `docs/books/_clean`: `systems/weakness.md` ↔
  truby SYS-3 (нюанс и «наш вывод» про обратный ход сохранены), `systems/opposition.md` ↔ truby SYS-4 (требования,
  короткая форма, ошибки — сохранены), `patterns-scenes.md` (опоры P-08, P-13, P-14 на месте).

## Замечания на будущее

- `owner_via: cluster` со смыслом чужих скиллов (перенести в «опору» нужного TH-NN в `owners.md`):
  `edgerton-hooked:GREEN-04`, `RED-07` (переменная главы 1 в условии финала — `story-endings`/`story-choices`);
  `vogler-writers-journey:LESSON-09` (последствия от сказанного — `story-choices`/`story-continuity`);
  `sheldon-character-storytelling:LESSON-02` (крючок уведомления — `story-pauses`), `PAT-06` (тон в развилке
  «только реплика» — `story-choices`); `nicklin-writing-for-games:RED-14` (тон главы — `story-pace`/`story-voice`).
- `references/lessons.md` (video-three-things:LESSON-05) по сути описывает нашу историю («пилот и сезон») — пересказ
  взят из `_clean`, но kb:clean стоит проверить на такие строки.
- Просьбы исполнителя (`requests.md`) разумны: экспорт `wrongResponders` из C-10, мутанты RED для L3, исправить
  «основа без подсказок» в README мутантов, уровень «служебный» в `story:cast`, маршруты в `_routing.json`.
- Фраза про `role`/`about` не срабатывает (none ×3) — решить при Э2, стоит ли «карточка персонажа» в описании.
- C-50 (в) на канале тревог slepoe-pyatno — если каналы-источники станут нормой, нужен признак в `characters`.
