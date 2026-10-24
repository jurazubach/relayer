// Самопроверка команд story:*: синтетические истории из fixtures/ и три истории каталога.
// Запуск: npm run test:story-cmd [-- --json] [-- --only <подстрока>]
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Story } from '../lib/compile.mjs';
import { PERSONA_IDS } from './core/personas.mjs';
import { prepare, readSave, runOnce } from './core/run.mjs';
import { sessions } from './core/sessions.mjs';
import { gapTime, typingTime } from './core/timeline.mjs';
import { threshold, thresholdEntry } from './core/thresholds.mjs';
import { varIndex } from './core/vars-index.mjs';

const HELP = `npm run test:story-cmd [-- --json] [-- --only <подстрока>]

Самопроверка story:trace, story:vars, story:sessions, story:cast, story:endings:
синтетические истории scripts/story/fixtures/*.ink (каждая деталь там — под проверку)
и три истории src/stories (персоны доходят до конца, финалы находятся, --json читается).

  --json         результаты одним JSON в stdout
  --only <текст> только тесты, в названии которых есть текст
  --help         эта справка`;

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) { console.log(HELP); process.exit(0); }
const asJson = argv.includes('--json');
const onlyAt = argv.indexOf('--only');
const only = onlyAt >= 0 ? argv[onlyAt + 1] : null;

const HERE = dirname(fileURLToPath(import.meta.url));
const PROBE = join(HERE, 'fixtures/probe.ink');
const PARTIAL = join(HERE, 'fixtures/partial.ink');
const CATALOG = ['the-number', 'slepoe-pyatno', 'chuzhoy-golos'];

const tests = [];
const test = (name, fn) => tests.push({ name, fn });
const cmd = (name, args) => {
  const r = spawnSync(process.execPath, [join(HERE, `${name}.mjs`), ...args], { encoding: 'utf8', maxBuffer: 1 << 28 });
  return { code: r.status, out: r.stdout, err: r.stderr };
};
const cmdJson = (name, args) => {
  const r = cmd(name, [...args, '--json']);
  assert.equal(r.code, 0, `${name} ${args.join(' ')}: код ${r.code}\n${r.err}`);
  return JSON.parse(r.out);
};
const probe = prepare(PROBE);
const lines = (r) => r.timeline.items.filter((i) => i.type === 'line');

// ───────── пороги и формулы

