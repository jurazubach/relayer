# E-07 · просьбы за пределами разрешённого

1. **`scripts/story-pack.mjs` и `package.json` (postbuild): явный флаг сборки сайта.**
   Сейчас скрытые истории пропускаются, потому что `listStories()` в `scripts/lib/story.mjs` по умолчанию
   прячет `hidden: true`, когда её зовут из npm-скрипта `postbuild` (`npm_lifecycle_event`). Это работает,
   но неявно. Чище: в `story-pack.mjs` флаг `--site` → `listStories(STORIES_DIR, { hidden: false })`,
   в `package.json` — `"postbuild": "node scripts/story-pack.mjs --quiet --site"`, а `SITE_BUILD` из
   библиотеки убрать. Зачем: поведение видно в самой команде и в её `--help`.
2. **`scripts/lib/README.md`**: дописать `listStories(dir, { hidden })`, `isHiddenStory(path)`, `SITE_BUILD`.
3. **`scripts/lib/selftest.mjs`**: случай «папка с `hidden: true` — `listStories(dir)` её видит,
   `listStories(dir, { hidden: false })` — нет».
