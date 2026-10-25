// Самопроверка story:lint: синтетические истории с дефектами по каждой проверке первой волны и C-53,
// чистые двойники без дефекта, подавление, схема thresholds.json, флаги командной строки.
// Запуск: npm run test:lint [-- --json] [-- --only <подстрока>]
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseInk, walk } from '../lib/ink.mjs';
import { listStories, loadStory } from '../lib/story.mjs';
import { buildStatic } from './static.mjs';
import { formatFinding, formatSummary, lintStory, loadChecks } from './core.mjs';
import { register as wave2 } from './selftest-wave2.mjs';
import { loadThresholds, validateThresholds, THRESHOLDS_PATH } from '../lib/thresholds.mjs';

const HELP = `npm run test:lint [-- --json] [-- --only <подстрока>]

Самопроверка story:lint: на каждую проверку C-01…C-54 — маленькая выдуманная история с дефектом
(находка есть) и, где это имеет смысл, без него (находки нет); вторая волна — selftest-wave2.mjs.
Подавление «// намеренно:»; уровни из thresholds.json; схема thresholds.json (опора, deferred:E-NN),
сверка engine.typing с engine.ts; ключи вместо чисел в claude-code-format.md, attention-merged.md §6,
style.md §14.4 и checks.md; владелец находки из owners.md; служебные контакты; финал без метки;
флаги --json, --strict, --only, --partial, --plan, --changed --quick, --summary, --transcript;
три истории каталога проходят без падения.

  --json         результаты одним JSON в stdout
  --only <текст> только тесты, в названии которых есть текст
  --help         эта справка`;

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) { console.log(HELP); process.exit(0); }
const asJson = argv.includes('--json');
const onlyAt = argv.indexOf('--only');
const only = onlyAt >= 0 ? argv[onlyAt + 1] : null;

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const T = loadThresholds();
const checks = await loadChecks();
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

/** История из одного ink без файла: та же форма, что даёт loadStory. */
const mk = (src, meta = {}) => ({ id: 'synthetic', path: 'synthetic.ink', form: 'ink', meta, main: 'story.ink', files: { 'story.ink': src }, order: ['story.ink'], ink: src });
const lint = (src, o = {}) => lintStory(mk(src, o.meta), o.T ?? T, { checks, runs: o.runs ?? 40, seed: 7, ...o });
const keys = (res) => res.findings.map((f) => f.key);
const has = async (src, key, o) => {
  const res = await lint(src, o);
  assert.ok(keys(res).includes(key), `ожидалась находка ${key}, есть: ${keys(res).join(', ') || 'ничего'}`);
  return res;
};
const hasNot = async (src, key, o) => {
  const res = await lint(src, o);
  assert.ok(!keys(res).includes(key), `лишняя находка ${key}: ${res.findings.filter((f) => f.key === key).map(formatFinding).join(' | ')}`);
  return res;
};
const lines = (n, prefix = 'строка') => Array.from({ length: n }, (_, i) => `${prefix} ${i + 1}`).join('\n');

// ───────── пороги

test('thresholds.json: схема, уровни, опора, история', () => {
  assert.deepEqual(validateThresholds(T.all), []);
  for (const k of T.keys()) assert.ok(T.get(k).history.every((h) => h.date && h.change), `${k}: запись истории без даты или правки`);
});

test('thresholds.json: каждый ключ из кода проверок существует, номер проверки совпадает', () => {
  const dir = fileURLToPath(new URL('./checks/', import.meta.url));
  for (const f of readdirSync(dir)) {
    const src = readFileSync(join(dir, f), 'utf8');
    for (const m of src.matchAll(/'((?:C-\d\d|story|engine|lint|dict|attn|style|bot)\.[\w.]+)'/g)) {
      assert.doesNotThrow(() => T.get(m[1]), `${f}: ключ ${m[1]}`);
      if (m[1].startsWith('C-')) assert.equal(m[1].slice(0, 4), f.slice(0, 4), `${f}: чужой ключ ${m[1]}`);
    }
  }
});

test('thresholds.json: ключи просьбы T-05 и конвейера на месте', () => {
  for (const k of ['story.length.target_h', 'story.length.max_h', 'story.pause.max_h', 'story.tail.max_delay_min', 'story.reminders.max',
    'engine.click.time_jump_label', 'story.sleep_morning.min_h', 'story.card.mismatch_ratio', 'dict.return_deadline', 'dict.absence_reproach',
    'dict.lived_wait', 'dict.player_time', 'dict.threat', 'C-53.marks', 'lab.triggers.runs_per_phrase', 'lab.triggers.min_share',
    'lab.triggers.max_false', 'lab.fidelity.min_share', 'skill.description.max_chars', 'skill.core.min_lines', 'skill.core.max_lines',
    'skill.hook.max_output_chars']) assert.doesNotThrow(() => T.get(k), k);
  assert.equal(T.value('engine.click.time_jump_label'), 1);
  assert.equal(T.get('engine.click.time_jump_label').basis, 'our_estimate');
  for (const k of T.keys()) if (k.startsWith('dict.') && typeof T.value(k) === 'string') assert.doesNotThrow(() => T.re(k), k);
});

