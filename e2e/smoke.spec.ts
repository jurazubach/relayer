import { expect, test, type Page } from '@playwright/test';

/** Без пауз сюжета и с чистого листа: иначе эпизод идёт настоящими минутами. */
const fresh = '/?screen=home&fast=1&fresh=1';

const firstThread = (page: Page) => page.locator('[data-testid^="thread-"]').first();

test('главный экран показывает карточку истории', async ({ page }) => {
  await page.goto(fresh);
  await expect(page.getByTestId('home')).toBeVisible();
  const tile = page.getByTestId('tile-the-number');
  await expect(tile).toContainText('THE NUMBER');
  await expect(tile).toContainText('Пилот');
  // карточка квадратная
  const box = await tile.boundingBox();
  expect(Math.abs(box!.width - box!.height)).toBeLessThan(2);
});

test('карточка открывает описание истории', async ({ page }) => {
  await page.goto(fresh);
  await page.getByTestId('tile-the-number').click();

  const story = page.getByTestId('story');
  await expect(story).toBeVisible();
  await expect(story).toContainText('О чём');
  await expect(story).toContainText('Герои');
  await expect(story).toContainText('Тео');
  await expect(story).toContainText('Главы');
  await expect(story).toContainText('Доставлено');
  await expect(page.getByTestId('play')).toContainText('Начать');
});

test('из описания запускается игра, сюжет идёт сам', async ({ page }) => {
  await page.goto(fresh);
  await page.getByTestId('tile-the-number').click();
  await page.getByTestId('play').click();

  await expect(page.getByTestId('contacts')).toBeVisible();
  await expect(firstThread(page)).toBeVisible();
});

test('чат открывается и в нём есть сообщения', async ({ page }) => {
  await page.goto('/?story=the-number&fast=1&fresh=1');
  await firstThread(page).click();
  await expect(page.locator('.message__bubble, .system-line').first()).toBeVisible();
});

test('назад: игра → описание → главный, прогресс виден везде', async ({ page }) => {
  await page.goto(fresh);
  await page.getByTestId('tile-the-number').click();
  await page.getByTestId('play').click();
  await expect(firstThread(page)).toBeVisible();

  await page.getByTestId('back-story').click();
  await expect(page.getByTestId('story')).toBeVisible();
  await expect(page.getByTestId('play')).toContainText('Продолжить');

  await page.getByTestId('story-back').click();
  await expect(page.getByTestId('home')).toBeVisible();
  await expect(page.getByTestId('tile-the-number')).toContainText('Продолжить');
});

test('«начать заново» стирает прогресс', async ({ page }) => {
  await page.goto(fresh);
  await page.getByTestId('tile-the-number').click();
  await page.getByTestId('play').click();
  await expect(firstThread(page)).toBeVisible();
  await page.getByTestId('back-story').click();

  await page.getByRole('button', { name: 'Начать заново' }).click();
  await page.getByRole('button', { name: 'Стереть' }).click();
  await expect(page.getByTestId('play')).toContainText('Начать');
});

test('перезагрузка возвращает туда, где остановились', async ({ page }) => {
  await page.goto(fresh);
  await page.getByTestId('tile-the-number').click();
  await page.getByTestId('play').click();
  await expect(firstThread(page)).toBeVisible();

  await page.goto('/?fast=1');
  await expect(page.getByTestId('contacts')).toBeVisible();
});

test('свой .json загружается с главного и сразу играется', async ({ page }) => {
  await page.goto(fresh);
  await page.getByTestId('upload-input').setInputFiles('examples/demo.story.json');

  // сразу открылось описание загруженной истории
  const story = page.getByTestId('story');
  await expect(story).toBeVisible();
  await expect(story).toContainText('Не туда попали');
  await expect(story).toContainText('Лена');

  await page.getByTestId('play').click();
  await expect(page.getByTestId('contacts')).toBeVisible();
  await expect(firstThread(page)).toBeVisible();

  // и осталась на главном рядом со встроенной
  await page.getByTestId('back-story').click();
  await page.getByTestId('story-back').click();
  await expect(page.getByTestId('tile-demo')).toBeVisible();
  await expect(page.getByTestId('tile-the-number')).toBeVisible();
});

test('загруженную историю можно удалить', async ({ page }) => {
  await page.goto(fresh);
  await page.getByTestId('upload-input').setInputFiles('examples/demo.story.json');
  await expect(page.getByTestId('story')).toBeVisible();

  await page.getByTestId('delete-story').click();
  await page.getByRole('button', { name: 'Удалить', exact: true }).click();
  await expect(page.getByTestId('home')).toBeVisible();
  await expect(page.getByTestId('tile-demo')).toHaveCount(0);
});

test('негодный файл не ломает приложение, а объясняет что не так', async ({ page }) => {
  await page.goto(fresh);
  await page.getByTestId('upload-input').setInputFiles({
    name: 'broken.story.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ format: 'relayer-story', version: 1, id: 'x', title: 'X', ink: '-> nowhere' })),
  });
  await expect(page.getByTestId('upload-error')).toContainText('не компилируется');
  await expect(page.getByTestId('home')).toBeVisible();
});
