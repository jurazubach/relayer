# S-review · просьбы за пределами разрешённых путей

1. **`docs/lab/triggers/_routing.json`: фраза «Где игроку станет скучно?» → `story-review`.**
   В обоих прогонах `lab:triggers --skill story-review` она 3 из 3 ушла в `story-pace`: описание `story-pace`
   начинается ровно с «Игроку станет скучно», и голая фраза без «вся история» — по смыслу вопрос о ритме. Моё
   описание («где игроку станет скучно или непонятно») её не перетянуло (`docs/lab/runs/S-review/triggers-skill-2.json`).
   Предложение: либо `"Где игроку станет скучно?": "story-pace"`, либо фраза для ревью — «Где в истории игроку
   станет скучно, а где непонятно?» (на ней ревью 3 из 3 в пробном прогоне на 3 запуска). Зачем: маршрут мерит спорную
   фразу, а не скилл.

2. **`.claude/agents/cold-reader.md`, таблица «Ситуация → кто зовёт → режим», строка «ревью истории целиком».**
   Сейчас: «`story-review` (когда появится) · по его заданию · —». Заменить на: «`story-review` · `opening`
   (торопливый) до первого узла главы 2; `guess` (скептик) — середина; `guess` (внимательный) — скелет `--plan` ·
   `.claude/skills/story-review/references/routing.md`, «Холодный читатель»». Зачем: точки и профили ревью
   уже выбирает `select-lenses.mjs`, агент должен на них ссылаться.

3. **`.claude/agents/story-auditor.md`, «Задание»:** добавить строку «Задание печатает
   `node .claude/skills/story-review/scripts/select-lenses.mjs --story <id> --task <линза>`; строк не больше
   `skill.review.task_max_lines`, остальное — счётом по проверкам». Зачем: контракт задания один, у агента и
   скрипта он не разойдётся.

4. **Права вне скилла (к W0, правка 6).** В живом прогоне `claude -p` (`docs/lab/runs/S-review/live-the-number-pace-3.jsonl`)
   отказы получили только команды вне `allowed-tools` скилла: `ls docs/stories/<id>/` и `grep … -A 14 …thresholds.json`.
   Скрипты и `npm run -s story:*` прошли. Если в `.claude/settings.json` появится `permissions.allow`, стоит добавить
   `Bash(node .claude/skills/*/scripts/*)` — права скилла живут только до конца хода (см. build.md, «Решения»).
