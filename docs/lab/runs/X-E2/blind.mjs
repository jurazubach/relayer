#!/usr/bin/env node
// Слепая копия репозитория для прогонов Э2 (рецепт docs/lab/runs/X-E2mini/README.md + поправки X-E2):
// скилл не должен видеть ни кейсов, ни находок, ни уроков по историям — иначе полнота меряет память, а не ревью.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, symlinkSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const HELP = `node docs/lab/runs/X-E2/blind.mjs <папка> [--force]

Копирует репозиторий в <папка> без .git, docs/lab/, сырых docs/books/ (вместо них docs/books/_clean/ от kb:clean),
docs/playbook/_build/, story-findings.md, REVIEW.md, build-plan-critique.md, local-lessons.md, .story-review/;
вырезает из checks.md «Прогон первой волны по трём историям», из playbook/README.md — «Что делать дальше»,
из docs/stories/<id>/STATUS.md — открытые вопросы, взятые из базового снимка Э1. node_modules — ссылка, свой git init.
  --force   стереть <папка>, если она есть
  --help    эта справка`;

const args = process.argv.slice(2);
if (args.includes('--help') || !args.filter((a) => !a.startsWith('--')).length) { console.log(HELP); process.exit(args.includes('--help') ? 0 : 2); }
const ROOT = resolve(new URL('../../../..', import.meta.url).pathname);
const dst = resolve(args.find((a) => !a.startsWith('--')));
if (existsSync(dst)) {
  if (!args.includes('--force')) { console.error(`${dst} уже есть (--force)`); process.exit(2); }
  rmSync(dst, { recursive: true, force: true });
}
if (!existsSync(join(ROOT, 'docs/books/_clean'))) { console.error('нет docs/books/_clean: npm run kb:clean -- --quiet'); process.exit(2); }

const exclude = ['.git', 'node_modules', '.story-review', 'docs/lab', 'docs/books', 'docs/playbook/_build',
  'docs/playbook/story-findings.md', 'docs/playbook/REVIEW.md', 'docs/playbook/build-plan-critique.md',
  'docs/playbook/local-lessons.md', 'test-results', 'screenshots', 'graph', 'dist'];
mkdirSync(dst, { recursive: true });
execFileSync('rsync', ['-a', ...exclude.map((e) => `--exclude=/${e}`), `${ROOT}/`, `${dst}/`]);
execFileSync('rsync', ['-a', `${ROOT}/docs/books/_clean/`, `${dst}/docs/books/`]);
symlinkSync(join(ROOT, 'node_modules'), join(dst, 'node_modules'));

const cut = (file, from, to) => {
  const p = join(dst, file);
  const lines = readFileSync(p, 'utf8').split('\n');
  const a = lines.findIndex((l) => l.startsWith(from));
  if (a < 0) throw new Error(`${file}: нет «${from}»`);
  let b = lines.findIndex((l, i) => i > a && l.startsWith(to));
  if (b < 0) b = lines.length;
  lines.splice(a, b - a);
  writeFileSync(p, lines.join('\n'));
};
cut('docs/playbook/checks.md', '## Прогон первой волны по трём историям', '## ');
cut('docs/playbook/README.md', '## Что делать дальше', '## ');

// Открытые вопросы STATUS.md, снятые с базового снимка Э1, пересказывают находки свода — их убираем,
// оставляем только «плана нет» и «разметки A-06 нет» без ссылки на снимок.
for (const id of ['the-number', 'slepoe-pyatno', 'chuzhoy-golos']) {
  const p = join(dst, 'docs/stories', id, 'STATUS.md');
  if (!existsSync(p)) continue;
  const text = readFileSync(p, 'utf8').split('\n')
    .filter((l) => !(l.startsWith('- ') && /«Главное»|baseline\.md «/.test(l)))
    .map((l) => l.replace(/; `docs\/lab\/baseline\.md`, «Что уже ловят команды»/, ''))
    .join('\n');
  writeFileSync(p, text);
}

execFileSync('git', ['init', '-q'], { cwd: dst });
execFileSync('git', ['add', '-A'], { cwd: dst });
execFileSync('git', ['-c', 'user.name=blind', '-c', 'user.email=blind@example.invalid', 'commit', '-qm', 'слепая копия'], { cwd: dst });
// stories-v1 нужен story:diff и stale-check: в копии он указывает на сам слепой коммит
execFileSync('git', ['-c', 'tag.gpgSign=false', 'tag', 'stories-v1'], { cwd: dst });

let leak = '';
try {
  leak = execFileSync('grep', ['-rlE', 'CG-[0-9]{2}|SP-0[0-9]|TN-0[0-9]|story-findings', '--exclude-dir=node_modules', '--exclude-dir=.git', '.'], { cwd: dst, encoding: 'utf8' }).trim();
} catch {
  // grep без совпадений выходит с кодом 1
}
console.log(`слепая копия → ${dst}`);
console.log(leak ? `упоминания ID находок (проверь вручную):\n${leak}` : 'упоминаний ID находок нет');
