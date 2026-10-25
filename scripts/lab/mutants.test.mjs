// Самопроверка skills:test: сборка мутантов, ключ, вердикт линта, разбор ответа скилла.
// Запуск: npm run test:lab:mutants
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from '../lib/compile.mjs';
import { compileInput, storyFromJson } from '../lib/story.mjs';
import { knownChecks } from '../lint/core.mjs';
import { loadThresholds } from '../lib/thresholds.mjs';
import {
  applyEdits, buildKey, buildMutant, checkOwners, keyEntry, lintDiff, lintVerdict, matchFinding, neutralId,
  parseFindings, SKILL_ALLOW, SKILL_DENY, skillRunSummary, skillsFromOwners, validateSpec, zoneSummary,
} from './mutants-lib.mjs';
import { createStreamParser, invalidReason } from './triggers-lib.mjs';
import { MUTANTS } from './mutants-spec.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const BASE = join(ROOT, 'docs/lab/mutants/_base');
const base = { ink: readFileSync(join(BASE, 'story.ink'), 'utf8'), meta: JSON.parse(readFileSync(join(BASE, 'meta.json'), 'utf8')) };
const owners = readFileSync(join(ROOT, 'docs/playbook/owners.md'), 'utf8');
const T = loadThresholds();

test('applyEdits: правка ровно в одном месте', () => {
  assert.deepEqual(applyEdits('а б в', [['б', 'Б']]), { text: 'а Б в', errors: [] });
  assert.match(applyEdits('а б б', [['б', 'Б']]).errors[0], /2 раз/);
  assert.match(applyEdits('а б', [['я', 'Я']]).errors[0], /0 раз/);
  assert.match(applyEdits('а б', [['б', 'б']]).errors[0], /не изменили/);
  // $ в замене — текст, а не шаблон String.replace
  assert.equal(applyEdits('x', [['x', '$&$&']]).text, '$&$&');
});

test('набор: размер, поля, зоны и проверки сходятся со сводом', () => {
  const skills = skillsFromOwners(owners);
  assert.ok(skills.has('story-time') && skills.has('chapter-write') && skills.size >= 20, `скиллы из owners.md: ${[...skills].join(', ')}`);
  assert.deepEqual(validateSpec(MUTANTS, { count: T.value('lab.mutants.count'), skills, checks: knownChecks() }), []);
  const few = validateSpec(MUTANTS.slice(0, 3), { count: T.value('lab.mutants.count') });
  assert.match(few[0], /мутантов 3/);
  const bad = validateSpec([{ ...MUTANTS[0], id: 'x', zone: 'story-nope', check: 'C-99' }], { count: { min: 1, max: 1 }, skills, checks: knownChecks() });
  assert.ok(bad.some((e) => /id не вида/.test(e)) && bad.some((e) => /story-nope/.test(e)) && bad.some((e) => /C-99/.test(e)), bad.join('\n'));
});

test('набор: дефекты из задачи T-13 все на месте', () => {
  const want = ['C-24', 'C-01', 'C-06', 'C-35', 'C-42', 'C-45', 'C-21', 'C-27', 'C-32', 'C-40', 'C-54', 'C-10', 'C-26', 'C-44', 'C-49', 'C-20', 'C-39', 'C-47'];
  const have = new Set(MUTANTS.map((m) => m.check));
  assert.deepEqual(want.filter((c) => !have.has(c)), []);
  // утро и напоминание меряет C-32; упрёк за отсутствие — строка C-47 из зоны story-time (T-03d)
  assert.deepEqual(MUTANTS.filter((m) => m.check === 'C-32').map((m) => m.id), ['m09-instant-morning', 'm11-reminder-dead-end']);
  assert.deepEqual(MUTANTS.filter((m) => m.zone === 'story-time' && m.check === 'C-47').map((m) => m.id), ['m10-absence-reproach']);
});

test('каждый мутант ложится на основу, компилируется и отличается от неё', () => {
  const baseBuilt = compile(compileInput(storyFromJson({ ...base.meta, ink: base.ink })));
  assert.ok(baseBuilt.ok, 'основа не компилируется');
  for (const m of MUTANTS) {
    const b = buildMutant(m, base);
    assert.deepEqual(b.errors, [], m.id);
    assert.notEqual(b.files['story.ink'], base.ink, m.id);
    const meta = JSON.parse(b.files['meta.json']);
    assert.equal(meta.id, m.id);
    const c = compile(compileInput(storyFromJson({ ...meta, ink: b.files['story.ink'] })));
    assert.ok(c.ok, `${m.id}: ${c.errors?.map((e) => e.message).join('; ')}`);
  }
});

