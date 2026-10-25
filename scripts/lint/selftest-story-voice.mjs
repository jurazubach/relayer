// Самопроверка проверок story-voice (S-voice): C-14 — цитата, легенда игрока, родовые слова; C-48 — имя из characters
// в падеже; C-44 — реплики против карточки голоса; C-46 — служебный шаблон и рассылка в разные чаты. Дефект и чистый
// двойник, выдуманные истории. Подключается из selftest.mjs.
import assert from 'node:assert/strict';

const two = (body) => `-> a\n=== a ===\n${body}\n* [да] -> END\n* [нет] -> END`;

export function register(test, { has, hasNot, lint, keys }) {
  test('C-14: цитата в кавычках — чужие слова, а не обращение к игроку', async () => {
    await hasNot(two('«ты была маленькой» — так мама говорила #from:ann'), 'C-14.gender', { only: ['C-14'] });
    await has(two('ты была у моста? #from:ann'), 'C-14.gender', { only: ['C-14'] });
  });

  test('C-14: легенда игрока через {var} в кнопке задаёт род; нейтральная — нет', async () => {
    const src = (cover) => `VAR alias = "Ника"\nVAR opener = ""\n-> a\n=== a ===\n~ opener = "Добрый день. Я " + alias + ", ${cover}. Пара вопросов?"\nкто вы? #from:ann\n* [{opener} #to:ann #label:Написать Ане]\n* [Промолчать #to:ann #silent]\n- -> END`;
    const res = await has(src('студент'), 'C-14.gender', { only: ['C-14'] });
    assert.match(res.findings.find((f) => f.key === 'C-14.gender').message, /легенда \{opener\}/);
    await hasNot(src('делаю опрос для универа'), 'C-14.gender', { only: ['C-14'] });
  });

  test('C-14: «ты прав», «вы студент» у героя и кнопка «Согласен» задают род; «я в деле» — нет', async () => {
    await has(two('ты прав, это не он #from:ann'), 'C-14.gender', { only: ['C-14'] });
    await has(two('я не верю, что вы студент #from:ann'), 'C-14.gender', { only: ['C-14'] });
    await has('-> a\n=== a ===\nну? #from:ann\n* [Согласен, закрываем #to:ann]\n* [Нет #to:ann]\n- -> END', 'C-14.gender', { only: ['C-14'] });
    await hasNot('-> a\n=== a ===\nну? #from:ann\n* [Я в деле #to:ann]\n* [Сначала скажи, кто там #to:ann]\n- -> END', 'C-14.gender', { only: ['C-14'] });
    // под условием на пол — законно
    await hasNot(`VAR gender = 0\n-> a\n=== a ===\n{gender == 1: ты прав #from:ann}\n* [да] -> END\n* [нет] -> END`, 'C-14.gender', { only: ['C-14'] });
  });

  test('C-48: имя из characters в любом падеже — не новое слово; чужое имя — находка', async () => {
    const meta = { characters: [{ id: 'ann', name: 'Аня' }, { id: 'ray', name: 'Рэй Колдуэлл' }, { id: 'dina', name: 'Дина' }] };
    await hasNot(two('отдай ключ Дине, а потом напиши Рэю #from:ann'), 'C-48.unknown', { only: ['C-48'], meta });
    await hasNot(two('спроси у Колдуэлла и Ани #from:ann'), 'C-48.unknown', { only: ['C-48'], meta });
    await has(two('отдай ключ Зорину #from:ann'), 'C-48.unknown', { only: ['C-48'], meta });
    // беглая гласная: Павел → Павла, Пётр → Петру
    const pm = { characters: [{ id: 'pav', name: 'Павел' }, { id: 'pet', name: 'Пётр' }] };
    await hasNot(two('спроси у Павла, потом напиши Петру #from:ann'), 'C-48.unknown', { only: ['C-48'], meta: pm });
  });

  test('C-44: реплики против карточки голоса; совпадают — нет; мало реплик — нет', async () => {
    const meta = (voice) => ({ characters: [{ id: 'lev', name: 'Лев', voice }] });
    const caps = two(['Это Лев. Я начальник смены.', 'Журнал я видел.', 'Пропуск её.', 'Вопрос закрыт.'].map((l) => `${l} #from:lev`).join('\n'));
    const low = two(['это лев!! ника дала номер', 'журнал вижу 😭', 'она вечно его вешает', 'всё, честно'].map((l) => `${l} #from:lev`).join('\n'));
    const card = 'полные предложения с заглавной и точкой, на «Вы»';
    const res = await has(low, 'C-44.card_share', { only: ['C-44'], meta: meta(card) });
    assert.match(res.findings.find((f) => f.key === 'C-44.card_share').message, /с заглавной в карточке, а со строчной/);
    await hasNot(caps, 'C-44.card_share', { only: ['C-44'], meta: meta(card) });
    await hasNot(two('это лев!! #from:lev\nну #from:lev'), 'C-44.card_share', { only: ['C-44'], meta: meta(card) });
    // карточка «без эмодзи», а эмодзи в каждой реплике
    await has(two(['ну 😭', 'да 😅', 'ага 🙂'].map((l) => `${l} #from:lev`).join('\n')), 'C-44.card_share', { only: ['C-44'], meta: meta('строчные, ни одного эмодзи') });
    // без карточки — сверять не с чем
    await hasNot(low, 'C-44.card_share', { only: ['C-44'] });
  });

  test('C-47: упрёк в узле, куда ведёт только кнопка, — по выбору; в общем стволе — без основания', async () => {
    const viaButton = '-> a\n=== a ===\nтебе пришло? #from:ann\n* [Ничего #to:ann] -> caught\n* [Пришло #to:ann] -> END\n=== caught ===\nты сказал «ничего» #from:ann\n-> END';
    await hasNot(viaButton, 'C-47.blame', { only: ['C-47'] });
    const viaCond = 'VAR lied = false\n-> a\n=== a ===\nтебе пришло? #from:ann\n* [Ничего #to:ann]\n  ~ lied = true\n* [Пришло #to:ann]\n- { lied: -> caught }\n-> END\n=== caught ===\nты сказал «ничего» #from:ann\n-> END';
    await hasNot(viaCond, 'C-47.blame', { only: ['C-47'] });
    await has('-> a\n=== a ===\nты сказал, что придёшь #from:ann\n* [да] -> END\n* [нет] -> END', 'C-47.blame', { only: ['C-47'] });
  });

  test('C-46: служебный канал повторяет шаблон, рассылка в разные чаты — не повтор; тот же чат дважды — повтор', async () => {
    const line = 'Ворота 1: вход по коду владельца';
    const meta = { characters: [{ id: 'gate', name: 'Ворота', service: true }] };
    const loop = (from) => `-> a\n=== a ===\n${line} #from:${from}\n* [да] -> b\n* [нет] -> b\n=== b ===\n${line} #from:${from}\n-> END`;
    await hasNot(loop('gate'), 'C-46.path_repeat', { only: ['C-46'], meta });
    await has(loop('ann'), 'C-46.path_repeat', { only: ['C-46'], meta });
    const msg = 'Добрый день, делаю опрос для универа';
    const spread = `-> a\n=== a ===\nну? #from:ann\n* [${msg} #to:ann]\n- ${msg} #me:bob\nага #from:bob\n* [да] -> END\n* [нет] -> END`;
    const res = await lint(spread, { only: ['C-46'] });
    assert.ok(!keys(res).includes('C-46.path_repeat'), 'одно сообщение двум людям — не повтор');
  });
}
