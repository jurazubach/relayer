# Бриф картинки: docs/stories/<id>/images.json

Один файл на историю. `look` — общее для всех картинок, `images` — бриф на имя. Имя совпадает с тегом в ink
(`#photo:ch04-microsd`) и с файлом в игре (`src/stories/<id>/images/ch04-microsd.webp`). Проверка —
`npm run -s story:images -- <id> --check`.

```json
{
  "look": {
    "photo": "Amateur smartphone photo taken by a teenager in <town>, <season>. Ordinary phone camera … Fictional people only, no recognisable brands or logos, no readable text unless the brief asks for it.",
    "screen": "dark"
  },
  "images": {
    "ch04-microsd": {
      "kind": "photo",
      "aspect": "3:4",
      "shows": "Элли нашла в кармане чужую карту памяти и показывает её на ладони.",
      "clue": "крошечная чёрная microSD в центре ладони — узнаётся в пузыре",
      "prompt": "Close-up phone photo looking down at the open left palm …",
      "boxes": [{ "id": "card", "desc": "one tiny black microSD card …", "bbox": [0.44, 0.38, 0.58, 0.62] }],
      "refs": [],
      "overlay": [],
      "seeds": [1, 2, 3],
      "pick": "s3",
      "status": "draft",
      "note": "s1, s2 — похожа на плату; s3 — ряд контактов у края, читается как microSD"
    }
  }
}
```

## Поля

| поле | для | что |
|---|---|---|
| `kind` | все | `photo` — FLUX; `screen` — шаблон |
| `shows` | все | по-русски: что игрок видит и должен понять. Первым, до промпта |
| `clue` | все | деталь, ради которой картинка; по ней проверяют пузырь |
| `status` | все | `brief` → `draft` (лежит в игре, ставит `render.mjs --publish`) → `approved` (ставит автор) |
| `note` | все | почему выбран сид, что отклонено и почему |
| `aspect` | photo | `3:4` (по умолчанию, вертикальное фото с телефона), `4:3`, `1:1`, `9:16`, `16:9` |
| `prompt` | photo | по-английски, длинно и конкретно ([flux.md](flux.md)); `look.photo` добавляется спереди сам |
| `boxes` | photo | где что стоит: `[{id, desc, bbox: [y0, x0, y1, x1]}]`, доли 0..1, **y первым** |
| `refs` | photo | имена других картинок истории — тот же человек или место ([flux.md](flux.md), «Тот же человек») |
| `overlay` | photo | текст поверх фото шрифтом: `[{text, bbox, font, color, size, rotate, align}]` ([screens.md](screens.md)) |
| `seeds` | photo | по умолчанию `[1, 2, 3]` |
| `pick` | photo | выбранный сид: `s3` |
| `template` | screen | `chat`, `note`, `list`, `post` |
| `data` | screen | содержимое скрина ([screens.md](screens.md)) |
| `theme` | screen | `dark` / `light`; по умолчанию `look.screen` |

## Описание в ink и бриф

Строка ink остаётся описанием: «Скрин переписки: «мама: ты где?». Время на скрине обрезано #photo:ch01-mom».
Её видит игрок, пока файла нет, и её читают бот и холодный читатель. Бриф говорит, **как** это показать, и не
добавляет фактов: на скрине ровно «мама» и «ты где?», без времени. Нужен новый факт на картинке — сначала строка
(через `story-fix`), потом бриф.

## Одна картинка в двух местах

Одно имя можно поставить в нескольких строках (страница дневника в ch04 и ch06). Бриф один, файл один.
