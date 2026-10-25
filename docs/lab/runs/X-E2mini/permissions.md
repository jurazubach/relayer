# Правила `Bash(...)` для команд `story:*` в `claude -p`

Почему в каждом прогоне `story-choices` (натуральные и `skills:test`) по два отказа в правах. Проверено
2026-10-25 на Claude Code 2.1.310, `claude -p … --permission-prompts none`, модель haiku (на права модель не влияет),
слепая копия репозитория. Команда: `npm run -s story:status -- --all`.

## Правило в `--allowedTools`

| правило | `npm run -s story:status -- --all` | с `2>&1 \| head -3` |
|---|---|---|
| `Bash(npm run story:*)`, `Bash(npm run -s story:*)` (как в скиллах и `skills-test.mjs`) | отказ | отказ |
| `Bash(npm run -s story\:*)` | отказ | — |
| `Bash(npm run -s story:status *)` | ok | — |
| `Bash(npm run -s story*)` | ok | ok |
| `Bash(npm run *)` | ok | — |

## Правило в `allowed-tools` скилла (без `--allowedTools`, только `Skill`)

Скилл `story-desk` вызван через `Skill`, потом команда:

| `allowed-tools` в `SKILL.md` | команда | итог |
|---|---|---|
| `Bash(npm run story:*), Bash(node ${CLAUDE_SKILL_DIR}/scripts/*)` (как сейчас) | `npm run -s story:status -- --all` | отказ |
| `Bash(npm run story*), Bash(npm run -s story*), Bash(node ${CLAUDE_SKILL_DIR}/scripts/*)` | `npm run -s story:status -- --all` | ok |
| как сейчас | `node <абсолютный путь>/.claude/skills/story-desk/scripts/story-status.mjs --help` | ok |
| как сейчас | `node .claude/skills/story-desk/scripts/story-status.mjs --help` (относительный) | отказ |

## Вывод

- Хвост `:*` — другая запись хвоста « *» с пробелом: `Bash(npm run story:*)` значит `Bash(npm run story *)`,
  то есть после `story` нужен пробел (code.claude.com/docs/en/permissions, «Wildcard patterns»: «`Bash(ls:*)`
  matches the same commands as `Bash(ls *)`»). Под это правило подходит только `npm run story …`, а `npm run story:lint` —
  нет. Ни одна команда `npm run story:…` в `-p` не проходит; скилл обходит отказ через `node scripts/lint/lint.mjs`
  и теряет `--json` из своего шага 2.
- Рабочая форма — `Bash(npm run story*)` и `Bash(npm run -s story*)`: проходят и с перенаправлением, и с `| head`.
- `${CLAUDE_SKILL_DIR}` разворачивается в абсолютный путь, и правило работает только для него. Модель
  в натуральных прогонах сокращала путь до относительного `.claude/skills/...`, а такая команда без внешнего
  `--allowedTools` получила бы отказ.
