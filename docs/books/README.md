# База знаний сценариста

Выжимки из книг, статей и докладов о том, как писать, проверять и генерировать интерактивные истории. Из них потом собираем скиллы и команды: правила для `docs/PROMPT.md`, проверки для `check:story` и карты сюжета, чек-листы ревью.

Это не копии книг. Книги мы не скачиваем. Каждый разбор написан своими словами по открытым материалам: блоги и доклады авторов, страницы издателей, интервью, рецензии. Плюс знания модели, помеченные уровнем уверенности. Цитаты — не больше одной на файл и до 15 слов.

## Что лежит в папке источника

`docs/books/<алиас>/`:

| файл | что внутри |
|---|---|
| `README.md` | паспорт: что за источник, главная мысль, лучшие выводы, что проверено, а что нет |
| `principles.md` | принципы `P-NN`: суть, механизм, как применить в relayer, пример, как проверить |
| `patterns.md` | приёмы и структуры `PAT-NN` с примерами на ink |
| `flags.md` | зелёные `GREEN-NN` и красные `RED-NN` флаги: как обнаружить и как чинить |
| `checklists.md` | пошаговые процедуры: начать историю, написать главу, ревью, тест |
| `for-relayer.md` | готовые правила для генератора, идеи автопроверок, скиллов и команд, разбор наших историй |
| `REVIEW.md` | вердикт агента-ревьюера, оценки, что исправлено и что осталось под вопросом |

## Как собирается

Конвейер — `_pipeline/`:
- `sources.json` — список источников: зачем нам источник и что в нём раскопать;
- `extract.md` — промпт агента-разборщика;
- `review.md` — промпт агента-ревьюера;
- `run.mjs` — запуск.

Один источник разбирает один агент `claude -p --dangerously-skip-permissions`. Как только разбор готов, тот же источник забирает агент-ревьюер и правит файлы. Остальные разборы в это время продолжаются.

```bash
node docs/books/_pipeline/run.mjs ashwell-standard-patterns   # один источник
node docs/books/_pipeline/run.mjs --priority 1 -j 4           # первая очередь, 4 агента разом
node docs/books/_pipeline/run.mjs --all                       # всё, что ещё не готово
node docs/books/_pipeline/run.mjs --status                    # обновить таблицу ниже
```

Готовое повторно не запускается; чтобы переделать — `--force`, только ревью — `--review-only`. Логи агентов лежат в `_pipeline/logs/`, в git они не попадают.

## План

Приоритет: 1 — отвечает на наши боли прямо (начало, скука, выбор, ветвление, тестирование); 2 — база ремесла; 3 — по необходимости.

⬜ не начато · 🔎 разобрано, ждёт ревью · ✅ разобрано и проверено