test('key.json на диске совпадает со сборкой из спецификации', () => {
  const disk = JSON.parse(readFileSync(join(ROOT, 'docs/lab/mutants/key.json'), 'utf8'));
  const fresh = buildKey(MUTANTS, disk._about);
  assert.deepEqual(disk, fresh, 'npm run skills:test -- --build');
  for (const e of disk.mutants) {
    assert.equal(readFileSync(join(ROOT, e.path, 'story.ink'), 'utf8'), buildMutant(MUTANTS.find((m) => m.id === e.id), base).files['story.ink'], e.id);
  }
});

test('lintDiff: новые находки — по проверке, ключу и узлу, без текста', () => {
  const b = [{ check: 'C-26', key: 'C-26.share', node: null, message: '20 %' }];
  const m = [{ check: 'C-26', key: 'C-26.share', node: null, message: '40 %' }, { check: 'C-01', key: 'C-01.dead', node: 'a', message: 'x' }];
  assert.deepEqual(lintDiff(b, m).map((f) => f.check), ['C-01']);
});

test('lintVerdict: пойман, частично, не пойман, ждёт проверку', () => {
  const impl = new Set(['C-01', 'C-11', 'C-40']);
  const f = (check) => ({ check });
  assert.equal(lintVerdict({ check: 'C-01', lint: ['C-01'] }, [f('C-01')], impl).status, 'caught');
  assert.equal(lintVerdict({ check: 'C-01', lint: [] }, [f('C-01')], impl).status, 'caught', 'своя проверка ждётся без поля lint');
  assert.equal(lintVerdict({ check: 'C-40', lint: ['C-11'] }, [f('C-11')], impl).status, 'partial');
  assert.equal(lintVerdict({ check: 'C-01', lint: [] }, [f('C-11')], impl).status, 'missed');
  const p = lintVerdict({ check: 'C-42', lint: [] }, [f('C-26')], impl);
  assert.equal(p.status, 'pending');
  assert.equal(p.waits, 'C-42');
  assert.deepEqual(p.extra, ['C-26']);
  // смежная проверка уже есть, своей ещё нет: пойман смежной и всё равно ждёт свою
  const s = lintVerdict({ check: 'C-32', lint: ['C-11'] }, [f('C-11')], impl);
  assert.equal(s.status, 'caught');
  assert.equal(s.waits, 'C-32');
  // lint_auto: false — своя проверка мутанта его по определению не ловит: ждём только поле lint
  const auto = (lint) => lintVerdict({ check: 'C-40', lint, lint_auto: false }, [f('C-11')], impl);
  assert.equal(auto(['C-11']).status, 'caught');
  assert.deepEqual(auto(['C-11']).expected, ['C-11']);
  assert.equal(auto([]).status, 'skill');
  assert.equal(auto([]).waits, null);
});

test('ключ: lint_auto с причиной, catches — полные ID строк базы, которые есть в docs/books', () => {
  const bad = validateSpec([{ ...MUTANTS[0], lint_auto: false, catches: ['RED-01', 'C-24'] }], { count: { min: 1, max: 1 } });
  assert.ok(bad.some((e) => /lint_why/.test(e)) && bad.some((e) => /«RED-01»/.test(e)) && bad.some((e) => /«C-24»/.test(e)), bad.join('\n'));
  for (const m of MUTANTS) {
    for (const id of m.catches) {
      const [alias, red] = id.split(':');
      const flags = join(ROOT, 'docs/books', alias, 'flags.md');
      assert.ok(existsSync(flags) && readFileSync(flags, 'utf8').includes(`| ${red} |`), `${m.id}: ${id} нет в docs/books/${alias}/flags.md`);
    }
    const e = keyEntry(m);
    assert.ok(e.catches.includes(m.check) && (m.lint ?? []).every((c) => e.catches.includes(c)), `${m.id}: в catches нет своих C-NN`);
    assert.equal(e.lint_auto, m.lint_auto !== false);
  }
  // без поля lint и с lint_auto: false мутанта ловит только скилл
  assert.deepEqual(MUTANTS.filter((m) => m.lint_auto === false && !m.lint.length).map((m) => m.id).sort(), ['m16-same-voices', 'm17-fact-mismatch']);
});

