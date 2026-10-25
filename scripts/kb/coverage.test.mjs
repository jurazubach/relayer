// Самопроверка story:coverage: синтетическая база из двух вымышленных разборов и своих скиллов, плюс
// сверка с настоящей базой (владельцы owners.md §8, свежесть clusters.json). Запуск: npm run test:coverage
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildMatrix, loadKnowledge, main, sourcesMd, affected, fidelitySample, record, clustersFileContent, ownerDups, PATHS } from './coverage.mjs';
import { statusError } from './kb-status.mjs';
import { parseOpora } from './kb-owners.mjs';
import { aliasResolver, plain } from './kb-rows.mjs';

const LONG = 'Смотритель переправы отвечает только на прямой вопрос, а паромщик молчит до третьего гудка. ';

const BOOKS = {
  'alpha-ferry': {
    'principles.md': `# Принципы

### P-01. Держи переправу на одном гудке
- **Суть:** Каждый гудок парома меняет расписание переправы.
- **Как проверить:** ботом.

### P-02. Паромщик отвечает с задержкой
- **Суть:** Задержка паромщика — событие, а не пауза.
- **Нюансы:** не работает ночью, когда переправа закрыта; на 5 сообщениях задержка одна.

# Устройство авторских систем

## S-1. Расписание гудков
Шаги: гудок → ответ → отплытие.

## S-2. Журнал переправы
Записи по дням.

# Нюансы к принципам

- **P-01.** *Не работает:* если гудков больше трёх подряд.
`,
    'patterns.md': `### PAT-01. Гудок с вопросом
Приём держится на P-01: вопрос в конце гудка.
`,
    'flags.md': `| код | признак | почему |
|---|---|---|
| GREEN-01 | Гудок назван | расписание видно (P-01) |
| RED-01 | Паромщик молчит без причины | молчание без события (P-02) |
`,
    'lessons.md': `### LESSON-01. Расписание сверяли с журналом
Урок к P-02.
`,
    'for-relayer.md': `# Выжимка

## 6. Согласия и противоречия

**Согласия:**
- *Гудок как событие.* \`alpha-ferry:P-01\` = \`beta-lamp:P-01\`.

**Противоречия и как их решать:**
- *Тишина против гудка.* P-02 требует задержки, \`beta-lamp:P-02\` — ответа сразу. **Решение:** задержка с причиной.
`,
    'attention.md': `# Внимание

## 1. Минимальные версии
Один гудок на сцену.

## 2. Тридцать секунд
Гудок в первом сообщении.
`,
  },
  'beta-lamp': {
    'principles.md': `### P-01. Фонарь зажигают по сигналу
- **Суть:** Сигнал фонаря отвечает гудку переправы.

### P-02. Ответ сразу
- **Суть:** Смотритель отвечает без задержки.
`,
    'flags.md': `| код | признак |
|---|---|
| RED-01 | Фонарь не горит |
`,
  },
};

