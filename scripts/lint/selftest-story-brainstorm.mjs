// Самопроверка инструментов story-brainstorm: своих проверок C-NN у скилла нет (owners.md §1), поэтому здесь —
// разбор раунда направлений, различие по осям, повторы прошлых раундов, режим «далеко» (Б-4), трейлер и форма
// логлайна. Раунды выдуманные. Подключается из selftest.mjs.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { AXES, checkRound, checkTrailer, capTags, excluded, parseRounds, sameLabel } from '../../.claude/skills/story-brainstorm/scripts/directions.mjs';
import { checkLogline, checkRules, splitRules } from '../../.claude/skills/story-brainstorm/scripts/premise-check.mjs';
import { similarity } from '../../.claude/skills/story-brainstorm/scripts/ideas-bank.mjs';
import { thresholds } from '../lib/thresholds.mjs';

const FORMAT = fileURLToPath(new URL('../../.claude/skills/story-brainstorm/references/directions-format.md', import.meta.url));

const trailer = (who) => `# contact: ${who}, Собеседник, teal
раз #from:${who}
два
три
четыре
пять
* [Да #to:${who}]
    -> END
* [Нет #to:${who}]
    -> END`;

const dir = (id, labels, extra = '') => [`### ${id} · Направление ${id}`, '',
  ...AXES.map((a, i) => `- ${a.name}: ${labels[i]} — пояснение`),
  '- логлайн: ты — сторож, тебе пишет соседка, но ключ у неё', '- что трудно: одна ночь', extra, '', '```ink', trailer(`c${id.toLowerCase()}`), '```', ''].join('\n');

const A = ['сторож', 'соседка в беде', 'двери не запираются', 'жизнь', 'время', 'один собеседник', 'невиновный в беде'];
const B = ['подозреваемый', 'брат героя', 'письма приходят заранее', 'свобода', 'учреждение', 'мост двух чатов', 'загадка почему'];
const B_PARA = ['ночной сторож', 'соседка в беде', 'двери не запираются', 'жизнь', 'время', 'один собеседник', 'загадка почему'];

export function register(test) {
  const T = thresholds();

  test('story-brainstorm: пример раунда в references проходит directions.mjs — семь осей, трейлеры по ключу', () => {
    const rounds = parseRounds(readFileSync(FORMAT, 'utf8'));
    assert.equal(rounds.length, 1);
    const res = checkRound(rounds, null, T);
    assert.ok(res.ok, res.errors.join('; '));
    assert.equal(res.directions.length, 3);
    for (const d of res.directions) assert.equal(d.trailer.messages, T.value('skill.brainstorm.trailer.messages'));
  });

  test('story-brainstorm: перефразировка ловится — расхождение меньше skill.brainstorm.directions.axes_min_diff', () => {
    const text = `## Раунд 1 · 2026-10-28 · идея: ночь в пустом доме\n\n${dir('A', A)}${dir('B', B_PARA)}${dir('C', B)}`;
    const res = checkRound(parseRounds(text), null, T);
    assert.ok(!res.ok);
    assert.ok(res.errors.some((e) => /^A и B расходятся/.test(e)), res.errors.join('; '));
    assert.ok(sameLabel('ночной сторож', 'сторож', T.value('skill.brainstorm.axes.same_overlap')), 'синоним-расширение метки — то же значение');
  });

  test('story-brainstorm: «ещё» не повторяет прошлый раунд, «далеко» меняет каждую ось из «не то»', () => {
    const r1 = `## Раунд 1 · 2026-10-28 · идея: x\n\n${dir('A', A, '- статус: отвергнуто: скучно')}`;
    const again = `${r1}\n## Раунд 2 · 2026-10-28 · идея: x\n\n- режим: ещё\n\n${dir('A', B_PARA)}${dir('B', B)}`;
    const res = checkRound(parseRounds(again), null, T);
    assert.ok(res.repeats.some((r) => r.id === 'A' && r.round === 1), 'повтор раунда 1 не найден');
    const farRole = ['сторож', ...B.slice(1)];
    const far = `${r1}\n## Раунд 2 · 2026-10-28 · идея: x\n\n- режим: далеко\n- не то: роль игрока, жанр\n\n${dir('A', farRole)}${dir('B', B.map((x, i) => (i === 0 ? 'хранитель улик' : `${x} иначе`)))}`;
    const rf = checkRound(parseRounds(far), null, T);
    assert.ok(rf.errors.some((e) => /не далеко/.test(e) && /роль игрока/.test(e)), rf.errors.join('; '));
    assert.deepEqual(excluded(parseRounds(far)).notThis, ['role', 'genre']);
  });

  test('story-brainstorm: трейлер — компиляция, сообщения до кнопки, только ready-теги, имена не из контактов', () => {
    const caps = capTags();
    const ok = checkTrailer(trailer('x'), caps);
    assert.ok(ok.ok);
    assert.equal(ok.messages, 5);
    assert.equal(ok.choices, 2);
    const bad = checkTrailer('# contact: x, Ксю, teal\nкупи это в Пятёрке у Вани #from:x #typing:3s\n* [Ок #to:x]\n    -> END', caps);
    assert.ok(bad.errors.some((e) => /#typing/.test(e)), bad.errors.join('; '));
    assert.ok(bad.warnings.some((w) => /Пятёрке/.test(w) && /Вани/.test(w)), bad.warnings.join('; '));
    assert.ok(!checkTrailer('* [Без конца', caps).ok, 'не компилируется — ошибка');
  });

  test('story-brainstorm: логлайн и правило — «ты», противопоставление, длина, событие вместо правила', () => {
    assert.equal(checkLogline('Ты сторож ночного склада, тебе пишет соседка, но ключ от склада у неё', T).issues.length, 0);
    const noRole = checkLogline('Сторож находит ключ на складе', T);
    assert.ok(noRole.issues.some((i) => i.level === 'error'));
    const r = checkRules(splitRules('двери не запираются; сосед пропал вчера'), T);
    assert.equal(r.rules.length, 2);
    assert.ok(r.issues.some((i) => /пропал/.test(i.what)), 'событие в правиле не замечено');
    assert.ok(!r.issues.some((i) => /не запираются/.test(i.what)), 'правило в настоящем времени — не событие');
  });

  test('story-brainstorm: банк — похожесть по основам от меньшего текста', () => {
    const s = similarity('чужой телефон в такси', 'Девушка находит чужой телефон в такси и отвечает его хозяйке');
    assert.ok(s.score >= T.value('skill.brainstorm.bank.similar_min'));
    assert.ok(similarity('метеостанция ночью', 'чужой телефон в такси').score < T.value('skill.brainstorm.bank.similar_min'));
  });
}
