import { expect, test } from '@playwright/test';
import {
  BUILTIN,
  DEMO,
  DEMO_PATH,
  FIXTURE,
  FIXTURE_GAME,
  FIXTURE_PATH,
  FRESH,
  PLOT,
  firstThread,
  fixtureOnHome,
  messages,
  uploadFixture,
} from './fixture';
// тесты режимов игры живут отдельно, но идут в том же прогоне
import './modes';

const tile = `tile-${FIXTURE.id}`;

test('главный экран показывает карточку истории', async ({ page }) => {
  await fixtureOnHome(page);
  const card = page.getByTestId(tile);
  await expect(card).toContainText(FIXTURE.title);
  await expect(card).toContainText(FIXTURE.series!);
  await expect(card).toContainText(FIXTURE.tagline!);
  // метка загруженной истории — на карточке
  await expect(card.locator('..')).toContainText('свой файл');
});

test('карточка показывает затравки, главы и героев', async ({ page }) => {
  await fixtureOnHome(page);
  const teasers = page.getByTestId(`tile-teasers-${FIXTURE.id}`);
  for (const t of FIXTURE.teasers!) await expect(teasers).toContainText(t);

  const counts = page.getByTestId(`tile-counts-${FIXTURE.id}`);
  // игрок (запись без id) и служебные контакты в число героев не входят
  const people = FIXTURE.characters!.filter((c) => c.id && !c.service).length;
  expect(people).toBeLessThan(FIXTURE.characters!.length);
  await expect(counts).toContainText(new RegExp(`${FIXTURE.chapters!.length}\\s+глав`));
  await expect(counts).toContainText(new RegExp(`${people}\\s+геро`));
  await expect(page.getByTestId(tile)).toContainText('по клику');
});

test('карточка на всю ширину колонки, текст не обрезан', async ({ page }) => {
  await fixtureOnHome(page);
  const geo = await page.getByTestId(tile).evaluate((button) => {
    const li = button.parentElement!;
    const list = li.parentElement!;
    const pad = parseFloat(getComputedStyle(list).paddingLeft) + parseFloat(getComputedStyle(list).paddingRight);
    // всё, что могло бы срезать текст: обрезка по строкам или переполнение внутри блока
    // знак обложки нарочно выходит за край, его не считаем
    const clipped = [...button.querySelectorAll<HTMLElement>('*')]
      .filter((el) => el.textContent?.trim() && !el.closest('[aria-hidden="true"]'))
      .filter((el) => {
        const css = getComputedStyle(el);
        const clamp = css.getPropertyValue('-webkit-line-clamp');
        return (clamp && clamp !== 'none') || el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1;
      })
      .map((el) => el.textContent);
    return {
      card: li.getBoundingClientRect().width,
      column: list.clientWidth - pad,
      phone: document.querySelector('.phone')!.getBoundingClientRect().width,
      // карточка не срезает собственное содержимое по высоте
      overflow: button.offsetHeight - li.clientHeight,
      clipped,
      viewport: innerWidth,
    };
  });
  expect(Math.abs(geo.card - geo.column)).toBeLessThanOrEqual(1);
  // на телефоне колонка — весь экран без полей; на десктопе её держит рамка .phone
  if (geo.viewport < 520) expect(geo.card).toBeGreaterThanOrEqual(geo.viewport - 40);
  expect(geo.card).toBeLessThanOrEqual(geo.phone);
  expect(geo.overflow).toBeLessThanOrEqual(0);
  expect(geo.clipped).toEqual([]);
});

test('карточка открывает описание истории', async ({ page }) => {
  await fixtureOnHome(page);
  await page.getByTestId(tile).click();

  const story = page.getByTestId('story');
  await expect(story).toBeVisible();
  await expect(story).toContainText('О чём');
  await expect(story).toContainText('Герои');
  for (const c of FIXTURE.characters!) await expect(story).toContainText(c.name);
  await expect(story).toContainText('Главы');
  for (const ch of FIXTURE.chapters!) await expect(story).toContainText(ch.title);
  await expect(page.getByTestId('play')).toContainText('Начать');
});

test('из описания запускается игра, сюжет идёт сам', async ({ page }) => {
  await uploadFixture(page);
  await page.getByTestId('play').click();

  await expect(page.getByTestId('contacts')).toBeVisible();
  await expect(page.getByTestId(`thread-${PLOT.first}`)).toBeVisible();
});

test('чат открывается и в нём есть сообщения', async ({ page }) => {
  await uploadFixture(page);
  await page.goto(FIXTURE_GAME);
  await firstThread(page).click();
  await expect(page.getByTestId('chat')).toBeVisible();
  await expect(messages(page).first()).toBeVisible();
});

