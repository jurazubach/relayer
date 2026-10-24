// Самопроверка очистки: вымышленная история «Маяк» вместо наших, чтобы тест не зависел от каталога.
// Запуск: npm run test:kb:clean
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMatcher, nameForms } from './story-terms.mjs';
import { cleanFile, declaredIds, splitSentences, splitRow } from './clean.mjs';

const story = (id, extra) => ({
  id,
  title: 'Тихий маяк',
  series: null,
  label: 'Тихий маяк',
  characters: [{ id: 'gwen', name: 'Гвен' }, { id: 'oskar', name: 'Оскар Вейл' }],
  ink: [
    '# contact: gwen, Гвен, blue',
    '# contact: ghost, Неизвестный номер, grey',
    'VAR lamp_lit = false',
    '=== ch1 ===',
    '=== ch1_hub ===',
    '=== tower ===',
    extra ?? '',
  ].join('\n'),
});
const lighthouse = { ...story('tihiy-mayak'), title: 'Тихий маяк' };
const other = { ...story('drugaya'), title: 'Сухой лист', characters: [{ id: 'ruth', name: 'Рут' }], ink: '=== ch1_hub ===\nVAR leaf = 0' };
const m = buildMatcher([lighthouse, other]);

test('падежи имён и названий', () => {
  assert.deepEqual(nameForms('Гвен'), ['Гвен', 'Гвена', 'Гвену', 'Гвеном', 'Гвене']);
  assert.ok(m.has('у Оскара на столе'));
  assert.ok(m.has('в «Тихом маяке» ночь'));
  assert.ok(!m.has('тихий маяк вдали'), 'строчное — обычные слова');
  assert.ok(m.has('узел `tower`'));
  assert.ok(!m.has('tower стоит голым словом'), 'простое слово — только в коде');
  assert.ok(m.has('`// role gwen: свидетель`'), 'id контакта внутри кода');
  assert.ok(!m.has('`ch1` и `ghost`'), 'номера глав и роли — общие');
  assert.ok(m.has('-> lamp_lit', { code: true }));
});

test('неоднозначный узел относится к истории из контекста', () => {
  const hits = m.find('`ch1_hub`');
  assert.deepEqual(m.resolve(hits), ['drugaya', 'tihiy-mayak']);
  assert.deepEqual(m.resolve(hits, ['drugaya']), ['drugaya']);
});

test('предложения не рвутся на сокращениях', () => {
  assert.deepEqual(splitSentences('См. гл. 2. Потом «Гвен» пишет. Это всё.'), ['См. гл. 2.', 'Потом «Гвен» пишет.', 'Это всё.']);
  assert.deepEqual(splitRow('| a | `x|y` | b \\| c |'), ['a', '`x|y`', 'b \\| c']);
});

const SRC = `# Принципы

### P-01. Держи одну вещь ядра
- **Суть:** одна вещь лучше трёх.
- **В relayer:** до первой кнопки звучит ядро. В «Тихом маяке» это свет, который гаснет сам. Отсюда и страх.
- **Пример:** Гвен пишет «свет погас» (\`tower\`).
- **Пример:**
  \`\`\`ink
  свет погас #from:gwen
  \`\`\`
- **Как проверить:** выпиши сущности (в \`tihiy-mayak\` их пять) до первой кнопки.

### P-02. Как устроен «Тихий маяк»
- **Суть:** всё держится на Оскаре.

### PAT-01. Вход без предыстории
- **Суть:** начинать с события.
  - вложенный пункт про Гвен
    - и его подпункт

## Флаги

| ID | признак | как обнаружить |
|---|---|---|
| RED-01 | Кнопка ничего не меняет | Скрипт: запись без чтения. В \`tihiy-mayak\` — \`lamp_lit\` |
| RED-02 | Гвен молчит | Глазами |
| GREEN-01 | Пауза с обещанием | Глазами |

| узел | доля |
|---|---|
| \`tower\` | 30% |
| общий | 70% |

## 4. Разбор наших историй

**«Тихий маяк».** Коридор, выборы не держатся.
1. В \`ch1_hub\` всё сходится.

**«Сухой лист».** Рут ведёт игрока.

## 5. Что не подходит
- Длинные письма.
`;

test('чистка файла: пункты на месте, упоминаний нет', () => {
  const { text, records } = cleanFile(SRC, m);
  for (const line of text.split('\n')) assert.ok(!m.has(line), `осталось упоминание: ${line}`);
  assert.deepEqual(declaredIds(text), declaredIds(SRC));

  assert.match(text, /- \*\*В relayer:\*\* до первой кнопки звучит ядро\.\n/, 'предложение вырезано, правило осталось, «Отсюда» ушло следом');
  assert.match(text, /- \*\*Как проверить:\*\* выпиши сущности до первой кнопки\./, 'скобка с упоминанием вырезана');
  assert.doesNotMatch(text, /\*\*Пример:\*\*/, 'примеры ушли, пустая метка над кодом тоже');
  assert.match(text, /### P-02\. Пункт про наши истории\n\n> Пункт целиком/, 'пункт про историю помечен');
  assert.match(text, /- \*\*Суть:\*\* начинать с события\.\n(?!\s+-)/, 'вложенный пункт ушёл вместе с подпунктом');
  assert.match(text, /\| RED-01 \| Кнопка ничего не меняет \| Скрипт: запись без чтения\. \|/);
  assert.match(text, /\| RED-02 \| вынесено: пункт про наши истории \| — \|/);
  assert.doesNotMatch(text, /30%/, 'строка таблицы без пункта ушла целиком');
  assert.match(text, /## 4\. Разбор наших историй\n\n> Раздел про наши истории вынесен/);
  assert.match(text, /## 5\. Что не подходит\n- Длинные письма\./);

  const section = records.filter((r) => r.kind === 'section');
  assert.deepEqual(section.map((r) => r.stories), [['tihiy-mayak'], ['drugaya']], 'раздел делится по историям');
  assert.ok(section[0].lines.some((l) => l.includes('ch1_hub')), 'неоднозначный узел остался у своей истории');
  assert.ok(records.every((r) => r.section && r.lines.length && r.stories.length));
});

test('повторный запуск даёт то же самое', () => {
  assert.equal(cleanFile(SRC, m).text, cleanFile(SRC, m).text);
  const once = cleanFile(SRC, m).text;
  assert.equal(cleanFile(once, m).text, once, 'очищенное больше не меняется');
});
