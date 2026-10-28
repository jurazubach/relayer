import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { FIXTURE, FIXTURE_PATH, FRESH, HIDDEN, VISIBLE } from './fixture';

/**
 * hidden: true в описании убирает историю с главного, но не из игры: она открывается по ?story=<id>,
 * а ?all=1 возвращает её на главный. Поведение — на копии фикстуры с hidden, каталог — по его meta.json.
 */
const tile = `tile-${FIXTURE.id}`;
const hiddenCopy = { ...JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')), hidden: true };

async function uploadHidden(page: Page) {
  await page.goto(FRESH);
  await page.getByTestId('upload-input').setInputFiles({
    name: 'hidden.story.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(hiddenCopy)),
  });
  await expect(page.getByTestId('story')).toBeVisible();
}

test('скрытая история не видна на главном и открывается по ?story=', async ({ page }) => {
  await uploadHidden(page);
  await page.getByTestId('story-back').click();
  await expect(page.getByTestId('home')).toBeVisible();
  await expect(page.getByTestId('upload')).toBeVisible();
  await expect(page.getByTestId(tile)).toHaveCount(0);

  await page.goto(`/?story=${FIXTURE.id}&screen=story&fast=1`);
  await expect(page.getByTestId('story')).toContainText(FIXTURE.title);
  await page.getByTestId('play').click();
  await expect(page.getByTestId('contacts')).toBeVisible();
});

test('?all=1 показывает скрытую историю на главном', async ({ page }) => {
  await uploadHidden(page);
  await page.goto('/?screen=home&all=1');
  await expect(page.getByTestId(tile)).toContainText(FIXTURE.title);
});

test('сохранённый маршрут в скрытую историю ведёт на главный', async ({ page }) => {
  await uploadHidden(page);
  await page.getByTestId('play').click();
  await expect(page.getByTestId('contacts')).toBeVisible();
  // без флагов приложение открывает то, где игрок был в прошлый раз, — но не скрытую историю
  await page.goto('/?fast=1');
  await expect(page.getByTestId('home')).toBeVisible();
  await expect(page.getByTestId(tile)).toHaveCount(0);
});

test('каталог на главном — истории без hidden', async ({ page }) => {
  test.skip(!HIDDEN.length, 'в src/stories нет скрытых историй');
  await page.goto(FRESH);
  await expect(page.getByTestId('home')).toBeVisible();
  for (const s of VISIBLE) await expect(page.getByTestId(`tile-${s.id}`)).toBeVisible();
  for (const s of HIDDEN) await expect(page.getByTestId(`tile-${s.id}`)).toHaveCount(0);

  await page.goto(`/?story=${HIDDEN[0].id}&screen=story&fast=1`);
  await expect(page.getByTestId('story')).toContainText(HIDDEN[0].title);
  await page.goto('/?screen=home&all=1');
  for (const s of HIDDEN) await expect(page.getByTestId(`tile-${s.id}`)).toBeVisible();
});