test('engine.typing совпадает с typingTime и gapTime в engine.ts', () => {
  const src = readFileSync(join(ROOT, 'src/engine/engine.ts'), 'utf8');
  const c = T.value('engine.typing');
  const typing = src.match(/Math\.min\((\d+), Math\.max\((\d+), (\d+) \+ text\.length \* (\d+)\)\)/);
  assert.ok(typing, 'формула набора в engine.ts изменилась — обнови engine.typing');
  assert.deepEqual(typing.slice(1).map(Number), [c.max_s, c.min_s, c.base_s, c.per_char_s].map((x) => Math.round(x * 1000)));
  assert.ok(src.includes(`if (kind === 'photo') return ${Math.round(c.photo_s * 1000)};`));
  assert.ok(src.includes(`const jitter = ${Math.round(c.gap_min_s * 1000)} + (h % ${Math.round(c.gap_spread_s * 1000)});`));
  assert.ok(src.includes(`afterPlayer ? jitter + ${Math.round(c.after_player_s * 1000)} : jitter`));
  assert.ok(src.includes(`if (kind === 'sys') return ${Math.round(c.gap_sys_s * 1000)};`));
  assert.ok(src.includes(`if (kind === 'out') return ${Math.round(c.gap_me_s * 1000)};`));
});

test('claude-code-format.md: §4.2 и §9 ссылаются на ключи, а не на числа', () => {
  const doc = readFileSync(join(ROOT, 'docs/playbook/claude-code-format.md'), 'utf8');
  const used = [...doc.matchAll(/`((?:lab|skill)\.[\w.]+)`/g)].map((m) => m[1]);
  for (const k of ['lab.triggers.runs_per_phrase', 'skill.description.max_chars', 'skill.core.min_lines', 'skill.core.max_lines', 'skill.hook.max_output_chars']) {
    assert.ok(used.includes(k), `в документе нет ключа ${k}`);
  }
  for (const k of used) assert.doesNotThrow(() => T.get(k), k);
  const s42 = doc.slice(doc.indexOf('### 4.2'), doc.indexOf('## 5.'));
  const s9 = doc.slice(doc.indexOf('## 9.'));
  assert.ok(!/3–5 прогонов/.test(s42), '§4.2: число прогонов');
  assert.ok(!/до 300 знаков|60–120 строк|Короче 10 000/.test(s9), '§9: число порога');
});

