// Самопроверка T-22: хвосты «глав невидимых» (A-08) и ревизия без тега. C-49 (и) — слово «глава» на карточке,
// C-55 — за #chapter реплика, а не кнопки; точка анкеты playtest-kit по реплике перед паузой стыка;
// revision-check без тега сравнивает с коммитом последней смены revision. Дефект и чистый двойник, выдуманные
// истории. Подключается из selftest.mjs.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadThresholds } from '../lib/thresholds.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const KIT = join(ROOT, '.claude/skills/story-playtest/scripts/playtest-kit.mjs');
const REVISION = join(ROOT, '.claude/skills/story-release/scripts/revision-check.mjs');

const card = (over = {}) => ({
  title: 'Маяк', tagline: 'Смотритель маяка пишет тебе в шторм', synopsis: 'Смотритель пропал. Ты отвечаешь на его сообщения.',
  features: ['Ты решаешь, кому верить'], teasers: ['«ты видишь огонь?»', 'Смотритель пишет в шторм'], ...over,
});
const lighthouse = '# contact: ida, Ида, teal\n-> ch1\n=== ch1 ===\nГлава 1 #sys #chapter\nсмотритель пропал. ты видишь огонь? шторм #from:ida\n* [вижу #to:ida]\n* [нет #to:ida]\n- кому верить? решаешь ты #from:ida\n-> END';

const seam = (afterChapter) => `# contact: ida, Ида, teal\n-> ch1\n=== ch1 ===\nГлава 1 #sys #chapter\nты тут? #from:ida\n* [да #to:ida]\n* [нет #to:ida]\n- ладно, до утра #from:ida\n-> ch2\n=== ch2 ===\n#from:ida #delay:2h\nГлава 2 #sys:ida #chapter\n${afterChapter}\n* [иду #to:ida]\n* [нет #to:ida]\n- -> END`;

