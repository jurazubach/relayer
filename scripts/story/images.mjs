// story:images — картинки фото-сообщений: где стоит #photo, есть ли бриф и файл, что делать дальше.
import { loadStory } from '../lib/story.mjs';
import { ASPECTS, TEMPLATES, imageReport, manifestPath, where } from '../lib/images.mjs';
import { runCli, table } from './core/cli.mjs';

const HELP = `npm run story:images -- [<id> …] [--chapter N] [--name <имя>] [--todo] [--check] [--dir <папка>] [--json]

Картинки фото-сообщений. В сценарии — строка «описание #photo:имя», файл — src/stories/<id>/images/<имя>.webp,
бриф (что на картинке, зачем сюжету, как сделать) — docs/stories/<id>/images.json. Делает их скилл story-images.

  без флагов    таблица: имя, где стоит, вид (photo — FLUX, screen — шаблон скрина), статус брифа, файл;
                ниже — строки #photo без имени (заглушки по старому синтаксису)
  --chapter N   только строки главы N
  --name <имя>  одна картинка: где стоит, контекст сцены (строки вокруг), бриф целиком
  --todo        что сделать: строки без имени и без брифа — с контекстом сцены, чтобы написать бриф
  --check       только ошибки и предупреждения; код 1, если есть ошибки (#photo:имя без брифа и файла,
                бриф с ошибками)
  --dir <папка> где искать брифы (по умолчанию docs/stories) — для проверок
  --json        всё данными
  --help        эта справка

Состояния: ready — файл есть; todo — бриф есть, файла нет (игрок видит заглушку с описанием);
missing — ни брифа, ни файла (ошибка); unused — бриф или файл без строки в сценарии.
Пропорции photo: ${Object.keys(ASPECTS).join(', ')}; шаблоны screen: ${TEMPLATES.join(', ')}.`;

const context = (r) => r.context.map((l) => `      ${l}`).join('\n');

await runCli(HELP, async (args) => {
  const dir = args.get('dir') ?? undefined;
  const chapter = args.get('chapter') ? Number(args.get('chapter')) : null;
  const name = args.get('name');
  const reports = args.refs.map((ref) => {
    const r = imageReport(loadStory(ref), { dir });
    if (chapter == null) return r;
    const refs = r.refs.filter((x) => x.chapter === chapter);
    const items = r.items.filter((i) => i.used.some((u) => u.chapter === chapter));
    return { ...r, refs, items, stubs: r.stubs.filter((x) => x.chapter === chapter) };
  });
  const errors = reports.reduce((n, r) => n + r.errors.length, 0);
  if (args.has('json')) {
    console.log(JSON.stringify(name ? reports.map((r) => ({ id: r.id, item: r.items.find((i) => i.name === name) ?? null })) : reports, null, 1));
    return errors && args.has('check') ? 1 : 0;
  }
  for (const r of reports) {
    if (args.has('check')) {
      if (!r.errors.length && !r.warnings.length) { console.log(`✓ ${r.id}: картинок ${r.items.length}, заглушек без имени ${r.stubs.length}`); continue; }
      for (const e of r.errors) console.log(`✗ ${r.id} · ${e}`);
      for (const w of r.warnings) console.log(`⚠ ${r.id} · ${w}`);
      continue;
    }
    if (name) {
      const i = r.items.find((x) => x.name === name);
      if (!i) { console.log(`${r.id}: картинки «${name}» нет — ни строки #photo:${name}, ни брифа, ни файла`); continue; }
      console.log(`${r.id} · ${name} — ${i.state}${i.kind ? ` · ${i.kind}` : ''}${i.status ? ` · ${i.status}` : ''}`);
      console.log(`   файл: ${i.file ?? 'нет'}`);
      for (const u of i.used) console.log(`   стоит: ${where(u)}${u.from ? ` · от ${u.from}` : ''}\n   описание: ${u.text}\n${context(u)}`);
      console.log(i.brief ? `   бриф (${manifestPath(r.id, dir)}):\n${JSON.stringify(i.brief, null, 2).replace(/^/gm, '      ')}` : `   брифа нет — допиши в ${manifestPath(r.id, dir)}`);
      for (const p of i.problems) console.log(`   ✗ ${p}`);
      continue;
    }
    if (args.has('todo')) {
      const need = [...r.stubs.map((s) => ({ s, why: 'без имени' })), ...r.items.filter((i) => i.state === 'missing').map((i) => ({ s: i.used[0], why: `#photo:${i.name} без брифа` }))];
      const make = r.items.filter((i) => i.state === 'todo');
      console.log(`${r.id}: брифов написать ${need.length}, картинок сделать ${make.length}`);
      for (const { s, why } of need) console.log(`\n · ${where(s)} — ${why}${s.from ? ` · от ${s.from}` : ''}\n   описание: ${s.text}\n${context(s)}`);
      if (make.length) console.log(`\n сделать по брифу: ${make.map((i) => `${i.name} (${i.kind})`).join(', ')}`);
      continue;
    }
    console.log(`${r.id}: картинок ${r.items.length} (готово ${r.items.filter((i) => i.state === 'ready').length}), заглушек без имени ${r.stubs.length} · бриф ${r.manifest}`);
    if (r.items.length) {
      console.log(table(r.items.map((i) => [i.name, i.used.map((u) => `${u.file}:${u.line}`).join(', ') || '—', i.kind ?? '—', i.status ?? '—', i.state, i.problems.length ? `✗ ${i.problems.length}` : '']),
        ['имя', 'где', 'вид', 'бриф', 'состояние', '']));
    }
    if (r.stubs.length) {
      console.log('\nбез имени (заглушка):');
      console.log(table(r.stubs.map((s) => [`${s.file}:${s.line}`, s.knot ?? '', s.text.length > 70 ? `${s.text.slice(0, 69)}…` : s.text])));
    }
    for (const e of r.errors) console.log(`✗ ${e}`);
    for (const w of r.warnings) console.log(`⚠ ${w}`);
    console.log('');
  }
  return errors && args.has('check') ? 1 : 0;
}, { bool: ['todo', 'check'] });
