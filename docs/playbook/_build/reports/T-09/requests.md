# T-09 · Просьбы за пределами разрешённых файлов

1. **`CLAUDE.md`, раздел «Команды»** — добавить две строки:
   `npm run story:coverage  # покрытие знаний скиллами: строки базы и свода, кластеры, L0–L3 (-- --help)` и
   `npm run test:coverage   # самопроверка story:coverage`. В строку «Проверка перед коммитом» дописать
   `npm run test:coverage`. Зачем: команда нужна сборщикам скиллов (T-16) и ревьюеру, а `CLAUDE.md` — то, что
   читает каждая сессия.
2. **`docs/playbook/owners.md` §8** — вместо встроенного `node -e '…'` сослаться на постоянную команду
   `npm run story:coverage -- --owners-check` (та же проверка: дубли, полнота по `rules.md`, `checks.md`,
   `skills.md` §6, якорям `attention-merged.md`, владелец из §1). Зачем: две копии проверки разойдутся.
   Сейчас обе дают одно и то же: `строк: 329 · TH: 108 · дубли: нет · нет владельца: нет · чужой владелец: нет`.
3. **`docs/playbook/owners.md` §5, «опора»** — 291 строка базы осталась без владельца: у неё нет TH-NN ни в
   своей «опоре», ни у соседей по кластеру, ни по ссылкам в тексте. Список — `reports/T-09/unowned.md`
   (по разборам). Владельца назначает ревьюер или T-16 дописыванием ID в «опору» (`_build/reports/T-10/requests.md`,
   п. 4); `story:coverage` подхватит без пересборки.
4. **`docs/playbook/flow-review.md` §C «Подсчёт»** — 1851 строка там посчитана по упоминаниям: объявлено
   (заголовок или строка таблицы в определяющем файле) 1843 — P 499, PAT 296, GREEN 231, RED 452, LESSON 365.
   Восемь «лишних» — ссылки на ID, которых в разборе нет (`maass-fire-in-fiction:P-18`, `yorke-into-the-woods:P-18`,
   `dille-ultimate-guide:P-19`, `mobile-interactive-stories:P-16`, `chat-fiction-apps:RED-12`,
   `cron-wired-for-story:LESSON-12`, `video-three-things:LESSON-12`, `LESSON-13`). Можно поправить число.
5. **T-13 (мутанты)** — `story:coverage` засчитывает RED на L3 только с мутантом и ищет полный ID строки
   (`алиас:RED-NN`) в `docs/lab/mutants/**` (`.json`, `.md`, `.ink`). Просьба: в ключе мутанта писать, какие
   строки он ловит, полным ID (`"catches": ["алиас:RED-NN", "C-NN"]`), и класть ключи в `docs/lab/mutants/`.
6. **T-16 (сборщик)** — формат блока, который `story:coverage` признаёт покрытием, описан в `--help` и в
   `reports/T-09/build.md` «Решения»: ID строки в заголовке блока, `sources.md` генерирует
   `npm run story:coverage -- --sources <скилл> --write`. Просьба внести это в промпт сборщика.
