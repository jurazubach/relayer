import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { FIXTURE, FIXTURE_GAME, FIXTURE_PATH, PLOT, uploadFixture } from './fixture';

/**
 * Молчание у кнопки (E-02): напоминания #remind, ветка «не ответил» (#silent или #noanswer),
 * в «по клику» напоминаний нет, уведомления выключаются в игре.
 * Без ?fast=1: «без пауз» кнопку не торопит, напоминания идут только по таймеру и «пропустить до следующего».
 */
const SLOW = '/?screen=home&fresh=1';
const fixtureRaw = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as Record<string, unknown> & { ink: string };

/** Реплики напоминаний фикстуры по порядку — из самого файла, чтобы правка текста не роняла тест. */
const REMINDERS = [...fixtureRaw.ink.matchAll(/\[#remind:[^\]]+\]\s*(.+)/g)].map((m) => m[1].trim());
const SILENT_REPLY = fixtureRaw.ink.match(/#silent\]\n\s*(.+?) #from/)![1];

async function upload(page: Page, story: Record<string, unknown>) {
  await page.goto(SLOW);
  await page.getByTestId('upload-input').setInputFiles({
    name: `${story.id}.story.json`,
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(story)),
  });
  await expect(page.getByTestId('story')).toBeVisible();
}

/** Короткие интервалы: напоминания приходят за секунды настоящего времени. */
const QUICK = {
  format: 'relayer-story', version: 1, id: 'e2e-remind', title: 'Напоминания', tagline: 'проверка молчания у кнопки',
  minutes: 1, days: 0.01,
  cover: { from: '#333', to: '#111', glyph: '?' },
  characters: [{ id: 'ann', name: 'Аня', role: 'ждёт ответа' }],
  ink: [
    '# title: Напоминания',
    '# contact: ann, Аня, teal',
    '',
    'звонить хозяину? #from:ann',
    '- (ask)',
    '* [Звони] звоню #from:ann',
    '  -> END',
    '* [Промолчать #silent]',
    '  ладно, сама решу #from:ann',
    '  -> END',
    '* [#remind:2s] алё, ты тут?',
    '  -> ask',
    '* [#remind:2s] мне нужно да или нет',
    '  -> ask',
  ].join('\n'),
};

async function openDebug(page: Page) {
  await page.getByLabel('Панель отладки').click();
  await expect(page.getByTestId('skip-next')).toBeVisible();
}

/** «Пропустить до следующего», пока в чате не появится текст. */
async function skipUntil(page: Page, text: string) {
  const chat = page.getByTestId('chat');
  for (let i = 0; i < 20; i++) {
    if ((await chat.textContent())?.includes(text)) return;
    const skip = page.getByTestId('skip-next');
    if (await skip.isEnabled()) await skip.click();
    else await page.waitForTimeout(250);
  }
  await expect(chat).toContainText(text);
}

test('фикстура: два напоминания у кнопки, потом история идёт по #silent', async ({ page }) => {
  expect(REMINDERS.length).toBeGreaterThanOrEqual(2);
  await uploadFixture(page);
  await page.getByTestId('mode-realtime').click();
  await page.getByTestId('play').click();
  await page.getByTestId(`thread-${PLOT.first}`).click();
  const choices = page.locator('.choice');

  // uploadFixture открывает игру с ?fast=1: паузы сюжета проходят сами, а кнопку «без пауз» не торопит —
  // напоминания присылает только «пропустить до следующего»
  await expect(choices).toHaveCount(2);
  await page.waitForTimeout(1_000);
  await expect(page.getByTestId('chat')).not.toContainText(REMINDERS[0]);
  await openDebug(page);
  await expect(page.locator('.sheet')).toContainText('персонаж напомнит');

  await skipUntil(page, REMINDERS[0]);
  await expect(choices).toHaveCount(2); // напоминание — не кнопка, кнопки на месте
  await skipUntil(page, REMINDERS[1]);
  await expect(choices).toHaveCount(2);
  await expect(page.locator('.sheet')).toContainText('веткой «не ответил»');

  await skipUntil(page, SILENT_REPLY);
  await page.getByRole('button', { name: 'Готово' }).click();
  // игрок ничего не отправлял: исходящих нет, кнопки ушли
  await expect(page.locator('.message--out')).toHaveCount(0);
  await expect(page.locator('.message__bubble', { hasText: REMINDERS[0] })).toHaveCount(1);
  await expect(choices).toHaveCount(0);
});

test('в реальном времени напоминания приходят сами по интервалам сценария', async ({ page }) => {
  await upload(page, QUICK);
  await page.getByTestId('play').click();
  await page.getByTestId('thread-ann').click();
  const chat = page.getByTestId('chat');
  await expect(page.locator('.choice')).toHaveCount(2);
  await expect(page.locator('.choice', { hasText: 'алё' })).toHaveCount(0);

  await expect(chat).toContainText('алё, ты тут?');
  await expect(chat).toContainText('мне нужно да или нет');
  await expect(chat).toContainText('ладно, сама решу');
  await expect(page.locator('.message--out')).toHaveCount(0);

  // «не ответил» запомнен в сохранении: после перезагрузки история там же, напоминания не повторяются
  // без ?fresh=1 из адреса: приложение возвращает в тот же чат
  await page.goto('/');
  await expect(page.getByTestId('chat')).toContainText('ладно, сама решу');
  await expect(page.locator('.message__bubble', { hasText: 'алё, ты тут?' })).toHaveCount(1);
  await expect(page.locator('.choice')).toHaveCount(0);
});

test('ответ до напоминания отменяет его', async ({ page }) => {
  await upload(page, { ...QUICK, ink: QUICK.ink.replaceAll('#remind:2s', '#remind:4s') });
  await page.getByTestId('play').click();
  await page.getByTestId('thread-ann').click();
  await page.locator('.choice', { hasText: 'Звони' }).click();
  await expect(page.getByTestId('chat')).toContainText('звоню');
  await page.waitForTimeout(9_000);
  await expect(page.getByTestId('chat')).not.toContainText('алё');
});

test('пока печатается напоминание, кнопки на месте, и ответ его отменяет', async ({ page }) => {
  await upload(page, QUICK);
  await page.getByTestId('play').click();
  await page.getByTestId('thread-ann').click();
  // напоминание уже набирается: собеседник пишет, а клавиатуру у игрока не отнимают
  await expect(page.locator('.typing-dots')).toBeVisible({ timeout: 6_000 });
  await expect(page.locator('.choice')).toHaveCount(2);
  await page.locator('.choice', { hasText: 'Звони' }).click();
  const chat = page.getByTestId('chat');
  await expect(page.locator('.message--out')).toHaveText(/Звони/);
  await expect(chat).toContainText('звоню');
  await page.waitForTimeout(3_000);
  await expect(chat).not.toContainText('алё');
  await expect(chat).not.toContainText('ладно, сама решу');
});

test('ускорение пауз в отладке не сокращает молчание у кнопки', async ({ page }) => {
  await upload(page, { ...QUICK, ink: QUICK.ink.replaceAll('#remind:2s', '#remind:5s') });
  await page.getByTestId('play').click();
  await page.getByTestId('thread-ann').click();
  await expect(page.locator('.choice')).toHaveCount(2);
  await openDebug(page);
  await page.getByRole('button', { name: '×60' }).click();
  await page.getByRole('button', { name: 'Готово' }).click();
  // при ×60 пять секунд прошли бы за 0,1 с
  await page.waitForTimeout(2_000);
  await expect(page.getByTestId('chat')).not.toContainText('алё');
  await expect(page.getByTestId('chat')).toContainText('алё, ты тут?', { timeout: 8_000 });
});

test('по клику напоминаний нет: кнопка ждёт игрока', async ({ page }) => {
  await upload(page, QUICK);
  await page.getByTestId('mode-click').click();
  await page.getByTestId('play').click();
  await page.getByTestId('thread-ann').click();
  await expect(page.locator('.choice')).toHaveCount(2);
  await page.waitForTimeout(6_000);
  const chat = page.getByTestId('chat');
  await expect(chat).not.toContainText('алё');
  await expect(chat).not.toContainText('ладно, сама решу');
  await expect(page.locator('.choice')).toHaveCount(2);
  // и «пропустить» у кнопок по клику ничего не присылает
  await openDebug(page);
  await expect(page.getByTestId('skip-next')).toBeDisabled();
});

test('уведомления выключаются в игре и остаются выключенными', async ({ page }) => {
  await uploadFixture(page);
  await page.goto(FIXTURE_GAME);
  const toggle = page.getByTestId('notices');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');

  // плашка не должна появиться ни на миг: следим за DOM, а не ловим её глазами
  await page.evaluate(() => {
    const w = window as unknown as { sawNotice: boolean };
    w.sawNotice = false;
    new MutationObserver(() => {
      if (document.querySelector('[data-testid="notice"]')) w.sawNotice = true;
    }).observe(document.body, { childList: true, subtree: true });
  });
  await page.getByTestId(`thread-${PLOT.first}`).click();
  await page.locator('.choice', { hasText: PLOT.choice }).click();
  await page.getByLabel('Назад к сообщениям').click();
  // ответ смотрителя пришёл в другой чат — а плашки не было
  await expect(page.getByTestId(`thread-${PLOT.unlocked}`)).toBeVisible();
  const keeper = FIXTURE.characters!.find((c) => c.id === PLOT.unlocked)!;
  await expect(page.getByTestId(`thread-${PLOT.unlocked}`)).toContainText(keeper.name);
  expect(await page.evaluate(() => (window as unknown as { sawNotice: boolean }).sawNotice)).toBe(false);

  await page.reload();
  await expect(page.getByTestId('notices')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('notices').click();
  await expect(page.getByTestId('notices')).toHaveAttribute('aria-pressed', 'false');
});

test('с включёнными уведомлениями сообщение из другого чата показывает плашку', async ({ page }) => {
  await uploadFixture(page);
  await page.goto(FIXTURE_GAME);
  await page.getByTestId(`thread-${PLOT.first}`).click();
  const header = page.locator('.chat__header');
  const before = await header.boundingBox();
  await page.locator('.choice', { hasText: PLOT.choice }).click();
  const notice = page.getByTestId('notice');
  await expect(notice).toBeVisible();
  // баннер поверх экрана: шапка чата не сдвигается
  expect(await header.boundingBox()).toEqual(before);

  // взмах вверх убирает баннер, чат не открывается
  const box = (await notice.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y - 30, { steps: 3 });
  await page.mouse.move(x, y - 60, { steps: 3 });
  await page.mouse.up();
  await expect(notice).toHaveCount(0);
  await expect(header).toContainText(FIXTURE.characters!.find((c) => c.id === PLOT.first)!.name);
});
