# T-03b · story:lint: остальные проверки — сборка

## Сделано

- **`scripts/lint/checks/`** — 38 новых модулей: C-02, C-04, C-05, C-07…C-09, C-13…C-19, C-22…C-25, C-27,
  C-29, C-32, C-33, C-36…C-39, C-41…C-52, C-54. Вместе с первой волной — все 54 проверки `checks.md`.
  Правки первой волны: C-21 не считает служебные контакты и берёт `C-21.new_ch1_short` в короткой истории;
  C-40 — по решению королевы о финалах (ниже).
- **`scripts/lint/core.mjs`** — у находки `owner` («кто чинит») из `owners.md` §3 (таблица читается из файла);
  пометка `model` (`[модель]` в тексте); пропуск порогов `deferred:E-NN` с записью в `skipped`; служебные
  контакты в контексте (`ctx.service`); прогоны персон C-16; `formatSummary` для `--summary`.
- **`scripts/lint/lint.mjs`** — флаги `--summary` (счётчики по проверкам и `lint.summary.top` находок, не длиннее
  `skill.hook.max_output_chars`), `--transcript N` и `--out` (C-52 п. 5). Исправлен баг T-03a: большой `--json`
  в трубу обрезался — `process.exit` срабатывал раньше, чем дописывался stdout; теперь `process.exitCode`.
- **`scripts/lint/journal.mjs`** — в журнале изменения переменных (`vars`), подписи кнопок (`labels`), посещения
  по счётчику inkjs (`visited`, `visits`: узлы без реплик и туннели), `knotAfter`, `visitShare`, персона
  `positionPersona`.
- **`scripts/lint/static.mjs`** — оператор и условия записи переменной, метки сборок как петли хаба, строки под
  условием (`condTexts`), кнопка по тексту (`st.button`), первый узел главы, `readsOf(R)`.
- **`scripts/lint/endings.mjs`** (новый) — финал прогона и узлы финалов; **`transcript.mjs`** (новый) — прохождение
  в `.md`; **`text.mjs`** — корни слов, имена героев, счёт слов.
- **`scripts/lint/thresholds.mjs`** — опора `author_decision`, поле `deferred` (`E-NN`), области `style`, `bot`, `attn`.
- **`scripts/lint/selftest.mjs`** + **`selftest-wave2.mjs`** — 77 тестов (было 30): дефект и чистый двойник на
  каждую новую проверку, служебные контакты, финал без метки, владелец, `deferred`, схема, `--summary`,
  `--transcript`, ключи в документах (attention §6, style §14.4, checks.md, rules.md). Синтетика выдумана.
- **`scripts/lint/README.md`** — переписан под 54 проверки, владельца, `[модель]`, `deferred`.
- **`docs/playbook/thresholds.json`** — 385 ключей (было 112): 278 `C-NN.*`, 40 `dict.*`, 22 `attn.*`, 11 `style.*`,
  12 `story.*`, 5 `bot.*`, `lint.summary.top`. `basis: author_decision` у `story.length.target_h`,
  `story.length.max_h`, `story.pause.max_h`, `story.tail.max_delay_min`, `story.reading.per_day_min` (A-05);
  `deferred: E-02` у `story.reminders.max` и `C-32.no_answer`.
- **`docs/playbook/attention-merged.md`** — §6: 64 строки с ключами вместо кандидатов, в «решении» ключи вместо
  чисел (разброс в базе оставлен как факт источников); §2, §4, §5, §8 — числа-пороги заменены ключами;
  вступление «Числа» переписано; строка `#attn-load` в §10 называет владельца.
- **`docs/playbook/checks.md`** — у каждой из 54 проверок строка «Ключи» перед «Предупреждением» (ключ, условие,
  единица, уровень, `deferred`). «Общие данные»: словари — в `thresholds.json` с ключами `dict.*`, ошибка — код 1
  у `story:lint --strict`, служебные контакты, заметная пауза `story.pause.notice_min`, «кто чинит», `[модель]`.
  C-01 — уровень и `--strict`; C-38 — `dict.threat`; C-40 — решение о финалах; C-21, C-32, C-53 — точечно.
