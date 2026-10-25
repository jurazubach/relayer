import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { FIXTURE, FIXTURE_PATH, PLOT, messages, uploadFixture } from './fixture';

/**
 * Бесплатная граница глав (E-05): free_chapters в файле истории, закрытые главы на карточке и экране истории,
 * плашка «платное продолжение» в игре, заглушка покупки и «открыть все главы» в отладке.
 * Граница только на стыке глав: строка #chapter следующей главы не приходит, пока продолжение закрыто.
 */
const fixtureRaw = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as Record<string, unknown> & {
  free_chapters: number;
  ink: string;
};
const FREE = fixtureRaw.free_chapters;
const CHAPTERS = FIXTURE.chapters!;
const LOCKED = CHAPTERS[FREE];
/** Ответ, после которого глава 1 кончается: вариант #silent — он без исходящего и без второго контакта. */
const SILENT_BUTTON = fixtureRaw.ink.match(/\* \[(.+?) #to:\w+ #silent\]/)![1];
const SILENT_REPLY = fixtureRaw.ink.match(/#silent\]\n\s*(.+?) #from/)![1];

/** Плашки глав в переписке: «Глава 1 · …». Заголовок закрытой главы приходить не должен. */
const chapterLines = async (page: Page) =>
  (await messages(page).allTextContents()).filter((t) => /^Глава \d/.test(t.trim()));

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
});

test('карточка и экран истории показывают, какие главы бесплатны, а какие закрыты', async ({ page }) => {
  await uploadFixture(page);
  await expect(page.getByTestId('free-chapters')).toContainText(`из ${CHAPTERS.length}`);
  await expect(page.getByTestId('free-chapters')).toContainText('платное продолжение');
  const locked = page.getByTestId('chapter-locked');
  await expect(locked).toHaveCount(CHAPTERS.length - FREE);
  await expect(locked.first()).toContainText(LOCKED.title);
  await expect(locked.first()).toContainText('платно');

  await page.getByTestId('story-back').click();
  // в новой вёрстке карточки — плашкой рядом с числом глав
  await expect(page.getByTestId(`tile-free-${FIXTURE.id}`)).toContainText('бесплатно');
  await expect(page.getByTestId(`tile-counts-${FIXTURE.id}`)).toContainText(new RegExp(`${CHAPTERS.length}\\s+глав`));
});

test('после бесплатных глав история встаёт: плашка в чате и над списком, следующая глава не приходит', async ({ page }) => {
  await uploadFixture(page);
  await playToBoundary(page);

  const paywall = page.getByTestId('paywall');
  await expect(paywall).toContainText(`Глава ${FREE + 1}`);
  await expect(paywall).toContainText(LOCKED.title);
  await expect(paywall).toContainText('сохранено');
  await expect(page.locator('.choice')).toHaveCount(0);
  expect(await chapterLines(page)).toHaveLength(FREE);

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
  await expect(page.getByTestId('story')).toContainText('Бесплатные главы пройдены');
  await expect(page.getByTestId('play')).toContainText('Продолжить');
  await page.getByTestId('story-back').click();
  await expect(page.getByTestId(`tile-${FIXTURE.id}`)).toContainText('Бесплатные главы пройдены');
});

test('«все главы открыты» в отладке ведёт историю дальше и помнится после «начать заново»', async ({ page }) => {
  await uploadFixture(page);
  await playToBoundary(page);
  await openAllChapters(page);

  await expect(page.getByTestId('paywall')).toHaveCount(0);
  await expect.poll(() => chapterLines(page)).toHaveLength(FREE + 1);
  await expect(page.locator('.choice')).toHaveCount(2);

  await page.getByLabel('Панель отладки').click();
  await page.getByRole('button', { name: 'Начать сцену заново' }).click();
  await page.getByRole('button', { name: 'Стереть' }).click();
  await page.locator('.choice', { hasText: PLOT.choice }).click();
  await expect.poll(() => chapterLines(page)).toHaveLength(FREE + 1);
  await expect(page.getByTestId('paywall')).toHaveCount(0);

  // открытое продолжение снимает отметки закрытых глав
  await page.getByLabel('Назад к сообщениям').click();
  await page.getByTestId('back-story').click();
  await expect(page.getByTestId('free-chapters')).toHaveCount(0);
  await expect(page.getByTestId('chapter-locked')).toHaveCount(0);
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
  expect(await chapterLines(page)).toHaveLength(FREE);
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
  await expect(page.getByTestId('chapter-locked')).toHaveCount(0);
  await page.getByTestId('mode-click').click();
  await page.getByTestId('play').click();
  await page.getByTestId(`thread-${PLOT.first}`).click();
  await page.locator('.choice', { hasText: PLOT.choice }).click();
  await expect.poll(() => chapterLines(page)).toHaveLength(CHAPTERS.length);
  await expect(page.getByTestId('paywall')).toHaveCount(0);
});
