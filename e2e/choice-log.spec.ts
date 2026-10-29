import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { FIXTURE_PATH, PLOT, uploadFixture } from './fixture';

/**
 * Журнал выборов (E-03): тестер выгружает его из отладки, бот повторяет маршрут —
 * story:trace --from-save проходит тем же путём через те же узлы.
 */
const fixtureRaw = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as { ink: string };
/** Напоминания первой развилки: она стоит до первого узла. */
const REMINDERS = [...fixtureRaw.ink.split('\n===')[0].matchAll(/\[#remind:[^\]]+\]\s*(.+)/g)].map((m) => m[1].trim());
const SILENT_REPLY = fixtureRaw.ink.match(/#silent\]\n\s*(.+?) #from/)![1];

/** Вторая развилка фикстуры: первый узел с кнопками и вторая кнопка в нём. */
const SECOND = (() => {
  const m = fixtureRaw.ink.match(/=== (\w+) ===[\s\S]*?\n\* \[(.+?) #to:[^\]]*\][\s\S]*?\n\* \[(.+?) #to:/)!;
  return { knot: m[1], button: m[3] };
})();

interface LogFile {
  format: string;
  storyId: string;
  mode: string;
  route: number[];
  exact: boolean;
  ended: boolean;
  choices: { kind: string; knot: string | null; picked: number | null; text: string; options: string[]; reminders: number; vars: object }[];
}

async function exportLog(page: Page): Promise<{ file: LogFile; path: string }> {
  await page.getByLabel('Панель отладки').click();
  await expect(page.getByTestId('choice-log')).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('choice-log-export').click()]);
  expect(download.suggestedFilename()).toMatch(/\.choices-[\d-]+\.json$/);
  const path = await download.path();
  return { file: JSON.parse(readFileSync(path, 'utf8')) as LogFile, path };
}

/** Тот же маршрут ботом: команда, которой автор разбирает журнал тестера. */
function trace(path: string, mode: string) {
  const out = execFileSync(
    'node',
    ['scripts/story/trace.mjs', '--story', FIXTURE_PATH, '--from-save', path, '--persona', 'first', '--mode', mode, '--json'],
    { encoding: 'utf8' },
  );
  const run = (JSON.parse(out) as { stories: { runs: { route: number[]; items: { type: string; knot: string | null }[] }[] }[] }).stories[0].runs[0];
  return { route: run.route, knots: run.items.filter((i) => i.type === 'choice').map((i) => i.knot ?? null) };
}

test('журнал по клику: кнопки, узлы и выгрузка, которую повторяет story:trace', async ({ page }) => {
  await uploadFixture(page);
  await page.getByTestId('mode-click').click();
  await page.getByTestId('play').click();
  await page.getByTestId(`thread-${PLOT.first}`).click();

  await page.getByLabel('Панель отладки').click();
  await expect(page.getByTestId('choice-log-export')).toBeDisabled();
  await page.getByRole('button', { name: 'Готово' }).click();

  await page.locator('.choice', { hasText: PLOT.choice }).click();
  // вторая развилка — в главе 2 за бесплатной границей фикстуры: тестер открывает продолжение в отладке
  await expect(page.getByTestId('paywall')).toBeVisible();
  await page.getByLabel('Панель отладки').click();
  await page.getByTestId('chapters-open').click();
  await page.getByRole('button', { name: 'Готово' }).click();
  await page.locator('.choice', { hasText: SECOND.button }).click();
  await expect(page.locator('.choice')).toHaveCount(0);

  const { file, path } = await exportLog(page);
  await expect(page.getByTestId('choice-log')).toContainText(SECOND.button);
  await expect(page.getByTestId('choice-log')).toContainText(SECOND.knot);
  expect(file.format).toBe('relayer-choices');
  expect(file.mode).toBe('click');
  expect(file.exact).toBe(true);
  expect(file.route).toEqual([0, 1]);
  expect(file.choices.map((c) => c.kind)).toEqual(['choice', 'choice']);
  expect(file.choices[0].text).toContain(PLOT.choice);
  expect(file.choices[1].knot).toBe(SECOND.knot);
  expect(file.choices[1].options).toHaveLength(2);

  const run = trace(path, 'click');
  expect(run.route).toEqual(file.route);
  // развилки бота стоят в тех же узлах, что и у игрока: жалобу тестера можно привязать к узлу
  expect(run.knots).toEqual(file.choices.map((c) => c.knot));
});

test('журнал в реальном времени: напоминания и «не ответил» — −1 в маршруте', async ({ page }) => {
  await uploadFixture(page);
  await page.getByTestId('mode-realtime').click();
  await page.getByTestId('play').click();
  await page.getByTestId(`thread-${PLOT.first}`).click();
  await expect(page.locator('.choice')).toHaveCount(2);

  await page.getByLabel('Панель отладки').click();
  const chat = page.getByTestId('chat');
  for (let i = 0; i < 20 && !(await chat.textContent())?.includes(SILENT_REPLY); i++) {
    const skip = page.getByTestId('skip-next');
    if (await skip.isEnabled()) await skip.click();
    else await page.waitForTimeout(250);
  }
  await expect(chat).toContainText(SILENT_REPLY);
  await page.getByRole('button', { name: 'Готово' }).click();

  const { file, path } = await exportLog(page);
  await expect(page.getByTestId('choice-log')).toContainText('не ответил');
  const first = file.choices.filter((c) => c.knot === null);
  expect(first.map((c) => c.kind)).toEqual([...REMINDERS.map(() => 'remind'), 'noanswer']);
  expect(first.at(-1)!.reminders).toBe(REMINDERS.length);
  expect(file.route[0]).toBe(-1);

  const run = trace(path, 'realtime');
  expect(run.route[0]).toBe(-1);
  expect(run.knots[0]).toBeNull();
});

test('журнал переживает перезагрузку и сбрасывается новой игрой', async ({ page }) => {
  await uploadFixture(page);
  await page.getByTestId('mode-click').click();
  await page.getByTestId('play').click();
  await page.getByTestId(`thread-${PLOT.first}`).click();
  await page.locator('.choice', { hasText: PLOT.choice }).click();

  await page.goto('/');
  await page.getByLabel('Панель отладки').click();
  await expect(page.getByTestId('choice-log')).toContainText(PLOT.choice);

  await page.getByRole('button', { name: 'Начать сцену заново' }).click();
  await page.getByRole('button', { name: 'Стереть' }).click();
  await page.getByLabel('Панель отладки').click();
  await expect(page.getByTestId('choice-log')).toHaveCount(0);
  await expect(page.getByTestId('choice-log-export')).toBeDisabled();
});
