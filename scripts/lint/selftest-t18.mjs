// Самопроверка T-18: редкая ветка и отклик в общем стволе (C-15, R-36, meaningful-choice:contra-9), длинный отросток
// хаба без флага (C-19, R-36). Дефект и чистый двойник, выдуманные истории. Подключается из selftest.mjs.
import assert from 'node:assert/strict';

const many = (n, text = 'строка') => Array.from({ length: n }, (_, i) => `${text} ${i + 1} #from:ann`).join('\n');
const chapters = (...bodies) => bodies.map((b, i) => `=== ch${i + 1} ===\nГлава ${i + 1} #sys #chapter\n${b}\n${i + 1 < bodies.length ? `-> ch${i + 2}` : '-> END'}`).join('\n');

// trunk с кнопкой: иначе всё, что в него сходится, — хвост финала. k1…k5: каждое «дальше» вдвое реже, до k5 доходит 1/16 прогонов, до его «дальше» — 1/32; остальные — в trunk
const ladder = (last, read = '') => {
  const steps = [1, 2, 3, 4].map((i) => `=== k${i} ===\nшаг ${i} #from:ann\n* [дальше] -> k${i + 1}\n* [хватит] -> trunk`).join('\n');
  return `VAR x = false\n-> k1\n${steps}\n=== k5 ===\nшаг 5 #from:ann\n* [дальше]\n  ${last}\n* [хватит] -> trunk\n=== trunk ===\nобщее #from:ann\n${read}\n* [ну]\n* [ладно]\n- -> END`;
};
const R = { runs: 400 };

export function register(test, { has, hasNot, lint, keys }) {
  test('C-15 (е): редкая ветка длиннее C-15.rare_branch_msgs; короткая — нет; финал не в счёт', async () => {
    const secret = (n) => `${ladder('-> secret')}\n=== secret ===\n${many(n)}\n-> trunk`;
    await has(secret(16), 'C-15.rare_branch_msgs', { only: ['C-15'], ...R });
    await hasNot(secret(5), 'C-15.rare_branch_msgs', { only: ['C-15'], ...R });
    // ветка из двух узлов и общего туннеля посередине (его зовёт и ствол) — одна ветка: 8 + 8
    const split = `${ladder('-> s1', '-> help ->')}\n=== s1 ===\n${many(8)}\n-> help ->\n-> s2\n=== s2 ===\n${many(8, 'ещё')}\n-> trunk\n=== help ===\nвставка #from:ann\n->->`;
    const res = await has(split, 'C-15.rare_branch_msgs', { only: ['C-15'], ...R });
    assert.match(res.findings.find((f) => f.key === 'C-15.rare_branch_msgs').message, /s1 → s2/);
    // редкий финал — не необязательная сторона
    await hasNot(`${ladder('-> fin')}\n=== fin ===\n${many(16)}\n-> END`, 'C-15.rare_branch_msgs', { only: ['C-15'], ...R });
  });

  test('C-15 (е): кнопку жмут реже доли, под ней длинный текст в общем узле', async () => {
    const opts = (n) => Array.from({ length: 11 }, (_, i) => `* [вариант ${i + 1}]\n  ок #from:ann`).join('\n') + `\n* [длинный]\n${many(n).replace(/^/gm, '  ')}`;
    const src = (n) => `-> a\n=== a ===\nвыбирай #from:ann\n${opts(n)}\n- дальше #from:ann\n-> END`;
    await has(src(16), 'C-15.rare_branch_msgs', { only: ['C-15'], ...R });
    await hasNot(src(4), 'C-15.rare_branch_msgs', { only: ['C-15'], ...R });
  });

  test('C-15 (ж): отклик в общем стволе на переменную, которую пишут единицы прогонов; смена паузы — не отклик', async () => {
    await has(ladder('~ x = true\n  -> trunk', '{x: я помню, что ты выбрал}'), 'C-15.echo_skip_share', { only: ['C-15'], ...R });
    await has(ladder('~ x = true\n  -> trunk', '{x:\n  ты дошёл до конца #from:ann\n- else:\n  ну ладно #from:ann\n}'), 'C-15.echo_skip_share', { only: ['C-15'], ...R });
    await hasNot(ladder('~ x = true\n  -> trunk', '{x:\n  дальше #from:ann #delay:2m\n- else:\n  дальше #from:ann #delay:40m\n}'), 'C-15.echo_skip_share', { only: ['C-15'], ...R });
    // переменную пишут в большинстве прогонов — отклик в стволе к месту
    const common = 'VAR x = false\n-> a\n=== a ===\nну #from:ann\n* [да]\n  ~ x = true\n* [нет]\n- {x: я помню, что ты выбрал}\n-> END';
    await hasNot(common, 'C-15.echo_skip_share', { only: ['C-15'], ...R });
  });

  test('C-19 п. 8: отросток длиннее C-19.spur_msgs без флага; флаг, прочтённый рядом, гасит', async () => {
    const hub = (spoke, exit = '+ [пока] -> END', head = '') => `${head}-> hub\n=== hub ===\nспрашивай #from:ann\n- (opts)\n* [кто ты]\n${spoke}\n  -> opts\n* [где ты]\n  дома #from:ann\n  а ты? #from:ann\n  -> opts\n${exit}`;
    const long = `  я Аня #from:ann\n${many(3).replace(/^/gm, '  ')}`;
    const res = await has(hub(long), 'C-19.spur_msgs', { only: ['C-19'] });
    assert.match(res.findings.find((f) => f.key === 'C-19.spur_msgs').message, /без флага/);
    await hasNot(hub('  я Аня #from:ann\n  и всё #from:ann'), 'C-19.spur_msgs', { only: ['C-19'] });
    await hasNot(hub(`  ~ asked = true\n${long}`, '+ {asked} [пока] -> END', 'VAR asked = false\n'), 'C-19.spur_msgs', { only: ['C-19'] });
    // метка спицы — тоже флаг: счётчик посещений читается в условии выхода
    await hasNot(hub(long, '+ {opts.who} [пока] -> END').replace('* [кто ты]', '* (who) [кто ты]'), 'C-19.spur_msgs', { only: ['C-19'] });
    // туннель из спицы — её реплики
    const tunnel = `${hub('  -> story_of_ann ->')}\n=== story_of_ann ===\n${many(4)}\n->->`;
    await has(tunnel, 'C-19.spur_msgs', { only: ['C-19'] });
  });

  test('C-19 п. 8: флаг отростка читают только через две главы — находка', async () => {
    const hubBody = '- (opts) спрашивай #from:ann\n* [кто ты]\n  ~ asked = true\n' + many(4).replace(/^/gm, '  ') + '\n  -> opts\n* [где ты]\n  дома #from:ann\n  а ты? #from:ann\n  -> opts\n+ [пока]';
    const far = `VAR asked = false\n-> ch1\n${chapters(hubBody, 'тихо #from:ann', 'ещё тише #from:ann', '{asked: ты спрашивал, кто я}')}`;
    const res = await lint(far, { only: ['C-19'] });
    const f = res.findings.find((x) => x.key === 'C-19.spur_msgs');
    assert.ok(f, keys(res).join(','));
    assert.match(f.message, /asked/);
    const near = `VAR asked = false\n-> ch1\n${chapters(hubBody, '{asked: ты спрашивал, кто я}', 'тихо #from:ann')}`;
    await hasNot(near, 'C-19.spur_msgs', { only: ['C-19'] });
  });
}
