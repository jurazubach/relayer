# T-04a — сверка с замыслом

Вердикт: drift-minor

## Исправил сам

- `scripts/story/core/graph.mjs` — из комментария убран пример из «Слепого пятна» (`ch5`): вместо него ссылка на
  определение распределителя в `checks.md` «Общие данные и определения». Код не привязан к нашим историям.
  `npm run test:story-cmd` — 26/26.

## Дрейф (если есть)

Замысел соблюдён: команды отвечают на боли «где слабые места и где скучно» (`story:sessions`, микросессии,
отвлечённый), «выбор не ощущается, финал решает скрытая проверка» (`story:vars` — невидимые и «только финал»,
`story:endings` — что решает финал), «чатов слишком много» (`story:cast`, уровни). Часы игрока не используются
(нет `Date`, моменты — «день N, +…» от старта). Упрёк за отсутствие команда ищет, а не порождает. Платных выборов,
замков, другой модели, пуша в `master` нет. Зона — `scripts/story/**` и `package.json`, как в `tasks.json`.
Отступления (отвлечённый — одна отлучка на пачку, неотвечающий без `#silent` — «история стоит», `--compare silent`
до E-02 тавтологичен) записаны в отчёте исполнителя.

Дрейф один, но по правилу INTENT «числа только в `thresholds.json`», и он проявится при слиянии: T-03a уже слит в
`build/main` и завёл `thresholds.json` с частью тех же порогов и словарей под другими ключами. После слияния
у одних и тех же чисел будет два хозяина.

1. **Числа в коде.** `scripts/story/core/timeline.mjs` (`typingTime`, `gapTime`) держит константы `engine.ts`
   литералами (2.6, 5, 1.1, 0.6, 0.05, 0.7, 0.9, 0.35, 0.6, 1.2). Ревью сочло их «формулами движка», но в
   `build/main` они уже под ключом `engine.typing` (T-03a, сверяется с `engine.ts` в `test:lint`), и та же формула
   реализована в `scripts/lint/journal.mjs` → `lineTime`. **Как вернуть:** при слиянии `timeline.mjs` берёт
   `engine.typing` (или вызывает `lineTime`), литералы удаляются.
2. **Запасной `thresholds.default.json` дублирует ключи главного** под другими именами и единицами:

   | `thresholds.default.json` | `thresholds.json` (build/main) | что учесть |
   |---|---|---|
   | `sessions.gap`, `trace.distracted_away` | `story.pause.session_s` | — |
   | `sessions.long_pause` | `story.pause.long_s` | — |
   | `sessions.max_pause` | `story.pause.max_h` | часы, не секунды |
   | `sessions.story_target` / `story_ceiling` | `story.length.target_h` / `max_h` | часы |
   | `sessions.tail_delay` | `story.tail.max_delay_min` | минуты |
   | `sessions.card_ratio` | `story.card.mismatch_ratio` | — |
   | `sessions.micro_lines` / `micro_share` | `C-30.micro_lines` / `C-30.micro_share` | — |
   | `click.keep_delay` | `C-31.click_delay_max_s` | — |
   | `click.jump_label` | `engine.click.time_jump_label` | часы; вопрос автору из отчёта уже решён там же (1 ч) |
   | `endings.dominant` / `endings.rare` | `C-40.dominant_share` / `C-40.rare_share` | — |
   | `bot.runs` / `bot.max_lines` | `lint.runs.full` / `lint.max_steps` | — |

   Остальные (`trace.runs`, `cast.*`, `endings.runs`, `endings.top_vars`, `vars.silent_chapters`) в главном файле
   отсутствуют. **Как вернуть:** команды читают ключи главного файла (с переводом единиц), недостающие ключи
   переезжают в `thresholds.json` с полями T-03a (`level`, `calibrated_on`, `history`), запасной файл и
   двухуровневый поиск в `core/thresholds.mjs` удаляются; лучше пользоваться `scripts/lint/thresholds.mjs`
   (`loadThresholds`), а не своим загрузчиком.
3. **Словари.** `core/lexicon.mjs` (`CLOSING`, `PROMISE`, `REPROACH`) повторяет `dict.closing`,
   `dict.content_promise`, `dict.absence_reproach` + `dict.lived_wait` и уже расходится с ними: `dict.closing`
   привязан к началу строки, а `CLOSING` ищет слово где угодно; «наконец-то» в T-03a вынесено в `dict.lived_wait`.
   Итог — `story:trace --compare silent` и `story:lint` по-разному найдут упрёк и закрывающую реплику.
   **Как вернуть:** три словаря берутся из `thresholds.json` через `T.re(...)`; персоночные словари (`REFUSE`, `TRUST`,
   `SUSPECT`, `ASK`, `LEAVE`) — характер бота, их можно оставить в коде или завести `bot.persona.*`.

Ни одно из трёх не идёт против замысла по сути, все решаются механически при слиянии — поэтому drift-minor.

## Риски для следующих задач

- **Слияние T-04a в `build/main`:** без правок выше у T-15 (базовый снимок) `story:sessions`/`story:endings` и
  `story:lint` опираются на разные копии одних порогов; поменяют число в `thresholds.json` — команды T-04a не заметят,
  пока ключ не совпадёт.
- **T-03b** (пишет `thresholds.json`, зависит от T-04a) — естественный владелец переноса оставшихся ключей
  `cast.*`, `trace.*`, `endings.*`, `vars.*`; без явной строки в задании может их не взять.
- **T-04b** (`story:diff` сравнивает метрики `lint`, `trace`, `sessions`, `cast`, `endings`) унаследует две формулы
  времени игрока (`timeline.mjs` и `lint/journal.mjs`) — числа «времени» в `diff` у двух команд могут не сойтись.
- **E-02:** точка подключения напоминаний — `noAnswer()` в `scripts/story/core/personas.mjs`, но E-02 пишет только
  `scripts/lib/**`; правка `personas.mjs` у E-02 не в зоне.
- **CLAUDE.md** без строк о командах `story:*` (`requests.md` п. 4) — скиллы и хуки T-11 найдут их только по
  `package.json`.

## Предложения королеве

- При слиянии T-04a: снять дрейф 1–3 (таблица выше) — или добавить в T-03b строку «перевести `scripts/story/**`
  на `thresholds.json`, удалить `thresholds.default.json` и `core/lexicon.mjs` (кроме персоночных словарей)» и
  разрешить ему `scripts/story/core/**`.
- Общую формулу времени игрока (`engine.typing` → набор и зазор) вынести в `scripts/lib/` (владелец T-01 / просьба),
  чтобы `story:lint`, `story:trace` и `story:sessions` считали одно время.
- В `writes` задачи E-02 добавить `scripts/story/core/personas.mjs` (или переложить `noAnswer` в `scripts/lib/bot.mjs`).
- В промпт code-задач: «перед стартом проверь, что уже слито в `build/main` по `thresholds.json` и словарям, и
  используй их ключи» — параллельные T-03a и T-04a завели одно и то же дважды.
- Строки команд в `CLAUDE.md` (`requests.md` п. 4) внести при слиянии.
