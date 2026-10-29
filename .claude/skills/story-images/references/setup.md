# Установка FLUX 3 Image Klein на Apple Silicon (без прав администратора)

Всё ставится в домашнюю папку. Перенесено из `rubicon-generating-images-with-flux/references/setup.md` (spine-forge):
если там уже стоит — здесь ставить ничего не нужно, скрипты и веса общие.

## Что ставится

| что | как | где |
|---|---|---|
| `uv` | `brew install uv` или установщик в `~/.local/bin` | `uv --version` |
| Python 3.13 | `uv python install 3.13` | `~/.local/share/uv/python/` |
| `hf` CLI | `uv tool install --python 3.13 huggingface_hub` | `~/.local/bin/hf`, токен — `~/.cache/huggingface/token` |
| `flux3-mlx` | `uv tool install --python 3.13 "flux3-mlx[pup]"` | `~/.local/bin/flux3-mlx`; в его окружении mlx, numpy, scipy, Pillow |
| веса | скачиваются при первом запуске | `~/.cache/huggingface/hub/`, 8-bit ≈ 10 ГБ |

Официальный репозиторий закрыт: принять условия на его странице Hugging Face, затем `hf auth login`. Веса MLX 8-bit
порта открыты.

## Проверка

```bash
.claude/skills/story-images/scripts/fluxpy .claude/skills/story-images/scripts/check_setup.py
.claude/skills/story-images/scripts/fluxpy .claude/skills/story-images/scripts/check_setup.py --generate
```

Первая — версии, веса, диск, память, очередь GPU; вторая ещё и делает одну картинку 512².

## Скорость и память (M-серия, 16 шагов)

| задание | на картинку | пик памяти |
|---|---|---|
| 768×1024 из текста, с рамками | 15–30 с | 14 ГБ |
| 1024², + 1 референс | 55–70 с | 14 ГБ |
| загрузка модели из кэша | 2–20 с | — |

## Очередь GPU

Две модели одновременно не влезают. Вся генерация — через `scripts/gpu-run` (общая с spine-forge очередь
`~/.cache/flux-gpu`). Убитый процесс оставил `lock/` — проверить, что ничего не генерируется
(`pgrep -fl "flux3|run_batch"`), и `rmdir ~/.cache/flux-gpu/lock`.

## Ловушки

- `hf: command not found` — `~/.local/bin` не в PATH.
- 403 при скачивании — условия не приняты именно для этого репозитория или токен другого аккаунта.
- Python из временной папки: после установки `ls -l ~/.local/bin/python*` — ничего не должно указывать во временную
  папку; иначе переустановить инструменты с `--force`.
