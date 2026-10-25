// Самопроверка теста срабатывания без единого запуска claude: поток, планы и доли на выдуманных скиллах.
// Запуск: npm run test:lab:triggers
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createStreamParser, parseSkillFile, parseRouting, buildPlan, summarize, isHit, checkEnv, gate,
  loadThresholds, loadPhraseDir, TRIGGER_KEYS,
} from './triggers-lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const init = { type: 'system', subtype: 'init', skills: ['lamp-check', 'dataviz'], plugins: [{ source: 'cc-plugin-x@builtin' }], mcp_servers: [] };
const tool = (name, input, parent = null) => ({ type: 'assistant', parent_tool_use_id: parent, message: { content: [{ type: 'tool_use', name, input }] } });
const stream = (...events) => events.map((e) => JSON.stringify(e)).join('\n') + '\n';

test('срабатывание — первый Skill вне агентов', () => {
  const p = createStreamParser();
  p.feed(stream(init, tool('Skill', { skill: 'tide-table' }, 'toolu_agent'), tool('Read', { file_path: '/x/notes.md' }), tool('Skill', { skill: 'lamp-check' }), tool('Skill', { skill: 'other' })));
  const r = p.end();
  assert.equal(r.skill, 'lamp-check');
  assert.deepEqual(r.tools, ['Read', 'Skill', 'Skill']);
  assert.deepEqual(r.init.skills, ['lamp-check', 'dataviz']);
});

test('поток кусками и мусор между строками', () => {
  const p = createStreamParser();
  const s = stream(init, tool('Skill', { skill: 'lamp-check' }));
  p.feed(s.slice(0, 17));
  p.feed('предупреждение CLI\n');
  p.feed(s.slice(17));
  assert.equal(p.end().skill, 'lamp-check');
});

test('чтение SKILL.md — обход, а не попадание', () => {
  const p = createStreamParser();
  p.feed(stream(init, tool('Read', { file_path: '/repo/.claude/skills/lamp-check/SKILL.md' }), tool('Bash', { command: 'cat .claude/skills/tide-table/SKILL.md' }), tool('Bash', { command: 'find . -name SKILL.md' })));
  const r = p.end();
  assert.equal(r.skill, null);
  assert.deepEqual(r.bypass, ['lamp-check', 'tide-table', '?']);
});

test('обход внутри агента не считается', () => {
  const p = createStreamParser();
  p.feed(stream(tool('Read', { file_path: '/r/.claude/skills/lamp-check/SKILL.md' }, 'toolu_1')));
  assert.deepEqual(p.end().bypass, []);
});

test('ожидания: скилл, none, «не этот», префикс плагина', () => {
  assert.ok(isHit('lamp-check', 'lamp-check'));
  assert.ok(isHit('lamp-check', 'plug:lamp-check'));
  assert.ok(!isHit('lamp-check', null));
  assert.ok(isHit('none', null));
  assert.ok(!isHit('none', 'lamp-check'));
  assert.ok(isHit('!lamp-check', 'tide-table'));
  assert.ok(isHit('!lamp-check', null));
  assert.ok(!isHit('!lamp-check', 'lamp-check'));
});

const lamp = parseSkillFile({ positive: ['фонарь гаснет', 'проверь фонарь'], negative: [{ text: 'когда прилив', expect: 'tide-table' }, 'просто болтовня'] }, 'lamp-check.json');
const tide = parseSkillFile({ positive: ['когда прилив', 'таблица приливов'], negative: ['фонарь гаснет'] }, 'tide-table.json');
const fog = parseSkillFile({ neighbors: ['lamp-check'], positive: ['туман над бухтой'], negative: [] }, 'fog-horn.json');
const solo = parseSkillFile({ positive: ['смени батарейку'], negative: [] }, 'radio.json');
const routing = parseRouting({ _: 'служебное', 'фонарь мигает': 'lamp-check', 'обнови зависимости': 'none', 'туман густеет': 'fog-horn' }, '_routing.json').items;

test('файл фраз: соседи из expect, ошибки формата', () => {
  assert.deepEqual(lamp.neighbors, ['tide-table']);
  assert.equal(lamp.items.find((i) => i.text === 'просто болтовня').expect, '!lamp-check');
  assert.equal(lamp.items.find((i) => i.text === 'когда прилив').expect, 'tide-table');
  const bad = parseSkillFile({ skill: 'other', positive: 'не массив' }, 'lamp-check.json');
  assert.equal(bad.errors.length, 3);
  assert.equal(routing.length, 3);
});

test('пустой набор: всё пропущено, none без скиллов не гоняется', () => {
  const plan = buildPlan({ skills: [lamp, tide], routing }, { present: [] });
  assert.equal(plan.phrases.length, 0);
  assert.equal(plan.skipped.length, lamp.items.length + tide.items.length + routing.length);
});

test('план: фразы отсутствующих скиллов пропущены, общие фразы склеены', () => {
  const plan = buildPlan({ skills: [lamp, tide], routing }, { present: ['lamp-check', 'tide-table'] });
  const both = plan.phrases.find((p) => p.text === 'фонарь гаснет');
  assert.deepEqual(both.checks.map((c) => c.expect).sort(), ['!tide-table', 'lamp-check']);
  assert.ok(plan.skipped.some((s) => s.text === 'туман густеет'));
  assert.ok(plan.phrases.some((p) => p.text === 'обнови зависимости'));
  const only = buildPlan({ skills: [lamp, tide], routing }, { present: ['lamp-check'] });
  assert.ok(!only.phrases.some((p) => p.text === 'когда прилив'), 'негатив с адресом к несуществующему скиллу пропущен');
});