const PLAYBOOK = {
  'rules.md': `# Правила

**R-01. Гудок в первом сообщении.**
Почему: так.
Источники: alpha-ferry:P-01, alpha-ferry:PAT-01
`,
  'checks.md': `### C-01. Мёртвый гудок\nНайти гудок без ответа.\n`,
  'skills.md': `| F-01 | Вернуть гудок | гудок пропал | шаги | готово |\n`,
  'attention-merged.md': `# Внимание {#attn}

## 1. Переправа {#attn-ferry}
- Гудок раз в сцену (\`alpha-ferry:attention§1\`, \`alpha-ferry:attention§1\`).
`,
  'owners.md': `# Владельцы

## 1. Сводка по скиллам

| скилл | вход |
|---|---|
| \`story-alpha\` | да |
| \`story-beta\` | |
| \`story:lint\` (инфраструктура) | — |

## 2. Правила

| ID | тема | владелец | файл | ссылаются |
|---|---|---|---|---|
| R-01 | гудок | \`story-alpha\` | \`hooks.md\` | \`story-beta\` |

## 3. Проверки

| ID | проверка | владелец | файл | ссылаются |
|---|---|---|---|---|
| C-01 | мёртвый гудок | \`story-beta\` | \`echo.md\` | — |

## 4. Приёмы

| ID | приём | владелец | файл | ссылаются |
|---|---|---|---|---|
| F-01 | вернуть гудок | \`story-beta\` | \`fixes/F-01-hook.md\` | \`story-alpha\` |

## 5. Кластеры

| ID | тема | владелец | файл | опора | ссылаются |
|---|---|---|---|---|---|
| TH-01 | гудки переправы | \`story-alpha\` | \`hooks.md\` | R-01; \`alpha:P-01\`…\`P-02\`, GREEN-01 | \`story-beta\` |
| TH-02 | фонари | \`story-beta\` | \`decisions-lamp.md\` | \`beta-lamp:P-02\`; \`alpha:attention§2\` | — |
| TH-03 | противоречия | \`story-beta\` | \`contradictions.md\` | наше | — |

## 6. Разделы

| якорь | раздел | владелец | файл | ссылаются |
|---|---|---|---|---|
| #attn-ferry | переправа | \`story-beta\` | \`attention.md\` | — |
`,
  'superseded.md': `# Отменено

## База: что отменено

### Гудок по часам (A-01)

| ID | что советует | в силе | чем заменено |
|---|---|---|---|
| \`beta-lamp:RED-01\` | фонарь по часам | — | R-01 |
| \`beta-lamp:P-01\` | сигнал по часам | сам сигнал | R-01 |
`,
  'build-plan.md': `## 11. Фичи\n- [ ] **E-01. Режимы.**\n`,
};

function thresholds() {
  const all = JSON.parse(readFileSync(PATHS.thresholds, 'utf8'));
  const keep = ['skill.coverage.block_min_chars', 'skill.coverage.key_terms', 'skill.coverage.key_terms_min', 'lab.fidelity.sample', 'lab.fidelity.min_share'];
  const out = Object.fromEntries(keep.map((k) => [k, all[k]]));
  out['story.test.ferry'] = { value: 3, unit: 'гудка', level: null, basis: 'our_estimate', sources: ['alpha-ferry:P-02'], checks: [], calibrated_on: null, history: [{}] };
  return out;
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'coverage-'));
  const w = (rel, text) => {
    mkdirSync(join(root, rel, '..'), { recursive: true });
    writeFileSync(join(root, rel), text);
  };
  for (const [alias, files] of Object.entries(BOOKS)) for (const [f, t] of Object.entries(files)) w(`books/${alias}/${f}`, t);
  for (const [f, t] of Object.entries(PLAYBOOK)) w(`playbook/${f}`, t);
  w('playbook/thresholds.json', JSON.stringify(thresholds()));
  mkdirSync(join(root, 'skills'), { recursive: true });
  mkdirSync(join(root, 'lint'), { recursive: true });
  const paths = {
    root,
    books: join(root, 'books'),
    playbook: join(root, 'playbook'),
    skills: join(root, 'skills'),
    lintChecks: join(root, 'lint'),
    mutants: join(root, 'mutants'),
    clusters: join(root, 'playbook/clusters.json'),
    coverage: join(root, 'playbook/coverage.json'),
    thresholds: join(root, 'playbook/thresholds.json'),
    plan: join(root, 'playbook/build-plan.md'),
  };
  return { root, w, paths, done: () => rmSync(root, { recursive: true, force: true }) };
}

const run = (paths) => {
  const res = buildMatrix({ paths });
  return { res, row: (id) => res.matrix.find((x) => x.id === id) };
};

function quiet(fn) {
  const log = console.log;
  const err = console.error;
  const out = [];
  console.log = (...a) => out.push(a.join(' '));
  console.error = (...a) => out.push(a.join(' '));
  try {
    return { code: fn(), out: out.join('\n') };
  } finally {
    console.log = log;
    console.error = err;
  }
}

