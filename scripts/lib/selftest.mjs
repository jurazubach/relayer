// Самопроверка scripts/lib: маленькие синтетические примеры ink и три истории каталога.
// Запуск: npm run test:lib [-- --json] [-- --only <подстрока>]
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { allMarks, findEndings, nodeIds, parseInk, parseDelay, stripComments, tokenize, walk, resolveTarget } from './ink.mjs';
import { compile, formatMessages } from './compile.mjs';
import { NO_ANSWER, choiceRole, noAnswer, play, reminderSeries, seeded, strategies } from './bot.mjs';
import {
  compileInput, glueStory, layoutProblems, listStories, loadStory, packStory, parseStory, sameRuntime, splitInk,
  storyFromJson, unpackStory,
} from './story.mjs';

const HELP = `npm run test:lib [-- --json] [-- --only <подстрока>]

Самопроверка библиотеки разбора: синтетические примеры (комментарии, выборы, условия, туннели,
функции, финалы, компиляция, бот, загрузка папкой) и три истории из src/stories.

  --json         результаты одним JSON в stdout
  --only <текст> только тесты, в названии которых есть текст
  --help         эта справка`;

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) { console.log(HELP); process.exit(0); }
const asJson = argv.includes('--json');
const onlyAt = argv.indexOf('--only');
const only = onlyAt >= 0 ? argv[onlyAt + 1] : null;

const tests = [];
const test = (name, fn) => tests.push({ name, fn });
const items = (src, id) => parseInk(src).knots.find((k) => k.id === id).items;
const ofType = (list, type) => {
  const out = [];
  walk(list, (it) => { if (it.type === type) out.push(it); });
  return out;
};

// ───────── разбор

test('ink: комментарии — токены, ссылки в тексте — не комментарии', () => {
  const src = [
    '// ставка: потерять сестру',
    '// логлайн: курьер получает чужие сообщения',
    '-> start',
    '',
    '// финал: тишина',
    '=== start ===',
    'Смотри https://example.test/x #from:ann',
    'Дальше // reveal: ключ_под_ковриком',
    '/* блочный',
    '   на две строки */',
    'После блока',
    '// намеренно: C-07 так задумано',
    '-> END',
  ].join('\n');
  const t = parseInk(src);
  assert.deepEqual(t.head, { ставка: 'потерять сестру', логлайн: 'курьер получает чужие сообщения' });
  const k = t.knots[0];
  assert.equal(k.ending, 'тишина');
  assert.equal(k.lead.length, 1);
  const msgs = ofType(k.items, 'msg');
  assert.equal(msgs[0].text, 'Смотри https://example.test/x');
  assert.equal(msgs[1].text, 'Дальше');
  assert.equal(msgs[2].text, 'После блока');
  assert.equal(msgs[2].line, 11, 'блочный комментарий не сдвигает номера строк');
  assert.deepEqual(k.marks.map((m) => m.kind), ['финал', 'reveal', 'намеренно']);
  const intent = k.marks.find((m) => m.kind === 'намеренно');
  assert.equal(intent.id, 'C-07');
  assert.equal(intent.reason, 'так задумано');
  const comments = ofType(k.items, 'comment');
  assert.equal(comments.length, 3);
  assert.equal(comments[1].kind, 'block');
  assert.equal(t.comments.length, 6);
  assert.equal(stripComments(k.items).filter((i) => i.type === 'comment').length, 0);
  assert.equal(allMarks(t).length, 3);
  // шапка прямо над первым узлом — всё равно шапка
  const bare = parseInk('// ставка: долг\n// оси: доверие\n=== start ===\nx\n-> END');
  assert.deepEqual(bare.head, { ставка: 'долг', оси: 'доверие' });
  assert.equal(bare.knots[0].marks.length, 0);
});

test('ink: tokenize не путает // в строке после двоеточия', () => {
  const [a, b] = tokenize('a: http://x // хвост\n// весь');
  assert.equal(a.code.trim(), 'a: http://x');
  assert.equal(a.comments[0].text, 'хвост');
  assert.equal(b.code, '');
});

test('ink: функции — не узлы, stitch — узел knot.stitch', () => {
  const t = parseInk('-> a\n=== a ===\nПривет\n-> a.inner\n= inner\nВнутри\n-> END\n=== function twice(x) ===\n~ return x * 2\n=== b(n) ===\n-> END\n');
  assert.deepEqual(nodeIds(t), ['a', 'a.inner', 'b']);
  assert.deepEqual(t.functions.map((f) => [f.id, f.params]), [['twice', ['x']]]);
  assert.deepEqual(t.knots.find((k) => k.id === 'b').params, ['n']);
  assert.equal(resolveTarget('inner', 'a', new Set(nodeIds(t))), 'a.inner');
});

