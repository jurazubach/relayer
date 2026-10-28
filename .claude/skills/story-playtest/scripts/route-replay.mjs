// Регрессия маршрутов (TH-94, narrative-testing:P-16, SYS-2): маршрут, которым воспроизвели баг тестера или
// записали эталон, сохраняется и после каждой правки проходится снова — то же прохождение, что story:trace
// --from-save. Маршрут сломан, если оборвался раньше времени, застрял или пришёл к другому финалу.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runCli } from '../../../../scripts/story/core/cli.mjs';
import { prepare, readSave, runOnce } from '../../../../scripts/story/core/run.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/route-replay.mjs --story <id> --save <имя> --from-save <журнал.json>
       [--mode realtime|click] [--partial] [--note "что ловит"] [--dir <папка>]
node \${CLAUDE_SKILL_DIR}/scripts/route-replay.mjs --story <id> [--dir <папка>] [--json]

Маршруты для регрессии (скилл story-playtest, P-16): баг тестера сначала воспроизводится маршрутом, потом
чинится, маршрут остаётся тестом. Папка по умолчанию — docs/stories/<id>/playtests/routes/.

--save записывает маршрут из журнала выборов тестера (relayer-choices), сохранения движка или --json
story:trace: кнопки, старт и переменные, режим и что было на нём сейчас — финал, число кнопок, последний узел.
Без --save проходит все сохранённые маршруты и сверяет:
  оборвался   кнопок на пути меньше, чем в маршруте: развилка исчезла или стала уже — маршрут устарел
  застрял     история встала (stuck) или ждёт кнопку без продолжения (stall)
  финал       другой финал, чем при записи: правка изменила исход (бывает задумано — тогда пересохрани)

  --story <id>      история или набор playtest-kit (.json)
  --save <имя>      сохранить маршрут под этим именем (латиница, цифры, дефис)
  --from-save <файл> откуда маршрут
  --mode            режим маршрута (по умолчанию из журнала, иначе realtime)
  --partial         набор с beta_stop
  --note "…"        что ловит маршрут (баг тестера, эталон главы)
  --dir <папка>     где лежат маршруты
  --json            итог данными
  --help            эта справка`;

const snapshot = (r) => ({ ending: r.ending.name, choices: r.route.length, lastKnot: [...r.timeline.items].reverse().find((i) => i.knot)?.knot ?? null, stalls: r.stalls.length });

export function replay(p, saved) {
  const r = runOnce(p, { save: { route: saved.route, start: saved.start ?? null, set: saved.set ?? null }, mode: saved.mode ?? 'realtime', partial: !!saved.partial, persona: 'first' });
  const now = snapshot(r);
  const problems = [];
  // маршрут длиннее пути: часть кнопок уже некуда нажать
  if (now.choices < saved.route.length) problems.push(`оборвался: кнопок ${now.choices} из ${saved.route.length}`);
  if (r.ending.kind === 'stuck') problems.push(`застрял в ${r.ending.node}`);
  if (now.stalls > (saved.expect?.stalls ?? 0)) problems.push(`история стоит: ${now.stalls} (было ${saved.expect?.stalls ?? 0})`);
  if (saved.expect?.ending && now.ending !== saved.expect.ending) problems.push(`финал: ${saved.expect.ending} → ${now.ending}`);
  return { name: saved.name, note: saved.note ?? null, ok: !problems.length, problems, now, expect: saved.expect ?? null };
}

// импорт (самопроверка) не запускает команду
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) runCli(HELP, async (args) => {
  const ref = args.get('story');
  if (!ref || ref === true) throw new Error('нужна --story <id>');
  const p = prepare(ref);
  const dir = args.get('dir') ?? join('docs/stories', p.story.id.replace(/-w\d+$/, ''), 'playtests', 'routes');
  const name = args.get('save');
  if (name) {
    if (name === true || !/^[a-z0-9-]+$/.test(name)) throw new Error('--save: имя латиницей, цифры и дефис');
    const from = args.get('from-save');
    if (!from || from === true) throw new Error('--save без --from-save: откуда взять маршрут');
    const save = readSave(from, p.story.id);
    if (!save.route) throw new Error(`${from}: это сохранение движка без маршрута — нужен журнал выборов (отладка → «Скачать журнал») или --json story:trace`);
    let mode = args.get('mode');
    if (!mode) { try { mode = JSON.parse(readFileSync(from, 'utf8')).mode ?? 'realtime'; } catch { mode = 'realtime'; } }
    const saved = { name, story: p.story.id, note: args.get('note') ?? null, from, mode, partial: args.has('partial'), route: save.route, start: save.start ?? null, set: save.set ?? null };
    const r = runOnce(p, { save, mode, partial: saved.partial, persona: 'first' });
    saved.expect = snapshot(r);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${name}.json`), JSON.stringify(saved, null, 2) + '\n');
    if (args.has('json')) console.log(JSON.stringify(saved, null, 1));
    else console.log(`маршрут ${name} → ${join(dir, `${name}.json`)} · кнопок ${saved.route.length} · финал ${saved.expect.ending}${saved.expect.stalls ? ` · история стоит: ${saved.expect.stalls}` : ''}`);
    return 0;
  }
  const list = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).sort() : [];
  const results = list.map((f) => replay(p, JSON.parse(readFileSync(join(dir, f), 'utf8'))));
  if (args.has('json')) console.log(JSON.stringify({ story: p.story.id, dir, results }, null, 1));
  else {
    console.log(`route-replay · ${p.story.id} · ${dir} · маршрутов ${results.length}`);
    if (!results.length) console.log('  маршрутов нет: сохрани первый — --save <имя> --from-save <журнал.json>');
    for (const r of results) console.log(`  ${r.ok ? '✓' : '✗'} ${r.name}${r.note ? ` (${r.note})` : ''} · финал ${r.now.ending} · кнопок ${r.now.choices}${r.problems.length ? ` · ${r.problems.join('; ')}` : ''}`);
  }
  return results.every((r) => r.ok) ? 0 : 1;
}, { bool: ['partial'] });
