// Самопроверка хуков: разбор путей, снимки git, режимы post-edit (Edit, Bash, мимо историй), session-start, full.
// Пробная история кладётся во временную папку src/stories/<id>/ (не в git) и удаляется в конце.
// Запуск: npm run test:hooks [-- --only <подстрока>]
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { changedSince, clip, MAX_CHARS, ROOT, storyOfPath, storySnapshot } from './core.mjs';

const HELP = `npm run test:hooks [-- --only <подстрока>]

Самопроверка scripts/hooks: storyOfPath, снимок git status src/stories, обрезка вывода,
post-edit.mjs на входе хука (Edit по файлу истории, Bash со снимком, правка мимо историй,
повтор без новых ошибок), session-start.mjs и full.mjs. Пробная история создаётся во временной
папке src/stories/zz-hooktest-<pid>/ и удаляется в конце. claude -p здесь не запускается.

  --only <текст>  только тесты, в названии которых есть текст
  --help          эта справка`;

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) { console.log(HELP); process.exit(0); }
const onlyAt = argv.indexOf('--only');
const only = onlyAt >= 0 ? argv[onlyAt + 1] : null;

const ID = `zz-hooktest-${process.pid}`;
const DIR = join(ROOT, 'src/stories', ID);
const INK = join(DIR, 'story.ink');
const SESSION = `selftest-${process.pid}`;
const GOOD = `# title: Проба
# contact: lia, Лия, blue

-> start

=== start
Привет. #from:lia
* [Привет] Привет! #me:lia
  -> finish
* [Молчать] #silent
  -> finish

=== finish
Ладно. #from:lia
-> END
`;

const hook = (script, input) => {
  const r = spawnSync(process.execPath, [join(ROOT, 'scripts/hooks', script)], { cwd: ROOT, input: JSON.stringify(input), encoding: 'utf8' });
  assert.equal(r.status, 0, `${script} упал: ${r.stderr}`);
  return r.stdout.trim();
};
const context = (out) => {
  const j = JSON.parse(out);
  assert.equal(j.hookSpecificOutput.hookEventName, 'PostToolUse');
  return j.hookSpecificOutput.additionalContext;
};

