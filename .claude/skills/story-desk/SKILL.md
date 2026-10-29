---
name: story-desk
description: Где мы с историей и что дальше; вернулся через неделю — на чём остановились; запиши решение; отложи идею; где список отложенных идей по всем историям; передумал ядро или план — что устарело; ранние главы отстали от поздних; две истории или второй автор. Ведёт STATUS, решения, находки и банк идей.
allowed-tools: Bash(npm run story*), Bash(npm run -s story*), Bash(node ${CLAUDE_SKILL_DIR}/scripts/*)
metadata:
  version: 2
---

# story-desk — состояние работы над историей

Ведёт `docs/stories/<id>/`: на каком шаге цикла история, какое ядро и план в силе, какие решения приняты,
какие идеи отложены, какие отчёты ревью лежат в `reviews/`, что устарело и кто ведёт какую главу. Сюжет, план и
текст не пишет — показывает, где мы, **предлагает варианты** (черновик ядра, текст записи), записывает
одобренное и передаёт шаг владельцу. Числа и списки — только из команд.

**Первый шаг всегда:** `npm run -s story:status -- --all`, затем прочитать `docs/stories/<id>/STATUS.md`.
Неясно, о какой истории речь, — спросить, не угадывать. Просьба не к текущему шагу — сказать об этом.

**Команды — по одной на вызов, ровно как написаны:** без `cd`, пайпов, `;`, `&&`, `>`, `$?`. Составная команда
получает отказ в правах. Упала команда — «нет данных: <команда>», не угадывай.

## Команды

- `node ${CLAUDE_SKILL_DIR}/scripts/story-status.mjs` — `story:status` плюс `--init <id> --step <шаг>`,
  `--check` (формат), `--next --story <id>`, `--step`, `--activate`, `--owners`.
- `node ${CLAUDE_SKILL_DIR}/scripts/decision-add.mjs` — запись D-NN: номер, дата, опоры, `--replaces`,
  хэш узла у отклонённой находки (`--kind отклонено --node --finding`), `--set-core`, `--set-plan`, `--dry-run`.
- `node ${CLAUDE_SKILL_DIR}/scripts/idea-park.mjs` — банк идей: парковка с причиной и условием возврата,
  `--list` по всем историям, `--take`.
- `node ${CLAUDE_SKILL_DIR}/scripts/stale-check.mjs --story <id>` — что устарело: планы на старом ядре, главы
  старше ядра, которое заменило прежнее, и старше плана, отчёты старше правок, приёмы поздних глав, отклонённые
  находки с изменённым узлом; `--if core|plan` — до смены, `--tags-only` — без папки, `--mark` — пометить.

## Границы

- **Вход:** фраза автора о положении дел, решении, идее «на потом», смене ядра или плана, втором авторе;
  находки диагностического скилла (`story-choices`, `story-review`), которые надо записать; хук `SessionStart`.
- **Выход:** ответ «где мы» на один экран; записи в `STATUS.md`, `decisions.md`, `ideas.md`, `reviews/` — только
  одобренные; список устаревшего; следующий шаг и чей он.
- **Не здесь:** новые направления — `story-brainstorm`; содержание ядра — `story-core` (здесь только черновик
  v0 из готового текста); версии плана и порядок (R-09) — `story-plan`; куда свернуть — `story-branch`; сами
  находки — `story-review`, `story-choices`; правки текста — `story-fix`; волны теста — `story-playtest`;
  `facts.md` — `story-continuity`; стиль второго автора — `story-voice`; ревизии — `story-release`.

## Алгоритм

1. **Где мы.** `npm run -s story:status -- --all`; формат — `story-status.mjs --check`. Нет папки —
   `story-status.mjs --init <id> --step <шаг по факту>` (готовая история — `review`, не `idea`).
2. **Ядро.** У готовой истории ядра нет → не спрашивать «какое ядро», а предложить два-три черновика ядра v0
   из текста (ставка, вопрос, оси из `npm run -s story:vars -- --story <id>`, финалы из
   `npm run -s story:endings -- --story <id>`, логлайн) на выбор; после выбора — `decision-add.mjs --kind ядро
   --set-core`. Развилка — [references/decisions-desk.md](references/decisions-desk.md), «Готовая история без ядра».
3. **Что дальше.** `story-status.mjs --next --story <id>`; шаг, владелец, чем закрыт —
   [references/systems/cycle.md](references/systems/cycle.md).
4. **Находки скилла.** Диагностический скилл отдал находки и автор одобрил запись → отчёт
   `docs/stories/<id>/reviews/<дата>-<скилл>.md`, в «Открытые вопросы» `STATUS.md` — одна строка со счётом
   P1/P2 и ссылкой. Отклонённая находка — `decision-add.mjs --kind отклонено`. Формат — [references/state-format.md](references/state-format.md).
5. **Решение или идея.** Автор решил → предложить текст записи, после согласия — `decision-add.mjs`
   ([references/decisions-log.md](references/decisions-log.md)). Идея на потом → `idea-park.mjs`
   с «не взято» и «когда вернуться» ([references/ideas-bank.md](references/ideas-bank.md)).
6. **Смена ядра или плана (Б-5).** Сначала `stale-check.mjs --story <id> --if core`, ядро это или деталь —
   [references/decisions-desk.md](references/decisions-desk.md); после согласия — D-NN с `--replaces` и
   `stale-check.mjs --story <id> --mark` ([references/staleness.md](references/staleness.md)).
7. **Главы 3–N и второй автор (Б-1, Б-6).** Сверка плана с итогами волны 1 — с `story-plan`; после последней
   главы — `stale-check.mjs --story <id>`. Второй автор — `story-status.mjs --owners --story <id>`,
   [references/multi-author.md](references/multi-author.md); переключение — `story-status.mjs --activate <id>`.
8. **Ответ.** Где мы, что устарело (находками ниже), варианты, следующий шаг и чей он. Больше ничего без просьбы.

## Карта references

| развилка | файл |
|---|---|
| просьба мимо шага, нет папки, готовая история без ядра, находки другого скилла, ядро или деталь | [decisions-desk.md](references/decisions-desk.md) |
| состав папки, кто что пишет, `reviews/`, шаги, ревизии | [state-format.md](references/state-format.md), [systems/cycle.md](references/systems/cycle.md) |
| запись D-NN, отказ от находки, откат | [decisions-log.md](references/decisions-log.md) |
| банк идей | [ideas-bank.md](references/ideas-bank.md) |
| что устарело, ранние главы после поздних | [staleness.md](references/staleness.md) |
| второй автор, две истории | [multi-author.md](references/multi-author.md) |
| «объясни»: уроки, споры, признаки, внимание, документы | [lessons.md](references/lessons.md), [contradictions.md](references/contradictions.md), [flags.md](references/flags.md), [attention.md](references/attention.md), [explain.md](references/explain.md), [systems/document-pipeline.md](references/systems/document-pipeline.md) |

## Главные правила

- Записи — только одобренные автором (в конвейере — королевой в пределах `INTENT.md`); скилл предлагает текст
  и варианты, а не вопросы без вариантов (LOCAL-10).
- Решение не правится, а заменяется новым D-NN (`заменяет:`); номера не переиспользуются.
- Первое ядро без `заменяет:` главы не старит; устаревание идёт от смены ядра (`truby-anatomy-of-story:LESSON-05`).
- Порядок шагов — `build-plan.md` §2 и R-09 (владелец `story-plan`): скелет всей истории до глав.
- Ранние главы сверяются с поздними: `narrative-postmortems:P-07`, `RED-12`, `dille-ultimate-guide:LESSON-05`;
  пороги — `story.rewrite.early_chapters`, `story.rewrite.late_chapters`.
- Находки — отчётом в `reviews/`, в `STATUS.md` — строка со ссылкой; отклонённая не всплывает, пока хэш узла тот же.
- Структуру понимает не только автор: легенда — `story:vars`, `story:endings`, карта, план (`bateman-game-writing:P-08`).
- Идея без причины и условия возврата в банк не идёт.

## Формат находки

```
P1 · устарело · plans/plan-v2.md · построен на ядре D-01, ядро стало D-07 · перестроить план (story-plan) · [stale-check п. 1 · замер · высокая]
P2 · нестыковка · STATUS.md · шаг chapters:1-2, ядро не указано · предложить черновик ядра v0 · [story-status --check · замер · высокая]
```

Тип: `устарело`, `нестыковка`, `пропуск` (нет записи, ведущего, причины), `порядок` (шаг мимо цикла).
Приёмов F-NN у скилла нет: правку ink делает владелец.

## Готово, когда

Автор знает шаг, ядро, план и следующий шаг одним экраном; одобренное записано (`story:status` показывает новое
D-NN, отчёт лежит в `reviews/`); устаревшее помечено в «Устарело»; `story-status.mjs --check` без ошибок.

## Режим «объясни»

По просьбе «объясни» или «почему»: почему состояние в файлах, зачем хэш, почему ранние главы переписываются
после поздних, откуда каждое правило и как вести историю самому — [references/explain.md](references/explain.md)
(там же упражнение); источники — [references/sources.md](references/sources.md).

Версия: 2
