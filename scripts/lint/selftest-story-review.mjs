// Самопроверка story-review: своих проверок C-NN у скилла нет (owners.md §1), поэтому здесь — то, на чём держится
// сведение: контракт вывода story:lint (owner, глава, метка «намеренно»), разбор строк находок из ответов
// аудиторов и читателя и весь путь merge-findings → report на выдуманной истории. Подключается из selftest.mjs.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseInk } from '../lib/ink.mjs';

const SKILL = fileURLToPath(new URL('../../.claude/skills/story-review/', import.meta.url));
const core = () => import(join(SKILL, 'scripts/review-core.mjs'));

const STORY = `# contact: oleg, Олег, teal
# contact: port, Порт, grey
-> ch1
=== ch1 ===
Глава 1 · Пирс #sys #chapter
ты на смене? #from:oleg
* [Да #to:oleg]
    тогда слушай #from:oleg
* [Промолчать #to:oleg #silent]
- -> pier
=== pier ===
${Array.from({ length: 30 }, (_, i) => `шаг ${i + 1} по пирсу #from:oleg`).join('\n')}
* [Дальше #to:oleg]
    -> END
`;

const AUDITOR = `линза: story-pace · история: pier-test · режим: полный · узлов от story:lint: 2 · состояние: нет STATUS.md

находки:
P2 · скучно (кандидат) · pier (гл. 1) · тридцать строк Олега без хода игрока · рассказ кусками, F-05 · [C-35 · замер · высокая]
P3 · скучно · ch1, pier · ответ на «Да» короче паузы · → story-pauses · [модель · низкая]

ложные (story:lint → почему не находка):
C-35 · ch1 · серия посчитана через #chapter

нет данных:
—

вне линзы (передать):
- story-opening · ch1 · первое сообщение без имени
`;

function cli(script, args) {
  return execFileSync(process.execPath, [join(SKILL, 'scripts', script), ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

export function register(test, { lint }) {
  test('story-review: у находок story:lint есть owner из owners.md и глава — по ним выбираются линзы', async () => {
    const res = await lint(STORY);
    const series = res.findings.filter((f) => f.check === 'C-35');
    assert.ok(series.length, 'нет C-35 на серии из 30 строк');
    for (const f of res.findings) assert.ok(f.owner, `находка без owner: ${f.check}`);
    assert.ok(series.every((f) => f.owner === 'story-pace' && f.chapter === 1));
  });

  test('story-review: метка «// намеренно: C-NN причина» над узлом гасит проверку (patterns-review.md)', async () => {
    const quiet = STORY.replace('=== pier ===', '// намеренно: C-35 рассказ задуман одним куском\n=== pier ===');
    const res = await lint(quiet);
    assert.ok(!res.findings.some((f) => f.check === 'C-35' && f.node === 'pier'));
  });

  test('story-review: строка находки разбирается при плавающих полях аудитора и цитате читателя', async () => {
    const { parseFindingLine, parseAnswer } = await core();
    const tree = parseInk(STORY);
    const f = parseFindingLine('P2 · скучно (кандидат) · pier (гл. 1) · тридцать строк · правка: F-05 · [C-35 · замер · высокая]', tree);
    assert.equal(f.p, 2); assert.equal(f.type, 'скучно'); assert.equal(f.candidate, true);
    assert.deepEqual(f.nodes, ['pier']); assert.equal(f.chapter, 1); assert.deepEqual(f.checks, ['C-35']);
    assert.equal(f.basis, 'замер'); assert.equal(f.confidence, 'высокая'); assert.deepEqual(f.fixes, ['F-05']);
    const q = parseFindingLine('P3 · непонятно · «ты на смене» · кто это пишет · → story-opening · [модель · симуляция · низкая]', tree);
    assert.deepEqual(q.nodes, ['ch1'], 'цитата читателя → узел');
    assert.equal(q.simulation, true);
    const a = parseAnswer(AUDITOR, tree);
    assert.equal(a.findings.length, 2);
    assert.deepEqual(a.falses.map((x) => [x.check, x.nodes]), [['C-35', ['ch1']]]);
    assert.deepEqual(a.outside.map((o) => o.lens), ['story-opening']);
  });

  test('story-review: merge-findings сверяет замер с ответом линзы, report ограничивает главу ключом', async () => {
    const { CACHE_DIR } = await core();
    const dir = mkdtempSync(join(tmpdir(), 'review-st-'));
    const file = join(dir, 'pier-test.ink');
    writeFileSync(file, STORY);
    try {
      const cache = JSON.parse(cli('review-cache.mjs', ['--story', file, '--json']));
      const run = join(fileURLToPath(new URL('../../', import.meta.url)), cache.dir);
      assert.ok(run.startsWith(CACHE_DIR) && existsSync(join(run, 'lint.json')));
      writeFileSync(join(run, 'lens-story-pace.md'), AUDITOR);
      const m = JSON.parse(cli('merge-findings.mjs', ['--story', file, '--json']));
      const pier = m.items.find((i) => i.nodes.includes('pier') && i.checks.includes('C-35'));
      assert.ok(pier, 'находка линзы в pier потерялась');
      assert.ok(m.lintRest.every((f) => !(f.check === 'C-35' && f.node === 'pier')), 'подтверждённая строка замера осталась несверенной');
      assert.ok(m.lensesRun.includes('story-pace'));
      const report = cli('report.mjs', ['--story', file, '--explain']);
      assert.match(report, /## Поломки/);
      assert.match(report, /почему важно: внимание уходит/);
      assert.match(report, /skill\.review\.top_per_chapter/);
      assert.ok(readFileSync(join(run, 'merged.json'), 'utf8').length > 0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
      rmSync(join(CACHE_DIR, 'pier-test'), { recursive: true, force: true });
    }
  });

  // LOCAL-16: хвост после кнопки — «непонятно» без потолка; «скучно» P1 держится, только если глава не держится;
  // голоса по форме без слепого теста — не выше skill.review.p_cap.voice_form
  test('story-review: merge-findings — потолки P по priority.md (skill.review.p_cap, LOCAL-16)', async () => {
    const { CACHE_DIR, T } = await core();
    const cap = T().value('skill.review.p_cap');
    const dir = mkdtempSync(join(tmpdir(), 'review-cap-'));
    const file = join(dir, 'pier-cap.ink');
    writeFileSync(file, STORY);
    const lens = (name, lines) => `линза: ${name} · история: pier-cap · режим: полный\n\nнаходки:\n${lines.join('\n')}\n\nложные (story:lint → почему не находка):\n—\n`;
    try {
      const cache = JSON.parse(cli('review-cache.mjs', ['--story', file, '--json']));
      const run = join(fileURLToPath(new URL('../../', import.meta.url)), cache.dir);
      writeFileSync(join(run, 'lens-story-endings.md'), lens('story-endings', ['P1 · скучно · pier (гл. 1) · после последней кнопки часы без событий · F-02 · [C-42 · замер · высокая]']));
      writeFileSync(join(run, 'lens-story-voice.md'), lens('story-voice', ['P1 · не верю · ch1 (гл. 1) · Олег и Порт пишут одной формой · F-01 · [C-44 · замер · средняя]']));
      writeFileSync(join(run, 'lens-story-pace.md'), lens('story-pace', ['P1 · скучно · pier (гл. 1) · тридцать строк без хода · F-05 · [C-35 · замер · высокая]']));
      let m = JSON.parse(cli('merge-findings.mjs', ['--story', file, '--json']));
      const tail = m.items.find((i) => i.checks.includes('C-42'));
      assert.equal(tail.type, 'непонятно', 'хвост после кнопки — непонятно');
      assert.equal(tail.p, 1, 'хвост без потолка «скучно»');
      assert.equal(m.items.find((i) => i.checks.includes('C-44')).p, Math.max(1, cap.voice_form), 'голос по форме');
      assert.equal(m.items.find((i) => i.checks.includes('C-35')).p, cap.boring, 'скучно без читателя — кандидат');
      writeFileSync(join(run, 'cold-middle-skeptic.md'), 'cold-reader · pier-cap · guess\n\nнаходки:\nP3 · скучно · «шаг 3 по пирсу» · Итог: отложил бы · → story-pace · [модель · симуляция · низкая]\n');
      m = JSON.parse(cli('merge-findings.mjs', ['--story', file, '--json']));
      assert.equal(m.items.find((i) => i.checks.includes('C-35')).p, 1, 'глава не держится: замер + читатель отложил бы — P1');
    } finally {
      rmSync(dir, { recursive: true, force: true });
      rmSync(join(CACHE_DIR, 'pier-cap'), { recursive: true, force: true });
    }
  });
}