const tests = [
  ['storyOfPath: папка, .json, мимо', () => {
    assert.equal(storyOfPath(join(ROOT, 'src/stories/abc/ch01.ink')), 'abc');
    assert.equal(storyOfPath(join(ROOT, 'src/stories/abc.json')), 'abc');
    assert.equal(storyOfPath(join(ROOT, 'src/stories/abc')), null);
    assert.equal(storyOfPath(join(ROOT, 'src/ui/App.tsx')), null);
    assert.equal(storyOfPath(undefined), null);
  }],
  ['changedSince: новые, изменённые и откаченные файлы', () => {
    assert.deepEqual(changedSince({ [`src/stories/${ID}/story.ink`]: '1:1' }, { [`src/stories/${ID}/story.ink`]: '1:1' }), []);
    assert.deepEqual(changedSince({}, { [`src/stories/${ID}/story.ink`]: '1:2' }), [ID]);
    assert.deepEqual(changedSince({ [`src/stories/${ID}/story.ink`]: '1:2' }, {}), [ID]);
    assert.deepEqual(changedSince({}, { 'src/stories/nobody-here/x.ink': '1:2' }), []);
  }],
  ['clip: не длиннее skill.hook.max_output_chars', () => {
    assert.equal(clip('коротко'), 'коротко');
    const long = clip('я'.repeat(MAX_CHARS * 2));
    assert.ok(long.length <= MAX_CHARS && long.endsWith('вывод обрезан'));
  }],
  ['storySnapshot видит пробную историю', () => {
    assert.ok(Object.keys(storySnapshot()).some((p) => p.startsWith(`src/stories/${ID}/`)));
  }],
  ['session-start: статус и снимок', () => {
    const out = hook('session-start.mjs', { session_id: SESSION, hook_event_name: 'SessionStart', source: 'startup' });
    assert.match(out, /story:status/);
    assert.ok(out.length <= MAX_CHARS);
  }],
  ['post-edit: правка мимо историй — тишина', () => {
    assert.equal(hook('post-edit.mjs', { session_id: SESSION, tool_name: 'Edit', tool_input: { file_path: join(ROOT, 'README.md') } }), '');
  }],
  ['post-edit: Bash без правок историй — тишина', () => {
    assert.equal(hook('post-edit.mjs', { session_id: SESSION, tool_name: 'Bash', tool_input: { command: 'ls' } }), '');
  }],
  ['post-edit: Edit чистой истории — зелёная строка', () => {
    const text = context(hook('post-edit.mjs', { session_id: SESSION, tool_name: 'Edit', tool_input: { file_path: INK } }));
    assert.match(text, new RegExp(`✓ ${ID}: компилируется`));
    assert.match(text, /story:lint --summary, по проверкам: C-\d\d/);
    assert.ok(text.length <= MAX_CHARS);
  }],
  ['post-edit: Bash сломал переход — ошибка компиляции видна', () => {
    appendFileSync(INK, '\n=== broken\n-> no_such_knot\n');
    const text = context(hook('post-edit.mjs', { session_id: SESSION, tool_name: 'Bash', tool_input: { command: 'echo >> story.ink' } }));
    assert.match(text, /не компилируется/);
    assert.match(text, /no_such_knot/);
    assert.ok(text.length <= MAX_CHARS);
  }],
  ['post-edit: повтор той же ошибки компиляции — снова видна', () => {
    const text = context(hook('post-edit.mjs', { session_id: SESSION, tool_name: 'Edit', tool_input: { file_path: INK }, agent_type: 'chapter-writer' }));
    assert.match(text, /no_such_knot/);
  }],
  ['post-edit: недостижимый узел — ошибка check:story, затем «новых нет»', () => {
    writeFileSync(INK, GOOD + '\n=== orphan\nНикто. #from:lia\n-> END\n');
    const first = context(hook('post-edit.mjs', { session_id: SESSION, tool_name: 'Write', tool_input: { file_path: INK } }));
    assert.match(first, /не сообщалось/);
    const second = context(hook('post-edit.mjs', { session_id: SESSION, tool_name: 'Edit', tool_input: { file_path: INK } }));
    assert.match(second, /новых ошибок нет · прежних \d+/);
  }],
  ['post-edit: починили — «исправлено»', () => {
    writeFileSync(INK, GOOD);
    const text = context(hook('post-edit.mjs', { session_id: SESSION, tool_name: 'Edit', tool_input: { file_path: INK } }));
    assert.match(text, /✓ .*исправлено \d+/);
  }],
  ['full: --json и код выхода', () => {
    const ok = spawnSync(process.execPath, [join(ROOT, 'scripts/hooks/full.mjs'), ID, '--json'], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(ok.status, 0, ok.stderr);
    assert.equal(JSON.parse(ok.stdout).stories[0].id, ID);
    appendFileSync(INK, '\n=== broken\n-> no_such_knot\n');
    const bad = spawnSync(process.execPath, [join(ROOT, 'scripts/hooks/full.mjs'), ID], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(bad.status, 1);
    assert.match(bad.stdout, /не компилируется/);
    const unknown = spawnSync(process.execPath, [join(ROOT, 'scripts/hooks/full.mjs'), 'no-such-story'], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(unknown.status, 2);
  }],
  ['RELAYER_HOOKS=off выключает хук', () => {
    const r = spawnSync(process.execPath, [join(ROOT, 'scripts/hooks/post-edit.mjs')], { cwd: ROOT, input: JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: INK } }), encoding: 'utf8', env: { ...process.env, RELAYER_HOOKS: 'off' } });
    assert.equal(r.status, 0);
    assert.equal(r.stdout, '');
  }],
];

mkdirSync(DIR, { recursive: true });
writeFileSync(join(DIR, 'meta.json'), JSON.stringify({ format: 'relayer-story', version: 1, id: ID, title: 'Проба' }));
writeFileSync(INK, GOOD);
let failed = 0;
let ran = 0;
try {
  for (const [name, fn] of tests) {
    if (only && !name.includes(only)) continue;
    ran++;
    try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.message.split('\n').join('\n  ')}`); }
  }
} finally {
  rmSync(DIR, { recursive: true, force: true });
}
console.log(`\n${ran - failed} из ${ran} тестов прошли`);
process.exit(failed ? 1 : 0);