test('строки: ID, нюансы, системы, противоречия, attention, свод', () => {
  const f = fixture();
  try {
    const { res, row } = run(f.paths);
    const ids = res.matrix.map((x) => x.id);
    for (const id of ['alpha-ferry:P-01', 'alpha-ferry:PAT-01', 'alpha-ferry:GREEN-01', 'alpha-ferry:RED-01', 'alpha-ferry:LESSON-01', 'beta-lamp:RED-01', 'R-01', 'C-01', 'F-01', '#attn-ferry']) {
      assert.ok(ids.includes(id), id);
    }
    assert.equal(row('alpha-ferry:P-01#нюанс').kind, 'nuance', 'нюанс из раздела «Нюансы»');
    assert.equal(row('alpha-ferry:P-02#нюанс').kind, 'nuance', 'нюанс строкой внутри записи');
    assert.deepEqual(ids.filter((x) => x.includes(':SYS-')).sort(), ['alpha-ferry:SYS-1', 'alpha-ferry:SYS-2']);
    assert.deepEqual(ids.filter((x) => x.includes(':contra-')), ['alpha-ferry:contra-1'], 'согласие — связь, а не строка');
    assert.ok(ids.includes('alpha-ferry:attention§1') && ids.includes('alpha-ferry:attention§2'));
    assert.ok(!ids.includes('#attn'), 'обёртка без текста — не строка');
  } finally {
    f.done();
  }
});

test('кластеры и владельцы из owners.md', () => {
  const f = fixture();
  try {
    const { row } = run(f.paths);
    assert.equal(row('alpha-ferry:P-01').cluster, 'K-R-01', 'правило с «Источниками» собирает кластер');
    assert.equal(row('alpha-ferry:PAT-01').cluster, 'K-R-01');
    assert.equal(row('beta-lamp:P-01').cluster, 'K-R-01', 'согласие пристраивается к кластеру своей головой');
    assert.equal(row('alpha-ferry:P-02').owner_via, 'opora', 'диапазон «P-01…P-02» в опоре');
    assert.equal(row('beta-lamp:P-01').owner_skill, 'story-alpha', 'без своей опоры — по кластеру');
    assert.equal(row('beta-lamp:P-01').owner_via, 'cluster');
    assert.equal(row('alpha-ferry:P-01#нюанс').owner_skill, 'story-alpha');
    assert.equal(row('alpha-ferry:attention§1').owner_skill, 'story-beta', 'раздел attention — по якорю, который его цитирует');
    assert.equal(row('alpha-ferry:attention§2').th, 'TH-02', '«алиас:attention§N» в опоре');
    assert.equal(row('R-01').target, 'story-alpha/hooks.md#R-01');
    assert.equal(row('#attn-ferry').target, 'story-beta/attention.md#attn-ferry');
    assert.equal(row('beta-lamp:RED-01').owner_skill, null, 'без опоры и ссылок — без владельца');
  } finally {
    f.done();
  }
});

test('статусы: отменённое из superseded.md, фиксированные причины rejected', () => {
  const f = fixture();
  try {
    const { res, row } = run(f.paths);
    assert.equal(row('beta-lamp:RED-01').status, 'superseded:A-01');
    assert.equal(row('beta-lamp:P-01').status, 'used', 'часть «в силе» остаётся знанием');
    assert.equal(row('beta-lamp:P-01').partial, 'A-01');
    const ctx = { rows: new Map(res.matrix.map((x) => [x.id, x])), clusters: new Set(['K-R-01']), features: new Set(['E-01']) };
    assert.equal(statusError('rejected:not-our-format', ctx), null);
    assert.equal(statusError('rejected:duplicate:K-R-01', ctx), null);
    assert.equal(statusError('rejected:contradicts:D-03', ctx), null);
    assert.match(statusError('rejected:надоело', ctx), /не из списка/);
    assert.match(statusError('rejected:not-our-format:потому что', ctx), /без уточнения/);
    assert.match(statusError('rejected:duplicate:K-нет', ctx), /нет кластера/);
    assert.equal(statusError('deferred:E-01', ctx), null);
    assert.match(statusError('deferred:E-99', ctx), /нет фичи/);
    assert.match(statusError('merged-into:R-77', ctx), /нет строки/);
    assert.match(statusError('done', ctx), /неизвестный статус/);
  } finally {
    f.done();
  }
});

