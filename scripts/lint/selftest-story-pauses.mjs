// Самопроверка проверок story-pauses (C-26, C-28, C-29, C-30, C-33, C-39): ложные срабатывания, которые
// сборка скилла нашла на трёх историях, — дефект и чистый двойник. Подключается из selftest.mjs.
import assert from 'node:assert/strict';

const chapters = (...bodies) => bodies.map((b, i) => `=== ch${i + 1} ===\nГлава ${i + 1} #sys #chapter\n${b}\n${i + 1 < bodies.length ? `-> ch${i + 2}` : '-> END'}`).join('\n');
const group = (a, b, body = '') => `* [${a}]${body ? `\n  ${body}` : ''}\n* [${b}]\n-`;
const many = (n, text = 'строка', who = 'ann') => Array.from({ length: n }, (_, i) => `${text} ${i + 1} #from:${who}`).join('\n');

export function register(test, { has, hasNot, lint, keys }) {
  test('C-26: прощание перед паузой эпилога (после последней кнопки) — не находка, это хвост C-42', async () => {
    const mid = `-> a\n=== a ===\nну #from:ann\n${group('да', 'нет')} на смене #from:ann\nтут шумно #from:ann\nспасибо #from:ann\n#delay:2h\nвернулась #from:ann\n${group('и?', 'ну')} -> END`;
    await has(mid, 'C-26.closing', { only: ['C-26'] });
    const tail = `-> a\n=== a ===\nну #from:ann\n${group('да', 'нет')} на смене #from:ann\nтут шумно #from:ann\nспасибо #from:ann\n#delay:2h\nвернулась #from:ann\n-> END`;
    await hasNot(tail, 'C-26.closing', { only: ['C-26'] });
    await hasNot(tail, 'C-26.share', { only: ['C-26'] });
  });

  test('C-28: одно слово-событие и «здравствуйте» нового контакта — не пустое уведомление; «привет» знакомого — пустое', async () => {
    const mk = (first) => `-> a\n=== a ===\nэто кто? #from:ann\n${group('я', 'не я')} ${first}\nвот #from:ann\n${group('и?', 'ну')} -> END`;
    await has(mk('привет #from:ann #delay:2h'), 'C-28.greeting', { only: ['C-28'] });
    await hasNot(mk('посмотрела #from:ann #delay:2h'), 'C-28.greeting', { only: ['C-28'] });
    await hasNot(mk('Здравствуйте. Я сосед снизу #from:bob #delay:2h'), 'C-28.greeting', { only: ['C-28'] });
    // знакомый контакт со «здравствуйте» — та же пустая карточка
    const known = `-> a\n=== a ===\nдобрый вечер #from:bob\nэто кто? #from:ann\n${group('я', 'не я')} Здравствуйте. #from:bob #delay:2h\nвот #from:ann\n${group('и?', 'ну')} -> END`;
    await has(known, 'C-28.greeting', { only: ['C-28'] });
  });

  test('C-29: «… не в сети» и «ладно» перед каждой паузой — не формула обрыва; «но…» трижды — формула', async () => {
    const pauses = (last) => Array.from({ length: 3 }, (_, i) => `факт ${i + 1} #from:ann\n${last(i)}\nАня не в сети #sys:ann\n#delay:2h\nвернулась ${i + 1} #from:ann\n${group(`да ${i}`, `нет ${i}`)}`).join('\n');
    const src = (last) => `-> a\n=== a ===\n${pauses(last)}\nконец #from:ann\n-> END`;
    await hasNot(src(() => 'ладно #from:ann'), 'C-29.closing_repeat', { only: ['C-29'] });
    await hasNot(src((i) => `увидимся ${i} #from:ann`), 'C-29.closing_repeat', { only: ['C-29'] });
    await has(src((i) => `но ${['там', 'это', 'он'][i]}… #from:ann`), 'C-29.closing_repeat', { only: ['C-29'] });
    // одна и та же фраза в начале «я …» без обрыва — не формула
    await hasNot(src((i) => `я ${['пошла', 'вижу свет', 'у двери'][i]} #from:ann`), 'C-29.closing_repeat', { only: ['C-29'] });
  });

  test('C-29: одинаковый возврат в разных финалах — не износ, на одном пути трижды — износ', async () => {
    const endings = ['f1', 'f2', 'f3', 'f4'].map((f) => `=== ${f} ===\nитог ${f} #from:ann\n#delay:2h\nТри недели спустя #from:ann\nвсё ${f} #from:ann\n${group('ок', 'ага')} -> END`).join('\n');
    const fork = `-> a\n=== a ===\nну #from:ann\n* [один] -> f1\n* [два] -> f2\n* [три] -> f3\n* [четыре] -> f4\n${endings}`;
    await hasNot(fork, 'C-29.opening_repeat', { only: ['C-29'] });
    const line = Array.from({ length: 3 }, (_, i) => `факт ${i} #from:ann\n#delay:2h\nТри недели спустя ${i} #from:ann\n${group(`да ${i}`, `нет ${i}`)}`).join('\n');
    await has(`-> a\n=== a ===\n${line}\nконец #from:ann\n-> END`, 'C-29.opening_repeat', { only: ['C-29'] });
  });

  test('C-39: глава, которая сразу ставит перед кнопкой, — вход с события; без кнопки и вопроса — подсказка', async () => {
    const open = (start) => `-> ch1\n${chapters(`раз #from:ann\n${group('да', 'нет')}\nкто это был? #from:ann`, start)}`;
    await has(open(`на двери кто-то написал #from:ann #delay:6h\n${many(5, 'дальше')}\n${group('а', 'б')}`), 'C-39.start_event', { only: ['C-39'] });
    await hasNot(open(`на двери кто-то написал #from:ann #delay:6h\nкраской #from:ann\n${group('стирай', 'не трогай')}\n${many(5, 'дальше')}`), 'C-39.start_event', { only: ['C-39'] });
  });

  test('C-30: микросессии — доля возвращений из двух строк без кнопки', async () => {
    const micro = Array.from({ length: 4 }, (_, i) => `#delay:2h\nещё ${i} #from:ann`).join('\n');
    const src = `-> a\n=== a ===\nну #from:ann\n${group('да', 'нет')} ${micro}\n${group('и?', 'ну')} конец #from:ann\n-> END`;
    const res = await lint(src, { only: ['C-30'] });
    assert.ok(keys(res).includes('C-30.micro_share'), `ожидалась C-30.micro_share, есть: ${keys(res).join(', ')}`);
  });
}