test('ink: выборы — вложенность, условия, текст кнопки, теги, метка, повтор', () => {
  const src = [
    '=== k ===',
    '* (ask) {met} {not angry} Привет[! #to:bob #label:поздороваться], как дела',
    '  ** [Да] -> yes',
    '  ** [Нет]',
    '     ~ mood = mood - 1',
    '  -- сошлись',
    '+ [Ещё раз #silent]',
    '- общий хвост',
    '-> END',
  ].join('\n');
  const list = items(src, 'k');
  const [c1, c2] = list.filter((i) => i.type === 'choice');
  assert.equal(c1.label, 'ask');
  assert.deepEqual(c1.conds, ['met', 'not angry']);
  assert.equal(c1.text, 'Привет!');
  assert.deepEqual(c1.tags, { to: 'bob', label: 'поздороваться' });
  assert.equal(c1.items[0].text, 'Привет, как дела', 'после кнопки выводится текст без скобок');
  const inner = c1.items.filter((i) => i.type === 'choice');
  assert.deepEqual(inner.map((c) => [c.depth, c.text]), [[2, 'Да'], [2, 'Нет']]);
  assert.deepEqual(inner[0].items, [{ type: 'divert', target: 'yes', kind: 'divert' }]);
  assert.equal(inner[1].items[0].type, 'code');
  assert.ok(c1.items.some((i) => i.type === 'gather'), 'сборка второго уровня внутри первого выбора');
  assert.equal(c2.sticky, true);
  assert.ok('silent' in c2.tags);
  assert.equal(list.at(-2).type, 'msg');
  assert.equal(list.at(-2).text, 'общий хвост');
});

test('ink: условия — многострочные, switch, первая ветка из заголовка', () => {
  const src = [
    '=== k ===',
    '{ trust > 2:',
    '  Верю. #from:ann',
    '- else:',
    '  Не верю.',
    '}',
    '{ mood:',
    '- "rage": Злюсь.',
    '- else: Ну ладно.',
    '}',
    '{',
    '- a && b: Оба.',
    '}',
    '-> END',
  ].join('\n');
  const conds = items(src, 'k').filter((i) => i.type === 'cond');
  assert.equal(conds.length, 3);
  assert.deepEqual(conds[0].branches.map((b) => b.cond), ['trust > 2', 'else']);
  assert.equal(conds[0].branches[0].items[0].who, 'ann');
  assert.equal(conds[1].head, 'mood');
  assert.deepEqual(conds[1].branches.map((b) => b.cond), ['"rage"', 'else']);
  assert.equal(conds[1].branches[0].items[0].text, 'Злюсь.');
  assert.deepEqual(conds[2].branches.map((b) => b.cond), ['a && b']);
});

test('ink: однострочное условие с переходом — условная ветка, а не реплика', () => {
  const src = [
    '=== k ===',
    '{x == 1: -> a}',
    '{x: -> a | -> b}',
    '* [Да] {y > 2: -> b}',
    '* [Нет] -> a',
    '- Привет, {x: друг|незнакомец}',
    '{x: просто текст}',
    '=== a ===',
    '-> END',
    '=== b ===',
    '-> END',
  ].join('\n');
  const list = items(src, 'k');
  assert.deepEqual(list[0], { type: 'cond', head: '', branches: [{ type: 'branch', cond: 'x == 1', items: [{ type: 'divert', target: 'a', kind: 'divert' }], speaker: null }], items: null, speaker: null, line: 2 });
  assert.deepEqual(list[1].branches.map((b) => [b.cond, b.items.map((i) => i.target)]), [['x', ['a']], ['else', ['b']]]);
  // под кнопкой — та же условная ветка; на верхнем уровне кнопки переходов без условия нет
  const yes = list.find((i) => i.type === 'choice' && i.text === 'Да');
  assert.deepEqual(yes.items.map((i) => i.type), ['cond']);
  assert.equal(yes.items[0].branches[0].cond, 'y > 2');
  // ни одной «реплики» из условия: строки «{x == 1: }» больше нет
  assert.ok(!ofType(list, 'msg').some((m) => /^\{[^{}]*:\s*\}$/.test(m.text)));
  // подстановка и условный текст без перехода остаются репликами
  assert.deepEqual(ofType(list, 'msg').map((m) => m.text), ['Привет, {x: друг|незнакомец}', '{x: просто текст}']);
  // переходы из веток видны обходу: граф и финалы их находят
  assert.deepEqual(ofType(list, 'divert').map((d) => d.target).sort(), ['a', 'a', 'a', 'b', 'b']);
});