<!-- status:start -->
| | П | алиас | источник | разбор | ревью | второй проход |
|---|---|---|---|---|---|---|
| 🏁 | 1 | [ashwell-standard-patterns](ashwell-standard-patterns/) | Standard Patterns in Choice-Based Games — Sam Kabo Ashwell | да | готово с оговорками | готово с оговорками |
| 🏁 | 1 | [emshort-structures](emshort-structures/) | Small-Scale Structures in CYOA; Beyond Branching: Quality-Based, Salience-Based and Waypoint Narrative Structures — Emily Short | да | готово с оговорками | готово с оговорками |
| 🏁 | 1 | [narrative-testing](narrative-testing/) | Тестирование и ревью интерактивных сюжетов — Emily Short; SFWA; GDC (Ubisoft); Choice of Games; PlaytestCloud | да | готово с оговорками | готово с оговорками |
| 🏁 | 1 | [choiceofgames-design](choiceofgames-design/) | Choice of Games: принципы дизайна выборов — Choice of Games (Dan Fabulich, Adam Strong-Morse и др.) | да | готово с оговорками | готово с оговорками |
| 🏁 | 1 | [meaningful-choice](meaningful-choice/) | Осмысленный выбор в играх — Brice Morrison; Sid Meier («интересные решения»); Jesse Schell | да | готово с оговорками | готово с оговорками |
| 🏁 | 1 | [inkle-ingold](inkle-ingold/) | inkle: Adventures in Text (GDC 2015), Narrative Sorcery (GDC 2017), Writing with ink — Jon Ingold, inkle | да | готово с оговорками | готово с оговорками |
| 🏁 | 1 | [messenger-genre](messenger-genre/) | Истории в мессенджере и в реальном времени — Lifeline (Dave Justus, 3 Minute Games), Bury Me My Love (The Pixel Hunt), Mr. Robot:1.51exfiltrati0n, Emily is Away, Simulacra, Replica, Sara Is Missing и др. | да | готово с оговорками | готово с оговорками |
| 🏁 | 1 | [video-three-things](video-three-things/) | Три простые вещи вместо описания мира — автор видео неизвестен (расшифровку прислал пользователь) | да | готово с оговорками | готово с оговорками |
| 🏁 | 1 | [edgerton-hooked](edgerton-hooked/) | Hooked: Write Fiction That Grabs Readers at Page One — Les Edgerton | да | готово с оговорками | готово с оговорками |
| 🏁 | 1 | [maass-fire-in-fiction](maass-fire-in-fiction/) | The Fire in Fiction (и Writing the Breakout Novel) — Donald Maass | да | готово с оговорками | готово с оговорками |
| 🏁 | 1 | [schell-art-of-game-design](schell-art-of-game-design/) | The Art of Game Design: A Book of Lenses — Jesse Schell | да | готово с оговорками | готово с оговорками |
| 🏁 | 1 | [snyder-save-the-cat](snyder-save-the-cat/) | Save the Cat! — Blake Snyder | да | готово с оговорками | готово с оговорками |
| 🏁 | 1 | [cron-wired-for-story](cron-wired-for-story/) | Wired for Story — Lisa Cron | да | готово с оговорками | готово с оговорками |
| 🏁 | 1 | [mystery-fair-play](mystery-fair-play/) | Честная загадка: правила детектива и раскладка улик — Ronald Knox (декалог, 1929), S. S. Van Dine (20 правил, 1928), практика жанра | да | готово с оговорками | готово с оговорками |
| 🏁 | 2 | [nicklin-writing-for-games](nicklin-writing-for-games/) | Writing for Games: Theory and Practice — Hannah Nicklin | да | готово с оговорками | готово с оговорками |
| 🏁 | 2 | [skolnick-video-game-storytelling](skolnick-video-game-storytelling/) | Video Game Storytelling — Evan Skolnick | да | готово с оговорками | готово с оговорками |
| 🏁 | 2 | [truby-anatomy-of-story](truby-anatomy-of-story/) | The Anatomy of Story — John Truby | да | готово с оговорками | готово с оговорками |
| 🏁 | 2 | [yorke-into-the-woods](yorke-into-the-woods/) | Into the Woods — John Yorke | да | готово с оговорками | готово с оговорками |
| 🏁 | 2 | [mckee-story](mckee-story/) | Story — Robert McKee | да | готово с оговорками | готово с оговорками |
| 🏁 | 2 | [failbetter-qbn](failbetter-qbn/) | Failbetter: quality-based narrative и сторилеты — Failbetter Games, Alexis Kennedy | да | готово с оговорками | готово с оговорками |
| 🏁 | 2 | [sheldon-character-storytelling](sheldon-character-storytelling/) | Character Development and Storytelling for Games — Lee Sheldon | да | готово с оговорками | готово с оговорками |
| 🏁 | 3 | [vogler-writers-journey](vogler-writers-journey/) | The Writer's Journey — Christopher Vogler | да | готово с оговорками | готово с оговорками |
| 🏁 | 3 | [bateman-game-writing](bateman-game-writing/) | Game Writing: Narrative Skills for Videogames — под редакцией Chris Bateman | да | готово с оговорками | готово с оговорками |
| 🏁 | 3 | [dille-ultimate-guide](dille-ultimate-guide/) | The Ultimate Guide to Video Game Writing and Design — Flint Dille, John Zuur Platten | да | готово с оговорками | готово с оговорками |
| 🏁 | 3 | [procedural-storytelling](procedural-storytelling/) | Procedural Storytelling in Game Design — под редакцией Tanya X. Short и Tarn Adams | да | готово с оговорками | готово с оговорками |
| 🏁 | 1 | [chat-fiction-apps](chat-fiction-apps/) | Чат-фикшн приложения: Hooked, Yarn, Tap и подобные — Hooked (Telepathic), Yarn (Mammoth Media), Tap by Wattpad и др. | да | готово с оговорками | готово с оговорками |
| 🏁 | 1 | [mobile-interactive-stories](mobile-interactive-stories/) | Мобильные интерактивные истории: Choices, Episode, Chapters — Pixelberry, Episode Interactive, Crazy Maple Studio | да | готово с оговорками | готово с оговорками |
| 🏁 | 1 | [narrative-postmortems](narrative-postmortems/) | Постмортемы нарративных игр: что сломалось и что починили — inkle (80 Days, Heaven's Vault), Mountains (Florence), Sam Barlow (Her Story), Nerial (Reigns), Telltale, Dontnod (Life is Strange) и др. | да | готово с оговорками | готово с оговорками |
| 🏁 | 1 | [serial-hooks](serial-hooks/) | Сериальные крючки: клиффхэнгеры, эпизоды, веб-сериалы — практика сериалов, веб-романов и сериальных платформ (Kindle Vella, Radish, вебтуны) | да | готово с оговорками | готово с оговорками |
| 🏁 | 1 | [attention-today](attention-today/) | Внимание сегодняшнего игрока: что правда, а что миф — исследования внимания и мобильных сессий; разборы мифа о «внимании золотой рыбки» | да | готово с оговорками | готово с оговорками |
<!-- status:end -->

## Второй проход: глубже, уроки, сегодняшний игрок

После разбора и ревью каждый источник проходит ещё два шага: `deepen.md` → `review2.md` (`run.mjs --deep`). Второй проход добавляет:
- **устройство авторских систем по смыслу:** элементы, их функция, порядок, что ломается, если шаг пропустить, как систему сжимают для коротких форм;
- **`lessons.md`:** уроки практиков из докладов, постмортемов и интервью. Что не сработало, что поменяли, какой получили результат и что из этого берём мы;
- **`attention.md`:** адаптация под игрока с телефоном и коротким вниманием. Минимальная версия каждого принципа, первые 30 секунд, 3 минуты и первая глава, возвращение после паузы, пороги нагрузки, граница с тёмными паттернами;
- **связи с другими источниками:** где источники согласны, где противоречат друг другу и как это решать у нас;
- **итоги:** `DEEPEN.md` и `REVIEW-2.md`.

Отдельно добавлены источники про рынок и удержание: чат-фикшн приложения, мобильные интерактивные истории, постмортемы нарративных игр, сериальные крючки, данные о внимании (`chat-fiction-apps`, `mobile-interactive-stories`, `narrative-postmortems`, `serial-hooks`, `attention-today`).

🏁 — второй проход пройден и проверен.

## Дальше

- [x] Свести разборы в общий свод: [`docs/playbook/`](../playbook/) — правила генератора, проверки, находки по историям, план скиллов (`_pipeline/synthesize.mjs`).
- [ ] Обновить промпт генератора (`docs/capabilities.json` → `docs/PROMPT.md`) по `docs/playbook/rules.md`.
- [ ] Добавить автопроверки в `scripts/check-story.mjs` и карту сюжета по `docs/playbook/checks.md` (первая волна).
- [ ] Собрать скиллы по `docs/playbook/skills.md`.
- [ ] Поправить истории по `docs/playbook/story-findings.md` (топ-10).
