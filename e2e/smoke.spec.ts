import { expect, test, type Page } from '@playwright/test';

/** Без пауз сюжета и с чистого листа: иначе эпизод идёт настоящими минутами. */
const fresh = '/?screen=home&fast=1&fresh=1';

const firstThread = (page: Page) => page.locator('[data-testid^="thread-"]').first();

test('главный экран показывает карточку истории', async ({ page }) => {
  await page.goto(fresh);
  await expect(page.getByTestId('home')).toBeVisible();
  const tile = page.getByTestId('tile-the-number');
  await expect(tile).toContainText('THE NUMBER');
  await expect(tile).toContainText('Новый номер');
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

  await page.getByTestId('reset').click();
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

test('перезагрузка возвращает в тот же чат, переписка на месте', async ({ page }) => {
  await page.goto(fresh);
  await page.getByTestId('tile-the-number').click();
  await page.getByTestId('play').click();
  await firstThread(page).waitFor();
  const opened = await firstThread(page).getAttribute('data-testid');
  await firstThread(page).click();
  await expect(page.getByTestId('chat')).toBeVisible();
  const before = await page.locator('.message__bubble, .system-line').count();

  // адрес без флагов — так перезагружает страницу игрок
  await page.goto('/');
  await expect(page.getByTestId('chat')).toBeVisible();
  expect(await page.locator('.message__bubble, .system-line').count()).toBeGreaterThanOrEqual(before);
  // и это тот же самый чат
  await page.getByLabel('Назад к сообщениям').click();
  await expect(page.getByTestId(opened!)).toBeVisible();
});

test('«сбросить прогресс» живёт под кнопкой запуска', async ({ page }) => {
  await page.goto(fresh);
  await page.getByTestId('tile-the-number').click();
  await expect(page.getByTestId('reset')).toHaveCount(0); // нечего сбрасывать

  await page.getByTestId('play').click();
  await firstThread(page).waitFor();
  await page.getByTestId('back-story').click();

  const play = await page.getByTestId('play').boundingBox();
  const reset = await page.getByTestId('reset').boundingBox();
  expect(reset!.y).toBeGreaterThan(play!.y);
});

test('на высоком окне страница не прокручивается, экран по центру', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1600 });
  await page.goto(fresh);
  await expect(page.getByTestId('home')).toBeVisible();
  const m = await page.evaluate(() => {
    const r = document.querySelector('.phone')!.getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollHeight - innerHeight,
      top: Math.round(r.top),
      bottom: Math.round(innerHeight - r.bottom),
    };
  });
  expect(m.overflow).toBeLessThanOrEqual(0);
  expect(Math.abs(m.top - m.bottom)).toBeLessThanOrEqual(2);
});

test('встроенная история не двоится с ранее загруженной копией', async ({ page }) => {
  await page.goto(fresh);
  // как будто игрок загрузил эту историю файлом ещё до того, как она приехала в репозиторий
  await page.evaluate(() => {
    const copy = { format: 'relayer-story', version: 1, id: 'the-number', title: 'Старая копия',
      tagline: 'загружена файлом', cover: { from: '#333', to: '#111', glyph: '?' },
      ink: '# title: копия\nпривет #from:x\n-> END\n', origin: 'upload' };
    localStorage.setItem('relay:uploads', JSON.stringify([copy]));
  });
  await page.goto(fresh);
  await expect(page.getByTestId('tile-the-number')).toHaveCount(1);
  await expect(page.getByTestId('tile-the-number')).toContainText('THE NUMBER');
});

test('ширина экрана не зависит от длины сообщений', async ({ page }) => {
  await page.goto('/?story=the-number&screen=game&fast=1&fresh=1');
  await firstThread(page).click();
  // первые реплики короткие — ровно тот случай, когда рамка ужималась
  await expect(page.locator('.message').first()).toBeVisible();
  // на телефоне «телефон» во всю ширину, на широком экране — фиксированная рамка;
  // в обоих случаях он не должен ужиматься под короткие реплики
  const width = await page.evaluate(() => {
    const max = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--phone-width'));
    return { phone: document.querySelector('.phone')!.getBoundingClientRect().width, expected: Math.min(innerWidth, max) };
  });
  expect(Math.abs(width.phone - width.expected)).toBeLessThanOrEqual(2);
});
