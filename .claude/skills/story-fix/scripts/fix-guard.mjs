// Страховка правки (safety.md): что не должно сломаться между «до» и «после» — сборка, узлы, переменные и
// их видимые чтения, финалы, улики (// reveal:), метки // намеренно:, сохранённые маршруты. Разбор — scripts/lib,
// индекс переменных — тот же, что у story:vars, маршрут — story:trace --route. Решает не скрипт, а сверка с ink:
// «✗» — сломано, «⚠» — проверь глазами, «✓» — цело.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compile } from '../../../../scripts/lib/compile.mjs';
import { compileInput, loadStory } from '../../../../scripts/lib/story.mjs';
import { ROOT, compareTrees, parseCli, storyJson, treeOf, twoVersions } from './fix-core.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/fix-guard.mjs --story <id> [--from <реф>] [--to <реф>] [--routes <файл>] [--json]

Что правка не должна сломать (story-fix, safety.md). Сравнивает историю «до» (по умолчанию HEAD) и «после»
(по умолчанию рабочая копия):

  сборка      «после» компилируется (inkjs, как check:story)
  узлы        удалённые узлы; был ли узел финалом или местом раскрытия
  переменные  исчезла запись или последнее видимое чтение (реплика, подстановка, кнопка) — C-01…C-03;
              новая переменная без видимого чтения
  финалы      метки // финал: — ни одна не пропала
  улики       метки // reveal: — не пропали и не переехали; убранные реплики в узлах раскрытия (RED-10)
  факты       убранные реплики со словами из docs/stories/<id>/facts.md — улика или мотив? (RED-10)
  метки       новые // намеренно: — у каждой причина и запись решения через story-desk
  маршруты    сохранённые маршруты story-playtest (docs/stories/<id>/playtests/routes/, route-replay.mjs) —
              всегда, если они есть; --routes <файл>: строки «0,2,1 [финал]» — story:trace --route на «после»
              (narrative-testing:P-16: баг сначала маршрутом, после правки — тот же маршрут)

  --story <id>     история (папка src/stories/<id>)
  --from <реф>     «до» (по умолчанию HEAD)
  --to <реф>       «после» (по умолчанию «.» — рабочая копия)
  --routes <файл>  маршруты для повтора; # — комментарий
  --json           данными: { story, verdict, items: [{ area, level, text }] }
  --help           эта справка

Код выхода: 0 — нет «✗»; 1 — есть «✗» (сломано, правку не сдавать); 2 — не запустился.`;

const args = parseCli(process.argv.slice(2), ['json']);
if (args.has('help') || args.has('h')) { console.log(HELP); process.exit(0); }
const id = args.get('story');
if (!id) { console.error('нужен --story <id>\n'); console.log(HELP); process.exit(2); }

const items = [];
const add = (area, level, text) => items.push({ area, level, text });
let v;
try { v = twoVersions(id, String(args.get('from', 'HEAD')), String(args.get('to', '.'))); } catch (e) { console.log(`нет данных: ${e.message}`); process.exit(2); }

try {
  if (!v.after) { add('сборка', '✗', `истории нет в ${v.label(v.b)}`); finish(); }
  const built = compile(compileInput(loadStory(v.after)));
  if (!built.ok) add('сборка', '✗', `не компилируется: ${(built.errors ?? []).slice(0, 3).map((e) => e.message ?? e).join('; ')}`);
  else add('сборка', '✓', 'компилируется');

  const factsFile = join(ROOT, 'docs/stories', id, 'facts.md');
  const A = treeOf(v.before);
  const B = treeOf(v.after);
  if (!A) { add('сравнение', '⚠', `истории нет в ${v.label(v.a)} — сравнивать не с чем, проверена только сборка`); finish(); }

  for (const x of compareTrees(A, B, { factsText: existsSync(factsFile) ? readFileSync(factsFile, 'utf8') : null })) items.push(x);

  // маршруты: сохранённые story-playtest (route-replay.mjs, docs/stories/<id>/playtests/routes/) — всегда, если есть
  const replay = join(ROOT, '.claude/skills/story-playtest/scripts/route-replay.mjs');
  if (existsSync(replay) && v.after && !v.after.includes('story-fix-rev-')) {
    const r = spawnSync(process.execPath, [replay, '--story', id, '--json'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
    let data = null;
    try { data = JSON.parse(r.stdout); } catch { add('маршруты', '⚠', `нет данных: route-replay.mjs --story ${id}: ${(r.stderr || '').trim().split('\n').pop() ?? ''}`); }
    for (const x of data?.results ?? []) add('маршруты', x.ok ? '✓' : x.problems.some((p) => /застрял/.test(p)) ? '✗' : '⚠', `${x.name}${x.note ? ` (${x.note})` : ''}: ${x.ok ? 'как при записи' : x.problems.join('; ')}`);
  }

  // маршруты из файла: строки «0,2,1 [финал]» — повтор на «после»
  const routesFile = args.get('routes');
  if (routesFile) {
    const lines = readFileSync(String(routesFile), 'utf8').split('\n').map((l) => l.replace(/#.*$/, '').trim()).filter(Boolean);
    for (const l of lines) {
      const [route, expect] = l.split(/\s+/);
      const r = storyJson('trace', ['--story', v.after, '--route', route]);
      if (!r.ok) { add('маршруты', '✗', `${route}: нет данных: ${r.cmd}: ${r.error}`); continue; }
      const run = (r.data.stories?.[0] ?? r.data).runs?.[0];
      const ending = run?.ending?.name ?? (run?.ended ? 'END' : null);
      if (!ending) add('маршруты', '✗', `${route}: прохождение не дошло до финала (тупик или маршрут сломан правкой)`);
      else if (expect && ending !== expect) add('маршруты', '⚠', `${route}: финал ${expect} → ${ending} — правка поменяла исход этого пути`);
      else add('маршруты', '✓', `${route}: ${ending}`);
    }
  }
  finish();
} finally {
  v.done();
}

function finish() {
  const verdict = items.some((x) => x.level === '✗') ? 'сломано' : items.some((x) => x.level === '⚠') ? 'проверь' : 'цело';
  if (args.has('json')) console.log(JSON.stringify({ story: id, from: v.label(v.a), to: v.label(v.b), verdict, items }, null, 1));
  else {
    console.log(`fix-guard · ${id} · ${v.label(v.a)} → ${v.label(v.b)}`);
    for (const x of items) console.log(`${x.level} ${x.area.padEnd(10)} ${x.text}`);
    console.log(`итог: ${verdict}${verdict === 'сломано' ? ' — правку не сдавать, чинить «✗»' : verdict === 'проверь' ? ' — каждое «⚠» сверить с ink (safety.md)' : ''}`);
  }
  v.done();
  process.exit(verdict === 'сломано' ? 1 : 0);
}
