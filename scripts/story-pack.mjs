// Сборка и раскладка историй: папка src/stories/<id>/ (исходник) ⇄ один .json (загрузка, Pages, телефон).
// Запуск: npm run story:pack [-- …], npm run story:unpack [-- …]
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { compile, formatMessages } from './lib/compile.mjs';
import {
  STORIES_DIR, compileInput, glueStory, layoutProblems, listStories, loadStory, packStory, sameRuntime,
  storyFromJson, unpackStory, writeFolder,
} from './lib/story.mjs';

const HELP = `npm run story:pack [-- <id | папка> …] [--out <папка>] [--flat] [--json] [--quiet]
npm run story:pack -- --check [<id | путь> …] [--json]
npm run story:unpack [-- <id | файл.json> …] [--out <папка>] [--keep] [--force] [--json]

Исходник истории — папка src/stories/<id>/: meta.json и story.ink, главы — ch01.ink … через INCLUDE.

  story:pack     собирает каждую историю в один <id>.story.json: "ink" — главный файл, "includes" —
                 главы. Такой файл принимает «Загрузить историю». По умолчанию все истории каталога
                 в dist/stories/ (после npm run build он едет на Pages вместе с сайтом).
  --out <папка>  куда писать
  --flat         склеить главы в одно поле "ink" — для старых версий приложения
  --check        ничего не пишет: раскладывает и собирает в памяти и сверяет, что ничего не потерялось —
                 файлы байт в байт, склейка играется так же, как INCLUDE, раскладка по правилам;
                 копия .json рядом с папкой совпадает со сборкой. По умолчанию — каталог и examples/*.json
  story:unpack   раскладывает историю одним .json в папку: шапка и INCLUDE — в story.ink, главы по #chapter.
                 По умолчанию — все .json каталога, у которых ещё нет папки; исходный .json из каталога
                 удаляется (он стал бы устаревшей копией), --keep его оставляет
  --force        перезаписать папку, если она уже есть
  --json         итоги одним JSON в stdout
  --quiet        только ошибки
  --help         эта справка`;

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) { console.log(HELP); process.exit(0); }
const flag = (name) => argv.includes(name);
const outAt = argv.indexOf('--out');
const out = outAt >= 0 ? argv[outAt + 1] : null;
const known = ['--unpack', '--check', '--flat', '--keep', '--force', '--json', '--quiet', '--out'];
const unknown = argv.filter((a) => a.startsWith('--') && !known.includes(a));
if (unknown.length) { console.error(`неизвестный флаг: ${unknown.join(' ')}\n\n${HELP}`); process.exit(2); }
if (outAt >= 0 && !out) { console.error('--out: нужна папка'); process.exit(2); }
const refs = argv.filter((a, i) => !a.startsWith('--') && !(outAt >= 0 && i === outAt + 1));
const asJson = flag('--json');
const say = asJson || flag('--quiet') ? () => {} : console.log;

const shown = (p) => {
  const rel = relative(process.cwd(), p);
  return rel && !rel.startsWith('..') ? rel : p;
};
const isFolder = (p) => existsSync(p) && statSync(p).isDirectory();
const report = [];
let failed = false;
const fail = (entry, problems) => {
  failed = true;
  report.push({ ...entry, ok: false, problems });
  console.error(`✗ ${entry.path}`);
  for (const p of problems) console.error(`   ${p}`);
};

if (flag('--check')) check();
else if (flag('--unpack')) unpack();
else pack();

if (asJson) console.log(JSON.stringify({ ok: !failed, stories: report }, null, 2));
process.exit(failed ? 1 : 0);

function pack() {
  const dir = out ?? 'dist/stories';
  const list = refs.length ? refs : listStories();
  for (const ref of list) {
    const story = loadStory(ref);
    const entry = { id: story.id, path: story.path };
    const built = compile(compileInput(story));
    const problems = layoutProblems(story, { dir: story.form === 'folder' ? story.path : null });
    if (!built.ok) problems.push('ошибка компиляции:\n' + formatMessages(built.errors));
    if (problems.length) { fail(entry, problems); continue; }
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `${story.id}.story.json`);
    writeFileSync(file, JSON.stringify(packStory(story, { flat: flag('--flat') }), null, 2) + '\n');
    report.push({ ...entry, ok: true, out: file, files: story.order.length });
    say(`✓ ${story.path} → ${file} (${story.order.length} ${story.order.length === 1 ? 'файл' : 'файлов'} ink)`);
  }
}