test('уровни: L0 без скилла, L1 sources.md и слабый блок, L2 блок, L3 исполняемо', () => {
  const f = fixture();
  try {
    assert.equal(run(f.paths).row('alpha-ferry:P-01').level, 'L0');
    f.w('skills/story-alpha/SKILL.md', '# story-alpha\n');
    f.w('skills/story-alpha/references/sources.md', '- `alpha-ferry:P-01`\n- `alpha-ferry:PAT-01`\n- `R-01`\n');
    let r = run(f.paths);
    assert.equal(r.row('alpha-ferry:P-01').level, 'L1', 'только sources.md — L1');
    assert.equal(r.row('alpha-ferry:P-02').level, 'L0');

    f.w('skills/story-alpha/references/hooks.md', `# Гудки

## Один гудок \`alpha:P-01\`
Коротко.

## Задержка \`alpha-ferry:P-02\`
Задержка паромщика — событие переправы. ${LONG.repeat(3)} Не работает, когда переправа закрыта. Порог — ключ \`story.test.ferry\`.

## Нюанс к \`alpha-ferry:P-01#нюанс\`
${LONG.repeat(3)} Гудков больше трёх подряд — правило не работает.
`);
    r = run(f.paths);
    assert.equal(r.row('alpha-ferry:P-01').level, 'L1', 'слишком короткий блок — не покрытие');
    assert.match(r.row('alpha-ferry:P-01').why.join(' '), /короче/);
    assert.equal(r.row('alpha-ferry:P-02').level, 'L2', 'блок с терминами, «не работает» и ключом порога');
    assert.equal(r.row('alpha-ferry:P-01#нюанс').level, 'L2', 'нюанс закрывается своим блоком');

    f.w('skills/story-alpha/references/hooks.md', `## Задержка \`alpha-ferry:P-02\`\n${LONG.repeat(4)} Не работает ночью.\n`);
    r = run(f.paths);
    assert.equal(r.row('alpha-ferry:P-02').level, 'L1', 'нет ключа thresholds.json, хотя строка в его опоре');
    assert.match(r.row('alpha-ferry:P-02').why.join(' '), /story\.test\.ferry/);

    f.w('skills/story-alpha/references/hooks.md', `## Гудок \`alpha-ferry:P-01\`
Гудок парома держит переправу и расписание. ${LONG.repeat(3)} Не работает, если гудков больше трёх.

\`\`\`ink
Гудок. #from:ferry
* [Ответить] Ответ.
- -> END
\`\`\`
`);
    r = run(f.paths);
    assert.equal(r.row('alpha-ferry:P-01').level, 'L3', 'пример ink компилируется');
    assert.equal(r.row('alpha-ferry:PAT-01').level, 'L3', 'кластер: строка из sources.md берёт уровень лучшего блока');
    assert.equal(r.row('alpha-ferry:GREEN-01').level, 'L0', 'член кластера без sources.md не покрыт');

    f.w('skills/story-alpha/references/hooks.md', `## Гудок \`alpha-ferry:P-01\`\nГудок парома держит переправу. ${LONG.repeat(3)} Не работает ночью.\n\n\`\`\`ink\n* [сломано -> нет_узла\n\`\`\`\n`);
    assert.match(run(f.paths).row('alpha-ferry:P-01').why.join(' '), /не компилируется/);

    f.w('skills/story-beta/references/decisions-lamp.md', `## Ответ сразу \`beta-lamp:P-02\`\nСмотритель отвечает без задержки. ${LONG.repeat(3)} Не работает, если ответ ничего не меняет.\n`);
    r = run(f.paths);
    assert.equal(r.row('beta-lamp:P-02').level, 'L3', 'развилка в decisions-*.md');
  } finally {
    f.done();
  }
});

