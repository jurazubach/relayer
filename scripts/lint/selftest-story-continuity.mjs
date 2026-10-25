// Самопроверка C-51 (story-continuity): знакомство в узле с двумя входами, время в кнопке и во входящей, фото,
// реестр facts.md. Дефект и чистый двойник, выдуманные истории. Подключается из selftest.mjs.
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseFacts } from './checks/C-51.mjs';

const meta = { characters: [{ id: 'vera', name: 'Вера', role: 'соседка' }, { id: 'gleb', name: 'Глеб', role: 'сторож' }] };
const only = ['C-51'];

// развилка: на одном пути Глеб пишет игроку раньше, на другом — нет; оба пути сходятся в yard
const fork = (yard) => `-> start\n=== start ===\nну что #from:vera\n* [К Глебу] -> gleb_first\n* [Сразу во двор] -> yard\n=== gleb_first ===\nэто Глеб, сторож #from:gleb\n-> yard\n=== yard ===\n${yard}\n-> END`;

/** facts.md во временной папке: C-51 читает её вместо docs/stories, пока стоит RELAYER_FACTS_DIR. */
async function withFacts(md, fn) {
  const dir = mkdtempSync(join(tmpdir(), 'c51-'));
  mkdirSync(join(dir, 'synthetic'));
  writeFileSync(join(dir, 'synthetic', 'facts.md'), md);
  const prev = process.env.RELAYER_FACTS_DIR;
  process.env.RELAYER_FACTS_DIR = dir;
  try { return await fn(); } finally {
    if (prev == null) delete process.env.RELAYER_FACTS_DIR; else process.env.RELAYER_FACTS_DIR = prev;
    rmSync(dir, { recursive: true, force: true });
  }
}

const FACTS = `# Факты · synthetic

## Хронология
| время мира | событие | кто знает |
|---|---|---|
| 23:10 | у ворот гаснет фонарь | Глеб |

## Реестр
| факт | слова | значение | переменная | кто знает |
|---|---|---|---|---|
| фонарь у ворот | фонар | 23:10 | knows_lamp | gleb |
| кем назвался игрок | курьер | — | cover | vera |
`;

export function register(test, { has, hasNot }) {
  test('C-51 (б): контакт знаком на одном входе — находка; вставка {x: …|…} и условие гасят', async () => {
    await has(fork('привет, я Глеб, сторож #from:gleb'), 'C-51.met_twice', { only, meta });
    await hasNot(fork('{gleb_first: снова я|привет, я Глеб, сторож} #from:gleb'), 'C-51.met_twice', { only, meta });
    await hasNot(fork('{gleb_first:\n  снова я #from:gleb\n- else:\n  привет, я Глеб, сторож #from:gleb\n}'), 'C-51.met_twice', { only, meta });
  });

  test('C-51 (б): возврат из туннеля — не новый вход в узел', async () => {
    // Глеб говорит впервые в yard на всех путях; после туннеля он «уже знаком», но это тот же вход
    const src = '-> start\n=== start ===\nну что #from:vera\n* [Налево] -> left\n* [Направо] -> yard\n=== left ===\nналево так налево #from:vera\n-> yard\n=== yard ===\nэто Глеб #from:gleb\n-> note ->\nи ещё одно #from:gleb\n-> END\n=== note ===\nзаметка #sys\n->->';
    await hasNot(src, 'C-51.met_twice', { only, meta });
  });

  test('C-51 (а): время в кнопке без условия — находка; во входящей и на фото — нет', async () => {
    const src = (yard) => `-> start\n=== start ===\nну что #from:vera\n* [Спросить] -> told\n* [Молчать] -> yard\n=== told ===\nфонарь погас в 23:10 #from:vera\n-> yard\n=== yard ===\n${yard}\n-> END`;
    await has(src('и что теперь #from:vera\n* [Почему в 23:10?]\n* [Ладно]\n- ок #from:vera'), 'C-51.unknown_fact', { only, meta });
    await hasNot(src('погас в 23:10, представь #from:vera\n* [Почему?]\n* [Ладно]\n- ок #from:vera'), 'C-51.unknown_fact', { only, meta });
    await hasNot(src('журнал: 23:10 свет выключен #from:vera #photo\n* [Почему?]\n* [Ладно]\n- ок #from:vera'), 'C-51.unknown_fact', { only, meta });
  });

  test('C-51 (а): слово из реестра facts.md упомянуто до того, как игрок о нём узнал', async () => {
    const src = (yard) => `-> start\n=== start ===\nну что #from:vera\n* [Спросить] -> told\n* [Молчать] -> yard\n=== told ===\nу ворот погас фонарь #from:vera\n-> yard\n=== yard ===\n${yard}\n-> END`;
    await withFacts(FACTS, async () => {
      await has(src('я про тот фонарь #from:vera'), 'C-51.unknown_fact', { only, meta });
      await hasNot(src('я про ворота #from:vera'), 'C-51.unknown_fact', { only, meta });
    });
    // без facts.md слово реестра — не факт
    await hasNot(src('я про тот фонарь #from:vera'), 'C-51.unknown_fact', { only, meta });
  });

  test('parseFacts: хронология, реестр со словами, время для C-49', () => {
    const f = parseFacts(FACTS);
    assert.equal(f.chronology.length, 1);
    assert.deepEqual(f.registry.map((r) => [r.fact, r.words, r.value, r.variable]), [['фонарь у ворот', ['фонар'], '23:10', 'knows_lamp'], ['кем назвался игрок', ['курьер'], '', 'cover']]);
    assert.ok(f.times.has('23:10'));
  });
}
