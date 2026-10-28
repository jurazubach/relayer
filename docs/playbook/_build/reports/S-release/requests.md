# S-release · просьбы за пределы путей задачи

1. **Мутанты зоны `story-release`** (`scripts/lab/mutants-spec.mjs`, `docs/lab/mutants/key.json`). Сейчас в зоне
   один мутант (m19, граница без крючка). Просьба добавить два: (а) затравка `teasers` с именем героя, который
   впервые звучит в главе 3 (ловит C-49 (ж) `C-49.teaser_chapter`); (б) `features` обещает «три финала», а
   финал один (C-49 (з) `C-49.endings_min`). Зачем: RED-строки карточки (`video-three-things:RED-08`,
   `dille-ultimate-guide:RED-02`) поднимаются до L3 только мутантом, и полнота скилла меряется больше чем на
   одном дефекте.
2. **`story-plan/references/free-boundary.md`** (когда появится): ставить границу командой
   `node .claude/skills/story-release/scripts/boundary-check.mjs --story <id> --free N` — примерка без правки
   `meta.json`; правило границы — `story-release/references/free-boundary-gate.md` (владелец, `owners.md` §7).
3. **`owners.md` §5, TH-95** — добавить в «файл» `teasers.md` (затравки вынесены из `card.md` отдельным файлом,
   карточка — одна тема на два файла). Раскладка кластеров не меняется.
4. **`docs/lab/triggers/story-time.json`** — фраза «на карточке 30 минут, а по факту история идёт три дня — как
   посчитать честно?» стоит в позитивах `story-time`, хотя карточка и два времени — TH-98 у `story-release`
   (`two-durations.md`, `durations.mjs`). Если `lab:triggers` покажет перехват, предлагаю перенести её в
   `story-release.json` или переформулировать в `story-time` про длину истории, а не про карточку. Решает итог
   волны.
5. **README «teasers»** — дописать одной строкой, что затравки проверяет `story:lint` C-49 (ж): 2–3, имена и
   числа из главы 1, стиль `docs/style.md`. Файл общий, правка не моя.
