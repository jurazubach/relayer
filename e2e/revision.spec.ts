import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { FIXTURE, FIXTURE_PATH, PLOT, uploadFixture } from './fixture';

/**
 * Ревизия сценария в сохранении (E-04): сохранение помнит revision истории,
 * от другой ревизии оно сбрасывается с предупреждением, нет поля — значит 1.
 */
const fixtureRaw = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as Record<string, unknown>;
const SAVE_KEY = `relay:${FIXTURE.id}`;

/** Повторная загрузка той же истории с правкой: так автор выпускает новую ревизию у себя. */
async function reupload(page: Page, story: Record<string, unknown>) {
  await page.goto('/?screen=home&fast=1');
  await page.getByTestId('upload-input').setInputFiles({
    name: `${FIXTURE.id}.story.json`,
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(story)),
  });
  await expect(page.getByTestId('story')).toBeVisible();
}

/** Начать фикстуру по клику и дойти до ответа на выбор: есть что терять при сбросе. */
async function playToReply(page: Page) {
  await page.getByTestId('mode-click').click();
  await page.getByTestId('play').click();
  await page.getByTestId(`thread-${PLOT.first}`).click();
  await page.locator('.choice', { hasText: PLOT.choice }).click();
  await expect(page.getByTestId('chat')).toContainText(PLOT.reply);
}

const savedRevision = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').revision as number | undefined, SAVE_KEY);

test('сохранение помнит ревизию; без поля у истории и в сохранении — это 1, игра продолжается', async ({ page }) => {
  expect(fixtureRaw.revision).toBe(1);
  await uploadFixture(page);
  await playToReply(page);
  expect(await savedRevision(page)).toBe(1);

  // сохранение, записанное до ревизий, и история без поля revision — обе стороны считаются 1
  await page.evaluate((key) => {
    const d = JSON.parse(localStorage.getItem(key)!);
    delete d.revision;
    localStorage.setItem(key, JSON.stringify(d));
  }, SAVE_KEY);
  const { revision: _, ...noRevision } = fixtureRaw;
  await reupload(page, noRevision);
  await expect(page.getByTestId('revision-notice')).toHaveCount(0);
  await expect(page.getByTestId('play')).toContainText('Продолжить');
  await page.getByTestId('play').click();
  await page.getByTestId(`thread-${PLOT.first}`).click();
  await expect(page.getByTestId('chat')).toContainText(PLOT.reply);
  await expect(page.getByTestId('revision-notice')).toHaveCount(0);
});

test('новая ревизия: экран истории предупреждает, игра начинается сначала', async ({ page }) => {
  await uploadFixture(page);
  await playToReply(page);

  await reupload(page, { ...fixtureRaw, revision: 2 });
  const notice = page.getByTestId('revision-notice');
  await expect(notice).toContainText('начнётся сначала');
  await expect(notice).toContainText('1 → 2');
  await expect(page.getByTestId('play')).toContainText('Начать');
  await expect(page.getByTestId('reset')).toHaveCount(0);
  // режим снова выбирается: старой игры, которая его держала, больше нет
  await page.getByTestId('mode-realtime').click();
  await expect(page.getByTestId('mode-confirm')).toHaveCount(0);
  await page.getByTestId('mode-click').click();

  await page.getByTestId('play').click();
  await expect(page.getByTestId('contacts')).toBeVisible();
  await expect(page.getByTestId('revision-notice')).toHaveCount(0);
  await page.getByTestId(`thread-${PLOT.first}`).click();
  await expect(page.locator('.choice', { hasText: PLOT.choice })).toBeVisible();
  await expect(page.getByTestId('chat')).not.toContainText(PLOT.reply);
  expect(await savedRevision(page)).toBe(2);

  // новое сохранение уже своей ревизии: перезагрузка продолжает без предупреждений
  await page.goto('/');
  await expect(page.getByTestId('chat')).toBeVisible();
  await expect(page.getByTestId('revision-notice')).toHaveCount(0);
});

test('прямо в игру со старым сохранением: сброс в том же режиме и плашка до «Понятно»', async ({ page }) => {
  await uploadFixture(page);
  await playToReply(page);

  await reupload(page, { ...fixtureRaw, revision: 3 });
  await page.goto(`/?story=${FIXTURE.id}&screen=game&fast=1`);
  const notice = page.getByTestId('revision-notice');
  await expect(notice).toContainText('началась сначала');
  await expect(notice).toContainText('1 → 3');
  await expect(page.getByTestId('contacts')).toBeVisible();

  const save = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
  expect(save.revision).toBe(3);
  expect(save.mode).toBe('click');

  await page.getByTestId(`thread-${PLOT.first}`).click();
  await expect(page.getByTestId('chat')).not.toContainText(PLOT.reply);
  await expect(notice).toBeVisible();
  await page.getByTestId('revision-notice-ok').click();
  await expect(notice).toHaveCount(0);
});
