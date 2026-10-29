import { expect, test } from '@playwright/test';
import { FRESH } from './fixture';

/**
 * Фото-сообщения: #photo:имя с картинкой из поля "images" (так его собирает story:pack), с именем без файла
 * и без имени — обе последние остаются заглушкой с описанием. Тап по картинке открывает её на весь экран.
 * История собирается здесь же: фикстуре e2e картинка ни к чему, а остальные проверки считают её сообщения.
 */
const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const STORY = {
  format: 'relayer-story',
  version: 1,
  id: 'e2e-photo',
  title: 'Фото на причале',
  tagline: 'Проверка картинок',
  cover: { from: '#334155', to: '#0f141b', glyph: '✳' },
  images: { note: PIXEL },
  ink: [
    '# contact: mira, Мира, teal',
    'ты тут? #from:mira',
    'Записка на двери #photo:note #delay:2s',
    'Карта причала #photo:missing',
    'Старая заглушка #photo',
    'видишь? #delay:2s',
    '-> END',
  ].join('\n'),
};

test.beforeEach(async ({ page }) => {
  await page.goto(FRESH);
  await page.getByTestId('upload-input').setInputFiles({ name: 'photo.story.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(STORY)) });
  await expect(page.getByTestId('story')).toBeVisible();
  await page.goto(`/?story=${STORY.id}&screen=game&fast=1&fresh=1&mode=click`);
  await page.getByTestId('thread-mira').click();
  await expect(page.getByTestId('chat')).toContainText('видишь?');
});

test('картинка из файла истории — в пузыре, без файла — заглушка с описанием', async ({ page }) => {
  const photo = page.getByTestId('photo');
  await expect(photo).toHaveCount(1);
  await expect(photo.locator('img')).toHaveAttribute('alt', 'Записка на двери');
  await expect(photo.locator('img')).toHaveAttribute('src', PIXEL);
  // подпись-описание под картинкой не показывается: оно — alt
  await expect(page.locator('.photo-message__caption')).toHaveText(['Карта причала', 'Старая заглушка']);
});

test('тап открывает фото на весь экран: кто прислал, закрывается крестиком и Escape', async ({ page }) => {
  await page.getByTestId('photo').click();
  const viewer = page.getByTestId('photo-viewer');
  await expect(viewer).toBeVisible();
  await expect(viewer).toContainText('Мира');
  await expect(viewer.locator('img')).toHaveAttribute('alt', 'Записка на двери');
  await page.keyboard.press('Escape');
  await expect(viewer).toBeHidden();

  await page.getByTestId('photo').click();
  await page.getByTestId('photo-viewer-close').click();
  await expect(viewer).toBeHidden();
  await expect(page.getByTestId('chat')).toBeVisible();
});
