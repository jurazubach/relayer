// Самопроверка проверок скилла story-time (C-27, C-32, C-37): дефект и чистый двойник на каждую правку
// S-time. Выдуманные истории; подключается из selftest.mjs: register(test, helpers).
import assert from 'node:assert/strict';
import { parseInk } from '../lib/ink.mjs';
import { waitingForks } from '../../.claude/skills/story-time/scripts/guilt-scan.mjs';

export function register(test, { has, hasNot, lint }) {
  // ───────── C-27: тишина-событие и срок события в мире на стыке глав
  const joint = (last, next = 'Глава 2 #sys:bank #chapter') => [
    '-> ch1', '=== ch1 ===', 'Глава 1 #sys:zoya #chapter', 'ты тут? #from:zoya', '* [да] -> tail', '* [нет] -> tail',
    '=== tail ===', 'я нашла коробку #from:zoya', ...last, '-> ch2',
    '=== ch2 ===', `${next} #delay:6h`, 'Списание 300 #from:bank', 'дальше #from:zoya', '* [ок] -> END', '* [нет] -> END',
  ].join('\n');

  test('C-27 (S-time): «Прочитано» без ответа — тишина сама событие, а не поломка', async () => {
    await hasNot(joint(['Вы: где коробка? #me', 'Прочитано #sys:zoya']), 'C-27.long_h', { only: ['C-27'] });
    await has(joint(['что-то тут не так #from:zoya']), 'C-27.long_h', { only: ['C-27'] });
  });

  test('C-27 (S-time): срок события в мире на стыке глав объясняет паузу, посреди главы — нет', async () => {
    await hasNot(joint(['обход в 6:00. до него никто не тронет дверь #from:zoya']), 'C-27.long_h', { only: ['C-27'] });
    // та же строка посреди своего разговора: персонаж молчит шесть часов без причины
    const mid = ['-> a', '=== a ===', 'ты тут? #from:zoya', '* [да] -> b', '* [нет] -> b', '=== b ===',
      'обход в 6:00. до него никто не тронет дверь #from:zoya', 'и ещё одно #delay:6h', '* [ок] -> END', '* [нет] -> END'].join('\n');
    await has(mid, 'C-27.long_h', { only: ['C-27'] });
    // срок возвращения на стыке — всё равно находка: это обещание вернуться, а не событие мира
    await has(joint(['утром напишу #from:zoya']), 'C-27.deadline', { only: ['C-27'] });
  });

  // ───────── T-19: петля напоминания — не хаб, варианты #remind — не кнопки (E-02, просьба 3)
  test('C-19 (T-19): петля #remind → -> ask не делает узел хабом; кнопка, которая возвращается, — делает', async () => {
    const fork = (extra) => ['-> a', '=== a ===', 'сделку берём? #from:savva', '- (ask)',
      '* [Берём] -> END', '* [Нет] -> END', ...extra].join('\n');
    await hasNot(fork(['* [#remind:20m] алё, ты тут? нужно да или нет', '  -> ask', '* [#remind:40m] он ждёт у двери', '  -> ask']), 'C-19.spokes_min', { only: ['C-19'] });
    await has(fork(['* [Спроси ещё раз]', '  -> ask']), 'C-19.no_exit', { only: ['C-19'] });
  });

  // ───────── C-32 п. 7: где упрёк — реакция на кнопку, а где упрёк за отсутствие
  const unresponsive = (body) => [
    '-> a', '=== a ===', 'закрываем отчёт? #from:savva',
    '* [Закрываем] -> b', '* [Подождём] -> b',
    '=== b ===', ...body, 'дальше #from:savva', '* [ок] -> END', '* [нет] -> END',
  ].join('\n');

  test('C-32 п. 7 (S-time): «наконец-то» как ответ на нажатую кнопку — не упрёк за отсутствие', async () => {
    // кнопка ждёт по замыслу (ни #remind, ни #noanswer): «неотвечающий» жмёт запасную, реплика — ответ на неё
    await hasNot(unresponsive(['ну наконец-то, закрыли #from:savva']), 'C-32.no_answer_reproach', { only: ['C-32'] });
    // та же реплика после паузы, которую поставила история, — упрёк за отсутствие (R-74)
    const res = await has(unresponsive(['#delay:2h', 'ну наконец-то, закрыли #from:savva']), 'C-32.no_answer_reproach', { only: ['C-32'] });
    assert.ok(res.findings.some((f) => /после паузы, которую поставила история/.test(f.message)));
  });

  test('C-32 п. 7 (S-time): упрёк после напоминания и в ветке «не ответил» — находка, ответ на нажатый #silent — нет', async () => {
    const src = (silentBody) => [
      '-> a', '=== a ===', 'звонить хозяину? #from:savva', '- (ask)',
      '* [Звони] -> b', '* [Промолчать #silent]', ...silentBody, '  -> b',
      '* [#remind:1h] алё, ты тут? где ты пропал?', '  -> ask',
      '=== b ===', 'дальше #from:savva', '* [ок] -> END', '* [нет] -> END',
    ].join('\n');
    const res = await has(src(['  ладно, сам']), 'C-32.no_answer_reproach', { only: ['C-32'] });
    assert.ok(res.findings.some((f) => /напоминания/.test(f.message)), 'упрёк в напоминании');
    // без упрёка в напоминании, а «ты пропал» — сразу как реакция на #silent, который стал «не ответил»:
    // игрок кнопку не жал, поэтому и это упрёк за отсутствие
    const quiet = src(['  ну ты пропал, конечно']).replace('где ты пропал?', 'мне нужно да или нет');
    await has(quiet, 'C-32.no_answer_reproach', { only: ['C-32'] });
    // кнопка ждёт по замыслу, игрок сам нажал «Промолчать»: обида сразу после — ответ на выбор (R-74)
    await hasNot(unresponsive([]).replace('* [Подождём] -> b', '* [Промолчать #silent]\n  ну ты пропал, конечно #from:savva\n  -> b'), 'C-32.no_answer_reproach', { only: ['C-32'] });
  });

  // ───────── C-37: напоминания не входят в счёт давления главы
  test('C-37 (S-time): «ты где» в напоминаниях не считается давлением главы, в стволе — считается', async () => {
    const src = (inTrunk) => [
      '-> a', '=== a ===', ...inTrunk, 'решай #from:savva', '- (ask)',
      '* [Да] -> END', '* [Нет #silent] -> END',
      '* [#remind:30m] ты где? нужно да или нет', '  -> ask',
      '* [#remind:1h] ответь, я у двери', '  -> ask',
    ].join('\n');
    await hasNot(src(['срочно, тут дверь #from:savva']), 'C-37.per_chapter', { only: ['C-37'] });
    await has(src(['срочно, тут дверь #from:savva', 'ты где?! #from:savva', 'ответь #from:savva']), 'C-37.per_chapter', { only: ['C-37'] });
    // срок в напоминании — всё равно ложная срочность (R-120: без срока)
    const deadline = src([]).replace('ответь, я у двери', 'у тебя 5 минут, потом ухожу');
    await has(deadline, 'C-37.false_deadline', { only: ['C-37'] });
    const res = await lint(src(['срочно, тут дверь #from:savva']), { only: ['C-37'] });
    assert.equal(res.findings.length, 0);
  });

  // ───────── guilt-scan: развилка, где собеседник ждёт, а напоминаний нет (A-03, R-120, ST-66)
  test('guilt-scan (S-time): собеседник ждёт без #remind — в списке; хаб, меню, #remind, #me и #sys — нет', () => {
    const forks = (body) => waitingForks(parseInk(['-> a', '=== a ===', ...body].join('\n')), new Set(['bank']));
    const asks = forks(['дверь открыть? #from:uma', '* [Открой] -> END', '* [Не надо #silent] -> END']);
    assert.equal(asks.length, 1);
    assert.deepEqual([asks[0].contact, asks[0].last_line, asks[0].has_silent, asks[0].has_noanswer, asks[0].question], ['uma', 'дверь открыть?', true, false, true]);
    // со скрытыми напоминаниями перед сборкой — не ждёт молча
    assert.equal(forks(['дверь открыть? #from:uma', '- (ask)', '* [Открой] -> END', '* [Не надо #silent] -> END', '* [#remind:40m] я у двери, открыть?', '  -> ask']).length, 0);
    // #noanswer со сроком без напоминаний — всё равно в списке: напоминаний перед ним нет
    const late = forks(['дверь открыть? #from:uma', '* [Открой] -> END', '* [#noanswer:30m] -> END']);
    assert.equal(late.length, 1);
    assert.equal(late[0].noanswer_after, '30m');
    // хаб: кнопки ведут в чужие чаты — никто не ждёт; смешанная развилка, где одна кнопка — ответ Уме, — ждёт
    assert.equal(forks(['ну что, кому пишем? #from:uma', '* [Уле #to:ulya] -> END', '* [Тиму #to:tim] -> END']).length, 0);
    assert.equal(forks(['мысли? #from:uma', '* [есть идея #to:uma] -> END', '* [спрошу Тима #to:tim] -> END']).length, 1);
    // меню: все кнопки «+», оно возвращается само
    assert.equal(forks(['что посмотреть? #from:uma', '+ [Почту] -> END', '+ [Фото] -> END']).length, 0);
    // перед кнопками — игрок, «Прочитано» или служебный контакт: собеседник не ждёт ответа
    assert.equal(forks(['дверь? #from:uma', 'Вы: потом #me', '* [ок] -> END', '* [нет] -> END']).length, 0);
    assert.equal(forks(['дверь? #from:uma', 'Прочитано #sys:uma', '* [ок] -> END', '* [нет] -> END']).length, 0);
    assert.equal(forks(['Списание 300 #from:bank', '* [ок] -> END', '* [нет] -> END']).length, 0);
    // говорящий перенесён из прошлого узла (без #from): кто ждёт — решает #to кнопок
    const carried = forks(['ну? код?', '* [1234 #to:uma] -> END', '* [не знаю #to:uma] -> END']);
    assert.equal(carried[0]?.contact, 'uma');
    // кнопки в начале узла: реплики перед ними нет — развилка уходит в unresolved, её решит журнал бота
    const top = forks(['* [да #to:uma] -> END', '* [нет #to:uma] -> END']);
    assert.equal(top.length, 0);
    assert.deepEqual(top.unresolved.map((g) => g.texts), [['да', 'нет']]);
    // реплика в конце ветки условия перед кнопками — тоже ждёт
    assert.equal(forks(['{x:', '  ты вернулся? #from:uma', '- else:', '  ну что? #from:uma', '}', '* [да] -> END', '* [нет] -> END']).length, 1);
  });
}