test('выбор двигает сюжет: ответ приходит, открывается новый контакт', async ({ page }) => {
  await uploadFixture(page);
  await page.goto(FIXTURE_GAME);
  await page.getByTestId(`thread-${PLOT.first}`).click();

  await page.locator('.choice', { hasText: PLOT.choice }).click();
  await expect(page.getByTestId('chat')).toContainText(PLOT.reply);

  await page.getByLabel('Назад к сообщениям').click();
  await expect(page.getByTestId(`thread-${PLOT.unlocked}`)).toBeVisible();
});

test('назад: игра → описание → главный, прогресс виден везде', async ({ page }) => {
  await uploadFixture(page);
  await page.getByTestId('play').click();
  await expect(firstThread(page)).toBeVisible();

  await page.getByTestId('back-story').click();
  await expect(page.getByTestId('story')).toBeVisible();
  await expect(page.getByTestId('play')).toContainText('Продолжить');

  await page.getByTestId('story-back').click();
  await expect(page.getByTestId('home')).toBeVisible();
  await expect(page.getByTestId(tile)).toContainText('Продолжить');
  // начатая карточка говорит, где игрок, а не зачем начинать
  await expect(page.getByTestId(`tile-teasers-${FIXTURE.id}`)).toHaveCount(0);
});

test('«начать заново» стирает прогресс', async ({ page }) => {
  await uploadFixture(page);
  await page.getByTestId('play').click();
  await expect(firstThread(page)).toBeVisible();
  await page.getByTestId('back-story').click();

  await page.getByTestId('reset').click();
  await page.getByRole('button', { name: 'Стереть' }).click();
  await expect(page.getByTestId('play')).toContainText('Начать');
  await expect(page.getByTestId('reset')).toHaveCount(0);
});

test('перезагрузка возвращает туда, где остановились', async ({ page }) => {
  await uploadFixture(page);
  await page.getByTestId('play').click();
  await expect(firstThread(page)).toBeVisible();

  await page.goto('/?fast=1');
  await expect(page.getByTestId('contacts')).toBeVisible();
  await expect(page.getByTestId(`thread-${PLOT.first}`)).toBeVisible();
});

test('свой .json загружается с главного и сразу играется', async ({ page }) => {
  await page.goto(FRESH);
  await page.getByTestId('upload-input').setInputFiles(FIXTURE_PATH);

  // сразу открылось описание загруженной истории
  const story = page.getByTestId('story');
  await expect(story).toBeVisible();
  await expect(story).toContainText(FIXTURE.title);
  await expect(story).toContainText(FIXTURE.characters![0].name);

  await page.getByTestId('play').click();
  await expect(page.getByTestId('contacts')).toBeVisible();
  await expect(firstThread(page)).toBeVisible();

  // и осталась на главном рядом со встроенными
  await page.getByTestId('back-story').click();
  await page.getByTestId('story-back').click();
  await expect(page.getByTestId(tile)).toBeVisible();
  if (BUILTIN) await expect(page.getByTestId(`tile-${BUILTIN.id}`)).toBeVisible();
});

test('встроенная история из папки собирает главы через INCLUDE прямо в браузере', async ({ page }) => {
  test.skip(!BUILTIN?.chapterFiles, 'в src/stories нет истории с главами отдельными файлами');
  await page.goto(`/?story=${BUILTIN!.id}&screen=game&fast=1&fresh=1`);
  await expect(page.getByTestId('contacts')).toBeVisible();
  await firstThread(page).click();
  await expect(messages(page).first()).toBeVisible();
});

test('собранный .json с главами в "includes" загружается и играется', async ({ page }) => {
  // так выглядит файл от npm run story:pack: главный файл в "ink", главы отдельно
  const packed = {
    format: 'relayer-story', version: 1, id: 'e2e-chapters', title: 'Главы файлами', tagline: 'проверка',
    cover: { from: '#333', to: '#111', glyph: '?' },
    ink: '# title: Главы файлами\n# contact: ann, Аня, teal\n\n-> start\nINCLUDE ch01.ink\n',
    includes: { 'ch01.ink': '=== start ===\nэто пришло из второго файла #from:ann\n-> END\n' },
  };
  await page.goto(FRESH);
  await page.getByTestId('upload-input').setInputFiles({
    name: 'e2e-chapters.story.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(packed)),
  });
  await expect(page.getByTestId('story')).toContainText(packed.title);
  await page.getByTestId('play').click();
  await page.getByTestId('thread-ann').click();
  await expect(page.getByTestId('chat')).toContainText('это пришло из второго файла');
});

