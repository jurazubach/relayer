// Самопроверка проверок story-pace (C-35, C-36, C-38): дефект и чистый двойник, выдуманные истории.
// Подключается из selftest.mjs сам: register(test, helpers).
import assert from 'node:assert/strict';

const many = (n, text = 'строка', who = 'ann') => Array.from({ length: n }, (_, i) => `${text} ${i + 1} #from:${who}`).join('\n');
const chapters = (...bodies) => bodies.map((b, i) => `=== ch${i + 1} ===\nГлава ${i + 1} #sys #chapter\n${b}\n${i + 1 < bodies.length ? `-> ch${i + 2}` : '-> END'}`).join('\n');
const group = (a, b) => `* [${a}]\n* [${b}]\n-`;

export function register(test, { has, hasNot, lint }) {
  test('C-35: серия через два узла — находка на узле, где у неё больше строк, начало — в сообщении', async () => {
    const src = `-> door\n=== door ===\nоткрыла #from:ann\n-> story\n=== story ===\n${many(14, 'рассказ')}\n* [и что?] -> END\n* [дальше] -> END`;
    const res = await has(src, 'C-35.series_ch1', { only: ['C-35'] });
    const f = res.findings.find((x) => x.key === 'C-35.series_ch1');
    assert.equal(f.node, 'story', `узел находки ${f.node}, ждали story`);
    assert.match(f.message, /начало в door/);
    const mono = res.findings.find((x) => x.key === 'C-35.monologue');
    assert.equal(mono?.node, 'story', 'монолог тоже на узле, где он длиннее');
  });

  test('C-35: в одну длинную сцену входят с двух развилок — одна находка, а не две', async () => {
    const src = `-> a\n=== a ===\nпривет #from:ann\n* [к Ане] -> left\n* [к Бору] -> right\n=== left ===\nты со мной #from:ann\n-> tale\n=== right ===\nи ты здесь #from:ann\n-> tale\n=== tale ===\n${many(14, 'рассказ')}\n* [ясно] -> END\n* [нет] -> END`;
    const res = await lint(src, { only: ['C-35'] });
    const series = res.findings.filter((x) => x.key === 'C-35.series_ch1');
    assert.equal(series.length, 1, `находок серии ${series.length}: ${series.map((x) => x.node).join(', ')}`);
    assert.equal(series[0].node, 'tale');
  });

  test('C-35: короткий вход и короткий рассказ — без находки', async () => {
    await hasNot(`-> door\n=== door ===\nоткрыла #from:ann\n-> story\n=== story ===\n${many(5, 'рассказ')}\n* [и что?] -> END\n* [дальше] -> END`, 'C-35.series_ch1', { only: ['C-35'] });
  });

  test('C-36: затишье после последней кнопки — развязка (C-42), а не находка C-36', async () => {
    await hasNot(`-> a\n=== a ===\nну что #from:ann\n* [да]\n* [нет]\n- ${many(16, 'эпилог')}\n-> END`, 'C-36.lull', { only: ['C-36'] });
    await has(`-> a\n=== a ===\nну что #from:ann\n* [да]\n* [нет]\n- ${many(16, 'середина')}\n* [ещё] -> END\n* [хватит] -> END`, 'C-36.lull', { only: ['C-36'] });
  });

  test('C-36: финальные узлы без кнопок не идут в долю узлов без перемены', async () => {
    const fin = (id) => `=== ${id} ===\n${many(6, id)}\n-> END`;
    const scene = (id) => `=== ${id} ===\nкто там? #from:ann\n${many(5, id)}\n* [открой] -> end_${id}\n* [нет] -> end_${id}_b`;
    const src = `-> a\n=== a ===\nначнём? #from:ann\n* [да] -> s1\n* [нет] -> s2\n${scene('s1')}\n${scene('s2')}\n${fin('end_s1')}\n${fin('end_s1_b')}\n${fin('end_s2')}\n${fin('end_s2_b')}`;
    await hasNot(src, 'C-36.static_share', { only: ['C-36'] });
    // те же узлы, но из них дальше идёт сцена с кнопкой: это уже не финалы, а узлы без перемены
    const tail = src.replaceAll('\n-> END', '\n-> more') + `\n=== more ===\nещё? #from:ann\n* [да] -> END\n* [нет] -> END`;
    await has(tail, 'C-36.static_share', { only: ['C-36'] });
  });

  test('C-38: ровные паузы между кнопками — находка; рваные — нет', async () => {
    const even = Array.from({ length: 6 }, (_, i) => `реплика ${i + 1} #from:ann #delay:20s`).join('\n');
    const torn = ['4s', '3m', '20s', '6s', '1m', '12s'].map((d, i) => `реплика ${i + 1} #from:ann #delay:${d}`).join('\n');
    const mk = (body) => `-> ch1\n${chapters(`${body}\n${group('да', 'нет')}`, `дальше #from:ann\n${group('да', 'нет')}`)}`;
    await has(mk(even), 'C-38.pause_spread', { only: ['C-38'] });
    await hasNot(mk(torn), 'C-38.pause_spread', { only: ['C-38'] });
  });

  test('C-38: задуманная передышка с «// намеренно: C-38» не идёт в серию передышек', async () => {
    const calm = `тихо у нас #from:ann\n${group('да', 'нет')}`;
    const src = `-> ch1\n${chapters(`угроза рядом #from:ann\n${group('да', 'нет')}`, calm, calm)}`;
    await has(src, 'C-38.breathers', { only: ['C-38'] });
    await hasNot(src.replace('=== ch3 ===', '// намеренно: C-38 передышка перед финалом\n=== ch3 ==='), 'C-38.breathers', { only: ['C-38'] });
  });

  test('C-38: срок прописью и «за ним придут» — не передышка', async () => {
    const mk = (line) => `-> ch1\n${chapters(`угроза рядом #from:ann\n${group('да', 'нет')}`, `${line} #from:ann\n${group('да', 'нет')}`, `тихо у нас #from:ann\n${group('да', 'нет')}`)}`;
    await has(mk('погода хорошая'), 'C-38.breathers', { only: ['C-38'] });
    await hasNot(mk('код сгорит через десять минут'), 'C-38.breathers', { only: ['C-38'] });
    await hasNot(mk('он знал, что за ним придут'), 'C-38.breathers', { only: ['C-38'] });
  });
}
