import { test, type Page } from '@playwright/test';

/**
 * Не проверка, а съёмка: кладёт скриншоты в screenshots/<устройство>/,
 * чтобы посмотреть глазами, как игра выглядит в настоящем браузере.
 *   npm run shots                      все устройства
 *   npm run shots -- --project=phone   только телефон
 */
const shot = (page: Page, name: string) =>
  page.screenshot({ path: `screenshots/${test.info().project.name}/${name}.png` });

test('снимки экранов', async ({ page }) => {
  await page.goto('/?screen=home&fast=1&fresh=1');
  await page.waitForTimeout(400);
  await shot(page, '1-home');

  await page.getByTestId('tile-the-number').click();
  await page.waitForTimeout(400);
  await shot(page, '2-story');
  await page
    .getByRole('heading', { name: 'Герои', exact: true })
    .evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(300);
  await shot(page, '3-story-people');

  await page
    .getByRole('heading', { name: 'Файл истории', exact: true })
    .evaluate((el) => el.scrollIntoView({ block: 'end' }));
  await page.waitForTimeout(300);
  await shot(page, '3b-story-chapters');

  await page.getByTestId('play').click();
  await page.locator('[data-testid^="thread-"]').first().waitFor();
  await page.waitForTimeout(2500);
  await shot(page, '4-chats');

  await page.locator('[data-testid^="thread-"]').first().click();
  await page.waitForTimeout(3500);
  await shot(page, '5-chat');

  await page.getByLabel('Панель отладки').click();
  await page.waitForTimeout(300);
  await shot(page, '6-debug');
  await page.getByRole('button', { name: 'Готово' }).click();

  await page.getByLabel('Назад к сообщениям').click();
  await page.getByTestId('back-story').click();
  await page.getByTestId('story-back').click();
  await page.waitForTimeout(400);

  // своя история рядом со встроенной
  await page.getByTestId('upload-input').setInputFiles('examples/demo.story.json');
  await page.getByTestId('story').waitFor();
  await page.getByTestId('story-back').click();
  await page.waitForTimeout(400);
  await shot(page, '7-home-uploaded');
});
