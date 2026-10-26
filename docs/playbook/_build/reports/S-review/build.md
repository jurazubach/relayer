# S-review · Скилл story-review — сборка

## Сделано

**`.claude/skills/story-review/SKILL.md`** (вход, ~110 строк тела). Оркестратор в 9 шагов: состояние → замер
(`review-cache.mjs`) → выбор линз (`select-lenses.mjs`) → аудиторы `story-auditor` и `cold-reader` одним сообщением
→ QA «шесть списков» (`qa-six.mjs`) → люди (Б-3) → сведение и сверка (`merge-findings.mjs`, LOCAL-04) → отчёт
(`report.mjs --explain`) → состояние через `story-desk`. Описание — фразы автора (261 знак), `allowed-tools` по
LOCAL-03, `metadata.version: 1`, карта references, 8 главных правил по ID, формат находки, «Состояние», «объясни».

**`scripts/`** (5 команд + общий модуль, у всех `--help` и `--json`):
- `review-core.mjs` — общий модуль: прогон `story:lint` тем же `lint.mjs` (числа совпадают), ключ прогона —
  хэш ink/скелета, `meta.json`, `thresholds.json` и кода `scripts/lint`; папка прогона `.story-review/<id>/<ключ>/`;
  таблица линз; терпимый разбор строк находок (узлы списком, «(гл. N)», «правка:», цитата читателя → узел); разделы
  «ложные», «вне линзы», «нет данных»; отклонённые находки — хэш узла из `story-desk/scripts/desk-core.mjs`.
- `review-cache.mjs` — замер один раз на ревизию, счёт по уровням, линзам (`owner`) и главам, `--list`, `--prune`.
- `select-lenses.mjs` — правило `routing.md`: находки `owner` + признаки разметки/метрик + `--focus`/`--skip`;
  режимы полный / `--partial` / `--plan`; строка «разметка A-06» (LOCAL-02); `--task <линза>` — задание в формате
  агента (не больше `skill.review.task_max_lines` строк, остальное счётом); точки холодного читателя с командой.
- `qa-six.mjs` — кандидаты шести списков: таблица фактов по якорю (`C-49.anchor_window`), профиль голоса и реплики
  против большинства контакта (`C-44.min_lines`), формы имён, орфография; находки `story:lint` по спискам;
  `--contact` — короткая форма SYS-4.
- `merge-findings.mjs` — сверка строк замера с ответами линз (подтверждено / ложное / не разобрано / не сверено),
  слияние дублей, «два источника — на ступень», «скучно без человека — не выше P2», Б-3 (человек против замера,
  «нужен ещё человек» по `lab.playtest.repeat_min`), отклонённое с тем же хэшем — скрыто, с другим — снова в списке;
  `--lint-only` — быстрый черновик.
- `report.mjs` — «Поломки» отдельно (P-02), по главам не больше `skill.review.top_per_chapter`, приложение,
  `--explain` — «почему важно» у каждой находки (тип → что почувствует игрок, `C-NN` и «зачем» из `checks.md`,
  источник), строка для `STATUS.md`.

**`references/`** (16 файлов + 3 системы): `finding-format.md` (TH-28), `priority.md` (TH-29), `conflicts.md` (Б-3),
`routing.md` (TH-32), `lenses.md` (TH-30), `qa-six.md` (TH-31), `decisions-review.md`, `patterns-review.md`
(4 примера ink, компилируются), `report.md`, `flags.md`, `lessons.md` (LOCAL-02/03/04/07/08 блоками
`### LOCAL-NN · …` без примеров из историй + уроки базы с классом A/B/C), `contradictions.md`, `attention.md`
(чужие якоря ссылкой + блок `narrative-testing:attention§3`), `explain.md`, `sources.md` (сгенерирован),
`systems/review-pass.md`, `systems/plan-review.md` (Б-7), `systems/critical-response.md`.

**Прочее:**
- `docs/playbook/thresholds.json` — ключи `skill.review.top_per_chapter` (5) и `skill.review.task_max_lines` (40),
  `our_estimate`, рядом с `skill.hook.*`, с `history`.
- `scripts/lint/selftest-story-review.mjs` — 4 теста: контракт `story:lint` (owner, глава, метка «намеренно»), разбор
  строк находок, путь `review-cache → merge-findings → report` на выдуманной истории.
- `docs/lab/triggers/story-review.json` — 12 позитивов, 7 негативов; соседи `story-pace`, `story-playtest`, `story-desk`.
- `CLAUDE.md` — строка в «симптом → скилл»; `.gitignore` — `.story-review`.
- `docs/lab/runs/S-review/` — прогоны срабатывания (4), три живых прогона `claude -p` (jsonl) и ответ линзы, QA и
  отчёт третьего.

## Решения

- **Папка прогона — `.story-review/`, а не `node_modules/.cache`.** Первый живой прогон: Write в `node_modules/.cache`
  Claude Code отклонил проверкой безопасности (safetyCheck), модель ушла в свой scratchpad, и `merge-findings` не
  увидел ответов. Нужна папка в проекте, вне git, куда главная сессия пишет инструментом Write — отсюда строка в
  `.gitignore` (общий файл, одна строка). Отчёт автору в `docs/stories/<id>/reviews/` кладёт `story-desk`, как велит
  план §7.
