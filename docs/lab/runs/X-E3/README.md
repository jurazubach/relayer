# X-E3 · сырые результаты Э3

Э3, 2026-10-28: калибровка ремонта на «Чужом голосе» без живых тестеров. `story-review` → выбор пунктов по топ-10
`story-findings.md` и напоминания (A-03) → `story-fix` (три прогона: v1, v2 с правками скиллов, контрольный v3) →
сравнение `story:diff`, отложенных метрик и холодных читателей до и после. Запись в журнале — `docs/lab/journal.md`.

База — ревизия `2b1b509` (базовый снимок T-15): `src/stories/chuzhoy-golos/` в начале ветки отличается от неё только
полем `days` карточки. Итоговая версия истории в ветке — результат v2 (этапы B, C, D).

| файл | что |
|---|---|
| `review/` | прогон `story-review` фразой автора в слепой копии: `report.md` (полный отчёт, 81 пункт), ответы линз `lens-*.md`, читателей `cold-*.md`, `qa-six.md`, `merged.json`, `transcript.md`, `result.json` |
| `approval.md` | одобрение королевы для v1 (этап B) |
| `fix/run1-*` | v1: `A` — варианты (ничего не правит), `B` — правка по одобрению; `.result.json` (ходы, стоимость, отказы, ответ), `.transcript.md`, `run1.patch` — дифф истории, `run1.story-fix-report.md` — отчёт правки |
| `fix/run2-*` | v2 после правок скиллов: `A`, `B` (правка), `C` (варианты по новым находкам линзы финалов), `D` (их правка); `run2-A.proposal.md` — полный ink вариантов, `run2-final.patch` — итоговый дифф истории |
| `fix/run3-*` | v3 — контроль отказов в правах после полного абзаца о командах (этапы A и B) |
| `before/`, `after/` | снимки метрик (`snap.sh`): lint, trace (оба режима, `--compare silent`), sessions, cast, endings, vars, отвлечённый, `guilt-scan --missing` |
| `metrics.md`, `metrics.json` | `compare.mjs before after` — отложенные метрики до и после |
| `story-diff.txt` | `npm run story:diff -- 2b1b509 . --story chuzhoy-golos` |
| `check-story.txt` | `npm run check:story` на итоговой версии |
| `cold/before`, `cold/run1`, `cold/after` | холодные читатели: `opening` (hurried, персона first, до `ch1_hub`), `return` (unresponsive, до `ch1_evening`), `guess` (attentive, first, до `fin_truth`) |

Инструменты (у каждого `--help`, кроме `snap.sh`):

| файл | что |
|---|---|
| `run.mjs` | прогон `claude -p` в слепой копии с правами Э2; `--write <id>` — разрешить правку истории, `--resume` — продолжить сессию (одобрение вторым сообщением) |
| `snap.sh <папка>` | снимок метрик тех же команд, что T-15, плюс `guilt-scan --missing` |
| `compare.mjs <до> <после>` | таблица отложенных метрик |

Слепые копии — `docs/lab/runs/X-E2/blind.mjs`, ожидание — `X-E2/wait.mjs`, сжатый транскрипт — `X-E2/digest.mjs`,
отчёт ревью — `X-E2/report-of.mjs`. Прогоны шли в отсоединённом `screen` (ревью и правка дольше одного вызова
инструмента), каждый в своей копии; потоки `stream-json` в репозиторий не положены.
