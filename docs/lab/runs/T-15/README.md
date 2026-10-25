# T-15 · Э1 — сырые выводы базового снимка

Ревизия `2b1b509` (`build/main` перед T-15), 2026-10-25, node v24.19.0. Истории — `src/stories/<id>/`;
по содержанию они совпадают с тегом `stories-v1`, отличается только поле `days` на карточке (`*.diff-stories-v1.txt`).
Сводка и выводы — `docs/lab/baseline.md`.

Все прогоны детерминированы: seed 1, число прохождений — по ключам `docs/playbook/thresholds.json`
(`lint.runs.full`, `bot.runs`, `endings.runs`, `trace.runs`). Повтор даст те же файлы.

| файл | команда (из корня репозитория) |
|---|---|
| `<id>.lint.txt` / `.json` | `npm run story:lint -- <id>` / `--json` |
| `all.lint-summary.txt` | `npm run story:lint -- --summary` |
| `<id>.trace.realtime.txt` | `npm run story:trace -- --story <id> --persona all --mode realtime` |
| `<id>.trace.click.txt` | `npm run story:trace -- --story <id> --persona all --mode click` |
| `<id>.trace.compare-silent.txt` | `npm run story:trace -- --story <id> --compare silent` |
| `<id>.distracted-batches.json` | `npm run story:trace -- --story <id> --persona distracted --runs 50 --json`, оставлены только `batches` (полный JSON — 6–20 МБ) |
| `<id>.sessions.txt` / `.json` | `npm run story:sessions -- --story <id> --persona all` / `--json` |
| `<id>.cast.txt` / `.json` | `npm run story:cast -- --story <id>` / `--json` |
| `<id>.endings.txt` / `.json` | `npm run story:endings -- --story <id>` / `--json` |
| `<id>.vars.txt` / `.json` | `npm run story:vars -- --story <id>` / `--json` |
| `<id>.diff-stories-v1.txt` | `npm run story:diff -- stories-v1 . --story <id>` |
| `timing.md` | время каждой команды на историю |
| `metrics.json` | `node docs/lab/runs/T-15/collect.mjs` — сводка из JSON выше, по ней таблица в `baseline.md` |
