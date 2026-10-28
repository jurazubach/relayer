# S-chapter · просьбы за пределами разрешённых путей

1. **`docs/lab/triggers/story-plan.json`, негатив «Напиши главу 2 начисто по плану».** Сейчас это строка без `expect`,
   и `lab:triggers` считает срабатывание `chapter-write` на ней ложным для `chapter-write` (3 из 54 в
   `docs/lab/runs/S-chapter/triggers-story-plan.json`), хотя по таблице «симптом → скилл» это и есть фраза
   `chapter-write`. Просьба: заменить на `{ "text": "Напиши главу 2 начисто по плану", "expect": "chapter-write" }`.
   Порог не нарушен (5,6% < `lab.triggers.max_false`), но замер шумит.

2. **`docs/playbook/flow-review.md` §C, `chapter-lint.mjs` — «обёртка над `story:lint --chapter`».** Флага
   `--chapter` у `story:lint` нет; `chapter-lint.mjs` фильтрует находки по полю `chapter` сам (числа сверены с
   `story:lint` на трёх историях). Если флаг понадобится другим скиллам — завести его в `scripts/lint/lint.mjs`
   (задача инфраструктуры `story:lint`), тогда `chapter-lint.mjs` станет тоньше.
