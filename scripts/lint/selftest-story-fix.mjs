// Самопроверка story-fix: своих проверок C-NN у скилла нет (owners.md §1), поэтому здесь — то, на чём держится
// правка: разбор отчёта линзы в находки и варианты А/Б/В (pick.mjs), поиск ink «до» в файлах, страховка «до и
// после» (fix-guard.mjs) на выдуманной истории и указатель приёмов. Подключается из selftest.mjs.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseInk } from '../lib/ink.mjs';

const SKILL = fileURLToPath(new URL('../../.claude/skills/story-fix/', import.meta.url));
const core = () => import(join(SKILL, 'scripts/fix-core.mjs'));

const REPORT = `# Ревью выбора

P1 · непонятно · pier · обе кнопки получают один ответ · оживить кнопку (F-07) · [C-10 · замер · высокая]

Вариант А — свой ответ на каждую кнопку

До:

\`\`\`ink
ты на смене? #from:oleg
* [Да #to:oleg]
\`\`\`

После:

\`\`\`ink
* [Да #to:oleg]
    тогда бегом #from:oleg
* [Ясно #to:oleg]
    ничего тебе не ясно #from:oleg
\`\`\`

**Вариант B:** убрать кнопки

\`\`\`ink
старое
\`\`\`

\`\`\`ink
новое
\`\`\`

- P3 · скучно (кандидат) · dock · серия без кнопки · → story-pace · [C-35 · замер · средняя]
`;

const BEFORE = `# contact: oleg, Олег, teal
VAR trusted = false
-> pier
=== pier ===
ты на смене? #from:oleg
* [Да #to:oleg]
    ~ trusted = true
* [Ясно #to:oleg]
- -> dock
// reveal: clue_rope
=== dock ===
верёвка обрезана, а не порвана #from:oleg
{trusted: ты один мне веришь #from:oleg}
-> ending
// финал: тихий
=== ending ===
всё #from:oleg
-> END
`;

const tree = (src) => parseInk(src);

export function register(test) {
  test('story-fix: отчёт линзы → находки по порядку и варианты А/Б с ink «до» и «после» (pick.mjs)', async () => {
    const { parseReport } = await core();
    const f = parseReport(REPORT);
    assert.equal(f.length, 2);
    assert.equal(f[0].node, 'pier');
    assert.match(f[0].fix, /F-07/);
    assert.deepEqual(f[0].variants.map((v) => v.key), ['А', 'Б']);
    assert.match(f[0].variants[0].before, /\[Да/);
    assert.match(f[0].variants[0].after, /ничего тебе не ясно/);
    // без подписей «до» / «после»: первый блок — «до», второй — «после»
    assert.equal(f[0].variants[1].before, 'старое');
    assert.equal(f[0].variants[1].after, 'новое');
    assert.equal(f[1].variants.length, 0);
    assert.match(f[1].fix, /story-pace/);
  });

  test('story-fix: ink «до» ищется в файлах без отступов и комментариев; правленый узел — «устарело»', async () => {
    const { parseReport, locateBefore } = await core();
    const v = parseReport(REPORT)[0].variants[0];
    const hit = locateBefore({ 'ch01.ink': BEFORE }, v.before);
    assert.ok(hit.found, hit.why);
    assert.equal(hit.where, 'ch01.ink:5');
    const moved = locateBefore({ 'ch01.ink': BEFORE.replace('ты на смене?', 'ты на вахте?') }, v.before);
    assert.ok(!moved.found);
    assert.match(moved.why, /устарел/);
  });

  test('story-fix: страховка молчит, когда правка меняет только реплику', async () => {
    const { compareTrees } = await core();
    const after = BEFORE.replace('ты на смене? #from:oleg', 'ты на смене сегодня? #from:oleg');
    const items = compareTrees(tree(BEFORE), tree(after));
    assert.ok(!items.some((x) => x.level === '✗' || x.level === '⚠'), JSON.stringify(items.filter((x) => x.level !== '✓' && x.level !== '·')));
  });

  test('story-fix: страховка ловит пропавшую запись, видимое чтение, улику, финал и метку без решения', async () => {
    const { compareTrees } = await core();
    const level = (items, area, re) => items.find((x) => x.area === area && re.test(x.text))?.level;
    // запись переменной пропала вместе с веткой
    let items = compareTrees(tree(BEFORE), tree(BEFORE.replace('    ~ trusted = true\n', '')));
    assert.equal(level(items, 'переменные', /trusted: исчезли все записи/), '✗');
    // видимое чтение убрано
    items = compareTrees(tree(BEFORE), tree(BEFORE.replace('{trusted: ты один мне веришь #from:oleg}\n', '')));
    assert.equal(level(items, 'переменные', /trusted: пропало последнее видимое чтение/), '✗');
    // «для краткости» вырезана реплика с уликой — RED-10
    items = compareTrees(tree(BEFORE), tree(BEFORE.replace('верёвка обрезана, а не порвана #from:oleg\n', '')));
    assert.equal(level(items, 'улики', /в узле раскрытия dock убрано/), '⚠');
    // метка улики снята
    items = compareTrees(tree(BEFORE), tree(BEFORE.replace('// reveal: clue_rope\n', '')));
    assert.equal(level(items, 'улики', /пропала \/\/ reveal: clue_rope/), '✗');
    // метка финала снята
    items = compareTrees(tree(BEFORE), tree(BEFORE.replace('// финал: тихий\n', '')));
    assert.equal(level(items, 'финалы', /тихий/), '✗');
    // «намеренно» без причины — ✗, с причиной — ⚠ «запиши решение»
    items = compareTrees(tree(BEFORE), tree(BEFORE.replace('=== pier ===', '// намеренно: C-10\n=== pier ===')));
    assert.equal(level(items, 'метки', /без причины/), '✗');
    items = compareTrees(tree(BEFORE), tree(BEFORE.replace('=== pier ===', '// намеренно: C-10 два ответа нарочно одинаковы\n=== pier ===')));
    assert.equal(level(items, 'метки', /запиши решение/), '⚠');
  });

  test('story-fix: убранная реплика со словом из facts.md — кандидат «пропал мотив или улика»', async () => {
    const { compareTrees } = await core();
    const src = BEFORE.replace('ты на смене? #from:oleg', 'ты на смене? #from:oleg\nбрат задолжал перевозчику #from:oleg');
    const items = compareTrees(tree(src), tree(BEFORE), { factsText: '- мотив: брат задолжал перевозчику' });
    assert.equal(items.find((x) => x.area === 'факты')?.level, '⚠');
    const none = compareTrees(tree(src), tree(BEFORE), { factsText: '- место: пирс' });
    assert.equal(none.find((x) => x.area === 'факты')?.level, '✓');
  });

  test('story-fix: указатель приёмов ведёт в существующие файлы владельцев (кроме ещё не собранных)', () => {
    const index = readFileSync(join(SKILL, 'references/fixes-index.md'), 'utf8');
    const links = [...index.matchAll(/\]\((\.\.\/\.\.\/[^)]+)\)/g)].map((m) => m[1]);
    assert.ok(links.length >= 14, `ссылок на приёмы ${links.length}`);
    const base = join(SKILL, 'references');
    for (const l of links) {
      const p = join(base, l);
      if (!existsSync(dirname(dirname(dirname(p))))) continue; // скилл-владелец ещё не собран
      assert.ok(existsSync(p), `нет файла приёма: ${l}`);
    }
  });
}
