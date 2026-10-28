# T-01 · просьбы за пределами разрешённого

1. **`CLAUDE.md`, раздел «Команды».** Добавить строку
   `npm run test:lib            # самопроверка scripts/lib: синтетические примеры ink и три истории`
   и включить её в «Проверка перед коммитом»: `npm run check:story && npm run test:lib && npm run build && …`.
   Зачем: команду должен знать каждый, кто правит `scripts/lib`, а `CLAUDE.md` — общий файл, не из моего списка.
2. **`CLAUDE.md`, «Устройство».** Строка `scripts/lib/  общая библиотека разбора: ink.mjs (дерево), compile.mjs,
   bot.mjs (прохождения с журналом), story.mjs (загрузка .json / папки / .ink)` рядом с `scripts/check-story.mjs`.
3. **`docs/playbook/thresholds.json` (T-03).** В `check-story.mjs` остались прежние числа: 400 прохождений,
   добор до 2000, предел 2000 строк, длина сообщения 140 знаков; в `story-graph.mjs` — 400 прохождений и предел
   3000 строк. Я их не трогал, чтобы вывод не изменился. Когда появится `thresholds.json`, их стоит перенести
   туда ключами (например `bot.runs`, `bot.runs_max`, `bot.max_lines`, `message.max_chars`).
