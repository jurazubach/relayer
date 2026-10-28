// Самопроверка инструментов story-playtest: своих проверок C-NN у скилла нет (owners.md §1), поэтому здесь —
// протокол холодного читателя, который разбирает story:cold-read, вырезание окружения из ответа, сводка отзывов и
// набор для теста. Выдуманные истории и отзывы. Подключается из selftest.mjs.
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODES, readProtocol } from '../story/core/cold.mjs';
import { prepare } from '../story/core/run.mjs';
import { thresholds } from '../lib/thresholds.mjs';
import { readProfiles, redactEnv, isolate } from '../story/cold-read.mjs';

const SKILL = fileURLToPath(new URL('../../.claude/skills/story-playtest/', import.meta.url));
const PROTOCOL = join(SKILL, 'references/cold-reader.md');
const PROFILES = ['hurried', 'attentive', 'skeptic', 'distracted', 'unresponsive'];

const STORY = `# contact: tom, Том, teal
# contact: port, Порт «Северный», grey
-> ch1
=== ch1 ===
Глава 1 · Причал #sys #chapter
ты на смене? на шестом причале погас свет #from:tom
* [Да. Что там? #to:tom]
    кто-то срезал замок на складе #from:tom
* [Промолчать #to:tom #silent]
- Причал 6 · доступ закрыт · 02:14 #from:port
-> ch1_fence
=== ch1_fence ===
сторож говорит, что никого не видел #from:tom
-> END
`;

export function register(test) {
  test('story-playtest: протокол — четыре раздела cold-read, все режимы и пять профилей; К3 без «что в контексте»', () => {
    const p = readProtocol(PROTOCOL);
    assert.ok(p.role && p.control && p.format, 'нет «Роль», «Контроль» или «Формат ответа»');
    for (const m of Object.keys(MODES)) assert.ok(p.mode(m), `нет режима ${m}`);
    const prof = readProfiles(PROTOCOL);
    assert.deepEqual(Object.keys(prof).sort(), [...PROFILES].sort());
    for (const id of PROFILES) assert.ok(prof[id].length > 80, `профиль ${id} пустой`);
    assert.ok(!/в контексте/i.test(p.control), 'К3 зовёт рассказать об окружении');
    assert.match(p.format, /Слабое место/);
    // опора протокола (блоки story:coverage) читателю не уходит
    assert.ok(!/narrative-testing|Откуда протокол/.test([p.role, p.control, p.format, ...Object.keys(MODES).map(p.mode)].join('\n')));
  });

  test('story-playtest: из ответа вырезаются почта и рабочая папка, утечка узла остаётся утечкой', () => {
    const answer = '1. Пишет Том.\nВижу почту reader@example.org и рабочую папку /private/var/folders/x/cold-read-1\nК1. ch1_fence';
    const r = redactEnv(answer);
    assert.equal(r.removed, 1);
    assert.ok(!/@|\/private/.test(r.answer));
    assert.deepEqual(r.kinds.sort(), ['почта', 'путь', 'рабочая папка'].sort());
    const dir = mkdtempSync(join(tmpdir(), 'playtest-st-'));
    try {
      writeFileSync(join(dir, 'probe.ink'), STORY);
      const p = prepare(join(dir, 'probe.ink'));
      const res = isolate(answer, p, 'Том: ты на смене?');
      assert.equal(res.isolation.ok, false, 'узел ch1_fence в ответе — утечка');
      assert.deepEqual(res.isolation.leaks, ['ch1_fence']);
      assert.equal(res.isolation.env.removed, 1);
      assert.ok(!/reader@/.test(res.answer));
      const clean = isolate('1. Пишет Том.\nК1. Не знаю.', p, 'Том: ты на смене?');
      assert.equal(clean.isolation.ok, true);
      assert.equal(clean.isolation.env.removed, 0);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  test('story-playtest: сводка — повтор у двух живых обязателен, симуляция — кандидат, рецепт отдельно', async () => {
    const { parseFeedback, digest } = await import(join(SKILL, 'scripts/digest.mjs'));
    const dir = mkdtempSync(join(tmpdir(), 'playtest-dg-'));
    try {
      writeFileSync(join(dir, 'probe.ink'), STORY);
      const p = prepare(join(dir, 'probe.ink'));
      const fb = [
        parseFeedback('тестер: А\nисточник: живой\n- непонятно · «кто-то срезал замок» · какой склад?\n- предложение · ch1 · назвать склад\n', 'a.md'),
        parseFeedback('тестер: Б\nисточник: живой\n- непонятно · ch1 · не понял, кто Том\n- скучно · где-то · тянется\n', 'b.md'),
        parseFeedback('тестер: skeptic\nисточник: симуляция\n- не верю · Том: «сторож говорит» · слишком удобно\n', 's.md'),
      ];
      const d = digest(fb, p, [{ check: 'C-22', node: 'ch1', chapter: 1, owner: 'story-opening' }], thresholds());
      const ch1 = d.rows.find((r) => r.knot === 'ch1' && r.type === 'непонятно');
      assert.equal(ch1.people, 2);
      assert.match(ch1.status, /^обязательно/);
      assert.equal(ch1.measure, 'да');
      const sim = d.rows.find((r) => r.type === 'не верю');
      assert.equal(sim.knot, 'ch1_fence');
      assert.equal(sim.people, 0);
      assert.match(sim.status, /^кандидат/);
      assert.equal(d.unplaced.length, 1, '«где-то» — без места');
      assert.equal(d.side['предложение'].length, 1, 'рецепт тестера не в сводке');
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  test('story-playtest: набор для теста — главы до N, переход дальше ведёт в beta_stop, VAR переезжает', async () => {
    const { cutStory } = await import(join(SKILL, 'scripts/playtest-kit.mjs'));
    const story = {
      id: 'probe', main: 'story.ink', meta: { title: 'Проба', chapters: [{ title: 'один' }, { title: 'два' }], free_chapters: 1 },
      order: ['story.ink', 'ch01.ink', 'ch02.ink'],
      files: {
        'story.ink': '# contact: tom, Том, teal\n-> ch1\nINCLUDE ch01.ink\nINCLUDE ch02.ink\n',
        'ch01.ink': '=== ch1 ===\nГлава 1 #sys #chapter\nну что #from:tom\n{late: поздно}\n-> ch2\n',
        'ch02.ink': 'VAR late = false\n=== ch2 ===\nГлава 2 #sys #chapter\nдальше #from:tom\n-> END\n',
      },
    };
    const { packed, report } = cutStory(story, 1, { id: 'probe-w1', title: 'Проба · тест 1' });
    assert.equal(packed.id, 'probe-w1');
    assert.deepEqual(report.dropped, ['ch02.ink']);
    assert.deepEqual(report.rerouted.map((r) => r.from), ['ch2']);
    assert.deepEqual(report.movedVars, ['VAR late']);
    assert.ok(!('free_chapters' in packed), 'закрытые главы в наборе только мешают');
    assert.equal(packed.chapters.length, 1);
    assert.match(packed.includes['beta_stop.ink'], /=== beta_stop ===/);
    assert.ok(!packed.ink.includes('ch02.ink'));
  });
}