function unpack() {
  const list = refs.length
    ? refs
    : listStories().filter((p) => !isFolder(p));
  if (!list.length) say('раскладывать нечего: у всех историй каталога уже есть папки');
  for (const ref of list) {
    const story = loadStory(ref);
    const entry = { id: story.id, path: story.path };
    if (story.form === 'folder') { fail(entry, ['это уже папка']); continue; }
    const before = compile(compileInput(story));
    if (!before.ok) { fail(entry, ['ошибка компиляции:\n' + formatMessages(before.errors)]); continue; }
    const target = join(out ?? dirname(resolve(story.path)), story.id);
    if (existsSync(target) && !flag('--force')) { fail(entry, [`${shown(target)} уже есть — --force, чтобы перезаписать`]); continue; }
    const folder = unpackStory(story);
    writeFolder(target, folder);
    const after = loadStory(target);
    const built = compile(compileInput(after));
    const problems = [...layoutProblems(after, { dir: target })];
    if (!built.ok) problems.push('после раскладки не компилируется:\n' + formatMessages(built.errors));
    else if (!sameRuntime(before.json, built.json)) problems.push('после раскладки история играется иначе');
    if (problems.length) { fail({ ...entry, path: shown(target) }, problems); continue; }
    const inCatalog = resolve(dirname(story.path)) === resolve(STORIES_DIR);
    const removed = inCatalog && !flag('--keep') && story.form === 'json';
    if (removed) rmSync(story.path);
    report.push({ ...entry, ok: true, out: shown(target), files: after.order, removed });
    say(`✓ ${story.path} → ${shown(target)}/ (${after.order.join(', ')})${removed ? `; ${basename(story.path)} удалён` : ''}`);
  }
}

function check() {
  const examples = existsSync('examples') ? readdirSync('examples').filter((f) => f.endsWith('.json')).sort().map((f) => join('examples', f)) : [];
  const list = refs.length ? refs : [...listStories(), ...examples];
  for (const ref of list) {
    const story = loadStory(ref);
    const entry = { id: story.id, path: story.path, form: story.form };
    const problems = layoutProblems(story, { dir: story.form === 'folder' ? story.path : null });
    const built = compile(compileInput(story));
    if (!built.ok) { fail(entry, [...problems, 'ошибка компиляции:\n' + formatMessages(built.errors)]); continue; }

    // разложить и собрать: папка → .json → папка, файлы байт в байт
    const packed = packStory(story);
    const folder = unpackStory(storyFromJson(packed, { path: story.path }));
    const again = storyFromJson(fromFolder(folder, story), { path: story.path });
    const mainName = folder.files['story.ink'] != null ? 'story.ink' : story.main;
    for (const name of story.order) {
      const back = folder.files[name === story.main ? mainName : name];
      if (story.form === 'folder' && back !== story.files[name]) problems.push(`${name}: после сборки и раскладки файл другой`);
    }
    if (story.order.length > 1 && JSON.stringify(packStory(again)) !== JSON.stringify(packed)) problems.push('сборка разложенной истории даёт другой .json');

    // склейка в один ink играется так же, как INCLUDE
    const glued = compile(glueStory(story));
    if (!glued.ok) problems.push('склейка не компилируется:\n' + formatMessages(glued.errors));
    else if (!sameRuntime(glued.json, built.json)) problems.push('склейка (--flat) играется иначе, чем главы через INCLUDE');

    // история одним текстом: раскладка по главам обратима и играется так же
    if (story.order.length === 1) {
      const split = storyFromJson(fromFolder(unpackStory(story), story), { path: story.path });
      if (glueStory(split).trimEnd() !== story.ink.trimEnd()) problems.push('раскладка по главам теряет текст');
      const b = compile(compileInput(split));
      if (!b.ok || !sameRuntime(b.json, built.json)) problems.push('после раскладки по главам история играется иначе');
    }

    // .json рядом с папкой — копия от story:pack, она не должна отставать
    if (story.form === 'folder') {
      for (const copy of [`${story.path}.json`, `${story.path}.story.json`]) {
        if (!existsSync(copy)) continue;
        const data = loadStory(copy);
        if (JSON.stringify(packStory(data)) !== JSON.stringify(packed)) problems.push(`${copy}: копия устарела — npm run story:pack -- --out ${dirname(copy)}`);
      }
    }

    if (problems.length) { fail(entry, problems); continue; }
    report.push({ ...entry, ok: true, files: story.order });
    say(`✓ ${story.path}: ${story.order.length} ${story.order.length === 1 ? 'файл' : 'файлов'} ink, сборка и раскладка без потерь`);
  }
}

/** Разложенная папка как объект .json — без записи на диск. */
function fromFolder(folder, story) {
  const order = Object.keys(folder.files);
  const [main, ...rest] = order;
  return { ...folder.meta, id: folder.meta.id ?? story.id, ink: folder.files[main], ...(rest.length ? { includes: Object.fromEntries(rest.map((n) => [n, folder.files[n]])) } : {}) };
}
