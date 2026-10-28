import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { FIXTURE, FIXTURE_PATH, messages } from './fixture';

/**
 * Режимы игры (E-01): выбор на экране истории, смена только перезапуском,
 * «по клику» без пауз с меткой «спустя N», «пропустить до следующего» в отладке.
 * Здесь без ?fast=1: он выключает паузы в любом режиме и спрятал бы разницу между ними.
 */
const SLOW = '/?screen=home&fresh=1';
const fixtureRaw = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as Record<string, unknown>;

async function upload(page: Page, story: Record<string, unknown>) {
  await page.goto(SLOW);
  await page.getByTestId('upload-input').setInputFiles({
    name: `${story.id}.story.json`,
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(story)),
  });
  await expect(page.getByTestId('story')).toBeVisible();
}

/** Синтетическая история: скачок в три часа и служебный контакт. */
const JUMP = {
  format: 'relayer-story', version: 1, id: 'e2e-modes', title: 'Скачок', tagline: 'проверка режимов',
  minutes: 1, days: 0.2,
  cover: { from: '#333', to: '#111', glyph: '?' },
  characters: [
    { id: 'ann', name: 'Аня', role: 'выходит из дома' },
    { id: 'bank', name: 'Банк', role: 'уведомления', service: true },
  ],
  ink: [
    '# title: Скачок',
    '# contact: ann, Аня, teal',
    '# contact: bank, Банк, grey',
    '',
    'выхожу #from:ann',
    '#delay:3h',
    'на месте #from:ann',
    '-> END',
  ].join('\n'),
};

test('порог метки «спустя N» в движке совпадает с thresholds.json', () => {
  const all = JSON.parse(readFileSync('docs/playbook/thresholds.json', 'utf8'));
  const key = all['engine.click.time_jump_label'];
  const src = readFileSync('src/engine/engine.ts', 'utf8');
  const m = src.match(/export const TIME_JUMP_LABEL_H = (\d+(?:\.\d+)?);/);
  expect(m, 'в engine.ts нет TIME_JUMP_LABEL_H').not.toBeNull();
  expect(key.unit).toBe('ч');
  expect(Number(m![1])).toBe(key.value);
  expect(src).toContain('engine.click.time_jump_label');
});

test('карточка и экран истории показывают оба числа до выбора режима', async ({ page }) => {
  await upload(page, { ...fixtureRaw, days: 2 });
  const story = page.getByTestId('story');
  await expect(story).toContainText(`≈ ${FIXTURE.minutes} мин по клику`);
  await expect(story).toContainText('≈ 2 дня в реальном времени');
  await expect(page.getByTestId('mode-click')).toContainText(`≈ ${FIXTURE.minutes} мин`);
  await expect(page.getByTestId('mode-realtime')).toContainText('≈ 2 дня');

  await page.getByTestId('story-back').click();
  const tile = page.getByTestId(`tile-${FIXTURE.id}`);
  await expect(tile).toContainText('по клику');
  await expect(tile).toContainText('в реальном времени');
});

test('служебный контакт не попадает в список героев', async ({ page }) => {
  await upload(page, JUMP);
  const story = page.getByTestId('story');
  await expect(story).toContainText('Аня');
  await expect(story).not.toContainText('Банк');
});

test('по клику пауз нет, скачок закрывает метка «спустя N»', async ({ page }) => {
  await upload(page, JUMP);
  await page.getByTestId('mode-click').click();
  await expect(page.getByTestId('mode-click')).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('play').click();
  await page.getByTestId('thread-ann').click();

  const chat = page.getByTestId('chat');
  await expect(chat).toContainText('спустя 3 часа');
  await expect(chat).toContainText('на месте');
  // метка стоит между репликами, а не после
  const texts = await messages(page).allTextContents();
  const label = texts.findIndex((t) => t.includes('спустя 3 часа'));
  expect(label).toBeGreaterThan(texts.findIndex((t) => t.includes('выхожу')));
  expect(label).toBeLessThan(texts.findIndex((t) => t.includes('на месте')));
});

test('в реальном времени пауза настоящая, «пропустить до следующего» её проходит', async ({ page }) => {
  await upload(page, JUMP);
  await expect(page.getByTestId('mode-realtime')).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('play').click();
  await page.getByTestId('thread-ann').click();

  const chat = page.getByTestId('chat');
  await expect(chat).toContainText('выхожу');
  await expect(chat).toContainText('Аня не в сети');
  // срок паузы игроку не называем
  await expect(chat).not.toContainText('ответит через');
  await expect(chat).not.toContainText('на месте');

  await page.getByLabel('Панель отладки').click();
  await page.getByTestId('skip-next').click();
  await page.getByRole('button', { name: 'Готово' }).click();
  await expect(chat).toContainText('на месте', { timeout: 3_000 });
  await expect(chat).not.toContainText('спустя');
});

test('режим начатой игры меняется только перезапуском с предупреждением', async ({ page }) => {
  await upload(page, fixtureRaw);
  await page.getByTestId('play').click();
  await expect(page.locator('[data-testid^="thread-"]').first()).toBeVisible();
  await page.getByTestId('back-story').click();

  await expect(page.getByTestId('play')).toContainText('Продолжить');
  await page.getByTestId('mode-click').click();
  // без подтверждения режим не меняется
  await expect(page.getByTestId('mode-realtime')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('story')).toContainText('прогресс сотрётся');
  await page.getByTestId('mode-confirm').click();

  await expect(page.getByTestId('play')).toContainText('Начать');
  await expect(page.getByTestId('mode-click')).toHaveAttribute('aria-checked', 'true');

  // новая игра идёт в выбранном режиме, и после перезагрузки он на месте
  await page.getByTestId('play').click();
  await expect(page.locator('[data-testid^="thread-"]').first()).toBeVisible();
  await page.goto('/');
  await page.getByTestId('back-story').click();
  await expect(page.getByTestId('mode-click')).toHaveAttribute('aria-checked', 'true');
});
