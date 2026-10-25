// Самопроверка C-54 (скилл story-mystery): улика только в ветке, раскрытие без выбора, улики одного голоса,
// поздний виновник и его след, верная кнопка длиннее остальных. Дефект и чистый двойник; истории выдуманные.
// Подключается из selftest.mjs.
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lintStory, loadChecks } from './core.mjs';
import { loadThresholds } from '../lib/thresholds.mjs';

const only = { only: ['C-54'] };
const head = 'VAR clue_a = false\nVAR clue_b = false\nVAR solved = false\nVAR culprit_seen = false\n';
const reveal = '// reveal: clue_a, clue_b\n=== reveal ===\nэто был сосед #from:ann\n-> END';
// ворота перед раскрытием: вопрос и две версии одной длины
const gate = (a = 'Сосед', b = 'Брат') => `- кто взял ключ? #from:ann\n* [${a}]\n  ~ solved = true\n  -> reveal\n* [${b}] -> reveal`;

/** История с facts.md рядом: так C-54 находит виновника у истории вне каталога. */
async function withFacts(src, facts) {
  const dir = mkdtempSync(join(tmpdir(), 'c54-'));
  try {
    writeFileSync(join(dir, 'facts.md'), facts);
    const story = { id: 'synthetic-mystery', path: join(dir, 'story.ink'), form: 'ink', meta: {}, main: 'story.ink', files: { 'story.ink': src }, order: ['story.ink'], ink: src };
    return await lintStory(story, loadThresholds(), { checks: await loadChecks(), runs: 40, seed: 7, only: ['C-54'] });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function register(test, { has, hasNot, keys }) {
  test('C-54.sure_clue: каждая улика только в своей ветке; на стволе — нет', async () => {
    const branchy = `${head}-> a\n=== a ===\nгде искать? #from:ann\n* [В столе]\n  в столе записка #from:ann\n  ~ clue_a = true\n* [В шкафу]\n  в шкафу ключ #from:bob\n  ~ clue_b = true\n${gate()}\n${reveal}`;
    await has(branchy, 'C-54.sure_clue', only);
    const trunk = `${head}-> a\n=== a ===\nв столе записка #from:ann\n~ clue_a = true\nа в шкафу ключ #from:bob\n~ clue_b = true\n* [Ясно]\n* [И что?]\n${gate()}\n${reveal}`;
    await hasNot(trunk, 'C-54.sure_clue', only);
    await hasNot(trunk, 'C-54.min_clues', only);
    await hasNot(trunk, 'C-54.gap_choice', only);
  });

  test('C-54.gap_choice: последняя улика в кнопке, которая сразу ведёт в раскрытие', async () => {
    const src = `${head}-> a\n=== a ===\nв столе записка #from:ann\n~ clue_a = true\n* [Ищи дальше]\n  ключ под ковриком #from:bob\n  ~ clue_b = true\n  -> reveal\n* [Хватит]\n  ладно, ключ под ковриком #from:bob\n  ~ clue_b = true\n  -> reveal\n${reveal}`;
    await has(src, 'C-54.gap_choice', only);
  });

  test('C-54.channels: две улики от одного контакта — находка; от двух — нет', async () => {
    const mk = (who) => `${head}-> a\n=== a ===\nв столе записка #from:ann\n~ clue_a = true\nа в шкафу ключ #from:${who}\n~ clue_b = true\n* [Ясно]\n* [И что?]\n${gate()}\n${reveal}`;
    const res = await has(mk('ann'), 'C-54.channels', only);
    assert.match(res.findings.find((f) => f.key === 'C-54.channels').message, /от одного контакта/);
    await hasNot(mk('bob'), 'C-54.channels', only);
  });

  test('C-54.long_answer: верная версия (solved) вдвое длиннее остальных; равные — нет', async () => {
    const mk = (a) => `${head}-> a\n=== a ===\nв столе записка #from:ann\n~ clue_a = true\nа в шкафу ключ #from:bob\n~ clue_b = true\n* [Ясно]\n* [И что?]\n${gate(a, 'Брат')}\n${reveal}`;
    await has(mk('Сосед: у него второй ключ и вчерашний вопрос про отпуск'), 'C-54.long_answer', only);
    await hasNot(mk('Сосед'), 'C-54.long_answer', only);
  });

  test('C-54.culprit_*: виновник из facts.md рядом с историей пишет в конце; ранний след culprit_seen гасит', async () => {
    const filler = Array.from({ length: 12 }, (_, i) => `строка ${i + 1} #from:ann`).join('\n');
    const late = `${head}-> a\n=== a ===\n${filler}\nв столе записка #from:ann\n~ clue_a = true\nа в шкафу ключ #from:ann\n~ clue_b = true\n* [Ясно]\n* [И что?]\n${gate()}\n// reveal: clue_a, clue_b\n=== reveal ===\nэто я #from:bob\n-> END`;
    const res = await withFacts(late, '# Факты\n\nвиновник: bob\n');
    assert.ok(keys(res).includes('C-54.culprit_error'), `ожидалась C-54.culprit_error, есть: ${keys(res).join(', ') || 'ничего'}`);
    // тот же текст, но в первой строке — след виновника без его #from
    const traced = late.replace('строка 1 #from:ann', 'у двери чужие следы, сорок пятый #from:ann\n~ culprit_seen = true');
    const clean = await withFacts(traced, 'виновник: bob\n');
    assert.ok(!keys(clean).some((k) => k.startsWith('C-54.culprit')), `лишняя находка: ${keys(clean).join(', ')}`);
  });
}
