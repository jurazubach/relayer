import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { FIXTURE, FIXTURE_PATH, PLOT, messages, uploadFixture } from './fixture';

/**
 * Бесплатная граница глав (E-05): free_chapters в файле истории, «начало бесплатно» на карточке и экране истории,
 * плашка «платное продолжение» в игре, заглушка покупки и «открыть все главы» в отладке.
 * Граница только на стыке глав: первое сообщение следующей главы не приходит, пока продолжение закрыто.
 * Глав игрок не видит (A-08): ни числа, ни номера, ни заголовка в переписке.
 */
const fixtureRaw = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as Record<string, unknown> & {
  free_chapters: number;
  ink: string;
};
const FREE = fixtureRaw.free_chapters;
const CHAPTERS = FIXTURE.chapters!;
/** Ответ, после которого глава 1 кончается: вариант #silent — он без исходящего и без второго контакта. */
const SILENT_BUTTON = fixtureRaw.ink.match(/\* \[(.+?) #to:\w+ #silent\]/)![1];
const SILENT_REPLY = fixtureRaw.ink.match(/#silent\]\n\s*(.+?) #from/)![1];

/** Строки #chapter сценария: заголовок главы и первое сообщение после него. */
const HEADINGS = [...fixtureRaw.ink.matchAll(/^(.+?) #[^\n]*#chapter[^\n]*\n\s*(.+?) #/gm)].map((m) => ({
  heading: m[1],
  first: m[2],
}));

/** Сколько глав игрок уже читает: по первым сообщениям глав, заголовков в переписке нет. */
const chaptersSeen = async (page: Page) => {
  const texts = (await messages(page).allTextContents()).map((t) => t.trim());
  return HEADINGS.filter((h) => texts.some((t) => t.startsWith(h.first))).length;
};

/** В переписке нет ни заголовка главы, ни слова «глава». */
async function noChapterLines(page: Page) {
  const texts = await messages(page).allTextContents();
  for (const h of HEADINGS) expect(texts.some((t) => t.includes(h.heading))).toBe(false);
  expect(texts.filter((t) => /глав/i.test(t))).toEqual([]);
}

async function upload(page: Page, story: Record<string, unknown>, url = '/?screen=home&fast=1&fresh=1') {
  await page.goto(url);
  await page.getByTestId('upload-input').setInputFiles({
    name: `${story.id}.story.json`,
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(story)),
  });
}

/** По клику до конца бесплатной главы: история встаёт на границе. */
async function playToBoundary(page: Page) {
  await page.getByTestId('mode-click').click();
  await page.getByTestId('play').click();
  await page.getByTestId(`thread-${PLOT.first}`).click();
  await page.locator('.choice', { hasText: PLOT.choice }).click();
  await expect(page.getByTestId('paywall')).toBeVisible();
}

/** «Пропустить до следующего» в отладке, пока не выполнится условие. */
async function skipUntil(page: Page, done: () => Promise<boolean>) {
  await page.getByLabel('Панель отладки').click();
  for (let i = 0; i < 30 && !(await done()); i++) {
    const skip = page.getByTestId('skip-next');
    if (await skip.isEnabled()) await skip.click();
    else await page.waitForTimeout(250);
  }
  await page.getByRole('button', { name: 'Готово' }).click();
}

async function openAllChapters(page: Page) {
  await page.getByLabel('Панель отладки').click();
  const toggle = page.getByTestId('chapters-open');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Готово' }).click();
}

test('фикстура держит границу на стыке глав: бесплатных меньше, чем глав', () => {
  expect(Number.isInteger(FREE) && FREE >= 1).toBe(true);
  expect(CHAPTERS.length).toBeGreaterThan(FREE);
  expect(fixtureRaw.ink.match(/#chapter/g)!.length).toBe(CHAPTERS.length);
  expect(HEADINGS).toHaveLength(CHAPTERS.length);
});

test('карточка и экран истории говорят «начало бесплатно» без слова «глава» и числа глав', async ({ page }) => {
  await uploadFixture(page);
  const story = page.getByTestId('story');
  await expect(page.getByTestId('free-chapters')).toContainText('Начало бесплатно');
  await expect(page.getByTestId('free-chapters')).toContainText('платное продолжение');
  await expect(story).not.toContainText(/глав/i);
  for (const ch of CHAPTERS) await expect(story).not.toContainText(ch.title);

  await page.getByTestId('story-back').click();
  const tile = page.getByTestId(`tile-${FIXTURE.id}`);
  await expect(page.getByTestId(`tile-free-${FIXTURE.id}`)).toHaveText('начало бесплатно');
  await expect(tile).not.toContainText(/глав/i);
  // число героев остаётся, числа глав нет
  await expect(page.getByTestId(`tile-counts-${FIXTURE.id}`)).toContainText('геро');
  const chips = await page.getByTestId(`tile-counts-${FIXTURE.id}`).locator('.story-tile__chip').allTextContents();
  expect(chips.filter((c) => !/геро|свой файл|начало бесплатно/.test(c))).toEqual([]);
});

test('после бесплатных глав история встаёт: плашка в чате и над списком, следующая глава не приходит', async ({ page }) => {
  await uploadFixture(page);
  await playToBoundary(page);

  const paywall = page.getByTestId('paywall');
  await expect(paywall).toContainText('Бесплатная часть пройдена');
  await expect(paywall).toContainText('платное продолжение');
  await expect(paywall).toContainText('сохранено');
  await expect(paywall).not.toContainText(/глав/i);
  for (const ch of CHAPTERS) await expect(paywall).not.toContainText(ch.title);
  await expect(page.locator('.choice')).toHaveCount(0);
  expect(await chaptersSeen(page)).toBe(FREE);
  await noChapterLines(page);

  // покупки нет: кнопка честно говорит, что это заглушка
  await page.getByTestId('paywall-buy').click();
  await expect(page.getByTestId('paywall-stub')).toContainText('прототип');
  await expect(page.getByTestId('paywall')).toBeVisible();

  // в отладке «пропустить» на границе ничего не делает
  await page.getByLabel('Панель отладки').click();
  await expect(page.getByTestId('skip-next')).toBeDisabled();
  await expect(page.locator('.sheet')).toContainText('платной границе');
  await page.getByRole('button', { name: 'Готово' }).click();

  await page.getByLabel('Назад к сообщениям').click();
  await expect(page.getByTestId('contacts').getByTestId('paywall')).toBeVisible();

  // граница переживает перезагрузку
  await page.goto(`/?story=${FIXTURE.id}&screen=game&fast=1`);
  await expect(page.getByTestId('paywall')).toBeVisible();

  await page.getByTestId('back-story').click();
  await expect(page.getByTestId('story')).toContainText('Бесплатная часть пройдена');
  await expect(page.getByTestId('play')).toContainText('Продолжить');
  await page.getByTestId('story-back').click();
  await expect(page.getByTestId(`tile-${FIXTURE.id}`)).toContainText('Бесплатная часть пройдена');
});

test('«все главы открыты» в отладке ведёт историю дальше и помнится после «начать заново»', async ({ page }) => {
  await uploadFixture(page);
  await playToBoundary(page);
  await openAllChapters(page);

  await expect(page.getByTestId('paywall')).toHaveCount(0);
  await expect.poll(() => chaptersSeen(page)).toBe(FREE + 1);
  await expect(page.locator('.choice')).toHaveCount(2);
  // стык для игрока — просто пауза персонажа: заголовка главы в переписке нет и в списке чатов тоже
  await noChapterLines(page);
  await page.getByLabel('Назад к сообщениям').click();
  await expect(page.getByTestId('contacts')).not.toContainText(/глав/i);
  for (const ch of CHAPTERS) await expect(page.getByTestId('contacts')).not.toContainText(ch.title);
  await page.getByTestId(`thread-${PLOT.first}`).click();

  await page.getByLabel('Панель отладки').click();
  await page.getByRole('button', { name: 'Начать сцену заново' }).click();
  await page.getByRole('button', { name: 'Стереть' }).click();
  await page.locator('.choice', { hasText: PLOT.choice }).click();
  await expect.poll(() => chaptersSeen(page)).toBe(FREE + 1);
  await expect(page.getByTestId('paywall')).toHaveCount(0);

  // открытое продолжение снимает отметки «начало бесплатно»
  await page.getByLabel('Назад к сообщениям').click();
  await page.getByTestId('back-story').click();
  await expect(page.getByTestId('free-chapters')).toHaveCount(0);
  await page.getByTestId('story-back').click();
  await expect(page.getByTestId(`tile-free-${FIXTURE.id}`)).toHaveCount(0);
});

test('в реальном времени граница встаёт до паузы между главами, пауза идёт после открытия', async ({ page }) => {
  // без ?fast=1: паузы настоящие, их проходит «пропустить до следующего»
  await upload(page, fixtureRaw, '/?screen=home&fresh=1');
  await expect(page.getByTestId('mode-realtime')).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('play').click();
  await page.getByTestId(`thread-${PLOT.first}`).click();
  const chat = page.getByTestId('chat');
  await skipUntil(page, async () => (await page.locator('.choice').count()) > 0);
  await page.locator('.choice', { hasText: SILENT_BUTTON }).click();
  await skipUntil(page, async () => !!(await chat.textContent())?.includes(SILENT_REPLY));
  await expect(chat).toContainText(SILENT_REPLY);
  // граница — сразу, как кончилась бесплатная глава, без двухчасовой паузы перед ней
  await expect(page.getByTestId('paywall')).toBeVisible();

  await openAllChapters(page);
  await expect(page.getByTestId('paywall')).toHaveCount(0);
  // пауза между главами началась только теперь: Мира не в сети, глава 2 ещё не пришла
  await expect(page.locator('.chat__hint')).toContainText('не в сети');
  expect(await chaptersSeen(page)).toBe(FREE);
  await skipUntil(page, async () => (await chaptersSeen(page)) > FREE);
  expect(await chaptersSeen(page)).toBe(FREE + 1);
  await noChapterLines(page);
});

test('free_chapters не целым числом от 1 загрузка не принимает и объясняет', async ({ page }) => {
  await upload(page, { ...fixtureRaw, id: 'e2e-bad-free', free_chapters: 0 });
  await expect(page.getByTestId('upload-error')).toContainText('free_chapters');
  await expect(page.getByTestId('tile-e2e-bad-free')).toHaveCount(0);
});

test('free_chapters не меньше числа глав — граница не действует', async ({ page }) => {
  await upload(page, { ...fixtureRaw, free_chapters: CHAPTERS.length });
  await expect(page.getByTestId('story')).toBeVisible();
  await expect(page.getByTestId('free-chapters')).toHaveCount(0);
  await page.getByTestId('mode-click').click();
  await page.getByTestId('play').click();
  await page.getByTestId(`thread-${PLOT.first}`).click();
  await page.locator('.choice', { hasText: PLOT.choice }).click();
  await expect.poll(() => chaptersSeen(page)).toBe(CHAPTERS.length);
  await expect(page.getByTestId('paywall')).toHaveCount(0);
});