test('пороги: каждый ключ из кода есть в thresholds.json или запасном файле', () => {
  const keys = new Set();
  const walkDir = (d) => {
    for (const f of readdirSync(d, { withFileTypes: true })) {
      if (f.isDirectory()) walkDir(join(d, f.name));
      else if (f.name.endsWith('.mjs') && f.name !== 'selftest.mjs') for (const m of readFileSync(join(d, f.name), 'utf8').matchAll(/threshold(?:Entry)?\('([^']+)'\)/g)) keys.add(m[1]);
    }
  };
  walkDir(HERE);
  assert.ok(keys.size >= 15, `ключей мало: ${keys.size}`);
  for (const k of keys) assert.equal(typeof thresholdEntry(k).value, 'number', k);
  assert.throws(() => threshold('нет.такого'), /нет порога/);
});

test('время: набор и зазор по формулам engine.ts', () => {
  assert.equal(typingTime('sys', 'x'), 0);
  assert.equal(typingTime('me', 'длинный текст'), 0);
  assert.equal(typingTime('photo', ''), 2.6);
  assert.equal(typingTime('in', 'а'), 1.1);
  assert.equal(typingTime('in', 'x'.repeat(200)), 5);
  assert.equal(gapTime('sys', 'x', true), 0.7);
  assert.ok(gapTime('in', 'привет', true) - gapTime('in', 'привет', false) > 1.19);
});

// ───────── trace

test('trace: одна и та же персона и seed — одно и то же прохождение', () => {
  for (const persona of PERSONA_IDS) {
    const a = runOnce(probe, { persona, seed: 5 });
    const b = runOnce(probe, { persona, seed: 5 });
    assert.deepEqual(a.route, b.route, persona);
    assert.deepEqual(lines(a).map((l) => l.text), lines(b).map((l) => l.text), persona);
  }
});

test('trace: маршрут из шапки воспроизводит прохождение другой персоной', () => {
  const p = prepare('the-number');
  const a = runOnce(p, { persona: 'random', seed: 11 });
  const b = runOnce(p, { persona: 'first', route: a.route });
  assert.deepEqual(b.route, a.route);
  assert.deepEqual(lines(b).map((l) => l.text), lines(a).map((l) => l.text));
  assert.equal(b.ending.name, a.ending.name);
});

test('trace: все персоны доходят до конца на синтетике и трёх историях', () => {
  for (const ref of [PROBE, ...CATALOG]) {
    const p = ref === PROBE ? probe : prepare(ref);
    for (const persona of PERSONA_IDS) {
      const r = runOnce(p, { persona, seed: 3 });
      assert.ok(r.ended, `${ref} · ${persona}: застрял в ${r.ending.node}`);
    }
  }
});

test('trace: реальное время и «по клику» на синтетике', () => {
  const r = runOnce(probe, { persona: 'first' });
  const t = r.timeline.totals;
  // 6 ч + три паузы по 40 мин + 20 мин хвоста, плюс набор
  const pauses = 6 * 3600 + 3 * 40 * 60 + 20 * 60;
  assert.ok(t.real > pauses && t.real < pauses + 300, `реальное ${t.real}`);
  assert.ok(t.click < 300, `по клику ${t.click}`);
  const jump = lines(r).find((l) => l.jump);
  assert.equal(jump?.text, 'Глава 2 · Утро', 'скачок 6 ч получает метку «спустя»');
  assert.equal(jump.clickDelay, 0);
  assert.equal(t.tail.delay, 20 * 60);
  assert.equal(r.ending.name, 'тёплый');
});

test('trace: главы по узлам и переменные по ходу', () => {
  const r = runOnce(probe, { persona: 'first' });
  const ch = lines(r).filter((l) => l.isChapter).map((l) => l.chapter);
  assert.deepEqual(ch, [1, 2]);
  const v = r.timeline.items.filter((i) => i.type === 'var' && i.name === 'trust').map((i) => i.value);
  assert.deepEqual(v, [1, 2, 3]);
  assert.equal(r.initial.trust, 0);
  assert.equal(r.vars.trust, 3);
});

test('trace: --start и --set', () => {
  const r = runOnce(probe, { persona: 'first', start: 'ch2', set: { mood: 'злое', trust: 5 } });
  assert.equal(lines(r)[0].text, 'Глава 2 · Утро');
  assert.ok(lines(r).some((l) => l.text === 'доброе. настроение злое'));
  assert.equal(r.vars.trust, 7);
  assert.throws(() => runOnce(probe, { start: 'нет_узла' }), /нет узла/);
  assert.throws(() => runOnce(probe, { set: { nope: 1 } }), /нет переменной/);
});

test('trace: --from-save — сохранение движка и маршрут из --json', () => {
  const dir = mkdtempSync(join(tmpdir(), 'story-cmd-'));
  try {
    const s = new Story(probe.built.json);
    while (s.canContinue) s.Continue();
    s.ChooseChoiceIndex(2); // промолчать
    const file = join(dir, 'save.json');
    writeFileSync(file, JSON.stringify({ [`relay:${probe.story.id}`]: JSON.stringify({ v: 2, storyId: probe.story.id, storyState: s.state.toJson() }) }));
    const r = runOnce(probe, { persona: 'first', save: readSave(file, probe.story.id) });
    assert.equal(lines(r)[0].text, 'ну ладно');
    assert.equal(r.vars.mood, 'тихое');

    const traced = cmdJson('trace', ['--story', PROBE, '--persona', 'last']);
    const tf = join(dir, 'trace.json');
    writeFileSync(tf, JSON.stringify(traced));
    const again = runOnce(probe, { persona: 'first', save: readSave(tf, probe.story.id) });
    assert.deepEqual(again.route, traced.stories[0].runs[0].route);
    assert.throws(() => { writeFileSync(tf, '{"x":1}'); readSave(tf, 'probe'); }, /не похоже/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('trace: --visible — только то, что видит игрок', () => {
  const r = cmd('trace', ['--story', PROBE, '--persona', 'first', '--visible']);
  assert.equal(r.code, 0, r.err);
  for (const bad of ['#', '~', 'ch2', 'finale', 'trust', 'гл.']) assert.ok(!r.out.includes(bad), `в видимой переписке есть «${bad}»`);
  assert.ok(r.out.includes('— чат: Анна'));
  assert.ok(r.out.includes('Вы: Да, я тут.'));
  assert.ok(r.out.includes('… тишина 6 ч …'));
  const click = cmd('trace', ['--story', PROBE, '--persona', 'last', '--visible', '--mode', 'click']);
  assert.ok(click.out.includes('· спустя 6 ч ·') && !click.out.includes('тишина'));
  assert.ok(click.out.includes('(вы промолчали)'));
  const j = cmdJson('trace', ['--story', PROBE, '--visible']);
  assert.ok(!JSON.stringify(j.stories[0].runs[0].items).includes('"knot"'));
});

test('trace: отвлечённый уходит на длинной паузе и возвращается к пачке', () => {
  const r = runOnce(probe, { persona: 'distracted', seed: 1 });
  const b = r.timeline.batches;
  assert.equal(b.length, 1, 'на 6 ч ушёл, паузы по 40 мин — та же отлучка');
  assert.ok(b[0].lines >= 25 && b[0].notices === 4, JSON.stringify(b[0]));
  assert.ok(b[0].span > 8 * 3600 - 60);
  assert.equal(runOnce(probe, { persona: 'random', seed: 1 }).timeline.batches.length, 0);
});

test('trace: неотвечающий идёт по #silent, без него — история стоит', () => {
  const r = runOnce(probe, { persona: 'unresponsive' });
  assert.equal(r.route[0], 2, 'первая развилка — #silent');
  assert.deepEqual(r.stalls.map((s) => s.knot), ['ch2', 'ch2']);
});

test('trace: --compare silent — исходы, развилки без #silent, упрёк за отсутствие', () => {
  const j = cmdJson('trace', ['--story', PROBE, '--compare', 'silent']);
  const c = j.stories[0].runs[0];
  assert.equal(c.pairs.length, 1);
  assert.ok(c.pairs[0].ok && c.pairs[0].sameEnding);
  assert.deepEqual(c.stalls, [{ knot: 'ch2', n: 2 }]);
  assert.equal(c.reproach[0]?.text, 'наконец-то, ты долго');
  assert.equal(c.ok, false);
  const tn = cmdJson('trace', ['--story', 'the-number', '--compare', 'silent']);
  assert.ok(tn.stories[0].runs[0].pairs.length > 0);
});

test('trace: --partial — beta_stop законный конец; без узла — ошибка', () => {
  const p = prepare(PARTIAL);
  const r = runOnce(p, { persona: 'first', partial: true });
  assert.equal(r.ending.kind, 'partial');
  const bad = cmd('trace', ['--story', PROBE, '--partial']);
  assert.equal(bad.code, 2);
  assert.match(bad.err, /beta_stop/);
});

// ───────── vars

test('vars: мёртвая, невидимая, не пишется, чтение через функцию', () => {
  const idx = varIndex(probe.tree);
  const v = (n) => idx.byName.get(n);
  assert.deepEqual(v('dead').flags, ['мёртвая']);
  assert.ok(v('hidden').flags.includes('невидимая'));
  assert.ok(v('never').flags.includes('не пишется'));
  assert.ok(v('trust').reads.some((r) => r.via === 'warm' && r.node === 'finale' && r.kind === 'реплика'));
  assert.equal(v('trust').writes.length, 4);
  assert.ok(v('mood').reads.some((r) => r.kind === 'текст'));
  assert.ok(idx.final.has('finale') && idx.final.has('cold'));
});

test('vars: the-number сходится с подсчётом по исходнику', () => {
  const p = prepare('the-number');
  const idx = varIndex(p.tree);
  const ink = p.story.ink;
  for (const v of idx.vars) {
    const re = new RegExp(`~\\s*${v.name}\\s*(\\+=|-=|=(?!=)|\\+\\+|--)`, 'g');
    assert.equal(v.writes.length, (ink.match(re) ?? []).length, v.name);
  }
  assert.ok(idx.byName.get('theo_trust').flags.includes('только финал'));
});

test('vars: однострочное «{x: -> a}» — скрытая проверка, а не текст', () => {
  const idx = varIndex(prepare('slepoe-pyatno').tree);
  assert.ok(idx.distributors.has('ch5'));
  assert.ok(idx.byName.get('ending').reads.filter((r) => r.node === 'ch5').every((r) => r.kind === 'переход'));
});

// ───────── sessions

test('sessions: сессии, микросессии, хвост на синтетике', () => {
  const r = runOnce(probe, { persona: 'first' });
  const s = sessions(r.timeline);
  assert.equal(s.length, 5);
  assert.deepEqual(s.map((x) => x.label), ['', '', 'микро', 'микро', '']);
  assert.equal(s[1].pauseBefore, 6 * 3600);
  const j = cmdJson('sessions', ['--story', PROBE, '--runs', '5']);
  const st = j.stories[0];
  const pr = st.problems.random.join('\n');
  assert.match(pr, /после последней кнопки/);
  assert.match(pr, /микросессий/);
  assert.match(pr, /нет days/);
  assert.equal(st.personas[0].middle.jumps.length, 1);
});

test('sessions: три истории — время по клику меньше реального, моменты без часов игрока', () => {
  for (const id of CATALOG) {
    const j = cmdJson('sessions', ['--story', id, '--runs', '3']);
    const s = j.stories[0].personas[0];
    assert.ok(s.click.median < s.real.median, id);
    // в «Слепом пятне» пауз от sessions.gap нет совсем: вся история — одна сессия
    assert.ok(s.middle.sessions.length > (id === 'slepoe-pyatno' ? 0 : 1), id);
  }
  const txt = cmd('sessions', ['--story', 'the-number', '--runs', '2']).out;
  assert.match(txt, /день 1, \+/);
  assert.ok(!/\d\d:\d\d(?!:)/.test(txt.split('\n').filter((l) => /день \d/.test(l)).map((l) => l.replace(/«.*?»|\S+…/g, '')).join('\n')), 'нет часов вида 23:00');
});

// ───────── cast

test('cast: уровни на синтетике', () => {
  const j = cmdJson('cast', ['--story', PROBE, '--runs', '3']);
  const lv = Object.fromEntries(j.stories[0].cast.map((c) => [c.id, c.level]));
  assert.deepEqual(lv, { bob: 'источник', ann: 'ось', bank: 'эпизодический' });
  const ann = j.stories[0].cast.find((c) => c.id === 'ann');
  assert.equal(ann.first, 1);
  assert.deepEqual(ann.chapters, [1, 2]);
  assert.equal(ann.buttons, 7);
  assert.ok(ann.played.share === 1);
});

test('cast: у трёх историй есть главный контакт с уровнем «ось»', () => {
  for (const id of CATALOG) {
    const j = cmdJson('cast', ['--story', id, '--runs', '0']);
    assert.ok(j.stories[0].levels['ось'].length >= 1, id);
  }
});

// ───────── endings

test('endings: три финала по меткам, два в одном узле', () => {
  const j = cmdJson('endings', ['--story', PROBE, '--runs', '20']);
  const e = Object.fromEntries(j.stories[0].endings.map((x) => [x.name, x]));
  assert.deepEqual(Object.keys(e).sort(), ['ровный', 'тёплый', 'холодный']);
  assert.equal(e['тёплый'].byPersona.first, 1);
  assert.equal(e['ровный'].byPersona.last, 1);
  assert.ok(e['холодный'].byPersona.refuse > 0);
  assert.deepEqual(e['холодный'].staticVars, ['hidden']);
  assert.ok(j.stories[0].deciders.some((d) => d.name === 'hidden'));
});

test('endings: финалы трёх историй находятся без меток', () => {
  const want = {
    'the-number': ['new_client'],
    'slepoe-pyatno': ['end_backdoor', 'end_burned', 'end_complicit', 'end_contained', 'end_locked', 'end_phished', 'end_quiet'],
    'chuzhoy-golos': ['fin_herself', 'fin_puppet', 'fin_revenge', 'fin_scapegoat', 'fin_silence', 'fin_truth', 'fin_unproven'],
  };
  for (const [id, names] of Object.entries(want)) {
    const p = prepare(id);
    assert.deepEqual(p.endings.endings.map((e) => e.name).sort(), names, id);
    const j = cmdJson('endings', ['--story', id, '--runs', '10', '--persona', 'random']);
    const got = j.stories[0].endings.filter((x) => x.runs).map((x) => x.name);
    assert.ok(got.every((n) => names.includes(n)), `${id}: ${got}`);
  }
});

test('endings: --partial — beta_stop не финал', () => {
  const j = cmdJson('endings', ['--story', PARTIAL, '--partial', '--runs', '3', '--persona', 'random']);
  assert.deepEqual(j.stories[0].endings.map((x) => x.name), ['(beta_stop)']);
});

// ───────── командная строка

test('cli: у всех команд --help и --json, ошибки — код 2', () => {
  for (const name of ['trace', 'vars', 'sessions', 'cast', 'endings']) {
    const h = cmd(name, ['--help']);
    assert.equal(h.code, 0, name);
    assert.match(h.out, /--json/, name);
    assert.match(h.out, /--story/, name);
    const j = cmdJson(name, ['--story', PROBE, ...(name === 'vars' ? [] : ['--runs', '2'])]);
    assert.equal(j.stories.length, 1, name);
    const bad = cmd(name, ['--story', 'нет-такой-истории']);
    assert.equal(bad.code, 2, name);
    assert.match(bad.err, /не найдена/, name);
  }
  assert.equal(cmd('trace', ['--story', PROBE, '--persona', 'никто']).code, 2);
  assert.equal(cmd('trace', ['--story', PROBE, '--mode', 'fast']).code, 2);
});

test('cli: большой --json не обрезается в трубе', () => {
  const r = cmd('trace', ['--story', 'chuzhoy-golos', '--persona', 'all', '--json']);
  assert.equal(r.code, 0);
  assert.ok(r.out.length > 1 << 17);
  assert.equal(JSON.parse(r.out).stories[0].runs.length, PERSONA_IDS.length);
});

// ───────── прогон

const results = [];
for (const t of tests) {
  if (only && !t.name.includes(only)) continue;
  const started = Date.now();
  try {
    await t.fn();
    results.push({ name: t.name, ok: true, ms: Date.now() - started });
    if (!asJson) console.log(`✓ ${t.name}`);
  } catch (e) {
    results.push({ name: t.name, ok: false, ms: Date.now() - started, error: e.message });
    if (!asJson) console.log(`✗ ${t.name}\n   ${String(e.message).split('\n').join('\n   ')}`);
  }
}
const failed = results.filter((r) => !r.ok).length;
if (asJson) console.log(JSON.stringify({ ok: failed === 0, passed: results.length - failed, failed, results }, null, 2));
else console.log(`\n${results.length - failed} из ${results.length} прошли${failed ? `, упали: ${failed}` : ''}`);
process.exitCode = failed ? 1 : 0;
