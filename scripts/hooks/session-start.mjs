// Хук SessionStart (startup|resume|clear|compact): таблица историй из story:status --all.
// stdout SessionStart модель видит сама (claude-code-format.md §3.3), JSON не нужен.
// Заодно снимок src/stories: по нему хук после Bash отличает свои правки от тех, что лежали до сессии.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { clip, ROOT, sessionState, storySnapshot } from './core.mjs';

const HELP = `node scripts/hooks/session-start.mjs < вход-хука.json

Хук SessionStart из .claude/settings.json: печатает npm run story:status -- --all (шаг цикла
каждой истории) и запоминает, какие файлы src/stories уже изменены к началу сессии.
Никогда не падает: ошибка status — одна строка вместо таблицы.

  RELAYER_HOOKS=off   выключить хук
  --help              эта справка`;

if (process.argv.includes('--help') || process.argv.includes('-h')) { console.log(HELP); process.exit(0); }
if (process.env.RELAYER_HOOKS === 'off') process.exit(0);

let input = {};
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { /* без входа — просто статус */ }

const state = sessionState(input.session_id);
const snapshot = storySnapshot();
// после compact и resume снимок уже есть: перезапись спрятала бы от хука правки, сделанные до сжатия
if (snapshot && !state.data.snapshot) state.data.snapshot = snapshot;
state.save();

const r = spawnSync(process.execPath, [join(ROOT, 'scripts/story/status.mjs'), '--all'], { cwd: ROOT, encoding: 'utf8' });
const body = r.status === 0 && r.stdout.trim() ? r.stdout.trim() : `story:status не отработал: ${(r.stderr || '').trim().split('\n')[0] || `код ${r.status}`}`;
console.log(clip(`Истории (npm run story:status -- --all):\n${body}\nПравки src/stories проверяет хук после каждого инструмента; полный прогон главы — node scripts/hooks/full.mjs <id>.`));
