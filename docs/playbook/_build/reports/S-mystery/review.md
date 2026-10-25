# S-mystery — ревью

Вердикт: pass

## Исправил сам

- **Числа без ключа** в references: «одна приманка на историю до 25 минут» (`red-herrings.md`, нюанс PAT-03),
  «на 5–25 минут» (`fair-play.md`, P-10), «история до получаса» (`decisions-mystery.md`, P-10) → ключ
  `attn.mystery.suspects` (`short_min`, `short_suspects`).
- **Потерянная уверенность** в `withholding.md` (truby P-14): разбор помечает «призрак до середины» как знание
  модели с уверенностью «средняя» — дописал.
- **`guess.mjs --json`** без меток `// reveal:` печатал текст в stderr, а не JSON: теперь
  `{"story", "nodes": [], "error"}` с кодом 2.
- **Самопроверка** `selftest-story-mystery.mjs`: у `C-54.gap_choice` не было чистого двойника — добавил
  `hasNot(trunk, 'C-54.gap_choice')`.
- **Выборка верности** записана в шард `docs/playbook/coverage/story-mystery.json` (20 строк, все `ok`). В этой
  ветке `--record` ещё пишет в общий `coverage.json` (шарды появились в `build/main` позже, Q-covshard), поэтому
  общий файл вернул как был, а записи перенёс в шард в формате `build/main`.
- Сырые прогоны ревью — `docs/lab/runs/S-mystery/review-triggers.json`, `review-mutants.json`.

## Доделать (если fail)

—

## Проверено

- **Приёмка** (до и после правок):
  - `skill-check story-mystery --min-refs 8 --min-scripts 1` — ✓, 0 предупреждений;
  - `story:coverage -- --skill story-mystery --min L2` — ✓, 133 строки, ниже L2 нет;
  - `lab:triggers -- --skill story-mystery --runs 3 --min build` — ✓: story-mystery 100 % (42/42), ложных 0 % (0/39);
    мимо — две фразы story-choices в `none` (не наши), 6 недействительных прогонов из-за отказов Bash;
  - `skills:test -- --skill story-mystery` — m13 2/2, полнота 100 %, отказов 0;
  - `test:lint` — 96/96; `test:coverage` — 11/0.
- **Полнота по §C flow-review:** `fair-play.md`, `clue-map.md`, `reveals.md`, `red-herrings.md`, `deduction-gates.md`
  есть; скрипты `clues.mjs` и `guess.mjs`; 15 references + 5 systems.
- **Ядро:** 115 строк, описание симптомами, модуль `user-invocable: false`, первый шаг — STATUS.md, границы с
  соседями поимённо, 8 шагов со ссылками на references и команды, правила по ID с ключами, формат находки, «объясни».
- **Скрипты** на трёх историях: `clues.mjs` (текст и `--json`) — без разметки даёт кандидатов в улики, C-54
  молчит; `guess.mjs --help`, `--until finale --json` на the-number — план маршрутов без `--ask`.
- **C-54:** дифф прочитан — каналы по исходнику (строка перед `~ clue_x`), след `culprit_seen`, ворота в узле
  раскрытия и узле последнего выбора, `facts.md` рядом с историей. На трёх историях без разметки находок нет —
  поведение старого пути не изменилось.
- **Общие файлы:** `thresholds.json` (ключи `C-54.channels`, `C-54.guess_share` рядом с `C-54.*`, опоры с
  `history`) и раздел C-54 в `checks.md` — точечно, как разрешает `type-skill.md`.
- **Верность**, `--fidelity-sample story-mystery 20 --seed 7`: PAT-05#нюанс, PAT-08, P-16#нюанс, truby P-14,
  P-15, dille PAT-06#нюанс, RED-03, P-05, dille P-03, truby RED-12, PAT-09#нюанс, R-95, video PAT-04#нюанс,
  LESSON-05, PAT-05, PAT-07#нюанс, RED-02, PAT-03#нюанс, dille GREEN-02, LESSON-15 — все ok (два после правки
  ревьюера), bad 0 из 20. Ещё ~12 пар из выборки без seed (R-96, PAT-03, P-04#нюанс, PAT-11, LESSON-02, P-09,
  messenger PAT-06, narrative-postmortems PAT-04, P-08#нюанс, SYS-4, truby GREEN-05, LESSON-01) прочитаны
  глазами — смысл, условия и «когда не работает» сохранены.
- **Дословные заимствования:** окна по 15 слов против `docs/books/_clean/*` — совпадения только с нашими
  разборами (перефразированный текст базы), цитат из книг нет. Примеры — вымышленный «Сонный причал»;
  имён и флагов наших историй в references нет. Брендов нет.
- **owner_via cluster|refs:** 29 строк, все через кластеры R-92…R-98 своей зоны или прямые ссылки в references
  (SYS-1/2, RED-11, contra-1) — чужих по смыслу нет.

## Замечания на будущее

- **Строка в `CLAUDE.md`** «симптом → скилл»: таблицу королева завела в `build/main` после ответвления этой
  ветки (58f31d2), поэтому здесь её нет. При слиянии дописать строку story-mystery (симптомы из `description`).
- **Шард покрытия:** после слияния с `build/main` проверить, что `story:coverage` читает
  `docs/playbook/coverage/story-mystery.json` (формат взят с `story-pace.json`).
- **R-95 в fair-play.md** — «первые 15 сообщений» и «первые 10 сообщений» опущены, потому что ключа нет. Если
  они нужны модели как числа, завести ключ (например, `C-54.anomaly_msgs`) и вернуть.
- **`systems/fair-play-contract.md`, `limited-yield.md`** близки к тексту разборов (много совпадающих окон по
  15 слов). Это наша база, не книги, но контракт просит systems «своими словами» — при следующей версии
  пересказать свободнее.
- **`culprit_seen`** — новое соглашение об имени переменной для C-54; в `checks.md` описано, в `capabilities.json`
  и PROMPT нет. Королеве решить, завести ли его в реестр разметки рядом с A-06.
- Просьбы исполнителя (`requests.md`): мутанты RED-02/RED-04/RED-06/P-07 для L3 и изоляция cold-read в режиме
  guess — актуальны.
- `lab:triggers`: две фразы story-choices стабильно уходят в `none` — для владельца story-choices.