- **`docs/playbook/rules.md`** — R-67, R-110, R-120, R-121, R-122: ключи рядом с числами.
- **`docs/style.md`** — числа-пороги в §1, ST-01…ST-66, §14.1 заменены ключами; §14.4 — таблица «что → ключ»
  без чисел и без «заведёт T-03b».
- **`docs/capabilities.json`** — возможность `markup` (разметка C-53: шапка из 4 строк, `reveal`, `намеренно`,
  `финал`); **`docs/PROMPT.md`** пересобран.
- **`CLAUDE.md`** — команды `story:lint` и `test:lint`, `test:lint` в проверке перед коммитом, `scripts/lint/` и
  `thresholds.json` в «Устройстве» (просьба T-03a п. 3).
- **`docs/playbook/claude-code-format.md`** — не менялся: после T-03a там остались только факты документации
  и замеры экспериментов (1536, 5000 токенов, 10 000 знаков вывода, 29 980 знаков листинга), а не наши пороги.

## Решения

- **Финалы (решение королевы).** Финал — метка `// финал:` на пути. `C-40.unmarked_run` — прогон, дошедший до
  конца истории без метки, теперь и в истории без единой метки (раньше только при метках). Конец истории — то,
  что бот считает концом (`END` или `DONE` на верхнем уровне); `DONE` в функции и треде историю не кончает.
  Общий `END` после размеченных веток — норма (тест). Доли финалов без меток по-прежнему считаются по узлам
  с пометкой «ориентировочно»: пока истории не размечены, иначе C-16, C-41, C-42 молчали бы.
- **Модель.** `model: true` у проверок, где регулярка или профиль только находят кандидата: C-22, C-23, C-36,
  C-44, C-47, C-48, C-49; у отдельных находок — C-39 (в), C-43 (в). Уровень берётся из порога (подсказка), в тексте —
  `[модель]`, в `--json` — `model: true`.
- **Deferred.** Только C-32 п. 6–7 (напоминания, цена «не ответил») — `deferred:E-02`. Остальное считается без фич
  движка; C-51 (в) «реплика после паузы упоминает непосещённый узел» не формализован (см. «Открыто»).
- **Имена ключей T-08.** Одно имя на понятие: если проверка меряет то же, что кандидат, ключ — проверки
  (`C-NN.*`); без своей проверки — `attn.<кандидат>`; общие пределы — `story.*`. Таблица соответствия ниже.
  Где значения расходились, оставлено значение `checks.md`, откалиброванное прогоном первой волны, а значение
  T-08 записано в таблицу — это 9 мест, вопрос автору.
- **Редкие слова C-22 без словаря.** «Жаргон» — корень, который часто звучит в этой истории и не встречается в
  других историях каталога: без фона ловилась общая лексика («потом», «сказал»). Без каталога фона нет.
- **Петли C-52** — по счётчику посещений inkjs: возврат из туннеля не новое посещение (иначе финалы с туннелем
  «посещались» трижды).
- **Сводки вместо сотен строк.** C-33 «мало кнопок» и «долгий заход» — одна находка на главу с примерами; C-29
  считает место обрыва по самой строке, а совпадение первым словом — только у коротких строк-формул
  (`C-29.formula_words`): было 128 подсказок на местоимениях и именах, стало 17. Таблица фактов C-49 (г) — одна
  подсказка, полная таблица в `--json` («для глаз, без вердикта»).
- **Кнопка с `#label`** не меряется по словам (R-46, ST-31: длинное сообщение уходит в чат, на экране — намерение).
- **Свои ключи окна.** Проверка не читает чужой `C-NN.*` (тест): у C-27 своё `C-27.window_lines`, общие окна —
  `story.*` с `checks`.
- **`claude-code-format.md`** оставлен как есть: задача велит не трогать факты о лимитах Claude Code.

## Таблица соответствия: кандидаты T-08 → ключи