test('zoneSummary: полнота линта по измеренным, скилла — по прогонам', () => {
  const e = (zone) => ({ zone });
  const lint = zoneSummary([
    { entry: e('a'), verdict: { status: 'caught' } }, { entry: e('a'), verdict: { status: 'missed' } }, { entry: e('a'), verdict: { status: 'pending' } },
    { entry: e('b'), verdict: { status: 'pending' } }, { entry: e('b'), verdict: { status: 'skill' } },
  ]);
  assert.deepEqual(lint.map((z) => [z.zone, z.mutants, z.measured, z.caught, z.pending, z.skill, z.recall]), [['a', 3, 2, 1, 1, 0, 0.5], ['b', 2, 0, 0, 1, 1, null]]);
  const sk = zoneSummary([{ entry: e('a'), runs: [{ hit: true }, { hit: false }] }, { entry: e('a'), runs: [{ hit: true }, { hit: true }] }]);
  assert.equal(sk[0].recall, 0.75);
  assert.equal(sk[0].caught, 2);
});

test('parseFindings: последний блок json, иначе строки «P1 · …»', () => {
  const text = 'черновик ```json\n{"findings": []}\n```\nитог:\n```json\n{"findings": [{"node": "ch3_radio", "check": "C-26", "summary": "прощание"}, {"node": null, "check": "нет", "summary": 5}]}\n```';
  assert.deepEqual(parseFindings(text), [{ node: 'ch3_radio', check: 'C-26', summary: 'прощание' }, { node: null, check: null, summary: '5' }]);
  const lines = 'P1 · скучно · `ch3_radio` · 15 реплик подряд · F-05 · C-35 · замер\n- P2 · непонятно · ch1 · что-то\nпросто строка C-01';
  assert.deepEqual(parseFindings(lines, ['ch1', 'ch3_radio']), [
    { node: 'ch3_radio', check: 'C-35', summary: 'P1 · скучно · `ch3_radio` · 15 реплик подряд · F-05 · C-35 · замер' },
    { node: 'ch1', check: null, summary: '- P2 · непонятно · ch1 · что-то' },
  ]);
  assert.deepEqual(parseFindings('```json\nне json\n```'), []);
  assert.deepEqual(parseFindings(null), []);
});

test('matchFinding: узел дефекта, его stitch или та же проверка без узла', () => {
  const entry = { node: 'ch3_radio', check: 'C-26' };
  assert.ok(matchFinding(entry, [{ node: 'ch3_radio', check: null }]));
  assert.ok(matchFinding(entry, [{ node: 'ch3_radio.wait', check: null }]));
  assert.equal(matchFinding(entry, [{ node: 'ch1', check: 'C-26' }]), null);
  assert.ok(matchFinding(entry, [{ node: null, check: 'C-26' }]));
  assert.equal(matchFinding(entry, [{ node: 'ch3_radio_x', check: 'C-35' }]), null);
  assert.ok(matchFinding({ node: null, check: 'C-31' }, [{ node: null, check: 'C-31' }]));
});

test('neutralId не выдаёт мутанта и стабилен', () => {
  const a = neutralId('m15-pause-no-hook', '0');
  assert.match(a, /^story-[0-9a-f]{6}$/);
  assert.equal(a, neutralId('m15-pause-no-hook', '0'));
  assert.notEqual(a, neutralId('m15-pause-no-hook', '1'));
});

test('владельцы проверок читаются из owners.md §3', () => {
  const o = checkOwners(owners);
  assert.equal(o.get('C-26'), 'story-pauses');
  assert.equal(o.get('C-32'), 'story-time');
});

// Отказы в правах на синтетическом потоке claude -p: недействительный прогон не попадание и не промах (LOCAL-03).
const ev = (o) => JSON.stringify(o);
const use = (id, name, input) => ev({ type: 'assistant', parent_tool_use_id: null, message: { content: [{ type: 'tool_use', id, name, input }] } });
const deny = (id, name) => ev({ type: 'system', subtype: 'permission_denied', tool_name: name, tool_use_id: id });
const done = (denials) => ev({ type: 'result', subtype: 'success', result: '```json\n{"findings": [{"node": "ch3_radio", "check": "C-26", "summary": "x"}]}\n```', permission_denials: denials });
const opts = { tools: T.value('lab.denials.blocking_tools'), intended: SKILL_DENY };
const parse = (...lines) => {
  const p = createStreamParser();
  p.feed(`${lines.join('\n')}\n`);
  return p.end();
};