- **Аудиторы — не в фоне (`run_in_background: false`), все одним сообщением.** Второй живой прогон: аудитор ушёл в фон,
  ход кончился, а после уведомления права скилла (`allowed-tools`) уже не действовали — `merge-findings` и `report`
  получили «requires approval». Вызовы одного сообщения идут параллельно и в переднем плане; права живут до конца хода.
  Третий прогон — вся цепочка без отказов на скриптах скилла (4 мин 23 с, одна линза + QA).
- **«Скучно» без человека — не выше P2** даже если линза поставила P1 (план §13). «Не верю» не ограничиваю: у
  `story-choices` скрытый штраф — законная P1 (LOCAL-05).
- **QA «шесть списков» делает главная сессия**, а не аудитор: у агента только 10 линз-скиллов, а QA по смыслу —
  отдельный проход (P-14). Команда даёт кандидатов, решает модель; пустой список — «проверено, нет».
- **Холодный читатель — два, а не панель**: `opening`/торопливый до главы 2 и `guess`/скептик в середине; панель
  из пяти профилей — `story-playtest`. Только Opus (A-07): совет разбора «второй моделью» записан в `contradictions.md`
  как отменённый.
- **Тип находки замера по умолчанию — по линзе** (`routing.md`), нужен только неразобранным строкам (`--lint-only`).
- **Линзы теорий** (`lenses.md`) — P3 «упущенные возможности» с проверкой у каждой, а не правила.
- **Владение:** проверок и приёмов у `story-review` нет (`owners.md` §1, §3–4); F-15 — у `story-plan`, ревью только
  ссылается. Чужие ID в заголовки блоков не ставил.
- **Имена в примерах** — свои (Ася, Гоша, Вера, Олег); «Мира» и «Лев» из первой версии заменены: они в основе
  мутантов.

## Проверки

- `node docs/playbook/_build/checks/skill-check.mjs story-review --min-refs 8 --min-scripts 3` → ✓ ок, 0 предупреждений.
- `npm run story:coverage -- --skill story-review --min L2` → ✓ все кластеры не ниже L2: 34 строки, L3 — 28, L2 — 6
  (LOCAL-03, LOCAL-07, LOCAL-08, `narrative-testing:P-15#нюанс`, `nicklin-writing-for-games:SYS-1`,
  `schell-art-of-game-design:LESSON-12` — у них нет проверки, развилки или примера по смыслу).
- `npm run lab:triggers -- --skill story-review --runs 3 --min build` (с `--jobs 3`, иначе дольше 10 минут) → ✓ пороги
  пройдены: `story-review` 93 % (39/42), ложных 0 %; весь набор 96 % (179/186). Промах — только маршрут «Где игроку
  станет скучно?» → `story-pace` 3/3 (просьба 1). Свои фразы отдельно (`--file`) — 100 % (35/35), 0 ложных.
- `npm run test:lint` → 153/153 (в том числе 4 теста `selftest-story-review.mjs`); `test:coverage`, `test:story-cmd`
  (38/38), `test:hooks` (14/14), `test:lab:triggers` — зелёные; `story:coverage -- --summary` — без владельца 0,
  два владельца 0.
- Скрипты на трёх историях: `review-cache` даёт ровно столько же находок и тех же уровней, что `npm run story:lint --
  --story <id> --json` (295 / 138 / 671); `select-lenses` выбирает 9 линз из 10 у всех трёх (`story-mystery` — нет
  ни меток, ни находок; печатается строка «разметка A-06»); `qa-six` — на всех трёх; `--plan` на выдуманном скелете,
  `--partial` — работают.
- Живые прогоны `claude -p` (Opus, `acceptEdits`) на the-number: 1-й — отказ Write в `node_modules`; 2-й — отказ
  `merge-findings` после фонового агента; 3-й — Skill → STATUS → review-cache → select-lenses → `--task` →
  `story-auditor` → qa-six → Write → `story:rule` → merge-findings → report без отказов на шагах скилла.
- Мутантов зоны `story-review` нет (`key.json`): скилл ловит дефекты линзами; `skills:test --skill story-review` не
  гонял — Write в нём запрещён (`SKILL_DENY`), и прогон с девятью аудиторами дольше `lab.mutants.skill_timeout_s`.

## Открыто

- Полный прогон всеми линзами и с холодным читателем живьём не делал: он длиннее 10 минут переднего плана. Проверены
  одна линза и QA; путь читателя — тот же Agent, разбор его строк (цитата → узел) — в тесте.
- `skills:test` для оркестратора: Write запрещён в его окружении, а ревью складывает ответы в папку прогона. В шаге 4
  есть запасной путь («Write отказан — сводишь сам по priority.md»), но точность ревью на мутантах (Э2) им не
  измерить — нужен режим `skills:test` для оркестратора (разрешить Write в `.story-review/`) — **королеве/X-E2**.
- Модель в разговорной части пересказывает отчёт своими словами вместо вывода `report.mjs` — по сути верно, но
  формат строк теряется; стоит ужесточить в v2, если Э2 покажет потери.
- Просьбы — `requests.md`: маршрут «Где игроку станет скучно?», строки в `cold-reader.md` и `story-auditor.md`, права вне скилла.
