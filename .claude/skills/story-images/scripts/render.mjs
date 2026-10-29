// Итоговая картинка по брифу: скрин — из шаблона, фото — выбранный сид FLUX (+ текст поверх, если есть overlay).
// --publish кладёт её в игру: src/stories/<id>/images/<имя>.webp.
import { copyFileSync, existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ASPECTS, briefProblems } from '../../../../scripts/lib/images.mjs';
import { SKILL, args, brief, convert, dataUri, findImage, storyImages, withPage, workDir } from './canvas.mjs';

const HELP = `node .claude/skills/story-images/scripts/render.mjs --story <id> --name <имя> [--pick s2] [--publish] [--max 1280] [--quality 0.82]

Собирает итог по брифу docs/stories/<id>/images.json в images-work/<id>/<имя>/final.png:
  screen   шаблон templates/screen.html (chat, note, list, post) с текстом из data — буквы и цифры точные;
           390 точек в ширину, плотность 2, высота по содержимому
  photo    images-work/<id>/<имя>/<имя>_<pick>.png — выбранный сид после run_batch.py (pick из брифа или --pick);
           слои overlay (почерк, надпись) рисуются поверх шрифтом, а не моделью

  --pick s2      какой сид взять (иначе поле pick брифа)
  --publish      ещё и в игру: webp в src/stories/<id>/images/<имя>.webp (другие файлы с этим именем удаляются),
                 длинная сторона не больше --max (1280), качество --quality (0.82)
  --help         эта справка

Шрифты почерка (Caveat, Neucha, Marck Script — с кириллицей) грузятся из Google Fonts: без сети будет запасной.`;

const a = args(process.argv.slice(2), HELP);
if (!a.story || !a.name) { console.error(`нужны --story и --name\n\n${HELP}`); process.exit(2); }
const { manifest, brief: b } = brief(a.story, a.name);
const problems = briefProblems(a.name, b, manifest.images);
if (problems.length) { console.error(`бриф «${a.name}» с ошибками:\n  ${problems.join('\n  ')}`); process.exit(1); }

const dir = workDir(a.story, a.name);
const final = join(dir, 'final.png');
const template = readFileSync(join(SKILL, 'templates/screen.html'), 'utf8');
const page = (data) => template.replace('/*DATA*/null', JSON.stringify(data).replace(/</g, '\\u003c'));
const shown = (p) => relative(process.cwd(), p) || p;

await withPage(async (pg) => {
  if (b.kind === 'screen') {
    const other = b.data.image ? findImage(a.story, b.data.image) : null;
    if (b.data.image && !other) throw new Error(`data.image «${b.data.image}»: картинки нет — сначала её`);
    await pg.setContent(page({ kind: 'screen', template: b.template, theme: b.theme ?? manifest.look.screen ?? 'dark', data: b.data, imageSrc: other && dataUri(other) }), { waitUntil: 'networkidle' });
    await pg.evaluate(() => window.__ready);
    await pg.locator('#shot').screenshot({ path: final });
  } else {
    const pick = a.pick ?? b.pick;
    if (!pick) throw new Error(`не выбран сид: --pick sN или поле pick в брифе (варианты — ${shown(dir)}/)`);
    const src = join(dir, `${a.name}_${pick}.png`);
    if (!existsSync(src)) throw new Error(`${shown(src)} нет — сначала генерация (jobs.mjs, потом run_batch.py)`);
    if (!b.overlay?.length) copyFileSync(src, final);
    else {
      const [w, h] = ASPECTS[b.aspect ?? '3:4'];
      await pg.setViewportSize({ width: w, height: h });
      await pg.setContent(page({ kind: 'photo', imageSrc: dataUri(src), width: w, height: h, overlay: b.overlay }), { waitUntil: 'networkidle' });
      await pg.evaluate(() => window.__ready);
      await pg.locator('#shot').screenshot({ path: final });
    }
  }
  console.log(`итог: ${shown(final)} — посмотри его глазами (Read), прежде чем класть в игру`);

  if (a.publish) {
    const out = join(storyImages(a.story), `${a.name}.webp`);
    if (existsSync(storyImages(a.story))) {
      for (const f of readdirSync(storyImages(a.story))) if (f.replace(/\.[^.]+$/, '') === a.name && f !== `${a.name}.webp`) rmSync(join(storyImages(a.story), f));
    }
    const r = await convert(pg, dataUri(final), out, { type: 'image/webp', quality: Number(a.quality ?? 0.82), max: Number(a.max ?? 1280) });
    console.log(`в игре: ${shown(out)} — ${r.width}×${r.height}, ${Math.round(r.bytes / 1024)} КБ`);
    const doc = JSON.parse(readFileSync(manifest.path, 'utf8'));
    if (!doc.images[a.name].status || doc.images[a.name].status === 'brief') {
      doc.images[a.name].status = 'draft';
      writeFileSync(manifest.path, JSON.stringify(doc, null, 2) + '\n');
      console.log(`бриф: status → draft (approved ставит автор, посмотрев в игре)`);
    }
  }
}, { scale: b.kind === 'screen' ? 2 : 1 });

