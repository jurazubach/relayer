import { test, type Page } from '@playwright/test';
import { DEMO_PATH, FIXTURE, fixtureOnHome } from './fixture';

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