test('уровень находки берётся из thresholds.json', async () => {
  const src = 'VAR dead = 0\n-> a\n=== a ===\nпривет #from:ann\n* [да]\n  ~ dead = 1\n  -> END\n* [нет]\n  -> END';
  const res = await has(src, 'C-01.dead', { only: ['C-01'] });
  assert.equal(res.findings[0].level, 'error');
  const all = JSON.parse(readFileSync(THRESHOLDS_PATH, 'utf8'));
  all['C-01.dead'] = { ...all['C-01.dead'], level: 'hint' };
  const soft = await lint(src, { only: ['C-01'], T: loadThresholds(all) });
  assert.equal(soft.findings[0].level, 'hint');
  assert.match(formatFinding(res.findings[0]), /^ошибка · C-01 · a \(гл\. 1\) · переменная «dead» .* · = 0 чтений \(/);
});

test('нет ключа в thresholds.json — исключение, а не число по умолчанию', () => {
  assert.throws(() => T.get('C-99.nothing'), /нет порога/);
});

// ───────── переменные и финалы

test('C-01: записывается и не читается; чтение в условии, в тексте и производное гасят', async () => {
  const dead = 'VAR x = 0\n-> a\n=== a ===\nвыбирай #from:ann\n* [один]\n  ~ x = 1\n  -> b\n* [два]\n  -> b\n=== b ===\nвсё\n-> END';
  await has(dead, 'C-01.dead', { only: ['C-01'] });
  await hasNot(dead.replace('всё', '{x: помню|не помню}'), 'C-01.dead', { only: ['C-01'] });
  // y пишется под условием на x, y читается — значит, x жив (одна ступень производных)
  const derived = 'VAR x = 0\nVAR y = 0\n-> a\n=== a ===\nвыбирай #from:ann\n* [один]\n  ~ x = 1\n* [два]\n-\n{x:\n  ~ y = 1\n}\n-> b\n=== b ===\n{y > 0: да}\n-> END';
  await hasNot(derived, 'C-01.dead', { only: ['C-01'] });
  // x = x + 1 — это запись, а не чтение
  await has(dead.replace('~ x = 1', '~ x = x + 1'), 'C-01.dead', { only: ['C-01'] });
});

const threeChapters = (readIn) => `VAR trust = 0
-> ch1
=== ch1 ===
Глава 1 #sys #chapter
привет #from:ann
* [доверяю]
  ~ trust += 1
* [нет]
- -> ch2
=== ch2 ===
Глава 2 #sys #chapter
${readIn === 2 ? '{trust > 0: ты мне поверил тогда}' : 'дальше'} #from:ann
* [ага]
* [угу]
- -> ch3
=== ch3 ===
Глава 3 #sys #chapter
{trust > 0: конец А|конец Б} #from:ann
-> END`;

test('C-03: пишется в главе 1, читается только в последней главе', async () => {
  await has(threeChapters(3), 'C-03.invisible', { only: ['C-03'] });
  await hasNot(threeChapters(2), 'C-03.invisible', { only: ['C-03'] });
});

const distributor = (extra) => `VAR a = 0
VAR b = 0
-> ch1
=== ch1 ===
Глава 1 #sys #chapter
привет #from:ann
* [за]
  ~ a = 1
* [против]
${extra ? '  ~ b = 1' : ''}
- -> ch2
=== ch2 ===
Глава 2 #sys #chapter
решай #from:ann
* [ладно]
  ~ b = 1
* [нет]
- -> route
=== route ===
{a > 0${extra ? ' && b > 0' : ''}: -> end_one}
-> end_two
=== end_one ===
один #from:ann
-> END
=== end_two ===
два #from:ann
-> END`;

test('C-06: распределитель читает одну переменную — находка; две из ранней и последней главы — нет', async () => {
  const res = await has(distributor(false), 'C-06.min_vars', { only: ['C-06'] });
  assert.equal(res.findings[0].node, 'route');
  await hasNot(distributor(true), 'C-06.min_vars', { only: ['C-06'] });
  await hasNot(distributor(true), 'C-06.no_last_choice', { only: ['C-06'] });
});

test('однострочное «{a > 0: -> end_one}» — скрытое чтение распределителя, а не реплика (C-02, C-03, C-06)', () => {
  const st = buildStatic(parseInk(distributor(false)));
  assert.ok(st.distributors.has('route'));
  assert.deepEqual(st.edges.get('route').map((e) => e.to).sort(), ['end_one', 'end_two']);
  const reads = st.vars.index.get('a').reads.filter((r) => r.node === 'route');
  assert.equal(reads.length, 1);
  assert.equal(reads[0].visible, false, 'условие перехода игрок не видит');
  let fake = false;
  walk(st.byId.get('route').items, (it) => { if (it.type === 'msg') fake = true; });
  assert.ok(!fake, 'от строки условия не осталось реплики');
});

test('C-40: один финал забирает большинство, другой не выпадает; метки «финал:» и подпись ветки', async () => {
  const src = `-> a
=== a ===
куда? #from:ann
* [север] -> north
* [юг] -> north
* [запад] -> north
* [восток] -> east
// финал: север
=== north ===
холодно #from:ann
-> END
=== east ===
тепло #from:ann
{false:
  // финал: тайный
  тайна
- else:
  // финал: восток
  восход
}
-> END`;
  const res = await has(src, 'C-40.dominant_share', { only: ['C-40'], runs: 80 });
  assert.match(res.findings.find((f) => f.key === 'C-40.dominant_share').message, /«север»/);
  const rare = res.findings.filter((f) => f.key === 'C-40.rare_share').map((f) => f.message).join(' ');
  assert.match(rare, /«тайный»/);
  assert.doesNotMatch(rare, /«восток»/, 'ветка «восток» узнаётся по подписи и не считается редкой');
  await has(src.replace('// финал: север\n', ''), 'C-40.unmarked_run', { only: ['C-40'] });
});

// ───────── выборы

test('C-10: пустые кнопки в главе, декоративная группа, три косметические развилки подряд', async () => {
  const src = `-> a
=== a ===
раз #from:ann
* [да]
* [нет]
- два
* [ну]
* [ага]
- три
* [ок]
* [хм]
- -> END`;
  const res = await has(src, 'C-10.bodyless_chapter', { only: ['C-10'] });
  assert.ok(keys(res).includes('C-10.group_bodyless'));
  assert.ok(keys(res).includes('C-10.cosmetic_streak'));
  await hasNot('VAR x = 0\n-> a\n=== a ===\nраз #from:ann\n* [да]\n  ~ x = 1\n* [нет]\n  -> b\n- {x: ага}\n-> END\n=== b ===\nб\n-> END', 'C-10.group_bodyless', { only: ['C-10'] });
});

test('C-11: отказ в начале фразы внутри кнопки; «паспорт» — не отказ', async () => {
  const mid = `-> a
=== a ===
поможешь? #from:ann
* [Это странно. Я пас]
  -> b
* [Помогу]
  -> b
=== b ===
ну и вот
-> END`;
  await has(mid, 'C-11.refusal_hops', { only: ['C-11'] });
  await hasNot(mid.replace('Это странно. Я пас', 'Паспорт у тебя?'), 'C-11.refusal_hops', { only: ['C-11'] });
});

test('C-11: незамеченное молчание, отказ без следа, наказанное молчание', async () => {
  const silent = `-> a
=== a ===
ты там? #from:ann
* [Промолчать #silent]
* [да]
  отлично
- -> b
=== b ===
пойдёшь? #from:ann
* [Нет, не пойду]
  -> c
* [Пойду]
  -> c
=== c ===
ну и вот
-> END`;
  const res = await has(silent, 'C-11.silent_unnoticed_share', { only: ['C-11'] });
  assert.ok(keys(res).includes('C-11.refusal_hops'));
  await hasNot(silent.replace('* [Промолчать #silent]', '* [Промолчать #silent]\n  ну молчи'), 'C-11.silent_unnoticed_share', { only: ['C-11'] });
  const punished = `-> a
=== a ===
ответишь? #from:ann
* [Промолчать #silent] -> END
* [да] -> b
=== b ===
дальше #from:ann
* [ок] -> END
* [ага] -> END`;
  await has(punished, 'C-11.silent_punished', { only: ['C-11'] });
  // «Промолчать» с одним переходом туда же, куда соседняя кнопка, — тоже без следа (просьба T-13 п. 2)
  const same = '-> a\n=== a ===\nты там? #from:ann\n* [Промолчать #silent]\n  -> b\n* [да]\n  -> b\n=== b ===\nну вот\n-> END';
  await has(same, 'C-11.silent_unnoticed_share', { only: ['C-11'] });
  await hasNot(same.replace('* [Промолчать #silent]\n  -> b', '* [Промолчать #silent]\n  -> c'), 'C-11.silent_unnoticed_share', { only: ['C-11'] });
});

test('C-12: пять кнопок к одному адресату, хаб адресатов, одиночки подряд', async () => {
  const wide = `-> a\n=== a ===\nкто? #from:ann\n${['раз', 'два', 'три', 'четыре', 'пять'].map((t) => `* [${t} #to:ann] -> END`).join('\n')}`;
  await has(wide, 'C-12.wide', { only: ['C-12'] });
  const hub = `-> a\n=== a ===\nкому? #from:ann\n${['ann', 'bob', 'cid', 'dan', 'eve'].map((t) => `* [${t} #to:${t}] -> END`).join('\n')}`;
  await has(hub, 'C-12.hub_max', { only: ['C-12'] });
  await hasNot(hub, 'C-12.wide', { only: ['C-12'] });
  const singles = `-> a\n=== a ===\nраз #from:ann\n* [дальше]\n- два\n* [дальше]\n- три\n* [дальше]\n- -> END`;
  await has(singles, 'C-12.single_streak', { only: ['C-12'] });
  await hasNot(singles.replace(/\* \[дальше\]/g, '* [да]\n* [нет]'), 'C-12.single', { only: ['C-12'] });
});

// ───────── начало

test('C-20: первая кнопка на восьмом сообщении; глава с пустым входом', async () => {
  const start = (n) => `-> a\n=== a ===\n#from:ann\n${lines(n)}\n* [да] -> END\n* [нет] -> END`;
  await has(start(8), 'C-20.start_msgs', { only: ['C-20'] });
  await hasNot(start(3), 'C-20.start_msgs', { only: ['C-20'] });
  const empty = `-> a\n=== a ===\nпривет #from:ann\n* [да]\n* [нет]\n- -> b\n=== b ===\nГлава 2 #sys #chapter\nпервая #delay:8m\nвторая #delay:8m\n* [да] -> END\n* [нет] -> END`;
  await has(empty, 'C-20.chapter_empty_s', { only: ['C-20'] });
});

test('C-21: два собеседника до первой кнопки, пять новых контактов в главе 1', async () => {
  const src = `-> a\n=== a ===\nпривет #from:ann\nи я #from:bob\n* [вы кто?] -> b\n* [пока] -> b\n=== b ===\nя #from:cid\nи я #from:dan\nи я тоже #from:eve\n* [ого] -> END\n* [ну] -> END`;
  const res = await has(src, 'C-21.from_before_first', { only: ['C-21'] });
  assert.ok(keys(res).includes('C-21.new_ch1'));
  await hasNot(src.replace('и я #from:bob', 'и я'), 'C-21.from_before_first', { only: ['C-21'] });
});

// ───────── паузы

test('C-26: прощание перед долгой паузой без крючка; вопрос перед паузой — крючок', async () => {
  const bare = `-> a\n=== a ===\nпривет #from:ann\n* [да]\n* [нет]\n- на смене\nтут шумно\nработаю\nок\n#delay:2h\nвернулась\n* [и?] -> END\n* [ну] -> END`;
  const res = await has(bare, 'C-26.closing', { only: ['C-26'] });
  assert.ok(keys(res).includes('C-26.share'));
  await hasNot(bare.replace('ок\n', 'кто открыл дверь склада?\n'), 'C-26.closing', { only: ['C-26'] });
  // срок возвращения — не крючок (A-01), а срок события в мире — крючок
  await has(bare.replace('ок\n', 'напишу утром\n'), 'C-26.share', { only: ['C-26'] });
  await hasNot(bare.replace('ок\n', 'суд в 10:30\n'), 'C-26.share', { only: ['C-26'] });
  // за прощанием «… не в сети» #sys (ST-60): прощание всё равно видно (просьба T-13 п. 1)
  await has(bare.replace('ок\n', 'ок\nАня не в сети #sys:ann\n'), 'C-26.closing', { only: ['C-26'] });
});

test('C-28: после паузы приветствие и стена сообщений до кнопки', async () => {
  const src = `-> a\n=== a ===\nэто кто? #from:ann\n* [я]\n* [не я]\n- #delay:2h\nпривет\n${lines(6, 'новости')}\n* [и?] -> END\n* [ну] -> END`;
  const res = await has(src, 'C-28.pack', { only: ['C-28'] });
  assert.ok(keys(res).includes('C-28.greeting'));
  await hasNot(src.replace('привет\n', 'это ты открыл склад?\n').replace(lines(6, 'новости'), 'вот'), 'C-28.pack', { only: ['C-28'] });
});

test('C-30: три паузы от получаса подряд без кнопки — ошибка; две — предупреждение', async () => {
  const src = (n) => `-> a\n=== a ===\nпривет #from:ann\n* [да]\n* [нет]\n- ${Array.from({ length: n }, (_, i) => `#delay:40m\nновость ${i + 1}`).join('\n')}\n* [и?] -> END\n* [ну] -> END`;
  const res = await has(src(3), 'C-30.streak_error', { only: ['C-30'] });
  assert.equal(res.findings.find((f) => f.key === 'C-30.streak_error').level, 'error');
  await has(src(2), 'C-30.streak_warning', { only: ['C-30'] });
  await hasNot(src(1), 'C-30.streak_warning', { only: ['C-30'] });
});

test('C-31: пауза больше суток, история больше трёх дней, карточка', async () => {
  const src = `-> a\n=== a ===\nпривет #from:ann\n* [да]\n* [нет]\n- #delay:30h\nвернулась\n#delay:23h\nещё\n#delay:23h\nи ещё\n* [ну] -> END\n* [да] -> END`;
  const res = await has(src, 'story.pause.max_h', { only: ['C-31'] });
  assert.equal(res.findings.find((f) => f.key === 'story.pause.max_h').check, 'C-31');
  assert.ok(keys(res).includes('story.length.max_h'));
  assert.ok(keys(res).includes('C-31.card_missing'));
  const ok = `-> a\n=== a ===\nпривет #from:ann\n* [да] -> END\n* [нет] -> END`;
  await hasNot(ok, 'C-31.card_missing', { only: ['C-31'], meta: { minutes: 1, days: 0.0001 } });
  await has(ok, 'story.card.mismatch_ratio', { only: ['C-31'], meta: { minutes: 30, days: 0.0001 } });
});

// ───────── ритм

test('C-34: реплика длиннее 160 знаков — ошибка, длиннее 140 — предупреждение; #photo не меряется', async () => {
  const long = 'а'.repeat(170);
  await has(`-> a\n=== a ===\n${long} #from:ann\n* [да] -> END\n* [нет] -> END`, 'C-34.line_error', { only: ['C-34'] });
  await has(`-> a\n=== a ===\n${'б'.repeat(150)} #from:ann\n* [да] -> END\n* [нет] -> END`, 'C-34.line_warning', { only: ['C-34'] });
  await hasNot(`-> a\n=== a ===\n${long} #from:ann #photo\n* [да] -> END\n* [нет] -> END`, 'C-34.line_error', { only: ['C-34'] });
});

test('C-35: серия без выбора больше 25 — ошибка; монолог одного #from', async () => {
  const src = `-> a\n=== a ===\nпривет #from:ann\n* [да]\n* [нет]\n- ${lines(30, 'рассказ')}\n* [ого] -> END\n* [ну] -> END`;
  const res = await has(src, 'C-35.series_error', { only: ['C-35'] });
  assert.ok(keys(res).includes('C-35.monologue'));
  await has(src.replace(lines(30, 'рассказ'), lines(10, 'рассказ')), 'C-35.series_ch1', { only: ['C-35'] });
  await hasNot(src.replace(lines(30, 'рассказ'), lines(4, 'рассказ')), 'C-35.series_ch1', { only: ['C-35'] });
});

// ───────── разметка

test('C-53: шапка, неизвестная и прежняя метка, ось без VAR, reveal без VAR, «намеренно» без ID', async () => {
  const src = `// логлайн: курьер находит чужой ключ
// вопрос: вернёт ли он ключ
// ставка: квартира сестры
// оси: trust, ghost
VAR trust = 0
-> a
=== a ===
// крючок: угроза
// погода: снег
// reveal: clue_key
// намеренно: без номера
// намеренно: C-99 нет такой проверки
привет #from:ann
* [верю]
  ~ trust += 1
* [нет]
- -> END`;
  const res = await lint(src, { only: ['C-53'] });
  const msgs = res.findings.map((f) => `${f.key} ${f.message}`).join('\n');
  assert.ok(!keys(res).includes('C-53.header_lines'), 'шапка из 4 строк — без находки');
  assert.match(msgs, /C-53\.unknown_mark .*«крючок».*story-pauses/);
  assert.match(msgs, /C-53\.unknown_mark .*«погода»/);
  assert.match(msgs, /C-53\.axis_var .*«ghost»/);
  assert.match(msgs, /C-53\.reveal_var .*«clue_key»/);
  assert.match(msgs, /C-53\.intent .*без номера проверки/);
  assert.match(msgs, /C-53\.intent .*неизвестная проверка C-99/);
  assert.match(msgs, /C-53\.unmarked_end .*не размечены/);
  const bare = await lint('-> a\n=== a ===\n// Главы: заметка автора\nпривет\n-> END', { only: ['C-53'] });
  assert.ok(keys(bare).includes('C-53.header_lines'));
  assert.ok(!keys(bare).includes('C-53.unknown_mark'), '«Главы:» с заглавной — заметка, а не метка');
  // финал перед общим эпилогом: своего -> END нет, снятую метку видно по распределителю (просьба T-13 п. 3)
  const epi = (mark) => `-> a\n=== a ===\nкуда? #from:ann\n* [туда] -> fin_a\n* [сюда] -> fin_b\n// финал: А\n=== fin_a ===\nтам #from:ann\n-> epilogue\n${mark}=== fin_b ===\nтут #from:ann\n-> epilogue\n=== epilogue ===\nконец #from:ann\n-> END`;
  const unmarked = await lint(epi(''), { only: ['C-53'] });
  assert.ok(unmarked.findings.some((f) => f.key === 'C-53.unmarked_end' && f.node === 'fin_b'), 'fin_b без метки');
  assert.ok(!unmarked.findings.some((f) => f.node === 'epilogue'), 'общий эпилог — не финал');
  await hasNot(epi('// финал: Б\n'), 'C-53.unmarked_end', { only: ['C-53'] });
});

// ───────── подавление и режимы

test('«// намеренно: C-NN причина» над узлом гасит находку в узле, на всю историю — до первого узла', async () => {
  const dead = 'VAR x = 0\n-> a\n// намеренно: C-01 прочитаем во второй главе\n=== a ===\nвыбирай #from:ann\n* [один]\n  ~ x = 1\n  -> END\n* [два]\n  -> END';
  const res = await lint(dead, { only: ['C-01'] });
  assert.equal(res.findings.length, 0);
  assert.equal(res.suppressed.length, 1);
  assert.equal(res.suppressed[0].suppressed, 'прочитаем во второй главе');
  const other = await lint(dead.replace('C-01', 'C-03'), { only: ['C-01'] });
  assert.equal(other.findings.length, 1, 'метка другой проверки не гасит');
  const story = `// намеренно: C-21 толпа в начале — замысел\n-> a\n=== a ===\nпривет #from:ann\nи я #from:bob\n* [да] -> END\n* [нет] -> END`;
  const sres = await lint(story, { only: ['C-21'] });
  assert.ok(!keys(sres).includes('C-21.from_before_first'));
});

test('--partial: без beta_stop — ошибка; с ним пропускает проверки, которым нужна вся история', async () => {
  const src = 'VAR x = 0\n-> a\n=== a ===\nпривет #from:ann\n* [да]\n  ~ x = 1\n* [нет]\n- -> beta_stop\n=== beta_stop ===\nПродолжение следует #sys\n-> END';
  const res = await lint(src, { partial: true });
  assert.ok(!keys(res).includes('C-01.dead'), 'чтение x может быть в следующих главах');
  assert.ok(res.skipped.some((s) => s.check === 'C-01'));
  const none = await lint(src.replace(/beta_stop/g, 'stop'), { partial: true });
  assert.equal(none.findings[0].check, 'partial');
});

test('--plan: только проверки структуры', async () => {
  const res = await lint(`-> a\n=== a ===\n${'а'.repeat(170)} #from:ann\n* [да] -> END\n* [нет] -> END`, { plan: true });
  assert.ok(!keys(res).includes('C-34.line_error'));
  assert.ok(res.skipped.some((s) => s.check === 'C-34'));
});

test('ошибка компиляции — находка, а не падение', async () => {
  const res = await lint('-> nowhere\n=== a ===\nпривет\n-> END');
  assert.equal(res.findings[0].check, 'compile');
  assert.equal(res.findings[0].level, 'error');
});

// ───────── командная строка

const tmp = mkdtempSync(join(tmpdir(), 'lint-'));
const cli = (...args) => spawnSync(process.execPath, [join(ROOT, 'scripts/lint/lint.mjs'), ...args], { encoding: 'utf8', cwd: ROOT });

test('CLI: --strict даёт код 1 при ошибке, без него — 0; --json; --only; неизвестный флаг', () => {
  const file = join(tmp, 'broken.ink');
  writeFileSync(file, 'VAR x = 0\n-> a\n=== a ===\nпривет #from:ann\n* [да]\n  ~ x = 1\n  -> END\n* [нет]\n  -> END');
  const plain = cli(file, '--runs', '10');
  assert.equal(plain.status, 0, plain.stderr);
  assert.match(plain.stdout, /ошибка · C-01 · a \(гл\. 1\) · /);
  assert.equal(cli(file, '--runs', '10', '--strict').status, 1);
  const json = JSON.parse(cli(file, '--runs', '10', '--json', '--only', 'C-01,C-34').stdout);
  assert.ok(json.stories[0].findings.every((f) => ['C-01', 'C-34'].includes(f.check)));
  assert.equal(json.ok, false);
  assert.equal(cli(file, '--wat').status, 2);
  assert.equal(cli(file, '--only', 'C-77').status, 2);
  assert.equal(cli('--help').status, 0);
});

test('CLI: --summary и --transcript N', () => {
  const file = join(tmp, 'tr.ink');
  writeFileSync(file, '-> a\n=== a ===\nпривет #from:ann\n* [да] -> END\n* [нет] -> END');
  const sum = cli(file, '--runs', '10', '--summary');
  assert.equal(sum.status, 0, sum.stderr);
  assert.match(sum.stdout, /по проверкам:/);
  const out = join(tmp, 'tr');
  const tr = cli(file, '--runs', '10', '--transcript', '2', '--out', out);
  assert.equal(tr.status, 0, tr.stderr);
  const files = readdirSync(join(out, 'tr'));
  assert.equal(files.length, 2);
  assert.match(readFileSync(join(out, 'tr', files[0]), 'utf8'), /\*\*ann:\*\* привет/);
});

test('CLI: --plan путь, --changed --quick', () => {
  const sk = join(tmp, 'skeleton.ink');
  writeFileSync(sk, '-> a\n=== a ===\nсцена 1 #from:ann\n* [да] -> END\n* [нет] -> END');
  const plan = cli('--plan', sk, '--runs', '10');
  assert.equal(plan.status, 0, plan.stderr);
  assert.match(plan.stdout, /\[plan\]/);
  const changed = cli('--changed', '--quick', '--json');
  assert.equal(changed.status, 0, changed.stderr);
  assert.ok(Array.isArray(JSON.parse(changed.stdout).stories));
});

test('три истории каталога проходят без падения (--quick)', async () => {
  for (const p of listStories(join(ROOT, 'src/stories'))) {
    const res = await lintStory(loadStory(p), T, { checks, runs: T.value('lint.runs.quick') });
    assert.ok(!res.findings.some((f) => f.check === 'compile'), `${p}: не скомпилировалась`);
    for (const f of res.findings) assert.ok(f.threshold && f.key, `${p}: находка без порога: ${f.message}`);
  }
});

wave2(test, { has, hasNot, lint, keys });

// развилка с вопросом, кнопками, #silent и напоминаниями; rest — что стоит после напоминаний
const remind = (reminders, rest = '') => [
  '-> a', '=== a ===', 'звонить хозяину? #from:ann', '- (ask)',
  '* [Звони] -> b', '* [Не надо] -> b', '* [Промолчать #silent]', '  ладно, сама', '  -> b',
  ...reminders.flatMap((r) => [`* [#remind:${r[0]}] ${r[1]}`, '  -> ask']),
  rest,
  '=== b ===', 'хорошо #from:ann', '* [ок] -> END', '* [нет] -> END',
].join('\n');

test('C-32 п. 6: три напоминания, дословный повтор, напоминание без продолжения — ошибка; два разных — нет', async () => {
  const two = [['2h', 'алё, ты тут?'], ['1h', 'мне нужно да или нет, я у двери']];
  await hasNot(remind(two), 'story.reminders.max', { only: ['C-32'] });
  const three = await has(remind([...two, ['1h', 'последний раз спрашиваю']]), 'story.reminders.max', { only: ['C-32'] });
  assert.ok(three.findings.some((f) => /3 напоминания подряд/.test(f.message) && f.level === 'error'));
  const same = await has(remind([['2h', 'алё, ты тут?'], ['1h', 'алё, ты тут?']]), 'story.reminders.max', { only: ['C-32'] });
  assert.ok(same.findings.some((f) => /дословно/.test(f.message)));
  // петля вернулась к вопросу, а не к кнопкам: вопрос печатается ещё раз
  const loop = ['-> a', '=== a ===', '- (top) звонить хозяину? #from:ann', '* [Звони] -> END', '* [Промолчать #silent] -> END', '* [#remind:1h] алё?', '  -> top'].join('\n');
  const looped = await has(loop, 'story.reminders.max', { only: ['C-32'] });
  assert.ok(looped.findings.some((f) => /звонить хозяину/.test(f.message)));
  // ни #silent, ни #noanswer: после напоминания история стоит
  const dead = ['-> a', '=== a ===', 'звонить? #from:ann', '- (ask)', '* [Звони] -> END', '* [Нет] -> END', '* [#remind:20m] алё, ты тут?', '  -> ask'].join('\n');
  const stuck = await has(dead, 'story.reminders.max', { only: ['C-32'] });
  assert.ok(stuck.findings.some((f) => /история стоит/.test(f.message)));
  await hasNot(`${dead}\n* [#noanswer]\n  ладно, без тебя\n  -> END`, 'story.reminders.max', { only: ['C-32'] });
});

test('C-32 п. 7: «не ответил» закрывает вариант или финал, которые остаются у #silent; упрёк неотвечающему', async () => {
  const src = (noanswer) => [
    'VAR door = false', '-> a', '=== a ===', 'звонить хозяину? #from:ann', '- (ask)',
    '* [Звони] -> b', '* [Промолчать #silent]', '  ~ door = true', '  ладно, сама', '  -> b',
    '* [#remind:1h] алё, ты тут?', '  -> ask',
    '* [#noanswer]', ...noanswer, '  -> b',
    '=== b ===', 'дальше что? #from:ann', '* [Иди домой] -> END', '* {door} [Открой дверь] -> open',
    '=== open ===', 'открыто #from:ann', '-> END',
  ].join('\n');
  // скрытая ветка без door = true: у «не ответил» нет «Открой дверь», а у #silent есть
  const lost = await has(src(['  ладно, жду']), 'C-32.no_answer', { only: ['C-32'] });
  assert.ok(lost.findings.some((f) => /закрывает «Открой дверь»/.test(f.message) && f.level === 'warning'));
  await hasNot(src(['  ~ door = true', '  ладно, жду']), 'C-32.no_answer', { only: ['C-32'] });
  // упрёк за отсутствие в ветке «не ответил»
  await has(src(['  ~ door = true', '  ты пропал, сколько можно']), 'C-32.no_answer_reproach', { only: ['C-32'] });
});

test('thresholds.json: author_decision и deferred:E-NN проходят схему, кривые — нет', () => {
  const ok = { value: 1, unit: 'ч', level: 'warning', basis: 'author_decision', sources: ['superseded.md A-05'], checks: ['C-31'], calibrated_on: null, history: [{ date: '2026-10-25', task: 'T', change: 'x' }], deferred: 'E-02' };
  assert.deepEqual(validateThresholds({ 'story.x': ok }), []);
  assert.equal(validateThresholds({ 'story.x': { ...ok, deferred: 'E2' } }).length, 1);
  assert.equal(validateThresholds({ 'story.x': { ...ok, basis: 'гадание' } }).length, 1);
  for (const k of ['story.pause.max_h', 'story.length.target_h', 'story.length.max_h', 'story.tail.max_delay_min', 'story.reading.per_day_min']) assert.equal(T.get(k).basis, 'author_decision', k);
  // E-02: синтаксис напоминаний ready — ни один порог больше не ждёт эту фичу
  assert.equal(T.deferred('story.reminders.max'), null);
  assert.ok(T.keys().every((k) => T.deferred(k) !== 'E-02'));
});

// ключ в тексте; имена файлов (`style.md`, `story.ink`) — не ключи
const KEY = /`((?:C-\d\d|story|engine|lint|dict|attn|style|bot|lab|skill)\.(?![\w.]*\.(?:md|json|mjs|ink|ts)`)(?!(?:md|json|mjs|ink|ts)`)[\w.]+)`/g;
const doc = (f) => readFileSync(join(ROOT, f), 'utf8');
const section = (text, from, to) => text.slice(text.indexOf(from), to ? text.indexOf(to, text.indexOf(from)) : undefined);

test('attention-merged.md §6: 65 строк — ключи thresholds.json, в «решении» нет чисел', () => {
  const s6 = section(doc('docs/playbook/attention-merged.md'), '## 6. Пороги нагрузки', '## 7.');
  const rows = s6.split('\n').filter((l) => /^\| `/.test(l));
  assert.equal(rows.length, 65);
  for (const r of rows) {
    const cells = r.split(' | ');
    for (const m of cells[0].matchAll(KEY)) assert.doesNotThrow(() => T.get(m[1]), m[1]);
    assert.ok(!/\d/.test(cells[3].replace(KEY, '').replace(/\b[ARCE]-\d\d\b/g, '')), `число в «решении»: ${cells[3]}`);
  }
  for (const m of doc('docs/playbook/attention-merged.md').matchAll(KEY)) assert.doesNotThrow(() => T.get(m[1]), m[1]);
});

test('style.md, checks.md, rules.md: каждый ключ в тексте существует; у каждой проверки строка «Ключи»', () => {
  for (const f of ['docs/style.md', 'docs/playbook/checks.md', 'docs/playbook/rules.md']) {
    for (const m of doc(f).matchAll(KEY)) assert.doesNotThrow(() => T.get(m[1]), `${f}: ${m[1]}`);
  }
  const s144 = section(doc('docs/style.md'), '### 14.4.', '### 14.5.');
  assert.ok(!/заведёт T-03b/.test(s144), 'в §14.4 остался ключ «заведёт»');
  const checksMd = doc('docs/playbook/checks.md');
  for (const id of [...checksMd.matchAll(/^### (C-\d\d)\./gm)].map((m) => m[1])) {
    const sec = section(checksMd, `### ${id}.`, '\n### ');
    for (const k of T.keys().filter((x) => x.startsWith(`${id}.`))) assert.ok(sec.includes(`\`${k}\``), `${id}: ключа ${k} нет в строке «Ключи»`);
  }
  const rules = doc('docs/playbook/rules.md');
  for (const k of ['story.length.target_h', 'story.length.max_h', 'story.pause.max_h', 'story.tail.max_delay_min', 'story.reminders.max', 'story.sleep_morning.min_h', 'engine.click.time_jump_label']) assert.ok(rules.includes(`\`${k}\``), `rules.md: ${k}`);
});

test('у каждой проверки C-01…C-54 из checks.md есть модуль и хотя бы один ключ', () => {
  const ids = [...readFileSync(join(ROOT, 'docs/playbook/checks.md'), 'utf8').matchAll(/^### (C-\d\d)\./gm)].map((m) => m[1]);
  const have = new Set(checks.map((c) => c.id));
  for (const id of ids) {
    assert.ok(have.has(id), `нет модуля ${id}`);
    assert.ok(T.keys().some((k) => k.startsWith(`${id}.`) || (T.get(k).checks ?? []).includes(id)), `нет ключа у ${id}`);
  }
});

test('--summary: счётчики по проверкам, не длиннее skill.hook.max_output_chars', async () => {
  const res = await lintStory(loadStory(listStories(join(ROOT, 'src/stories'))[0]), T, { checks, runs: 20 });
  const text = formatSummary([res], T);
  assert.ok(text.length <= T.value('skill.hook.max_output_chars'));
  assert.match(text, /по проверкам: C-\d\d/);
  const tiny = loadThresholds({ ...T.all, 'skill.hook.max_output_chars': { ...T.get('skill.hook.max_output_chars'), value: 300 } });
  assert.ok(formatSummary([res], tiny).length <= 300, 'сводка обрезается по лимиту');
});

// ───────── прогон

const results = [];
for (const t of tests) {
  if (only && !t.name.includes(only)) continue;
  try {
    await t.fn();
    results.push({ name: t.name, ok: true });
  } catch (e) {
    results.push({ name: t.name, ok: false, error: e.message });
  }
}
rmSync(tmp, { recursive: true, force: true });
const failed = results.filter((r) => !r.ok);
if (asJson) console.log(JSON.stringify({ ok: !failed.length, results }, null, 2));
else {
  for (const r of results) console.log(`${r.ok ? '✓' : '✗'} ${r.name}${r.ok ? '' : `\n    ${r.error.split('\n').join('\n    ')}`}`);
  console.log(`\n${results.length - failed.length} из ${results.length} тестов прошли`);
}
process.exitCode = failed.length ? 1 : 0;
