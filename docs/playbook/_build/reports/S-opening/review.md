# S-opening — ревью

Вердикт: pass

## Исправил сам

- `references/patterns-first-fork.md`, блок `edgerton-hooked:P-15`: длина первой сцены была подменена порогом серии
  без кнопки (`C-35.series_ch1` «входящих между кнопками»), хотя источник говорит о длине всей сцены до первого
  сдвига. Теперь: пара десятков входящих и несколько минут с набором до сдвига (перевод — наша оценка, ключа нет),
  кнопки внутри не реже `C-35.series_ch1`. В выборке верности записано `fidelity=bad` с пометкой «исправлено в ревью».
- `references/contradictions.md`: опечатка и обрывок фразы («и стоит ли им повериять»).
- 20 записей `fidelity` в `docs/playbook/coverage.json` (`--record … by=review`).
- Прогоны приёмки ревьюера — `docs/lab/runs/S-opening/triggers-review.json`, `mutants-review.json`.

## Доделать (если fail)

—

## Проверено

- Приёмка, все зелёные:
  - `skill-check.mjs story-opening --min-refs 9 --min-scripts 2 --fixes F-04` — ок, 0 предупреждений (в том числе
    компиляция 18 примеров ink); после правок — снова ок;
  - `story:coverage -- --skill story-opening --min L2` — все кластеры не ниже L2 (и после правок);
  - `lab:triggers -- --skill story-opening --runs 3 --min build` — story-opening 100 % (42/42), ложных 0 % (0/45);
    сосед story-choices 91 %, промахи ушли в none, не в story-opening;
  - `skills:test -- --skill story-opening` — m01 2/2, m18 2/2, отказов 0;
  - `test:lint` — 93 из 93.
- Ядро `SKILL.md`: 116 строк, модуль, описание симптомами (кто пишет, первая кнопка поздно, каша из имён, лекция о
  прошлом), первый шаг — STATUS.md, `docs/style.md` перед правкой, 9 шагов со ссылками на references и командами,
  10 правил по ID без чисел, формат находки, «Состояние», «объясни», версия.
- Скрипты `opening.mjs`, `first-minutes.mjs`: `--help`, вывод человеку и валидный `--json` на the-number,
  slepoe-pyatno, chuzhoy-golos; числа C-20/C-24 совпадают со `story:lint`; `scripts/lib` не тронут.
- Поведение проверок: `story:lint --json` на трёх историях до (`build/main`) и после — изменились только C-22
  (23→15, 20→18, 30→23 подсказок; предупреждение «SMS — термин хребта» ушло), C-23 (ложное «инцидент на 15-м»
  ушло на the-number и slepoe-pyatno), C-24 (новая подсказка `C-24.by_msg` на the-number). Разница в C-19 — от
  T-18, который в `build/main` пришёл после ответвления; слияние с `build/main` без конфликтов.
- Теги в примерах ink — только `ready` (contact, from, to, delay, sys, chapter, silent, rename, unlock, label).
  Персонажи и ситуации свои, имён и узлов трёх историй каталога в скилле нет; реальных брендов в примерах нет;
  цитат длиннее 15 слов не нашёл. Числа в references — ключами; «5 / 50 сообщений» — поле «Масштаб» по контракту.
- Выборка верности `--fidelity-sample story-opening 20` (seed 1948973981): 19 ok, 1 bad (P-15, исправлен) — 5 %
  при допуске `lab.fidelity.min_share`. Сверил с `docs/books/_clean/*` дополнительно `maass-fire-in-fiction:LESSON-02`
  и `edgerton-hooked:LESSON-10` в `lessons.md`: класс доказательства и оговорки («цифры основателей», «перенос —
  наша оценка») сохранены. F-04: шаги, ink до/после, «что нельзя сломать» на месте.
- Границы: правки вне разрешённых путей — `thresholds.json` (4 новых ключа и запись истории, точечно рядом со
  своими), `checks.md` (только строки «Ключи» C-22 и C-24), `coverage.json` (через `--record`), прогоны в
  `docs/lab/runs/S-opening/`. Без новых ключей проверки не могли бы держать числа вне кода, прецедент — S-choices.
  `docs/books/*` и `_build/*` (кроме отчётов) не тронуты.

## Замечания на будущее

- `checks.md` «Как считать» у C-22, C-23, C-24 отстаёт от кода (вопрос-инцидент, `C-22.rare_chapters`, телефон
  одной сущностью, `C-24.by_msg`) — просьбы `requests.md` п. 3–4, королеве.
- Строки с `owner_via: cluster`, по смыслу чужие (перенести в «опору» нужного TH-NN в `owners.md`):
  `skolnick-video-game-storytelling:P-14`, `RED-08`, `LESSON-13` (механика против сюжета, упрёк без условия —
  `story-choices` / `story-voice` C-47.blame); `bateman-game-writing:P-06`, `failbetter-qbn:P-13`, `LESSON-05`
  (возврат сбившегося, провал откатом — `story-choices` / `story-mystery`); `skolnick-video-game-storytelling:RED-06`
  (последняя глава короче — `story-pace` / `story-endings`); `meaningful-choice:RED-05` (группа из одной кнопки —
  `story-choices`); `mobile-interactive-stories:PAT-08` (хаб «кому написать» — `story-choices` / `story-cast`);
  `choiceofgames-design:GREEN-13` (развилка перед паузой — `story-pauses`).
- `C-25.last_not_max` срабатывает на всех трёх историях и по смыслу — вопрос `story-branch`; решить владельца
  измерения (открытый вопрос исполнителя).
- `opening.mjs` пишет «на входящем 0 (C-24.by_msg)», когда ставка в системной строке до первого входящего
  (slepoe-pyatno) — `first-minutes.mjs` говорит это словами; стоит выровнять вывод.
- C-22 всё ещё считает числа («48», «340», «140») новыми терминами в `C-22.line` — подсказка шумит на счетах и логах.
- `attention.md` переносит из `attention-merged.md` статистику «около 40 % запусков короче 15 секунд» без ключа —
  это опора, а не порог, но лучше держать её словами, как в `decisions-opening.md`.
- Мутанты на монолог о прошлом и перекрытый первый ответ (`requests.md` п. 1) подняли бы шесть RED и F-04 до L3.
