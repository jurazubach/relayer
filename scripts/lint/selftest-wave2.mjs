// Самопроверка второй волны (T-03b): дефект и чистый двойник на каждую проверку, выдуманные истории.
// Подключается из selftest.mjs: register(test, helpers).
import assert from 'node:assert/strict';

const chapters = (...bodies) => bodies.map((b, i) => `=== ch${i + 1} ===\nГлава ${i + 1} #sys #chapter\n${b}\n${i + 1 < bodies.length ? `-> ch${i + 2}` : '-> END'}`).join('\n');
const group = (a, b, body = '') => `* [${a}]${body ? `\n  ${body}` : ''}\n* [${b}]\n-`;
const many = (n, text = 'строка') => Array.from({ length: n }, (_, i) => `${text} ${i + 1} #from:ann`).join('\n');

export function register(test, { has, hasNot, lint, keys }) {
  // ───────── переменные
  test('C-02: шесть записей на одно невидимое чтение; видимые чтения — подсказка', async () => {
    const writes = Array.from({ length: 6 }, (_, i) => `реплика ${i} #from:ann\n${group('да', 'нет', '~ x += 1')}`).join('\n');
    const src = `VAR x = 0\n-> ch1\n${chapters(`${writes}\n~ temp t = x\nконец #from:ann`)}`;
    await has(src, 'C-02.ratio', { only: ['C-02'] });
    await has(src.replace('~ temp t = x', '{x > 3: много}'), 'C-02.ratio_visible', { only: ['C-02'] });
    await hasNot(src.replace('~ temp t = x', '{x > 3: много} {x > 4: очень} {x}'), 'C-02.ratio_visible', { only: ['C-02'] });
  });

  test('C-04: отклик через три главы — предупреждение, в следующей — нет', async () => {
    const mk = (at) => `VAR x = 0\n-> ch1\n${chapters(
      `привет #from:ann\n${group('да', 'нет', '~ x = 1')}`,
      at === 2 ? '{x: помню} #from:ann' : 'два #from:ann',
      'три #from:ann',
      at === 4 ? '{x: помню} #from:ann' : 'четыре #from:ann',
    )}`;
    await has(mk(4), 'C-04.gap_warning', { only: ['C-04'] });
    await hasNot(mk(2), 'C-04.gap_warning', { only: ['C-04'] });
  });

  test('C-05: в главе кнопки только окрашивают реплику', async () => {
    const src = `VAR x = 0\n-> ch1\n${chapters(`раз #from:ann\n${group('да', 'нет', '~ x = 1')}`, `два #from:ann\n* [ага]\n  ну ладно #from:ann\n* [угу]\n  хорошо #from:ann\n-\n{x: помню}`)}`;
    const res = await has(src, 'C-05.meaningful', { only: ['C-05'] });
    assert.equal(res.findings.find((f) => f.key === 'C-05.meaningful').chapter, 2);
    await hasNot(src, 'C-05.writes', { only: ['C-05'] });
  });

  test('C-07: финал без условной реплики на выбор игрока; с ней — нет', async () => {
    const mk = (cite) => `VAR x = 0\n-> a\n=== a ===\nвыбирай #from:ann\n* [да]\n  ~ x = 1\n  -> fin\n* [нет] -> fin\n// финал: итог\n=== fin ===\n${cite ? '{x: ты согласился тогда|ты отказался}' : 'всё'} #from:ann\n-> END`;
    await has(mk(false), 'C-07.callbacks', { only: ['C-07'] });
    await hasNot(mk(true), 'C-07.callbacks', { only: ['C-07'] });
  });

  test('C-08: кнопка снижает доверие без сигнала цены; «если» над ней гасит', async () => {
    const mk = (warn) => `VAR ann_trust = 0\n-> a\n=== a ===\n${warn ? 'если соврёшь, я пойму' : 'ну как'} #from:ann\n* [соврать]\n  ~ ann_trust -= 1\n* [правду]\n- {ann_trust < 0: ты что-то скрываешь} #from:ann\n-> END`;
    await has(mk(false), 'C-08.no_signal', { only: ['C-08'] });
    await hasNot(mk(true), 'C-08.no_signal', { only: ['C-08'] });
    const grudge = `VAR ann_trust = 0\n-> a\n=== a ===\nну #from:ann\n* [грубо]\n  ~ ann_trust -= 1\n* [мягко]\n- дальше #from:ann\n-> END`;
    await has(grudge, 'C-08.grudge', { only: ['C-08'] });
  });

  test('C-09: условие из трёх частей, переменная финала даром в ветке else', async () => {
    const src = `VAR a = 0\nVAR b = 0\nVAR c = 0\n-> x\n=== x ===\nну #from:ann\n* [раз]\n  ~ a = 1\n* [два]\n- {a && b || c: что-то}\n{\n- a > 0: просто #from:ann\n- else:\n  ~ b = 1\n}\n-> route\n=== route ===\n{b: -> f1}\n-> f2\n=== f1 ===\nодин #from:ann\n-> END\n=== f2 ===\nдва #from:ann\n-> END`;
    const res = await lint(src, { only: ['C-09'] });
    assert.ok(keys(res).includes('C-09.ops'));
    assert.ok(keys(res).includes('C-09.free_final'), keys(res).join(','));
    await hasNot(src.replace('{a && b || c: что-то}', '{a: что-то}'), 'C-09.ops', { only: ['C-09'] });
  });

  // ───────── выборы
  test('C-13: кнопка в 13 слов — ошибка; с #label — нет; кнопка-действие', async () => {
    const long = 'я думаю что нам стоит пойти туда прямо сейчас и всё там узнать';
    await has(`-> a\n=== a ===\nну #from:ann\n* [${long}]\n* [нет]\n- -> END`, 'C-13.words_error', { only: ['C-13'] });
    await hasNot(`-> a\n=== a ===\nну #from:ann\n* [${long} #label:идём]\n* [нет]\n- -> END`, 'C-13.words_error', { only: ['C-13'] });
    await has(`-> a\n=== a ===\nну #from:ann\n* [Написать Борису]\n* [нет]\n- -> END`, 'C-13.action', { only: ['C-13'] });
  });

  test('C-14: кнопка задаёт пол игрока; без прошедшего времени — нет', async () => {
    await has('-> a\n=== a ===\nну #from:ann\n* [я пришёл]\n* [нет]\n- -> END', 'C-14.gender', { only: ['C-14'] });
    await hasNot('-> a\n=== a ===\nну #from:ann\n* [я тут]\n* [нет]\n- -> END', 'C-14.gender', { only: ['C-14'] });
  });

  test('C-15: условная кнопка не показана ни разу; порог выше максимума переменной', async () => {
    const src = 'VAR x = 0\n-> a\n=== a ===\nну #from:ann\n* {x >= 5} [тайный]\n* [раз]\n  ~ x = 1\n* [два]\n- {x >= 5: никогда}\n-> END';
    const res = await lint(src, { only: ['C-15'] });
    assert.ok(keys(res).includes('C-15.never'), keys(res).join(','));
    assert.ok(keys(res).includes('C-15.threshold_unreached'));
    await hasNot(src.replace('{x >= 5} [тайный]', '{x >= 0} [тайный]'), 'C-15.never', { only: ['C-15'] });
  });

  test('C-16: ранняя кнопка предрешает финал; финальная дилемма сама по себе — не перекос', async () => {
    const tail = '// финал: один\n=== f1 ===\nраз #from:ann\n-> END\n// финал: два\n=== f2 ===\nдва #from:ann\n-> END';
    const src = `VAR x = false\n-> a\n=== a ===\nначнём #from:ann\n* [первая]\n  ~ x = true\n  -> b\n* [вторая] -> b\n=== b ===\nвыбирай #from:ann\n* {x} [да] -> f1\n* {not x} [нет] -> f2\n${tail}`;
    const res = await lint(src, { only: ['C-16'], runs: 60 });
    assert.ok(keys(res).includes('C-16.persona_share'), keys(res).join(','));
    assert.ok(keys(res).includes('C-16.button_share'), keys(res).join(','));
    const dilemma = `-> a\n=== a ===\nвыбирай #from:ann\n* [первая] -> f1\n* [вторая] -> f2\n${tail}`;
    const clean = await lint(dilemma, { only: ['C-16'], runs: 60 });
    assert.deepEqual(keys(clean), [], keys(clean).join(','));
  });

  test('C-17: до выбора между людьми от одного пять сообщений, от другого одно', async () => {
    const src = `-> a\n=== a ===\n${many(5)}\nя тоже #from:bob\nкому? #from:ann\n* [ей #to:ann] -> END\n* [ему #to:bob] -> END`;
    await has(src, 'C-17.ratio', { only: ['C-17'] });
    await hasNot(src.replace(many(5), 'одна #from:ann'), 'C-17.ratio', { only: ['C-17'] });
    // «3 против 0» — ещё не знакомство: у большего меньше C-17.min_msgs
    await hasNot(src.replace(many(5), many(2)).replace('я тоже #from:bob\n', ''), 'C-17.ratio', { only: ['C-17'] });
  });

  test('C-17: окно главы — прошлые главы не в счёт; спица хаба — не выбор между людьми', async () => {
    const pick = 'кому? #from:ann\n* [ей #to:ann] -> END\n* [ему #to:bob] -> END';
    await has(`-> ch1\n${chapters(many(2), `${many(6)}\nя тоже #from:bob\n${pick}`)}`.replace(/\n-> END$/, ''), 'C-17.ratio', { only: ['C-17'] });
    await hasNot(`-> ch1\n${chapters(many(8), `одна #from:ann\nя тоже #from:bob\n${pick}`)}`.replace(/\n-> END$/, ''), 'C-17.ratio', { only: ['C-17'] });
    const hub = `-> a\n=== a ===\n${many(6)}\nя тоже #from:bob\n- (top) кому? #from:ann\n* [ей #to:ann] -> top\n* [ему #to:bob] -> top\n* [всё] -> END`;
    await hasNot(hub, 'C-17.ratio', { only: ['C-17'] });
  });

  test('C-18: кнопка под условием уходит туда же, куда соседняя', async () => {
    const mk = (to) => `-> a\n=== a ===\nну #from:ann\n* [первая]\n  {\n  - true: -> ${to}\n  - else: -> one\n  }\n* [вторая] -> two\n=== one ===\nодин #from:ann\n-> END\n=== two ===\nдва #from:ann\n-> END`;
    await has(mk('two'), 'C-18.share', { only: ['C-18'] });
    await hasNot(mk('one'), 'C-18.share', { only: ['C-18'] });
  });

  test('C-19: хаб без выхода по условию; одинаковые строки в разных спицах', async () => {
    const src = '-> hub\n=== hub ===\nспрашивай #from:ann\n- (opts)\n* [кто ты]\n  я Аня #from:ann\n  это важно #from:ann\n  -> opts\n* [где ты]\n  дома #from:ann\n  это важно #from:ann\n  -> opts\n* [пока] -> END';
    const res = await lint(src, { only: ['C-19'] });
    assert.ok(keys(res).includes('C-19.no_exit'), keys(res).join(','));
    assert.ok(keys(res).includes('C-19.same_lines'));
    await hasNot(src.replace('* [пока] -> END', '+ [пока] -> END'), 'C-19.no_exit', { only: ['C-19'] });
  });

  // ───────── начало
  test('C-22: список новых имён в одной реплике до первой кнопки', async () => {
    const src = '-> a\n=== a ===\nвстречаемся с Арсением, Богданом, Глафирой и Евсеем у входа #from:ann\n* [да] -> END\n* [нет] -> END';
    await has(src, 'C-22.line_list', { only: ['C-22'] });
    await hasNot('-> a\n=== a ===\nвстречаемся у входа #from:ann\n* [да] -> END\n* [нет] -> END', 'C-22.line_list', { only: ['C-22'] });
  });

  test('C-23: первое сообщение — короткое приветствие без вопроса рядом', async () => {
    await has('-> a\n=== a ===\nпривет #from:ann\nэто я #from:ann\nну #from:ann\n* [да] -> END\n* [нет] -> END', 'C-23.greeting_chars', { only: ['C-23'] });
    await hasNot('-> a\n=== a ===\nпривет #from:ann\nты видел, что у тебя горит окно? #from:ann\n* [да] -> END\n* [нет] -> END', 'C-23.greeting_chars', { only: ['C-23'] });
  });

  test('C-24: в главе 1 ни срока мира, ни ставки', async () => {
    await has('-> a\n=== a ===\nну как ты #from:ann\n* [да] -> END\n* [нет] -> END', 'C-24.share', { only: ['C-24'] });
    await hasNot('-> a\n=== a ===\nмне надо успеть до утра #from:ann\n* [да] -> END\n* [нет] -> END', 'C-24.share', { only: ['C-24'] });
    // ставку из шапки засчитывают два её корня в одной реплике, а не одно общее слово
    const stake = '// ставка: к утру образцы из камеры погибнут\n-> a\n=== a ===\nиду в камеру #from:ann\n* [да] -> END\n* [нет] -> END';
    await has(stake, 'C-24.share', { only: ['C-24'] });
    await hasNot(stake.replace('иду в камеру', 'образцы в камере погибнут'), 'C-24.share', { only: ['C-24'] });
  });

  test('C-25: во второй главе все развилки сходятся', async () => {
    const src = `-> ch1\n${chapters('раз #from:ann\n* [а] -> x\n* [б] -> y\n=== x ===\nикс #from:ann\n-> ch2\n=== y ===\nигрек #from:ann\n-> ch2', `два #from:ann\n${group('ну', 'ага')}`)}`;
    const res = await has(src, 'C-25.branch_zero', { only: ['C-25'] });
    assert.equal(res.findings.find((f) => f.key === 'C-25.branch_zero').chapter, 2);
  });

  // ───────── паузы
  test('C-27: долгая пауза без причины, срок возвращения перед паузой', async () => {
    const mk = (before) => `-> a\n=== a ===\nну #from:ann\n* [да]\n* [нет]\n- ${before} #from:ann\nпродолжим #from:ann #delay:4h\n* [ок] -> END\n* [нет] -> END`;
    await has(mk('ладно'), 'C-27.long_h', { only: ['C-27'] });
    await hasNot(mk('мне на смену'), 'C-27.long_h', { only: ['C-27'] });
    await has(mk('напишу утром'), 'C-27.deadline', { only: ['C-27'] });
  });

  test('C-27: калибровка — смена собеседника, стык глав, исключение R-63, дело в процессе', async () => {
    const mk = (last, next, d) => `-> a\n=== a ===\nну #from:ann\n* [да]\n* [нет]\n- ${last} #from:ann\n${next} #delay:${d}\n* [ок] -> END\n* [нет] -> END`;
    // короткая пауза посреди разговора — подсказка; после неё пишет другой контакт — разговор не оборван
    await has(mk('смотри', 'продолжим #from:ann', '1h'), 'C-27.unexplained', { only: ['C-27'] });
    await hasNot(mk('смотри', 'это я #from:bob', '1h'), 'C-27.unexplained', { only: ['C-27'] });
    // долгая — причина нужна и при смене собеседника; без неё — только после прощания (R-63)
    await has(mk('смотри', 'это я #from:bob', '4h'), 'C-27.long_h', { only: ['C-27'] });
    await hasNot(mk('спокойной ночи', 'это я #from:bob', '4h'), 'C-27.long_h', { only: ['C-27'] });
    await has(mk('спокойной ночи', 'продолжим #from:ann', '4h'), 'C-27.long_h', { only: ['C-27'] });
    // «я иду к ним» — дело, которое займёт время: это причина
    await hasNot(mk('я иду к ним', 'продолжим #from:ann', '1h'), 'C-27.unexplained', { only: ['C-27'] });
    // короткая пауза на стыке глав — дело C-39 и C-32 п. 4
    const joint = (d) => `-> ch1\n${chapters('ну #from:ann\n* [да]\n* [нет]\n- смотри #from:ann', `продолжим #from:ann #delay:${d}\n* [ок]\n* [нет]\n-`)}`;
    await hasNot(joint('1h'), 'C-27.unexplained', { only: ['C-27'] });
    await has(joint('4h'), 'C-27.long_h', { only: ['C-27'] });
  });

  test('C-29: анонс без содержания перед паузой', async () => {
    const mk = (line) => `-> a\n=== a ===\nну #from:ann\n* [да]\n* [нет]\n- ${line} #from:ann\nвот #from:ann #delay:1h\n* [ок] -> END\n* [нет] -> END`;
    await has(mk('потом расскажу'), 'C-29.tease', { only: ['C-29'] });
    await hasNot(mk('смотри, что я нашла'), 'C-29.tease', { only: ['C-29'] });
  });

  test('C-32: «сплю» → «доброе утро» через два часа; напоминания — deferred:E-02', async () => {
    const mk = (d) => `-> a\n=== a ===\nну #from:ann\n* [да]\n* [нет]\n- спокойной ночи #from:ann\nдоброе утро #from:ann #delay:${d}\n* [ок] -> END\n* [нет] -> END`;
    const res = await has(mk('2h'), 'story.sleep_morning.min_h', { only: ['C-32'] });
    assert.ok(res.skipped.some((s) => s.check === 'C-32' && s.key === 'story.reminders.max' && /deferred:E-02/.test(s.why)), 'напоминания ждут E-02');
    await hasNot(mk('7h'), 'story.sleep_morning.min_h', { only: ['C-32'] });
  });

  test('C-33: возврат после долгой паузы даёт две строки и кнопку', async () => {
    const src = `-> a\n=== a ===\nну #from:ann\n* [да]\n* [нет]\n- вернулась #from:ann #delay:2h\nвот #from:ann\n* [ок]\n* [нет]\n- снова я #from:ann #delay:1h\n${many(8, 'дальше')}\n* [а] -> END\n* [б] -> END`;
    await has(src, 'C-33.return_min_msgs', { only: ['C-33'] });
  });

  // ───────── ритм
  test('C-36: четырнадцать сообщений подряд без события', async () => {
    await has(`-> a\n=== a ===\n${many(14)}\n* [да] -> END\n* [нет] -> END`, 'C-36.lull', { only: ['C-36'] });
    await hasNot(`-> a\n=== a ===\n${many(6)}\nправда? #from:ann\n${many(6)}\n* [да] -> END\n* [нет] -> END`, 'C-36.lull', { only: ['C-36'] });
  });

  test('C-37: «у тебя 5 минут», от которого ничего не зависит', async () => {
    await has('-> a\n=== a ===\nу тебя 5 минут #from:ann\n* [да] -> END\n* [нет] -> END', 'C-37.false_deadline', { only: ['C-37'] });
    await hasNot('-> a\n=== a ===\nу меня есть минутка #from:ann\n* [да] -> END\n* [нет] -> END', 'C-37.false_deadline', { only: ['C-37'] });
  });

  test('C-38: первая глава — почти вся история', async () => {
    const src = `-> ch1\n${chapters(`${many(30)}\n${group('да', 'нет')}`, `конец #from:ann\n${group('да', 'нет')}`)}`;
    await has(src, 'C-38.ch1_share', { only: ['C-38'] });
    const even = Array.from({ length: 5 }, () => `${many(4)}\n${group('да', 'нет')}`);
    await hasNot(`-> ch1\n${chapters(...even)}`, 'C-38.ch1_share', { only: ['C-38'] });
  });

  test('C-39: глава закрыта прощанием без крючка', async () => {
    const mk = (end) => `-> ch1\n${chapters(`раз #from:ann\n${group('да', 'нет')}\n${many(6)}\n${end} #from:ann`, `два #from:ann\n${group('да', 'нет')}`)}`;
    await has(mk('ладно, пока'), 'C-39.end_hook', { only: ['C-39'] });
    await hasNot(mk('а ты знаешь, кто он?'), 'C-39.end_hook', { only: ['C-39'] });
  });

  // ───────── финалы
  test('C-41: финал достижим на второй строке при медиане в тридцать', async () => {
    const src = `-> a\n=== a ===\nну #from:ann\n* [выйти] -> f1\n* [дальше] -> long\n* [ещё] -> long\n=== long ===\n${many(30)}\n-> f2\n// финал: ранний\n=== f1 ===\nпока #from:ann\n-> END\n// финал: поздний\n=== f2 ===\nвсё #from:ann\n-> END`;
    await has(src, 'C-41.short_warning', { only: ['C-41'] });
  });

  test('C-42: после последней кнопки час ожидания', async () => {
    const mk = (d) => `-> a\n=== a ===\nну #from:ann\n* [да]\n* [нет]\n- спасибо #from:ann #delay:${d}\nи ещё #from:bob\nвсё #from:ann\n-> END`;
    await has(mk('1h'), 'story.tail.max_delay_min', { only: ['C-42'] });
    await hasNot(mk('5m'), 'story.tail.max_delay_min', { only: ['C-42'] });
  });

  test('C-43: финал кончается вопросом; «намеренно: C-43» гасит', async () => {
    const src = '-> a\n=== a ===\nну #from:ann\n* [да] -> fin\n* [нет] -> fin\n// финал: итог\n=== fin ===\nи что теперь? #from:ann\n-> END';
    await has(src, 'C-43.open_loop', { only: ['C-43'] });
    await hasNot(src.replace('// финал: итог', '// финал: итог\n// намеренно: C-43 крючок сезона'), 'C-43.open_loop', { only: ['C-43'] });
  });

  // ───────── текст и персонажи
  test('C-44: два контакта с одинаковым профилем голоса; разные — нет', async () => {
    const same = `-> a\n=== a ===\n${Array.from({ length: 22 }, (_, i) => `ну да ${i} #from:ann\nну да ${i} #from:bob`).join('\n')}\n* [да] -> END\n* [нет] -> END`;
    await has(same, 'C-44.distance', { only: ['C-44'] });
    const diff = `-> a\n=== a ===\n${Array.from({ length: 22 }, (_, i) => `ну да ${i} #from:ann\nДобрый вечер, это снова я, номер ${i}! Вы тут? 🙂 #from:bob`).join('\n')}\n* [да] -> END\n* [нет] -> END`;
    await hasNot(diff, 'C-44.distance', { only: ['C-44'] });
  });

  test('C-45: контакт объявлен, но говорит один раз; служебный контакт не считается', async () => {
    const src = '# contact: zed, Зед\n# contact: notes, Заметки\n-> a\n=== a ===\nпривет #from:zed\nзапись #from:notes\n* [да] -> END\n* [нет] -> END';
    const res = await lint(src, { only: ['C-45'] });
    assert.ok(res.findings.some((f) => f.key === 'C-45.blocks' && /zed/.test(f.message)));
    assert.ok(!res.findings.some((f) => /notes/.test(f.message)), 'notes — служебный контакт');
  });

  test('C-46: длинная строка дважды за прохождение', async () => {
    const line = 'я всё равно вернусь к этому разговору';
    await has(`-> a\n=== a ===\n${line} #from:ann\n* [да] -> b\n* [нет] -> b\n=== b ===\n${line} #from:ann\n-> END`, 'C-46.path_repeat', { only: ['C-46'] });
  });

  test('C-47: экспозиция справкой и время игрока', async () => {
    const res = await lint('-> a\n=== a ===\nкак ты знаешь, мы сёстры #from:ann\nты наверное спишь #from:ann\n* [да] -> END\n* [нет] -> END', { only: ['C-47'] });
    assert.ok(keys(res).includes('C-47.exposition'));
    assert.ok(keys(res).includes('C-47.player_time'));
    assert.ok(res.findings.every((f) => f.model), 'C-47 — метрика-кандидат с пометкой модель');
  });

  test('C-48: имя посреди фразы, которого нет ни в контактах, ни в карточке', async () => {
    const src = '-> a\n=== a ===\nвчера видела Зорина у моста #from:ann\n* [да] -> END\n* [нет] -> END';
    await has(src, 'C-48.unknown', { only: ['C-48'] });
    await hasNot(src, 'C-48.unknown', { only: ['C-48'], meta: { synopsis: 'Зорин пропал.' } });
  });

  test('C-49: в описании число, которого нет в тексте; в питче нет роли игрока', async () => {
    const meta = { tagline: 'Пять дней тишины', synopsis: 'Аня ищет брата 9 дней.' };
    const res = await lint('-> a\n=== a ===\nну #from:ann\n* [да] -> END\n* [нет] -> END', { only: ['C-49'], meta });
    assert.ok(keys(res).includes('C-49.card_number'));
    assert.ok(keys(res).includes('C-49.no_role'));
    await hasNot('-> a\n=== a ===\nну #from:ann\n* [да] -> END\n* [нет] -> END', 'C-49.no_role', { only: ['C-49'], meta: { synopsis: 'Тебе пишет Аня.' } });
  });

  test('C-50: ответ ушёл Ане, а дальше четыре сообщения Бори', async () => {
    const src = `-> a\n=== a ===\nну? #from:ann\n* [ей #to:ann]\n* [ему #to:bob]\n- ${Array.from({ length: 4 }, (_, i) => `слушай ${i} #from:bob`).join('\n')}\nага #from:ann\n* [ок] -> END\n* [нет] -> END`;
    await has(src, 'C-50.gap', { only: ['C-50'] });
  });

  test('C-51: имя героя звучит на одних путях до реплики, на других — впервые в ней', async () => {
    const meta = { characters: [{ id: 'ann', name: 'Аня', role: 'сестра' }, { id: 'bob', name: 'Борис', role: 'брат' }] };
    const src = '-> a\n=== a ===\nну #from:ann\n* [спросить] -> x\n* [молчать] -> y\n=== x ===\nБорис звонил #from:ann\n-> y\n=== y ===\nпередай Борису привет #from:ann\n-> END';
    await has(src, 'C-51.unknown_fact', { only: ['C-51'], meta });
    await hasNot(src.replace('передай Борису привет', 'передай привет'), 'C-51.unknown_fact', { only: ['C-51'], meta });
  });

  test('C-52: переход в test_* из обычного узла — ошибка; VAR bug сработал — ошибка', async () => {
    await has('-> a\n=== a ===\nну #from:ann\n* [да] -> test_x\n* [нет] -> END\n=== test_x ===\nотладка\n-> END', 'C-52.test_entry', { only: ['C-52'] });
    const bug = 'VAR bug = ""\n-> a\n=== a ===\nну #from:ann\n* [да]\n  ~ bug = "сломалось"\n* [нет]\n- -> END';
    const res = await has(bug, 'C-52.assert', { only: ['C-52'] });
    assert.equal(res.findings.find((f) => f.key === 'C-52.assert').level, 'error');
    await hasNot(bug.replace('~ bug = "сломалось"', '~ temp ok = 1'), 'C-52.assert', { only: ['C-52'] });
  });

  test('C-54: к раскрытию приходят без улик; с двумя уликами и выбором — нет', async () => {
    const mk = (set) => `VAR clue_a = 0\nVAR clue_b = 0\n-> a\n=== a ===\nну #from:ann\n* [смотреть]\n  ${set ? '~ clue_a = 1\n  ~ clue_b = 1' : 'ничего'}\n* [${set ? 'искать' : 'уйти'}]\n  ${set ? '~ clue_a = 1\n  ~ clue_b = 1' : 'пусто'}\n- думай #from:ann\n* [ну] -> reveal\n* [да] -> reveal\n// reveal: clue_a, clue_b\n=== reveal ===\nэто был он #from:ann\n-> END`;
    await has(mk(false), 'C-54.min_clues', { only: ['C-54'] });
    await hasNot(mk(true), 'C-54.min_clues', { only: ['C-54'] });
    await hasNot(mk(true), 'C-54.gap_choice', { only: ['C-54'] });
  });

  // ───────── решения и инфраструктура
  test('C-40: без единой метки «// финал:» каждый дошедший до конца прогон — финал без метки', async () => {
    const res = await has('-> a\n=== a ===\nну #from:ann\n* [да] -> END\n* [нет] -> END', 'C-40.unmarked_run', { only: ['C-40'] });
    assert.match(res.findings[0].message, /не пройдя ни одной \/\/ финал:/);
    // общий END после размеченных веток — норма
    await hasNot('-> a\n=== a ===\nну #from:ann\n* [да] -> f1\n* [нет] -> f2\n// финал: один\n=== f1 ===\nраз #from:ann\n-> epi\n// финал: два\n=== f2 ===\nдва #from:ann\n-> epi\n=== epi ===\nэпилог #from:ann\n-> END', 'C-40.unmarked_run', { only: ['C-40'] });
  });

  test('C-21: служебный контакт notes и service: true в meta.json не считаются собеседниками', async () => {
    const src = '-> a\n=== a ===\nпривет #from:ann\nзапись #from:notes\nпульс #from:ops\n* [да] -> END\n* [нет] -> END';
    await has(src, 'C-21.from_before_first', { only: ['C-21'] });
    await hasNot(src, 'C-21.from_before_first', { only: ['C-21'], meta: { characters: [{ id: 'ops', name: 'Пульт', role: 'система', service: true }] } });
  });

  test('находка несёт владельца из owners.md §3 и пометку модель', async () => {
    const res = await lint('VAR x = 0\n-> a\n=== a ===\nну #from:ann\n* [да]\n  ~ x = 1\n* [нет]\n- как ты знаешь, всё #from:ann\n-> END', { only: ['C-01', 'C-47'] });
    assert.equal(res.findings.find((f) => f.check === 'C-01').owner, 'story-choices');
    const m = res.findings.find((f) => f.check === 'C-47');
    assert.equal(m.owner, 'story-voice');
    assert.equal(m.model, true);
  });
}
