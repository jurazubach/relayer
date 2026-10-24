# Как делать фичу движка

- Логика — в `src/engine`, оформление — в `src/ui`. Компоненты `ui` чистые (см. `CLAUDE.md`).
- В `docs/capabilities.json` фича получает статус `ready` или `partial`, с `syntax`, `looks`, примером и `since`. Затем `npm run prompt -- --quiet`.
- Новые `data-testid` — в список `CLAUDE.md`. Под фичу — e2e-тест на фикстуре, а не на текстах наших историй.
- Стили — по БЭМ, только токены `src/styles/tokens.css`.
- Решения автора про режимы, напоминания и платную границу — в `INTENT.md`. Не отступай от них.
- Проверки: `npm run build`, `HEADLESS=1 npm run test:e2e`, `npm run check:story`, `npm run prompt -- --quiet`.
