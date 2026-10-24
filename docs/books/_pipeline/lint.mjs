// Надзор за базой знаний: длинные цитаты (авторское право), лишние цитаты на файл, пустые разделы,
// пункты без источника и «вода». Запуск: node docs/books/_pipeline/lint.mjs [алиас…]
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BOOKS = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILES = ['README.md', 'principles.md', 'patterns.md', 'flags.md', 'checklists.md', 'for-relayer.md'];
const WATER = /важно помнить|следует отметить|как известно|ключ к успеху|создавайте интересных/gi;

const pick = process.argv.slice(2);
const dirs = readdirSync(BOOKS).filter((d) => !d.startsWith('_') && statSync(join(BOOKS, d)).isDirectory() && (!pick.length || pick.includes(d)));

let problems = 0;
for (const d of dirs) {
  const out = [];
  for (const f of FILES) {
    const p = join(BOOKS, d, f);
    if (!existsSync(p)) { out.push(`нет ${f}`); continue; }
    // код и примеры ink не проверяем: там реплики персонажей, а не цитаты
    const text = readFileSync(p, 'utf8').replace(/```[\s\S]*?```/g, '');
    const lines = text.split('\n').length;
    if (lines < 15) out.push(`${f}: всего ${lines} строк`);
    // строки со ссылками — это списки источников: в кавычках там названия статей, а не цитаты
    const prose = text.split('\n').filter((l) => !/https?:\/\//.test(l)).join('\n');
    const quotes = [...prose.matchAll(/[«“"]([^»”"\n]{20,})[»”"]/g)].map((m) => m[1]);
    // английские фразы в кавычках — вероятные цитаты из источника; русские — чаще наши примеры
    const foreign = quotes.filter((q) => /[a-z]{3,}/i.test(q) && !/[а-яё]/i.test(q));
    for (const q of foreign) if (q.split(/\s+/).length > 15) out.push(`${f}: длинная цитата (${q.split(/\s+/).length} слов): «${q.slice(0, 60)}…»`);
    // короткие фразы — это названия глав и термины; цитатой считаем от 8 слов
    const real = foreign.filter((q) => q.split(/\s+/).length >= 8);
    if (real.length > 1) out.push(`${f}: англоязычных цитат ${real.length} (допустимо одна)`);
    const water = text.match(WATER);
    if (water) out.push(`${f}: вода — ${[...new Set(water.map((w) => w.toLowerCase()))].join(', ')}`);
    if (f === 'principles.md') {
      // поля обязательны только у принципов P-NN; разделы об устройстве систем и нюансы устроены иначе
      const items = text.split(/^### /m).slice(1).filter((i) => /^P-\d/.test(i));
      const noSrc = items.filter((i) => !/\*\*Источник/.test(i)).map((i) => i.split('\n')[0].slice(0, 40));
      if (noSrc.length) out.push(`principles.md: без источника — ${noSrc.join('; ')}`);
      const noCheck = items.filter((i) => !/\*\*Как проверить/.test(i)).length;
      if (noCheck) out.push(`principles.md: без «Как проверить» — ${noCheck}`);
    }
  }
  const pirate = readdirSync(join(BOOKS, d)).flatMap((f) => (f.endsWith('.md') ? [readFileSync(join(BOOKS, d, f), 'utf8')] : []))
    .join('\n').match(/libgen|z-lib|z-library|annas-archive|pdfdrive|oceanofpdf|dokumen\.pub/gi);
  // открытые научные статьи в pdf на сайтах авторов допустимы; ловим только теневые библиотеки
  if (pirate) out.push(`ссылки на теневые библиотеки: ${[...new Set(pirate)].join(', ')}`);
  const reviewed = existsSync(join(BOOKS, d, 'REVIEW.md'));
  console.log(`${out.length ? '⚠' : '✓'} ${d}${reviewed ? ' (ревью есть)' : ''}`);
  for (const o of out) console.log('   ' + o);
  problems += out.length;
}
process.exit(problems ? 1 : 0);
