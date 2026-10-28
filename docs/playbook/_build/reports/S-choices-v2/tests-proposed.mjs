// Тесты C-04, C-10, C-12 для selftest-wave2.mjs (просьба S-choices-v2, requests.md). Запуск отдельно:
// node docs/playbook/_build/reports/S-choices-v2/tests-proposed.mjs
import assert from 'node:assert/strict';
const R = new URL("../../../../../scripts/", import.meta.url).href;
const { lintStory, loadChecks } = await import(R + 'lint/core.mjs');
const { loadThresholds } = await import(R + 'lib/thresholds.mjs');
const T = loadThresholds();
const checks = await loadChecks();
const mk = (src, meta = {}) => ({ id: 'synthetic', path: 'synthetic.ink', form: 'ink', meta, main: 'story.ink', files: { 'story.ink': src }, order: ['story.ink'], ink: src });
const lint = (src, o = {}) => lintStory(mk(src, o.meta), T, { checks, runs: o.runs ?? 40, seed: 7, ...o });
const keys = (res) => res.findings.map((f) => f.key);
const has = async (src, key, o) => { const r = await lint(src, o); assert.ok(keys(r).includes(key), `ожидалась ${key}, есть: ${keys(r).join(', ')}`); return r; };
const hasNot = async (src, key, o) => { const r = await lint(src, o); assert.ok(!keys(r).includes(key), `лишняя ${key}`); return r; };
const chapters = (...bodies) => bodies.map((b, i) => `=== ch${i + 1} ===\nГлава ${i + 1} #sys #chapter\n${b}\n${i + 1 < bodies.length ? `-> ch${i + 2}` : '-> END'}`).join('\n');
const group = (a, b, body = '') => `* [${a}]${body ? `\n  ${body}` : ''}\n* [${b}]\n-`;
const tests = [];
const test = (n, f) => tests.push([n, f]);

// ── эти три теста — в selftest-wave2.mjs (секция «переменные» / «выборы»)
test('C-04: условный переход в узел с текстом — отклик; переход в пустой узел — нет', async () => {
  const mk4 = (target) => `VAR x = 0\n-> ch1\n${chapters(
    `привет #from:ann\n${group('да', 'нет', '~ x = 1')}`,
    `{x: -> ${target}}\nдва #from:ann`,
    'три #from:ann',
    '{x: помню} #from:ann',
  )}\n=== scene ===\nты тогда сказал «да» #from:ann\n-> ch3\n=== hop ===\n-> ch3`;
  await hasNot(mk4('scene'), 'C-04.gap_warning', { only: ['C-04'] });
  await has(mk4('hop'), 'C-04.gap_warning', { only: ['C-04'] });
});

test('C-10: вопрос Ане, а отвечает Боб — «ответил не тот»; ответ Ани, #sys и #silent — нет', async () => {
  const head = '# contact: ann, Аня, teal\n# contact: bob, Боб, amber\n-> a\n=== a ===\nну что #from:ann\n';
  const mk10 = (reply) => `${head}* [Аня, где ключ? #to:ann]\n  ${reply}\n* [Пока #to:ann]\n  пока #from:ann\n- -> END`;
  await has(mk10('я видел его на столе #from:bob'), 'C-10.wrong_responder', { only: ['C-10'] });
  await hasNot(mk10('на столе #from:ann'), 'C-10.wrong_responder', { only: ['C-10'] });
  await hasNot(mk10('Аня не в сети #sys:ann\n  я видел его на столе #from:bob'), 'C-10.wrong_responder', { only: ['C-10'] });
  await hasNot(mk10('я видел его на столе #from:bob\n  а, ты про ключ. на столе #from:ann'), 'C-10.wrong_responder', { only: ['C-10'] });
  await hasNot(`${head}* [Ладно, спасибо #to:ann]\n  я тут #from:bob\n* [Промолчать #to:ann #silent]\n  я тут #from:bob\n- -> END`, 'C-10.wrong_responder', { only: ['C-10'] });
});

test('C-12: последний заход в хаб одноразовых кнопок — не одиночка; одна кнопка в узле — одиночка', async () => {
  const hub = 'VAR n = 0\n-> h\n=== h ===\nчто сначала? #from:ann\n* [дверь]\n  ~ n += 1\n  закрыла #from:ann\n* [окно]\n  ~ n += 1\n  закрыла #from:ann\n- {n < 2: -> h}\n-> END';
  await hasNot(hub, 'C-12.single', { only: ['C-12'] });
  await has('-> a\n=== a ===\nидём? #from:ann\n* [идём]\n  ок #from:ann\n- -> END', 'C-12.single', { only: ['C-12'] });
});

let fail = 0;
for (const [n, f] of tests) { try { await f(); console.log('✓', n); } catch (e) { fail++; console.log('✗', n, '\n   ', e.message); } }
process.exitCode = fail ? 1 : 0;