test('ink: переходы, туннели, возврат, ~, склейка', () => {
  const list = items('=== k ===\n~ seen = true\nРаз <> -> side -> back\n=== side ===\nВбок\n->->\n=== back ===\n-> END\n', 'k');
  assert.deepEqual(list[0], { type: 'code', text: 'seen = true' });
  assert.equal(list[1].text, 'Раз');
  assert.deepEqual(list.slice(2), [
    { type: 'divert', target: 'side', kind: 'tunnel' },
    { type: 'divert', target: 'back', kind: 'divert' },
  ]);
  assert.deepEqual(items('=== side ===\nВбок\n->->\n', 'side')[1], { type: 'divert', target: '->->', kind: 'return' });
});

test('ink: говорящий и главы', () => {
  const src = [
    '# contact: ann, Анна, pink',
    '# title: Пример',
    '-> one',
    '=== one ===',
    'Глава первая #chapter',
    'Привет #from:ann',
    'Это всё ещё Анна',
    'Ответ #me:ann',
    'Анна в сети #sys',
    '-> two',
    '=== two ===',
    'Глава вторая #chapter',
    'Никого #delay:5m',
    '-> END',
  ].join('\n');
  const t = parseInk(src);
  assert.deepEqual(t.contacts, { ann: { name: 'Анна', color: 'pink' } });
  assert.deepEqual(t.header, ['title: Пример']);
  assert.equal(t.start, 'one');
  assert.deepEqual(t.chapters, [{ n: 1, title: 'Глава первая', knot: 'one' }, { n: 2, title: 'Глава вторая', knot: 'two' }]);
  const one = t.knots[0].items;
  assert.deepEqual(one.slice(1, 5).map((i) => [i.type, i.who]), [['msg', 'ann'], ['msg', 'ann'], ['me', 'ann'], ['sys', 'ann']]);
  assert.equal(t.knots[1].chapter, 2);
  assert.equal(t.knots[1].items[1].who, null, 'говорящий не переносится в следующий узел');
  assert.equal(parseDelay('5m'), 300);
  assert.equal(parseDelay('1.5h'), 5400);
});

test('ink: финалы — по меткам, без меток — по -> END', () => {
  const noMarks = parseInk('=== a ===\n* [x] -> END\n* [y] -> b\n=== b ===\n-> END\n=== c ===\n-> a\n');
  assert.deepEqual(findEndings(noMarks), {
    source: 'end',
    endings: [{ id: 'a', name: 'a', line: 1 }, { id: 'b', name: 'b', line: 4 }],
    unmarked: [],
  });
  const marked = parseInk('=== hub ===\n{ x: -> good | -> bad }\n// финал: свет\n=== good ===\n-> fin\n=== bad ===\n// финал: тьма\n-> fin\n=== fin ===\n-> END\n');
  const e = findEndings(marked);
  assert.equal(e.source, 'mark');
  assert.deepEqual(e.endings.map((x) => [x.id, x.name]), [['good', 'свет'], ['bad', 'тьма']]);
  assert.deepEqual(e.unmarked, ['fin']);
  // одно END, финалы различаются состоянием — по метке в каждой ветке
  const shared = findEndings(parseInk('=== fin ===\n{ x:\n  // финал: свет\n  Свет.\n- else:\n  // финал: тьма\n  Тьма.\n}\n-> END\n'));
  assert.deepEqual(shared.endings.map((x) => [x.id, x.name, x.line]), [['fin', 'свет', 3], ['fin', 'тьма', 6]]);
  assert.deepEqual(shared.unmarked, []);
});

test('ink: несколько файлов — номера строк и главы по порядку', () => {
  const t = parseInk([
    { name: 'story.ink', text: '# contact: ann, Анна\nINCLUDE ch1.ink\n-> one\n' },
    { name: 'ch1.ink', text: '=== one ===\nГлава #chapter\n-> END\n' },
  ]);
  assert.deepEqual(t.includes.map((i) => i.path), ['ch1.ink']);
  assert.equal(t.knots[0].file, 'ch1.ink');
  assert.equal(t.knots[0].line, 1);
  assert.equal(t.chapters.length, 1);
});

