# Внимание: какие разделы `attention-merged.md` нужны правке

`story-fix` владеет одним якорем — `#attn-cut` («что резать»); он лежит целиком в [compress.md](compress.md),
потому что это и есть таблица режима `--compress` (`owners.md` §6). Остальные якоря правка **берёт ссылкой у
владельца**, а не копией: копия разойдётся с оригиналом при первой правке свода. Ниже — какой якорь открыть на
каком шаге правки.

| шаг правки | якорь | у кого | что проверить |
|---|---|---|---|
| пишешь реплику или кнопку | `#attn-min-message` | `story-voice/references/attention.md` | одна мысль в сообщении, влезает в уведомление, реплика работает, конкретика, одно имя на человека |
| правка трогает паузу или режим | `#attn-player` | `story-time/references/attention.md` | два равноценных режима (A-04), без срока паузы (A-01), без часов игрока (A-02), 1–2 напоминания (A-03) |
| `--compress`: что оставить | `#attn-min-core` | `story-plan` (пока не собран: `attention-merged.md` §2.1) | шесть обязательных правил и скелет из трёх-четырёх опор |
| `--compress`: финал | `#attn-min-ending` | `story-endings/references/attention.md` | финал отвечает на вопрос начала, развязка не отрезана |
| `--compress`: что резать | `#attn-cut` | здесь, [compress.md](compress.md) | таблица «что → почему → упрощение» |
| правка крючка или возвращения | `#attn-return-hook`, `#attn-return-first` | `story-pauses/references/attention.md` | крючок из известного, первая строка — событие мира |
| правка выбора | `#attn-min-choice`, `#attn-min-state` | `story-choices/references/attention.md` | свой ответ у кнопки, след выбора виден |
| пороги нагрузки после правки | `#attn-load` | `thresholds.json` (`story:lint`) | `diff-report.mjs` — числа, не глаз |

Отменённое решениями автора (`#attn-superseded`, `docs/playbook/superseded.md`) правка не вносит как норму: в
частности, «пауза названа словами персонажа со сроком» из разборов внимания отменено A-01, «кнопка ждёт вечно»
— A-03.

## #attn-cut — где он

Целиком, без пересказа — в [compress.md](compress.md), раздел «#attn-cut · Что резать». Источники строк таблицы —
в [sources.md](sources.md) и в блоках [compress-sources.md](compress-sources.md).

- **Когда не работает.** История без пауз (одна сессия): якоря возвращения (`#attn-return-*`) не нужны совсем.
- basis: our_estimate (`owners.md` §6, раскладка якорей).

## Источники

`docs/playbook/attention-merged.md` (§1–§3, §5, §6); `docs/playbook/owners.md` §6; `docs/playbook/superseded.md`.
