# F-docs — ревью

Вердикт: pass

## Исправил сам

Ничего: правок не потребовалось.

## Доделать (если fail)

—

## Проверено

- **Полнота по пунктам задачи.**
  - `CLAUDE.md`: раздел «Агенты и скиллы» (цикл, правила, входы 8 / модули 13, таблица 4 агентов, `agent-guard.mjs`,
    хуки), «Где лежит работа» (`docs/stories/<id>/`, `docs/lab/`, `docs/style.md`), «Симптом → скилл»,
    команды `story:*`, `kb:*`, `lab:*`, `skills:test`, проверка перед коммитом с `kb:clean -- --verify`,
    `kb-index.mjs --check`, `kb-contradictions.mjs --check` (W5 п. 4) — есть.
  - Сверено с репозиторием: скиллов 21, `user-invocable: false` ровно у 13 перечисленных; агентов 4, все `model: opus`;
    вызовы агентов (`story-architect` ← `story-branch/references/plan-update.md`, `cold-reader` ← линзы и т. д.) совпадают
    с описаниями агентов; `scripts/hooks/` — `agent-guard`, `full`, `post-edit`, `session-start` на месте.
  - `README.md`: коротко для людей, «Чужой голос» первым, `minutes: 40` совпадает с `meta.json`, скрытые помечены,
    `?all=1` есть в `src/engine/flags.ts`.
  - `build-plan.md`: «Итог сборки» с итоговыми файлами (все пути существуют), `[x]` у T-00…T-16 и E-01…E-05, E-07/E-08;
    Э4 и Э6 в §0, §3, §13, §15, §16 — формулировка задачи «отменено решением автора 28.10; режимы и напоминания — в X-E7»;
    Э7 в журнале есть (`docs/lab/journal.md`, 2026-10-29); главы — единица автора (A-08 есть в `superseded.md`).
  - `REVIEW.md`: таблица согласования — колонка «стало» ключами; скриптом сверил все 43 ключа из `REVIEW.md` и 8 из
    `flow-example.md` с `thresholds.json` — все существуют. Ссылки «по полю `ink`» переведены на `chNN.ink:строка`
    и `story:pack -- --flat` (флаг есть в `scripts/story-pack.mjs`). `story-findings.md` — дописано про `--flat`.
  - `flow-example.md`: все 33 имени `*.mjs` найдены в `.claude/skills/*/scripts/` или `scripts/hooks/` и принадлежат
    названным скиллам; F-01, F-05, F-08 — существующие `references/fixes/`; флаги сверены по `--help`
    (`stale-check --story --if core|plan`, `skeleton --template/--check`, `panel --run`, `story:trace --persona
    unresponsive --compare silent --partial --mode --from-save`, `story:cold-read --ask --mode opening|click`,
    `qa-six`); пункты гейта совпадают со справкой `release-gate.mjs`; вывод `story:status` без историй — дословно
    из `scripts/story/status.mjs`.
- **Приёмка:** `npm run build` — код 0; `npm run check:story` — код 0. Дополнительно: `kb:clean -- --verify`,
  `kb-index.mjs --check`, `kb-contradictions.mjs --check` — ✓ (цепочка в `CLAUDE.md` рабочая).
- **Границы:** `git diff --name-only master...HEAD` — только 6 разрешённых файлов и отчёты `_build/reports/F-docs/`;
  `docs/books/*` не тронут; цитат из книг и реальных брендов нет.

## Замечания на будущее

- Таблица «симптом → скилл» — 21 строка вместо 15–20: обоснованно (строка на скилл, фразы промерены в W5).
- `lab:triggers -- --runs 3` не гонялся: задача сама себе противоречит («проверь» и «здесь не гонять»), исполнитель
  выбрал второе и передал полный прогон в F-final (`requests.md` п. 4) — королеве не потерять.
- Просьбы `requests.md` п. 1–3 (`owners.md` TH-95 + `teasers.md`, `nicklin` P-16/RED-09 → C-47, `scripts/lib/README.md`
  о скрытых историях) — вне путей задачи, ждут исполнителя.
- В §15 открытыми остались «покрытие закрыто» (L0 2 · L1 1) и «доля срабатываний» — закрыть в F-final.
