# X-E7 · сырые результаты Э7

Э7, 2026-10-29: переработка «Чужого голоса» полным циклом скиллов в `claude -p` (Opus), фразами автора, каждая
реплика — новая сессия в слепой копии (`docs/lab/runs/X-E2/blind.mjs`), без `--resume`. Решения за автора —
королева в пределах `INTENT.md`, записаны в `docs/stories/chuzhoy-golos/decisions.md` (D-03…D-06). Запись в
журнале — `docs/lab/journal.md`, отчёт — `docs/playbook/_build/reports/X-E7/build.md`.

## Цикл

| шаг | скилл | фраза | итог |
|---|---|---|---|
| 1 | `story-desk` | `runs/desk.phrase.txt` | D-03 «полная переработка», STATUS шаг `review:full` |
| 2 | `story-playtest` (панель «до») | `runs/panel0.phrase.txt` | 36 читателей, `panel-before/`, `panel-before-answer.md` |
| 3 | `story-review` целиком | `runs/review.phrase.txt` | 95 находок (P1 8, P2 54, P3 33), `review/` |
| 4 | `story-core` ×2 | `runs/core.phrase.txt`, `runs/core2.phrase.txt` | D-04 ядро v2: время мира — среда вечер → рассвет воскресенья |
| 5 | `story-plan` | `runs/plan.phrase.txt` | D-05 план v1, скелет, `facts.md`, патч разметки `// финал:` / `// reveal:` |
| 6 | `story-desk` | `runs/desk2.phrase.txt` | D-06: перепись гл. 1, 2, 7, 9, 10 — `chapter-write`, гл. 3–6, 8 — `story-fix` |
| 7 | `chapter-write` ×5 + `story-fix` ×5, параллельно | `runs/chNN.phrase.txt` | главы 1–10 по плану |
| 8 | `story-fix` ×10, параллельно (второй заход) | `runs/fix2-chNN.phrase.txt` | длина, цена молчания, предупреждения линта |
| 9 | `story-playtest` (панель «после») | `runs/panel1.phrase.txt` | 49 читателей, `playtests/sim-2026-10-29-after/`, `panel-after-answer.md` |
| 10 | `story-release` (гейт 1) | `runs/release.phrase.txt` | карточка, `release/` |
| 11 | `story-fix` (по панели «после») | `runs/fix3.phrase.txt` | глава 1 у блока Коннора, метки «по клику», нестыковки |
| 12 | `story-playtest` (набор для друзей) и `story-release` (гейт 2) | `runs/kit.phrase.txt`, `runs/release2.phrase.txt` | `docs/stories/chuzhoy-golos/playtests/wave-1/`, ревизия 2, `.json` |

Недействительные прогоны (с `permission_denials`) — в `runs/*.result.json` поле `permission_denials`; первые
прогоны панели «до» и ядра лежат в `runs/invalid/` (отказ на `Monitor` и на составной `Bash`). Сводка отказов — в
журнале.

## Файлы

| файл | что |
|---|---|
| `run.mjs` | один прогон `claude -p` в слепой копии (`--write` — Edit и Write для правящих скиллов) |
| `runs/*.phrase.txt` | фраза автора дословно |
| `runs/*.result.json` | время, ходы, стоимость, отказы, ответ скилла (у `fix4` — восстановлен по выводу, ответ — в `fix4.digest.md`) |
| `runs/*.digest.md` | сжатый транскрипт (`X-E2/digest.mjs`); полные потоки `stream-json` в репозиторий не положены |
| `before/`, `after1/`, `after2/` | снимки метрик `X-E3/snap.sh` (+ `choices.txt` — профиль кнопок `story-choices/choices.mjs`): до, после переписи, после второго захода |
| `metrics.md` | `X-E3/compare.mjs before after2` и дополнительные метрики Э7 |
| `story-diff.txt` | `npm run story:diff -- master . --story chuzhoy-golos` |
| `review/` | отчёт ревью целиком, ответы линз и читателей |
| `release/` | ответы гейта и дифф карточки |
