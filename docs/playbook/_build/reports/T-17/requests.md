# T-17 · просьбы за пределами разрешённых файлов

1. **`docs/playbook/claude-code-format.md` §4.2** — дописать к списку событий потока (проверено на Claude Code 2.1.310,
   `claude -p … --permission-prompts none`):
   - `{"type":"system","subtype":"permission_denied","tool_name":"Bash","tool_use_id":"…","decision_reason_type":"asyncAgent"|…}` —
     отказ по ходу, приходит **после** `tool_use` и до `tool_result` (`is_error: true`);
   - `result.permission_denials: [{tool_name, tool_use_id, tool_input}]` — все отказы прогона в конце.
   Зачем: прогон, оборванный на вызове `Skill`, до `result` не доживает; отказ на сам `Skill` виден только по событию
   по ходу. `lab:triggers` теперь гасит прогон после ответа на `Skill`, а не на самом `tool_use`.
2. **`docs/lab/triggers/README.md`** (если описывает колонки отчёта) — колонка «отказы» и правило: прогон с отказом
   на `lab.denials.blocking_tools` недействителен, в доли не входит; доля таких выше `lab.denials.max_invalid_share` —
   код 1 даже без `--min`.
3. **`docs/playbook/local-lessons.md` LOCAL-03, «Результат»** — дописать: «`skills:test` и `lab:triggers` считают прогон
   с отказом на Bash/Skill недействительным (T-17)», и пункт строки 75 (`--control` хранит находки) — сделано.