| кандидат T-08 | ключ `thresholds.json` | расхождение значения (взято значение ключа) |
|---|---|---|
| `msg.chars.target` | `C-34.long_chars` | — |
| `msg.chars.max` | `C-34.line_warning` | — |
| `msg.chars.median` | `C-34.median` | ≤ 35 у T-08; оставлено 40 (checks.md, прогон первой волны: медианы 27–34) |
| `msg.words.max` | `attn.msg.words` | — |
| `msg.chars.opening` | `C-34.opening` | — |
| `msg.chars.key` | `attn.msg.chars.key` | — |
| `msg.names.max` | `C-22.line` | — |
| `msg.numbers.max` | `attn.msg.numbers.max` | — |
| `opening.first_button.msgs` | `C-20.start_msgs_target`, `C-20.start_msgs` | предупреждение > 8 у T-08; оставлено > 6 (checks.md, калибровка на трёх историях) |
| `opening.first_button.sec` | `C-20.start_time_target_s`, `C-20.start_time_s` | — |
| `opening.incident.msg` | `attn.opening.incident.msg` | — |
| `opening.names.first_button` | `C-22.before_first` | ≤ 2 людей, считая отправителя, у T-08; C-22 считает имена и термины вместе: > 3 (rules.md R-18) |
| `opening.names.3min` | `attn.opening.names.3min` | — |
| `opening.entities.first15` | `C-22.first15`, `C-22.first15_lines` | — |
| `opening.terms.unexplained` | `attn.opening.terms.unexplained` | — |
| `opening.speakers` | `C-21.from_before_first` | ≤ 2 говорящих у T-08; оставлено > 1 до первой кнопки (rules.md R-18, строже) |
| `scene.names.new` | `C-22.scene` | — |
| `scene.concepts.new` | `attn.scene.concepts.new` | — |
| `chapter.names.mentioned` | `attn.chapter.names.mentioned` | — |
| `ch1.contacts.new` | `C-21.new_ch1`, `C-21.new_ch1_short`, `story.short_min` | — |
| `chapter.contacts.new` | `C-21.new_other` | — |
| `scene.contacts.new` | `C-21.unlock_scene` | — |
| `return.contacts.new` | `attn.return.contacts.new`, `C-21.unlock_after_pause_lines` | — |
| `chats.waiting` | `attn.chats.waiting` | — |
| `choice.buttons` | `C-12.four`, `C-12.four_share`, `C-12.wide` | — |
| `hub.addressees` | `attn.hub.addressees` | C-12.hub_max (6) — потолок хаба по экрану; attn — сколько адресатов держит голова |
| `button.words` | `C-13.words`, `C-13.words_warning`, `C-13.words_error` | — |
| `button.chars` | `C-13.chars`, `C-13.chars_short` | — |
| `label.words` | `C-13.label_words`, `style.sys_words` | — |
| `streak.no_choice.ch1` | `C-35.series_ch1_target`, `C-35.series_ch1` | — |
| `streak.no_choice` | `C-35.series_target`, `C-35.series`, `C-35.series_error` | — |
| `streak.no_choice.climax` | `attn.streak.no_choice.climax` | — |
| `streak.no_choice.words` | `C-35.words`, `C-35.words_error` | предупреждение > 100 слов у T-08; оставлено > 150 (checks.md: 12 реплик по 12 слов) |
| `streak.one_sender` | `C-35.monologue` | — |
| `streak.backstory` | `C-47.backstory` | ≤ 2 у T-08; C-47 ловит блок от 4 входящих (регулярка грубая, ниже — шум) |
| `streak.no_change` | `attn.streak.no_change`, `C-36.vague` | — |
| `choice.empty_run` | `C-10.cosmetic_streak`, `C-10.bodyless_story` | — |
| `choice.singles_run` | `C-12.single_streak` | — |
| `session.minutes` | `C-33.active_target_min`, `C-33.active_max_min` | тревога после 8 мин у T-08; оставлено > 6 (rules.md R-62, только подсказка) |
| `session.msgs` | `C-33.min_msgs`, `C-33.max_msgs` | — |
| `return.button_within` | `C-28.pack`, `C-28.pack_long` | цель ≤ 3, предупреждение > 6 у T-08; оставлено > 5, после 6 ч — > 3 (rules.md R-72) |
| `return.dose` | `attn.return.dose`, `C-33.return_min_msgs` | — |
| `pauses.no_button_run` | `C-30.streak_warning`, `C-30.streak_error` | — |
| `pause.reason_from` | `story.pause.notice_min`, `attn.pause.dialog_max_min` | — |
| `pause.hookless_share` | `C-26.share` | T-08 считает паузы от 10 мин, C-26 — от story.pause.long_s (короче — ещё одна сессия) |
| `hook.open_loops` | `attn.hook.open_loops` | — |
| `hook.form_repeat` | `C-29.opening_repeat`, `C-29.closing_repeat` | — |
| `pressure.per_chapter` | `C-37.per_chapter` | — |
| `pause.ch1_first` | `C-32.first_pause_choices_hint`, `C-32.first_pause_h` | — |
| `pause.early_max` | `attn.pause.early_max` | — |
| `pause.long_ch12` | `C-32.early_long`, `C-32.early_long_h` | — |
| `pause.ch2_before` | `C-32.ch2_pause_h` | T-08 относит к C-39, checks.md — к C-32 п. 4 |
| `pause.max` | `story.pause.max_h` | — |
| `story.realtime` | `story.length.target_h`, `story.length.max_h` | — |
| `returns.per_day` | `C-32.returns_per_day` | — |
| `reading.per_day` | `story.reading.per_day_min` | — |
| `tail.after_last_button` | `story.tail.max_delay_min`, `C-42.msgs`, `C-42.msgs_short` | ≤ 3 сообщения в короткой у T-08; оставлено > 5 (checks.md C-42, schell) |
| `state.axes` | `attn.state.axes` | — |
| `echo.distance` | `C-04.gap_hint`, `C-04.gap_warning` | — |
| `echo.callbacks` | `attn.echo.callbacks` | — |
| `chapter.blows` | `attn.chapter.blows` | — |
| `chapter.size` | `attn.chapter.size`, `C-33.chapter_read_min` | — |
| `mystery.suspects` | `attn.mystery.suspects` | — |
| `mystery.debrief` | `C-42.msgs_short`, `C-42.msgs` | — |