test('skills:test: отказ на Bash — прогон недействительный, даже если находки есть', () => {
  const r = parse(use('s', 'Skill', { skill: 'story-pauses' }), use('b', 'Bash', { command: 'npm run -s story:lint -- /tmp/x --json' }), deny('b', 'Bash'),
    done([{ tool_name: 'Bash', tool_use_id: 'b', tool_input: { command: 'npm run -s story:lint -- /tmp/x --json' } }]));
  assert.match(invalidReason(r.denials, opts), /Bash ×1 \(npm run -s story:lint -- \/tmp\/x --json\)/);
});

test('skills:test: отказ на Write при чтении, чтение ключа и skills-test --json — прогон действительный', () => {
  const r = parse(use('r', 'Read', { file_path: './docs/lab/mutants/key.json' }), deny('r', 'Read'),
    use('w', 'Write', { file_path: '/tmp/x/notes.md' }), deny('w', 'Write'),
    use('k', 'Bash', { command: 'node scripts/lab/skills-test.mjs --json' }), deny('k', 'Bash'), done([]));
  assert.equal(r.denials.length, 3);
  assert.equal(invalidReason(r.denials, opts), null);
  assert.ok(SKILL_ALLOW.includes('Skill') && SKILL_ALLOW.includes('Bash(npm run story*)'), 'права шагов скилла — без хвоста :* (LOCAL-03)');
});

test('skillRunSummary: недействительные — в failed_runs и «отказы», не в полноту; основа целиком', () => {
  const run = (o) => ({ hit: false, findings: [], error: null, invalid: null, denials: [], ...o });
  const f = { node: 'ch3_radio', check: 'C-26', summary: 'шум' };
  const results = [
    { entry: { id: 'm01', zone: 'story-pauses' }, runs: [run({ hit: true }), run({ invalid: 'отказ в правах: Bash ×1', denials: [{ tool: 'Bash', command: 'npm run story:lint' }] })] },
    { entry: { id: 'm02', zone: 'story-pauses' }, runs: [run({}), run({ error: 'не уложился' })] },
    { entry: { id: '_base', zone: 'story-pauses' }, control: true, runs: [run({ findings: [f, f], answer: 'ответ' }), run({ invalid: 'отказ', denials: [{ tool: 'Skill', command: 'story-pauses' }] })] },
  ];
  const s = skillRunSummary(results, { ...opts, maxInvalid: T.value('lab.denials.max_invalid_share') });
  assert.equal(s.recall, 1 / 2, 'отказ не промах: 1 попадание из 2 действительных');
  assert.equal(s.denied, 1);
  assert.equal(s.failed, 2);
  assert.equal(s.zones[0].denied, 1);
  assert.deepEqual(s.control.counts, [2, null]);
  assert.deepEqual(s.control.runs[0].findings, [f, f], '--control хранит сами находки');
  assert.equal(s.control.runs[0].answer, 'ответ');
  assert.deepEqual(s.denials.map((d) => [d.mutant, d.run, d.tool, d.blocking]), [['m01', 2, 'Bash', true], ['_base', 2, 'Skill', true]]);
  assert.match(s.denialFail, /недействительных/, '2 из 5 запущенных — выше порога');
  const clean = skillRunSummary([{ entry: { id: 'm01', zone: 'z' }, runs: [run({ hit: true })] }], { ...opts, maxInvalid: T.value('lab.denials.max_invalid_share') });
  assert.equal(clean.denialFail, null);
  assert.equal(clean.failed, 0);
  assert.equal(clean.control, null);
  const lost = skillRunSummary([{ entry: { id: 'm01', zone: 'z' }, runs: [run({ invalid: 'отказ', denials: [{ tool: 'Bash', command: 'x' }] })] }], { ...opts, maxInvalid: T.value('lab.denials.max_invalid_share') });
  assert.equal(lost.recall, null, 'все прогоны не в счёт — полнота не измерена, а не 0');
  assert.equal(lost.zones[0].denied, 1);
});