test('пример для авторов по-прежнему загружается', async ({ page }) => {
  await page.goto(FRESH);
  await page.getByTestId('upload-input').setInputFiles(DEMO_PATH);
  await expect(page.getByTestId('story')).toContainText(DEMO.title);
  await page.getByTestId('play').click();
  await expect(firstThread(page)).toBeVisible();
});

test('загруженную историю можно удалить', async ({ page }) => {
  await uploadFixture(page);

  await page.getByTestId('delete-story').click();
  await page.getByRole('button', { name: 'Удалить', exact: true }).click();
  await expect(page.getByTestId('home')).toBeVisible();
  await expect(page.getByTestId(tile)).toHaveCount(0);

  // и после перезагрузки не возвращается
  await page.goto(FRESH);
  await expect(page.getByTestId('home')).toBeVisible();
  await expect(page.getByTestId(tile)).toHaveCount(0);
});

test('негодный файл не ломает приложение, а объясняет что не так', async ({ page }) => {
  await page.goto(FRESH);
  await page.getByTestId('upload-input').setInputFiles({
    name: 'broken.story.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ format: 'relayer-story', version: 1, id: 'x', title: 'X', ink: '-> nowhere' })),
  });
  await expect(page.getByTestId('upload-error')).toContainText('не компилируется');
  await expect(page.getByTestId('home')).toBeVisible();
  await expect(page.getByTestId('tile-x')).toHaveCount(0);
});

test('перезагрузка возвращает в тот же чат, переписка на месте', async ({ page }) => {
  await uploadFixture(page);
  await page.getByTestId('play').click();
  await firstThread(page).waitFor();
  const opened = await firstThread(page).getAttribute('data-testid');
  await firstThread(page).click();
  await expect(page.getByTestId('chat')).toBeVisible();
  await expect(messages(page).first()).toBeVisible();
  const before = await messages(page).count();

  // адрес без флагов — так перезагружает страницу игрок
  await page.goto('/');
  await expect(page.getByTestId('chat')).toBeVisible();
  expect(await messages(page).count()).toBeGreaterThanOrEqual(before);
  // и это тот же самый чат
  await page.getByLabel('Назад к сообщениям').click();
  await expect(page.getByTestId(opened!)).toBeVisible();
});

test('«сбросить прогресс» живёт под кнопкой запуска', async ({ page }) => {
  await uploadFixture(page);
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
  await page.goto(FRESH);
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
  test.skip(!BUILTIN, 'в src/stories нет ни одной встроенной истории');
  const builtin = BUILTIN!;
  await page.goto(FRESH);
  // как будто игрок загрузил эту историю файлом ещё до того, как она приехала в репозиторий
  await page.evaluate((id) => {
    const copy = { format: 'relayer-story', version: 1, id, title: 'Старая копия',
      tagline: 'загружена файлом', cover: { from: '#333', to: '#111', glyph: '?' },
      ink: '# title: копия\nпривет #from:x\n-> END\n', origin: 'upload' };
    localStorage.setItem('relay:uploads', JSON.stringify([copy]));
  }, builtin.id);
  await page.goto(FRESH);
  const card = page.getByTestId(`tile-${builtin.id}`);
  await expect(card).toHaveCount(1);
  await expect(card).toContainText(builtin.title);
  await expect(card).not.toContainText('Старая копия');
});

test('загрузка с id встроенной истории отклоняется', async ({ page }) => {
  test.skip(!BUILTIN, 'в src/stories нет ни одной встроенной истории');
  await page.goto(FRESH);
  await page.getByTestId('upload-input').setInputFiles({
    name: 'clash.story.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ ...FIXTURE, id: BUILTIN!.id })),
  });
  await expect(page.getByTestId('upload-error')).toContainText('занят встроенной');
});

test('ширина экрана не зависит от длины сообщений', async ({ page }) => {
  await uploadFixture(page);
  await page.goto(FIXTURE_GAME);
  await firstThread(page).click();
  // первые реплики фикстуры короткие — ровно тот случай, когда рамка ужималась
  await expect(page.locator('.message').first()).toBeVisible();
  // на телефоне «телефон» во всю ширину, на широком экране — фиксированная рамка;
  // в обоих случаях он не должен ужиматься под короткие реплики
  const width = await page.evaluate(() => {
    const max = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--phone-width'));
    return { phone: document.querySelector('.phone')!.getBoundingClientRect().width, expected: Math.min(innerWidth, max) };
  });
  expect(Math.abs(width.phone - width.expected)).toBeLessThanOrEqual(2);
});