test('--skill: свои фразы, позитивы соседей в обе стороны, маршруты к группе', () => {
  const plan = buildPlan({ skills: [lamp, tide, fog, solo], routing }, { present: ['lamp-check', 'tide-table', 'fog-horn', 'radio'], focus: 'lamp-check' });
  assert.deepEqual(plan.group.sort(), ['fog-horn', 'lamp-check', 'tide-table']);
  const texts = plan.phrases.map((p) => p.text);
  assert.ok(texts.includes('туман над бухтой'));
  assert.ok(texts.includes('таблица приливов'));
  assert.ok(texts.includes('туман густеет'));
  assert.ok(!texts.includes('смени батарейку'));
  assert.ok(!texts.includes('обнови зависимости'));
  const gasnet = plan.phrases.find((p) => p.text === 'фонарь гаснет');
  assert.deepEqual(gasnet.checks.map((c) => c.expect), ['lamp-check'], 'негатив соседа в группу не берём');
});

test('доли: попадания, ложные с первой фразы, обход', () => {
  const run = (skill, bypass = []) => ({ skill, bypass });
  const phrases = [
    { text: 'просто болтовня', checks: [{ expect: '!lamp-check' }], runs: [run(null), run('tide-table'), run(null)] },
    { text: 'фонарь гаснет', checks: [{ expect: 'lamp-check' }], runs: [run('lamp-check'), run(null, ['lamp-check']), run('lamp-check')] },
    { text: 'когда прилив', checks: [{ expect: 'tide-table' }], runs: [run('tide-table'), run('lamp-check'), { error: 'сбой', bypass: [] }] },
  ];
  const s = summarize(phrases, { present: ['lamp-check', 'tide-table'] });
  const by = Object.fromEntries(s.skills.map((x) => [x.skill, x]));
  assert.equal(by['lamp-check'].hit_rate, 2 / 3);
  assert.deepEqual(by['lamp-check'].missed_to, { none: 1 });
  assert.equal(by['lamp-check'].bypass, 1);
  assert.equal(by['lamp-check'].false, 1);
  assert.equal(by['lamp-check'].foreign, 5);
  assert.equal(by['tide-table'].hit_rate, 1 / 2);
  assert.equal(by['tide-table'].false, 1, 'tide-table сработал на первой фразе — ложное учтено');
  assert.equal(by['tide-table'].foreign, 6);
  assert.equal(s.errors, 1);
  assert.equal(s.checks, 8);
  const fails = gate(s, { min: 0.6, maxFalse: 0.1 });
  assert.equal(fails.length, 3);
  assert.deepEqual(gate(s, { min: 0.5, maxFalse: 0.25 }), []);
});

test('окружение: чужие, пропавшие, плагины, MCP', () => {
  const env = { skills: ['lamp-check', 'dataviz', 'cockroach:query'], plugins: [{ source: 'x@builtin' }, { source: 'engineering@synced' }], mcp_servers: [{ name: 'slack' }] };
  const w = checkEnv(env, { project: ['lamp-check', 'tide-table'], allowed: ['dataviz'] });
  assert.equal(w.length, 4);
  assert.match(w[0], /cockroach:query/);
  assert.match(w[1], /tide-table/);
  assert.deepEqual(checkEnv({ skills: ['lamp-check'], plugins: [], mcp_servers: [] }, { project: ['lamp-check'], allowed: [] }), []);
  // модуль с user-invocable: false в init.skills не попадает, но это не пропажа
  assert.deepEqual(checkEnv({ skills: ['lamp-check'], plugins: [], mcp_servers: [] }, { project: ['lamp-check', 'tide-table'], allowed: [], hidden: ['tide-table'] }), []);
});

test('пороги: ключи lab.triggers.* из thresholds.json через общий загрузчик', () => {
  const th = loadThresholds(join(ROOT, 'docs/playbook/thresholds.json'));
  for (const k of TRIGGER_KEYS) assert.equal(typeof th.values[k], 'number', k);
  assert.throws(() => loadThresholds(join(ROOT, 'docs/lab/triggers/_example.json')), /нет порога/);
});

test('файлы docs/lab/triggers разбираются, шаблон и пример валидны', () => {
  const set = loadPhraseDir(join(ROOT, 'docs/lab/triggers'));
  assert.deepEqual(set.errors, []);
  assert.ok(set.routing.length > 0);
  for (const f of ['_example.json', '_template.json']) {
    const data = JSON.parse(readFileSync(join(ROOT, 'docs/lab/triggers', f), 'utf8'));
    assert.deepEqual(parseSkillFile(data, f).errors, [], f);
  }
  const ex = parseSkillFile(JSON.parse(readFileSync(join(ROOT, 'docs/lab/triggers/_example.json'), 'utf8')), '_example.json');
  assert.ok(ex.items.filter((i) => i.kind === 'positive').length >= 5);
  assert.ok(ex.items.filter((i) => i.kind === 'negative').length >= 5);
});
