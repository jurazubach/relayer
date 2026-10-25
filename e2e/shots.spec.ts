import { test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { DEMO_PATH, FIXTURE, FIXTURE_PATH, fixtureOnHome } from './fixture';

/**
 * Не проверка, а съёмка: кладёт скриншоты в screenshots/<устройство>/,
 * чтобы посмотреть глазами, как игра выглядит в настоящем браузере.
 *   npm run shots                      все устройства
 *   npm run shots -- --project=phone   только телефон
 * Снимает фикстуру examples/e2e.story.json: каталог историй переписывается,
 * а вёрстку нужно видеть на одних и тех же текстах.
 */
const shot = (page: Page, name: string) =>
  page.screenshot({ path: `screenshots/${test.info().project.name}/${name}.png` });

// тег @shots: npm run test:e2e гоняет все спеки, кроме этого (--grep-invert @shots)
test('снимки экранов', { tag: '@shots' }, async ({ page }) => {
  await fixtureOnHome(page);
  await page.waitForTimeout(400);
  await shot(page, '1-home');
  // карточки на всю ширину не помещаются в экран: конец списка — отдельным снимком
  await page.getByTestId('upload').evaluate((el) => el.scrollIntoView({ block: 'end' }));
  await page.waitForTimeout(300);
  await shot(page, '1b-home-end');

  await page.getByTestId(`tile-${FIXTURE.id}`).click();
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

  // ещё одна своя история рядом с остальными
  await page.getByTestId('upload-input').setInputFiles(DEMO_PATH);
  await page.getByTestId('story').waitFor();
  await page.getByTestId('story-back').click();
  await page.waitForTimeout(400);
  await shot(page, '7-home-uploaded');
  await page.getByTestId('upload').evaluate((el) => el.scrollIntoView({ block: 'end' }));
  await page.waitForTimeout(300);
  await shot(page, '7b-home-uploaded-end');
});

// плашка ревизии: сохранение от прошлой версии на экране истории и прямо в игре
test('снимки сброса по ревизии', { tag: '@shots' }, async ({ page }) => {
  await fixtureOnHome(page);
  await page.getByTestId(`tile-${FIXTURE.id}`).click();
  await page.getByTestId('play').click();
  await page.locator('[data-testid^="thread-"]').first().waitFor();

  await page.goto('/?screen=home');
  const raw = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'));
  await page.getByTestId('upload-input').setInputFiles({
    name: `${FIXTURE.id}.story.json`,
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ ...raw, revision: 2 })),
  });
  await page.getByTestId('revision-notice').waitFor();
  await page.waitForTimeout(300);
  await shot(page, '8-story-revision');

  await page.goto(`/?story=${FIXTURE.id}&screen=game&fast=1`);
  await page.getByTestId('revision-notice').waitFor();
  await page.waitForTimeout(1500);
  await shot(page, '9-game-revision');
});

// платная граница: закрытые главы на экране истории, плашка в чате и над списком чатов
test('снимки платной границы', { tag: '@shots' }, async ({ page }) => {
  await fixtureOnHome(page);
  await page.getByTestId(`tile-${FIXTURE.id}`).click();
  await page
    .getByRole('heading', { name: 'Файл истории', exact: true })
    .evaluate((el) => el.scrollIntoView({ block: 'end' }));
  await page.waitForTimeout(300);
  await shot(page, '10-story-locked');

  await page.getByTestId('mode-click').click();
  await page.getByTestId('play').click();
  await page.locator('[data-testid^="thread-"]').first().click();
  await page.locator('.choice').first().click();
  await page.getByTestId('paywall').waitFor();
  await page.getByTestId('paywall-buy').click();
  await page.waitForTimeout(400);
  await shot(page, '11-chat-paywall');

  await page.getByLabel('Назад к сообщениям').click();
  await page.waitForTimeout(400);
  await shot(page, '12-chats-paywall');
});
