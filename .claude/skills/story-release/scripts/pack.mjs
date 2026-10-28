// Сборка файла выпуска (скилл story-release, INTENT «Отдельные .ink-файлы»): папка истории → один .json
// для загрузки и Pages. Обёртка над npm run story:pack: сначала --check (раскладка, склейка играется так же,
// как INCLUDE), потом — только с --write — сборка, и сверка, что поля карточки доехали до файла.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadStory } from '../../../../scripts/lib/story.mjs';

const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const CARD = ['id', 'revision', 'title', 'tagline', 'synopsis', 'minutes', 'days', 'chapters', 'characters'];

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/pack.mjs <id> [--write] [--out <папка>] [--json]

Файл выпуска одной истории. По умолчанию ничего не пишет: npm run story:pack -- --check <id> (раскладка
по правилам CLAUDE.md, склейка глав играется так же, как INCLUDE, копия .json рядом не устарела).
  --write        собрать <id>.story.json (npm run story:pack -- <id> --out <папка>) и сверить, что поля
                 карточки (${CARD.join(', ')}, а ещё teasers и free_chapters, если они есть в meta.json)
                 доехали до файла без изменений
  --out <папка>  куда писать (по умолчанию dist/stories, как у npm run build)
  --json         всё данными
  --help         эта справка

Выпуск в каталог Pages — пуш в master (CLAUDE.md); в конвейере не пушим: собранный файл — для загрузки
кнопкой «Загрузить историю» и для тестеров.`;

const pack = (args) => spawnSync('node', ['scripts/story-pack.mjs', ...args], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });

export function packCheck(ref, { write = false, out = 'dist/stories' } = {}) {
  const story = loadStory(ref);
  const check = pack(['--check', ref, '--json']);
  let checked = null;
  try { checked = JSON.parse(check.stdout); } catch { /* ниже — по коду выхода */ }
  const res = { id: story.id, path: story.path, check: { ok: check.status === 0, report: checked ?? (check.stdout || check.stderr).trim().split('\n').slice(-5) } };
  if (!write || !res.check.ok) return res;
  const built = pack([ref, '--out', out, '--json']);
  const file = join(resolve(ROOT, out), `${story.id}.story.json`);
  if (built.status !== 0 || !existsSync(file)) return { ...res, write: { ok: false, error: (built.stderr || built.stdout).trim().split('\n').slice(-3).join(' ') } };
  const data = JSON.parse(readFileSync(file, 'utf8'));
  const meta = story.meta ?? {};
  const fields = [...CARD, ...['teasers', 'free_chapters', 'series', 'features'].filter((k) => k in meta)];
  const lost = fields.filter((k) => k in meta && JSON.stringify(data[k]) !== JSON.stringify(meta[k]));
  return { ...res, write: { ok: !lost.length, file: relative(ROOT, file), bytes: statSync(file).size, lost, includes: Object.keys(data.includes ?? {}).length } };
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) { console.log(HELP); return; }
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const ref = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--out');
  if (!ref) { console.log(HELP); process.exitCode = 2; return; }
  const r = packCheck(ref, { write: args.includes('--write'), out: opt('--out') ?? 'dist/stories' });
  if (args.includes('--json')) console.log(JSON.stringify(r, null, 2));
  else {
    console.log(`${r.path} · файл выпуска`);
    console.log(`   ${r.check.ok ? '✓' : '✗'} story:pack --check${r.check.ok ? ': раскладка и склейка без потерь' : ''}`);
    if (!r.check.ok) for (const l of r.check.report?.stories?.flatMap((x) => x.problems ?? []) ?? [].concat(r.check.report)) console.log(`     ${typeof l === 'string' ? l : JSON.stringify(l).slice(0, 200)}`);
    if (r.write) console.log(r.write.ok ? `   ✓ ${r.write.file}: ${Math.round(r.write.bytes / 1024)} КБ, глав в includes ${r.write.includes}, поля карточки на месте` : `   ✗ сборка: ${r.write.error ?? `поля карточки расходятся: ${r.write.lost.join(', ')}`}`);
    else if (r.check.ok) console.log('   сборка — с --write (по умолчанию ничего не пишет)');
  }
  if (!r.check.ok || (r.write && !r.write.ok)) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
