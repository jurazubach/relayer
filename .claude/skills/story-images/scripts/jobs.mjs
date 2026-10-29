// Задание для FLUX по брифу kind "photo": jobs.json для run_batch.py, рамки и референсы точного размера.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ASPECTS, briefProblems } from '../../../../scripts/lib/images.mjs';
import { SKILL, args, brief, convert, dataUri, findImage, withPage, workDir } from './canvas.mjs';

const HELP = `node .claude/skills/story-images/scripts/jobs.mjs --story <id> --name <имя> [--seeds 1,2,3] [--dry-run]

Из брифа docs/stories/<id>/images.json (kind "photo") пишет в images-work/<id>/<имя>/:
  jobs.json    по заданию на сид: промпт = look.photo истории + prompt брифа, размер по aspect
               (${Object.entries(ASPECTS).map(([k, [w, h]]) => `${k} → ${w}×${h}`).join(', ')})
  boxes.json   рамки брифа (bbox [y0, x0, y1, x1] долями, y первым) — если они есть
  ref-<имя>.png  референсы refs брифа (другие картинки истории), обрезанные ровно под размер задания
и печатает команду генерации. Сиды по умолчанию — seeds брифа или 1,2,3: один сид — это удача, не промпт.

  --seeds 1,2,3  какие сиды
  --dry-run      только показать промпт и размер
  --help         эта справка`;

const a = args(process.argv.slice(2), HELP);
if (!a.story || !a.name) { console.error(`нужны --story и --name\n\n${HELP}`); process.exit(2); }
const { manifest, brief: b } = brief(a.story, a.name);
if (b.kind !== 'photo') { console.error(`«${a.name}» — kind ${b.kind}: скрин собирает render.mjs, FLUX ему не нужен`); process.exit(2); }
const problems = briefProblems(a.name, b, manifest.images);
if (problems.length) { console.error(`бриф «${a.name}» с ошибками:\n  ${problems.join('\n  ')}`); process.exit(1); }

const [width, height] = ASPECTS[b.aspect ?? '3:4'];
const seeds = String(a.seeds ?? (b.seeds ?? [1, 2, 3]).join(',')).split(',').map(Number);
const prompt = [manifest.look.photo, b.prompt].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
const dir = workDir(a.story, a.name);
const shown = (p) => relative(process.cwd(), p) || p;

console.log(`${a.name}: ${width}×${height}, сиды ${seeds.join(', ')}, рамок ${b.boxes?.length ?? 0}, референсов ${b.refs?.length ?? 0}\nпромпт (${prompt.split(' ').length} слов): ${prompt}`);
if (a['dry-run']) process.exit(0);

mkdirSync(dir, { recursive: true });
const refs = [];
if (b.refs?.length) {
  await withPage(async (pg) => {
    for (const r of b.refs) {
      const src = findImage(a.story, r);
      if (!src) throw new Error(`референс «${r}»: картинки ещё нет — сначала её`);
      const out = join(dir, `ref-${r}.png`);
      await convert(pg, dataUri(src), out, { fit: 'cover', w: width, h: height });
      refs.push(`ref-${r}.png`);
    }
  });
}
if (b.boxes?.length) writeFileSync(join(dir, 'boxes.json'), JSON.stringify(b.boxes.map(({ id, desc, bbox }) => ({ id, desc, bbox })), null, 1) + '\n');
const jobs = seeds.map((seed) => ({
  id: `${a.name}_s${seed}`, series: a.name, prompt, seed, width, height,
  ...(b.boxes?.length ? { boxes: 'boxes.json' } : {}), ...(refs.length ? { refs } : {}),
}));
writeFileSync(join(dir, 'jobs.json'), JSON.stringify(jobs, null, 1) + '\n');

const s = shown(join(SKILL, 'scripts'));
console.log(`\nзадание: ${shown(join(dir, 'jobs.json'))}\nгенерация (≈ 25–30 с на сид без референса, ≈ 60 с с референсом, в фоне):
  ${s}/gpu-run ${s}/fluxpy ${s}/run_batch.py ${shown(join(dir, 'jobs.json'))}
лист сравнения:
  ${s}/fluxpy ${s}/sheet.py ${shown(join(dir, 'sheet.png'))} ${seeds.map((n) => `s${n}=${shown(join(dir, `${a.name}_s${n}.png`))}`).join(' ')}`);