## Проверки

- `npm run build` — ок, код 0.
- `npm run check:story` — ок, код 0.
- `npm run story:lint` — код 0, около 17 с на три истории по 400 прогонов. Итог: «Чужой голос» — 21 ошибка,
  258 предупреждений, 580 подсказок; «Слепое пятно» — 0 / 61 / 99; THE NUMBER — 5 / 85 / 260. С `--strict` — код 1.
  `--summary` — 8 647 знаков. `--changed --quick --summary` — код 0.
- `npm run test:lint` — 77 из 77.
- `npm run test:lib` — 29 из 29; `npm run story:pack -- --check` — ок; `npm run prompt -- --quiet` — ок.
- Новые ошибки на историях — C-13 (кнопка длиннее 12 слов без `#label`, 6 у «Чужого голоса»); остальные ошибки —
  первой волны (C-01, C-30, C-31, C-35). Шумнее всего подсказки C-27 (пауза без причины, 121 у «Чужого голоса»)
  и C-33 (возврат не окупает паузу, 59): это свойство историй, свод это предсказывал (`serial-hooks:§7`).

## Открыто

- **Автору:** 9 расхождений T-08 и `checks.md` (таблица выше): например, первая кнопка — предупреждение после
  8 входящих (T-08) или после 6 (`checks.md`, оставлено); серия — 100 или 150 слов. Оставлены значения проверок,
  откалиброванные на трёх историях; если верна §6 — правка одной строки `thresholds.json`.
- **Автору:** C-51 (в) «после паузы ≥ 3 ч реплика упоминает непосещённый узел» не формализован: «упоминание
  узла» в тексте не определено. Нужен реестр фактов `facts.md` (R-91) — тогда (а) и (в) проверяются по нему.
- C-16 «персона по позиции»: случайного бота нет у финальной дилеммы, поэтому персона тянется к позиции с
  вероятностью `C-16.persona_bias`, а не всегда. Порог 0,9 — наша оценка.
- C-14, C-22, C-36, C-44, C-47, C-48 опираются на регулярки и грубые профили — это кандидаты, калибровка — на
  мутантах T-13 и живых правках.
- Числа ботов (`bot.*`) заведены, но код `check:story`, `story-graph` и `scripts/lib/bot.mjs` их ещё не читает —
  файлы вне задачи, просьба 1.
- Поле `service: true` у героя линт понимает, но в типе `Character` и README его нет — просьба 3.
- Ни один новый порог не проверен на живых игроках; `calibrated_on` заполнен там, где порог правился по прогону.
