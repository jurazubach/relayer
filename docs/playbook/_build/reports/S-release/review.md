# S-release — ревью

Вердикт: pass

## Исправил сам

- `references/decisions-release.md` (A-05, «Масштаб»): «полдня точности хватает» противоречило решению
  исполнителя (округление как `library.ts` `daysText`, ключа `days_step` нет) — заменил ссылкой на `durations.mjs`
  и `daysText`.
- `references/two-durations.md` (`messenger-genre:RED-12`): «сюжетное „45 дней“» — деталь из the-number, а примеры
  в скилле должны быть придуманными; заменил на «сюжетный срок („N дней“ в `synopsis`)».
- `references/teasers.md`: «2–3» в заголовке и в пункте «Число» — число вне `thresholds.json` рядом с ключом
  `C-49.teasers`; оставил ключ, а «первые три» объяснил через `library.ts` `storyTeasers`.
- Выборка верности (20 пар, seed 49602355) записана в `docs/playbook/coverage/story-release.json`, by=review.
- Сырые прогоны ревью: `docs/lab/runs/triggers/2026-10-28-story-release-3.json` (до слияния — `2026-10-28-2.json`), `…/2026-10-28-story-release-2.json`,
  `docs/lab/runs/mutants/2026-10-28-story-release.json`.

## Доделать (если fail)

—

## Проверено

- **Приёмка:**
  - `skill-check.mjs story-release --min-refs 8 --min-scripts 4`: ✓, 0 предупреждений (17 references, 6 скриптов),
    до правок и после;
  - `story:coverage --skill story-release --min L2`: ✓ (78 строк, ниже L2 нет), до правок и после;
  - `lab:triggers`: полный прогон `--runs 3` по времени (≈ 630 с у исполнителя) не влезает в окно вызова, поэтому
    разбил на два:
    - `--file docs/lab/triggers/story-release.json --runs 3 --min build`: story-release 97 % (35/36), ложных 0 %;
    - `--skill story-release --runs 2 --min build` (все соседи и маршруты, 174 запуска): story-release 92 %,
      ложных 1 %, соседи 90–100 %, пороги пройдены.

    Промахи те же, что у исполнителя: фраза про «тёмный паттерн» (модель отвечает сама) и фраза story-time
    «на карточке 30 минут…», которая уходит в story-release (2/2);
  - `skills:test --skill story-release`: m19 2/2, полнота 100 %, отказов 0;
  - `test:lint`: 175 из 175, `selftest-story-release.mjs` подключён через `register`.
- **Скрипты на трёх историях:** `release-gate`, `card-check`, `durations`, `boundary-check`, `revision-check` и
  `pack` проверены на the-number, slepoe-pyatno и chuzhoy-golos:
  - у всех есть `--help`, `--json` отдаёт валидный JSON, код выхода 0;
  - `release-gate --json` при ✗ выходит с кодом 1;
  - `boundary-check the-number --free 1` даёт ⚠ «после открытия 6 ч» — как в отчёте исполнителя;
  - `revision-check --from HEAD~40` и `durations slepoe-pyatno` совпадают с `story:sessions`: 17 мин против 40 на
    карточке.
- **C-49 на трёх историях** (`story:lint --only C-49`): новые (б), (ж), (з) не дают ложных срабатываний на
  slepoe-pyatno и chuzhoy-golos. На the-number (з) верно ловит «несколько финалов» при одном (совпадает с TN-04).
  Ключи `C-49.*` и `skill.release.*` в `thresholds.json` (14 значений), у всех есть опора и `history`.
- **Верность** (20 пар, seed 49602355): 20 ok, 0 bad. Мелкие потери, без влияния на правило:
  - `edgerton-hooked:attention§5` — пропал порог «первые пять сообщений»;
  - `mystery-fair-play:attention§5` — пропал потолок паузы-раздумья;
  - `inkle-ingold:attention§5` — «пауза от часа» стоит словами, без ключа.

  Дубли о Lifeline слиты в `lessons.md` одним блоком с классом C — это верно для каждого источника.
- **Ручная сверка с `docs/books`:** проверил `serial-hooks:LESSON-14`, `yorke-into-the-woods:LESSON-06`
  (корреляция не выдана за причину), `video-three-things:P-10#нюанс` (оба исключения), `edgerton-hooked:PAT-06`
  («когда нет» и ловушка «сразу играть»), `attention-today:SYS-4` (исключение «хорошего обмана»). Смысл, условия
  и уверенность сохранены.
- **Ядро и references:**
  - SKILL.md — 119 строк: 9 шагов, развилки ведут в references, команды по одной на вызов;
  - описание составлено из симптомов автора;
  - в references есть «если → то», «когда не работает», масштаб и `basis`;
  - примеры ink компилируются (skill-check);
  - в примерах нет имён и деталей из наших историй (после правки `two-durations.md`).
- **Границы:**
  - вне разрешённых путей — точечный раздел C-49 в `checks.md`, ключи `C-49.*` и `skill.release.*` в
    `thresholds.json` (как у S-mystery и S-time), отчёты, сырые прогоны и шард покрытия;
  - `docs/books/*` и `_build/*` (кроме отчётов) не тронуты;
  - цитат длиннее 15 слов из книг не нашёл: `attention.md` переносит `#attn-ethics` из нашего свода, а не из книги;
  - реальные продукты названы только в сводке уроков, и то обезличенно («корейская площадка», «то же приложение»),
    в сюжетах их нет.

## Замечания на будущее

- **Чужие строки через кластер K-R-11:** `nicklin-writing-for-games:P-16` и `:RED-09` (похвала после кнопки, C-47)
  по смыслу принадлежат `story-voice` (владелец C-47, `owners.md` §3), а не карточке. Перенести в «опору» TH-69 или
  в строку C-47 в `owners.md`. Исключение из P-16 («льстец по характеру») в `card.md` не упомянуто.
- **Триггеры:** фразу «на карточке 30 минут, а по факту история идёт три дня» стабильно перехватывает
  story-release, а по смыслу (два времени, TH-98) она его. Итогу волны — перенести её в `story-release.json`
  (`requests.md` п. 4). Вопрос «первая глава бесплатно — тёмный паттерн?» уходит мимо скилла; бюджет описания
  позволяет дописать «монетизация честная?».
- **Мутанты:** в зоне только m19. Затравки (ж) и обещанные финалы (з) держатся только на самопроверке. Просьба из
  `requests.md` п. 1 (два мутанта) нужна, чтобы поднять `video-three-things:RED-08` и `dille-ultimate-guide:RED-02`
  до L3 мутантом и мерить полноту больше чем на одном дефекте.
- **Ссылка вперёд:** `free-boundary-gate.md` ссылается на `story-plan/free-boundary.md`, которого ещё нет.
  Сверить, когда сольётся story-plan.
- **Пороги без калибровки:** `skill.release.boundary.pause_max_min` и `reach_share` — наша оценка, а
  `free_chapters` нет ни у одной истории каталога. Откалибровать на первой истории с границей.
- **Карточки историй** (для автора и королевы): гейт показывает расхождения:
  - slepoe-pyatno — `minutes` 40 при медиане 17;
  - chuzhoy-golos — 176 ч против `story.length.max_h`;
  - the-number — обещает несколько финалов, а финал один.
