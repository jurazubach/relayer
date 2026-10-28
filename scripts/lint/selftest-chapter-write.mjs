// Самопроверка инструментов chapter-write: своих проверок C-NN у скилла нет (owners.md §1), поэтому здесь —
// пакет главы (концы прошлой главы по путям и VAR на стыке), «кнопка ждёт вечно» у chapter-lint, сверка тегов
// с реестром у ink-compile, разбор образцов style.md и компиляция всех примеров ink в references скилла.
// Выдуманная история во временной папке. Подключается из selftest.mjs.
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepare } from '../story/core/run.mjs';
import { thresholds } from '../lib/thresholds.mjs';
import { chapterContext } from '../../.claude/skills/chapter-write/scripts/chapter-context.mjs';
import { silence } from '../../.claude/skills/chapter-write/scripts/chapter-lint.mjs';
import { compileFragment, compileMarkdown } from '../../.claude/skills/chapter-write/scripts/ink-compile.mjs';
import { samples, stText } from '../../.claude/skills/chapter-write/scripts/style-sample.mjs';

const SKILL = fileURLToPath(new URL('../../.claude/skills/chapter-write/', import.meta.url));
const ROOT = fileURLToPath(new URL('../../', import.meta.url));

// глава 1 расходится на «ответил» и «промолчал»; в главе 2 одна развилка без напоминаний, другая — с ними
const STORY = `# contact: oleg, Олег, teal
VAR helped = false
-> ch1
=== ch1 ===
Глава 1 · Мост #sys:oleg #chapter
мост разводят, а я на середине #from:oleg
* [Беги к своему берегу #to:oleg]
    ~ helped = true
    бегу #from:oleg #delay:20s
* [Промолчать #to:oleg #silent]
    ладно, сам #from:oleg #delay:1m
- -> ch2
=== ch2 ===
Глава 2 · Берег #sys:oleg #chapter #delay:3h
{helped:я на берегу. мокрый|я на другом берегу} #from:oleg
* [Что видно? #to:oleg]
    огни #from:oleg
* [Уходи #to:oleg]
    ухожу #from:oleg
- -> ch2_ask
=== ch2_ask ===
звонить в службу? #from:oleg
- (ask)
* [Звони #to:oleg]
    звоню #from:oleg
* [Промолчать #to:oleg #silent]
    сам решу #from:oleg
* [#remind:30m] алё. звонить или нет
    -> ask
- -> END
`;

function withStory(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'cw-selftest-'));
  const file = join(dir, 'bridge.ink');
  writeFileSync(file, STORY);
  try { return fn(file, dir); } finally { rmSync(dir, { recursive: true, force: true }); }
}

const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));

export function register(test) {
  test('chapter-write: пакет главы 2 — разные концы главы 1 по путям, VAR helped различает их, глава 1 без концов', () => {
    withStory((file) => {
      const c = chapterContext(file, 2, { runs: 12 });
      assert.ok(c.tails.groups.length >= 2, `концов ${c.tails.groups.length}`);
      assert.ok(c.tails.groups.some((g) => /бегу/.test(g.text)) && c.tails.groups.some((g) => /сам/.test(g.text)));
      assert.ok(c.tails.groups.every((g) => 'helped' in g.vars || 'helped' in c.tails.common));
      assert.ok(c.tails.groups.every((g) => g.text.split('\n').filter((l) => /^ {3}\S/.test(l)).length <= thresholds().value('skill.chapter.tail_msgs')));
      assert.equal(chapterContext(file, 1, { runs: 4 }).tails, null);
      assert.match(c.style ?? '', /одно сообщение — одна мысль/i);
    });
  });

  test('chapter-write: chapter-lint — «кнопка ждёт вечно» без #remind, развилка с напоминанием и #silent — ок', () => {
    withStory((file) => {
      const s = silence(prepare(file), 2, false, 6);
      assert.ok(s.waits_forever.some((e) => e.knot === 'ch2'), JSON.stringify(s.waits_forever));
      assert.ok(!s.waits_forever.some((e) => e.knot === 'ch2_ask'));
      assert.ok(s.ok.some((e) => e.knot === 'ch2_ask' && e.reminders.includes(1)));
    });
  });

  test('chapter-write: ink-compile — тег не из реестра и planned помечаются, бот видит недостижимый узел', () => {
    withStory((file, dir) => {
      const ok = compileFragment(file, 20);
      assert.equal(ok.ok, true);
      assert.deepEqual(ok.tags, []);
      const bad = join(dir, 'bad.ink');
      writeFileSync(bad, STORY.replace('звоню #from:oleg', 'звоню #from:oleg #voice:0:14').replace('-> END\n', '-> END\n=== orphan ===\nникто #from:oleg\n-> END\n'));
      const r = compileFragment(bad, 20);
      assert.ok(r.tags.some((t) => /voice/.test(t.message)));
      assert.deepEqual(r.bot.unvisited, ['orphan']);
    });
  });

  test('chapter-write: style-sample разбирает образцы и антиобразцы style.md, положение ST-66 находится', () => {
    const style = readFileSync(join(ROOT, 'docs/style.md'), 'utf8');
    const all = samples(style);
    assert.ok(all.filter((s) => s.kind === 'SG').length > 10 && all.filter((s) => s.kind === 'AS').length > 10);
    assert.ok(all.filter((s) => s.kind === 'AS').every((s) => /\/\/ так:/.test(s.text)), 'антиобразец без «// так:»');
    assert.match(stText(style, 'ST-66') ?? '', /Напоминание/);
  });

  test('chapter-write: все примеры ink в SKILL.md и references компилируются', () => {
    for (const f of walk(SKILL).filter((x) => x.endsWith('.md'))) {
      const r = compileMarkdown(f);
      assert.ok(r.ok, `${f}: ${r.blocks.filter((b) => !b.ok).map((b) => `блок ${b.n}: ${b.errors[0]?.message}`).join('; ')}`);
    }
  });
}

