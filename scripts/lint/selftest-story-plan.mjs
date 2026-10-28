// Самопроверка инструментов story-plan: своих проверок C-NN у скилла нет (owners.md §1), поэтому здесь — шаблон
// скелета, проверка формата (ядро, проза, финалы без меток), дорогие развилки и пример скелета из references, который
// должен оставаться валидным при правках линта. Скелеты выдуманные. Подключается из selftest.mjs.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkSkeleton, template } from '../../.claude/skills/story-plan/scripts/skeleton.mjs';
import { expensiveForks } from '../../.claude/skills/story-plan/scripts/plan-check.mjs';
import { parseInk } from '../lib/ink.mjs';
import { thresholds } from '../lib/thresholds.mjs';

const FORMAT = fileURLToPath(new URL('../../.claude/skills/story-plan/references/skeleton-format.md', import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'story-plan-'));
const save = (name, src) => { const p = join(dir, name); writeFileSync(p, src); return p; };

const SMALL = `// core: D-02
# contact: rui, Руи, teal
VAR seen = false
-> ch1
=== ch1 ===
Глава 1 · Мост #sys:rui #chapter
[1.1] событие: Руи видит на мосту чужую лодку #from:rui
* [Сними её #to:rui]
    ~ seen = true
    -> near
* [Уходи с моста #to:rui]
    -> away
= near
[1.2] отклик: на корме чей-то рюкзак #from:rui
-> ch2
= away
[1.2б] отклик: лодка уходит без огней #from:rui
-> ch2
=== ch2 ===
Глава 2 · Берег #sys:rui #chapter #delay:2h
{seen: [2.1] отклик: рюкзак на фото — твой старый}
[2.2] событие: Руи находит лодку у берега #from:rui
-> fin
// финал: берег
=== fin ===
[fin] Руи садится в лодку #from:rui
-> END
`;

export function register(test, { lint }) {
  const T = thresholds();

  test('story-plan: шаблон скелета компилируется, проходит формат и story:lint --plan без ошибок', async () => {
    for (const n of [2, 4]) {
      const src = template({ chapters: n, core: 'D-03' });
      const r = checkSkeleton(save(`t${n}.ink`, src));
      assert.deepEqual(r.errors, [], r.errors.join('; '));
      assert.equal(r.info.core, 'D-03');
      assert.equal(r.info.chapters, n);
      assert.ok(r.info.endings.length >= 2, 'в шаблоне размеченные финалы');
      const res = await lint(src, { plan: true });
      assert.equal(res.findings.filter((f) => f.level === 'error').length, 0, res.findings.filter((f) => f.level === 'error').map((f) => f.message).join('; '));
      assert.ok(!res.findings.some((f) => f.check === 'C-53' && /шапка/.test(f.message)), 'шапка из четырёх строк на месте');
    }
  });

  test('story-plan: пример скелета из skeleton-format.md валиден', () => {
    const ink = readFileSync(FORMAT, 'utf8').match(/```ink\n([\s\S]*?)```/)[1];
    const r = checkSkeleton(save('example.ink', ink));
    assert.deepEqual(r.errors, [], r.errors.join('; '));
    assert.deepEqual(r.warnings, [], r.warnings.join('; '));
    assert.equal(r.info.chapters, 3);
  });

  test('story-plan: формат ловит отсутствие ядра, финалы без меток и прозу вместо сцен', () => {
    const ok = checkSkeleton(save('ok.ink', SMALL));
    assert.deepEqual(ok.errors, [], ok.errors.join('; '));
    const noCore = checkSkeleton(save('nocore.ink', SMALL.replace('// core: D-02\n', '')));
    assert.ok(noCore.errors.some((e) => /core/.test(e)));
    const unmarked = checkSkeleton(save('unmarked.ink', SMALL.replace('// финал: берег\n', '')));
    assert.ok(unmarked.errors.some((e) => /финал/.test(e)));
    const limit = T.value('skill.plan.skeleton.run_lines');
    const prose = Array.from({ length: limit + 1 }, (_, i) => `реплика ${i + 1} #from:rui`).join('\n');
    const long = checkSkeleton(save('prose.ink', SMALL.replace('[2.2] событие: Руи находит лодку у берега #from:rui', prose)));
    assert.ok(long.warnings.some((w) => /проза/.test(w)), long.warnings.join('; '));
  });

  test('story-plan: дорогие развилки — кнопки в разные узлы, распределитель в финалы не считается', () => {
    const forks = expensiveForks(parseInk(SMALL));
    assert.equal(forks.length, 1);
    assert.deepEqual(forks[0].targets.sort(), ['ch1.away', 'ch1.near']);
    const toEndings = `-> a\n=== a ===\nвыбирай #from:rui\n* [да #to:rui]\n    -> f1\n* [нет #to:rui]\n    -> f2\n// финал: один\n=== f1 ===\nраз #from:rui\n-> END\n// финал: два\n=== f2 ===\nдва #from:rui\n-> END`;
    assert.equal(expensiveForks(parseInk(toEndings)).length, 0);
  });
}
