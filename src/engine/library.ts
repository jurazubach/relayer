import { parseStoryFile } from './bundle';
import { plural, type Mode } from './engine';
import { readProgress, type Progress } from './progress';
import type { Story, StoryFile } from './story';
import { readUploads, removeUpload, saveUpload } from './uploads';

/**
 * Библиотека историй: всё, что приложение может открыть.
 *
 * Встроенные истории — папки src/stories/<alias>/: meta.json с описанием, story.ink и главы,
 * которые он подключает через INCLUDE. Положил папку — она сама оказалась в приложении:
 * ничего регистрировать не нужно. Одиночный src/stories/<alias>.json тоже подхватывается,
 * но если рядом есть папка с тем же alias, источник — папка, а .json — её копия от story:pack.
 * Загруженные с устройства лежат в localStorage в том же формате, что .json.
 */

type StoryMeta = Omit<StoryFile, 'ink' | 'includes'>;

const metas = import.meta.glob<StoryMeta>('../stories/*/meta.json', { eager: true, import: 'default' });
const inks = import.meta.glob<string>('../stories/*/**/*.ink', { eager: true, query: '?raw', import: 'default' });
const files = import.meta.glob<StoryFile>('../stories/*.json', { eager: true, import: 'default' });

const MAIN = 'story.ink';

/** alias по пути: ../stories/the-number/meta.json и ../stories/the-number.json → the-number. */
const aliasOf = (path: string) => path.replace(/^\.\.\/stories\//, '').split('/')[0].replace(/\.json$/, '');

function fromFolder(alias: string, meta: StoryMeta): Story {
  const prefix = `../stories/${alias}/`;
  const own = Object.entries(inks).filter(([path]) => path.startsWith(prefix));
  const includes = Object.fromEntries(own.map(([path, text]) => [path.slice(prefix.length), text]).filter(([name]) => name !== MAIN));
  return {
    ...(meta as Story),
    id: meta.id || alias,
    ink: own.find(([path]) => path === prefix + MAIN)?.[1] ?? '',
    includes,
    origin: 'builtin' as const,
  };
}

const folders = Object.entries(metas).map(([path, meta]) => fromFolder(aliasOf(path), meta));
const single = Object.entries(files)
  .filter(([path]) => !(`../stories/${aliasOf(path)}/meta.json` in metas))
  .map(([path, file]) => ({ ...(file as Story), id: file.id || aliasOf(path), origin: 'builtin' as const }));

export const BUILTIN: Story[] = [...folders, ...single].sort((a, b) => a.title.localeCompare(b.title, 'ru'));

export const isBuiltin = (id: string) => BUILTIN.some((s) => s.id === id);

/**
 * Полный список: встроенные плюс загруженные.
 * Если историю сначала загрузили файлом, а потом она приехала в репозиторий,
 * побеждает встроенная — иначе на главном было бы две одинаковых карточки.
 * Прогресс у них общий: он хранится по id, а не по происхождению.
 */
export function allStories(uploads: Story[] = readUploads()): Story[] {
  return [...BUILTIN, ...uploads.filter((s) => !isBuiltin(s.id))];
}

export function findStory(id: string, uploads: Story[] = readUploads()): Story | undefined {
  return allStories(uploads).find((s) => s.id === id);
}

export type AddResult = { story: Story } | { error: string };

/** Разбирает файл и кладёт в библиотеку. История с тем же id заменяется. */
export async function addStoryFromFile(file: File): Promise<AddResult> {
  const parsed = parseStoryFile(file.name, await file.text());
  if ('error' in parsed) return parsed;
  if (isBuiltin(parsed.story.id)) {
    return { error: `id «${parsed.story.id}» занят встроенной историей. Поменяйте поле "id" в файле.` };
  }
  try {
    saveUpload(parsed.story);
  } catch (e) {
    return { error: (e as Error).message };
  }
  return parsed;
}

export { removeUpload, readUploads, readProgress };
export type { Progress };

/** Подпись одной строкой: для списков и панели отладки. */
export const storyLabel = (s: Story): string => (s.series ? `${s.series} · ${s.title}` : s.title);

/** «≈ 2 дня», меньше суток — часами: «≈ 3 ч». */
function daysText(days: number): string {
  if (days >= 1) {
    const n = Math.round(days);
    return `≈ ${n} ${plural(n, 'день', 'дня', 'дней')}`;
  }
  return `≈ ${Math.max(1, Math.round(days * 24))} ч`;
}

/** Два числа на карточке (A-05): минуты по клику и дни в реальном времени — каждое со своим режимом. */
export function modeSizes(story: Pick<Story, 'minutes' | 'days'>): Partial<Record<Mode, string>> {
  return {
    ...(story.minutes ? { click: `≈ ${story.minutes} мин` } : {}),
    ...(story.days ? { realtime: daysText(story.days) } : {}),
  };
}

/**
 * Подпись объёма истории: «≈ 35 мин по клику · ≈ 2 дня в реальном времени».
 * Оба числа видны до выбора режима; без них — число глав.
 */
export function sizeLabel(story: Pick<Story, 'minutes' | 'days' | 'chapters'>): string {
  return sizeLines(story).join(' · ');
}

/** То же по строкам — для узкой карточки, где одна строка не помещается. */
export function sizeLines(story: Pick<Story, 'minutes' | 'days' | 'chapters'>): string[] {
  const parts = timeLines(story);
  if (parts.length) return parts;
  const chapters = story.chapters?.length;
  return [chapters ? `${chapters} ${plural(chapters, 'глава', 'главы', 'глав')}` : 'Новая история'];
}

/**
 * Только время, без запасной подписи главами: карточка показывает главы отдельно.
 * «в реальном времени» склеено неразрывными пробелами: на узкой карточке строка
 * переносится целиком после числа, а не рвёт «реальном / времени».
 */
export function timeLines(story: Pick<Story, 'minutes' | 'days'>): string[] {
  const sizes = modeSizes(story);
  const parts: string[] = [];
  if (sizes.click) parts.push(`${sizes.click} по клику`);
  if (sizes.realtime) parts.push(`${sizes.realtime} в\u00A0реальном\u00A0времени`);
  return parts;
}

/** Герои истории: служебные контакты (заметки, банк, сервис) пишут в чат, но героями не считаются. */
export const storyPeople = (story: Pick<Story, 'characters'>) => (story.characters ?? []).filter((c) => !c.service);

/** Числа в углу карточки: «5 глав», «6 героев». Чего в файле нет, того и на карточке нет. */
export function storyCounts(story: Pick<Story, 'chapters' | 'characters'>): string[] {
  const chapters = story.chapters?.length ?? 0;
  const people = storyPeople(story).length;
  return [
    ...(chapters ? [`${chapters} ${plural(chapters, 'глава', 'главы', 'глав')}`] : []),
    ...(people ? [`${people} ${plural(people, 'герой', 'героя', 'героев')}`] : []),
  ];
}

/**
 * Однобуквенные и двухбуквенные слова («в», «с», «не») приклеиваем к следующему неразрывным пробелом:
 * на узкой карточке висящее в конце строки «С» читается как опечатка.
 */
export const keepShortWords = (text: string): string => text.replace(/(?<=^|[\s\u00A0«„(])([а-яёa-z]{1,2})\s+/giu, '$1\u00A0');

/** Затравки на карточке: не больше трёх, иначе карточка превращается в синопсис. */
export const storyTeasers = (story: Pick<Story, 'teasers'>): string[] => (story.teasers ?? []).slice(0, 3).map(keepShortWords);
