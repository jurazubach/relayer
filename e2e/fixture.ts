import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { expect, type Page } from '@playwright/test';

/**
 * Тесты не опираются на истории каталога: их переписывают с нуля.
 * Всё поведение проверяется на служебной истории examples/e2e.story.json,
 * а ожидаемые тексты берутся из самого файла — поправили фикстуру, тесты не сломались.
 */
export const FIXTURE_PATH = 'examples/e2e.story.json';

interface StoryJson {
  id: string;
  series?: string;
  title: string;
  tagline?: string;
  chapters?: { title: string }[];
  characters?: { id?: string; name: string }[];
}

const readStory = (path: string) => JSON.parse(readFileSync(path, 'utf8')) as StoryJson;

export const FIXTURE = readStory(FIXTURE_PATH);

/** Пример для авторов: проверяем только, что шаблон по-прежнему загружается. */
export const DEMO_PATH = 'examples/demo.story.json';
export const DEMO = readStory(DEMO_PATH);

/**
 * Любая встроенная история — для проверок, которым нужна именно встроенная
 * (вытеснение загруженной копии, главы через INCLUDE). Какая — неважно, тексты берём из её файлов.
 * Истории каталога — папки src/stories/<id>/ с meta.json; одиночный <id>.json тоже считается.
 */
export const BUILTIN: (StoryJson & { chapterFiles: number }) | undefined = readdirSync('src/stories')
  .sort()
  .flatMap((name) => {
    const folder = `src/stories/${name}`;
    const alias = name.replace(/\.json$/, '');
    if (existsSync(`${folder}/meta.json`)) {
      const inks = readdirSync(folder).filter((f) => f.endsWith('.ink')).length;
      return [{ ...readStory(`${folder}/meta.json`), alias, chapterFiles: inks - 1 }];
    }
    return name.endsWith('.json') && !existsSync(`src/stories/${alias}`) ? [{ ...readStory(folder), alias, chapterFiles: 0 }] : [];
  })
  // как в library.ts: без id в файле история получает алиас по имени папки или файла
  .map(({ alias, ...story }) => ({ ...story, id: story.id || alias }))[0];

/** Без пауз сюжета и с чистого листа: иначе эпизод идёт настоящими минутами. */
export const FRESH = '/?screen=home&fast=1&fresh=1';

/** Сразу в игру фикстуры: она уже должна лежать среди загруженных. */
export const FIXTURE_GAME = `/?story=${FIXTURE.id}&screen=game&fast=1&fresh=1`;

export const firstThread = (page: Page) => page.locator('[data-testid^="thread-"]').first();
export const messages = (page: Page) => page.locator('.message__bubble, .system-line');

/** Загружает фикстуру кнопкой «Загрузить историю»; после неё открыто описание истории. */
export async function uploadFixture(page: Page) {
  await page.goto(FRESH);
  await page.getByTestId('upload-input').setInputFiles(FIXTURE_PATH);
  await expect(page.getByTestId('story')).toBeVisible();
}

/** Фикстура загружена, игрок на главном. */
export async function fixtureOnHome(page: Page) {
  await uploadFixture(page);
  await page.getByTestId('story-back').click();
  await expect(page.getByTestId('home')).toBeVisible();
}

/** Опорные точки сценария фикстуры (поле ink): первый контакт, развилка, ответ и открытый контакт. */
export const PLOT = {
  first: 'mira',
  choice: 'Позови смотрителя',
  reply: 'сейчас напишу ему',
  unlocked: 'keeper',
};
