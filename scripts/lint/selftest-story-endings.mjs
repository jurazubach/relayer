// Самопроверка проверок story-endings (C-06, C-07, C-40…C-43): правки S-endings — дефект и чистый двойник.
// Подключается из selftest.mjs сама: register(test, helpers).

import assert from 'node:assert/strict';

const chapters = (...bodies) => bodies.map((b, i) => `=== ch${i + 1} ===\nГлава ${i + 1} #sys #chapter\n${b}\n${i + 1 < bodies.length ? `-> ch${i + 2}` : '-> END'}`).join('\n');

export function register(test, { has, hasNot }) {
  test('C-07: общий разбор после финалов цитирует путь — это цитата за все финалы', async () => {
    // два финала без условий, после них общий эпилог; цитата — только в эпилоге
    const mk = (cite) => `VAR kept = false
VAR told = false
-> ch1
=== ch1 ===
Глава 1 #sys #chapter
отдашь ключ? #from:ada
* [Отдам #to:ada]
    ~ kept = false
* [Оставлю себе #to:ada]
    ~ kept = true
- -> ch2
=== ch2 ===
Глава 2 #sys #chapter
сказать брату? #from:ada
* [Скажи #to:ada]
    ~ told = true
    -> fin_open
* [Не надо #to:ada]
    -> fin_shut
=== fin_open ===
он знает #from:ada
-> coda
=== fin_shut ===
он не знает #from:ada
-> coda
=== coda ===
${cite ? '{kept: ключ так и лежит у тебя #from:ada}\n{told: брат звонил дважды #from:ada}' : 'всё #from:ada'}
утро #sys
-> END`;
    await has(mk(false), 'C-07.callbacks', { only: ['C-07'] });
    await hasNot(mk(true), 'C-07.callbacks', { only: ['C-07'] });
    await hasNot(mk(true), 'C-07.chapters', { only: ['C-07'] });
  });

  test('C-43: первый собеседник — тот, кому отвечают, а не SMS оператора; ответ ему в финале — возвращение', async () => {
    const mk = ({ back, reply }) => `-> ch1\n${chapters(
      'Сим-карта активирована #from:op\nпривет, это Савва #from:savva\n* [Привет #to:savva]\n-',
      'мы у причала #from:vera\n* [Иду #to:vera]\n-',
      `${back ? 'спасибо за всё #from:savva' : 'конец смены #from:vera'}\n${reply ? '* [Савва, ты где? #to:savva]\n-' : ''}\nутро #sys`,
    )}`;
    await has(mk({ back: false, reply: false }), 'C-43.first_absent', { only: ['C-43'] });
    await hasNot(mk({ back: true, reply: false }), 'C-43.first_absent', { only: ['C-43'] });
    await hasNot(mk({ back: false, reply: true }), 'C-43.first_absent', { only: ['C-43'] });
  });

  test('C-42: долгий хвост указывает на узел эпилога, где копятся паузы, а не на первый после кнопки', async () => {
    const src = `-> ch1
=== ch1 ===
Глава 1 #sys #chapter
идём? #from:ada
* [Идём #to:ada]
    -> fin_go
=== fin_go ===
идём #from:ada
-> coda
=== coda ===
утро #from:ada #delay:3h
катер #from:ada #delay:3h
-> END`;
    const res = await has(src, 'story.tail.max_delay_min', { only: ['C-42'] });
    assert.equal(res.findings.find((f) => f.key === 'story.tail.max_delay_min').node, 'coda');
  });
}
