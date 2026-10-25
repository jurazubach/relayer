// Самопроверка проверок скилла story-opening (C-20, C-22…C-25): правки калибровки S-opening — дефект и
// чистый двойник. Подключается из selftest.mjs: register(test, helpers).
import assert from 'node:assert/strict';

const two = (ch1, ch2) => `-> ch1\n=== ch1 ===\nГлава 1 #sys #chapter\n${ch1}\n* [да] -> ch2\n* [нет] -> ch2\n=== ch2 ===\nГлава 2 #sys #chapter\n${ch2}\n-> END`;
const opening = (body) => `-> a\n=== a ===\n${body}\n* [да] -> END\n* [нет] -> END`;

export function register(test, { has, hasNot }) {
  test('C-22: телефон «(555) 201-0147» — одна сущность, три разных числа — три', async () => {
    const intro = 'смена началась #from:ann\nя на посту #from:ann\nвсё тихо #from:ann';
    await hasNot(opening(`${intro}\nзвони на (555) 201-0147 #from:ann`), 'C-22.line', { only: ['C-22'] });
    await has(opening(`${intro}\nу нас 512 ящиков, 77 коробок и 31 мешок #from:ann`), 'C-22.line', { only: ['C-22'] });
  });

  test('C-22: бытовая латиница (SMS, PIN) не термин, незнакомая — термин', async () => {
    const intro = 'смена началась #from:ann\nя на посту #from:ann\nвсё тихо #from:ann';
    await hasNot(opening(`${intro}\nпришла SMS, в ней PIN и ok #from:ann`), 'C-22.line', { only: ['C-22'] });
    await has(opening(`${intro}\nупали jira, kafka и grafana #from:ann`), 'C-22.line', { only: ['C-22'] });
  });

  test('C-22: редкое слово одной главы — лексика сцены, редкое слово из двух глав — жаргон', async () => {
    const intro = 'смена началась #from:ann\nя на посту #from:ann\nвсё тихо #from:ann';
    const term = 'сингулятор из Bremen, партия 4471 #from:ann';
    const again = 'сингулятор снова гудит #from:ann\nсингулятор не выключается #from:ann';
    // жаргон: звучит в главе 1 и возвращается в главе 2 — три новых в одной реплике
    await has(two(`${intro}\n${term}`, again), 'C-22.line', { only: ['C-22'] });
    // то же слово только в одной главе — новых в реплике две (латиница и число), находки нет
    await hasNot(two(intro, `${term}\n${again}`), 'C-22.line', { only: ['C-22'] });
  });

  test('C-23: прямой вопрос во втором входящем — инцидент есть; ровные фразы без вопроса — нет', async () => {
    await hasNot(opening('рэй? #from:ann\nэто правда твой номер? #from:ann\nответь #from:ann\nну #from:ann'), 'attn.opening.incident.msg', { only: ['C-23'] });
    await has(opening('на улице тепло #from:ann\nя гуляла у реки #from:ann\nвода спокойная #from:ann\nдома чай #from:ann'), 'attn.opening.incident.msg', { only: ['C-23'] });
  });

  test('C-23: приветствие-вопрос («ты тут?») инцидентом не считается, угроза — считается', async () => {
    const flat = 'вода спокойная #from:ann\nдома чай #from:ann\nкот спит #from:ann';
    await has(opening(`ты тут? #from:ann\n${flat}`), 'attn.opening.incident.msg', { only: ['C-23'] });
    await hasNot(opening(`за мной следят #from:ann\n${flat}`), 'attn.opening.incident.msg', { only: ['C-23'] });
  });

  test('C-24: ставка в стволе, но только на двенадцатом входящем — подсказка; на третьем — нет', async () => {
    const filler = (n) => Array.from({ length: n }, (_, i) => `реплика ${i + 1} #from:ann`).join('\n');
    await has(opening(`${filler(11)}\nдо утра надо успеть #from:ann`), 'C-24.by_msg', { only: ['C-24'] });
    await hasNot(opening(`${filler(2)}\nдо утра надо успеть #from:ann`), 'C-24.by_msg', { only: ['C-24'] });
  });

  test('C-20: первая кнопка на четвёртом входящем — норма, на восьмом — находка', async () => {
    const start = (n) => opening(Array.from({ length: n }, (_, i) => `реплика ${i + 1} #from:ann`).join('\n'));
    await hasNot(start(4), 'C-20.start_msgs', { only: ['C-20'] });
    const res = await has(start(8), 'C-20.start_msgs', { only: ['C-20'] });
    assert.equal(res.findings.find((f) => f.key === 'C-20.start_msgs').chapter, 1);
  });
}