// ───────── компиляция

test('compile: ошибка с файлом, строкой и куском исходника', () => {
  const r = compile({ main: 'story.ink', files: { 'story.ink': 'INCLUDE ch1.ink\n-> a\n', 'ch1.ink': '=== a ===\nПривет\n{ x \n-> END\n' } });
  assert.equal(r.ok, false);
  assert.equal(r.json, null);
  assert.equal(r.errors[0].file, 'ch1.ink');
  assert.equal(r.errors[0].line, 3);
  assert.match(r.errors[0].excerpt, />\s+3 \| \{ x/);
  assert.match(formatMessages(r.errors), /ошибка ch1\.ink:3:/);
  assert.throws(() => r.newStory());
});

test('compile: нет подключённого файла — понятная ошибка, не исключение', () => {
  const r = compile({ main: 'story.ink', files: { 'story.ink': 'INCLUDE nope.ink\n-> END\n' } });
  assert.equal(r.ok, false);
  assert.match(r.errors[0].message, /nope\.ink/);
});

test('compile: удачная сборка и INCLUDE', () => {
  const r = compile({ main: 'story.ink', files: { 'story.ink': 'INCLUDE ch1.ink\n-> a\n', 'ch1.ink': '=== a ===\nПривет\n-> END\n' } });
  assert.equal(r.ok, true, formatMessages(r.errors));
  assert.equal(r.newStory().ContinueMaximally().trim(), 'Привет');
  assert.equal(compile('Строка\n-> END\n').ok, true);
});

// ───────── бот

const BOT_INK = [
  'VAR trust = 0',
  '-> hello',
  '=== hello ===',
  'Ты тут? #from:ann',
  '* [Да]',
  '  ~ trust = trust + 1',
  '  -> wait',
  '* [Нет] -> wait',
  '=== wait ===',
  'Через час #delay:1h',
  '{ trust > 0: Спасибо. }',
  '-> END',
].join('\n');

test('bot: журнал событий — узел, строка, говорящий, теги, пауза, выбор, переменная, конец', () => {
  const { json } = compile(BOT_INK);
  const r = play(json, { strategy: strategies.scripted(['Да']), nodes: ['hello', 'wait'] });
  assert.equal(r.ended, true);
  assert.equal(r.delay, 3600);
  assert.deepEqual(r.choices, ['Да']);
  assert.deepEqual(r.visited, ['hello', 'wait']);
  assert.equal(r.vars.trust, 1);
  const types = new Set(r.events.map((e) => e.type));
  for (const t of ['knot', 'line', 'delay', 'choice', 'var', 'end']) assert.ok(types.has(t), `нет события ${t}`);
  const first = r.events.find((e) => e.type === 'line');
  assert.deepEqual([first.text, first.who, first.tags, first.knot], ['Ты тут?', 'ann', ['from:ann'], 'hello']);
  const v = r.events.find((e) => e.type === 'var');
  assert.deepEqual([v.name, v.prev, v.value], ['trust', 0, 1]);
  assert.ok(r.events.some((e) => e.type === 'line' && e.text === 'Спасибо.'));
  assert.deepEqual(r.events.filter((e) => e.type === 'knot').map((e) => e.id), ['hello', 'wait']);
});

// развилка без реплик (хаб), последняя строка узла перед переходом, строка перед -> END после условия
const NODES_INK = [
  'VAR h = 1',
  '-> start',
  '=== start ===',
  'Привет #from:ann',
  'Последняя в start',
  '-> hub',
  '=== hub ===',
  '* [Север] -> north',
  '* [Юг] -> south',
  '* [Запад] -> west',
  '* [Промолчать #silent] -> north',
  '=== north ===',
  'Холодно -> END',
  '=== south ===',
  '{h > 0: -> cold}',
  'Тепло',
  '-> END',
  '=== cold ===',
  '#delay:5m',
  'Понятно, {h} раз #from:ann',
  '-> END',
  '=== west ===',
  '= a',
  'Ветер',
  '-> END',
].join('\n');

test('bot: узел строки — где выведен её текст, в том числе перед -> END', () => {
  const { json } = compile(NODES_INK);
  const nodes = ['start', 'hub', 'north', 'south', 'cold', 'west', 'west.a'];
  const knotOfLine = (r, text) => r.events.find((e) => e.type === 'line' && e.text === text)?.knot;
  const n = play(json, { strategy: strategies.first(), nodes });
  // после последнего Continue() у inkjs пусты previousPointer и currentPathString — узел не теряется
  assert.equal(knotOfLine(n, 'Холодно'), 'north');
  // inkjs заглядывает вперёд за переходом: previousPointer уже в hub, а строка стоит в start
  assert.equal(knotOfLine(n, 'Последняя в start'), 'start');
  // развилка без реплик — узел точки выбора
  assert.equal(n.events.find((e) => e.type === 'choice').knot, 'hub');
  assert.deepEqual(n.events.filter((e) => e.type === 'knot').map((e) => e.id), ['start', 'hub', 'north']);
  // распределитель без текста и финал входят за один Continue(): строка — в финале, тег #delay — её
  const c = play(json, { strategy: strategies.scripted([1]), nodes });
  assert.equal(knotOfLine(c, 'Понятно, 1 раз'), 'cold');
  assert.equal(c.events.filter((e) => e.type === 'end')[0].knot, 'cold');
  assert.equal(c.delay, 300);
  // knot без текста проваливается в stitch: строка — в stitch
  assert.equal(knotOfLine(play(json, { strategy: strategies.scripted([2]), nodes }), 'Ветер'), 'west.a');
});

// E-02: два напоминания у развилки с #silent, скрытая ветка #noanswer со сроком, напоминание без продолжения
const REMIND_INK = [
  'VAR quiet = false',
  'VAR ignored = false',
  '-> a',
  '=== a ===',
  'звонить? #from:ann',
  '- (ask)',
  '* [Звони] -> b',
  '* [Промолчать #silent]',
  '  ~ quiet = true',
  '  -> b',
  '* [#remind:2h] алё?',
  '  -> ask',
  '* [#remind:1h] мне нужно да или нет',
  '  -> ask',
  '=== b ===',
  'лезть в окно? #from:ann',
  '- (ask)',
  '* [Лезь] -> c',
  '* [#noanswer:30m]',
  '  ~ ignored = true',
  '  ладно, жду',
  '  -> c',
  '=== c ===',
  'тут кто-то есть #from:ann',
  '- (ask)',
  '* [Беги] -> END',
  '* [#remind:10m] ау',
  '  -> ask',
].join('\n');

test('bot: неотвечающий — напоминания, потом #noanswer или #silent; без напоминаний кнопка ждёт', () => {
  const { json } = compile(REMIND_INK);
  const r = play(json, { strategy: strategies.unresponsive() });
  const of = (type) => r.events.filter((e) => e.type === type);
  // напоминания по порядку, со своими интервалами; кнопкой они не показываются
  assert.deepEqual(of('remind').map((e) => [e.n, e.seconds]), [[1, 7200], [2, 3600], [1, 600]]);
  assert.ok(of('choice').every((e) => e.options.every((o) => o.text && !o.tags.some((t) => /^(remind|noanswer)/.test(t)))));
  // после последнего напоминания — #silent того же выбора, ждём столько же, сколько перед последним
  const [a, b] = of('choice');
  assert.equal(a.picked, NO_ANSWER);
  assert.deepEqual(a.noAnswer, { via: 'silent', seconds: 3600, reminders: 2 });
  // скрытая ветка #noanswer со своим сроком, без напоминаний
  assert.deepEqual(b.noAnswer, { via: 'noanswer', seconds: 1800, reminders: 0 });
  assert.ok(r.events.some((e) => e.type === 'line' && e.text === 'ладно, жду'));
  assert.deepEqual([r.vars.quiet, r.vars.ignored], [true, true]);
  // напоминание без продолжения: stall no-target, дальше запасная стратегия
  assert.deepEqual(of('stall').map((e) => [e.reason, e.reminders]), [['no-target', 1]]);
  assert.equal(r.waited, 7200 + 3600 + 3600 + 1800 + 600);
  const series = reminderSeries(r.events);
  assert.deepEqual(series.map((x) => [x.n, x.next]), [[2, 'не ответил'], [1, 'стоит']]);
  assert.deepEqual(series[0].texts, ['алё?', 'мне нужно да или нет']);
  // по клику напоминаний нет: молчание — stall click
  const click = play(json, { strategy: strategies.unresponsive(), mode: 'click' });
  assert.equal(click.events.filter((e) => e.type === 'remind').length, 0);
  assert.ok(click.events.filter((e) => e.type === 'stall').every((e) => e.reason === 'click'));
  // обычные персоны напоминаний не видят и не жмут
  for (let k = 0; k < 20; k++) assert.ok(!play(json, { rng: seeded(k) }).events.some((e) => e.type === 'remind'));
  // маршрут -1 — «не ответил», как его записал неотвечающий
  assert.deepEqual(play(json, { strategy: strategies.scripted([NO_ANSWER, 0, 0]) }).choices, ['Промолчать', 'Лезь', 'Беги']);
  // #silent без напоминаний и без срока: кнопка ждёт, как в движке
  const { json: nodes } = compile(NODES_INK);
  const w = play(nodes, { strategy: strategies.unresponsive(() => 0) });
  assert.equal(w.events.find((e) => e.type === 'stall').reason, 'waits');
  assert.deepEqual(w.choices, ['Север']);
  assert.equal(noAnswer([{ text: 'а', tags: [] }, { text: 'б', tags: ['silent'] }]), 1);
  assert.equal(noAnswer([{ text: 'а', silent: false }, { text: 'б', silent: true }]), 1);
  assert.equal(noAnswer([{ text: 'а', tags: ['silent'] }, { text: '', tags: ['noanswer'] }]), 1);
  assert.equal(noAnswer([{ text: 'а', tags: ['to:ann'] }]), -1);
  assert.deepEqual(['button', 'remind', 'noanswer', 'button'], [[], ['remind:2h'], ['noanswer'], ['noanswer', 'silent']].map((tags) => choiceRole({ tags })));
});

test('ink: напоминание и скрытая ветка «не ответил» — роль варианта в дереве', () => {
  const tree = parseInk(REMIND_INK);
  const roles = [];
  for (const k of tree.knots) walk(k.items, (it) => { if (it.type === 'choice') roles.push([it.role, it.text]); });
  assert.deepEqual(roles, [['button', 'Звони'], ['button', 'Промолчать'], ['remind', ''], ['remind', ''], ['button', 'Лезь'], ['noanswer', ''], ['button', 'Беги'], ['remind', '']]);
});

test('bot: стратегии и повторяемость с seed', () => {
  const { json } = compile(BOT_INK);
  assert.deepEqual(play(json, { strategy: strategies.first() }).choices, ['Да']);
  assert.deepEqual(play(json, { strategy: strategies.last() }).choices, ['Нет']);
  assert.deepEqual(play(json, { strategy: strategies.scripted([1]) }).choices, ['Нет']);
  const runs = (seed) => Array.from({ length: 20 }, ((rng) => () => play(json, { rng, log: false }).choices[0])(seeded(seed)));
  assert.deepEqual(runs(7), runs(7));
  // своя стратегия-персона: смотрит на состояние и выбирает «Нет», если доверие уже есть
  const persona = (choices, ctx) => (ctx.vars.trust > 0 ? 1 : 0);
  assert.deepEqual(play(json, { strategy: persona }).choices, ['Да']);
});

test('bot: бесконечный цикл обрывается пределом шагов', () => {
  const { json } = compile('-> loop\n=== loop ===\nЕщё\n+ [Снова] -> loop\n');
  const r = play(json, { maxSteps: 50 });
  assert.equal(r.ended, false);
  assert.equal(r.events.at(-1).type, 'stuck');
});

test('bot: setup — старт с узла и заданными переменными', () => {
  const { json } = compile(BOT_INK);
  const r = play(json, { setup: (s) => { s.variablesState.$('trust', 5); s.ChoosePathString('wait'); } });
  assert.deepEqual(r.events.filter((e) => e.type === 'line').map((e) => e.text), ['Через час', 'Спасибо.']);
});

// ───────── загрузка историй

/** История из результата splitInk — как её вернул бы loadStory для папки. */
const loadStoryLike = ({ main, files, order }) => ({ id: 'probe', path: 'probe', form: 'folder', meta: {}, main, files, order, ink: files[main] });

test('story: одна история в формах .json, .ink и папкой с INCLUDE', () => {
  const dir = mkdtempSync(join(tmpdir(), 'relayer-lib-'));
  try {
    const ink = '# contact: ann, Анна\nINCLUDE ch1.ink\n-> one\n';
    const ch1 = '=== one ===\nГлава #chapter\nПривет #from:ann\n-> END\n';
    mkdirSync(join(dir, 'demo'));
    writeFileSync(join(dir, 'demo', 'meta.json'), JSON.stringify({ id: 'demo', title: 'Демо' }));
    writeFileSync(join(dir, 'demo', 'story.ink'), ink);
    writeFileSync(join(dir, 'demo', 'ch1.ink'), ch1);
    writeFileSync(join(dir, 'demo.json'), JSON.stringify({ id: 'demo', title: 'Демо (сборка)', ink: ch1 }));
    writeFileSync(join(dir, 'solo.json'), JSON.stringify({ id: 'solo', title: 'Соло', ink: 'Одна строка\n-> END\n' }));
    writeFileSync(join(dir, 'raw.ink'), 'Голый ink\n-> END\n');

    assert.deepEqual(listStories(dir).map((p) => p.split('/').at(-1)), ['demo', 'solo.json'], 'папка вытесняет .json того же id');
    const folder = loadStory('demo', { dir });
    assert.equal(folder.form, 'folder');
    assert.equal(folder.meta.title, 'Демо');
    assert.deepEqual(folder.order, ['story.ink', 'ch1.ink']);
    const built = compile(compileInput(folder));
    assert.equal(built.ok, true, formatMessages(built.errors));
    const tree = parseStory(folder);
    assert.deepEqual(nodeIds(tree), ['one']);
    assert.equal(tree.knots[0].file, 'ch1.ink');

    const solo = loadStory('solo', { dir });
    assert.equal(solo.form, 'json');
    assert.equal(solo.meta.title, 'Соло');
    assert.equal('ink' in solo.meta, false);
    assert.equal(compile(compileInput(solo)).ok, true);

    const raw = loadStory(join(dir, 'raw.ink'));
    assert.equal(raw.form, 'ink');
    assert.equal(raw.id, 'raw');
    assert.throws(() => loadStory('nope', { dir }), /не найдена/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('story: раскладка по главам обратима — склейка байт в байт, играется так же', () => {
  const src = [
    '# title: Проба',
    '# contact: ann, Анна, teal',
    'VAR luck = 0',
    '-> ch1',
    '',
    '// общая функция до первой главы',
    '=== function bump() ===',
    '~ luck++',
    '',
    '=== ch1 ===',
    'Глава 1 · Начало #from:ann #chapter',
    '* [Да]',
    '    ~ bump()',
    '* [Нет]',
    '- -> ch2',
    '',
    '// ============ ГЛАВА 2 ============',
    '// финал: тишина',
    '=== ch2 ===',
    'Глава 2 · Конец #chapter',
    '= tail',
    'хвост {luck}',
    '-> END',
  ].join('\n');
  const split = splitInk(src);
  assert.deepEqual(split.order, ['story.ink', 'common.ink', 'ch01.ink', 'ch02.ink']);
  assert.match(split.files['story.ink'], /^-> ch1\n\nINCLUDE common\.ink\nINCLUDE ch01\.ink\nINCLUDE ch02\.ink\n$/m);
  assert.ok(!/^===/m.test(split.files['story.ink']), 'в главном файле нет узлов');
  assert.ok(split.files['ch02.ink'].startsWith('// ============ ГЛАВА 2'), 'комментарии над узлом уехали с ним');
  assert.ok(split.files['ch02.ink'].includes('= tail'), 'stitch не режет главу');
  const story = { ...loadStoryLike(split), meta: { id: 'probe', title: 'Проба' } };
  assert.equal(glueStory(story), src + '\n');
  assert.deepEqual(layoutProblems(story), []);
  const a = compile(src);
  const b = compile(compileInput(story));
  assert.equal(b.ok, true, formatMessages(b.errors));
  assert.equal(sameRuntime(a.json, b.json), true);
  assert.equal(findEndings(parseStory(story)).endings[0].name, 'тишина');
  // без #chapter делить нечего
  assert.deepEqual(splitInk('Привет\n-> END\n').order, ['story.ink']);
});

test('story: .json от story:pack читается как папка и раскладывается обратно', () => {
  const folder = loadStoryLike(splitInk('VAR x = 1\n-> ch1\n=== ch1 ===\nГлава #chapter\nраз {x}\n-> ch2\n=== ch2 ===\nГлава #chapter\nдва\n-> END\n'));
  folder.meta = { id: 'packed', title: 'Сборка', revision: 2, minutes: 5, days: 1.5 };
  const packed = packStory(folder);
  assert.equal(packed.format, 'relayer-story');
  assert.deepEqual(Object.keys(packed.includes), ['ch01.ink', 'ch02.ink']);
  const back = storyFromJson(JSON.parse(JSON.stringify(packed)), { name: 'packed.story.json' });
  assert.equal(back.id, 'packed');
  assert.deepEqual(back.order, folder.order);
  assert.equal('includes' in back.meta, false);
  assert.equal(compile(compileInput(back)).ok, true);
  assert.deepEqual(unpackStory(back).files, folder.files);
  const flat = packStory(folder, { flat: true });
  assert.equal(flat.includes, undefined);
  assert.equal(sameRuntime(compile(flat.ink).json, compile(compileInput(back)).json), true);
});

test('story: раскладка ловит узел в главном файле, текст до узла в главе и лишний INCLUDE', () => {
  const bad = loadStoryLike({
    main: 'story.ink',
    order: ['story.ink', 'ch01.ink'],
    files: {
      'story.ink': '-> one\n=== zero ===\n-> END\nINCLUDE ch01.ink\n',
      'ch01.ink': 'бродячая строка\nINCLUDE ch02.ink\n=== one ===\n-> END\n',
    },
  });
  const p = layoutProblems(bad).join('\n');
  assert.match(p, /story\.ink:2: узел в главном файле/);
  assert.match(p, /ch01\.ink:1: текст до первого узла/);
  assert.match(p, /ch01\.ink:2: INCLUDE не в главном файле/);
});

// ───────── три истории каталога

for (const path of listStories()) {
  test(`каталог: ${path} — узлы разбора совпадают с узлами компилятора`, () => {
    const story = loadStory(path);
    const built = compile(compileInput(story));
    assert.equal(built.ok, true, formatMessages(built.errors));
    const tree = parseStory(story);
    const ids = nodeIds(tree);
    const compiled = [...built.newStory().mainContentContainer.namedContent.keys()].filter((k) => k !== 'global decl');
    const functions = tree.functions.map((f) => f.id);
    const knots = ids.filter((id) => !id.includes('.'));
    assert.deepEqual([...knots].sort(), compiled.filter((k) => !functions.includes(k)).sort(), 'knot-узлы = содержимое компилятора без функций');
    for (const f of functions) assert.ok(compiled.includes(f), `функция ${f} есть в компиляторе`);
    assert.equal(new Set(ids).size, ids.length, 'id узлов уникальны');
  });

  test(`каталог: ${path} — переходы разрешаются, главы и финалы на месте`, () => {
    const story = loadStory(path);
    const tree = parseStory(story);
    const ids = new Set(nodeIds(tree));
    const functions = new Set(tree.functions.map((f) => f.id));
    for (const k of tree.knots) {
      walk(k.items, (it) => {
        if (it.type !== 'divert' || it.kind === 'return' || it.target === 'END' || it.target === 'DONE') return;
        const head = it.target.split('.')[0];
        assert.ok(resolveTarget(it.target, k.id, ids) || functions.has(head), `${k.id}: переход в неизвестный узел ${it.target}`);
      });
    }
    assert.ok(ids.has(tree.start), 'стартовый узел существует');
    assert.equal(tree.chapters.length, (story.meta.chapters ?? []).length, 'главы #chapter = главы в описании');
    assert.ok(Object.keys(tree.contacts).length > 0, 'контакты из шапки');
    const endings = findEndings(tree);
    assert.ok(endings.endings.length > 0, 'есть хотя бы один финал');
    // каждый строчный комментарий исходника стал токеном
    const raw = Object.values(story.files).join('\n').split('\n').filter((l) => /(^|[^:])\/\//.test(l)).length;
    assert.equal(tree.comments.filter((c) => c.kind === 'line').length, raw);
  });

  test(`каталог: ${path} — бот доходит до конца и посещает узлы`, () => {
    const story = loadStory(path);
    const { json } = compile(compileInput(story));
    const ids = nodeIds(parseStory(story));
    const rng = seeded(42);
    const seen = new Set();
    for (let i = 0; i < 30; i++) {
      const r = play(json, { rng, nodes: ids, trackVars: i === 0 });
      assert.equal(r.ended, true, `прохождение ${i} не закончилось`);
      for (const v of r.visited) seen.add(v);
      if (i === 0) {
        assert.ok(r.events.some((e) => e.type === 'var'), 'переменные меняются по ходу');
        assert.ok(r.events.some((e) => e.type === 'delay'), 'паузы есть');
        assert.ok(r.events.filter((e) => e.type === 'line').every((e) => e.knot === null || ids.includes(e.knot)));
      }
    }
    assert.ok(seen.has(parseStory(story).start));
  });
}

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
