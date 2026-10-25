// Самопроверка проверок story-cast: C-50 не дублирует C-10 «ответил не тот» (решение королевы, S-choices-v2) и не
// считает пустотой «Прочитано» в чате адресата, прощание и вопрос, на который уже ответили прошлой развилкой.
// Дефект и чистый двойник, выдуманные истории. Подключается из selftest.mjs.
import assert from 'node:assert/strict';

const head = '# contact: vera, Вера, teal\n# contact: gleb, Глеб, amber\n# contact: shop, Скидки «Парус», lime\n-> a\n=== a ===\nну что #from:vera\n';
const talk = (n, who = 'gleb') => Array.from({ length: n }, (_, i) => `  слушай ${i + 1} #from:${who}`).join('\n');
// кнопка к Вере, под ней четыре реплики Глеба, Вера молчит до следующей развилки
const fork = (button, body = talk(4)) => `${head}* [${button} #to:vera]\n${body}\n* [Пока #to:vera]\n  пока #from:vera\n- -> b\n=== b ===\n* [да #to:vera]\n* [нет #to:vera]\n- -> END`;

export function register(test, { has, hasNot, lint, keys }) {
  test('C-50 × C-10: кнопку-вопрос и обращение по имени держит C-10, C-50 на том же месте молчит', async () => {
    for (const button of ['Где ключ?', 'Вера, ключ у тебя']) {
      const res = await lint(fork(button), { only: ['C-10', 'C-50'] });
      assert.ok(keys(res).includes('C-10.wrong_responder'), `${button}: C-10 должна поймать, есть: ${keys(res).join(', ')}`);
      assert.ok(!keys(res).includes('C-50.gap'), `${button}: C-50 дублирует C-10`);
    }
    // без C-10 в прогоне C-50 всё равно не берёт её место
    await hasNot(fork('Где ключ?'), 'C-50.gap', { only: ['C-50'] });
    // вставка {…} в тексте кнопки: место C-10 узнаётся и по вычисленному тексту
    await hasNot(`VAR who = "Вера"\n${fork('{who}, ключ у тебя?')}`, 'C-50.gap', { only: ['C-50'] });
  });

  test('C-50: утверждение к Вере, а дальше говорит Глеб — остальное «в пустоту» ловит C-50, не C-10', async () => {
    const res = await lint(fork('Ключ у меня'), { only: ['C-10', 'C-50'] });
    assert.ok(keys(res).includes('C-50.gap'), keys(res).join(', '));
    assert.ok(!keys(res).includes('C-10.wrong_responder'));
    // Вера ответила в пределах C-50.gap — не пустота
    await hasNot(fork('Ключ у меня', '  ок #from:vera\n' + talk(4)), 'C-50.gap', { only: ['C-50'] });
  });

  test('C-50: «Прочитано» в чате адресата и прощание — молчание показано, ответ не потерян', async () => {
    await hasNot(fork('Ключ у меня', '  Прочитано #sys:vera\n' + talk(4)), 'C-50.gap', { only: ['C-50'] });
    await hasNot(fork('Спокойной ночи', talk(4)), 'C-50.gap', { only: ['C-50'] });
  });

  test('C-50 (б): шум между вопросом и кнопкой; вопрос, закрытый прошлой развилкой, — не в счёт', async () => {
    const noisy = `${head}ты где? #from:vera\n−20% на зонты #from:shop\n* [дома #to:vera]\n* [в пути #to:vera]\n- -> END`;
    await has(noisy, 'C-50.interrupt', { only: ['C-50'] });
    // шум пришёл после ответа на вопрос: следующая развилка вопроса не ждёт
    const later = `${head}ты где? #from:vera\n* [дома #to:vera]\n* [в пути #to:vera]\n- ясно #from:vera\n−20% на зонты #from:shop\n* [ок #to:vera]\n* [пока #to:vera]\n- -> END`;
    await hasNot(later, 'C-50.interrupt', { only: ['C-50'] });
  });

  test('C-50 (в): шум больше C-50.noise_share в главе; служебный и отвечаемый — не шум; кнопка без #to отвечает говорящему', async () => {
    const promo = (n) => Array.from({ length: n }, (_, i) => `−${i + 10}% на зонты #from:shop`).join('\n');
    const chat = (extra) => `${head}${talk(4).replace(/^  /gm, '').replace(/gleb/g, 'vera')}\n${extra}\n* [ок #to:vera]\n* [нет #to:vera]\n- -> END`;
    await has(chat(promo(3)), 'C-50.noise_share', { only: ['C-50'] });
    await hasNot(chat(promo(3)), 'C-50.noise_share', { only: ['C-50'], meta: { characters: [{ id: 'shop', name: 'Скидки', role: 'рассылка', service: true }] } });
    await hasNot(chat(promo(3)).replace('* [нет #to:vera]', '* [отписаться #to:shop]'), 'C-50.noise_share', { only: ['C-50'] });
    // кнопки без #to: в открытом чате отвечают Вере — она не шум
    const plain = '# contact: vera, Вера, teal\n-> a\n=== a ===\nну что? #from:vera\nты где? #from:vera\n* [дома]\n* [в пути]\n- ясно #from:vera\n-> END';
    await hasNot(plain, 'C-50.noise_share', { only: ['C-50'] });
    await hasNot(plain, 'C-50.interrupt', { only: ['C-50'] });
  });
}
