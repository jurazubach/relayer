// Самопроверка правок C-49 скилла story-release: (б) герой-завязка, (ж) затравки, (з) обещанные финалы —
// дефект и чистый двойник. Подключается из selftest.mjs сама: register(test, helpers).

import assert from 'node:assert/strict';

const two = (ch1, ch2) => `-> ch1
=== ch1 ===
Глава 1 #sys:ada #chapter
${ch1}
* [Иду #to:ada] -> ch2
* [Подожди #to:ada] -> ch2
=== ch2 ===
Глава 2 #sys:ada #chapter
${ch2}
-> END`;

const heroes = [
  { name: 'Вы', role: 'тот, кому пишут' },
  { id: 'ada', name: 'Ада', role: 'смотритель' },
  { id: 'oleg', name: 'Олег', role: 'брат' },
];

export function register(test, { has, hasNot }) {
  test('C-49 (б): имя из synopsis, которое звучит в главе 1, — не спойлер, даже если герой пишет позже', async () => {
    const src = (said) => `-> ch1
=== ch1 ===
Глава 1 #sys:ada #chapter
${said ? 'Олег пропал три дня назад #from:ada' : 'на маяке опять темно #from:ada'}
* [Иду #to:ada] -> ch2
=== ch2 ===
Глава 2 #sys:ada #chapter
ветер #from:ada
-> ch3
=== ch3 ===
Глава 3 #sys:ada #chapter
это я. не ищи меня #from:oleg
-> END`;
    const meta = { synopsis: 'Тебе пишет Ада: её брат Олег не вернулся с маяка.', characters: heroes };
    await has(src(false), 'C-49.spoiler_chapter', { only: ['C-49'], meta });
    await hasNot(src(true), 'C-49.spoiler_chapter', { only: ['C-49'], meta });
  });

  test('C-49 (ж): затравка с поздним именем или числом — спойлер; из главы 1 — нет', async () => {
    const src = two('на маяке темно, бак на 40 литров #from:ada', 'Олег открыл дверь. в баке 12 литров #from:oleg');
    const meta = (teasers) => ({ synopsis: 'Тебе пишет Ада со смены на маяке.', characters: heroes, teasers });
    await has(src, 'C-49.teaser_chapter', { only: ['C-49'], meta: meta(['На маяке темно.', 'Олег уже открыл дверь.']) });
    await has(src, 'C-49.teaser_chapter', { only: ['C-49'], meta: meta(['На маяке темно.', 'В баке осталось 12 литров.']) });
    await hasNot(src, 'C-49.teaser_chapter', { only: ['C-49'], meta: meta(['На маяке темно.', 'Бак на 40 литров, и он пуст.']) });
  });

  test('C-49 (ж): затравок 2–3; одна — находка, поля нет — карточка без затравок', async () => {
    const src = two('на маяке темно #from:ada', 'свет #from:ada');
    await has(src, 'C-49.teasers', { only: ['C-49'], meta: { teasers: ['На маяке темно.'] } });
    await hasNot(src, 'C-49.teasers', { only: ['C-49'], meta: { teasers: ['На маяке темно.', 'Ада одна на смене.'] } });
    await hasNot(src, 'C-49.teasers', { only: ['C-49'], meta: {} });
  });

  test('C-49 (ж): затравка не из завязки и главы 1 — находка', async () => {
    const src = two('на маяке темно, генератор молчит #from:ada', 'катер у причала #from:ada');
    const meta = (t) => ({ synopsis: 'Тебе пишет Ада: на маяке погас свет.', teasers: ['На маяке темно.', t] });
    await has(src, 'C-49.teaser_ground', { only: ['C-49'], meta: meta('Предательство брата раскроется зимой.') });
    await hasNot(src, 'C-49.teaser_ground', { only: ['C-49'], meta: meta('Генератор молчит, а свет погас.') });
  });

  test('C-49 (ж): затравка — пузырь: срок возвращения и упрёк по docs/style.md — находка', async () => {
    const src = two('на маяке темно #from:ada', 'свет #from:ada');
    const meta = (t) => ({ teasers: ['На маяке темно.', t] });
    await has(src, 'C-49.teaser_style', { only: ['C-49'], meta: meta('Ада напишу через час, жди.') });
    await has(src, 'C-49.teaser_style', { only: ['C-49'], meta: meta('Ты пропал, а на маяке темно.') });
    await hasNot(src, 'C-49.teaser_style', { only: ['C-49'], meta: meta('Генератор молчит третью ночь.') });
  });

  test('C-49 (з): «несколько финалов» при одном финале — находка; пункт о финалах не ищется словами', async () => {
    const one = two('выбирай #from:ada', 'всё кончилось #from:ada');
    const many = `-> ch1
=== ch1 ===
Глава 1 #sys:ada #chapter
выбирай #from:ada
* [Свет #to:ada] -> fin_light
* [Тьма #to:ada] -> fin_dark
=== fin_light ===
свет горит #from:ada
-> END
=== fin_dark ===
темно #from:ada
-> END`;
    const meta = { features: ['Несколько финалов — зависит от того, кому поверишь'] };
    const res = await has(one, 'C-49.endings_min', { only: ['C-49'], meta });
    assert.ok(!res.findings.some((f) => f.key === 'C-49.feature_absent'), 'пункт о финалах сверяет (з), а не (е)');
    await hasNot(many, 'C-49.endings_min', { only: ['C-49'], meta });
    await has(many, 'C-49.endings_min', { only: ['C-49'], meta: { features: ['Три финала, и все разные'] } });
  });
}