export function register(test, { has, hasNot, lint, keys }) {
  test('C-49 (и): «глава» и «эпизод» в tagline, synopsis, features, teasers — находка; series и «главный» — нет', async () => {
    for (const over of [
      { features: ['Пять глав о шторме'] },
      { tagline: 'Первая глава — бесплатно' },
      { synopsis: 'Смотритель пропал. Ты отвечаешь ему три эпизода подряд.' },
      { teasers: ['«ты видишь огонь?»', 'В главе 2 погаснет свет'] },
    ]) {
      const res = await has(lighthouse, 'C-49.chapter_word', { only: ['C-49'], meta: card(over) });
      assert.match(res.findings.find((f) => f.key === 'C-49.chapter_word').message, /A-08/);
    }
    await hasNot(lighthouse, 'C-49.chapter_word', { only: ['C-49'], meta: card() });
    await hasNot(lighthouse, 'C-49.chapter_word', { only: ['C-49'], meta: card({ series: 'Сезон 2 · Глава шторма', tagline: 'Главный вопрос — кто зажёг огонь' }) });
  });

  test('C-55: за #chapter главы 2 сразу кнопки — находка; реплика перед кнопками или начало главы 1 — нет', async () => {
    await has(seam(''), 'C-55.buttons', { only: ['C-55'] });
    // системная строка реплику не заменяет
    await has(seam('Ида в сети #sys:ida'), 'C-55.buttons', { only: ['C-55'] });
    await hasNot(seam('на причале чужая лодка #from:ida'), 'C-55.buttons', { only: ['C-55'] });
    // глава 1 с кнопок — первое сообщение истории (C-22), не стык
    await hasNot('# contact: ida, Ида, teal\n-> ch1\n=== ch1 ===\nГлава 1 #sys #chapter\n* [Ида? #to:ida]\n  да #from:ida\n* [Эй #to:ida]\n  да #from:ida\n- -> END', 'C-55.buttons', { only: ['C-55'] });
    // кнопки через divert в другой узел — тоже за строкой главы
    await has(seam('-> ch2_q\n=== ch2_q ==='), 'C-55.buttons', { only: ['C-55'] });
  });

  test('playtest-kit: точка анкеты — последняя входящая перед стыком глав 1 и 2, в записках нет слова «глава»', async () => {
    const T = loadThresholds();
    const { seamPoint, quoteTail, brief, survey, surveyWhen } = await import(KIT);
    const line = (o) => ({ type: 'line', kind: 'in', isChapter: false, who: 'ida', name: 'Ида', tReal: 0, chapter: 1, ...o });
    const run = (last) => [
      line({ text: 'ты тут?' }), line({ text: last, tReal: 10 }),
      line({ kind: 'sys', text: 'Ида не в сети', tReal: 11 }),
      line({ kind: 'sys', isChapter: true, text: 'Глава 2 · Утро', chapter: 2, tReal: 7300 }),
      line({ text: 'на причале чужая лодка', chapter: 2, tReal: 7300 }),
    ];
    const p = seamPoint([run('ладно, до утра'), run('ладно, до утра'), run('не жди меня, я на маяк и обратно к рассвету')], { quoteWords: T.value('lab.playtest.brief.quote_words') });
    assert.equal(p.variants.length, 2);
    assert.equal(p.variants[0].runs, 2, 'частый путь первым');
    assert.match(p.text, /^Ида напишет «ладно, до утра» или «…/);
    assert.equal(quoteTail('один два три', 5), 'один два три');
    assert.equal(quoteTail('раз два три четыре', 2), '…три четыре');
    assert.equal(seamPoint([run('x').filter((i) => !i.isChapter)], { quoteWords: 3 }), null, 'стыка нет — точки нет');
    assert.match(surveyWhen(p, 'realtime', T), /уйдёт из сети; второй — в конце/);
    assert.match(surveyWhen(p, 'click', T), /спустя/, 'пауза стыка 2 ч — по клику метка «спустя N»');
    assert.equal(surveyWhen(null, 'click', T), 'один раз — в конце');
    const v = { realtime: 3600, click: 600, point: p };
    for (const whole of [true, false]) {
      for (const mode of ['realtime', 'click']) {
        const text = brief({ title: 'Маяк · тест 1', mode, whole, ask: [], known: [], v, wave: 1, fileName: 'mayak-w1.story.json', T });
        assert.ok(!T.re('C-49.chapter_word').test(text), `${mode}, whole=${whole}: в записке «глава»: ${text.match(T.re('C-49.chapter_word'))?.[0]}`);
        assert.match(text, whole ? /целиком, до финала/ : /готово начало/);
      }
    }
    const s = survey({ testers: 3, point: p, T });
    assert.ok(!T.re('C-49.chapter_word').test(s));
    assert.match(s, /Заполните два раза\. Первый — когда Ида напишет/);
  });

  test('revision-check: без тега — сравнение с коммитом последней смены revision; правка после неё без подъёма — ✗', () => {
    const dir = mkdtempSync(join(tmpdir(), 't22-revision-'));
    try {
      const git = (...a) => execFileSync('git', ['-c', 'commit.gpgsign=false', '-c', 'tag.gpgsign=false', ...a], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
      const story = join(dir, 'src/stories/mayak');
      mkdirSync(story, { recursive: true });
      const meta = (revision) => JSON.stringify({ id: 'mayak', revision, title: 'Маяк', chapters: [{ title: 'Шторм', revision: 9 }] }, null, 2);
      const ink = () => `# contact: ida, Ида, teal\n-> ch1\nINCLUDE ch01.ink\n`;
      const ch = (n) => `=== ch1 ===\nГлава 1 #sys #chapter\nты тут? #from:ida\n${Array.from({ length: n }, (_, i) => `* [ответ ${i + 1} #to:ida]`).join('\n')}\n- -> END\n`;
      const write = (rev, n) => { writeFileSync(join(story, 'meta.json'), meta(rev)); writeFileSync(join(story, 'story.ink'), ink()); writeFileSync(join(story, 'ch01.ink'), ch(n)); };
      git('init', '-q');
      git('config', 'user.email', 't22@example.invalid');
      git('config', 'user.name', 'T-22');
      const commit = (msg) => { git('add', '-A'); git('commit', '-q', '-m', msg); };
      const check = () => {
        const r = spawnSync('node', [REVISION, '--story', 'mayak', '--json'], { cwd: dir, encoding: 'utf8' });
        return { code: r.status, out: JSON.parse(r.stdout)[0] };
      };
      write(1, 2); commit('первая версия');
      assert.equal(check().out.verdict, 'first', 'revision не менялась и тега нет — первый выпуск');
      write(2, 2); commit('ревизия 2 — выпуск');
      write(2, 2); writeFileSync(join(story, 'meta.json'), meta(2).replace('"Шторм"', '"Буря"')); commit('правка главы в meta.json, revision та же');
      write(2, 3); commit('кнопка после выпуска');
      const bad = check();
      assert.equal(bad.out.verdict, 'bump', JSON.stringify(bad.out));
      assert.equal(bad.out.base, 'revision');
      assert.deepEqual([bad.out.bumped.from, bad.out.bumped.to], [1, 2], 'смена revision, а не правка главы и не «revision» внутри chapters');
      assert.equal(bad.code, 1);
      write(3, 3);
      const ok = check();
      assert.equal(ok.out.verdict, 'ok', 'поднято в рабочей копии — сходится');
      commit('ревизия 3');
      assert.equal(check().out.verdict, 'ok', 'после коммита сравнение с ним самим');
      git('tag', '-a', 'mayak-r3', '-m', 'выпуск r3');
      write(3, 4); commit('кнопка после тега');
      const tagged = check().out;
      assert.equal(tagged.base, 'tag', 'тег важнее коммита смены revision');
      assert.equal(tagged.verdict, 'bump');
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
}