test('RED на L3 — только с мутантом; C — с проверкой story:lint', () => {
  const f = fixture();
  try {
    f.w('playbook/owners.md', PLAYBOOK['owners.md'].replace("`beta-lamp:P-02`;", '`beta-lamp:P-02`, `alpha:RED-01`;'));
    f.w('skills/story-beta/references/decisions-lamp.md', `## Молчание без причины \`alpha-ferry:RED-01\`
Паромщик молчит без причины, и молчание без события. ${LONG.repeat(3)}

## Мёртвый гудок C-01
Мёртвый гудок без ответа. ${LONG.repeat(3)}
`);
    let r = run(f.paths);
    assert.equal(r.row('alpha-ferry:RED-01').level, 'L2', 'развилка RED не засчитывает');
    assert.equal(r.row('C-01').level, 'L3', 'развилка у проверки — L3');
    f.w('mutants/m01.json', JSON.stringify({ id: 'M-01', catches: 'alpha-ferry:RED-01' }));
    r = run(f.paths);
    assert.equal(r.row('alpha-ferry:RED-01').level, 'L3');
    assert.ok(r.row('alpha-ferry:RED-01').verified_by.includes('мутант'));
  } finally {
    f.done();
  }
});

test('--skill --min, --sources, --affected, --fidelity-sample, --record, merged-into', () => {
  const f = fixture();
  try {
    f.w('playbook/clusters.json', JSON.stringify(clustersFileContent(loadKnowledge(f.paths))));
    assert.equal(quiet(() => main(['--skill', 'story-alpha', '--min', 'L2'], f.paths)).code, 1, 'скилла нет — ниже L2');
    assert.equal(quiet(() => main(['--skill', 'story-alpha', '--min', 'L0'], f.paths)).code, 0);
    assert.equal(quiet(() => main(['--build-clusters', '--check'], f.paths)).code, 0);

    let { res } = run(f.paths);
    const md = sourcesMd(res, 'story-alpha');
    assert.match(md, /## story-alpha\/hooks\.md/);
    assert.match(md, /`alpha-ferry:P-01`/);
    assert.ok(!md.includes('beta-lamp:P-02'), 'чужие строки не попадают');
    quiet(() => main(['--sources', 'story-alpha', '--write'], f.paths));
    assert.ok(existsSync(join(f.paths.skills, 'story-alpha/references/sources.md')));

    const a = affected(res, 'alpha:P-01');
    assert.ok(a.rows.some((x) => x.id === 'R-01'), 'правка разбора задевает правило с ним в «Источниках»');
    assert.ok(a.skills['story-alpha'] && a.skills['story-beta'], 'владелец и тот, кто ссылается');
    assert.ok(affected(res, 'TH-02').rows.some((x) => x.id === 'beta-lamp:P-02'));

    const s1 = fidelitySample(res, 'story-alpha', 3, 7);
    const s2 = fidelitySample(res, 'story-alpha', 3, 7);
    assert.equal(s1.n, 3);
    assert.deepEqual(s1.pairs.map((p) => p.id), s2.pairs.map((p) => p.id), 'зерно повторяет выборку');

    record(res, 'alpha-ferry:P-02', ['fidelity=bad', 'note=потеряно условие', 'by=ревьюер'], f.paths);
    record(res, 'alpha-ferry:GREEN-01', ['status=merged-into:alpha-ferry:P-01'], f.paths);
    assert.throws(() => record(res, 'alpha-ferry:P-02', ['status=rejected:лень'], f.paths), /не из списка/);
    const cov = JSON.parse(readFileSync(f.paths.coverage, 'utf8'));
    assert.equal(cov.rows['alpha-ferry:P-02'].fidelity.ok, false);

    f.w('skills/story-alpha/references/hooks.md', `## Гудок \`alpha-ferry:P-01\`\nГудок парома держит переправу и расписание. ${LONG.repeat(3)} Не работает ночью.\n`);
    ({ res } = run(f.paths));
    assert.equal(res.matrix.find((x) => x.id === 'alpha-ferry:GREEN-01').level, 'L2', 'merged-into берёт уровень цели');
    const out = quiet(() => main(['--summary'], f.paths)).out;
    assert.match(out, /0\/1 ✗/, 'верность ниже lab.fidelity.min_share видна в сводке');

    f.w('playbook/coverage.json', JSON.stringify({ rows: { 'alpha-ferry:P-01': { status: 'rejected:просто так' } } }));
    assert.equal(quiet(() => main(['--summary'], f.paths)).code, 1, 'неверный статус в coverage.json роняет сводку');
  } finally {
    f.done();
  }
});

test('--sources --compact: ID по кластеру TH без названий, нюансы отдельно, покрытие то же', () => {
  const f = fixture();
  try {
    f.w('playbook/clusters.json', JSON.stringify(clustersFileContent(loadKnowledge(f.paths))));
    const { res } = run(f.paths);
    const md = sourcesMd(res, 'story-alpha', { compact: true });
    assert.match(md, /--write --compact/);
    assert.match(md, /## story-alpha\/hooks\.md/);
    assert.ok(!md.includes('Держи переправу'), 'без названий');
    assert.ok(!/\(`docs\/books/.test(md) && !/^- `/m.test(md), 'без путей и без строки на каждый ID');
    for (const line of md.split('\n').filter((l) => l.includes('`'))) {
      const ids = line.match(/`[^`]+`/g) ?? [];
      if (/нюанс/.test(line)) assert.ok(ids.every((x) => x.includes('#нюанс')), `в строке нюансов чужой ID: ${line}`);
    }
    assert.match(md, /`alpha-ferry:P-01#нюанс`/);

    const inSources = () => run(f.paths).res.matrix.filter((x) => x.owner_skill === 'story-alpha' && x.in_sources).map((x) => x.id).sort();
    quiet(() => main(['--sources', 'story-alpha', '--write'], f.paths));
    const full = inSources();
    assert.ok(full.length > 3);
    assert.equal(quiet(() => main(['--sources', 'story-alpha', '--write', '--compact'], f.paths)).code, 0);
    assert.match(readFileSync(join(f.paths.skills, 'story-alpha/references/sources.md'), 'utf8'), /Компактная форма/);
    assert.deepEqual(inSources(), full, 'story:coverage засчитывает те же строки, что и из полного списка');
    assert.match(quiet(() => main(['--help'], f.paths)).out, /--compact/);
  } finally {
    f.done();
  }
});

test('сводка падает, если строка без владельца или у неё два владельца', () => {
  const f = fixture();
  try {
    const content = clustersFileContent(loadKnowledge(f.paths));
    f.w('playbook/clusters.json', JSON.stringify(content));
    let r = quiet(() => main(['--summary'], f.paths));
    assert.equal(r.code, 1, 'строка без владельца — потеря знания');
    assert.match(r.out, /без владельца [1-9]/);
    const lost = run(f.paths).res.matrix.filter((x) => !x.owner_skill && x.status === 'used').map((x) => x.id);
    assert.ok(lost.includes('alpha-ferry:SYS-1') && !lost.includes('beta-lamp:RED-01'), 'отменённое владельца не требует');

    f.w('playbook/clusters.json', JSON.stringify({ ...content, manual: { th: Object.fromEntries(lost.map((id) => [id, 'TH-03'])) } }));
    assert.equal(quiet(() => main(['--summary'], f.paths)).code, 0, 'у каждой строки владелец');

    f.w('playbook/owners.md', PLAYBOOK['owners.md'].replace('GREEN-01 |', 'GREEN-01; `beta:P-02` |'));
    r = quiet(() => main(['--summary'], f.paths));
    assert.equal(r.code, 1, 'строка в «опоре» двух скиллов');
    assert.match(r.out, /два владельца 1: beta-lamp:P-02 \(TH-01 story-alpha, TH-02 story-beta\)/);
    assert.match(quiet(() => main(['--unowned'], f.paths)).out, /Два владельца: 1/);

    f.w('playbook/owners.md', PLAYBOOK['owners.md']);
    f.w('playbook/clusters.json', JSON.stringify({ ...content, manual: { th: { ...Object.fromEntries(lost.map((id) => [id, 'TH-03'])), 'alpha-ferry:P-01': 'TH-02' } } }));
    assert.equal(quiet(() => main(['--summary'], f.paths)).code, 1, 'manual.th против «опоры» другого скилла');
  } finally {
    f.done();
  }
});

test('текст строки: «_» внутри ключа остаётся, курсив снимается', () => {
  assert.equal(plain('до 48 ч (`story.length.target_h`), _курсив_ и **жирный**'), 'до 48 ч ( story.length.target_h ), курсив и жирный');
});

test('опора: короткие алиасы, диапазоны, ×30, «кроме», системы', () => {
  const aliases = ['attention-today', 'inkle-ingold', 'mystery-fair-play', 'video-three-things'];
  const res = aliasResolver(aliases);
  const ids = (s) => parseOpora(s, res, aliases).map((x) => x.id);
  assert.deepEqual(ids('R-13, R-15…R-17'), ['R-13', 'R-15', 'R-16', 'R-17']);
  assert.deepEqual(ids('`video:P-05`…`P-07`; `video:PAT-02`, PAT-07'), ['video-three-things:P-05', 'video-three-things:P-06', 'video-three-things:P-07', 'video-three-things:PAT-02', 'video-three-things:PAT-07']);
  assert.equal(ids('`алиас:attention§2` ×30').length, aliases.length);
  assert.deepEqual(ids('`inkle` SYS-5; `attention` С-4'), ['inkle-ingold:SYS-5', 'attention-today:SYS-4']);
  assert.ok(parseOpora('`mystery:P-01`…`P-03` (кроме взятых ниже)', res, aliases).every((x) => x.weak));
});

// ——— настоящая база ———

test('настоящая база: owners.md §8, clusters.json свежий, coverage.json без ошибок', () => {
  assert.equal(quiet(() => main(['--owners-check'])).code, 0, 'npm run story:coverage -- --owners-check');
  const { code, out } = quiet(() => main(['--build-clusters', '--check']));
  assert.equal(code, 0, out);
  const res = buildMatrix();
  assert.deepEqual(res.problems, []);
  const kinds = (k) => res.matrix.filter((x) => x.kind === k).length;
  assert.ok(kinds('P') > 450 && kinds('RED') > 400, 'ID базы на месте');
  assert.equal(kinds('R'), 122);
  assert.equal(kinds('C'), 54);
  assert.equal(kinds('F'), 15);
  assert.equal(kinds('attn'), 30);
  assert.equal(kinds('attention'), 150, '150 разделов attention.md');
  assert.ok(kinds('nuance') > 400 && kinds('SYS') >= 85 && kinds('contra') > 100);
  for (const k of ['R', 'C', 'F', 'attn']) {
    const lost = res.matrix.filter((x) => x.kind === k && !x.owner_skill).map((x) => x.id);
    assert.deepEqual(lost, [], `у ${k} владелец по ID`);
  }
  const lostBase = res.matrix.filter((x) => !x.owner_skill && x.status === 'used').map((x) => x.id);
  assert.deepEqual(lostBase, [], 'у каждой строки базы владелец (npm run story:coverage -- --unowned)');
  assert.deepEqual(ownerDups(res.kb), [], 'ни одной строки в «опоре» двух скиллов');
  const desk = res.matrix.filter((x) => x.owner_skill === 'story-desk').length;
  assert.ok(desk > 0, 'у story-desk есть строки базы (build-plan.md §5)');
  const ths = new Set(res.matrix.map((x) => x.th).filter(Boolean));
  for (const th of ths) assert.ok(res.kb.units.has(th), th);
  assert.ok(res.matrix.some((x) => x.status.startsWith('superseded:')), 'отменённое из superseded.md');
});
