// Самопроверка хуков: разбор путей, снимки git, режимы post-edit (Edit, Bash, мимо историй), session-start, full,
// сторож агентов agent-guard (белые списки четырёх агентов и их frontmatter).
// Пробная история кладётся во временную папку src/stories/<id>/ (не в git) и удаляется в конце.
// Запуск: npm run test:hooks [-- --only <подстрока>]
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AGENTS, guard } from './agent-guard.mjs';
import { changedSince, clip, isPartial, MAX_CHARS, ROOT, storyOfPath, storySnapshot } from './core.mjs';

const HELP = `npm run test:hooks [-- --only <подстрока>]

Самопроверка scripts/hooks: storyOfPath, снимок git status src/stories, обрезка вывода,
post-edit.mjs на входе хука (Edit по файлу истории, Bash со снимком, правка мимо историй,
повтор без новых ошибок, часть истории с beta_stop), session-start.mjs, full.mjs (и --new против git),
agent-guard.mjs: что пропускает и что режет у story-architect, chapter-writer, story-auditor, cold-reader,
и что их frontmatter зовёт сторожа, а не node -e. Пробная история создаётся во временной
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
  ['partial: история с beta_stop — story:lint --partial в хуке и в full', () => {
    writeFileSync(INK, GOOD);
    assert.equal(isPartial(ID), false);
    writeFileSync(INK, GOOD.replace('Ладно. #from:lia\n-> END', 'Ладно. #from:lia\n-> beta_stop\n\n=== beta_stop\nПродолжение следует. #sys\n-> END'));
    assert.equal(isPartial(ID), true);
    const text = context(hook('post-edit.mjs', { session_id: SESSION, tool_name: 'Edit', tool_input: { file_path: INK }, agent_type: 'chapter-writer' }));
    assert.match(text, /часть истории до beta_stop/);
    assert.doesNotMatch(text, /флаг --partial, но/);
    assert.match(text, new RegExp(`✓ ${ID}: компилируется`));
    const full = spawnSync(process.execPath, [join(ROOT, 'scripts/hooks/full.mjs'), ID, '--json'], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(JSON.parse(full.stdout).stories[0].partial, true);
    writeFileSync(INK, GOOD);
  }],
  ['full --new: прежние ошибки не новые, новая история — все новые', () => {
    // the-number в git с ошибками C-01: против HEAD новых нет, код 0, хотя ошибки есть
    const old = spawnSync(process.execPath, [join(ROOT, 'scripts/hooks/full.mjs'), 'the-number', '--new', '--json'], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(old.status, 0, old.stderr);
    const o = JSON.parse(old.stdout).stories[0];
    assert.equal(o.new_errors.length, 0);
    assert.ok(o.old_errors > 0, 'у the-number в HEAD есть прежние ошибки');
    // пробной истории нет в git: сломанный переход — новая ошибка, код 1
    writeFileSync(INK, GOOD + '\n=== broken\n-> no_such_knot\n');
    const fresh = spawnSync(process.execPath, [join(ROOT, 'scripts/hooks/full.mjs'), ID, '--new'], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(fresh.status, 1, fresh.stderr);
    assert.match(fresh.stdout, /новых ошибок 1 против HEAD \(истории там нет\)/);
    const badRev = spawnSync(process.execPath, [join(ROOT, 'scripts/hooks/full.mjs'), ID, '--base', 'no-such-rev-zz'], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(badRev.status, 2);
    writeFileSync(INK, GOOD);
  }],
  ['agent-guard: story-architect — свои планы и команды чтения', () => {
    const dir = mkdtempSync(join(tmpdir(), 'guard-'));
    const run = { agent_id: 'a1', cwd: dir };
    const bash = (command) => guard('story-architect', { ...run, tool_name: 'Bash', tool_input: { command } }, { dir });
    const write = (file_path, tool_name = 'Write') => guard('story-architect', { ...run, tool_name, tool_input: { file_path } }, { dir });
    for (const c of ['npm run -s story:lint -- --plan --story x', 'npm run check:story -- docs/stories/x/plans/skeleton-v1.ink',
      'node .claude/skills/story-plan/scripts/plan-check.mjs --file docs/stories/x/plans/skeleton-v1.ink',
      `node ${ROOT}/.claude/skills/story-branch/scripts/branch-budget.mjs --story x`,
      'node .claude/skills/story-desk/scripts/idea-park.mjs --story x --kind план --text "a; b" --dry-run', 'ls docs/stories/x/plans']) {
      assert.ok(bash(c).allow, c);
      assert.equal(bash(c).approve, true);
    }
    for (const c of ['npm run story:lint && rm -rf src', 'node .claude/skills/story-plan/scripts/skeleton.mjs --new --story x',
      'node .claude/skills/story-desk/scripts/idea-park.mjs --story x --kind план --text a', 'npm run story:cold-read -- --ask',
      'node .claude/skills/chapter-write/scripts/chapter-lint.mjs --story x', 'cat ../secret', 'node -e 1', 'ls > out']) {
      assert.ok(!bash(c).allow, c);
    }
    assert.match(bash('node -e 1').reason, /^story-architect: одна команда/);
    assert.ok(write('docs/stories/x/plans/plan-v1.md').allow);
    assert.ok(write('docs/stories/x/plans/skeleton-v2.ink').allow);
    mkdirSync(join(dir, 'docs/stories/x/plans'), { recursive: true });
    writeFileSync(join(dir, 'docs/stories/x/plans/plan-v1.md'), 'свой');
    writeFileSync(join(dir, 'docs/stories/x/plans/plan-v3.md'), 'чужой');
    assert.ok(write('docs/stories/x/plans/plan-v1.md', 'Edit').allow, 'свой файл можно править');
    assert.match(write('docs/stories/x/plans/plan-v3.md', 'Edit').reason, /писал не ты/);
    for (const f of ['docs/stories/x/plans/skeleton.ink', 'docs/stories/x/STATUS.md', 'src/stories/x/ch01.ink', 'docs/stories/x/plans/../STATUS.md']) {
      assert.ok(!write(f).allow, f);
    }
    rmSync(dir, { recursive: true, force: true });
  }],
  ['agent-guard: chapter-writer — одна история, одна глава, story.ink только Edit', () => {
    const dir = mkdtempSync(join(tmpdir(), 'guard-'));
    const run = { agent_id: 'w1', cwd: ROOT };
    const write = (file_path, tool_name = 'Write') => guard('chapter-writer', { ...run, tool_name, tool_input: { file_path } }, { dir });
    const bash = (command) => guard('chapter-writer', { ...run, tool_name: 'Bash', tool_input: { command } }, { dir });
    assert.ok(write(`src/stories/${ID}/ch03.ink`).allow);
    assert.ok(write(`src/stories/${ID}/ch3.ink`, 'Edit').allow, 'ch03 и ch3 — одна глава');
    assert.match(write(`src/stories/${ID}/ch04.ink`).reason, /одна глава за запуск, уже ch3/);
    assert.ok(write(`src/stories/${ID}/story.ink`, 'Edit').allow);
    assert.match(write(`src/stories/${ID}/story.ink`).reason, /только точечно через Edit/);
    assert.match(write('src/stories/no-such-story-zz/ch01.ink').reason, /новую историю заводит не агент/);
    assert.ok(!write(`src/stories/${ID}/meta.json`).allow);
    assert.ok(!write('docs/stories/x/facts.md').allow);
    for (const c of [`node scripts/hooks/full.mjs ${ID} --new`, `node .claude/skills/chapter-write/scripts/chapter-lint.mjs --story ${ID} --chapter 3`,
      'npm run -s story:trace -- --story x --persona unresponsive', 'npm run -s check:story', 'wc -l src/stories/x/ch03.ink']) {
      assert.ok(bash(c).allow, c);
    }
    for (const c of ['node .claude/skills/chapter-write/scripts/chapter-context.mjs --story x --chapter 3 --out p.md',
      'npm run story:trace -- --from-save x.json', 'npm run -s story:lint -- x --new', 'node .claude/skills/story-plan/scripts/plan-check.mjs --story x', 'git commit -am x']) {
      assert.ok(!bash(c).allow, c);
    }
    rmSync(dir, { recursive: true, force: true });
  }],
  ['agent-guard: story-auditor и cold-reader — только чтение', () => {
    const a = (tool_name, tool_input) => guard('story-auditor', { tool_name, tool_input });
    assert.ok(a('Bash', { command: 'npm run -s story:diff -- --story x' }).allow);
    assert.equal(a('Bash', { command: 'npm run -s story:lint -- x' }).approve, false, 'аудитор не одобряет сам — решают права');
    assert.ok(a('Bash', { command: 'node .claude/skills/story-voice/scripts/voice-check.mjs --story x' }).allow);
    assert.ok(!a('Bash', { command: 'node .claude/skills/story-fix/scripts/apply.mjs --story x' }).allow);
    assert.ok(!a('Bash', { command: 'npm run story:cold-read -- --ask' }).allow);
    assert.match(a('Write', { file_path: 'docs/stories/x/reviews/r.md' }).reason, /только чтение/);
    assert.ok(a('Read', { file_path: 'src/stories/x/ch01.ink' }).allow);
    const c = (command) => guard('cold-reader', { tool_name: 'Bash', tool_input: { command } });
    assert.ok(c('npm run story:cold-read -- --story x --node ch1 --ask --profile "торопливый"').allow);
    assert.ok(!c('npm run story:cold-read -- --story x; cat ~/.ssh/id_rsa').allow);
    assert.ok(!c('npm run story:lint').allow);
    assert.ok(!guard('nobody', { tool_name: 'Bash', tool_input: { command: 'ls' } }).allow);
  }],
  ['agent-guard: CLI — одобрение, отказ с кодом 2, сломанный вход закрывает', () => {
    const cli = (agent, input) => spawnSync(process.execPath, [join(ROOT, 'scripts/hooks/agent-guard.mjs'), agent], { cwd: ROOT, input, encoding: 'utf8' });
    const ok = cli('story-architect', JSON.stringify({ agent_id: `cli-${process.pid}`, tool_name: 'Bash', tool_input: { command: 'npm run -s story:status -- --all' } }));
    assert.equal(ok.status, 0);
    assert.equal(JSON.parse(ok.stdout).hookSpecificOutput.permissionDecision, 'allow');
    const quiet = cli('story-auditor', JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'npm run -s story:status' } }));
    assert.equal(quiet.status, 0);
    assert.equal(quiet.stdout, '');
    const no = cli('cold-reader', JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'rm -rf /' } }));
    assert.equal(no.status, 2);
    assert.match(no.stderr, /^cold-reader: /);
    assert.ok(no.stderr.length < 300, 'отказ — одна короткая строка');
    assert.equal(cli('chapter-writer', 'не json').status, 2);
  }],
  ['agent-guard: frontmatter агентов зовёт сторожа, а не node -e', () => {
    for (const name of Object.keys(AGENTS)) {
      const fm = readFileSync(join(ROOT, '.claude/agents', `${name}.md`), 'utf8').match(/^---\n([\s\S]*?)\n---\n/)[1];
      assert.doesNotMatch(fm, /node -e/, name);
      const calls = [...fm.matchAll(/command:\s*(.+)/g)].map((m) => m[1]);
      assert.ok(calls.length, `${name}: нет хука PreToolUse`);
      for (const c of calls) assert.match(c, new RegExp(`scripts/hooks/agent-guard\\.mjs ${name}$`), name);
      if (/\b(Write|Edit)\b/.test(fm.match(/^tools:.*$/m)?.[0] ?? '')) assert.match(fm, /matcher: "Write\|Edit/, `${name}: пишет — нужен сторож записи`);
    }
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
