import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const BASE = `http://127.0.0.1:${PORT}`;

/** E2E_PREVIEW=1 — гонять тесты по продакшен-сборке, а не по дев-серверу. */
const preview = !!process.env.E2E_PREVIEW;

/**
 * По умолчанию браузер видимый: видно, что происходит, и можно подсмотреть.
 * HEADLESS=1 (и CI) — без окна. В видимом режиме воркер один, чтобы на экране
 * было одно окно, и оно открывалось сбоку, а не поверх редактора.
 */
const headed = !process.env.CI && process.env.HEADLESS !== '1';

/**
 * Игра идёт в реальном времени, поэтому ждём щедро, а в адресе включаем ?fast=1.
 * Браузер нужен только chromium: мобильные экраны эмулируем вьюпортом.
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  timeout: 60_000,
  expect: { timeout: 20_000 },
  fullyParallel: !headed,
  workers: headed ? 1 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: BASE,
    trace: 'retain-on-failure',
    headless: !headed,
    launchOptions: headed
      ? {
          // окно уезжает вправо и чуть вниз, движения замедлены — за прогоном можно следить
          args: ['--window-position=900,60', '--no-first-run', '--no-default-browser-check'],
          slowMo: Number(process.env.SLOWMO ?? 120),
        }
      : {},
  },
  projects: [
    {
      name: 'phone',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'small',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 360, height: 640 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
    },
  ],
  webServer: {
    command: preview
      ? `npm run build && npm run preview -- --port ${PORT} --strictPort`
      : `npm run dev -- --port ${PORT} --strictPort`,
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
